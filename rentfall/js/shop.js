// The between-rent shop. Offers are rolled once per visit (and on reroll); prices are computed
// live from the offer's base price, inflation and the current discount, so buying a Coupon
// immediately makes everything else cheaper. Every purchase validates first and changes nothing
// when it fails: no negative prices, no money below zero, no buying the same offer twice.

import { SHOP, RARITIES, MAX_ITEMS, INFLATION_PER_DEADLINE } from './config.js';
import { SYMBOL_BY_ID } from './symbols.js';
import { RELICS, RELIC_BY_ID, ITEMS, ITEM_BY_ID, SERVICES, SERVICE_BY_ID } from './relics.js';
import { DEADLINES, NOTICES } from './rent.js';
import { rollSymbols } from './generate.js';
import { createRng, shuffle, pick } from './rng.js';
import { addInstance, removeInstance, shopDiscount } from './collection.js';

const fail = error => ({ ok: false, error });

export function priceOf(run, base) {
  const raw = Math.max(0, base) * (1 + INFLATION_PER_DEADLINE * run.deadline) * (1 - shopDiscount(run, run.shop?.extraDiscount || 0));
  return base > 0 ? Math.max(1, Math.round(raw)) : 0;
}

export const symbolBasePrice = id => RARITIES[SYMBOL_BY_ID[id]?.rarity]?.price ?? 0;
export const rerollCost = run => (run.rerolls > 0 ? 0 : SHOP.rerollBase + SHOP.rerollStep * (run.shop?.rerollsUsed || 0));
export const removeCost = run => priceOf(run, SHOP.removeBase + SHOP.removeStep * run.removeCount);

export function serviceCost(run, serviceId, uid) {
  const s = SERVICE_BY_ID[serviceId];
  if (!s) return 0;
  let base = s.price + s.priceStep * (run.serviceCount[serviceId] || 0);
  if (s.rarityPrice) {
    const inst = run.collection.find(x => x.uid === uid);
    base += inst ? symbolBasePrice(inst.id) : 0;
  }
  return priceOf(run, base);
}

function rollOffers(run, rng) {
  const symbols = rollSymbols(rng, run.deadline, SHOP.symbolOffers).map(id => ({ id, base: symbolBasePrice(id), sold: false }));
  const relicPool = RELICS.filter(r => !run.relics.includes(r.id));
  const relics = shuffle(rng, relicPool).slice(0, SHOP.relicOffers).map(r => ({ id: r.id, base: r.price, sold: false }));
  const items = shuffle(rng, ITEMS).slice(0, SHOP.itemOffers).map(r => ({ id: r.id, base: r.price, sold: false }));
  return { symbols, relics, items, service: pick(rng, SERVICES).id };
}

// Called right after a rent payment; `paidDeadline` is the deadline just paid (its notice can
// discount this visit).
export function openShop(run, paidDeadline) {
  const rng = createRng(run.rng);
  const notice = NOTICES[DEADLINES[paidDeadline]?.notice];
  run.shop = { visit: (run.shop?.visit || 0) + 1, rerollsUsed: 0, extraDiscount: notice?.shopDiscount || 0, ...rollOffers(run, rng) };
  run.rng = rng.state;
  return run;
}

export function rerollShop(run) {
  if (run.phase !== 'shop' || !run.shop) return fail('The shop is closed.');
  const cost = rerollCost(run);
  if (run.money < cost) return fail('Not enough money to reroll.');
  if (run.rerolls > 0) run.rerolls -= 1; else { run.money -= cost; run.shop.rerollsUsed += 1; }
  const rng = createRng(run.rng);
  Object.assign(run.shop, rollOffers(run, rng));
  run.rng = rng.state;
  return { ok: true, cost };
}

function takeOffer(run, list, k) {
  if (run.phase !== 'shop' || !run.shop) return fail('The shop is closed.');
  const offer = run.shop[list]?.[k];
  if (!offer) return fail('That offer does not exist.');
  if (offer.sold) return fail('Already sold.');
  const price = priceOf(run, offer.base);
  if (price < 0) return fail('Invalid price.');
  if (run.money < price) return fail('Not enough money.');
  return { ok: true, offer, price };
}

export function buySymbol(run, k) {
  const t = takeOffer(run, 'symbols', k);
  if (!t.ok) return t;
  if (!SYMBOL_BY_ID[t.offer.id]) return fail('Unknown symbol.');
  run.money -= t.price;
  t.offer.sold = true;
  addInstance(run, t.offer.id);
  run.stats.bought += 1;
  return { ok: true, price: t.price, id: t.offer.id };
}

export function buyRelic(run, k) {
  const t = takeOffer(run, 'relics', k);
  if (!t.ok) return t;
  const relic = RELIC_BY_ID[t.offer.id];
  if (!relic) return fail('Unknown relic.');
  if (run.relics.includes(relic.id)) return fail('You already have that relic.');
  run.money -= t.price;
  t.offer.sold = true;
  run.relics.push(relic.id);
  if (relic.grant) run.money += relic.grant;
  run.stats.bought += 1;
  return { ok: true, price: t.price, id: relic.id };
}

export function buyItem(run, k) {
  const t = takeOffer(run, 'items', k);
  if (!t.ok) return t;
  if (!ITEM_BY_ID[t.offer.id]) return fail('Unknown item.');
  if (run.items.length >= MAX_ITEMS) return fail(`You can only carry ${MAX_ITEMS} supplies.`);
  run.money -= t.price;
  t.offer.sold = true;
  run.items.push(t.offer.id);
  run.stats.bought += 1;
  return { ok: true, price: t.price, id: t.offer.id };
}

export function removeSymbol(run, uid) {
  if (run.phase !== 'shop') return fail('The shop is closed.');
  if (!run.collection.some(s => s.uid === uid)) return fail('You do not own that symbol.');
  if (run.collection.length <= 1) return fail('You need to keep at least one symbol.');
  const cost = removeCost(run);
  if (run.money < cost) return fail('Not enough money.');
  run.money -= cost;
  const inst = removeInstance(run, uid);
  run.removeCount += 1;
  run.stats.removed += 1;
  return { ok: true, price: cost, id: inst.id };
}

export function buyService(run, serviceId, uid) {
  if (run.phase !== 'shop' || !run.shop) return fail('The shop is closed.');
  if (run.shop.service !== serviceId || !SERVICE_BY_ID[serviceId]) return fail('That service is not offered today.');
  const inst = run.collection.find(s => s.uid === uid);
  if (!inst) return fail('You do not own that symbol.');
  if (serviceId === 'laminate' && inst.laminated) return fail('That symbol is already laminated.');
  const cost = serviceCost(run, serviceId, uid);
  if (run.money < cost) return fail('Not enough money.');
  run.money -= cost;
  if (serviceId === 'polish') inst.bonus += 1;
  else if (serviceId === 'laminate') inst.laminated = true;
  else if (serviceId === 'photocopy') addInstance(run, inst.id);
  run.serviceCount[serviceId] = (run.serviceCount[serviceId] || 0) + 1;
  return { ok: true, price: cost, id: inst.id };
}

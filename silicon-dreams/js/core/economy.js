// Money in and out: the store (stock, prices, shipping), the bargain bin of used parts, selling,
// tools, supplies, upgrades and the ledger. Every change of money goes through `book()` so the
// Business screen can break it down.

import { PART, PARTS, CATEGORY } from '../data/catalog.js';
import { TOOL, SUPPLY, UPGRADE } from '../data/tools.js';
import { makePart, resaleValue, FAULTS } from './parts.js';
import { capacity, shelfUsed, supplierTier, shipBonus, sameDayExpress, storeDiscount, freeExpress, canBuyUpgrade } from './business.js';
import { rngFor, pick, randInt, shuffle } from './rng.js';

export const LEDGER_KIND = { job: 'Job revenue', bonus: 'Bonuses & tips', parts: 'Parts purchased', sale: 'Parts sold', shipping: 'Shipping', tools: 'Tools & supplies', upgrade: 'Workshop upgrades', rent: 'Rent', subs: 'Subscriptions', refund: 'Refunds', penalty: 'Penalties', reward: 'Milestone rewards', licence: 'OS licences' };

export function book(state, kind, amount, label, jobId) {
  amount = Math.round(amount);
  state.money += amount;
  state.ledger.push({ day: state.day, kind, amount, label, job: jobId || null });
  if (state.ledger.length > 600) state.ledger.splice(0, state.ledger.length - 600);
  state.totals[kind] = (state.totals[kind] || 0) + amount;
  return amount;
}

export const forSale = state => PARTS.filter(d => !d.unsold && d.tier <= supplierTier(state));
export const lockedParts = state => PARTS.filter(d => !d.unsold && d.tier > supplierTier(state));
export const unitPrice = (state, d) => Math.round(d.price * (1 - storeDiscount(state)));

// days until an order arrives (0 = on the shelf right away)
export function shipDays(state, d, express) {
  let days = d.tier <= 1 ? 0 : d.tier === 2 ? 1 : 2;
  if (d.cat === 'os') days = 0;
  days = Math.max(0, days - shipBonus(state));
  if (express) days = sameDayExpress(state) ? 0 : Math.max(0, days - 1);
  return days;
}
export const expressFee = (state, total) => (freeExpress(state) ? 0 : Math.max(8, Math.round(total * 0.12)));

export function canBuy(state, id, qty = 1, express = false) {
  const d = PART[id];
  if (!d || d.unsold) return { ok: false, reason: 'Not sold here.' };
  if (d.tier > supplierTier(state)) return { ok: false, reason: 'Your supplier account doesn\'t carry this tier yet (Business → upgrades).' };
  const cost = unitPrice(state, d) * qty + (express ? expressFee(state, unitPrice(state, d) * qty) : 0);
  if (cost > state.money) return { ok: false, reason: `Not enough money (${'$' + cost} needed).` };
  const space = CATEGORY[d.cat].size * qty;
  if (space && shelfUsed(state) + space > capacity(state)) return { ok: false, reason: `Not enough shelf space (${capacity(state) - shelfUsed(state)} free, needs ${space}). Sell parts or buy shelving.` };
  return { ok: true, cost, days: shipDays(state, d, express) };
}

export function buy(state, id, qty = 1, express = false) {
  const c = canBuy(state, id, qty, express);
  if (!c.ok) return c;
  const d = PART[id];
  const unit = unitPrice(state, d);
  if (d.cat === 'os') {
    book(state, 'licence', -unit * qty, `${qty} × ${d.name} licence`);
    state.licenses[id] = (state.licenses[id] || 0) + qty;
    return { ok: true, days: 0, arrived: true };
  }
  book(state, 'parts', -unit * qty, `${qty} × ${d.full}`);
  if (express && expressFee(state, unit * qty)) book(state, 'shipping', -expressFee(state, unit * qty), `Express shipping: ${d.full}`);
  if (c.days === 0) {
    for (let i = 0; i < qty; i++) { const p = makePart(state, id, { cost: unit }); state.inventory.push(p.uid); }
    return { ok: true, days: 0, arrived: true };
  }
  state.orders.push({ id: `o${state.nextUid++}`, items: Array(qty).fill(id), unit, arrive: state.day + c.days, express, placed: state.day });
  return { ok: true, days: c.days };
}

export function deliverOrders(state) {
  const arrived = [];
  state.orders = state.orders.filter(o => {
    if (o.arrive > state.day) return true;
    for (const id of o.items) { const p = makePart(state, id, { cost: o.unit }); state.inventory.push(p.uid); arrived.push(p.uid); }
    return false;
  });
  return arrived;
}

export function cancelOrder(state, orderId) {
  const o = state.orders.find(x => x.id === orderId);
  if (!o) return { ok: false, reason: 'No such order.' };
  if (o.placed !== state.day) return { ok: false, reason: 'It has already shipped; it can only be cancelled on the day it was placed.' };
  state.orders = state.orders.filter(x => x !== o);
  book(state, 'refund', o.unit * o.items.length, `Cancelled order: ${o.items.length} × ${PART[o.items[0]].full}`);
  return { ok: true };
}

export function canSell(state, uid) {
  const p = state.parts[uid];
  if (!p || !state.inventory.includes(uid)) return { ok: false, reason: 'Only parts on your shelves can be sold.' };
  if (p.owner !== 'shop') return { ok: false, reason: 'That belongs to a customer.' };
  if (p.data && p.data.files.some(f => f.owner !== 'shop')) return { ok: false, reason: 'That drive still holds a customer\'s files. Format it first (or don\'t sell it).' };
  return { ok: true, value: resaleValue(state, uid) };
}

export function sell(state, uid) {
  const c = canSell(state, uid);
  if (!c.ok) return c;
  const d = PART[state.parts[uid].id];
  book(state, 'sale', c.value, `Sold ${d.full}${state.parts[uid].fault ? ' (faulty, for scrap)' : ''}`);
  delete state.parts[uid];
  state.inventory = state.inventory.filter(u => u !== uid);
  state.stats.partsSold++;
  return { ok: true, value: c.value };
}

// the bargain bin: second-hand parts, cheaper, sold as-is (some hide faults)
export function refreshBargains(state) {
  const rng = rngFor(state.seed, 'bargain', state.day);
  const pool = forSale(state).filter(d => d.cat !== 'os' && d.cat !== 'case' && d.tier <= 3);
  state.bargains = shuffle(rng, pool).slice(0, 6).map(d => {
    const faulty = rng() < 0.2 && FAULTS[d.cat].length;
    return { key: `b${state.nextUid++}`, id: d.id, price: Math.max(3, Math.round(d.price * (0.42 + rng() * 0.2))), cond: randInt(rng, 55, 90), fault: faulty ? pick(rng, FAULTS[d.cat].filter(f => f !== 'dead' || rng() < 0.5)) : null };
  });
  state.bargainDay = state.day;
}

export function buyBargain(state, key) {
  const b = state.bargains.find(x => x.key === key);
  if (!b) return { ok: false, reason: 'Already sold.' };
  const d = PART[b.id];
  if (b.price > state.money) return { ok: false, reason: 'Not enough money.' };
  if (shelfUsed(state) + CATEGORY[d.cat].size > capacity(state)) return { ok: false, reason: 'Not enough shelf space.' };
  book(state, 'parts', -b.price, `Second-hand ${d.full}`);
  const p = makePart(state, b.id, { cost: b.price, cond: b.cond, used: true, fault: b.fault, health: b.fault === 'failing' ? 30 : undefined });
  if (p.data && p.fault === 'failing') p.health = 30;
  state.inventory.push(p.uid);
  state.bargains = state.bargains.filter(x => x !== b);
  return { ok: true, uid: p.uid };
}

export function buyTool(state, id) {
  const t = TOOL[id];
  if (!t) return { ok: false, reason: 'Unknown tool.' };
  if (state.tools[id]) return { ok: false, reason: 'Already owned.' };
  if (state.level < (t.level || 1)) return { ok: false, reason: `Requires workshop level ${t.level}.` };
  if (state.money < t.price) return { ok: false, reason: 'Not enough money.' };
  book(state, 'tools', -t.price, t.name);
  state.tools[id] = true;
  return { ok: true };
}

export function buySupply(state, id, qty = 1) {
  const s = SUPPLY[id];
  if (!s) return { ok: false, reason: 'Unknown item.' };
  const cost = Math.round(s.price * qty * (1 - storeDiscount(state)));
  if (state.money < cost) return { ok: false, reason: 'Not enough money.' };
  book(state, 'tools', -cost, `${qty} × ${s.name}`);
  state.consumables[id] = (state.consumables[id] || 0) + s.adds * qty;
  return { ok: true };
}

export function buyUpgrade(state, id) {
  const c = canBuyUpgrade(state, id);
  if (!c.ok) return c;
  const u = UPGRADE[id];
  book(state, 'upgrade', -u.price, u.name);
  state.upgrades[id] = state.day;
  if (u.effect.benches) state.benches.push(null);
  return { ok: true };
}

// profit = everything except money moved around with no business meaning
export function profitTotal(state) {
  return Object.entries(state.totals).reduce((s, [, v]) => s + v, 0);
}

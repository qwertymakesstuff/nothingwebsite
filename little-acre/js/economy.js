// Money: the shipping bin, buying and selling at shops, tool upgrades and building upgrades.
// Every purchase validates first; a failed purchase changes nothing.

import { SHOPS, TOOL_UPGRADES, UPGRADABLE_TOOLS } from './data/shops.js';
import { SEED_TIERS } from './data/crops.js';
import { ITEMS_BY_ID } from './data/items.js';
import { MAPS } from './data/maps.js';
import { FESTIVAL_AT } from './data/events.js';
import { PLAYER, CAN_CAPACITY } from './config.js';
import { weekday } from './calendar.js';
import { canAdd, add, count, removeAll, removeAt } from './inventory.js';
import { scatterDebris } from './state.js';
import { rngFor } from './rng.js';

export const sellPrice = id => ITEMS_BY_ID[id]?.price || 0;
export const seedTier = state => (state.stats.shippedTotal >= SEED_TIERS[1] ? 1 : 0);

// --- shipping bin -------------------------------------------------------------------------
export function ship(state, slot, n) {
  const s = state.inventory[slot];
  if (!s || n <= 0 || n > s.n) return false;
  const it = ITEMS_BY_ID[s.id];
  if (it.tool || !it.price) return false;
  const id = removeAt(state, slot, n);
  const row = state.shipping.find(r => r.id === id);
  if (row) row.n += n; else state.shipping.push({ id, n });
  return true;
}
export const shippingValue = state => state.shipping.reduce((t, r) => t + sellPrice(r.id) * r.n, 0);

// Runs overnight: pay for everything in the bin. Returns [{ id, n, value }].
export function settleShipping(state) {
  const out = state.shipping.map(r => ({ ...r, value: sellPrice(r.id) * r.n }));
  for (const r of out) {
    state.player.money += r.value;
    state.stats.shipped[r.id] = (state.stats.shipped[r.id] || 0) + r.n;
    state.stats.shippedTotal += r.n;
    state.stats.earned += r.value;
  }
  state.shipping = [];
  return out;
}

// --- shops --------------------------------------------------------------------------------
export function shopStatus(state, shopId) {
  const shop = SHOPS[shopId];
  if (shop.festival) return { open: true };
  const fest = FESTIVAL_AT(state.date.season, state.date.day);
  if (fest) return { open: false, why: `Closed today for the ${fest.name}.` };
  if (shop.closed === weekday(state.date)) return { open: false, why: `Closed on ${shop.closed}days. Hours: ${fmt(shop.hours[0])}–${fmt(shop.hours[1])}.` };
  const m = state.date.minutes;
  if (m < shop.hours[0] || m >= shop.hours[1]) return { open: false, why: `Closed. Open ${fmt(shop.hours[0])}–${fmt(shop.hours[1])}, except ${shop.closed}days.` };
  return { open: true };
}
const fmt = m => `${((Math.floor(m / 60) + 11) % 12) + 1}${m % 60 ? ':' + String(m % 60).padStart(2, '0') : ''}${m < 720 ? 'am' : 'pm'}`;

// What a shop offers today: [{ kind: 'item'|'upgrade'|'tool', ...entry }].
export function shopStock(state, shopId) {
  const shop = SHOPS[shopId];
  const tier = seedTier(state);
  const out = [];
  for (const e of shop.stock) {
    if (e.item) {
      if (e.seasons && !e.seasons.includes(state.date.season)) continue;
      if (e.tier != null && e.tier > tier) { out.push({ kind: 'locked', ...e, why: `Ship ${SEED_TIERS[e.tier]} items to unlock` }); continue; }
      out.push({ kind: 'item', ...e });
    } else if (e.upgrade === 'tool') {
      for (const tool of UPGRADABLE_TOOLS) {
        const lvl = state.tools[tool];
        if (tool === 'rod' && !count(state, 'rod')) continue;
        const next = TOOL_UPGRADES[lvl + 1];
        if (!next) continue;
        out.push({ kind: 'tool', tool, level: lvl + 1, name: `${next.name} ${ITEMS_BY_ID[tool].name}`, price: next.price, needs: next.bars, desc: toolUpgradeDesc(tool, lvl + 1) });
      }
    } else if (e.upgrade) {
      if (e.upgrade === 'backpack' && state.player.backpack >= PLAYER.maxBackpack) continue;
      if (e.upgrade !== 'backpack' && state.unlocks[e.upgrade]) continue;
      out.push({ kind: 'upgrade', ...e });
    }
  }
  return out;
}

function toolUpgradeDesc(tool, lvl) {
  return {
    hoe: `Till ${[1, 3, 5][lvl]} tiles in a row at once.`,
    can: `Water ${[1, 3, 5][lvl]} tiles in a row; holds ${CAN_CAPACITY[lvl]} water.`,
    axe: lvl === 1 ? 'Hits harder and can chop stumps.' : 'Fells trees in two swings.',
    pickaxe: lvl === 1 ? 'Hits harder, breaks boulders and iron nodes.' : 'Shatters rock in a single hit.',
    rod: 'A bigger catch bar and fish bite faster.',
  }[tool];
}

const need = (state, needs = {}) => Object.entries(needs).every(([id, n]) => count(state, id) >= n);

// Why an entry can't be bought (or null if it can). `qty` for items.
export function buyProblem(state, entry, qty = 1) {
  if (entry.kind === 'locked') return entry.why;
  const price = entry.price * qty;
  if (state.player.money < price) return 'Not enough gold.';
  if (!need(state, entry.needs)) return 'You are missing materials.';
  if (entry.kind === 'item' && !canAdd(state, entry.item, qty)) return 'No room in your bag.';
  return null;
}

export function buy(state, entry, qty = 1) {
  if (buyProblem(state, entry, qty)) return false;
  if (entry.needs && !removeAll(state, entry.needs)) return false;
  state.player.money -= entry.price * qty;
  if (entry.kind === 'item') { add(state, entry.item, qty); state.seen[entry.item] = true; }
  else if (entry.kind === 'tool') { state.tools[entry.tool] = entry.level; if (entry.tool === 'can') state.player.water = CAN_CAPACITY[entry.level]; }
  else if (entry.kind === 'upgrade') applyUpgrade(state, entry.upgrade);
  return true;
}

export function applyUpgrade(state, id) {
  if (id === 'backpack') state.player.backpack = PLAYER.maxBackpack;
  else state.unlocks[id] = true;
  if (id === 'northfield') {
    const a = MAPS.farm.lockedArea;
    scatterDebris(state, 'farm', a, 0.5, rngFor(state.seed, 'north-debris'));
  }
}

export const shopBuys = (shopId, itemId) => {
  const it = ITEMS_BY_ID[itemId];
  return !!it && !it.tool && it.price > 0 && SHOPS[shopId].buys.includes(it.cat);
};

export function sellToShop(state, shopId, slot, n = 1) {
  const s = state.inventory[slot];
  if (!s || n > s.n || !shopBuys(shopId, s.id)) return 0;
  const id = removeAt(state, slot, n);
  const value = sellPrice(id) * n;
  state.player.money += value;
  state.stats.earned += value;
  state.stats.shipped[id] = (state.stats.shipped[id] || 0) + n;
  state.stats.shippedTotal += n;
  return value;
}

export const toolName = (state, id) => {
  const lvl = state.tools[id] || 0;
  return (lvl ? TOOL_UPGRADES[lvl].name + ' ' : '') + ITEMS_BY_ID[id].name;
};


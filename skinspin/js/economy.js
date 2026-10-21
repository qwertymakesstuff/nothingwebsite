// Transactions. Each one validates everything first and only then mutates the player, so a
// failed transaction returns { ok: false, error, message } and leaves the state untouched.

import { ACTIVITY_LIMIT, RECENT_DROPS_LIMIT, REFILL_AMOUNT, MAX_COINS, NAME_MAX } from './config.js';
import { CASES_BY_ID, CHEAPEST_CASE_PRICE } from './cases.js';
import { ITEMS_BY_ID, itemValue } from './items.js';
import { rollCase } from './rewards.js';
import { secureRandom } from './rng.js';
import { levelInfo, xpForOpening, defaultSettings } from './playerState.js';

export function instanceValue(inst) {
  return itemValue(inst.itemId, inst.wear);
}

export function inventoryValue(player) {
  return player.inventory.reduce((s, inst) => s + instanceValue(inst), 0);
}

export function findItem(player, uid) {
  return player.inventory.find(i => i.uid === uid) || null;
}

export function newId(player, prefix) {
  const id = `${prefix}${player.nextId}`;
  player.nextId += 1;
  return id;
}

export function log(player, entry) {
  player.activity.unshift({ id: newId(player, 'a'), ...entry });
  if (player.activity.length > ACTIVITY_LIMIT) player.activity.length = ACTIVITY_LIMIT;
}

export const fail = (error, message) => ({ ok: false, error, message });

export function hasItem(player, itemId) {
  return player.inventory.some(i => i.itemId === itemId);
}

// The one way an item enters the inventory: case, upgrade, contract, battle or market.
// Records it in recent drops and the collection log. Callers validate before calling.
export function acquireItem(player, { itemId, wear, float }, source, now) {
  const inst = { uid: newId(player, 'i'), itemId, wear: wear ?? null, float: float ?? null, acquiredAt: now, source, locked: false, favorite: false };
  player.inventory.push(inst);
  player.stats.itemsObtained += 1;
  const value = instanceValue(inst);
  if (!player.stats.bestDrop || value > player.stats.bestDrop.value) {
    player.stats.bestDrop = { itemId, wear: inst.wear, float: inst.float, value, at: now, caseId: source };
  }
  player.recentDrops.unshift({ itemId, wear: inst.wear, float: inst.float, at: now, caseId: source });
  if (player.recentDrops.length > RECENT_DROPS_LIMIT) player.recentDrops.length = RECENT_DROPS_LIMIT;
  if (!player.collectionLog.includes(itemId)) player.collectionLog.push(itemId);
  return inst;
}

// Removes the given uids from the inventory; callers have validated that they are all present.
export function removeItems(player, uids) {
  const gone = new Set(uids);
  const removed = player.inventory.filter(i => gone.has(i.uid));
  player.inventory = player.inventory.filter(i => !gone.has(i.uid));
  return removed;
}

// Checks items that an operation would consume. Returns the instances or a failure.
export function checkConsumable(player, uids, { allowFavorites = true } = {}) {
  if (!Array.isArray(uids) || !uids.length) return fail('empty', 'No items selected.');
  if (new Set(uids).size !== uids.length) return fail('duplicate', 'The same item was selected twice.');
  const items = [];
  for (const uid of uids) {
    const inst = findItem(player, uid);
    if (!inst) return fail('not-owned', 'One of those items is no longer in your inventory.');
    if (inst.locked) return fail('locked', `${ITEMS_BY_ID[inst.itemId].name} is locked. Unlock it to use it.`);
    if (inst.favorite && !allowFavorites) return fail('favorite', `${ITEMS_BY_ID[inst.itemId].name} is a favourite and is protected.`);
    items.push(inst);
  }
  return { ok: true, items };
}

export function canAfford(player, price) {
  return Number.isInteger(player.coins) && player.coins >= price;
}

// Charge for a case, decide the reward, add it to the inventory. The reward is final the moment
// this returns; the roulette only animates towards it.
export function openCase(player, caseId, { rng = secureRandom, now = Date.now() } = {}) {
  const c = CASES_BY_ID[caseId];
  if (!c) return fail('unknown-case', 'That case does not exist.');
  if (!canAfford(player, c.price)) {
    return fail('insufficient-funds', `You need $${(c.price - Math.max(0, player.coins | 0)).toLocaleString('en-US')} more to open ${c.name}.`);
  }
  const drop = rollCase(c, rng);
  const item = ITEMS_BY_ID[drop.itemId];
  if (!item) return fail('bad-roll', 'Something went wrong picking a reward. You were not charged.');

  const value = itemValue(drop.itemId, drop.wear);
  const xpGained = xpForOpening(c.price);
  const levelBefore = levelInfo(player.xp).level;

  // --- validated: apply everything ---
  player.coins -= c.price;
  player.xp += xpGained;
  const inst = acquireItem(player, drop, c.id, now);
  const s = player.stats;
  s.casesOpened += 1;
  s.coinsSpent += c.price;
  s.rarityCounts[item.rarity] = (s.rarityCounts[item.rarity] || 0) + 1;
  s.casesById[c.id] = (s.casesById[c.id] || 0) + 1;
  log(player, { type: 'open', at: now, delta: -c.price, caseId: c.id, itemId: inst.itemId, wear: inst.wear, value });

  const levelAfter = levelInfo(player.xp).level;
  return { ok: true, item: inst, value, price: c.price, xpGained, levelUp: levelAfter > levelBefore ? levelAfter : null };
}

// What selling these uids would do, without doing it. Shared by the confirm dialog and sellItems.
export function quoteSale(player, uids, { allowFavorites = true } = {}) {
  const check = checkConsumable(player, uids, { allowFavorites });
  if (!check.ok) return check.error === 'locked' ? { ...check, message: check.message.replace('to use it', 'to sell it') } : check;
  const items = check.items.map(inst => ({ inst, value: instanceValue(inst) }));
  const total = items.reduce((s, x) => s + x.value, 0);
  return { ok: true, items, total, count: items.length };
}

export function sellItems(player, uids, { allowFavorites = true, now = Date.now() } = {}) {
  const q = quoteSale(player, uids, { allowFavorites });
  if (!q.ok) return q;
  if (player.coins + q.total > MAX_COINS) return fail('cap', 'Balance limit reached.');

  // --- validated: apply everything ---
  removeItems(player, uids);
  player.coins += q.total;
  player.stats.itemsSold += q.count;
  player.stats.coinsFromSales += q.total;
  const first = q.items[0].inst;
  log(player, {
    type: 'sell', at: now, delta: q.total, count: q.count,
    itemId: q.count === 1 ? first.itemId : null, wear: q.count === 1 ? first.wear : null,
  });
  return { ok: true, total: q.total, count: q.count, items: q.items.map(x => ({ itemId: x.inst.itemId, wear: x.inst.wear, value: x.value })) };
}

export function setItemFlag(player, uid, flag, value) {
  if (flag !== 'locked' && flag !== 'favorite') return fail('bad-flag', 'Unknown item flag.');
  const inst = findItem(player, uid);
  if (!inst) return fail('not-owned', 'That item is no longer in your inventory.');
  inst[flag] = !!value;
  return { ok: true, item: inst };
}

export function refillEligible(player) {
  return player.coins + inventoryValue(player) < CHEAPEST_CASE_PRICE;
}

export function claimRefill(player, { now = Date.now() } = {}) {
  if (!refillEligible(player)) return fail('not-eligible', 'Refills are only available when you cannot afford any case.');
  player.coins += REFILL_AMOUNT;
  player.stats.refillsClaimed += 1;
  log(player, { type: 'refill', at: now, delta: REFILL_AMOUNT });
  return { ok: true, amount: REFILL_AMOUNT };
}

const SETTING_RULES = {
  instantOpen: v => typeof v === 'boolean',
  motion: v => ['system', 'reduced', 'full'].includes(v),
  sound: v => typeof v === 'boolean',
  protectFavorites: v => typeof v === 'boolean',
};

export function updateSettings(player, patch) {
  for (const [k, v] of Object.entries(patch || {})) {
    if (!SETTING_RULES[k]) return fail('bad-setting', `Unknown setting ${k}.`);
    if (!SETTING_RULES[k](v)) return fail('bad-setting', `Invalid value for ${k}.`);
  }
  player.settings = { ...defaultSettings(), ...player.settings, ...patch };
  return { ok: true };
}

export function cleanName(name) {
  return String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

export function renamePlayer(player, name) {
  const clean = cleanName(name);
  if (!clean) return fail('bad-name', 'Names need at least one visible character.');
  player.name = clean;
  return { ok: true, name: clean };
}

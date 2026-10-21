// Trade-up contracts: CONTRACT.size items of one rarity become one item of the next rarity.
// Each input contributes an equal share of the odds, split evenly over the next-rarity items of
// its own collection. Covert inputs trade up into the knives and gloves that the cases carrying
// their collection can drop. The output's float is the average of the input floats.

import { CONTRACT } from './config.js';
import { ITEMS, ITEMS_BY_ID, COLLECTIONS, itemValue } from './items.js';
import { RARITIES, RARITY_BY_ID } from './rarities.js';
import { CASES } from './cases.js';
import { wearForFloat } from './wear.js';
import { pickWeighted, secureRandom } from './rng.js';
import { fail, checkConsumable, instanceValue, removeItems, acquireItem, log } from './economy.js';

export function nextRarity(rarityId) {
  const r = RARITY_BY_ID[rarityId];
  return r && RARITIES[r.rank + 1] ? RARITIES[r.rank + 1].id : null;
}

function buildOutputs() {
  const map = {};
  for (const col of COLLECTIONS) {
    map[col.id] = {};
    for (const r of RARITIES) {
      const next = nextRarity(r.id);
      if (!next) continue;
      let ids;
      if (next === 'extraordinary') {
        ids = [...new Set(CASES.filter(c => c.collections.includes(col.id)).flatMap(c => c.rarityPools.extraordinary || []))];
      } else {
        ids = ITEMS.filter(i => i.collection === col.id && i.rarity === next).map(i => i.id);
      }
      map[col.id][r.id] = ids;
    }
  }
  return map;
}
const OUTPUTS = buildOutputs();

// Items one input of this kind could turn into.
export function outputsFor(itemId) {
  const it = ITEMS_BY_ID[itemId];
  return (it && OUTPUTS[it.collection]?.[it.rarity]) || [];
}

export const contractEligible = itemId => outputsFor(itemId).length > 0;

// Outcome odds for a list of input instances (no validation of ownership).
export function contractOutcomes(inputs) {
  const share = 1 / inputs.length;
  const chances = new Map();
  for (const inst of inputs) {
    const outs = outputsFor(inst.itemId);
    for (const id of outs) chances.set(id, (chances.get(id) || 0) + share / outs.length);
  }
  const floats = inputs.map(i => i.float).filter(Number.isFinite);
  const float = floats.length ? Math.round((floats.reduce((s, f) => s + f, 0) / floats.length) * 1e4) / 1e4 : 0.25;
  const wear = wearForFloat(float)?.id || 'FT';
  return [...chances].map(([itemId, chance]) => {
    const it = ITEMS_BY_ID[itemId];
    const w = it.hasWear ? wear : null;
    return { itemId, chance, wear: w, float: it.hasWear ? float : null, value: itemValue(itemId, w) };
  }).sort((a, b) => b.value - a.value);
}

export function quoteContract(player, uids, cfg = CONTRACT) {
  if (!Array.isArray(uids) || uids.length !== cfg.size) return fail('size', `A contract needs exactly ${cfg.size} items.`);
  const check = checkConsumable(player, uids);
  if (!check.ok) return check;
  const rarity = ITEMS_BY_ID[check.items[0].itemId].rarity;
  for (const inst of check.items) {
    const it = ITEMS_BY_ID[inst.itemId];
    if (it.rarity !== rarity) return fail('mixed', 'All items in a contract must share one rarity.');
    if (!contractEligible(inst.itemId)) return fail('ineligible', `${it.name} can't be used in a contract.`);
  }
  const outcomes = contractOutcomes(check.items);
  const inputValue = check.items.reduce((s, i) => s + instanceValue(i), 0);
  const expected = outcomes.reduce((s, o) => s + o.chance * o.value, 0);
  return { ok: true, items: check.items, rarity, outputRarity: nextRarity(rarity), outcomes, inputValue, expected };
}

export function signContract(player, uids, { rng = secureRandom, now = Date.now() } = {}) {
  const q = quoteContract(player, uids);
  if (!q.ok) return q;
  const out = pickWeighted(q.outcomes.map(o => ({ weight: o.chance, value: o })), rng);

  // --- validated: apply everything ---
  const inputs = removeItems(player, uids);
  const item = acquireItem(player, { itemId: out.itemId, wear: out.wear, float: out.float }, 'contract', now);
  player.stats.contractsCompleted += 1;
  const record = {
    at: now, inputValue: q.inputValue,
    inputs: inputs.map(i => ({ itemId: i.itemId, wear: i.wear, float: i.float, value: instanceValue(i) })),
    output: { itemId: item.itemId, wear: item.wear, float: item.float, value: out.value },
  };
  player.contracts.unshift(record);
  if (player.contracts.length > CONTRACT.historyLimit) player.contracts.length = CONTRACT.historyLimit;
  log(player, { type: 'contract', at: now, delta: 0, count: inputs.length, itemId: item.itemId, wear: item.wear, value: out.value });
  return { ok: true, item, value: out.value, chance: out.chance, record };
}

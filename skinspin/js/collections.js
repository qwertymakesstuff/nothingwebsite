// Collections: progress (every item ever obtained counts), and one-time completion rewards.

import { COLLECTION_REWARD } from './config.js';
import { ITEMS, ITEMS_BY_ID, COLLECTIONS, COLLECTION_BY_ID } from './items.js';
import { RARITY_BY_ID } from './rarities.js';
import { CASES } from './cases.js';
import { fail, log } from './economy.js';

export const COLLECTION_ITEMS = Object.freeze(Object.fromEntries(COLLECTIONS.map(c => [c.id,
  ITEMS.filter(i => i.collection === c.id)
    .sort((a, b) => RARITY_BY_ID[b.rarity].rank - RARITY_BY_ID[a.rarity].rank || b.value - a.value)
    .map(i => i.id)])));

export function collectionReward(colId) {
  const total = COLLECTION_ITEMS[colId].reduce((s, id) => s + ITEMS_BY_ID[id].value, 0);
  const coins = Math.max(COLLECTION_REWARD.roundTo, Math.round((total * COLLECTION_REWARD.rewardShare) / COLLECTION_REWARD.roundTo) * COLLECTION_REWARD.roundTo);
  return { coins, xp: COLLECTION_REWARD.xp };
}

// Cases that can drop at least one item of this collection.
export function collectionSources(colId) {
  const ids = new Set(COLLECTION_ITEMS[colId]);
  return CASES.filter(c => c.pool.some(id => ids.has(id))).map(c => c.id);
}

export function collectionProgress(player, colId) {
  const items = COLLECTION_ITEMS[colId];
  const log_ = new Set(player.collectionLog);
  const found = items.filter(id => log_.has(id)).length;
  const owned = {};
  for (const i of player.inventory) if (ITEMS_BY_ID[i.itemId].collection === colId) owned[i.itemId] = (owned[i.itemId] || 0) + 1;
  return {
    total: items.length, found, pct: found / items.length, complete: found === items.length,
    claimed: !!player.collectionsClaimed[colId], claimedAt: player.collectionsClaimed[colId] || null,
    collected: items.filter(id => log_.has(id)), missing: items.filter(id => !log_.has(id)), owned,
  };
}

// Pays the completion reward once. A second claim (refresh, revisit, another tab) is refused.
export function claimCollection(player, colId, { now = Date.now() } = {}) {
  if (!COLLECTION_BY_ID[colId]) return fail('unknown', 'That collection does not exist.');
  const p = collectionProgress(player, colId);
  if (p.claimed) return fail('claimed', 'You already collected this reward.');
  if (!p.complete) return fail('incomplete', `Collect all ${p.total} items first (${p.found}/${p.total}).`);
  const reward = collectionReward(colId);
  player.coins += reward.coins;
  player.xp += reward.xp;
  player.collectionsClaimed[colId] = now;
  player.stats.collectionsCompleted += 1;
  log(player, { type: 'collection', at: now, delta: reward.coins, collectionId: colId, xp: reward.xp });
  return { ok: true, ...reward };
}

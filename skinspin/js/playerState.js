// The single player-state shape, plus levels. Every feature reads and writes this object
// (through economy.js transactions, via store.js), so coins, items and stats never diverge.

import { SAVE_VERSION, STARTING_COINS } from './config.js';
import { RARITIES } from './rarities.js';

export function defaultSettings() {
  return {
    instantOpen: false,     // skip the roulette and reveal straight away
    motion: 'system',       // 'system' | 'reduced' | 'full'
    sound: true,
    protectFavorites: true, // bulk selling leaves favourites alone unless switched off
  };
}

export function emptyStats() {
  return {
    casesOpened: 0,
    coinsSpent: 0,
    itemsObtained: 0,
    itemsSold: 0,
    coinsFromSales: 0,
    refillsClaimed: 0,
    rarityCounts: Object.fromEntries(RARITIES.map(r => [r.id, 0])),
    casesById: {},
    bestDrop: null,          // { itemId, wear, float, value, at, caseId }
  };
}

export function createPlayer(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    name: 'Player',
    coins: STARTING_COINS,
    xp: 0,
    nextId: 1,
    inventory: [],           // [{ uid, itemId, wear, float, acquiredAt, source, locked, favorite }]
    recentDrops: [],         // newest first: { itemId, wear, float, at, caseId }
    activity: [],            // newest first: { id, type, at, delta, ...detail }
    stats: emptyStats(),
    settings: defaultSettings(),
    createdAt: now,
  };
}

// XP needed to go from `level` to `level + 1`.
export function xpToNext(level) {
  return 100 + (level - 1) * 75;
}

export const MAX_LEVEL = 100;

export function levelInfo(xp) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp) || 0);
  while (level < MAX_LEVEL && rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level += 1;
  }
  const needed = level < MAX_LEVEL ? xpToNext(level) : 0;
  return { level, into: rest, needed, progress: needed ? rest / needed : 1 };
}

export function xpForOpening(price) {
  return Math.max(5, Math.round(price / 5));
}

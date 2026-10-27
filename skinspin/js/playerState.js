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
    upgradesAttempted: 0,
    upgradesWon: 0,
    contractsCompleted: 0,
    battlesPlayed: 0,
    battlesWon: 0,
    marketBought: 0,
    marketSpent: 0,
    marketSold: 0,
    marketEarned: 0,
    collectionsCompleted: 0,
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
    collectionLog: [],       // every item id ever obtained (collection progress)
    collectionsClaimed: {},  // collection id -> time its completion reward was paid
    upgrades: [],            // newest first: upgrade results
    contracts: [],           // newest first: trade-up results
    battles: [],             // newest first: settled battles, kept for replays and history
    market: emptyMarket(),
    freeReadyAt: {},         // free case id -> time it can next be opened
  };
}

export function emptyMarket() {
  return {
    npc: [],          // NPC listings: { id, itemId, wear, float, price, seller, listedAt, featured }
    mine: [],         // the player's listings; the item sits here (out of the inventory) until sold or cancelled
    lastTick: 0,      // last time NPC buyers were simulated
    lastListing: 0,   // last time NPC sellers added a listing
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

// Tuning knobs shared by every SkinSpin system.

export const SAVE_KEY = 'skinspin.save';
export const SAVE_BACKUP_PREFIX = 'skinspin.save.backup.';
export const SAVE_VERSION = 2;

export const STARTING_COINS = 5000;
export const MAX_COINS = 1e12;

export const ACTIVITY_LIMIT = 200;
export const RECENT_DROPS_LIMIT = 24;

// Broke-player safety net: claimable only when coins plus inventory value can't buy the cheapest case.
export const REFILL_AMOUNT = 1000;

export const ROULETTE = {
  length: 64,        // cards in the strip
  winnerIndex: 54,   // where the predetermined winner sits
  duration: 6500,    // ms of the main spin
  settle: 380,       // ms of the final glide onto the exact centre
  jitter: 0.7,       // landing spread as a fraction of a card width (stays inside the card)
};

export const NAME_MAX = 20;

// Upgrades: chance = (input value / target value) x (1 - houseEdge), capped at maxChance.
export const UPGRADE = {
  houseEdge: 0.08,
  minMultiplier: 1.2,   // the target must be worth at least this many times the input
  maxMultiplier: 100,
  maxChance: 0.8,
  historyLimit: 30,
};

// Trade-up contracts: `size` items of one rarity become one item of the next rarity.
export const CONTRACT = {
  size: 10,
  historyLimit: 30,
};

// Collection completion pays `rewardShare` of the collection's total Field-Tested value, plus XP.
export const COLLECTION_REWARD = { rewardShare: 0.2, xp: 500, roundTo: 10 };

export const BATTLE = {
  maxRounds: 10,
  minPlayers: 2,
  maxPlayers: 4,
  historyLimit: 20,
  xpShare: 0.2,          // XP per battle = entry cost x xpShare
};

export const MARKET = {
  priceBand: 0.15,        // simulated market price stays within +-15% of the item's value
  npcListingMin: 0.94,    // NPC asking price, as a share of the market price
  npcListingMax: 1.12,
  playerPriceMin: 0.5,    // player asking prices are limited to 50%..200% of market price
  playerPriceMax: 2,
  fee: 0.05,              // taken from the player's proceeds when an NPC buys their listing
  initialListings: 24,
  maxNpcListings: 40,
  newListingEvery: 3 * 60 * 1000,   // one new NPC listing per 3 minutes of real time
  maxNewPerTick: 6,
  maxPlayerListings: 20,
  historyDays: 30,
  dayMs: 24 * 60 * 60 * 1000,
}; 

// Tuning knobs and storage keys. Everything the rules read that a designer might want to tweak
// lives here, so balance passes never have to touch effect code.

export const GRID_COLS = 5;
export const GRID_ROWS = 4;
export const GRID_SIZE = GRID_COLS * GRID_ROWS;

export const SAVE_VERSION = 1;
export const RUN_KEY = 'rentfall.run';
export const PROFILE_KEY = 'rentfall.profile';
export const SETTINGS_KEY = 'rentfall.settings';

export const CURRENCY = '¤';

export const START_COLLECTION = ['coin', 'coin', 'worker', 'apple', 'cat', 'pigeon'];
export const START_MONEY = 0;

export const DELIVERY_CHOICES = 3;
export const MAX_DELIVERY_CHOICES = 5;
export const MAX_ITEMS = 3;
export const MAX_EXTRA_SPINS_PER_DEADLINE = 3;
export const HISTORY_LIMIT = 30;

export const RARITIES = {
  common: { label: 'Common', price: 5, order: 0 },
  uncommon: { label: 'Uncommon', price: 10, order: 1 },
  rare: { label: 'Rare', price: 18, order: 2 },
  legendary: { label: 'Legendary', price: 32, order: 3 },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'legendary'];

// Draft weights by deadline index (0-based). Early deliveries are mostly commons; rares appear
// from the second deadline and legendaries from the fifth.
export function rarityWeights(deadline) {
  const d = Math.max(0, deadline);
  return {
    common: Math.max(30, 100 - d * 6),
    uncommon: 22 + d * 3,
    rare: d < 1 ? 0 : 4 + d * 1.6,
    legendary: d < 4 ? 0 : 0.8 + (d - 4) * 0.5,
  };
}

// Shop prices rise 9% per deadline so savings keep their value but early buys feel cheaper.
export const INFLATION_PER_DEADLINE = 0.09;
export const MAX_DISCOUNT = 0.3;
export const SHOP = {
  symbolOffers: 4,
  relicOffers: 2,
  itemOffers: 2,
  rerollBase: 3,
  rerollStep: 2,
  removeBase: 4,
  removeStep: 3,
  deliveryRerollBase: 2,
};

// Tuning knobs shared by every SkinSpin system.

export const SAVE_KEY = 'skinspin.save';
export const SAVE_BACKUP_PREFIX = 'skinspin.save.backup.';
export const SAVE_VERSION = 1;

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

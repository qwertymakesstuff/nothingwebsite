// Tuning knobs shared by the logic modules. Everything that decides pay, patience or pacing lives
// here so balance changes happen in one place.

export const SAVE_KEY = 'lastcall.save';
export const CHECKPOINT_KEY = 'lastcall.checkpoint';
export const SETTINGS_KEY = 'lastcall.settings';
export const SAVE_VERSION = 1;

export const STARTING_MONEY = 60;
export const GAME_YEAR = 2031;

// Pay rules (dollars).
export const PAY = {
  perCorrect: 3,
  citationBonus: 2,        // refusing with the right reason
  streakEvery: 5,          // every N correct calls in a row...
  streakBonus: 5,          // ...earns this
  earlyFinishBonus: 15,    // queue cleared before the clock runs out
  performanceBonus: 20,    // rating at least target + 15
  fineWrongAdmit: 20,      // let in someone who should have been refused
  fineUnderage: 35,        // ...and they were underage or had no ID
  fineWrongRefuse: 8,      // turned away someone who was fine
  walkoutDeduction: 3,
  sentHomeWageFactor: 0.5,
  food: 10,
};

// Speed tips: decision time (s) -> multiplier on a customer's tip.
export const SPEED_TIERS = [
  { max: 12, mult: 1.5, label: 'quick' },
  { max: 22, mult: 1.0, label: 'steady' },
  { max: 40, mult: 0.6, label: 'slow' },
  { max: Infinity, mult: 0.3, label: 'very slow' },
];

// Base queue patience (seconds) by personality.
export const PATIENCE = {
  calm: 150, cheerful: 130, chatty: 120, shy: 140, confused: 125,
  nervous: 110, grumpy: 85, arrogant: 80, impatient: 75, rowdy: 90,
};

export const RATING = {
  accuracyWeight: 70,
  throughputWeight: 30,
  walkoutPenalty: 2,
};

export const CAREER = {
  maxWarnings: 3,        // missing the target this many times gets you fired
  evictionDebt: -120,    // balance below this after a paycheck = evicted
};

// Height tolerance between the ID and the person (cm).
export const HEIGHT_TOLERANCE = 5;

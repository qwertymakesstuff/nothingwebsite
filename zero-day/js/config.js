// Global tuning knobs for ZERO DAY. All money is fictional "credits" (¢R).
export const SAVE_KEY = 'zeroday.save.v1';
export const CUR = '₢'; // fictional currency glyph

export const START = {
  money: 420,
  xp: 0,
  rep: 0,
  level: 1,
};

// XP needed to reach the NEXT level from level L. Gentle early, steeper later.
export function xpForLevel(level) {
  return Math.round(120 * Math.pow(level, 1.55));
}

// Reputation tiers gate which target difficulty is purchasable / visible.
export const REP_TIERS = [
  { tier: 1, name: 'Script Kiddie', minRep: 0 },
  { tier: 2, name: 'Carder', minRep: 60 },
  { tier: 3, name: 'Operator', minRep: 200 },
  { tier: 4, name: 'Ghost', minRep: 520 },
  { tier: 5, name: 'Zero Day', minRep: 1100 },
];

// How much a tier is unlocked: need rep >= gate AND level >= gate.
export const TIER_GATE = {
  1: { rep: 0, level: 1 },
  2: { rep: 55, level: 3 },
  3: { rep: 190, level: 6 },
  4: { rep: 500, level: 10 },
  5: { rep: 1050, level: 15 },
};

// Base stats before any upgrades. Upgrades add to these.
export const BASE_STATS = {
  cpu: 1,        // processing: more time / attempts in timed games
  crack: 1,      // cracking software: better password & exploit hints
  stealth: 1,    // reduces detection gained from failures
  storage: 60,   // GB available for data extraction
  recon: 2,      // reveals more clues during recon
  netanalysis: 1,// network mapping: reveals more monitored nodes
  prepSlots: 1,  // how many consumables you can stage before an op
};

// Detection thresholds (0..100). Crossing them has escalating effects.
export const DETECT = {
  nervous: 45,   // puzzles gain a restriction
  hunted: 70,    // some routes close; trace begins
  burned: 100,   // forced abort + full consequence
};

export const TITLES = {
  level: n => `Lvl ${n}`,
};

// Legacy: what survives a prestige. Pure data and maths (no state changes, no economy import),
// so the economy can read the bonuses directly. The prestige action lives in prestige.js.
//
// Imperial Seals, the prestige currency:
//   seals earned in total = floor( cube root( all-time crowns / SEAL_BASE ) )
// so the 1st seal needs 1 B crowns, 10 seals need 1 T and 100 need 1 Qa: each new seal costs
// more than the last, and a long run is always worth more than a short one, never less.
// Every seal ever earned adds SEAL_BONUS (+5%) to all production, spent or not.
import BigNum, { ZERO, ONE } from './bigNum.js';

export const SEAL_BASE = 1e9;
export const SEAL_BONUS = 0.05;

export function createLegacy() {
  return {
    seals: ZERO,          // seals available to spend
    sealsEarned: ZERO,    // every seal ever earned (the production bonus counts these)
    prestiges: 0,         // empires founded after the first
    lifetimeEarned: ZERO, // crowns earned in all previous runs (this run: state.totalEarned)
    lifetimeClicks: 0,    // clicks in all previous runs
    playTime: 0,          // seconds played in all previous runs
    bestRunEarned: ZERO,  // most crowns earned in one run
    upgrades: {},         // legacy upgrade levels ({ id: level })
    unlockedEver: {},     // every building ever unlocked (for Inherited Deeds)
  };
}

// total seals that `lifetime` crowns are worth; exact at every boundary
export function sealsFor(lifetime) {
  const x = BigNum.from(lifetime).div(SEAL_BASE);
  if (x.lt(1)) return ZERO;
  const estimate = BigNum.fromLog10(x.log10() / 3);
  if (!estimate.isSmall() || estimate.gte(2 ** 50)) return estimate.floor();
  // floating-point cube roots can land a hair off a whole number: settle it against the
  // exact boundary that lifetimeForSeals defines, so the two always agree
  const L = BigNum.from(lifetime);
  let n = Math.round(estimate.toNumber());
  while (n > 0 && lifetimeForSeals(n).gt(L)) n--;
  while (lifetimeForSeals(n + 1).lte(L)) n++;
  return BigNum.from(n);
}

// all-time crowns needed for `seals` seals in total
export function lifetimeForSeals(seals) {
  return BigNum.from(seals).pow(3).mul(SEAL_BASE);
}

// ---- legacy upgrades, bought with seals ----
//   cost(level) is the price of the next level, in seals
export const LEGACY_UPGRADES = [
  { id: 'seed', name: 'Seed Capital', maxLevel: 5,
    description: 'Start every new empire with crowns in hand: 1 K, then x100 per level (up to 100 B). The increase is paid at once, too.',
    cost: l => [1, 3, 10, 30, 100][l] },
  { id: 'deeds', name: 'Inherited Deeds', maxLevel: 1,
    description: 'Every building you have ever unlocked is open from the start of each new empire.',
    cost: () => 5 },
  { id: 'hands', name: 'Golden Hands', maxLevel: 3,
    description: 'Clicks are worth x2 per level.',
    cost: l => [2, 8, 32][l] },
  { id: 'mandate', name: 'Imperial Mandate', maxLevel: 10,
    description: 'All production x1.25 per level, compounding. Price doubles each level.',
    cost: l => 3 * 2 ** l },
  { id: 'bricks', name: 'Cheaper Bricks', maxLevel: 5,
    description: 'Every building costs 5% less per level.',
    cost: l => [4, 12, 36, 108, 324][l] },
];
export const LEGACY_BY_ID = Object.fromEntries(LEGACY_UPGRADES.map(u => [u.id, u]));

export function legacyLevel(legacy, id) {
  const def = LEGACY_BY_ID[id];
  return def ? Math.max(0, Math.min(def.maxLevel, Math.floor(legacy.upgrades[id] || 0))) : 0;
}

// ---- the bonuses, read by the economy ----
export function sealMult(legacy) { return ONE.add(legacy.sealsEarned.mul(SEAL_BONUS)); }
export function mandateMult(legacy) { return 1.25 ** legacyLevel(legacy, 'mandate'); }
export function legacyClickMult(legacy) { return 2 ** legacyLevel(legacy, 'hands'); }
export function priceMult(legacy) { return 1 - 0.05 * legacyLevel(legacy, 'bricks'); }
export function startingCrowns(legacy) {
  const l = legacyLevel(legacy, 'seed');
  return l ? BigNum.from(1000).mul(BigNum.from(100).pow(l - 1)) : ZERO;
}

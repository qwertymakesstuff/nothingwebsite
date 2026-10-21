// Milestones: rewards for owning many of one building, and empire ranks for total earnings.
// Pure data and maths (no state changes), so the economy can use them directly.
import BigNum from './bigNum.js';

// owning `count` of one building multiplies that building's output by `mult` (they stack);
// the first copy is celebrated but gives no bonus
export const OWNERSHIP_MILESTONES = [
  { count: 1, mult: 1 },
  { count: 10, mult: 1.5 },
  { count: 25, mult: 1.5 },
  { count: 50, mult: 1.5 },
  { count: 100, mult: 2 },
  { count: 150, mult: 1.5 },
  { count: 200, mult: 2 },
  { count: 300, mult: 2 },
  { count: 400, mult: 2 },
  { count: 500, mult: 3 },
];

// combined milestone multiplier for owning `owned` of a building
export function milestoneMult(owned) {
  let m = 1;
  for (const ms of OWNERSHIP_MILESTONES) if (owned >= ms.count) m *= ms.mult;
  return m;
}

export function nextMilestone(owned) {
  return OWNERSHIP_MILESTONES.find(ms => ms.count > owned) || null;
}

// empire ranks by crowns earned in total; each rank above the first adds +5% to all production
export const RANK_BONUS = 0.05;
export const RANKS = [
  { name: 'Street Peddler', earned: 0 },
  { name: 'Shopkeeper', earned: 1e3 },
  { name: 'Merchant', earned: 1e5 },
  { name: 'Guildmaster', earned: 1e7 },
  { name: 'Industrialist', earned: 1e9 },
  { name: 'Tycoon', earned: 1e11 },
  { name: 'Magnate', earned: 1e13 },
  { name: 'Baron', earned: 1e15 },
  { name: 'Duke', earned: 1e17 },
  { name: 'Archduke', earned: 1e19 },
  { name: 'Sovereign', earned: 1e21 },
  { name: 'Emperor', earned: 1e24 },
];

export function rankIndex(totalEarned) {
  const earned = BigNum.from(totalEarned);
  let i = 0;
  while (i + 1 < RANKS.length && earned.gte(RANKS[i + 1].earned)) i++;
  return i;
}

export function rankMult(index) {
  return 1 + RANK_BONUS * index;
}

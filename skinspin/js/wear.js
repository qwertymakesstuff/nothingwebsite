// Wear conditions: a float in [0, 1) decides the tier, the tier scales the item's value.

import { pickWeighted } from './rng.js';

export const WEARS = [
  { id: 'FN', name: 'Factory New', min: 0, max: 0.07, weight: 10, mult: 1.4 },
  { id: 'MW', name: 'Minimal Wear', min: 0.07, max: 0.15, weight: 20, mult: 1.15 },
  { id: 'FT', name: 'Field-Tested', min: 0.15, max: 0.38, weight: 40, mult: 1 },
  { id: 'WW', name: 'Well-Worn', min: 0.38, max: 0.45, weight: 13, mult: 0.85 },
  { id: 'BS', name: 'Battle-Scarred', min: 0.45, max: 1, weight: 17, mult: 0.7 },
].map(w => Object.freeze(w));

export const WEAR_BY_ID = Object.freeze(Object.fromEntries(WEARS.map(w => [w.id, w])));

const WEAR_TOTAL = WEARS.reduce((s, w) => s + w.weight, 0);
export const WEAR_CHANCES = Object.freeze(Object.fromEntries(WEARS.map(w => [w.id, w.weight / WEAR_TOTAL])));

export function rollWear(rng) {
  const w = pickWeighted(WEARS.map(x => ({ weight: x.weight, value: x })), rng);
  const raw = w.min + rng() * (w.max - w.min);
  const float = Math.min(Math.floor(raw * 1e4) / 1e4, w.max - 1e-4);
  return { wear: w.id, float: Math.max(w.min, float) };
}

export function wearForFloat(float) {
  return WEARS.find(w => float >= w.min && float < w.max) || null;
}

export function wearMultiplier(wearId) {
  return wearId && WEAR_BY_ID[wearId] ? WEAR_BY_ID[wearId].mult : 1;
}

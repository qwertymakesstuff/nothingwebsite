// Random generation: placing the collection on the grid and rolling symbol offers. Every draw goes
// through the run's seeded RNG.

import { GRID_SIZE, RARITY_ORDER, rarityWeights } from './config.js';
import { DRAFTABLE } from './symbols.js';
import { shuffle, weighted, pick } from './rng.js';

// Up to 20 random symbols from the collection go into random slots; the rest sit this spin out.
// With `landlord`, one random slot is taken by the Landlord first.
export function placeGrid(uids, rng, { landlord = false } = {}) {
  const grid = new Array(GRID_SIZE).fill(null);
  let slots = shuffle(rng, [...Array(GRID_SIZE).keys()]);
  if (landlord) { grid[slots[0]] = 'landlord'; slots = slots.slice(1); }
  const chosen = shuffle(rng, uids).slice(0, slots.length);
  chosen.forEach((uid, k) => { grid[slots[k]] = uid; });
  return { grid, leftOver: Math.max(0, uids.length - chosen.length) };
}

export function randomSymbolOfRarity(rng, rarity, exclude = []) {
  let pool = DRAFTABLE.filter(s => s.rarity === rarity && !exclude.includes(s.id));
  if (!pool.length) pool = DRAFTABLE.filter(s => s.rarity === 'common');
  return pick(rng, pool).id;
}

export function rollRarity(rng, deadline) {
  const w = rarityWeights(deadline);
  return weighted(rng, RARITY_ORDER.map(r => [r, w[r]])) || 'common';
}

// `n` distinct symbol ids, each with an independently rolled rarity.
export function rollSymbols(rng, deadline, n, exclude = []) {
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const id = randomSymbolOfRarity(rng, rollRarity(rng, deadline), [...exclude, ...out]);
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

// Crafting, cooking and machines (furnace, preserves jar).

import { RECIPES, MACHINES } from './data/recipes.js';
import { ITEMS_BY_ID, matches } from './data/items.js';
import { CROPS_BY_ID } from './data/crops.js';
import { OBJECTS } from './data/objects.js';
import { test } from './conditions.js';
import { count, removeAll, canAdd, add, remove } from './inventory.js';
import { absMinutes, dayIndex } from './calendar.js';
import { CLOCK } from './config.js';

export const knownRecipes = (state, station = null) => RECIPES.filter(r => (r.station || null) === station && test(state, r.unlock));
export const allRecipes = (station = null) => RECIPES.filter(r => (r.station || null) === station);

export function craftProblem(state, r) {
  if (!test(state, r.unlock)) return 'You have not learned this yet.';
  if (r.station === 'kitchen' && !state.unlocks.kitchen) return 'You need a working kitchen.';
  for (const [t, n] of Object.entries(r.in)) if (count(state, t) < n) return 'Missing ingredients.';
  if (!canAdd(state, r.out, r.n)) return 'No room in your bag.';
  return null;
}

export function craft(state, r) {
  if (craftProblem(state, r)) return false;
  if (!removeAll(state, r.in)) return false;
  add(state, r.out, r.n);
  const bucket = r.station === 'kitchen' ? 'cooked' : 'crafted';
  state.stats[bucket][r.out] = (state.stats[bucket][r.out] || 0) + r.n;
  state.seen[r.out] = true;
  return true;
}

// --- machines -------------------------------------------------------------------------------
// A machine object carries { job: { out, ready } } while working; ready is absolute minutes.
export function machineInput(state, type, heldId) {
  const m = MACHINES[OBJECTS[type]?.machine];
  if (!m || !heldId) return null;
  for (const inp of m.inputs) {
    const ok = inp.item ? heldId === inp.item : matches(heldId, `cat:${inp.cat}`);
    if (ok) return inp;
  }
  return null;
}

export function loadMachine(state, obj, heldId) {
  if (obj.job) return { error: 'It is already working.' };
  const inp = machineInput(state, obj.t, heldId);
  if (!inp) return { error: OBJECTS[obj.t].machine === 'furnace' ? 'Needs 5 copper or iron ore and 1 coal.' : 'Put a crop in to make jam or pickles.' };
  if (count(state, heldId) < inp.n) return { error: `Needs ${inp.n} ${ITEMS_BY_ID[heldId].name}.` };
  for (const [id, n] of Object.entries(inp.also || {})) if (count(state, id) < n) return { error: `Also needs ${n} ${ITEMS_BY_ID[id].name}.` };
  remove(state, heldId, inp.n);
  for (const [id, n] of Object.entries(inp.also || {})) remove(state, id, n);
  const out = typeof inp.out === 'function' ? inp.out(CROPS_BY_ID[heldId]) : inp.out;
  const now = absMinutes(state.date);
  const ready = inp.overnight ? Math.max(now + 600, (dayIndex(state.date) + 1) * 1440 + CLOCK.dayStart) : now + inp.minutes;
  obj.job = { out, ready };
  return { out };
}

export const machineReady = (state, obj) => !!obj.job && absMinutes(state.date) >= obj.job.ready;

export function collectMachine(state, obj) {
  if (!machineReady(state, obj)) return null;
  if (!canAdd(state, obj.job.out, 1)) return { error: 'No room in your bag.' };
  const out = obj.job.out;
  add(state, out, 1);
  state.stats.crafted[out] = (state.stats.crafted[out] || 0) + 1;
  state.seen[out] = true;
  obj.job = null;
  return { out };
}

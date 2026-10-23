// The player's symbol collection: instances (one per owned symbol, with their own counters and
// upgrades) and the passive effects owned symbols and relics give outside the grid.

import { SYMBOL_BY_ID } from './symbols.js';
import { RELIC_BY_ID } from './relics.js';
import { DEADLINES, NOTICES } from './rent.js';
import { DELIVERY_CHOICES, MAX_DELIVERY_CHOICES, MAX_DISCOUNT } from './config.js';

export function addInstance(run, id) {
  if (!SYMBOL_BY_ID[id] || SYMBOL_BY_ID[id].board) return null;
  const inst = { uid: `s${run.nextUid++}`, id, bonus: 0, laminated: false, data: {} };
  run.collection.push(inst);
  run.stats.added += 1;
  return inst;
}

export function removeInstance(run, uid) {
  const k = run.collection.findIndex(s => s.uid === uid);
  if (k < 0) return null;
  return run.collection.splice(k, 1)[0];
}

export const countOf = (run, id) => run.collection.filter(s => s.id === id).length;

// Shop discount from Coupons (10% each, capped), plus any one-off discount on this shop visit.
export function shopDiscount(run, extra = 0) {
  const coupons = run.collection.reduce((s, x) => s + (SYMBOL_BY_ID[x.id]?.passive?.discount || 0), 0);
  return Math.min(0.5, Math.min(MAX_DISCOUNT, coupons) + extra);
}

export function deliveryChoices(run) {
  let n = DELIVERY_CHOICES;
  n += run.collection.reduce((s, x) => s + (SYMBOL_BY_ID[x.id]?.passive?.deliveryChoices || 0), 0);
  n += run.relics.reduce((s, id) => s + (RELIC_BY_ID[id]?.deliveryChoices || 0), 0);
  n += NOTICES[DEADLINES[run.deadline]?.notice]?.deliveryChoices || 0;
  return Math.min(MAX_DELIVERY_CHOICES, n);
}

// Summary used by the collection screen: owned symbols grouped by id.
export function groupCollection(run) {
  const groups = new Map();
  for (const inst of run.collection) {
    if (!groups.has(inst.id)) groups.set(inst.id, { id: inst.id, def: SYMBOL_BY_ID[inst.id], items: [] });
    groups.get(inst.id).items.push(inst);
  }
  return [...groups.values()];
}

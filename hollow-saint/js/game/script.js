// Interaction scripts: pick the first variant whose conditions hold, and describe its effects.
// Pure functions over a run state, so every branch can be tested without a browser.
//
// Conditions (`when`):
//   all / none: flags        has / lacks: items        count: { key: minimum }
//   times: n / minTimes: n   (how often this particular thing has been interacted with)
// Effects: set / clear flags, give / take items, note (journal), heal, save, sfx, flash, shake,
//   and hand-offs to the presentation layer: doc, tape, talk, go { to, spawn }.

import { ITEMS } from './items.js';
import { giveItem, takeItem, addNote, MAX_HP } from './state.js';

export function conditionHolds(when, state, id) {
  if (!when) return true;
  const has = f => state.flags.has(f);
  const carrying = i => state.items.includes(i);
  if (when.all && !when.all.every(has)) return false;
  if (when.none && when.none.some(has)) return false;
  if (when.has && !when.has.every(carrying)) return false;
  if (when.lacks && when.lacks.some(carrying)) return false;
  if (when.count) for (const [k, n] of Object.entries(when.count)) if ((state.counts[k] || 0) < n) return false;
  const n = (id && state.counts[id]) || 0;
  if (when.times !== undefined && n !== when.times) return false;
  if (when.minTimes !== undefined && n < when.minTimes) return false;
  return true;
}

export function pickVariant(script, state, id) {
  if (!script) return null;
  return script.find(v => conditionHolds(v.when, state, id)) || null;
}

const list = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

// apply a variant's state changes and return what the presentation layer should do
export function applyEffects(v, state) {
  for (const f of list(v.set)) state.flags.add(f);
  for (const f of list(v.clear)) state.flags.delete(f);
  const got = [];
  for (const i of list(v.give)) if (giveItem(state, i)) got.push(i);
  for (const i of list(v.take)) takeItem(state, i);
  for (const n of list(v.note)) addNote(state, n);
  if (v.heal) state.hp = MAX_HP;
  return got;
}

export function runVariant(v, state, id) {
  if (!v) return null;
  const got = applyEffects(v, state);
  if (id) {
    state.counts[id] = (state.counts[id] || 0) + 1;
    state.flags.add('looked:' + id);
  }
  const lines = list(v.say).slice();
  for (const i of got) lines.push(`[ Taken: ${ITEMS[i]?.name || i}. ]`);
  return {
    lines,
    got,
    sfx: v.sfx || (got.length ? 'pickup' : null),
    flash: v.flash || null,
    shake: !!v.shake,
    save: !!v.save,
    doc: v.doc || null,
    tape: v.tape || null,
    talk: v.talk || null,
    go: v.go || null,
  };
}

export const runScript = (script, state, id) => runVariant(pickVariant(script, state, id), state, id);

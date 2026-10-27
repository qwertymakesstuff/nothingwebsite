// Interaction scripts: pick the first variant whose conditions hold, and describe its effects.
// Pure functions over a run state, so every branch can be tested without a browser.
//
// Conditions (`when`):
//   all / none: flags        has / lacks: items        count: { key: minimum }
//   noted: journal entries   chapter: minimum chapter
//   times: n / minTimes: n   (how often this particular thing has been interacted with)
// Effects: set / clear flags, give / take items, note (journal), heal, save, chapter, and for
//   the world: spawn (entities, in tiles), hurt (wounds). For the presentation layer: sfx,
//   flash, shake, glitch (frames of screen tearing), lights { mode: 'flicker'|'out', t },
//   figure { sprite, x, y, t } (a brief apparition), bell, and hand-offs: doc, tape, talk,
//   go { to, spawn }. `puzzle: [name, arg]` asks puzzles.js what happens and plays that too.

import { ITEMS } from './items.js';
import { giveItem, takeItem, addNote, MAX_HP } from './state.js';
import { solvePuzzle } from './puzzles.js';

export function conditionHolds(when, state, id) {
  if (!when) return true;
  const has = f => state.flags.has(f);
  const carrying = i => state.items.includes(i);
  if (when.all && !when.all.every(has)) return false;
  if (when.none && when.none.some(has)) return false;
  if (when.has && !when.has.every(carrying)) return false;
  if (when.lacks && when.lacks.some(carrying)) return false;
  if (when.count) for (const [k, n] of Object.entries(when.count)) if ((state.counts[k] || 0) < n) return false;
  if (when.noted && !when.noted.every(n => state.notes.includes(n))) return false;
  if (when.chapter !== undefined && (state.chapter || 1) < when.chapter) return false;
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
  if (v.chapter && v.chapter > (state.chapter || 1)) {
    state.chapter = v.chapter;
    state.flags.add('ch' + v.chapter);
  }
  return got;
}

const PASS = ['sfx', 'flash', 'doc', 'tape', 'talk', 'go', 'glitch', 'lights', 'figure', 'bell', 'spawn', 'hurt', 'ending'];

export function runVariant(v, state, id) {
  if (!v) return null;
  const got = applyEffects(v, state);
  if (id) {
    state.counts[id] = (state.counts[id] || 0) + 1;
    state.flags.add('looked:' + id);
  }
  const lines = list(v.say).slice();
  for (const i of got) lines.push(`[ Taken: ${ITEMS[i]?.name || i}. ]`);
  const out = {
    lines, got,
    sfx: null, flash: null, shake: !!v.shake, save: !!v.save, chapter: v.chapter || null,
    doc: null, tape: null, talk: null, go: null, glitch: 0, lights: null, figure: null, bell: null, spawn: null, hurt: 0, ending: null,
  };
  for (const k of PASS) if (v[k]) out[k] = v[k];
  if (!out.sfx && got.length) out.sfx = 'pickup';
  // a puzzle decides the rest
  if (v.puzzle) {
    const sub = runVariant(solvePuzzle(state, v.puzzle), state, null);
    out.lines.push(...sub.lines);
    for (const k of [...PASS, 'chapter']) if (sub[k]) out[k] = sub[k];
    out.shake = out.shake || sub.shake;
  }
  return out;
}

export const runScript = (script, state, id) => runVariant(pickVariant(script, state, id), state, id);

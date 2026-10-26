// Interaction scripts: pick the first variant whose conditions hold, and describe its effects.
// Pure functions over a run state, so every branch can be tested without a browser.

export function conditionHolds(when, state, id) {
  if (!when) return true;
  const has = f => state.flags.has(f);
  if (when.all && !when.all.every(has)) return false;
  if (when.none && when.none.some(has)) return false;
  const n = (id && state.counts[id]) || 0;
  if (when.times !== undefined && n !== when.times) return false;
  if (when.minTimes !== undefined && n < when.minTimes) return false;
  return true;
}

export function pickVariant(script, state, id) {
  if (!script) return null;
  return script.find(v => conditionHolds(v.when, state, id)) || null;
}

// apply a variant's state changes and return what the presentation layer should do
export function runVariant(v, state, id) {
  if (!v) return null;
  for (const f of v.set || []) state.flags.add(f);
  for (const f of v.clear || []) state.flags.delete(f);
  if (id) {
    state.counts[id] = (state.counts[id] || 0) + 1;
    state.flags.add('looked:' + id);
  }
  return {
    lines: (v.say || []).slice(),
    sfx: v.sfx || null,
    flash: v.flash || null,
    save: !!v.save,
  };
}

export const runScript = (script, state, id) => runVariant(pickVariant(script, state, id), state, id);

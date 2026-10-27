// Small helpers for writing scripts.

export const n = text => ['say', null, text];
export const say = (who, text) => ['say', who, text];

// pick a script by story beat, falling back to `other`: byBeat({ oct4: [...], oct5: s => [...] }, fallback)
export const byBeat = (map, other = []) => s => {
  const v = map[s.beat] ?? other;
  return typeof v === 'function' ? v(s) : v;
};

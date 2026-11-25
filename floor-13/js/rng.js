// Small seeded RNG (mulberry32) with helpers. Floors are generated from seeds so a floor you
// return to in the same night is the same floor (until the building decides otherwise).
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  r.shuffle = arr => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  r.weighted = (items, wf) => {
    const ws = items.map(wf); const tot = ws.reduce((s, w) => s + Math.max(0, w), 0);
    if (tot <= 0) return null;
    let x = r() * tot;
    for (let i = 0; i < items.length; i++) { x -= Math.max(0, ws[i]); if (x < 0) return items[i]; }
    return items[items.length - 1];
  };
  return r;
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

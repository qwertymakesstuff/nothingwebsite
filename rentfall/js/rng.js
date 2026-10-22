// Seeded randomness with a state that can be saved. The whole run draws from one stream kept in
// `run.rng`, so the same seed and the same choices always produce the same game.

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const seedToState = seed => (typeof seed === 'number' ? seed >>> 0 : hashString(String(seed)));

// A generator object: `next()` returns [0, 1); `state` is the integer to persist.
export function createRng(state) {
  const r = { state: state >>> 0 };
  r.next = () => {
    r.state = (r.state + 0x6D2B79F5) >>> 0;
    let t = r.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return r;
}

export const int = (rng, lo, hi) => lo + Math.floor(rng.next() * (hi - lo + 1));
export const chance = (rng, p) => rng.next() < p;
export const pick = (rng, arr) => arr[Math.floor(rng.next() * arr.length)];

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function weighted(rng, entries) {
  const live = entries.filter(([, w]) => w > 0);
  const total = live.reduce((s, [, w]) => s + w, 0);
  if (!live.length) return null;
  let r = rng.next() * total;
  for (const [v, w] of live) { r -= w; if (r < 0) return v; }
  return live[live.length - 1][0];
}

// Readable seeds for the new-run screen ("MOTH-4821").
const WORDS = ['RAIN', 'MOTH', 'LEASE', 'ATTIC', 'BRICK', 'KETTLE', 'PIGEON', 'LAMP', 'STAIR', 'DOOR', 'RADIO', 'TOAST'];
export function randomSeedString(random = Math.random) {
  return `${WORDS[Math.floor(random() * WORDS.length)]}-${String(Math.floor(random() * 10000)).padStart(4, '0')}`;
}

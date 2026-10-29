// Deterministic, seedable RNG so operations can be reproduced and tested.
export function seeded(seedStr) {
  let h = 1779033703 ^ String(seedStr).length;
  for (let i = 0; i < String(seedStr).length; i++) {
    h = Math.imul(h ^ String(seedStr).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngInt(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
export function rngPick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function rngShuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function rngSample(rng, arr, n) { return rngShuffle(rng, arr).slice(0, n); }
export function uid() { return Math.random().toString(36).slice(2, 10); }

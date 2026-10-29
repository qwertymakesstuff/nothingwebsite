// Seeded random numbers (mulberry32). The whole market draws from one stream whose state is a
// single 32-bit integer, so a run can be saved, reloaded and replayed exactly.

export function hashSeed(seed) {
  const s = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}

export function createRng(state = 1) {
  const rng = {
    state: state >>> 0,
    next() {
      let t = (rng.state = (rng.state + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(a, b) { return a + (b - a) * rng.next(); },
    int(a, b) { return Math.floor(rng.range(a, b + 1)); },
    chance(p) { return rng.next() < p; },
    pick(list) { return list[Math.floor(rng.next() * list.length)]; },
    // standard normal via Box-Muller (one value per call keeps the state simple to save)
    gauss() {
      const u = Math.max(rng.next(), 1e-12), v = rng.next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    weighted(entries) { // [[value, weight], ...]
      const total = entries.reduce((s, e) => s + e[1], 0);
      let r = rng.next() * total;
      for (const [v, w] of entries) { if ((r -= w) < 0) return v; }
      return entries[entries.length - 1][0];
    },
  };
  return rng;
}

export function randomSeed() {
  return Math.floor(Math.random() * 1e9).toString(36).toUpperCase();
}

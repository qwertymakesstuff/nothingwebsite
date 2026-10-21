// Randomness: a secure default for real rolls, a seeded generator for tests.

export function secureRandom() {
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === 'function') {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
}

// mulberry32
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// entries: [{ weight, value }]. Entries with weight <= 0 are never picked.
export function pickWeighted(entries, rng) {
  const live = entries.filter(e => e.weight > 0);
  if (!live.length) throw new Error('pickWeighted: nothing to pick');
  const total = live.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of live) {
    r -= e.weight;
    if (r < 0) return e.value;
  }
  return live[live.length - 1].value;
}

export function pickIndex(length, rng) {
  return Math.min(length - 1, Math.floor(rng() * length));
}

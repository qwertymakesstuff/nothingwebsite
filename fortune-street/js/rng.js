// Seeded random numbers. The generator's whole state is one uint32 kept inside the game
// state (state.rng.s), so a saved game rolls exactly the same dice after it is restored,
// and a test can replay a match from its seed. No game rule ever calls Math.random (the UI only uses it for cosmetic dice tumbling).

export function makeSeed() {
  const buf = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(buf);
  else buf[0] = (Date.now() * 2654435761) >>> 0;
  return buf[0] >>> 0;
}

// mulberry32: advances rng.s and returns a float in [0, 1)
export function nextRandom(rng) {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rollDie(rng) {
  return 1 + Math.floor(nextRandom(rng) * 6);
}

// Fisher-Yates on a copy
export function shuffle(rng, items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(rng) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

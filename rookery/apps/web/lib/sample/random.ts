// Deterministic pseudo-random numbers so sample data is identical on every build and render.

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 */
export function seeded(seed: number | string): () => number {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random walk ending at `end`, `n` points long. */
export function walk(rand: () => number, end: number, n: number, step: number): number[] {
  const out = [end];
  for (let i = 1; i < n; i++) out.unshift(Math.round(out[0]! - (rand() - 0.45) * step));
  return out;
}

/** Fixed "now" for sample timestamps (keeps static builds deterministic). */
export const SAMPLE_NOW = Date.parse('2026-11-25T18:00:00Z');

export function daysAgo(days: number, hours = 0): string {
  return new Date(SAMPLE_NOW - days * 86_400_000 - hours * 3_600_000).toISOString();
}

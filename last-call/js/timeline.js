// Shift time: real seconds on the shift timer map linearly onto the venue's opening hours.

import { fromClock } from './dates.js';

export const clockRange = def => def.clock.map(c => (typeof c === 'number' ? c : fromClock(c)));
export function clockAt(def, t) {
  const [a, b] = clockRange(def);
  return a + (Math.max(0, Math.min(t, def.duration)) / def.duration) * (b - a);
}

// Arrival times for n guests: a few already waiting when the doors open, the rest spread across
// the first `arrivalSpan` of the shift with a little seeded jitter.
export function arrivalTimes(def, n, rng) {
  const start = Math.min(def.startQueue ?? 2, n);
  const out = [];
  for (let i = 0; i < start; i++) out.push(i * 0.5);
  const rest = n - start;
  const span = def.duration * (def.arrivalSpan ?? 0.72);
  const t0 = 6;
  for (let i = 0; i < rest; i++) {
    const base = t0 + ((i + 0.5) / rest) * (span - t0);
    const jitter = (rng() - 0.5) * (span / Math.max(rest, 1)) * 0.6;
    out.push(Math.max(t0, base + jitter));
  }
  return out.sort((a, b) => a - b);
}

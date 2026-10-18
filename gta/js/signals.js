// Traffic signal timing (pure, so it can be unit-tested). An 18 s cycle, offset per intersection so the city doesn't pulse in sync.
export const CYCLE = 18;
export function lightPhase(a, b, t) {
  const u = ((t + (a * 3 + b * 5)) % CYCLE + CYCLE) % CYCLE;
  if (u < 7) return { x: 'green', z: 'red' };
  if (u < 9) return { x: 'yellow', z: 'red' };
  if (u < 16) return { x: 'red', z: 'green' };
  return { x: 'red', z: 'yellow' };
}

// Chess clock maths, with no timers inside. The caller passes in "now" (server time on the
// realtime server, performance.now() locally), so the same code is exact and testable everywhere.

export type Color = 'white' | 'black';

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  incrementMs: number;
  /** Side whose clock is running, or null before the first move / after the game. */
  running: Color | null;
  /** Timestamp (ms) at which the running clock last started. */
  startedAt: number | null;
}

export function createClock(initialMs: number, incrementMs: number): ClockState {
  return { whiteMs: initialMs, blackMs: initialMs, incrementMs, running: null, startedAt: null };
}

/** Time left for a side at `now`, without changing state. Never negative. */
export function remaining(clock: ClockState, color: Color, now: number): number {
  const base = color === 'white' ? clock.whiteMs : clock.blackMs;
  if (clock.running !== color || clock.startedAt === null) return base;
  return Math.max(0, base - (now - clock.startedAt));
}

/** Start `color`'s clock (used when the game starts or a move hands the turn over). */
export function start(clock: ClockState, color: Color, now: number): ClockState {
  return { ...clock, running: color, startedAt: now };
}

/**
 * The side to move finished its move at `now`. Deducts its time (minus `compensationMs`
 * for network lag, never giving back more than was used), adds the increment, then starts the
 * opponent's clock. Returns `flagged: true` if the mover had already run out of time.
 */
export function press(
  clock: ClockState,
  now: number,
  compensationMs = 0,
): { clock: ClockState; flagged: boolean } {
  const mover = clock.running;
  if (mover === null || clock.startedAt === null) {
    throw new Error('press() called while no clock is running');
  }
  const used = Math.max(0, now - clock.startedAt - Math.max(0, compensationMs));
  const before = mover === 'white' ? clock.whiteMs : clock.blackMs;
  const left = before - used;
  if (left <= 0) {
    const stopped = { ...clock, running: null, startedAt: null };
    return { clock: setTime(stopped, mover, 0), flagged: true };
  }
  const next = setTime(clock, mover, left + clock.incrementMs);
  return { clock: start(next, other(mover), now), flagged: false };
}

/** Stop all clocks at `now` (game over), freezing the running side's time. */
export function stop(clock: ClockState, now: number): ClockState {
  if (clock.running === null) return clock;
  const left = remaining(clock, clock.running, now);
  return setTime({ ...clock, running: null, startedAt: null }, clock.running, left);
}

/** Timestamp at which the running side flags, or null if no clock is running. */
export function flagAt(clock: ClockState): number | null {
  if (clock.running === null || clock.startedAt === null) return null;
  const base = clock.running === 'white' ? clock.whiteMs : clock.blackMs;
  return clock.startedAt + base;
}

export function other(color: Color): Color {
  return color === 'white' ? 'black' : 'white';
}

function setTime(clock: ClockState, color: Color, ms: number): ClockState {
  return color === 'white' ? { ...clock, whiteMs: ms } : { ...clock, blackMs: ms };
}

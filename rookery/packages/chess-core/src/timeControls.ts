// Time controls offered on Rookery. Pure data: the UI, matchmaking and ratings all read from here.

export type RatingCategory = 'bullet' | 'blitz' | 'rapid' | 'classical';

export interface TimeControl {
  /** Stable id used in URLs, queues and the database, e.g. "5+0". */
  id: string;
  initialMs: number;
  incrementMs: number;
  category: RatingCategory;
  /** Short label for chips, e.g. "5 min" or "3 | 2". */
  label: string;
}

const MIN = 60_000;
const SEC = 1_000;

function tc(minutes: number, incrementSeconds: number): TimeControl {
  const initialMs = minutes * MIN;
  const incrementMs = incrementSeconds * SEC;
  return {
    id: `${minutes}+${incrementSeconds}`,
    initialMs,
    incrementMs,
    category: categoryFor(initialMs, incrementMs),
    label: incrementSeconds === 0 ? `${minutes} min` : `${minutes} | ${incrementSeconds}`,
  };
}

/**
 * Category from the estimated game length (initial + 40 moves of increment),
 * the usual convention: < 3 min bullet, < 8 min blitz, < 25 min rapid, otherwise classical.
 */
export function categoryFor(initialMs: number, incrementMs: number): RatingCategory {
  const estimated = initialMs + 40 * incrementMs;
  if (estimated < 3 * MIN) return 'bullet';
  if (estimated < 8 * MIN) return 'blitz';
  if (estimated < 25 * MIN) return 'rapid';
  return 'classical';
}

export const TIME_CONTROLS: readonly TimeControl[] = [
  tc(1, 0),
  tc(2, 1),
  tc(3, 0),
  tc(3, 2),
  tc(5, 0),
  tc(5, 3),
  tc(10, 0),
  tc(10, 5),
  tc(15, 10),
  tc(30, 0),
];

/** The three quick-play chips on the dashboard. */
export const QUICK_PLAY_IDS = ['5+0', '3+0', '10+0'] as const;

export function getTimeControl(id: string): TimeControl | undefined {
  return TIME_CONTROLS.find((t) => t.id === id);
}

// Data that is still SAMPLE content (see lib/sample/README.md). Everything else (profiles,
// ratings, games, statistics, achievements, leaderboards, settings) is real and comes from
// Supabase through lib/db.ts. Each function here names the stage that replaces it.

import { ROSTER, tierInfo, type Persona, type TierInfo } from '@rookery/ai';
import { PUZZLE_THEMES, SAMPLE_DAILY_PUZZLE, SAMPLE_PUZZLES } from '../sample/puzzles';
import type { PuzzleSummary, Sourced } from '../types';

const sample = <T>(data: T): Sourced<T> => ({ data, source: 'sample' });

// ── Computer opponents (live: the configured roster in packages/ai) ─────────────────────
export function getBots(): Sourced<{ tiers: TierInfo[]; bots: Persona[] }> {
  return { data: { tiers: tierInfo(), bots: [...ROSTER] }, source: 'live' };
}

// ── Puzzles (Stage 6: Lichess CC0 puzzle import) ───────────────────────────────────────
export function getDailyPuzzle(): Sourced<PuzzleSummary> {
  return sample(SAMPLE_DAILY_PUZZLE);
}

export function getPuzzles(): Sourced<{ puzzles: PuzzleSummary[]; themes: string[] }> {
  return sample({ puzzles: SAMPLE_PUZZLES, themes: PUZZLE_THEMES });
}

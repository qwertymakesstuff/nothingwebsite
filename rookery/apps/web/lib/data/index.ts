// Data access for the whole site. Pages call these functions and never import lib/sample
// directly. Each function says which stage replaces its sample data with real data; when that
// happens its return `source` becomes 'live' and the sample notices disappear by themselves.

import { ACHIEVEMENTS, sampleUnlocks, type Achievement } from '../sample/achievements';
import { SAMPLE_BOTS, BOT_TIERS } from '../sample/bots';
import { SAMPLE_GAMES, sampleGamesFor } from '../sample/games';
import { PREVIEW_USERNAME, SAMPLE_PROFILES, sampleLeaderboard, sampleProfile } from '../sample/players';
import { PUZZLE_THEMES, SAMPLE_DAILY_PUZZLE, SAMPLE_PUZZLES } from '../sample/puzzles';
import type {
  BotProfile,
  Category,
  GameSummary,
  LeaderboardEntry,
  Profile,
  PuzzleSummary,
  Sourced,
} from '../types';

const sample = <T>(data: T): Sourced<T> => ({ data, source: 'sample' });

// ── Players (Stage 2: Supabase `profiles`, `ratings`) ───────────────────────────────────
/** The profile used to preview the dashboard until sign-in exists. */
export function getPreviewProfile(): Sourced<Profile> {
  return sample(sampleProfile(PREVIEW_USERNAME)!);
}

export function getProfile(username: string): Sourced<Profile> | null {
  const p = sampleProfile(username);
  return p ? sample(p) : null;
}

/** Usernames to prerender at /u/[username] (static export). Stage 2 serves profiles dynamically. */
export function listProfileUsernames(): string[] {
  return SAMPLE_PROFILES.map((p) => p.username);
}

export function getOnlineFriends(): Sourced<Profile[]> {
  return sample(SAMPLE_PROFILES.filter((p) => p.online && p.username !== PREVIEW_USERNAME).slice(3, 8));
}

// ── Games (Stage 4/5: `games` table) ───────────────────────────────────────────────────
export function getRecentGames(username: string, limit = 10): Sourced<GameSummary[]> {
  return sample(sampleGamesFor(username).slice(0, limit));
}

export function getAllSampleGames(): Sourced<GameSummary[]> {
  return sample(SAMPLE_GAMES);
}

// ── Leaderboards (Stage 7: materialised leaderboard views) ──────────────────────────────
export function getLeaderboard(category: Category): Sourced<LeaderboardEntry[]> {
  return sample(sampleLeaderboard(category));
}

// ── Computer opponents (Stage 3: packages/ai personas) ─────────────────────────────────
export function getBots(): Sourced<{ tiers: typeof BOT_TIERS; bots: BotProfile[] }> {
  return sample({ tiers: BOT_TIERS, bots: SAMPLE_BOTS });
}

// ── Puzzles (Stage 6: Lichess CC0 puzzle import) ───────────────────────────────────────
export function getDailyPuzzle(): Sourced<PuzzleSummary> {
  return sample(SAMPLE_DAILY_PUZZLE);
}

export function getPuzzles(): Sourced<{ puzzles: PuzzleSummary[]; themes: string[] }> {
  return sample({ puzzles: SAMPLE_PUZZLES, themes: PUZZLE_THEMES });
}

// ── Achievements (Stage 9: achievements config + `user_achievements`) ─────────────────
export function getAchievements(username: string): Sourced<{ achievement: Achievement; unlockedAt: string | null }[]> {
  const unlocks = sampleUnlocks(username);
  return sample(ACHIEVEMENTS.map((a) => ({ achievement: a, unlockedAt: unlocks[a.id] ?? null })));
}

export type { Achievement };

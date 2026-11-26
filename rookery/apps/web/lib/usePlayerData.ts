'use client';

// Loads everything shown about a player (profile, ratings, stats, games, achievements) from
// Supabase, with explicit loading / not-found / error states.

import { useCallback, useEffect, useState } from 'react';
import {
  fetchAchievements,
  fetchGames,
  fetchProfileByUsername,
  fetchRatings,
  fetchStats,
  type AchievementRow,
  type GameRow,
  type ProfileRow,
  type RatingRow,
  type StatsRow,
} from './db';

export interface PlayerData {
  profile: ProfileRow;
  ratings: RatingRow[];
  stats: StatsRow[];
  games: GameRow[];
  achievements: AchievementRow[];
}

export type PlayerState = { status: 'loading' } | { status: 'notFound' } | { status: 'error'; message: string } | { status: 'ready'; data: PlayerData };

export function usePlayerData(username: string | null, opts: { gameLimit?: number } = {}) {
  const [state, setState] = useState<PlayerState>({ status: 'loading' });
  const limit = opts.gameLimit ?? 50;

  const load = useCallback(async () => {
    if (!username) return;
    setState({ status: 'loading' });
    try {
      const profile = await fetchProfileByUsername(username);
      if (!profile) return setState({ status: 'notFound' });
      const [ratings, stats, games, achievements] = await Promise.all([
        fetchRatings(profile.id),
        fetchStats(profile.id),
        fetchGames(profile.id, limit),
        fetchAchievements(profile.id),
      ]);
      setState({ status: 'ready', data: { profile, ratings, stats, games, achievements } });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not load this player.' });
    }
  }, [username, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}

/** Totals across all games (optionally one source). */
export function totals(stats: StatsRow[], source?: string) {
  const rows = source ? stats.filter((s) => s.source === source) : stats;
  return rows.reduce((a, s) => ({ games: a.games + s.games, wins: a.wins + s.wins, draws: a.draws + s.draws, losses: a.losses + s.losses }), { games: 0, wins: 0, draws: 0, losses: 0 });
}

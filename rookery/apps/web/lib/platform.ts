'use client';

// Stage 6 data access: puzzles, friends, notifications, search, explorer, tournaments, reviews,
// reports and moderation. Same rules as lib/db.ts: the publishable key + Row Level Security for
// reads and the player's own writes; anything that decides a result goes through /api (server).

import type { PuzzleMoveResponse } from '@rookery/protocol';
import { useEffect, useState } from 'react';
import { api, check, type GameRow } from './db';
import { supabase } from './supabase/client';

// ── Puzzles ───────────────────────────────────────────────────────────────────────────────
export interface PuzzleRow {
  id: string;
  fen: string;
  first_move: string;
  rating: number;
  rd: number;
  plays: number;
  solves: number;
  themes: string[];
}
const PUZZLE_COLS = 'id, fen, first_move, rating, rd, plays, solves, themes';

export async function fetchPuzzle(id: string): Promise<PuzzleRow | null> {
  return check(await supabase().from('puzzles').select(PUZZLE_COLS).eq('id', id).maybeSingle()) as PuzzleRow | null;
}

export async function dailyPuzzleId(): Promise<string | null> {
  return check(await supabase().rpc('daily_puzzle')) as string | null;
}

/** A puzzle you haven't tried near your rating (guests: near `guestRating`), optionally by theme. */
export async function nextPuzzleId(theme: string | null, guestRating: number | null, exclude: string[]): Promise<string | null> {
  return check(await supabase().rpc('next_puzzle', { p_theme: theme, p_rating: guestRating, p_exclude: exclude })) as string | null;
}

export interface PuzzleStats {
  attempts: number;
  solved: number;
  solved_today: number;
  best_streak: number;
  current_streak: number;
}
export async function fetchPuzzleStats(userId: string): Promise<PuzzleStats> {
  const rows = check(await supabase().rpc('puzzle_stats', { p_user: userId })) as PuzzleStats[];
  return rows[0] ?? { attempts: 0, solved: 0, solved_today: 0, best_streak: 0, current_streak: 0 };
}

export interface PuzzleAttemptRow {
  puzzle_id: string;
  solved: boolean;
  rating_before: number | null;
  rating_after: number | null;
  created_at: string;
}
export async function fetchMyPuzzleHistory(limit = 30): Promise<PuzzleAttemptRow[]> {
  return (check(await supabase().from('puzzle_attempts').select('puzzle_id, solved, rating_before, rating_after, created_at').order('created_at', { ascending: false }).limit(limit)) ?? []) as PuzzleAttemptRow[];
}

/** Plays the solver's moves so far (server checks them against the secret solution). */
export function puzzleMove(id: string, moves: string[], help?: 'hint' | 'solution'): Promise<PuzzleMoveResponse> {
  return api<PuzzleMoveResponse>('POST', `/api/puzzles/${id}/move`, { moves, ...(help ? { help } : {}) }, { optionalAuth: true });
}

export async function puzzleThemes(): Promise<{ theme: string; count: number }[]> {
  // Small table: count themes in the browser from the public columns.
  const rows = (check(await supabase().from('puzzles').select('themes').limit(5000)) ?? []) as { themes: string[] }[];
  const counts = new Map<string, number>();
  for (const r of rows) for (const t of r.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count);
}

// ── Ratings over time ─────────────────────────────────────────────────────────────────────
export interface RatingPoint {
  category: string;
  rating: number;
  created_at: string;
}
export async function fetchRatingHistory(userId: string): Promise<RatingPoint[]> {
  return (check(await supabase().from('rating_history').select('category, rating, created_at').eq('user_id', userId).order('created_at').limit(2000)) ?? []) as RatingPoint[];
}

// ── Friends ───────────────────────────────────────────────────────────────────────────────
export interface FriendRow {
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  requester: { username: string; display_name: string | null; avatar_path: string | null; country: string | null } | null;
  addressee: { username: string; display_name: string | null; avatar_path: string | null; country: string | null } | null;
}
const FRIEND_COLS =
  'requester_id, addressee_id, status, created_at, requester:profiles!friendships_requester_id_fkey(username, display_name, avatar_path, country), addressee:profiles!friendships_addressee_id_fkey(username, display_name, avatar_path, country)';

/** Friendships involving `userId` (own requests included when it's you). */
export async function fetchFriendships(userId: string): Promise<FriendRow[]> {
  return (check(await supabase().from('friendships').select(FRIEND_COLS).or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).order('created_at', { ascending: false })) ?? []) as unknown as FriendRow[];
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  check(await supabase().from('friendships').insert({ addressee_id: addresseeId }));
}
export async function acceptFriendRequest(requesterId: string, me: string): Promise<void> {
  check(await supabase().from('friendships').update({ status: 'accepted' }).eq('requester_id', requesterId).eq('addressee_id', me));
}
/** Declines, cancels or unfriends. */
export async function removeFriendship(a: string, b: string): Promise<void> {
  check(await supabase().from('friendships').delete().or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`));
}

// ── Notifications ─────────────────────────────────────────────────────────────────────────
export interface NotificationRow {
  id: number;
  kind: 'friend_request' | 'friend_accepted' | 'achievement' | 'tournament_started' | 'tournament_finished' | 'report_resolved' | 'restriction';
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor: { username: string; avatar_path: string | null } | null;
}
export async function fetchNotifications(limit = 50): Promise<NotificationRow[]> {
  return (check(
    await supabase().from('notifications').select('id, kind, data, read_at, created_at, actor:profiles!notifications_actor_id_fkey(username, avatar_path)').order('created_at', { ascending: false }).limit(limit),
  ) ?? []) as unknown as NotificationRow[];
}
export async function unreadCount(): Promise<number> {
  const { count, error } = await supabase().from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
export async function markNotificationsRead(ids?: number[]): Promise<void> {
  let q = supabase().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (ids) q = q.in('id', ids);
  check(await q);
}

// ── Search, explorer ──────────────────────────────────────────────────────────────────────
export interface PlayerHit {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  country: string | null;
  blitz: number | null;
  rapid: number | null;
}
export async function searchPlayers(q: string): Promise<PlayerHit[]> {
  return (check(await supabase().rpc('search_players', { q, lim: 30 })) ?? []) as PlayerHit[];
}

export interface ExplorerMove {
  move: string;
  games: number;
  white_wins: number;
  draws: number;
  black_wins: number;
  avg_rating: number | null;
}
export async function explorerMoves(moves: string[], source: 'people' | 'computer' | 'all', ratedOnly: boolean): Promise<ExplorerMove[]> {
  const rows = (check(await supabase().rpc('explorer_moves', { p_moves: moves.join(' '), p_source: source, p_rated_only: ratedOnly })) ?? []) as ExplorerMove[];
  return rows.map((r) => ({ ...r, games: Number(r.games), white_wins: Number(r.white_wins), draws: Number(r.draws), black_wins: Number(r.black_wins) }));
}

// ── Games and reviews ─────────────────────────────────────────────────────────────────────
export async function fetchGame(id: string): Promise<GameRow | null> {
  return check(
    await supabase()
      .from('games')
      .select('id, white_id, black_id, bot_id, bot_name, bot_elo, source, rated, category, time_control, initial_fen, moves, plies, result, termination, opening, ended_at, white_rating, black_rating, white_delta, black_delta, tournament_id, white:profiles!games_white_id_fkey(username, avatar_path), black:profiles!games_black_id_fkey(username, avatar_path)')
      .eq('id', id)
      .maybeSingle(),
  ) as unknown as GameRow | null;
}

export interface StoredEval {
  /** Centipawns from White's point of view (mates mapped to ±(100000 - n)). */
  cp: number;
  mate: number | null;
  best: string | null;
  pv: string[];
}
export interface ReviewRow {
  game_id: string;
  evals: StoredEval[];
  engine: string;
  depth: number;
  created_at: string;
}
export async function fetchReview(gameId: string): Promise<ReviewRow | null> {
  return check(await supabase().from('game_reviews').select('game_id, evals, engine, depth, created_at').eq('game_id', gameId).maybeSingle()) as ReviewRow | null;
}
export async function saveReview(gameId: string, evals: StoredEval[], engine: string, depth: number, exists: boolean): Promise<void> {
  if (exists) check(await supabase().from('game_reviews').update({ evals, engine, depth, updated_at: new Date().toISOString() }).eq('game_id', gameId));
  else check(await supabase().from('game_reviews').insert({ game_id: gameId, evals, engine, depth }));
}

// ── Tournaments ───────────────────────────────────────────────────────────────────────────
export interface TournamentRow {
  id: string;
  name: string;
  created_by: string | null;
  time_control: string;
  category: string;
  rated: boolean;
  starts_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'running' | 'finished' | 'cancelled';
  winner_id: string | null;
  player_count: number;
  finished_at: string | null;
  winner?: { username: string } | null;
}
const T_COLS = 'id, name, created_by, time_control, category, rated, starts_at, duration_minutes, status, winner_id, player_count, finished_at, winner:profiles!tournaments_winner_id_fkey(username)';

export async function fetchTournaments(): Promise<{ live: TournamentRow[]; upcoming: TournamentRow[]; finished: TournamentRow[] }> {
  const sb = supabase();
  const [live, upcoming, finished] = await Promise.all([
    sb.from('tournaments').select(T_COLS).eq('status', 'running').order('starts_at'),
    sb.from('tournaments').select(T_COLS).eq('status', 'scheduled').order('starts_at').limit(50),
    sb.from('tournaments').select(T_COLS).eq('status', 'finished').order('finished_at', { ascending: false }).limit(20),
  ]);
  return { live: (check(live) ?? []) as unknown as TournamentRow[], upcoming: (check(upcoming) ?? []) as unknown as TournamentRow[], finished: (check(finished) ?? []) as unknown as TournamentRow[] };
}
export async function fetchTournament(id: string): Promise<TournamentRow | null> {
  return check(await supabase().from('tournaments').select(T_COLS).eq('id', id).maybeSingle()) as unknown as TournamentRow | null;
}
export interface StandingRow {
  user_id: string;
  score: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  rating: number;
  rank: number | null;
  profile: { username: string; avatar_path: string | null } | null;
}
export async function fetchStandings(id: string): Promise<StandingRow[]> {
  return (check(
    await supabase().from('tournament_players').select('user_id, score, games, wins, draws, losses, rating, rank, profile:profiles!tournament_players_user_id_fkey(username, avatar_path)').eq('tournament_id', id).order('score', { ascending: false }).limit(200),
  ) ?? []) as unknown as StandingRow[];
}
export function createTournament(t: { name: string; tc: string; rated: boolean; startsInMinutes: number; durationMinutes: number }): Promise<{ id: string }> {
  return api<{ id: string }>('POST', '/api/tournaments', t);
}
export function cancelTournament(id: string): Promise<void> {
  return api<void>('POST', `/api/tournaments/${id}/cancel`, {});
}

// ── Reports ───────────────────────────────────────────────────────────────────────────────
export type ReportReason = 'cheating' | 'abuse' | 'spam' | 'inappropriate_profile' | 'sandbagging' | 'other';
export async function fileReport(targetId: string, reason: ReportReason, details: string, gameId?: string | null): Promise<void> {
  const { error } = await supabase().from('reports').insert({ target_id: targetId, reason, details: details || null, game_id: gameId ?? null });
  if (error) throw new Error(error.message.includes('report_limit') ? 'You’ve filed the maximum number of reports for today.' : error.message.includes('report_duplicate') ? 'You already have an open report about this player.' : error.message);
}

export interface RestrictionRow {
  id: number;
  user_id: string;
  kind: 'mute' | 'no_play' | 'no_tournaments' | 'ban';
  reason: string;
  expires_at: string | null;
  created_at: string;
  lifted_at: string | null;
}
/** Your own restrictions currently in force (shown as a banner). */
export async function fetchMyActiveRestrictions(userId: string): Promise<RestrictionRow[]> {
  const rows = (check(await supabase().from('restrictions').select('id, user_id, kind, reason, expires_at, created_at, lifted_at').eq('user_id', userId).is('lifted_at', null)) ?? []) as RestrictionRow[];
  return rows.filter((r) => !r.expires_at || Date.parse(r.expires_at) > Date.now());
}

// ── Social & chat settings (account-level) ────────────────────────────────────────────────
export interface SocialSettings {
  allow_challenges: 'all' | 'friends' | 'none';
  chat: 'all' | 'friends' | 'presets' | 'off';
}
export async function fetchSocialSettings(userId: string): Promise<SocialSettings | null> {
  return check(await supabase().from('user_settings').select('allow_challenges, chat').eq('user_id', userId).maybeSingle()) as SocialSettings | null;
}
export async function saveSocialSettings(userId: string, s: Partial<SocialSettings>): Promise<void> {
  check(await supabase().from('user_settings').update(s).eq('user_id', userId));
}

// ── Staff ─────────────────────────────────────────────────────────────────────────────────

/** The signed-in player's staff role, if any (the database enforces it; this only shapes the UI). */
export function useStaffRole(userId: string | null): 'admin' | 'moderator' | null {
  const [role, setRole] = useState<'admin' | 'moderator' | null>(null);
  useEffect(() => {
    if (!userId) return setRole(null);
    let alive = true;
    void supabase()
      .from('staff')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => alive && setRole((data?.role as 'admin' | 'moderator' | undefined) ?? null));
    return () => {
      alive = false;
    };
  }, [userId]);
  return role;
}

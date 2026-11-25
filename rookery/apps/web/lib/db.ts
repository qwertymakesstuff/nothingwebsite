'use client';

// Typed access to Supabase for the browser. Uses the public (publishable) key, so every query is
// subject to Row Level Security: players can read public data and change only their own
// profile fields and settings. Games, ratings and achievements are read-only here; they are
// written by the server (/api/games and, later, the realtime game server).

import type { BotGameSaved, BotGameSubmission } from '@rookery/protocol';
import { SUPABASE_URL } from './config';
import type { Preferences } from './preferences';
import { supabase } from './supabase/client';

export type RatingCategory = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'puzzle';
export const RATING_CATEGORIES: RatingCategory[] = ['bullet', 'blitz', 'rapid', 'classical', 'puzzle'];

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  country: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface RatingRow {
  category: RatingCategory;
  rating: number;
  rd: number;
  games: number;
  peak: number | null;
}

export interface StatsRow {
  source: string;
  category: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface GameRow {
  id: string;
  white_id: string | null;
  black_id: string | null;
  bot_id: string | null;
  bot_name: string | null;
  bot_elo: number | null;
  source: string;
  rated: boolean;
  category: string;
  time_control: string;
  initial_fen: string;
  moves: string;
  plies: number;
  result: '1-0' | '0-1' | '1/2-1/2';
  termination: string;
  opening: string | null;
  ended_at: string;
  white?: { username: string } | null;
  black?: { username: string } | null;
}

export interface AchievementRow {
  id: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
  icon: string;
  sort: number;
  unlocked_at: string | null;
}

export interface LeaderboardRow {
  rating: number;
  rd: number;
  games: number;
  profile: Pick<ProfileRow, 'username' | 'display_name' | 'country' | 'avatar_path'>;
}

const PROFILE_COLS = 'id, username, display_name, avatar_path, bio, country, created_at, last_seen_at';

export function avatarUrl(path: string | null | undefined): string | undefined {
  return path ? `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}` : undefined;
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ── Profiles ──────────────────────────────────────────────────────────────────────────────
export async function fetchOwnProfile(userId: string): Promise<ProfileRow | null> {
  return check(await supabase().from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle());
}

export async function fetchProfileByUsername(username: string): Promise<ProfileRow | null> {
  if (!/^[A-Za-z0-9_-]{3,20}$/.test(username)) return null;
  // `username` is citext, so this match is case-insensitive.
  return check(await supabase().from('profiles').select(PROFILE_COLS).eq('username', username).maybeSingle());
}

export async function usernameAvailable(name: string): Promise<boolean> {
  return Boolean(check(await supabase().rpc('username_available', { name })));
}

export interface ProfilePatch {
  display_name?: string | null;
  bio?: string | null;
  country?: string | null;
  avatar_path?: string | null;
}

export async function updateProfile(userId: string, patch: ProfilePatch): Promise<void> {
  check(await supabase().from('profiles').update(patch).eq('id', userId));
}

/** Uploads a new avatar (already resized) and points the profile at it; removes the old file. */
export async function uploadAvatar(userId: string, blob: Blob, previous: string | null): Promise<string> {
  const path = `${userId}/avatar-${Date.now().toString(36)}.webp`;
  const up = await supabase().storage.from('avatars').upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (up.error) throw new Error(up.error.message);
  await updateProfile(userId, { avatar_path: path });
  if (previous) await supabase().storage.from('avatars').remove([previous]);
  return path;
}

export async function removeAvatar(userId: string, previous: string | null): Promise<void> {
  await updateProfile(userId, { avatar_path: null });
  if (previous) await supabase().storage.from('avatars').remove([previous]);
}

// ── Ratings, stats, games, achievements ──────────────────────────────────────────────────
export async function fetchRatings(userId: string): Promise<RatingRow[]> {
  const rows = check(await supabase().from('ratings').select('category, rating, rd, games, peak').eq('user_id', userId));
  return (rows ?? []).map((r) => ({ ...r, rating: Number(r.rating), rd: Number(r.rd), peak: r.peak === null ? null : Number(r.peak) })) as RatingRow[];
}

export async function fetchStats(userId: string): Promise<StatsRow[]> {
  return check(await supabase().from('player_stats').select('source, category, games, wins, draws, losses').eq('user_id', userId)) ?? [];
}

export async function fetchGames(userId: string, limit = 50): Promise<GameRow[]> {
  return (
    check(
      await supabase()
        .from('games')
        .select('id, white_id, black_id, bot_id, bot_name, bot_elo, source, rated, category, time_control, initial_fen, moves, plies, result, termination, opening, ended_at, white:profiles!games_white_id_fkey(username), black:profiles!games_black_id_fkey(username)')
        .or(`white_id.eq.${userId},black_id.eq.${userId}`)
        .order('ended_at', { ascending: false })
        .limit(limit),
    ) ?? []
  ) as unknown as GameRow[];
}

export async function fetchAchievements(userId: string): Promise<AchievementRow[]> {
  const [catalogue, unlocks] = await Promise.all([
    supabase().from('achievements').select('id, name, description, tier, icon, sort').order('sort'),
    supabase().from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', userId),
  ]);
  const got = new Map((check(unlocks) ?? []).map((u) => [u.achievement_id as string, u.unlocked_at as string]));
  return (check(catalogue) ?? []).map((a) => ({ ...(a as Omit<AchievementRow, 'unlocked_at'>), unlocked_at: got.get(a.id as string) ?? null }));
}

export async function fetchAchievementNames(): Promise<Map<string, string>> {
  const rows = check(await supabase().from('achievements').select('id, name')) ?? [];
  return new Map(rows.map((r) => [r.id as string, r.name as string]));
}

/** Players with at least one rated game in the category, best first. */
export async function fetchLeaderboard(category: RatingCategory, limit = 100): Promise<LeaderboardRow[]> {
  const rows = check(
    await supabase()
      .from('ratings')
      .select('rating, rd, games, profile:profiles!inner(username, display_name, country, avatar_path)')
      .eq('category', category)
      .gt('games', 0)
      .order('rating', { ascending: false })
      .limit(limit),
  );
  return ((rows ?? []) as unknown as LeaderboardRow[]).map((r) => ({ ...r, rating: Number(r.rating), rd: Number(r.rd) }));
}

// ── Settings (mirrors lib/preferences.tsx; the database validates every value) ────────────
const SETTINGS_MAP: Record<keyof Preferences, string> = {
  boardTheme: 'board_theme',
  pieceSet: 'piece_set',
  backdrop: 'background',
  showCoordinates: 'show_coords',
  showLegalMoves: 'show_legal_moves',
  highlightLastMove: 'highlight_last_move',
  animation: 'animation',
  autoQueen: 'auto_queen',
  confirmResign: 'confirm_resign',
  sound: 'sound',
  reduceMotion: 'reduce_motion',
  botMoveSpeed: 'bot_move_speed',
  botChat: 'bot_chat',
};

export async function fetchSettings(userId: string): Promise<Partial<Preferences> | null> {
  const row = check(await supabase().from('user_settings').select(Object.values(SETTINGS_MAP).join(', ')).eq('user_id', userId).maybeSingle()) as Record<string, unknown> | null;
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const [k, col] of Object.entries(SETTINGS_MAP)) if (row[col] !== undefined && row[col] !== null) out[k] = row[col];
  return out as Partial<Preferences>;
}

export async function saveSettings(userId: string, prefs: Partial<Preferences>): Promise<void> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(prefs)) {
    const col = SETTINGS_MAP[k as keyof Preferences];
    if (col) patch[col] = v;
  }
  check(await supabase().from('user_settings').update(patch).eq('user_id', userId));
}

// ── Server API (/api/*: trusted code with the secret key) ─────────────────────────────────
async function token(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export class ApiFailure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const t = await token();
  if (!t) throw new ApiFailure(401, 'unauthenticated', 'Sign in first.');
  const res = await fetch(path, {
    method,
    headers: { authorization: `Bearer ${t}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) throw new ApiFailure(res.status, data.error ?? 'error', data.message ?? `Request failed (${res.status})`);
  return data as T;
}

/** Sends a finished computer game to the server, which validates and stores it (unrated). */
export function submitBotGame(sub: BotGameSubmission): Promise<BotGameSaved> {
  return api<BotGameSaved>('POST', '/api/games', sub);
}

export function deleteAccount(): Promise<void> {
  return api<void>('DELETE', '/api/account');
}

/** Everything we hold about the signed-in player, for "Download my data". */
export async function exportMyData(userId: string): Promise<unknown> {
  const sb = supabase();
  const [profile, priv, settings, ratings, games, achievements] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
    sb.from('user_private').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('ratings').select('*').eq('user_id', userId),
    sb.from('games').select('*').or(`white_id.eq.${userId},black_id.eq.${userId}`),
    sb.from('user_achievements').select('*').eq('user_id', userId),
  ]);
  const { data: auth } = await sb.auth.getUser();
  return {
    exportedAt: new Date().toISOString(),
    account: { id: auth.user?.id, email: auth.user?.email, created_at: auth.user?.created_at },
    profile: profile.data,
    private: priv.data,
    settings: settings.data,
    ratings: ratings.data,
    games: games.data,
    achievements: achievements.data,
  };
}

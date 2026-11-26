'use client';

// Staff-only data. Every query here is also protected in the database (is_staff() policies), so
// a non-staff account calling these simply gets nothing back.

import { api, check } from './db';
import type { RestrictionRow } from './platform';
import { supabase } from './supabase/client';

type Who = { username: string } | null;

export interface ReportItem {
  id: number;
  reporter_id: string;
  target_id: string;
  game_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter: Who;
  target: Who;
  resolver: Who;
}

export async function fetchReports(status: 'open' | 'resolved' | 'dismissed'): Promise<ReportItem[]> {
  return (check(
    await supabase()
      .from('reports')
      .select(
        'id, reporter_id, target_id, game_id, reason, details, status, resolution, created_at, resolved_at, reporter:profiles!reports_reporter_id_fkey(username), target:profiles!reports_target_id_fkey(username), resolver:profiles!reports_resolved_by_fkey(username)',
      )
      .eq('status', status)
      .order('created_at', { ascending: status === 'open' })
      .limit(100),
  ) ?? []) as unknown as ReportItem[];
}

export async function setReportStatus(id: number, status: 'resolved' | 'dismissed', resolution: string): Promise<void> {
  check(await supabase().from('reports').update({ status, resolution: resolution || null }).eq('id', id));
}

export interface UserLookup {
  id: string;
  username: string;
  display_name: string | null;
  is_banned: boolean;
  created_at: string;
}
export async function findUsers(q: string): Promise<UserLookup[]> {
  const term = q.trim().replace(/[%_]/g, '');
  if (term.length < 2) return [];
  return (check(await supabase().from('profiles').select('id, username, display_name, is_banned, created_at').ilike('username', `${term}%`).order('username').limit(25)) ?? []) as UserLookup[];
}

export interface UserDetail {
  profile: UserLookup & { bio: string | null };
  restrictions: (RestrictionRow & { creator: Who })[];
  reportsAgainst: ReportItem[];
  chat: { id: number; game_id: string; body: string; flagged: boolean; created_at: string }[];
  games: { id: string; source: string; result: string; termination: string; ended_at: string; white_id: string | null }[];
  staffRole: string | null;
}
export async function fetchUserDetail(userId: string): Promise<UserDetail> {
  const sb = supabase();
  const [profile, restrictions, reports, chat, games, staff] = await Promise.all([
    sb.from('profiles').select('id, username, display_name, is_banned, created_at, bio').eq('id', userId).maybeSingle(),
    sb.from('restrictions').select('id, user_id, kind, reason, expires_at, created_at, lifted_at, creator:profiles!restrictions_created_by_fkey(username)').eq('user_id', userId).order('created_at', { ascending: false }),
    sb
      .from('reports')
      .select('id, reporter_id, target_id, game_id, reason, details, status, resolution, created_at, resolved_at, reporter:profiles!reports_reporter_id_fkey(username), target:profiles!reports_target_id_fkey(username), resolver:profiles!reports_resolved_by_fkey(username)')
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('chat_messages').select('id, game_id, body, flagged, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    sb.from('games').select('id, source, result, termination, ended_at, white_id').or(`white_id.eq.${userId},black_id.eq.${userId}`).order('ended_at', { ascending: false }).limit(20),
    sb.from('staff').select('role').eq('user_id', userId).maybeSingle(),
  ]);
  return {
    profile: check(profile) as UserDetail['profile'],
    restrictions: (check(restrictions) ?? []) as unknown as UserDetail['restrictions'],
    reportsAgainst: (check(reports) ?? []) as unknown as ReportItem[],
    chat: (check(chat) ?? []) as UserDetail['chat'],
    games: (check(games) ?? []) as UserDetail['games'],
    staffRole: (staff.data?.role as string | undefined) ?? null,
  };
}

export async function addRestriction(userId: string, kind: 'mute' | 'no_play' | 'no_tournaments', reason: string, days: number | null): Promise<void> {
  check(await supabase().from('restrictions').insert({ user_id: userId, kind, reason, expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null }));
}
export async function liftRestriction(id: number, me: string): Promise<void> {
  check(await supabase().from('restrictions').update({ lifted_at: new Date().toISOString(), lifted_by: me }).eq('id', id));
}
/** Admins: blocks sign-in and marks the account banned (server API, uses Supabase Auth admin). */
export function setBan(userId: string, ban: boolean, reason: string, days?: number): Promise<void> {
  return api<void>('POST', '/api/admin/ban', { userId, ban, reason, ...(days ? { days } : {}) });
}

export async function fetchGameChat(gameId: string): Promise<{ id: number; user_id: string | null; body: string; flagged: boolean; created_at: string; author: Who }[]> {
  return (check(await supabase().from('chat_messages').select('id, user_id, body, flagged, created_at, author:profiles!chat_messages_user_id_fkey(username)').eq('game_id', gameId).order('created_at')) ?? []) as unknown as never;
}

export interface LogItem {
  id: number;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  actor: Who;
  target: Who;
}
export async function fetchModLog(): Promise<LogItem[]> {
  return (check(
    await supabase().from('moderation_log').select('id, action, details, created_at, actor:profiles!moderation_log_actor_id_fkey(username), target:profiles!moderation_log_target_id_fkey(username)').order('created_at', { ascending: false }).limit(100),
  ) ?? []) as unknown as LogItem[];
}

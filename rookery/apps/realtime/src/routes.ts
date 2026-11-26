// Stage 6 /api routes: puzzle solving, tournament creation, and admin bans.
//   POST /api/puzzles/<id>/move        check a move against the secret solution (+ rating)
//   POST /api/tournaments              create an arena tournament
//   POST /api/tournaments/<id>/cancel  creator (before the start) or an admin
//   POST /api/admin/ban                admin only: block or unblock sign-in, with a restriction
// Same rules as api.ts: same-origin, Supabase-verified tokens, validated input.

import { getTimeControl, rate, inflateRd, type Rating, type Score } from '@rookery/chess-core';
import { AdminBan, PuzzleMoveRequest, TournamentCreate, type PuzzleMoveResponse } from '@rookery/protocol';
import type { Env } from './index';
import { checkPuzzleMoves, hintSquare, type StoredPuzzle } from './game/puzzles';
import { randomId } from './game/players';
import { SupabaseAdmin, SupabaseError } from './supabase';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const err = (status: number, error: string, message: string) => json({ error, message }, status);

/** Rated puzzle attempts allowed per minute (abuse prevention). */
export const PUZZLE_RATE = 20;

export async function handleRoutes(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const puzzle = url.pathname.match(/^\/api\/puzzles\/([A-Za-z0-9_-]{6,16})\/move$/);
  const cancel = url.pathname.match(/^\/api\/tournaments\/([A-Za-z0-9]{8,24})\/cancel$/);
  const known = (request.method === 'POST' && (puzzle || cancel || url.pathname === '/api/tournaments' || url.pathname === '/api/admin/ban'));
  if (!known) return null;

  if (!env.SUPABASE_SECRET_KEY) return err(503, 'not_configured', 'This server isn’t connected to the database yet.');
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return err(403, 'bad_origin', 'Cross-site requests are not allowed.');
  if (Number(request.headers.get('content-length') ?? 0) > 8_000) return err(413, 'too_large', 'Request too large.');
  const admin = new SupabaseAdmin({ SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY });

  // Puzzles work for guests too (unrated); a token, if sent, must be valid.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = token ? await admin.userFromToken(token) : null;
  if (token && !user) return err(401, 'unauthenticated', 'Your session has expired. Sign in again.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (puzzle) return puzzleMove(admin, puzzle[1]!, user?.id ?? null, body);
  if (!user) return err(401, 'unauthenticated', 'Sign in first.');
  if (cancel) return cancelTournament(admin, env, cancel[1]!, user.id);
  if (url.pathname === '/api/tournaments') return createTournament(admin, env, user.id, body);
  return ban(admin, user.id, body);
}

// ── Puzzles ────────────────────────────────────────────────────────────────────────────────

async function puzzleMove(admin: SupabaseAdmin, id: string, userId: string | null, body: unknown): Promise<Response> {
  const parsed = PuzzleMoveRequest.safeParse(body);
  if (!parsed.success) return err(400, 'invalid', 'Invalid request.');
  const rows = await admin.rest<StoredPuzzle[]>('GET', `puzzles?id=eq.${id}&select=id,fen,first_move,solution,rating,rd,volatility`);
  const p = rows[0];
  if (!p) return err(404, 'not_found', 'No such puzzle.');
  p.rating = Number(p.rating);
  p.rd = Number(p.rd);
  p.volatility = Number(p.volatility);
  const { moves, help } = parsed.data;

  let out: PuzzleMoveResponse;
  if (help) {
    // Accepted moves so far must be right; asking for help ends the rated attempt as a miss.
    for (let i = 0; i < moves.length; i++) if (moves[i] !== p.solution[2 * i]) return err(400, 'invalid', 'Invalid request.');
    out = help === 'hint' ? { status: 'hint', hintSquare: hintSquare(p, moves.length) ?? undefined } : { status: 'failed', solution: p.solution };
    if (userId) Object.assign(out, await recordAttempt(admin, userId, p, false));
    return json(out);
  }
  const check = checkPuzzleMoves(p, moves);
  if (check.status === 'invalid') return err(400, 'invalid', 'That move doesn’t fit this puzzle.');
  if (check.status === 'continue') return json({ status: 'continue', reply: check.reply } satisfies PuzzleMoveResponse);
  out = check.status === 'solved' ? { status: 'solved' } : { status: 'failed', solution: p.solution };
  if (userId) Object.assign(out, await recordAttempt(admin, userId, p, check.status === 'solved'));
  return json(out);
}

/** First attempt only: updates the player's and the puzzle's ratings (Glicko-2). */
async function recordAttempt(admin: SupabaseAdmin, userId: string, p: StoredPuzzle, solved: boolean): Promise<Partial<PuzzleMoveResponse>> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const recent = await admin.rest<unknown[]>('GET', `puzzle_attempts?user_id=eq.${userId}&created_at=gt.${encodeURIComponent(since)}&select=puzzle_id`);
  if (recent.length >= PUZZLE_RATE) return {};
  for (let attempt = 0; attempt < 3; attempt++) {
    const [mine] = await admin.rest<{ rating: string; rd: string; volatility: string; updated_at: string }[]>(
      'GET',
      `ratings?user_id=eq.${userId}&category=eq.puzzle&select=rating,rd,volatility,updated_at`,
    );
    const [fresh] = await admin.rest<{ rating: string; rd: string; volatility: string }[]>('GET', `puzzles?id=eq.${p.id}&select=rating,rd,volatility`);
    if (!mine || !fresh) return {};
    const idle = Math.floor((Date.now() - Date.parse(mine.updated_at)) / 86_400_000);
    const player: Rating = inflateRd({ rating: Number(mine.rating), rd: Number(mine.rd), volatility: Number(mine.volatility) }, idle);
    const puzzle: Rating = { rating: Number(fresh.rating), rd: Number(fresh.rd), volatility: Number(fresh.volatility) };
    const score: Score = solved ? 1 : 0;
    const playerAfter = rate(player, puzzle, score);
    const puzzleAfter = rate(puzzle, player, (1 - score) as Score);
    try {
      const res = await admin.rpc<{ rated: boolean; achievements?: string[] }>('record_puzzle_attempt', {
        p_user: userId,
        p_puzzle: p.id,
        p_solved: solved,
        p_user_rating: { before: { rating: Number(mine.rating) }, after: playerAfter },
        p_puzzle_rating: { before: { rating: puzzle.rating }, after: puzzleAfter },
      });
      if (!res.rated) return {};
      return {
        rating: { before: Number(mine.rating), after: playerAfter.rating, change: Math.round(playerAfter.rating - Number(mine.rating)) },
        achievements: res.achievements ?? [],
      };
    } catch (e) {
      if (e instanceof SupabaseError && e.body.includes('rating_changed')) continue;
      throw e;
    }
  }
  return {};
}

// ── Tournaments ────────────────────────────────────────────────────────────────────────────

async function createTournament(admin: SupabaseAdmin, env: Env, userId: string, body: unknown): Promise<Response> {
  const parsed = TournamentCreate.safeParse(body);
  if (!parsed.success) return err(400, 'invalid', 'Check the tournament settings.');
  const t = parsed.data;
  const tc = getTimeControl(t.tc);
  if (!tc) return err(400, 'invalid', 'Unknown time control.');
  if ((await admin.isRestricted(userId, 'no_tournaments')) || (await admin.isRestricted(userId, 'no_play'))) {
    return err(403, 'restricted', 'Your account can’t create tournaments right now.');
  }
  const mine = await admin.rest<unknown[]>('GET', `tournaments?created_by=eq.${userId}&status=in.(scheduled,running)&select=id`);
  if (mine.length >= 2) return err(429, 'limit', 'You already have two upcoming tournaments.');
  const id = randomId();
  const scale = env.TOURNAMENT_TIME_SCALE ? Number(env.TOURNAMENT_TIME_SCALE) : 1;
  const startsAt = Date.now() + t.startsInMinutes * 60_000 * scale;
  await admin.rest('POST', 'tournaments', {
    id,
    name: t.name,
    created_by: userId,
    time_control: tc.id,
    category: tc.category,
    rated: t.rated,
    starts_at: new Date(startsAt).toISOString(),
    duration_minutes: t.durationMinutes,
  });
  await env.TOURNAMENT.get(env.TOURNAMENT.idFromName(id)).init({
    id,
    name: t.name,
    tc: { id: tc.id, initialMs: tc.initialMs, incrementMs: tc.incrementMs, category: tc.category },
    rated: t.rated,
    startsAt,
    durationMinutes: t.durationMinutes,
    durationMs: t.durationMinutes * 60_000 * scale,
    createdBy: userId,
  });
  return json({ id }, 201);
}

async function cancelTournament(admin: SupabaseAdmin, env: Env, id: string, userId: string): Promise<Response> {
  const [t] = await admin.rest<{ created_by: string | null; status: string }[]>('GET', `tournaments?id=eq.${id}&select=created_by,status`);
  if (!t) return err(404, 'not_found', 'No such tournament.');
  const isAdmin = (await admin.staffRole(userId)) === 'admin';
  if (!isAdmin && !(t.created_by === userId && t.status === 'scheduled')) return err(403, 'forbidden', 'Only the organiser can cancel, before it starts.');
  if (t.status === 'finished' || t.status === 'cancelled') return err(409, 'over', 'This tournament is already over.');
  await env.TOURNAMENT.get(env.TOURNAMENT.idFromName(id)).cancel();
  return json({ ok: true });
}

// ── Admin ──────────────────────────────────────────────────────────────────────────────────

async function ban(admin: SupabaseAdmin, actorId: string, body: unknown): Promise<Response> {
  if ((await admin.staffRole(actorId)) !== 'admin') return err(403, 'forbidden', 'Admins only.');
  const parsed = AdminBan.safeParse(body);
  if (!parsed.success) return err(400, 'invalid', 'Invalid request.');
  const { userId, ban: banning, reason, days } = parsed.data;
  if (userId === actorId) return err(400, 'invalid', 'You can’t ban yourself.');
  if (await admin.staffRole(userId)) return err(400, 'invalid', 'Remove staff rights before banning a staff member.');
  await admin.setAuthBan(userId, banning, days);
  if (banning) {
    await admin.rest('POST', 'restrictions', {
      user_id: userId,
      kind: 'ban',
      reason,
      expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null,
      created_by: actorId,
    });
  } else {
    await admin.rest('PATCH', `restrictions?user_id=eq.${userId}&kind=eq.ban&lifted_at=is.null`, { lifted_at: new Date().toISOString(), lifted_by: actorId });
  }
  return json({ ok: true });
}

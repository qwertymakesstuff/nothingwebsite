import { START_FEN } from '@rookery/chess-core';
import type { BotGameSubmission } from '@rookery/protocol';
import { describe, expect, it } from 'vitest';
import { handleApi, RATE_LIMIT } from '../src/api';
import { MIN_PLIES_FOR_CLAIMED_WIN, validateBotGame } from '../src/botGames';

const USER = '11111111-1111-1111-1111-111111111111';
const SCHOLAR = ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'];
// A quiet, legal, non-repeating 20-ply Italian Game line.
const ITALIAN_20 = 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 d2d3 f8c5 c2c3 d7d6 b1d2 a7a6 e1g1 e8g8 a2a4 c8e6 f1e1 h7h6 h2h3 f8e8'.split(' ');
const shuffle = (n: number) => Array.from({ length: n }, (_, i) => ['g1f3', 'g8f6', 'f3g1', 'f6g8'][i % 4]!);

const base = (over: Partial<BotGameSubmission> = {}): BotGameSubmission => ({
  clientRef: 'abc123-def',
  botId: 'pip',
  playerColor: 'white',
  timeControl: 'none',
  initialFen: START_FEN,
  moves: SCHOLAR,
  result: '1-0',
  termination: 'checkmate',
  ...over,
});

describe('validateBotGame', () => {
  it('accepts a real checkmate and fills opponent details from the server roster', () => {
    const v = validateBotGame(base(), USER);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.row).toMatchObject({ white_id: USER, black_id: null, bot_id: 'pip', bot_name: 'Pip', bot_elo: 300, rated: false, source: 'bot', plies: 7, category: 'untimed' });
  });

  it('rejects illegal moves', () => {
    const v = validateBotGame(base({ moves: ['e2e5'] }), USER);
    expect(v).toMatchObject({ ok: false, error: 'illegal_move' });
  });

  it('rejects results that contradict the final position', () => {
    expect(validateBotGame(base({ result: '0-1' }), USER)).toMatchObject({ ok: false, error: 'result_mismatch' });
    expect(validateBotGame(base({ moves: SCHOLAR.slice(0, 6), termination: 'checkmate' }), USER)).toMatchObject({ ok: false, error: 'result_mismatch' });
    expect(validateBotGame(base({ moves: SCHOLAR.slice(0, 6), termination: 'agreement', result: '1-0' }), USER)).toMatchObject({ ok: false });
  });

  it('does not accept a quick "the bot resigned" win', () => {
    expect(validateBotGame(base({ moves: shuffle(4), termination: 'resign', result: '1-0' }), USER)).toMatchObject({ ok: false, error: 'result_mismatch' });
    expect(ITALIAN_20.length).toBe(MIN_PLIES_FOR_CLAIMED_WIN);
    expect(validateBotGame(base({ moves: ITALIAN_20, termination: 'resign', result: '1-0' }), USER).ok).toBe(true);
    // A repeated position is a draw, whatever the client claims
    expect(validateBotGame(base({ moves: shuffle(8), termination: 'resign', result: '0-1' }), USER)).toMatchObject({ ok: false, error: 'result_mismatch' });
    // Losing quickly is always believable
    expect(validateBotGame(base({ moves: shuffle(2), termination: 'resign', result: '0-1' }), USER).ok).toBe(true);
  });

  it('rejects unknown opponents, strengths on named opponents, other start positions and false openings', () => {
    expect(validateBotGame(base({ botId: 'magnus' }), USER)).toMatchObject({ ok: false, error: 'invalid_bot' });
    expect(validateBotGame(base({ customElo: 3000 }), USER)).toMatchObject({ ok: false, error: 'invalid_bot' });
    expect(validateBotGame(base({ initialFen: '8/8/8/8/8/8/8/K6k w - - 0 1' }), USER)).toMatchObject({ ok: false, error: 'invalid_position' });
    expect(validateBotGame(base({ openingId: 'ruy-lopez' }), USER)).toMatchObject({ ok: false, error: 'invalid_opening' });
    expect(validateBotGame(base({ openingId: 'italian', moves: SCHOLAR }), USER)).toMatchObject({ ok: false });
  });

  it('custom opponents get a server-built name; timestamps are clamped', () => {
    const v = validateBotGame(base({ botId: 'custom', customElo: 1800, endedAt: '2099-01-01T00:00:00Z' }), USER, Date.parse('2026-11-25T12:00:00Z'));
    expect(v.ok && v.row).toMatchObject({ bot_name: 'Stockfish 1800', bot_elo: 1800, ended_at: '2026-11-25T12:00:00.000Z' });
  });
});

// ── HTTP layer, with Supabase replaced by a recording fake ──────────────────────────────────
type Call = { url: string; method: string; body?: unknown };
function fakeSupabase(opts: { validToken?: string; recentCount?: number; duplicate?: boolean } = {}) {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body });
    const auth = new Headers(init?.headers).get('authorization');
    if (url.endsWith('/auth/v1/user')) {
      return auth === `Bearer ${opts.validToken ?? 'good'}` ? Response.json({ id: USER, email: 'a@b.c' }) : new Response('{}', { status: 401 });
    }
    if (url.includes('/rest/v1/games?') && method === 'HEAD') return new Response(null, { headers: { 'content-range': `*/${opts.recentCount ?? 0}` } });
    if (url.endsWith('/rest/v1/games')) return opts.duplicate ? new Response('{"code":"23505"}', { status: 409 }) : Response.json([{ id: 'g1' }], { status: 201 });
    if (url.endsWith('/rpc/award_achievements')) return Response.json(['first-game', 'first-win']);
    if (url.includes('/storage/v1/object/list/avatars')) return Response.json([{ name: 'a.webp' }]);
    if (url.includes('/storage/v1/object/avatars') || url.includes('/auth/v1/admin/users/')) return new Response(null, { status: 200 });
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
  return { f, calls };
}

const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_SECRET_KEY: 'sb_secret_test' };
const post = (body: unknown, headers: Record<string, string> = { authorization: 'Bearer good' }) =>
  new Request('https://chess.test/api/games', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

describe('POST /api/games', () => {
  it('requires a valid session', async () => {
    const { f } = fakeSupabase();
    expect((await handleApi(post(base(), {}), env, f))!.status).toBe(401);
    expect((await handleApi(post(base(), { authorization: 'Bearer forged' }), env, f))!.status).toBe(401);
  });

  it('refuses when the server has no secret key configured', async () => {
    const { f } = fakeSupabase();
    expect((await handleApi(post(base()), { SUPABASE_URL: env.SUPABASE_URL }, f))!.status).toBe(503);
  });

  it('rejects cross-site requests', async () => {
    const { f } = fakeSupabase();
    const res = await handleApi(post(base(), { authorization: 'Bearer good', origin: 'https://evil.example' }), env, f);
    expect(res!.status).toBe(403);
  });

  it('validates the body and the game itself', async () => {
    const { f, calls } = fakeSupabase();
    expect((await handleApi(post({ nope: true }), env, f))!.status).toBe(400);
    expect((await handleApi(post(base({ result: '0-1' })), env, f))!.status).toBe(422);
    expect(calls.some((c) => c.url.endsWith('/rest/v1/games') && c.method === 'POST')).toBe(false);
  });

  it('stores a valid game with server-derived fields only, then awards achievements', async () => {
    const { f, calls } = fakeSupabase();
    // The client tries to sneak in rating fields and a rated flag; they are not in the schema and are dropped.
    const res = await handleApi(post({ ...base(), rated: true, white_delta: 500, bot_elo: 3200, bot_name: 'Fake' }), env, f);
    expect(res!.status).toBe(201);
    expect(await res!.json()).toEqual({ id: 'g1', duplicate: false, achievements: ['first-game', 'first-win'] });
    const insert = calls.find((c) => c.url.endsWith('/rest/v1/games') && c.method === 'POST')!.body as Record<string, unknown>;
    expect(insert).toMatchObject({ rated: false, bot_elo: 300, bot_name: 'Pip', white_id: USER });
    expect(insert).not.toHaveProperty('white_delta');
  });

  it('rate-limits and ignores duplicates', async () => {
    const limited = fakeSupabase({ recentCount: RATE_LIMIT.perMinute });
    expect((await handleApi(post(base()), env, limited.f))!.status).toBe(429);
    const dup = fakeSupabase({ duplicate: true });
    const res = await handleApi(post(base()), env, dup.f);
    expect(res!.status).toBe(200);
    expect(await res!.json()).toMatchObject({ duplicate: true, achievements: [] });
  });
});

describe('DELETE /api/account', () => {
  it('deletes avatars and the account of the signed-in user only', async () => {
    const { f, calls } = fakeSupabase();
    const res = await handleApi(new Request('https://chess.test/api/account', { method: 'DELETE', headers: { authorization: 'Bearer good' } }), env, f);
    expect(res!.status).toBe(204);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.endsWith(`/auth/v1/admin/users/${USER}`))).toBe(true);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/storage/v1/object/avatars'))).toBe(true);
  });

  it('other routes are not handled here', async () => {
    const { f } = fakeSupabase();
    expect(await handleApi(new Request('https://chess.test/api/nope'), env, f)).toBeNull();
  });
});


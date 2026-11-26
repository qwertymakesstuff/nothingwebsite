// /api/* routes that need trusted server code. Every request is authenticated by verifying the
// user's Supabase access token with Supabase itself; all input is validated before use.

import { BotGameSubmission, type BotGameSaved } from '@rookery/protocol';
import { validateBotGame } from './botGames';
import { SupabaseAdmin, type Fetch, type SupabaseEnv } from './supabase';

/** Limits per user: a human can't finish more games than this against the computer. */
export const RATE_LIMIT = { perMinute: 6, perDay: 400 };

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const err = (status: number, error: string, message: string) => json({ error, message }, status);

export async function handleApi(request: Request, env: SupabaseEnv, f?: Fetch): Promise<Response | null> {
  const url = new URL(request.url);
  const route = `${request.method} ${url.pathname}`;
  if (route !== 'POST /api/games' && route !== 'DELETE /api/account') return null;

  if (!env.SUPABASE_SECRET_KEY) return err(503, 'not_configured', 'Accounts are not configured on this server yet.');
  const admin = new SupabaseAdmin({ ...env, SUPABASE_SECRET_KEY: env.SUPABASE_SECRET_KEY }, f);

  // Same-origin only: browsers send Origin on POST/DELETE; reject cross-site requests.
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return err(403, 'bad_origin', 'Cross-site requests are not allowed.');

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return err(401, 'unauthenticated', 'Sign in first.');
  const user = await admin.userFromToken(token);
  if (!user) return err(401, 'unauthenticated', 'Your session has expired. Sign in again.');

  if (route === 'DELETE /api/account') {
    await admin.deleteUser(user.id);
    return new Response(null, { status: 204 });
  }

  // POST /api/games
  if (Number(request.headers.get('content-length') ?? 0) > 64_000) return err(413, 'too_large', 'Game too large.');
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err(400, 'bad_json', 'Request body must be JSON.');
  }
  const parsed = BotGameSubmission.safeParse(body);
  if (!parsed.success) return err(400, 'invalid', 'That game data is not valid.');
  const check = validateBotGame(parsed.data, user.id);
  if (!check.ok) return err(422, check.error, check.message);

  const now = Date.now();
  if ((await admin.recentGameCount(user.id, new Date(now - 60_000).toISOString())) >= RATE_LIMIT.perMinute ||
      (await admin.recentGameCount(user.id, new Date(now - 86_400_000).toISOString())) >= RATE_LIMIT.perDay) {
    return err(429, 'rate_limited', 'Too many games saved recently. Try again shortly.');
  }

  const saved = await admin.insertGame(check.row);
  const achievements = saved.duplicate ? [] : await admin.awardAchievements(user.id);
  const out: BotGameSaved = { id: saved.id, duplicate: saved.duplicate, achievements };
  return json(out, saved.duplicate ? 200 : 201);
}

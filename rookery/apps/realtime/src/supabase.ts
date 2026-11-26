// Minimal Supabase client for trusted server code. Uses the SECRET key, which exists only as a
// Worker secret (never in the browser bundle, never in git). `fetch` is injectable for tests.

export interface SupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY?: string;
}

export type Fetch = typeof fetch;

export class SupabaseAdmin {
  // Stored as a plain function, not a bound method: the Workers runtime throws "Illegal
  // invocation" if the global fetch is called with `this` set to another object.
  private readonly f: Fetch;

  constructor(
    private env: SupabaseEnv & { SUPABASE_SECRET_KEY: string },
    f: Fetch = (input, init) => fetch(input, init),
  ) {
    this.f = f;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { apikey: this.env.SUPABASE_SECRET_KEY, 'content-type': 'application/json', ...extra };
  }

  /** Resolves a user's access token to their user id, or null if invalid/expired/unconfirmed. */
  async userFromToken(token: string): Promise<{ id: string; email?: string } | null> {
    const res = await this.f(`${this.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: this.env.SUPABASE_SECRET_KEY, authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const u = (await res.json()) as { id?: string; email?: string };
    return u.id ? { id: u.id, email: u.email } : null;
  }

  /** Number of games this user recorded since `sinceIso`. */
  async recentGameCount(userId: string, sinceIso: string): Promise<number> {
    const q = `select=id&or=(white_id.eq.${userId},black_id.eq.${userId})&created_at=gt.${encodeURIComponent(sinceIso)}`;
    const res = await this.f(`${this.env.SUPABASE_URL}/rest/v1/games?${q}`, {
      method: 'HEAD',
      headers: this.headers({ prefer: 'count=exact' }),
    });
    const range = res.headers.get('content-range'); // e.g. "*/3"
    return Number(range?.split('/')[1] ?? 0) || 0;
  }

  /** Inserts a game. Returns its id, or null if it was a duplicate (same client_ref). */
  async insertGame(row: object): Promise<{ id: string | null; duplicate: boolean }> {
    const res = await this.f(`${this.env.SUPABASE_URL}/rest/v1/games`, {
      method: 'POST',
      headers: this.headers({ prefer: 'return=representation' }),
      body: JSON.stringify(row),
    });
    if (res.status === 409) return { id: null, duplicate: true };
    if (!res.ok) throw new Error(`insert games failed: ${res.status} ${await res.text()}`);
    const [created] = (await res.json()) as { id: string }[];
    return { id: created?.id ?? null, duplicate: false };
  }

  async awardAchievements(userId: string): Promise<string[]> {
    const res = await this.f(`${this.env.SUPABASE_URL}/rest/v1/rpc/award_achievements`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ p_user: userId }),
    });
    if (!res.ok) throw new Error(`award_achievements failed: ${res.status}`);
    const rows = (await res.json()) as (string | { award_achievements: string })[];
    return rows.map((r) => (typeof r === 'string' ? r : r.award_achievements));
  }

  /**
   * A player's public card and their rating in `category`, as shown to opponents. null if the
   * user has no profile.
   */
  async player(userId: string, category: string): Promise<(PlayerCard & { glicko: StoredRating }) | null> {
    const q = `id=eq.${encodeURIComponent(userId)}&select=id,username,display_name,avatar_path,country,ratings(rating,rd,volatility,updated_at)&ratings.category=eq.${encodeURIComponent(category)}`;
    const rows = await this.get<RawProfile[]>(`profiles?${q}`);
    const r = rows[0];
    return r ? toPlayer(r) : null;
  }

  /** Looks a player up by username (case-insensitive), with their challenge preference. */
  async playerByUsername(username: string, category: string): Promise<(PlayerCard & { glicko: StoredRating; allowChallenges: string }) | null> {
    const q = `username=eq.${encodeURIComponent(username)}&select=id,username,display_name,avatar_path,country,ratings(rating,rd,volatility,updated_at),user_settings(allow_challenges)&ratings.category=eq.${encodeURIComponent(category)}`;
    const rows = await this.get<(RawProfile & { user_settings: { allow_challenges: string } | { allow_challenges: string }[] | null })[]>(`profiles?${q}`);
    const r = rows[0];
    if (!r) return null;
    const settings = Array.isArray(r.user_settings) ? r.user_settings[0] : r.user_settings;
    return { ...toPlayer(r), allowChallenges: settings?.allow_challenges ?? 'all' };
  }

  /** Current stored ratings for both players in `category`. */
  async ratings(userIds: string[], category: string): Promise<Map<string, StoredRating>> {
    const q = `user_id=in.(${userIds.map(encodeURIComponent).join(',')})&category=eq.${encodeURIComponent(category)}&select=user_id,rating,rd,volatility,updated_at`;
    const rows = await this.get<(RawRating & { user_id: string })[]>(`ratings?${q}`);
    return new Map(rows.map((r) => [r.user_id, toRating(r)]));
  }

  /** Records a finished live game (and rating changes) in one transaction. */
  async recordOnlineGame(game: object, white: object | null, black: object | null): Promise<{ duplicate: boolean; staleRatings?: boolean }> {
    const res = await this.f(`${this.env.SUPABASE_URL}/rest/v1/rpc/record_online_game`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ p_game: game, p_white: white, p_black: black }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (text.includes('rating_changed')) return { duplicate: false, staleRatings: true };
      throw new Error(`record_online_game failed: ${res.status} ${text}`);
    }
    const body = (await res.json()) as { duplicate?: boolean };
    return { duplicate: Boolean(body.duplicate) };
  }

  /** Calls a database function with the secret key. */
  async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const res = await this.f(`${this.env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(args) });
    const text = await res.text();
    if (!res.ok) throw new SupabaseError(fn, res.status, text);
    return (text ? JSON.parse(text) : null) as T;
  }

  /** Generic REST call (service role). */
  async rest<T = unknown>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
    const res = await this.f(`${this.env.SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: this.headers(prefer ? { prefer } : {}),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new SupabaseError(`${method} ${path.split('?')[0]}`, res.status, text);
    return (text ? JSON.parse(text) : null) as T;
  }

  async isRestricted(userId: string, kind: 'mute' | 'no_play' | 'no_tournaments' | 'ban'): Promise<boolean> {
    return Boolean(await this.rpc<boolean>('is_restricted', { p_user: userId, p_kind: kind }));
  }

  async areFriends(a: string, b: string): Promise<boolean> {
    return Boolean(await this.rpc<boolean>('are_friends', { a, b }));
  }

  async staffRole(userId: string): Promise<'admin' | 'moderator' | null> {
    const rows = await this.rest<{ role: 'admin' | 'moderator' }[]>('GET', `staff?user_id=eq.${encodeURIComponent(userId)}&select=role`);
    return rows[0]?.role ?? null;
  }

  /** A player's chat preference: all | friends | presets | off. */
  async chatSetting(userId: string): Promise<string> {
    const rows = await this.rest<{ chat: string }[]>('GET', `user_settings?user_id=eq.${encodeURIComponent(userId)}&select=chat`);
    return rows[0]?.chat ?? 'all';
  }

  /** Blocks (or unblocks) sign-in for a user in Supabase Auth. */
  async setAuthBan(userId: string, banned: boolean, days?: number): Promise<void> {
    const res = await this.f(`${this.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: this.headers({ authorization: `Bearer ${this.env.SUPABASE_SECRET_KEY}` }),
      body: JSON.stringify({ ban_duration: banned ? `${(days ?? 36500) * 24}h` : 'none' }),
    });
    if (!res.ok) throw new SupabaseError('auth ban', res.status, await res.text());
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.f(`${this.env.SUPABASE_URL}/rest/v1/${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`GET ${path.split('?')[0]} failed: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  /** Deletes the user's avatar files and then the account (profile and data cascade). */
  async deleteUser(userId: string): Promise<void> {
    const list = await this.f(`${this.env.SUPABASE_URL}/storage/v1/object/list/avatars`, {
      method: 'POST',
      headers: this.headers({ authorization: `Bearer ${this.env.SUPABASE_SECRET_KEY}` }),
      body: JSON.stringify({ prefix: userId, limit: 100 }),
    });
    if (list.ok) {
      const files = ((await list.json()) as { name: string }[]).map((o) => `${userId}/${o.name}`);
      if (files.length) {
        await this.f(`${this.env.SUPABASE_URL}/storage/v1/object/avatars`, {
          method: 'DELETE',
          headers: this.headers({ authorization: `Bearer ${this.env.SUPABASE_SECRET_KEY}` }),
          body: JSON.stringify({ prefixes: files }),
        });
      }
    }
    const res = await this.f(`${this.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.headers({ authorization: `Bearer ${this.env.SUPABASE_SECRET_KEY}` }),
    });
    if (!res.ok) throw new Error(`delete user failed: ${res.status}`);
  }
}

export interface StoredRating {
  rating: number;
  rd: number;
  volatility: number;
  updatedAt: number;
}

export interface PlayerCard {
  id: string;
  username: string;
  displayName: string | null;
  avatarPath: string | null;
  country: string | null;
}

interface RawRating {
  rating: number | string;
  rd: number | string;
  volatility: number | string;
  updated_at: string;
}

interface RawProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  country: string | null;
  ratings: RawRating[];
}

function toRating(r: RawRating | undefined): StoredRating {
  if (!r) return { rating: 500, rd: 350, volatility: 0.06, updatedAt: Date.now() };
  return { rating: Number(r.rating), rd: Number(r.rd), volatility: Number(r.volatility), updatedAt: Date.parse(r.updated_at) };
}

function toPlayer(r: RawProfile): PlayerCard & { glicko: StoredRating } {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    avatarPath: r.avatar_path,
    country: r.country,
    glicko: toRating(r.ratings?.[0]),
  };
}

export class SupabaseError extends Error {
  constructor(
    public what: string,
    public status: number,
    public body: string,
  ) {
    super(`${what} failed: ${status} ${body.slice(0, 300)}`);
  }
}

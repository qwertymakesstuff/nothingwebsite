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

// Applies every migration to an in-process Postgres (PGlite) with a minimal stand-in for
// Supabase's `auth` schema and roles, then checks the age rules and Row Level Security.

import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const MIGRATIONS = join(import.meta.dirname, '../supabase/migrations');

const SUPABASE_STUB = `
  create schema extensions;
  create schema auth;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public, extensions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

let db: PGlite;

const ALICE = '00000000-0000-0000-0000-00000000000a';
const BOB = '00000000-0000-0000-0000-00000000000b';

function yearsAgo(years: number, extraDays = 0): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() + extraDays);
  return d.toISOString().slice(0, 10);
}

async function signUp(id: string, meta: Record<string, unknown>) {
  await db.query('insert into auth.users (id, raw_user_meta_data) values ($1, $2)', [id, JSON.stringify(meta)]);
}

/** Runs `fn` as a signed-in user (or anon when `uid` is null), like a browser with a JWT. */
async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

beforeAll(async () => {
  db = new PGlite({ extensions: { citext } });
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
});

describe('sign-up', () => {
  it('creates profile, private data and settings for a 13+ user', async () => {
    await signUp(ALICE, { username: 'Alice_1', birth_date: yearsAgo(30) });
    const { rows } = await db.query<{ username: string; board_theme: string }>(
      `select p.username, s.board_theme from public.profiles p
         join public.user_settings s on s.user_id = p.id where p.id = $1`,
      [ALICE],
    );
    expect(rows).toEqual([{ username: 'Alice_1', board_theme: 'slate' }]);
  });

  it('accepts someone who turns 13 today and rejects someone a day short of 13', async () => {
    await signUp(BOB, { username: 'bob13', birth_date: yearsAgo(13) });
    await expect(
      signUp('00000000-0000-0000-0000-00000000000c', { username: 'almost13', birth_date: yearsAgo(13, 1) }),
    ).rejects.toThrow(/at least 13/);
  });

  it('rejects missing or invalid dates of birth and bad usernames', async () => {
    await expect(signUp('00000000-0000-0000-0000-0000000000d1', { username: 'nodob' })).rejects.toThrow(/date of birth/);
    await expect(
      signUp('00000000-0000-0000-0000-0000000000d2', { username: 'baddob', birth_date: 'yesterday' }),
    ).rejects.toThrow(/date of birth/);
    await expect(
      signUp('00000000-0000-0000-0000-0000000000d3', { username: 'future', birth_date: yearsAgo(-1) }),
    ).rejects.toThrow(/date of birth/);
    await expect(
      signUp('00000000-0000-0000-0000-0000000000d4', { username: 'no spaces!', birth_date: yearsAgo(20) }),
    ).rejects.toThrow(/check constraint/);
  });

  it('usernames are unique regardless of case', async () => {
    await expect(
      signUp('00000000-0000-0000-0000-0000000000e1', { username: 'ALICE_1', birth_date: yearsAgo(20) }),
    ).rejects.toThrow(/duplicate key/);
  });
});

describe('row level security', () => {
  it('profiles and ratings are public; private data is owner-only', async () => {
    const anonProfiles = await as(null, () => db.query('select username from public.profiles'));
    expect(anonProfiles.rows.length).toBe(2);

    const anonPrivate = await as(null, () => db.query('select * from public.user_private').catch((e: Error) => e));
    expect(anonPrivate).toBeInstanceOf(Error); // anon has no access at all

    const alicePrivate = await as(ALICE, () => db.query<{ user_id: string }>('select user_id from public.user_private'));
    expect(alicePrivate.rows.map((r) => r.user_id)).toEqual([ALICE]);
  });

  it('owners can edit their bio but not their username, ban flag or another profile', async () => {
    await as(ALICE, () => db.query(`update public.profiles set bio = 'hi' where id = $1`, [ALICE]));
    await expect(
      as(ALICE, () => db.query(`update public.profiles set username = 'renamed' where id = $1`, [ALICE])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(ALICE, () => db.query(`update public.profiles set is_banned = false where id = $1`, [ALICE])),
    ).rejects.toThrow(/permission denied/);
    const other = await as(ALICE, () => db.query(`update public.profiles set bio = 'x' where id = $1`, [BOB]));
    expect(other.affectedRows).toBe(0);
    const { rows } = await db.query<{ bio: string | null }>('select bio from public.profiles where id = $1', [BOB]);
    expect(rows[0]?.bio).toBeNull();
  });

  it('settings are owner-only', async () => {
    const mine = await as(ALICE, () => db.query('select user_id from public.user_settings'));
    expect(mine.rows.length).toBe(1);
    const changed = await as(ALICE, () =>
      db.query(`update public.user_settings set board_theme = 'walnut' where user_id = $1`, [BOB]),
    );
    expect(changed.affectedRows).toBe(0);
  });

  it('browsers cannot write ratings', async () => {
    await expect(
      as(ALICE, () => db.query(`insert into public.ratings (user_id, category) values ($1, 'blitz')`, [ALICE])),
    ).rejects.toThrow(/row-level security/);
  });

  it('can_chat is 13+ and not callable from browsers', async () => {
    const { rows } = await db.query<{ ok: boolean }>('select public.can_chat($1) as ok', [ALICE]);
    expect(rows[0]?.ok).toBe(true);
    await expect(as(ALICE, () => db.query('select public.can_chat($1)', [ALICE]))).rejects.toThrow(/permission denied/);
  });
});

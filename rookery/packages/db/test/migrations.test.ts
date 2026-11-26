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
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Minimal stand-in for Supabase Storage
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to anon, authenticated, service_role;
  grant select, insert, update, delete on storage.objects to authenticated;
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
    expect(rows).toEqual([{ username: 'Alice_1', board_theme: 'stone' }]);
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
    ).rejects.toThrow(/Usernames are 3–20/);
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
    ).rejects.toThrow(/permission denied|row-level security/);
  });

  it('can_chat is 13+ and not callable from browsers', async () => {
    const { rows } = await db.query<{ ok: boolean }>('select public.can_chat($1) as ok', [ALICE]);
    expect(rows[0]?.ok).toBe(true);
    await expect(as(ALICE, () => db.query('select public.can_chat($1)', [ALICE]))).rejects.toThrow(/permission denied/);
  });
});

/** Runs `fn` as trusted server code (the Worker's service role). */
async function asService<T>(fn: () => Promise<T>): Promise<T> {
  await db.exec('set role service_role');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

describe('stage 4: usernames', () => {
  it('reports availability without signing in', async () => {
    const check = (n: string) => as(null, () => db.query<{ ok: boolean }>('select public.username_available($1) as ok', [n])).then((r) => r.rows[0]!.ok);
    expect(await check('fresh_name')).toBe(true);
    expect(await check('alice_1')).toBe(false); // taken, case-insensitive
    expect(await check('Admin')).toBe(false); // reserved
    expect(await check('no')).toBe(false); // too short
    expect(await check('bad name')).toBe(false);
  });

  it('rejects reserved usernames at sign-up', async () => {
    await expect(signUp('00000000-0000-0000-0000-0000000000f1', { username: 'Corvus', birth_date: yearsAgo(20) })).rejects.toThrow(/reserved/);
  });
});

describe('stage 4: profiles and settings', () => {
  it('validates avatar paths, country codes and display names', async () => {
    const upd = (sql: string, params: unknown[]) => as(ALICE, () => db.query(sql, params));
    await upd('update public.profiles set avatar_path = $1 where id = $2', [`${ALICE}/avatar-1.webp`, ALICE]);
    await expect(upd('update public.profiles set avatar_path = $1 where id = $2', [`${BOB}/avatar.webp`, ALICE])).rejects.toThrow(/avatar_own_folder/);
    await expect(upd('update public.profiles set country = $1 where id = $2', ['gb', ALICE])).rejects.toThrow(/country_format/);
    await upd('update public.profiles set country = $1, display_name = $2 where id = $3', ['GB', 'Alice', ALICE]);
    await expect(upd('update public.profiles set display_name = $1 where id = $2', ['   ', ALICE])).rejects.toThrow(/display_name_clean/);
  });

  it('saves valid settings and rejects invalid values or other users', async () => {
    const before = await db.query<{ updated_at: string }>('select updated_at from public.user_settings where user_id = $1', [ALICE]);
    await as(ALICE, () => db.query(`update public.user_settings set board_theme = 'midnight', animation = 'fast', bot_chat = false where user_id = $1`, [ALICE]));
    const after = await db.query<{ board_theme: string; animation: string; bot_chat: boolean; updated_at: string }>('select board_theme, animation, bot_chat, updated_at from public.user_settings where user_id = $1', [ALICE]);
    expect(after.rows[0]).toMatchObject({ board_theme: 'midnight', animation: 'fast', bot_chat: false });
    expect(after.rows[0]!.updated_at).not.toBe(before.rows[0]!.updated_at);
    await expect(as(ALICE, () => db.query(`update public.user_settings set board_theme = 'neon' where user_id = $1`, [ALICE]))).rejects.toThrow(/settings_board_theme/);
    const other = await as(ALICE, () => db.query(`update public.user_settings set sound = false where user_id = $1`, [BOB]));
    expect(other.affectedRows).toBe(0);
    await expect(as(ALICE, () => db.query(`update public.user_settings set user_id = $1 where user_id = $2`, [BOB, ALICE]))).rejects.toThrow(/permission denied/);
  });
});

describe('stage 4: ratings, games and achievements are server-only', () => {
  it('every new player gets a provisional rating in each category', async () => {
    const { rows } = await db.query<{ category: string; rating: string }>('select category, rating from public.ratings where user_id = $1 order by category', [ALICE]);
    expect(rows.map((r) => r.category)).toEqual(['blitz', 'bullet', 'classical', 'puzzle', 'rapid']);
    expect(rows.every((r) => Number(r.rating) === 1500)).toBe(true);
  });

  it('browsers cannot change ratings, write history, record games or award achievements', async () => {
    await expect(as(ALICE, () => db.query(`update public.ratings set rating = 3000 where user_id = $1`, [ALICE]))).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, () => db.query(`insert into public.rating_history (user_id, category, rating, rd) values ($1, 'blitz', 2900, 50)`, [ALICE]))).rejects.toThrow(/permission denied/);
    await expect(
      as(ALICE, () =>
        db.query(`insert into public.games (white_id, bot_id, source, category, time_control, initial_fen, plies, result, termination) values ($1, 'pip', 'bot', 'untimed', 'none', 'x', 0, '1-0', 'resign')`, [ALICE]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, () => db.query(`select public.award_achievements($1)`, [ALICE]))).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, () => db.query(`insert into public.user_achievements (user_id, achievement_id) values ($1, 'beat-corvus')`, [ALICE]))).rejects.toThrow(/permission denied/);
  });

  it('trusted server code records games; bot games can never be rated', async () => {
    const insert = (rated: boolean, botId = 'corvus', elo = 3200, result = '1-0', plies = 7) =>
      asService(() =>
        db.query(
          `insert into public.games (white_id, bot_id, bot_name, bot_elo, source, rated, category, time_control, initial_fen, moves, plies, result, termination)
           values ($1, $2, 'Corvus', $3, 'bot', $4, 'untimed', 'none', 'startpos', 'f2f3 e7e5 g2g4 d8h4', $5, $6, 'checkmate') returning id`,
          [ALICE, botId, elo, rated, plies, result],
        ),
      );
    await expect(insert(true)).rejects.toThrow(/games_bot_unrated/);
    const g = await insert(false);
    expect(g.rows[0]).toBeTruthy();
    const pub = await as(null, () => db.query('select id from public.games'));
    expect(pub.rows.length).toBe(1); // games are publicly readable
  });

  it('statistics and achievements are computed from recorded games', async () => {
    const stats = await as(null, () => db.query<{ games: number; wins: number }>(`select games, wins from public.player_stats where user_id = $1 and source = 'bot'`, [ALICE]));
    expect(stats.rows[0]).toMatchObject({ games: 1, wins: 1 });
    const first = await asService(() => db.query<{ award_achievements: string }>('select * from public.award_achievements($1)', [ALICE]));
    expect(first.rows.map((r) => Object.values(r)[0]).sort()).toEqual(['beat-club', 'beat-corvus', 'beat-expert', 'beat-master', 'first-game', 'first-win', 'quick-mate']);
    const again = await asService(() => db.query('select * from public.award_achievements($1)', [ALICE]));
    expect(again.rows.length).toBe(0); // idempotent
    const visible = await as(null, () => db.query('select achievement_id from public.user_achievements where user_id = $1', [ALICE]));
    expect(visible.rows.length).toBe(7);
  });
});

describe('stage 4: avatar storage', () => {
  it('users can only write inside their own folder', async () => {
    await as(ALICE, () => db.query(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${ALICE}/a.webp`]));
    await expect(as(ALICE, () => db.query(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${BOB}/a.webp`]))).rejects.toThrow(/row-level security/);
    const bucket = await db.query<{ public: boolean; file_size_limit: number }>(`select public, file_size_limit from storage.buckets where id = 'avatars'`);
    expect(bucket.rows[0]).toMatchObject({ public: true });
    expect(Number(bucket.rows[0]!.file_size_limit)).toBeLessThanOrEqual(262144);
  });
});

describe('stage 4: account deletion', () => {
  it('deletes the player’s bot games and anonymises their games against people', async () => {
    const CAROL = '00000000-0000-0000-0000-00000000000c';
    await signUp(CAROL, { username: 'carol', birth_date: yearsAgo(30) });
    const game = (source: string, white: string, black: string | null) =>
      asService(() =>
        db.query<{ id: string }>(
          `insert into public.games (white_id, black_id, bot_id, source, rated, category, time_control, initial_fen, moves, plies, result, termination)
           values ($1, $2, $3, $4, false, 'untimed', 'none', 'startpos', 'e2e4', 1, '0-1', 'resign') returning id`,
          [white, black, source === 'bot' ? 'pip' : null, source],
        ),
      );
    const bot = (await game('bot', CAROL, null)).rows[0]!.id;
    const online = (await game('online', CAROL, BOB)).rows[0]!.id;
    await db.query('delete from auth.users where id = $1', [CAROL]);
    const left = await db.query<{ id: string; white_id: string | null; black_id: string | null }>('select id, white_id, black_id from public.games where id = any($1)', [[bot, online]]);
    expect(left.rows).toEqual([{ id: online, white_id: null, black_id: BOB }]);
    expect((await db.query('select 1 from public.profiles where id = $1', [CAROL])).rows.length).toBe(0);
  });
});

describe('stage 5: online games and ratings', () => {
  const game = (id: string, extra: Record<string, unknown> = {}) => ({
    id, white_id: ALICE, black_id: BOB, source: 'online', rated: true, category: 'blitz', time_control: '5+0',
    initial_fen: 'startpos', moves: 'f2f3 e7e5 g2g4 d8h4', plies: 4, result: '0-1', termination: 'checkmate',
    started_at: '2026-11-27T10:00:00Z', ended_at: '2026-11-27T10:01:00Z', ...extra,
  });
  const side = (before: number, after: number) => ({ before: { rating: before, rd: 350 }, after: { rating: after, rd: 290, volatility: 0.06 } });
  const record = (g: object, w: object | null, b: object | null) =>
    asService(() => db.query<{ r: { duplicate: boolean } }>('select public.record_online_game($1, $2, $3) as r', [g, w, b]));

  it('browsers cannot record online games', async () => {
    await expect(as(ALICE, () => db.query('select public.record_online_game($1, $2, $3)', [game('aaaaaaaaaaaa'), side(1500, 1700), side(1500, 1300)]))).rejects.toThrow(/permission denied/);
  });

  it('records a rated game, both rating updates and history in one go', async () => {
    const r = await record(game('onlinegame01'), side(1500, 1337.5), side(1500, 1662.5));
    expect(r.rows[0]!.r.duplicate).toBe(false);
    const ratings = await db.query<{ user_id: string; rating: string; games: number; peak: string }>(`select user_id, rating, games, peak from public.ratings where category = 'blitz' and user_id in ($1, $2) order by rating`, [ALICE, BOB]);
    expect(ratings.rows.map((x) => [x.user_id, Number(x.rating), x.games])).toEqual([[ALICE, 1337.5, 1], [BOB, 1662.5, 1]]);
    const g = await db.query<{ white_delta: number; black_delta: number; white_rating: number }>(`select white_delta, black_delta, white_rating from public.games where id = 'onlinegame01'`);
    expect(g.rows[0]).toEqual({ white_delta: -163, black_delta: 163, white_rating: 1500 });
    const hist = await db.query(`select 1 from public.rating_history where game_id = 'onlinegame01'`);
    expect(hist.rows.length).toBe(2);
  });

  it('refuses updates computed from stale ratings, duplicates and self-play', async () => {
    await expect(record(game('onlinegame02'), side(1500, 1400), side(1500, 1600))).rejects.toThrow(/rating_changed/);
    expect((await db.query(`select 1 from public.games where id = 'onlinegame02'`)).rows.length).toBe(0); // rolled back
    const dup = await record(game('onlinegame01'), side(1337.5, 1300), side(1662.5, 1700));
    expect(dup.rows[0]!.r.duplicate).toBe(true);
    const alice = await db.query<{ rating: string }>(`select rating from public.ratings where category = 'blitz' and user_id = $1`, [ALICE]);
    expect(Number(alice.rows[0]!.rating)).toBe(1337.5); // unchanged by the duplicate
    await expect(record(game('onlinegame03', { black_id: ALICE }), null, null)).rejects.toThrow(/two different players/);
    await expect(record(game('onlinegame04', { source: 'bot' }), null, null)).rejects.toThrow(/invalid source/);
  });

  it('casual games are recorded without touching ratings', async () => {
    await record(game('casualgame01', { rated: false, source: 'challenge', result: '1/2-1/2', termination: 'agreement' }), null, null);
    const g = await db.query<{ rated: boolean; white_delta: number | null }>(`select rated, white_delta from public.games where id = 'casualgame01'`);
    expect(g.rows[0]).toEqual({ rated: false, white_delta: null });
    const r = await db.query<{ games: number }>(`select games from public.ratings where category = 'blitz' and user_id = $1`, [ALICE]);
    expect(r.rows[0]!.games).toBe(1);
  });
});

describe('special badges', () => {
  it('the hammer badge exists, is special, and is never awarded by playing', async () => {
    const row = await db.query<{ special: boolean; icon: string }>(`select special, icon from public.achievements where id = 'hammer'`);
    expect(row.rows[0]).toEqual({ special: true, icon: 'hammer' });
    await asService(() => db.query('select * from public.award_achievements($1)', [ALICE]));
    const has = await db.query(`select 1 from public.user_achievements where user_id = $1 and achievement_id = 'hammer'`, [ALICE]);
    expect(has.rows.length).toBe(0);
    await expect(as(ALICE, () => db.query(`insert into public.user_achievements (user_id, achievement_id) values ($1, 'hammer')`, [ALICE]))).rejects.toThrow(/permission denied|row-level security/);
  });
});

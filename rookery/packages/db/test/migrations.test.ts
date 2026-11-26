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
    expect(rows.every((r) => Number(r.rating) === 500)).toBe(true);
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
    await expect(as(ALICE, () => db.query('select public.record_online_game($1, $2, $3)', [game('aaaaaaaaaaaa'), side(500, 700), side(1500, 1300)]))).rejects.toThrow(/permission denied/);
  });

  it('records a rated game, both rating updates and history in one go', async () => {
    const r = await record(game('onlinegame01'), side(500, 337.5), side(500, 662.5));
    expect(r.rows[0]!.r.duplicate).toBe(false);
    const ratings = await db.query<{ user_id: string; rating: string; games: number; peak: string }>(`select user_id, rating, games, peak from public.ratings where category = 'blitz' and user_id in ($1, $2) order by rating`, [ALICE, BOB]);
    expect(ratings.rows.map((x) => [x.user_id, Number(x.rating), x.games])).toEqual([[ALICE, 337.5, 1], [BOB, 662.5, 1]]);
    const g = await db.query<{ white_delta: number; black_delta: number; white_rating: number }>(`select white_delta, black_delta, white_rating from public.games where id = 'onlinegame01'`);
    expect(g.rows[0]).toEqual({ white_delta: -163, black_delta: 163, white_rating: 500 });
    const hist = await db.query(`select 1 from public.rating_history where game_id = 'onlinegame01'`);
    expect(hist.rows.length).toBe(2);
  });

  it('refuses updates computed from stale ratings, duplicates and self-play', async () => {
    await expect(record(game('onlinegame02'), side(500, 400), side(500, 600))).rejects.toThrow(/rating_changed/);
    expect((await db.query(`select 1 from public.games where id = 'onlinegame02'`)).rows.length).toBe(0); // rolled back
    const dup = await record(game('onlinegame01'), side(337.5, 300), side(662.5, 700));
    expect(dup.rows[0]!.r.duplicate).toBe(true);
    const alice = await db.query<{ rating: string }>(`select rating from public.ratings where category = 'blitz' and user_id = $1`, [ALICE]);
    expect(Number(alice.rows[0]!.rating)).toBe(337.5); // unchanged by the duplicate
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

describe('500 starting rating', () => {
  it('new players start at 500 in every category', async () => {
    const DAN = '00000000-0000-0000-0000-00000000000d';
    await signUp(DAN, { username: 'dan_500', birth_date: yearsAgo(25) });
    const r = await db.query<{ rating: string }>('select rating from public.ratings where user_id = $1', [DAN]);
    expect(r.rows.length).toBe(5);
    expect(r.rows.every((x) => Number(x.rating) === 500)).toBe(true);
  });
});

describe('stage 6: puzzles', () => {
  const P1 = 'puzzleAAAA1';
  beforeAll(async () => {
    // The generated puzzle set is loaded by a migration; these tests use their own small set.
    await db.query('delete from public.puzzles');
    await db.query(`insert into public.puzzles (id, fen, first_move, solution, rating, themes) values
      ('puzzleAAAA1', 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', 'f3e5', '{c6e5,d2d4,e5c6}', 700, '{fork,short}'),
      ('puzzleBBBB2', '8/8/8/8/8/8/8/K6k w - - 0 1', 'a1a2', '{h1h2}', 520, '{endgame,oneMove}'),
      ('puzzleCCCC3', '8/8/8/8/8/8/8/K6k w - - 0 1', 'a1b1', '{h1g1}', 2200, '{endgame,oneMove}')`);
  });

  it('solutions are secret; puzzles are otherwise public', async () => {
    await expect(as(null, () => db.query(`select solution from public.puzzles where id = $1`, [P1]))).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, () => db.query(`select * from public.puzzles`))).rejects.toThrow(/permission denied/);
    const ok = await as(null, () => db.query<{ fen: string }>(`select id, fen, first_move, rating, themes from public.puzzles where id = $1`, [P1]));
    expect(ok.rows.length).toBe(1);
  });

  it('daily puzzle is chosen once per day and stable', async () => {
    const a = await as(null, () => db.query<{ daily_puzzle: string }>('select public.daily_puzzle()'));
    const b = await as(ALICE, () => db.query<{ daily_puzzle: string }>('select public.daily_puzzle()'));
    expect(a.rows[0]!.daily_puzzle).toBe(P1); // the only puzzle with 3+ moves in range
    expect(b.rows[0]!.daily_puzzle).toBe(P1);
  });

  it('next puzzle is near the player’s rating, by theme, never one already tried', async () => {
    const near = await as(null, () => db.query<{ next_puzzle: string }>(`select public.next_puzzle(null, 500)`));
    expect(near.rows[0]!.next_puzzle).toBe('puzzleBBBB2');
    const themed = await as(null, () => db.query<{ next_puzzle: string }>(`select public.next_puzzle('fork', 500)`));
    expect(themed.rows[0]!.next_puzzle).toBe(P1);
  });

  it('only the server records attempts; only the first attempt is rated', async () => {
    const args = [ALICE, P1, true, { before: { rating: 500 }, after: { rating: 640, rd: 300, volatility: 0.06 } }, { before: { rating: 700 }, after: { rating: 680, rd: 340, volatility: 0.06 } }];
    await expect(as(ALICE, () => db.query('select public.record_puzzle_attempt($1, $2, $3, $4, $5)', args))).rejects.toThrow(/permission denied/);
    const first = await asService(() => db.query<{ record_puzzle_attempt: { rated: boolean } }>('select public.record_puzzle_attempt($1, $2, $3, $4, $5)', args));
    expect(first.rows[0]!.record_puzzle_attempt.rated).toBe(true);
    const again = await asService(() => db.query<{ record_puzzle_attempt: { rated: boolean } }>('select public.record_puzzle_attempt($1, $2, $3, $4, $5)', args));
    expect(again.rows[0]!.record_puzzle_attempt.rated).toBe(false);
    const r = await db.query<{ rating: string }>(`select rating from public.ratings where user_id = $1 and category = 'puzzle'`, [ALICE]);
    expect(Number(r.rows[0]!.rating)).toBe(640);
    const p = await db.query<{ plays: number; solves: number; rating: string }>(`select plays, solves, rating from public.puzzles where id = $1`, [P1]);
    expect(p.rows[0]).toMatchObject({ plays: 1, solves: 1 });
    const stats = await as(null, () => db.query<{ attempts: number; solved: number }>('select * from public.puzzle_stats($1)', [ALICE]));
    expect(stats.rows[0]).toMatchObject({ attempts: 1, solved: 1, current_streak: 1 });
    // The player's own history is private to them.
    expect((await as(BOB, () => db.query('select * from public.puzzle_attempts'))).rows.length).toBe(0);
    expect((await as(ALICE, () => db.query('select * from public.puzzle_attempts'))).rows.length).toBe(1);
    const next = await as(ALICE, () => db.query<{ next_puzzle: string }>(`select public.next_puzzle('fork')`));
    expect(next.rows[0]!.next_puzzle).toBeNull(); // the only fork puzzle has been tried
  });
});

describe('stage 6: friends and notifications', () => {
  it('request → notification → accept → friends; only the addressee can accept', async () => {
    await as(ALICE, () => db.query('insert into public.friendships (addressee_id) values ($1)', [BOB]));
    await expect(as(ALICE, () => db.query('insert into public.friendships (addressee_id) values ($1)', [ALICE]))).rejects.toThrow();
    await expect(as(BOB, () => db.query('insert into public.friendships (addressee_id) values ($1)', [ALICE]))).rejects.toThrow(/friend_pending|duplicate/);
    const n = await as(BOB, () => db.query<{ kind: string; actor_id: string }>('select kind, actor_id from public.notifications'));
    expect(n.rows).toContainEqual({ kind: 'friend_request', actor_id: ALICE });
    expect((await as(ALICE, () => db.query(`select 1 from public.notifications where kind = 'friend_request'`))).rows.length).toBe(0);
    const selfAccept = await as(ALICE, () => db.query(`update public.friendships set status = 'accepted' where addressee_id = $1 returning 1`, [BOB]));
    expect(selfAccept.rows.length).toBe(0);
    await as(BOB, () => db.query(`update public.friendships set status = 'accepted' where requester_id = $1`, [ALICE]));
    const f = await as(null, () => db.query<{ status: string }>('select status from public.friendships'));
    expect(f.rows).toEqual([{ status: 'accepted' }]); // accepted friendships are public
    expect((await as(ALICE, () => db.query(`select 1 from public.notifications where kind = 'friend_accepted'`))).rows.length).toBe(1);
    const friends = await asService(() => db.query<{ are_friends: boolean }>('select public.are_friends($1, $2)', [BOB, ALICE]));
    expect(friends.rows[0]!.are_friends).toBe(true);
  });

  it('players can mark their own notifications read, not others’, and cannot create them', async () => {
    await as(BOB, () => db.query('update public.notifications set read_at = now()'));
    expect((await db.query(`select 1 from public.notifications where user_id = $1 and read_at is null`, [BOB])).rows.length).toBe(0);
    await as(BOB, () => db.query('update public.notifications set read_at = now() where user_id = $1', [ALICE]));
    expect((await db.query(`select 1 from public.notifications where user_id = $1 and read_at is null`, [ALICE])).rows.length).toBeGreaterThan(0);
    await expect(as(ALICE, () => db.query(`insert into public.notifications (user_id, kind) values ($1, 'achievement')`, [BOB]))).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, () => db.query(`select public.notify($1, 'achievement', null, '{}')`, [BOB]))).rejects.toThrow(/permission denied/);
  });
});

describe('stage 6: reports, restrictions and staff', () => {
  const MOD = '00000000-0000-0000-0000-0000000000e1';
  const ADMIN = '00000000-0000-0000-0000-0000000000e2';
  beforeAll(async () => {
    await signUp(MOD, { username: 'mod_user', birth_date: yearsAgo(30) });
    await signUp(ADMIN, { username: 'admin_user', birth_date: yearsAgo(30) });
    await db.query(`insert into public.staff (user_id, role) values ($1, 'moderator'), ($2, 'admin')`, [MOD, ADMIN]);
  });

  it('players file reports (rate-limited, no duplicates) and see only their own', async () => {
    await as(ALICE, () => db.query(`insert into public.reports (target_id, reason, details) values ($1, 'abuse', 'rude in chat')`, [BOB]));
    await expect(as(ALICE, () => db.query(`insert into public.reports (target_id, reason) values ($1, 'spam')`, [BOB]))).rejects.toThrow(/report_duplicate/);
    await expect(as(ALICE, () => db.query(`insert into public.reports (target_id, reason) values ($1, 'spam')`, [ALICE]))).rejects.toThrow();
    await expect(as(ALICE, () => db.query(`insert into public.reports (target_id, reason, status) values ($1, 'spam', 'resolved')`, [MOD]))).rejects.toThrow(/permission denied/);
    expect((await as(BOB, () => db.query('select * from public.reports'))).rows.length).toBe(0);
    expect((await as(MOD, () => db.query('select * from public.reports'))).rows.length).toBe(1);
  });

  it('only staff resolve reports; resolution is logged and the reporter notified', async () => {
    const nobody = await as(ALICE, () => db.query(`update public.reports set status = 'resolved' returning 1`));
    expect(nobody.rows.length).toBe(0);
    await as(MOD, () => db.query(`update public.reports set status = 'resolved', resolution = 'warned'`));
    const r = await db.query<{ resolved_by: string }>('select resolved_by from public.reports');
    expect(r.rows[0]!.resolved_by).toBe(MOD);
    expect((await as(MOD, () => db.query(`select 1 from public.moderation_log where action = 'report:resolved'`))).rows.length).toBe(1);
    expect((await as(ALICE, () => db.query(`select 1 from public.notifications where kind = 'report_resolved'`))).rows.length).toBe(1);
    expect((await as(ALICE, () => db.query('select * from public.moderation_log'))).rows.length).toBe(0);
  });

  it('staff restrict players; moderators cannot ban; nobody restricts staff; bans mark the profile', async () => {
    await expect(as(ALICE, () => db.query(`insert into public.restrictions (user_id, kind, reason) values ($1, 'mute', 'test')`, [BOB]))).rejects.toThrow(/row-level security/);
    await as(MOD, () => db.query(`insert into public.restrictions (user_id, kind, reason, expires_at) values ($1, 'mute', 'abusive chat', now() + interval '1 day')`, [BOB]));
    expect((await asService(() => db.query<{ is_restricted: boolean }>(`select public.is_restricted($1, 'mute')`, [BOB]))).rows[0]!.is_restricted).toBe(true);
    expect((await asService(() => db.query<{ is_restricted: boolean }>(`select public.is_restricted($1, 'no_play')`, [BOB]))).rows[0]!.is_restricted).toBe(false);
    await expect(as(MOD, () => db.query(`insert into public.restrictions (user_id, kind, reason) values ($1, 'ban', 'cheating')`, [BOB]))).rejects.toThrow(/row-level security/);
    await expect(as(MOD, () => db.query(`insert into public.restrictions (user_id, kind, reason) values ($1, 'mute', 'nope')`, [ADMIN]))).rejects.toThrow(/row-level security/);
    await as(ADMIN, () => db.query(`insert into public.restrictions (user_id, kind, reason) values ($1, 'ban', 'cheating')`, [BOB]));
    expect((await db.query<{ is_banned: boolean }>('select is_banned from public.profiles where id = $1', [BOB])).rows[0]!.is_banned).toBe(true);
    expect((await asService(() => db.query<{ is_restricted: boolean }>(`select public.is_restricted($1, 'no_play')`, [BOB]))).rows[0]!.is_restricted).toBe(true);
    expect((await as(BOB, () => db.query('select kind from public.restrictions'))).rows.length).toBe(2); // sees own
    await as(ADMIN, () => db.query(`update public.restrictions set lifted_at = now(), lifted_by = $1 where kind = 'ban'`, [ADMIN]));
    expect((await db.query<{ is_banned: boolean }>('select is_banned from public.profiles where id = $1', [BOB])).rows[0]!.is_banned).toBe(false);
    expect((await as(ADMIN, () => db.query(`select action from public.moderation_log where target_id = $1 and action not like 'report:%' order by id`, [BOB]))).rows.map((r: any) => r.action)).toEqual(['restrict:mute', 'restrict:ban', 'lift:ban']);
  });

  it('chat logs are readable by staff only', async () => {
    await asService(() => db.query(`insert into public.chat_messages (game_id, user_id, body) values ('onlinegame01', $1, 'gg')`, [ALICE]));
    expect((await as(ALICE, () => db.query('select * from public.chat_messages'))).rows.length).toBe(0);
    expect((await as(MOD, () => db.query('select * from public.chat_messages'))).rows.length).toBe(1);
    await expect(as(ALICE, () => db.query(`insert into public.chat_messages (game_id, user_id, body) values ('onlinegame01', $1, 'x')`, [ALICE]))).rejects.toThrow(/permission denied/);
  });
});

describe('stage 6: reviews, tournaments, search, explorer', () => {
  it('only a game’s players can save its review; everyone can read it', async () => {
    const evals = JSON.stringify([{ cp: 20 }, { cp: 30 }]);
    await expect(as(MOD_OR(BOB), () => db.query(`insert into public.game_reviews (game_id, evals, engine, depth) values ('onlinegame01', $1, 'sf', 12)`, [evals]))).resolves.toBeTruthy();
    await expect(as('00000000-0000-0000-0000-0000000000e1', () => db.query(`insert into public.game_reviews (game_id, evals, engine, depth) values ('casualgame01', $1, 'sf', 12)`, [evals]))).rejects.toThrow(/row-level security/);
    expect((await as(null, () => db.query('select * from public.game_reviews'))).rows.length).toBe(1);
  });

  it('tournaments and standings are public and server-written; tournament games are recorded', async () => {
    await expect(as(ALICE, () => db.query(`insert into public.tournaments (id, name, time_control, category, starts_at, duration_minutes) values ('tourney00001', 'Mine', '3+0', 'blitz', now(), 30)`))).rejects.toThrow(/permission denied/);
    await asService(() => db.query(`insert into public.tournaments (id, name, time_control, category, starts_at, duration_minutes, status) values ('tourney00001', 'Friday Blitz', '3+0', 'blitz', now(), 30, 'running')`));
    const g = { id: 'tgame0000001', white_id: ALICE, black_id: BOB, source: 'tournament', tournament_id: 'tourney00001', rated: false, category: 'blitz', time_control: '3+0', initial_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: 'e2e4 e7e5', plies: 2, result: '1-0', termination: 'resign' };
    await asService(() => db.query('select public.record_online_game($1, null, null)', [g]));
    await expect(asService(() => db.query('select public.record_online_game($1, null, null)', [{ ...g, id: 'tgame0000002', tournament_id: null }]))).rejects.toThrow(/tournament games need a tournament/);
    expect((await as(null, () => db.query(`select 1 from public.games where tournament_id = 'tourney00001'`))).rows.length).toBe(1);
    const ach = await db.query(`select 1 from public.user_achievements where user_id = $1 and achievement_id = 'tournament-play'`, [ALICE]);
    expect(ach.rows.length).toBe(1);
    expect((await as(ALICE, () => db.query(`select 1 from public.notifications where kind = 'achievement'`))).rows.length).toBeGreaterThan(0);
  });

  it('player search by username prefix or display name', async () => {
    const r = await as(null, () => db.query<{ username: string }>(`select username from public.search_players('ali')`));
    expect(r.rows.map((x) => x.username)).toEqual(['Alice_1']);
    expect((await as(null, () => db.query(`select * from public.search_players('a')`))).rows.length).toBe(0); // 2+ characters
    expect((await as(null, () => db.query(`select * from public.search_players('%')`))).rows.length).toBe(0);
  });

  it('explorer counts next moves and results from real games', async () => {
    const r = await as(null, () => db.query<{ move: string; games: string; white_wins: string }>(`select move, games, white_wins from public.explorer_moves('e2e4', 'all')`));
    expect(r.rows.map((x) => ({ ...x, games: Number(x.games), white_wins: Number(x.white_wins) }))).toEqual([{ move: 'e7e5', games: 1, white_wins: 1 }]);
    expect((await as(null, () => db.query(`select * from public.explorer_moves('e2e4; drop table games', 'all')`))).rows.length).toBe(0);
  });
});

function MOD_OR(id: string) {
  return id; // (readability helper: the player who saves the review)
}

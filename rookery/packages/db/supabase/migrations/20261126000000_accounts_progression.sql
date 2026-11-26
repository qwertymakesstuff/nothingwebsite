-- Rookery Stage 4: accounts and progression.
--
-- Trust model:
--   • Browsers (anon / authenticated roles) can READ public data and EDIT only their own profile
--     presentation fields and their own settings. Every edit is validated here by constraints.
--   • Games, ratings, rating history and achievements are written ONLY by trusted server code
--     (the Rookery Worker using the service role, or the future realtime game server), never by
--     browsers. Clients cannot submit rating changes or results directly.

-- ── Usernames ─────────────────────────────────────────────────────────────────────────────
create function public.is_reserved_username(name text)
returns boolean
language sql immutable
as $$
  select lower(name) = any (array[
    'admin', 'administrator', 'rookery', 'support', 'help', 'moderator', 'mod', 'staff', 'system',
    'root', 'corvus', 'stockfish', 'null', 'undefined', 'api', 'www', 'me', 'settings', 'login',
    'signup', 'register', 'account', 'guest', 'anonymous', 'official'
  ])
$$;

alter table public.profiles
  add constraint profiles_username_not_reserved check (not public.is_reserved_username(username));

/** Whether a username can be registered. Safe to call before signing in. */
create function public.username_available(name text)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select name ~ '^[A-Za-z0-9_-]{3,20}$'
     and not public.is_reserved_username(name)
     and not exists (select 1 from public.profiles p where lower(p.username::text) = lower(name))
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- ── Profiles: avatar + validated presentation fields ─────────────────────────────────────
alter table public.profiles rename column avatar_url to avatar_path;
alter table public.profiles
  -- Avatars live in Storage under avatars/<user id>/…; a profile can only point at its own folder.
  add constraint profiles_avatar_own_folder check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9._-]{1,80}$')),
  add constraint profiles_country_format check (country is null or country ~ '^[A-Z]{2}$'),
  add constraint profiles_display_name_clean check (
    display_name is null or (char_length(btrim(display_name)) between 1 and 40 and display_name !~ '[[:cntrl:]]')
  ),
  add constraint profiles_bio_clean check (bio is null or bio !~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]');

revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path, bio, country) on public.profiles to authenticated;

-- ── Settings: one column per preference, each validated ───────────────────────────────────
alter table public.user_settings rename column sound_on to sound;
alter table public.user_settings rename column highlight_moves to highlight_last_move;
alter table public.user_settings
  add column show_legal_moves boolean not null default true,
  add column animation text not null default 'normal',
  add column reduce_motion boolean not null default false,
  add column bot_move_speed text not null default 'natural',
  add column bot_chat boolean not null default true;

update public.user_settings set background = 'study' where background = 'club';
alter table public.user_settings alter column board_theme set default 'stone';
alter table public.user_settings alter column background set default 'study';
alter table public.user_settings
  add constraint settings_board_theme check (board_theme in ('stone', 'walnut', 'slate', 'harbor', 'sage', 'midnight', 'contrast')),
  add constraint settings_piece_set check (piece_set in ('cburnett')),
  add constraint settings_background check (background in ('study', 'felt', 'night', 'plain')),
  add constraint settings_animation check (animation in ('off', 'fast', 'normal', 'slow')),
  add constraint settings_bot_move_speed check (bot_move_speed in ('natural', 'fast', 'instant'));

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

revoke update on public.user_settings from authenticated;
grant update (
  board_theme, piece_set, background, sound, show_coords, show_legal_moves, highlight_last_move,
  animation, auto_queen, confirm_resign, reduce_motion, bot_move_speed, bot_chat, allow_challenges, chat
) on public.user_settings to authenticated;

-- ── Ratings: every player starts with a provisional rating in each category ───────────────
insert into public.ratings (user_id, category)
select p.id, c.category
from public.profiles p
cross join (values ('bullet'), ('blitz'), ('rapid'), ('classical'), ('puzzle')) as c(category)
on conflict do nothing;

create table public.rating_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  category   text not null check (category in ('bullet', 'blitz', 'rapid', 'classical', 'puzzle')),
  rating     numeric(7, 2) not null,
  rd         numeric(6, 2) not null,
  game_id    text,
  created_at timestamptz not null default now()
);
create index rating_history_user on public.rating_history (user_id, category, created_at);

alter table public.rating_history enable row level security;
create policy "rating history is public" on public.rating_history for select to anon, authenticated using (true);
revoke insert, update, delete on public.ratings, public.rating_history from anon, authenticated;

-- ── New user: profile, private data, settings, starting ratings ───────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := new.raw_user_meta_data ->> 'username';
  v_birth    date;
begin
  -- Strict YYYY-MM-DD only (Postgres would otherwise accept words like 'today' or 'epoch').
  if coalesce(new.raw_user_meta_data ->> 'birth_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'A valid date of birth is required' using errcode = 'check_violation';
  end if;
  begin
    v_birth := (new.raw_user_meta_data ->> 'birth_date')::date;
  exception when others then
    raise exception 'A valid date of birth is required' using errcode = 'check_violation';
  end;
  if v_birth > current_date or v_birth < date '1900-01-01' then
    raise exception 'A valid date of birth is required' using errcode = 'check_violation';
  end if;
  if public.age_on(v_birth) < 13 then
    raise exception 'You must be at least 13 to create an account' using errcode = 'check_violation';
  end if;
  if v_username is null or v_username !~ '^[A-Za-z0-9_-]{3,20}$' then
    raise exception 'Usernames are 3–20 letters, numbers, _ or -' using errcode = 'check_violation';
  end if;
  if public.is_reserved_username(v_username) then
    raise exception 'That username is reserved' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, username) values (new.id, v_username);
  insert into public.user_private (user_id, birth_date) values (new.id, v_birth);
  insert into public.user_settings (user_id) values (new.id);
  insert into public.ratings (user_id, category)
  select new.id, c from unnest(array['bullet', 'blitz', 'rapid', 'classical', 'puzzle']) as c;
  return new;
end;
$$;

-- ── Games ─────────────────────────────────────────────────────────────────────────────────
create table public.games (
  id            text primary key default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  white_id      uuid references public.profiles (id) on delete set null,
  black_id      uuid references public.profiles (id) on delete set null,
  -- Computer opponent (games against bots): which persona, and its rating at the time.
  bot_id        text check (bot_id is null or bot_id ~ '^[a-z0-9-]{1,40}$'),
  bot_name      text check (bot_name is null or char_length(bot_name) <= 60),
  bot_elo       integer check (bot_elo is null or bot_elo between 100 and 3200),
  source        text not null check (source in ('bot', 'online', 'challenge', 'tournament')),
  rated         boolean not null default false,
  category      text not null check (category in ('bullet', 'blitz', 'rapid', 'classical', 'untimed')),
  time_control  text not null check (time_control ~ '^(none|\d{1,3}\+\d{1,3})$'),
  initial_fen   text not null,
  moves         text not null default '' check (moves ~ '^([a-h][1-8][a-h][1-8][qrbn]?( |$))*$'),
  plies         integer not null check (plies between 0 and 1000),
  result        text not null check (result in ('1-0', '0-1', '1/2-1/2')),
  termination   text not null check (termination in (
                  'checkmate', 'stalemate', 'insufficient', 'repetition', 'fifty-move',
                  'resign', 'timeout', 'agreement', 'abandon')),
  opening       text check (opening is null or char_length(opening) <= 80),
  -- Client-generated id for games recorded from the browser (bot games), so re-uploads are ignored.
  client_ref    text check (client_ref is null or client_ref ~ '^[A-Za-z0-9-]{6,64}$'),
  white_rating  integer,
  black_rating  integer,
  white_delta   integer,
  black_delta   integer,
  started_at    timestamptz,
  ended_at      timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  -- Games against the computer are never rated, and have exactly one human player.
  constraint games_bot_unrated check (source <> 'bot' or (rated = false and bot_id is not null and (white_id is null) <> (black_id is null))),
  constraint games_rating_changes_only_when_rated check (rated or (white_delta is null and black_delta is null))
);

create index games_white_recent on public.games (white_id, ended_at desc) where white_id is not null;
create index games_black_recent on public.games (black_id, ended_at desc) where black_id is not null;
create index games_bot on public.games (bot_id) where bot_id is not null;
create index games_rated_category on public.games (category, ended_at desc) where rated;
create unique index games_client_ref on public.games (coalesce(white_id, black_id), client_ref) where client_ref is not null;

alter table public.games enable row level security;
create policy "games are public" on public.games for select to anon, authenticated using (true);
revoke insert, update, delete on public.games from anon, authenticated;
-- No insert/update/delete policies: only trusted server code (service role) records games.

-- When a player deletes their account, their games against the computer go with it (nobody else
-- is in them). Games against people keep the opponent's history, with this player anonymised
-- by the foreign keys' "on delete set null".
create function public.delete_bot_games_of_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.games where source = 'bot' and (white_id = old.id or black_id = old.id);
  return old;
end $$;
revoke execute on function public.delete_bot_games_of_profile() from public, anon, authenticated;
create trigger profiles_delete_bot_games before delete on public.profiles
  for each row execute function public.delete_bot_games_of_profile();

-- One row per (player, game) with that player's outcome. Basis for statistics.
create view public.player_game_results
with (security_invoker = true)
as
  select g.id as game_id, g.white_id as user_id, 'white'::text as side, g.source, g.rated, g.category,
         g.bot_id, g.bot_elo, g.termination, g.plies, g.ended_at,
         case g.result when '1-0' then 'win' when '0-1' then 'loss' else 'draw' end as outcome
  from public.games g where g.white_id is not null
  union all
  select g.id, g.black_id, 'black', g.source, g.rated, g.category,
         g.bot_id, g.bot_elo, g.termination, g.plies, g.ended_at,
         case g.result when '0-1' then 'win' when '1-0' then 'loss' else 'draw' end
  from public.games g where g.black_id is not null;

create view public.player_stats
with (security_invoker = true)
as
  select user_id, source, category,
         count(*)::int as games,
         count(*) filter (where outcome = 'win')::int as wins,
         count(*) filter (where outcome = 'draw')::int as draws,
         count(*) filter (where outcome = 'loss')::int as losses
  from public.player_game_results
  group by user_id, source, category;

grant select on public.player_game_results, public.player_stats to anon, authenticated;

-- ── Achievements ──────────────────────────────────────────────────────────────────────────
create table public.achievements (
  id          text primary key,
  name        text not null,
  description text not null,
  tier        text not null check (tier in ('bronze', 'silver', 'gold')),
  icon        text not null,
  sort        integer not null
);

insert into public.achievements (id, name, description, tier, icon, sort) values
  ('first-game',   'First move',          'Finish your first game',                         'bronze', 'swords',    10),
  ('first-win',    'First blood',         'Win your first game',                            'bronze', 'swords',    20),
  ('win-as-black', 'Second mover',        'Win a game with the black pieces',               'bronze', 'shield',    30),
  ('quick-mate',   'Back to school',      'Win by checkmate within 10 moves',               'silver', 'target',    40),
  ('ten-games',    'Regular',             'Finish 10 games',                                'bronze', 'flame',     50),
  ('fifty-games',  'Pillar of the club',  'Finish 50 games',                                'silver', 'flame',     60),
  ('seven-days',   'Habit',               'Play on 7 different days',                       'silver', 'flame',     70),
  ('beat-club',    'Club strength',       'Beat a computer opponent rated 1300 or more',    'silver', 'crown',     80),
  ('beat-expert',  'Expert hunter',       'Beat a computer opponent rated 1800 or more',    'gold',   'crown',     90),
  ('beat-master',  'Master slayer',       'Beat a computer opponent rated 2300 or more',    'gold',   'crown',    100),
  ('beat-corvus',  'Raven slayer',        'Beat Corvus at full strength',                   'gold',   'crown',    110);

create table public.user_achievements (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  unlocked_at    timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
create policy "achievement catalogue is public" on public.achievements for select to anon, authenticated using (true);
create policy "unlocks are public" on public.user_achievements for select to anon, authenticated using (true);
revoke insert, update, delete on public.achievements, public.user_achievements from anon, authenticated;

/**
 * Re-evaluates a player's achievements from their recorded games and inserts any newly earned
 * ones. Returns the ids unlocked by this call. Called by trusted server code after a game is saved.
 */
create function public.award_achievements(p_user uuid)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  earned text[] := array[]::text[];
  r record;
begin
  select count(*) as games,
         count(*) filter (where outcome = 'win') as wins,
         count(*) filter (where outcome = 'win' and side = 'black') as black_wins,
         count(*) filter (where outcome = 'win' and termination = 'checkmate' and plies <= 20) as quick_mates,
         count(distinct (ended_at at time zone 'utc')::date) as days,
         coalesce(max(bot_elo) filter (where outcome = 'win'), 0) as best_bot_win,
         count(*) filter (where outcome = 'win' and bot_id = 'corvus') as corvus_wins
    into r
    from public.player_game_results
   where user_id = p_user;

  if r.games >= 1 then earned := array_append(earned, 'first-game'); end if;
  if r.wins >= 1 then earned := array_append(earned, 'first-win'); end if;
  if r.black_wins >= 1 then earned := array_append(earned, 'win-as-black'); end if;
  if r.quick_mates >= 1 then earned := array_append(earned, 'quick-mate'); end if;
  if r.games >= 10 then earned := array_append(earned, 'ten-games'); end if;
  if r.games >= 50 then earned := array_append(earned, 'fifty-games'); end if;
  if r.days >= 7 then earned := array_append(earned, 'seven-days'); end if;
  if r.best_bot_win >= 1300 then earned := array_append(earned, 'beat-club'); end if;
  if r.best_bot_win >= 1800 then earned := array_append(earned, 'beat-expert'); end if;
  if r.best_bot_win >= 2300 then earned := array_append(earned, 'beat-master'); end if;
  if r.corvus_wins >= 1 then earned := array_append(earned, 'beat-corvus'); end if;

  return query
    insert into public.user_achievements (user_id, achievement_id)
    select p_user, a from unnest(earned) as a
    on conflict do nothing
    returning achievement_id;
end;
$$;

revoke all on function public.award_achievements(uuid) from public, anon, authenticated;
grant execute on function public.award_achievements(uuid) to service_role;

-- ── Avatars (Supabase Storage) ────────────────────────────────────────────────────────────
-- Public bucket (anyone can view avatars); 256 KB images only; users write only their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 262144, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload their own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users replace their own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete their own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

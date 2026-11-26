-- Rookery Stage 5: recording live games between people, and their rating changes.
--
-- Only the realtime server (a Durable Object holding the authoritative game, using the secret
-- key) calls record_online_game. It computes the Glicko-2 update from the ratings it read before
-- the game; this function re-checks those under a row lock, so two games finishing at once can
-- never both apply an update calculated from the same stale rating (the server recomputes and
-- retries on 'rating_changed'). Everything happens in one transaction.

create function public.record_online_game(p_game jsonb, p_white jsonb, p_black jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g_id     text := p_game->>'id';
  w_id     uuid := (p_game->>'white_id')::uuid;
  b_id     uuid := (p_game->>'black_id')::uuid;
  is_rated boolean := coalesce((p_game->>'rated')::boolean, false);
  cat      text := p_game->>'category';
  w        public.ratings%rowtype;
  b        public.ratings%rowtype;
  inserted text;
  w_ach    text[];
  b_ach    text[];
begin
  if g_id is null or g_id !~ '^[A-Za-z0-9]{8,24}$' then raise exception 'invalid game id'; end if;
  if w_id is null or b_id is null or w_id = b_id then raise exception 'a game needs two different players'; end if;
  if (p_game->>'source') not in ('online', 'challenge') then raise exception 'invalid source'; end if;

  -- Already recorded (the server retried after a lost response): nothing to do.
  if exists (select 1 from public.games where id = g_id) then
    return jsonb_build_object('duplicate', true);
  end if;

  if is_rated then
    if cat not in ('bullet', 'blitz', 'rapid', 'classical') then raise exception 'unrated category'; end if;
    -- Lock both rows in a fixed order (no deadlocks between concurrent games).
    perform 1 from public.ratings where user_id in (w_id, b_id) and category = cat order by user_id for update;
    select * into w from public.ratings where user_id = w_id and category = cat;
    select * into b from public.ratings where user_id = b_id and category = cat;
    if w.user_id is null or b.user_id is null then raise exception 'missing rating row'; end if;
    if abs(w.rating - (p_white->'before'->>'rating')::numeric) > 0.01
       or abs(w.rd - (p_white->'before'->>'rd')::numeric) > 0.01
       or abs(b.rating - (p_black->'before'->>'rating')::numeric) > 0.01
       or abs(b.rd - (p_black->'before'->>'rd')::numeric) > 0.01 then
      raise exception 'rating_changed';
    end if;
  end if;

  insert into public.games (
    id, white_id, black_id, source, rated, category, time_control, initial_fen, moves, plies,
    result, termination, opening, white_rating, black_rating, white_delta, black_delta, started_at, ended_at
  ) values (
    g_id, w_id, b_id, p_game->>'source', is_rated, cat, p_game->>'time_control', p_game->>'initial_fen',
    coalesce(p_game->>'moves', ''), (p_game->>'plies')::integer, p_game->>'result', p_game->>'termination',
    p_game->>'opening',
    case when is_rated then round(w.rating)::integer end,
    case when is_rated then round(b.rating)::integer end,
    case when is_rated then round((p_white->'after'->>'rating')::numeric - w.rating)::integer end,
    case when is_rated then round((p_black->'after'->>'rating')::numeric - b.rating)::integer end,
    (p_game->>'started_at')::timestamptz, coalesce((p_game->>'ended_at')::timestamptz, now())
  )
  on conflict (id) do nothing
  returning id into inserted;

  if inserted is null then
    return jsonb_build_object('duplicate', true);
  end if;

  if is_rated then
    update public.ratings set
      rating = (p_white->'after'->>'rating')::numeric,
      rd = (p_white->'after'->>'rd')::numeric,
      volatility = (p_white->'after'->>'volatility')::numeric,
      games = games + 1,
      peak = greatest(coalesce(peak, 0), (p_white->'after'->>'rating')::numeric),
      updated_at = now()
    where user_id = w_id and category = cat;
    update public.ratings set
      rating = (p_black->'after'->>'rating')::numeric,
      rd = (p_black->'after'->>'rd')::numeric,
      volatility = (p_black->'after'->>'volatility')::numeric,
      games = games + 1,
      peak = greatest(coalesce(peak, 0), (p_black->'after'->>'rating')::numeric),
      updated_at = now()
    where user_id = b_id and category = cat;
    insert into public.rating_history (user_id, category, rating, rd, game_id) values
      (w_id, cat, (p_white->'after'->>'rating')::numeric, (p_white->'after'->>'rd')::numeric, g_id),
      (b_id, cat, (p_black->'after'->>'rating')::numeric, (p_black->'after'->>'rd')::numeric, g_id);
  end if;

  select coalesce(array_agg(a), '{}') into w_ach from public.award_achievements(w_id) as a;
  select coalesce(array_agg(a), '{}') into b_ach from public.award_achievements(b_id) as a;
  return jsonb_build_object('duplicate', false, 'white_achievements', to_jsonb(w_ach), 'black_achievements', to_jsonb(b_ach));
end;
$$;

revoke all on function public.record_online_game(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_online_game(jsonb, jsonb, jsonb) to service_role;

-- Match history: a player's games against people, newest first.
create index games_online_recent on public.games (ended_at desc) where source in ('online', 'challenge');

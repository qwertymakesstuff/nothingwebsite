-- Rookery: every player starts at 500 instead of 1500.
--
-- Glicko-2 only depends on rating differences, so moving every stored rating down by exactly 1000
-- gives the same result as if everyone had started at 500: players without games are at 500, and
-- games already played keep their exact effect. Rating deviations and volatility don't change.

alter table public.ratings alter column rating set default 500;

update public.ratings
   set rating = greatest(100, rating - 1000),
       peak = case when peak is null then null else greatest(100, peak - 1000) end;

update public.rating_history set rating = greatest(100, rating - 1000);

update public.games
   set white_rating = greatest(100, white_rating - 1000),
       black_rating = greatest(100, black_rating - 1000)
 where white_rating is not null or black_rating is not null;

-- Rookery: special badges, given by hand rather than earned by playing.
-- A special achievement is shown only on the profiles of players who have it, and doesn't count
-- towards the "x of y unlocked" progress. award_achievements never grants or removes them.

alter table public.achievements add column special boolean not null default false;

insert into public.achievements (id, name, description, tier, icon, sort, special) values
  ('hammer', 'The Hammer', 'A special badge from the Rookery team', 'gold', 'hammer', 1000, true)
on conflict (id) do nothing;

-- Given to stalkr. (If that account doesn't exist yet, nothing is inserted.)
insert into public.user_achievements (user_id, achievement_id)
select id, 'hammer' from public.profiles where username = 'stalkr'
on conflict do nothing;

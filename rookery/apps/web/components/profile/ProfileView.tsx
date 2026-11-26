'use client';

import { Bot, CalendarDays, Crown, Flame, Hourglass, Pencil, Puzzle, Shield, Swords, Target, Timer, Trophy, UserX, Zap } from 'lucide-react';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { GamesTable } from '@/components/games/GamesTable';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { avatarUrl, RATING_CATEGORIES, type AchievementRow, type RatingRow } from '@/lib/db';
import { CATEGORY_LABEL, countryName, formatDate, formatMonthYear } from '@/lib/format';
import { winRate } from '@/lib/gameUtils';
import { totals, usePlayerData, type PlayerData } from '@/lib/usePlayerData';

const CAT_ICON = { bullet: Zap, blitz: Flame, rapid: Timer, classical: Hourglass, puzzle: Puzzle };
const ACH_ICON: Record<string, typeof Swords> = { swords: Swords, crown: Crown, flame: Flame, puzzle: Puzzle, target: Target, shield: Shield, zap: Zap, hourglass: Hourglass };
const TIER_STYLE = {
  bronze: 'from-[#9a6a45] to-[#5e3f27] text-[#f3d9c2]',
  silver: 'from-[#a9adb4] to-[#5d6168] text-[#f1f3f5]',
  gold: 'from-gold-400 to-gold-700 text-fg-inverse',
};

/** Ratings with few games are provisional (high rating deviation). */
export function ratingLabel(r: Pick<RatingRow, 'rating' | 'rd'>): string {
  return `${Math.round(r.rating)}${r.rd > 110 ? '?' : ''}`;
}

export function ProfileView({ username }: { username: string | null }) {
  const { state, reload } = usePlayerData(username);
  if (!username || state.status === 'loading') return <LoadingState label="Loading player…" />;
  if (state.status === 'notFound') {
    return (
      <EmptyState className="py-24" icon={<UserX className="size-5" />} title="No player by that name" action={<ButtonLink href="/leaderboard" variant="secondary">Browse players</ButtonLink>}>
        @{username} doesn’t exist, or the account was deleted.
      </EmptyState>
    );
  }
  if (state.status === 'error') {
    return <ErrorState className="py-24" action={<button className="font-semibold text-gold-300" onClick={() => void reload()}>Try again</button>}>{state.message}</ErrorState>;
  }
  return <Profile data={state.data} />;
}

function Profile({ data }: { data: PlayerData }) {
  const { profile, ratings, stats, games, achievements } = data;
  const { userId } = useAuth();
  const own = userId === profile.id;
  const all = totals(stats);
  const vsBots = totals(stats, 'bot');
  const unlocked = achievements.filter((a) => a.unlocked_at).length;
  const byCat = new Map(ratings.map((r) => [r.category, r]));
  const sideStats = (side: 'white' | 'black') => {
    const mine = games.filter((g) => (side === 'white' ? g.white_id === profile.id : g.black_id === profile.id));
    const wins = mine.filter((g) => g.result === (side === 'white' ? '1-0' : '0-1')).length;
    const draws = mine.filter((g) => g.result === '1/2-1/2').length;
    return { games: mine.length, wins, draws, losses: mine.length - wins - draws };
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-24 bg-[linear-gradient(120deg,rgb(193_154_82/0.22),rgb(193_154_82/0.03)_55%),repeating-conic-gradient(rgb(255_241_214/0.035)_0_25%,transparent_0_50%)] bg-[length:auto,48px_48px] sm:h-32" />
        <div className="flex flex-col gap-5 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
          <PlayerAvatar name={profile.username} src={avatarUrl(profile.avatar_path)} size="xl" className="-mt-12 rounded-[28%] ring-4 ring-surface-1" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2.5">
              <span className="font-[family-name:var(--font-display)] text-[28px] leading-tight font-semibold">{profile.username}</span>
              <CountryTag code={profile.country ?? undefined} />
              {own && <Badge tone="gold">You</Badge>}
            </p>
            {(profile.display_name || profile.country) && (
              <p className="text-fg-muted">
                {profile.display_name}
                {profile.country && <span className="text-fg-subtle">{profile.display_name ? ' · ' : ''}{countryName(profile.country)}</span>}
              </p>
            )}
            {profile.bio && <p className="mt-2 max-w-2xl text-sm whitespace-pre-line text-fg-muted">{profile.bio}</p>}
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-fg-subtle">
              <CalendarDays className="size-3.5" aria-hidden /> Joined {formatMonthYear(profile.created_at)}
            </p>
          </div>
          {own ? (
            <ButtonLink href="/settings?section=profile" variant="secondary" icon={<Pencil className="size-4" />}>
              Edit profile
            </ButtonLink>
          ) : (
            <ButtonLink href={`/play?challenge=${encodeURIComponent(profile.username)}`} variant="primary" icon={<Swords className="size-4" />}>
              Challenge
            </ButtonLink>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {RATING_CATEGORIES.map((c) => {
          const r = byCat.get(c);
          const Icon = CAT_ICON[c];
          return (
            <Card key={c} className="p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-fg-subtle">
                <Icon className="size-4 text-gold-400" aria-hidden />
                {CATEGORY_LABEL[c]}
              </p>
              <p className="tabular mt-2 font-[family-name:var(--font-display)] text-[26px] leading-none font-semibold" title={r && r.rd > 110 ? 'Provisional: not enough rated games yet' : undefined}>
                {r ? ratingLabel(r) : '–'}
              </p>
              <p className="tabular mt-2 text-[11px] text-fg-subtle">
                {r?.games ?? 0} rated {c === 'puzzle' ? 'puzzles' : 'games'}
                {r?.peak ? ` · peak ${Math.round(r.peak)}` : ''}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Games" value={all.games} hint={`${vsBots.games} vs computer`} />
        <StatCard label="Win rate" value={winRate(all.wins, all.draws, all.games)} hint="draws count as half" />
        <StatCard label="Record" value={<span><span className="text-win">{all.wins}</span>–<span className="text-draw">{all.draws}</span>–<span className="text-loss">{all.losses}</span></span>} hint="wins – draws – losses" />
        <StatCard label="Achievements" value={`${unlocked}/${achievements.length}`} hint="unlocked" />
      </div>

      <Card className="overflow-hidden">
        <Tabs
          label="Profile sections"
          listClassName="px-3 pt-1"
          items={[
            { value: 'games', label: 'Games', count: games.length, content: <GamesTable games={games} userId={profile.id} username={profile.username} /> },
            {
              value: 'stats',
              label: 'Stats',
              content:
                all.games === 0 ? (
                  <EmptyState icon={<Trophy className="size-5" />} title="No statistics yet">Statistics appear after the first finished game.</EmptyState>
                ) : (
                  <div className="grid gap-6 p-5 md:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-semibold">All games</p>
                      <ResultBar w={all.wins} d={all.draws} l={all.losses} />
                      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <Tile label="Wins" value={all.wins} tone="text-win" />
                        <Tile label="Draws" value={all.draws} tone="text-draw" />
                        <Tile label="Losses" value={all.losses} tone="text-loss" />
                      </dl>
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm font-semibold">By colour (recent games)</p>
                      {(['white', 'black'] as const).map((side) => {
                        const s = sideStats(side);
                        return (
                          <div key={side}>
                            <p className="mb-1.5 flex justify-between text-xs text-fg-muted">
                              <span>As {side}</span>
                              <span className="tabular">{s.games} games · {winRate(s.wins, s.draws, s.games)}</span>
                            </p>
                            <ResultBar w={s.wins} d={s.draws} l={s.losses} />
                          </div>
                        );
                      })}
                      <p className="pt-2 text-sm font-semibold">By type</p>
                      <ul className="space-y-1.5 text-sm">
                        {stats.map((s) => (
                          <li key={`${s.source}-${s.category}`} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-fg-muted">
                              {s.source === 'bot' && <Bot className="size-3.5" aria-hidden />}
                              {s.source === 'bot' ? 'vs computer' : s.source} · {s.category}
                            </span>
                            <span className="tabular text-fg-subtle">
                              {s.wins}–{s.draws}–{s.losses} · {winRate(s.wins, s.draws, s.games)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ),
            },
            { value: 'awards', label: 'Achievements', count: unlocked, content: <AchievementGrid achievements={achievements} /> },
          ]}
        />
      </Card>
    </div>
  );
}

export function AchievementGrid({ achievements }: { achievements: AchievementRow[] }) {
  return (
    <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((a) => {
        const Icon = ACH_ICON[a.icon] ?? Trophy;
        return (
          <div key={a.id} className={cn('flex items-center gap-3 rounded-[12px] border border-line p-3', !a.unlocked_at && 'opacity-45')}>
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-b', a.unlocked_at ? TIER_STYLE[a.tier] : 'bg-surface-3 text-fg-subtle')}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{a.name}</p>
              <p className="text-xs text-fg-subtle">{a.description}</p>
              <p className="text-[11px] text-fg-subtle">{a.unlocked_at ? `Earned ${formatDate(a.unlocked_at)}` : 'Locked'}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-fg-subtle">{label}</p>
      <p className="tabular mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-[11px] text-fg-subtle">{hint}</p>
    </Card>
  );
}

function ResultBar({ w, d, l }: { w: number; d: number; l: number }) {
  const t = w + d + l || 1;
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={`${w} wins, ${d} draws, ${l} losses`}>
      <div className="bg-win" style={{ width: `${(w / t) * 100}%` }} />
      <div className="bg-draw" style={{ width: `${(d / t) * 100}%` }} />
      <div className="bg-loss" style={{ width: `${(l / t) * 100}%` }} />
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[12px] bg-surface-2 p-3">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className={cn('tabular mt-1 text-lg font-semibold', tone)}>{value}</dd>
    </div>
  );
}

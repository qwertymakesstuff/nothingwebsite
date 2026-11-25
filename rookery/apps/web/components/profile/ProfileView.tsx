'use client';

import { CalendarDays, Clock3, Crown, Flame, Hourglass, Puzzle, Shield, Swords, Target, Trophy, UserPlus, Users, Zap } from 'lucide-react';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { Sparkline } from '@/components/charts/Sparkline';
import { GameHistoryTable } from '@/components/games/GameHistoryTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { EmptyState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { CATEGORY_ICON } from '@/lib/categoryIcons';
import { cn } from '@/lib/cn';
import type { Achievement } from '@/lib/data';
import { CATEGORY_LABEL, countryName, formatDate, formatMonthYear, formatRating } from '@/lib/format';
import type { DataSource, GameSummary, Profile } from '@/lib/types';

const ACH_ICON = { swords: Swords, crown: Crown, flame: Flame, puzzle: Puzzle, target: Target, shield: Shield, zap: Zap, hourglass: Hourglass };
const TIER_STYLE = {
  bronze: 'from-[#9a6a45] to-[#5e3f27] text-[#f3d9c2]',
  silver: 'from-[#a9adb4] to-[#5d6168] text-[#f1f3f5]',
  gold: 'from-gold-400 to-gold-700 text-fg-inverse',
};

export function ProfileView({
  profile,
  games,
  achievements,
  source,
}: {
  profile: Profile;
  games: GameSummary[];
  achievements: { achievement: Achievement; unlockedAt: string | null }[];
  source: DataSource;
}) {
  const total = profile.record.wins + profile.record.draws + profile.record.losses;
  const unlocked = achievements.filter((a) => a.unlockedAt).length;

  return (
    <div className="space-y-6">
      <SampleNotice source={source} variant="banner">
        This is a fictional example player. Real profiles arrive with accounts in Stage 2.
      </SampleNotice>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-[linear-gradient(120deg,rgb(193_154_82/0.22),rgb(193_154_82/0.03)_55%),repeating-conic-gradient(rgb(255_241_214/0.035)_0_25%,transparent_0_50%)] bg-[length:auto,48px_48px] sm:h-32" />
        <div className="flex flex-col gap-5 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
          <PlayerAvatar name={profile.username} size="xl" className="-mt-12 rounded-[28%] ring-4 ring-surface-1" online={profile.online} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2.5">
              <span className="font-[family-name:var(--font-display)] text-[28px] leading-tight font-semibold">{profile.username}</span>
              <CountryTag code={profile.country} />
              {profile.online && <Badge tone="win">Online</Badge>}
            </p>
            <p className="text-fg-muted">
              {profile.displayName}
              {profile.country && <span className="text-fg-subtle"> · {countryName(profile.country)}</span>}
            </p>
            {profile.bio && <p className="mt-2 max-w-2xl text-sm text-fg-muted">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-fg-subtle">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden /> Joined {formatMonthYear(profile.joinedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" aria-hidden /> {profile.friends} friends
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-3.5" aria-hidden /> {profile.online ? 'Online now' : `Last seen ${formatDate(profile.lastSeenAt)}`}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" icon={<Swords className="size-4" />} disabled title="Challenges arrive in Stage 8">
              Challenge
            </Button>
            <Button variant="secondary" icon={<UserPlus className="size-4" />} disabled title="Friends arrive in Stage 8">
              Add friend
            </Button>
          </div>
        </div>
      </Card>

      {/* Rating cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {profile.ratings.map((r) => {
          const Icon = CATEGORY_ICON[r.category];
          const delta = r.history[r.history.length - 1]! - r.history[r.history.length - 8]!;
          return (
            <Card key={r.category} className="p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-fg-subtle">
                <Icon className="size-4 text-gold-400" aria-hidden />
                {CATEGORY_LABEL[r.category]}
              </p>
              <p className="tabular mt-2 font-[family-name:var(--font-display)] text-[26px] leading-none font-semibold">
                {formatRating(r.rating)}
                <span className={cn('ml-2 font-[family-name:var(--font-sans)] text-xs font-semibold', delta >= 0 ? 'text-win' : 'text-loss')}>
                  {delta >= 0 ? '+' : ''}
                  {delta}
                </span>
              </p>
              <Sparkline values={r.history} className="mt-3 h-8" label={`${CATEGORY_LABEL[r.category]} rating history`} />
              <p className="tabular mt-2 text-[11px] text-fg-subtle">
                {r.games.toLocaleString('en-US')} {r.category === 'puzzle' ? 'solved' : 'games'} · peak {r.peak}
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <Tabs
          label="Profile sections"
          listClassName="px-3 pt-1"
          items={[
            {
              value: 'games',
              label: 'Games',
              count: games.length,
              content: games.length ? (
                <GameHistoryTable games={games} perspective={profile.username} />
              ) : (
                <EmptyState icon={<Swords className="size-5" />} title="No games yet">
                  Games appear here after they finish.
                </EmptyState>
              ),
            },
            {
              value: 'stats',
              label: 'Stats',
              content: (
                <div className="grid gap-6 p-5 md:grid-cols-2">
                  <div>
                    <p className="mb-3 text-sm font-semibold">All rated games</p>
                    <ResultBar w={profile.record.wins} d={profile.record.draws} l={profile.record.losses} />
                    <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <Tile label="Wins" value={profile.record.wins} tone="text-win" />
                      <Tile label="Draws" value={profile.record.draws} tone="text-draw" />
                      <Tile label="Losses" value={profile.record.losses} tone="text-loss" />
                    </dl>
                    <p className="tabular mt-3 text-xs text-fg-subtle">{total.toLocaleString('en-US')} games in total</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">Peak ratings</p>
                    {profile.ratings.map((r) => (
                      <div key={r.category} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-fg-muted">{CATEGORY_LABEL[r.category]}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full bg-gradient-to-r from-gold-700 to-gold-400" style={{ width: `${Math.min(100, (r.peak / 3000) * 100)}%` }} />
                        </div>
                        <span className="tabular w-12 text-right font-semibold">{r.peak}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              value: 'awards',
              label: 'Awards',
              count: unlocked,
              content: (
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map(({ achievement: a, unlockedAt }) => {
                    const Icon = ACH_ICON[a.icon];
                    return (
                      <div key={a.id} className={cn('flex items-center gap-3 rounded-[12px] border border-line p-3', !unlockedAt && 'opacity-45')}>
                        <span className={cn('grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-b shadow-inner', unlockedAt ? TIER_STYLE[a.tier] : 'bg-surface-3 text-fg-subtle')}>
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{a.name}</p>
                          <p className="truncate text-xs text-fg-subtle">{a.description}</p>
                          <p className="text-[11px] text-fg-subtle">{unlockedAt ? `Earned ${formatDate(unlockedAt)}` : 'Locked'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Streak" icon={<Flame className="size-4" />} />
          <CardBody>
            <p className="tabular font-[family-name:var(--font-display)] text-4xl font-semibold">{profile.streakDays} days</p>
            <p className="mt-1 text-sm text-fg-muted">Consecutive days with a game or puzzle.</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Club league" icon={<Trophy className="size-4" />} />
          <CardBody>
            <p className="text-sm text-fg-muted">Weekly divisions with promotion and relegation are planned for Stage 9.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ResultBar({ w, d, l }: { w: number; d: number; l: number }) {
  const t = w + d + l || 1;
  return (
    <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={`${w} wins, ${d} draws, ${l} losses`}>
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
      <dd className={cn('tabular mt-1 text-lg font-semibold', tone)}>{value.toLocaleString('en-US')}</dd>
    </div>
  );
}

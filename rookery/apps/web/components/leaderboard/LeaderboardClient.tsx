'use client';

import { Crown, LogIn } from 'lucide-react';
import Link from 'next/link';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { Sparkline } from '@/components/charts/Sparkline';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { Tabs } from '@/components/ui/Tabs';
import { CATEGORY_ICON } from '@/lib/categoryIcons';
import { cn } from '@/lib/cn';
import { CATEGORY_LABEL } from '@/lib/format';
import type { Category, DataSource, LeaderboardEntry } from '@/lib/types';

const MEDAL = ['text-gold-300', 'text-[#c9cdd3]', 'text-[#c58b5a]'];

export function LeaderboardClient({ boards, source }: { boards: Record<Category, LeaderboardEntry[]>; source: DataSource }) {
  const cats = Object.keys(boards) as Category[];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-w-0 overflow-hidden">
        <Tabs
          label="Leaderboard category"
          listClassName="px-3 pt-1"
          defaultValue="blitz"
          items={cats.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return {
              value: c,
              label: CATEGORY_LABEL[c],
              icon: <Icon className="size-4" />,
              content: <Board entries={boards[c]} category={c} />,
            };
          })}
        />
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Your position" />
          <CardBody>
            <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line p-4">
              <LogIn className="size-5 text-fg-subtle" aria-hidden />
              <p className="text-sm text-fg-muted">Sign in to see where you rank. Accounts open in Stage 2.</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="How rankings work" />
          <CardBody className="space-y-3 text-sm leading-relaxed text-fg-muted">
            <p>
              Ratings use the <span className="text-fg">Glicko-2</span> system, separately for each time control.
            </p>
            <p>To appear here you need 20 or more rated games in the category and a settled rating (low uncertainty).</p>
            <p>Leaderboards refresh every few minutes.</p>
            <SampleNotice source={source} variant="banner">
              The players listed are fictional examples.
            </SampleNotice>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Board({ entries, category }: { entries: LeaderboardEntry[]; category: Category }) {
  const podium = entries.slice(0, 3);
  return (
    <div>
      <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-3 sm:p-5">
        {podium.map((e, i) => (
          <Link
            key={e.player.username}
            href={`/u/${e.player.username}`}
            className={cn(
              'flex items-center gap-3 rounded-[14px] border p-4 transition-colors hover:border-gold-500/40',
              i === 0 ? 'border-gold-500/30 bg-gold-500/[0.07]' : 'border-line bg-surface-2/50',
            )}
          >
            <div className="relative">
              <PlayerAvatar name={e.player.username} size="lg" />
              <Crown className={cn('absolute -top-2.5 -right-2 size-5 drop-shadow', MEDAL[i])} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="tabular text-xs font-semibold text-fg-subtle">#{e.rank}</p>
              <p className="truncate font-semibold text-fg">{e.player.username}</p>
              <p className="tabular font-[family-name:var(--font-display)] text-xl font-semibold">{e.rating}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">{CATEGORY_LABEL[category]} leaderboard</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-fg-subtle">
              <th className="w-16 py-2.5 pl-5 font-medium">Rank</th>
              <th className="py-2.5 font-medium">Player</th>
              <th className="py-2.5 text-right font-medium">Rating</th>
              <th className="hidden py-2.5 text-right font-medium sm:table-cell">Games</th>
              <th className="hidden py-2.5 text-right font-medium md:table-cell">Win rate</th>
              <th className="w-32 py-2.5 pr-5 pl-6 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((e) => (
              <tr key={e.player.username} className="transition-colors hover:bg-surface-2/60">
                <td className="tabular py-3 pl-5 font-semibold text-fg-subtle">{e.rank}</td>
                <td className="py-2">
                  <Link href={`/u/${e.player.username}`} className="flex items-center gap-3 hover:text-gold-300">
                    <PlayerAvatar name={e.player.username} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.player.username}</span>
                      <span className="block truncate text-xs text-fg-subtle">{e.player.displayName}</span>
                    </span>
                    <CountryTag code={e.player.country} />
                  </Link>
                </td>
                <td className="tabular py-3 text-right font-semibold">{e.rating}</td>
                <td className="tabular hidden py-3 text-right text-fg-muted sm:table-cell">{e.games.toLocaleString('en-US')}</td>
                <td className="tabular hidden py-3 text-right text-fg-muted md:table-cell">{Math.round(e.winRate * 100)}%</td>
                <td className="py-3 pr-5 pl-6">
                  <Sparkline values={e.trend} className="h-6" label={`${e.player.username} rating trend`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

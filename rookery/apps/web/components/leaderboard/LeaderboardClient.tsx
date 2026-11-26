'use client';

import { BarChart3, Crown, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { ratingLabel } from '@/components/profile/ProfileView';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/lib/auth';
import { CATEGORY_ICON } from '@/lib/categoryIcons';
import { cn } from '@/lib/cn';
import { avatarUrl, fetchLeaderboard, fetchRatings, RATING_CATEGORIES, type LeaderboardRow, type RatingCategory, type RatingRow } from '@/lib/db';
import { CATEGORY_LABEL } from '@/lib/format';

const MEDAL = ['text-gold-300', 'text-[#c9cdd3]', 'text-[#c58b5a]'];

export function LeaderboardClient() {
  const [category, setCategory] = useState<RatingCategory>('blitz');
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-w-0 overflow-hidden">
        <Tabs
          label="Leaderboard category"
          listClassName="px-3 pt-1"
          value={category}
          onChange={setCategory}
          items={RATING_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c];
            return { value: c, label: CATEGORY_LABEL[c], icon: <Icon className="size-4" />, content: <Board category={c} /> };
          })}
        />
      </Card>
      <div className="space-y-6">
        <YourPosition category={category} />
        <Card>
          <CardHeader title="How rankings work" />
          <CardBody className="space-y-3 text-sm leading-relaxed text-fg-muted">
            <p>
              Ratings use the <span className="text-fg">Glicko-2</span> system, with a separate rating for each time control.
            </p>
            <p>Only rated online games count, and the server calculates every rating change. Games against computer opponents are never rated.</p>
            <p>Ratings marked “?” are provisional until enough games have been played.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Board({ category }: { category: RatingCategory }) {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; rows: LeaderboardRow[] }>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    fetchLeaderboard(category)
      .then((rows) => alive && setState({ status: 'ready', rows }))
      .catch((e: Error) => alive && setState({ status: 'error', message: e.message }));
    return () => {
      alive = false;
    };
  }, [category]);

  if (state.status === 'loading') return <LoadingState label="Loading rankings…" />;
  if (state.status === 'error') return <ErrorState>{state.message}</ErrorState>;
  if (!state.rows.length) {
    return (
      <EmptyState icon={<BarChart3 className="size-5" />} title={`No ranked ${CATEGORY_LABEL[category].toLowerCase()} players yet`} action={<ButtonLink href="/bots" variant="secondary">Play the computer meanwhile</ButtonLink>}>
        The leaderboard fills up as people play rated online games.
      </EmptyState>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[30rem] text-sm">
        <caption className="sr-only">{CATEGORY_LABEL[category]} leaderboard</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-fg-subtle">
            <th className="w-16 py-2.5 pl-5 font-medium">Rank</th>
            <th className="py-2.5 font-medium">Player</th>
            <th className="py-2.5 text-right font-medium">Rating</th>
            <th className="py-2.5 pr-5 text-right font-medium">Games</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {state.rows.map((r, i) => (
            <tr key={r.profile.username} className="transition-colors hover:bg-surface-2/60">
              <td className="tabular py-3 pl-5 font-semibold text-fg-subtle">
                {i < 3 ? <Crown className={cn('size-4', MEDAL[i])} aria-label={`#${i + 1}`} /> : i + 1}
              </td>
              <td className="py-2">
                <Link href={`/u/${r.profile.username}`} className="flex items-center gap-3 hover:text-gold-300">
                  <PlayerAvatar name={r.profile.username} src={avatarUrl(r.profile.avatar_path)} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{r.profile.username}</span>
                    {r.profile.display_name && <span className="block truncate text-xs text-fg-subtle">{r.profile.display_name}</span>}
                  </span>
                  <CountryTag code={r.profile.country ?? undefined} />
                </Link>
              </td>
              <td className="tabular py-3 text-right font-semibold">{ratingLabel(r)}</td>
              <td className="tabular py-3 pr-5 text-right text-fg-muted">{r.games}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YourPosition({ category }: { category: RatingCategory }) {
  const { status, userId } = useAuth();
  const [mine, setMine] = useState<RatingRow | null>(null);
  useEffect(() => {
    if (!userId) return setMine(null);
    fetchRatings(userId).then((rs) => setMine(rs.find((r) => r.category === category) ?? null)).catch(() => setMine(null));
  }, [userId, category]);

  return (
    <Card>
      <CardHeader title="Your position" />
      <CardBody>
        {status !== 'signedIn' ? (
          <div className="flex items-center gap-3 rounded-[12px] border border-dashed border-line p-4">
            <LogIn className="size-5 text-fg-subtle" aria-hidden />
            <p className="text-sm text-fg-muted">
              <Link href="/login?next=/leaderboard" className="font-semibold text-gold-300 hover:underline">
                Sign in
              </Link>{' '}
              to see your rating here.
            </p>
          </div>
        ) : mine ? (
          <div>
            <p className="tabular font-[family-name:var(--font-display)] text-3xl font-semibold">{ratingLabel(mine)}</p>
            <p className="mt-1 text-sm text-fg-muted">{mine.games ? `${mine.games} rated games` : 'Unranked until your first rated game'}</p>
          </div>
        ) : (
          <LoadingState className="py-4" />
        )}
      </CardBody>
    </Card>
  );
}

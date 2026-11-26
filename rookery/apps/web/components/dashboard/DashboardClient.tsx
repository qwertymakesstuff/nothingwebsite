'use client';

import { ArrowRight, Bot, Microscope, Puzzle, Trophy } from 'lucide-react';
import Link from 'next/link';
import { MiniBoard } from '@/components/board/MiniBoard';
import { GamesTable } from '@/components/games/GamesTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { QuickPlay } from '@/components/play/QuickPlay';
import { ratingLabel } from '@/components/profile/ProfileView';
import { ServerStatus } from '@/components/ServerStatus';
import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { RequireAuth, useAuth } from '@/lib/auth';
import { CATEGORY_ICON } from '@/lib/categoryIcons';
import { RATING_CATEGORIES } from '@/lib/db';
import { CATEGORY_LABEL, formatCount } from '@/lib/format';
import { winRate } from '@/lib/gameUtils';
import type { PuzzleSummary, Sourced } from '@/lib/types';
import { totals, usePlayerData } from '@/lib/usePlayerData';

export function DashboardClient({ daily }: { daily: Sourced<PuzzleSummary> }) {
  return (
    <RequireAuth>
      <Dashboard daily={daily} />
    </RequireAuth>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Dashboard({ daily }: { daily: Sourced<PuzzleSummary> }) {
  const { profile, profileError, refreshProfile } = useAuth();
  const { state, reload } = usePlayerData(profile?.username ?? null, { gameLimit: 8 });
  if (profileError)
    return (
      <ErrorState action={<button className="font-semibold text-gold-300" onClick={() => void refreshProfile()}>Try again</button>}>
        We couldn’t load your account: {profileError}
      </ErrorState>
    );
  if (!profile || state.status === 'loading') return <LoadingState label="Loading your club…" />;
  if (state.status !== 'ready') return <ErrorState action={<button className="font-semibold text-gold-300" onClick={() => void reload()}>Try again</button>}>We couldn’t load your dashboard.</ErrorState>;

  const { ratings, stats, games, achievements } = state.data;
  const all = totals(stats);
  const unlocked = achievements.filter((a) => a.unlocked_at);
  const nextUp = achievements.filter((a) => !a.unlocked_at).slice(0, 3);
  const byCat = new Map(ratings.map((r) => [r.category, r]));
  const lastBot = games.find((g) => g.source === 'bot' && g.bot_id && g.bot_id !== 'custom');

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Your club" title={`${greeting()}, ${profile.display_name || profile.username}`} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Quick play" eyebrow="Start a game" />
              <CardBody>
                <QuickPlay />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Jump back in" eyebrow="Continue" />
              <ul className="divide-y divide-line border-t border-line">
                <Row
                  href={lastBot ? `/bots?bot=${lastBot.bot_id}` : '/bots'}
                  icon={<Bot className="size-3.5" />}
                  eyebrow="Computer"
                  title={lastBot ? `Rematch ${lastBot.bot_name}` : 'Play a computer opponent'}
                  subtitle={lastBot ? 'Your last opponent' : '15 opponents from 300 to full strength'}
                  cta="Play"
                />
                <Row href="/puzzles" icon={<Puzzle className="size-3.5" />} eyebrow="Puzzles" title={daily.data.title} subtitle="Today’s puzzle (sample until Stage 6)" cta="Solve" board={<MiniBoard fen={daily.data.fen} lastMove={daily.data.lastMove} />} />
                <Row href="/analysis" icon={<Microscope className="size-3.5" />} eyebrow="Study" title="Analysis board" subtitle="Paste a PGN or FEN and explore" cta="Open" />
              </ul>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Recent games"
              action={
                <ButtonLink href={`/u/${profile.username}`} variant="ghost" size="sm" iconRight={<ArrowRight className="size-3.5" />}>
                  All games
                </ButtonLink>
              }
            />
            <GamesTable games={games} userId={profile.id} username={profile.username} compact />
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Ratings" action={<span className="text-xs text-fg-subtle">? = provisional</span>} />
            <CardBody className="space-y-1">
              {RATING_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICON[c];
                const r = byCat.get(c);
                return (
                  <div key={c} className="flex items-center gap-3 py-1.5">
                    <Icon className="size-4 text-gold-400" aria-hidden />
                    <span className="flex-1 text-sm text-fg-muted">{CATEGORY_LABEL[c]}</span>
                    <span className="tabular text-sm font-semibold">{r ? ratingLabel(r) : '–'}</span>
                    <span className="tabular w-16 text-right text-xs text-fg-subtle">{r?.games ?? 0} games</span>
                  </div>
                );
              })}
              <p className="pt-2 text-xs text-fg-subtle">Ratings change only in rated online games, which arrive with live multiplayer.</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Your record" icon={<Trophy className="size-4" />} />
            <CardBody>
              <p className="tabular font-[family-name:var(--font-display)] text-3xl font-semibold">
                <span className="text-win">{all.wins}</span>–<span className="text-draw">{all.draws}</span>–<span className="text-loss">{all.losses}</span>
              </p>
              <p className="mt-1 text-sm text-fg-muted">
                {formatCount(all.games)} games · {winRate(all.wins, all.draws, all.games)} win rate
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Achievements" action={<span className="tabular text-xs text-fg-subtle">{unlocked.length}/{achievements.length}</span>} />
            <CardBody>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-300" style={{ width: `${(unlocked.length / Math.max(1, achievements.length)) * 100}%` }} />
              </div>
              {nextUp.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {nextUp.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3">
                      <span className="font-medium text-fg-muted">{a.name}</span>
                      <span className="text-right text-xs text-fg-subtle">{a.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Daily puzzle" title={daily.data.title} action={<SampleNotice source={daily.source} />} />
            <CardBody>
              <MiniBoard fen={daily.data.fen} lastMove={daily.data.lastMove} label="Daily puzzle position" />
              <ButtonLink href="/puzzles" variant="primary" block className="mt-4">
                Solve the daily puzzle
              </ButtonLink>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="System status" eyebrow="Live" />
            <CardBody>
              <ServerStatus />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ href, icon, eyebrow, title, subtitle, cta, board }: { href: string; icon: React.ReactNode; eyebrow: string; title: string; subtitle: string; cta: string; board?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-2/60">
        {board ? <div className="pointer-events-none w-16 shrink-0">{board}</div> : <span className="grid size-16 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-gold-400 [&>svg]:size-6">{icon}</span>}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">
            <span className="text-gold-400">{icon}</span>
            {eyebrow}
          </p>
          <p className="truncate font-semibold text-fg">{title}</p>
          <p className="truncate text-xs text-fg-subtle">{subtitle}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-gold-300 opacity-85 group-hover:opacity-100">
          {cta} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </li>
  );
}

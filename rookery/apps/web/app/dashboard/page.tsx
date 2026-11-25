import { ArrowRight, Flame, Microscope, Puzzle, Trophy, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { MiniBoard } from '@/components/board/MiniBoard';
import { Sparkline } from '@/components/charts/Sparkline';
import { GameHistoryTable } from '@/components/games/GameHistoryTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { QuickPlay } from '@/components/play/QuickPlay';
import { ServerStatus } from '@/components/ServerStatus';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { CATEGORY_ICON } from '@/lib/categoryIcons';
import { getDailyPuzzle, getLeaderboard, getOnlineFriends, getPreviewProfile, getRecentGames } from '@/lib/data';
import { CATEGORY_LABEL, formatCount, formatRating, outcomeFor } from '@/lib/format';

export const metadata: Metadata = { title: 'Home' };

export default function DashboardPage() {
  const me = getPreviewProfile();
  const p = me.data;
  const games = getRecentGames(p.username, 6);
  const daily = getDailyPuzzle();
  const friends = getOnlineFriends();
  const top = getLeaderboard('blitz');
  const lastGame = games.data[0]!;
  const lastSide = lastGame.white.username === p.username ? 'white' : 'black';
  const opponent = lastSide === 'white' ? lastGame.black : lastGame.white;
  const puzzleRating = p.ratings.find((r) => r.category === 'puzzle')!;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your club"
        title={
          <span className="flex flex-wrap items-center gap-3">
            Good evening, {p.displayName}
            <SampleNotice source={me.source} />
          </span>
        }
        actions={
          <span className="flex items-center gap-2 rounded-full border border-gold-500/25 bg-gold-500/10 py-1.5 pr-4 pl-3 text-sm font-semibold text-gold-200">
            <Flame className="size-4 text-gold-400" aria-hidden />
            {p.streakDays}-day streak
          </span>
        }
      />
      <SampleNotice source={me.source} variant="banner">
        This is how your dashboard will look once you have an account (Stage 2). The player, ratings, games and
        friends shown are examples. Quick play, pass &amp; play and analysis already work.
      </SampleNotice>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Main column ── */}
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
                <ContinueRow
                  href="/puzzles"
                  icon={<Puzzle className="size-3.5" />}
                  eyebrow="Puzzles"
                  title={`Puzzle rating ${formatRating(puzzleRating.rating)}`}
                  subtitle="Keep your streak going"
                  board={<MiniBoard fen={daily.data.fen} lastMove={daily.data.lastMove} />}
                  cta="Solve"
                />
                <ContinueRow
                  href={`/u/${opponent.username}`}
                  icon={<Trophy className="size-3.5" />}
                  eyebrow="Last game"
                  title={`vs ${opponent.username}`}
                  subtitle={`${outcomeFor(lastGame.result, lastSide) === 'win' ? 'Won' : outcomeFor(lastGame.result, lastSide) === 'loss' ? 'Lost' : 'Drew'} by ${lastGame.termination} · ${lastGame.timeControl}`}
                  board={<MiniBoard fen={lastGame.fen} lastMove={lastGame.lastMove} orientation={lastSide} />}
                  cta="Opponent"
                />
                <ContinueRow
                  href="/analysis"
                  icon={<Microscope className="size-3.5" />}
                  eyebrow="Study"
                  title="Analysis board"
                  subtitle="Paste a PGN or FEN and explore"
                  board={<MiniBoard fen="r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3" />}
                  cta="Open"
                />
              </ul>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Recent games"
              action={
                <span className="flex items-center gap-2">
                  <SampleNotice source={games.source} />
                  <ButtonLink href={`/u/${p.username}`} variant="ghost" size="sm" iconRight={<ArrowRight className="size-3.5" />}>
                    All games
                  </ButtonLink>
                </span>
              }
            />
            <GameHistoryTable games={games.data} perspective={p.username} />
          </Card>
        </div>

        {/* ── Side column ── */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Ratings" action={<SampleNotice source={me.source} />} />
            <CardBody className="space-y-1">
              {p.ratings.map((r) => {
                const Icon = CATEGORY_ICON[r.category];
                const delta = r.history[r.history.length - 1]! - r.history[r.history.length - 8]!;
                return (
                  <div key={r.category} className="grid grid-cols-[1.25rem_1fr_auto_4.5rem] items-center gap-3 rounded-[10px] py-1.5">
                    <Icon className="size-4 text-gold-400" aria-hidden />
                    <span className="text-sm text-fg-muted">{CATEGORY_LABEL[r.category]}</span>
                    <span className="tabular text-right text-sm font-semibold">
                      {formatRating(r.rating)}
                      <span className={delta >= 0 ? 'ml-1.5 text-xs text-win' : 'ml-1.5 text-xs text-loss'}>
                        {delta >= 0 ? '+' : ''}
                        {delta}
                      </span>
                    </span>
                    <Sparkline values={r.history.slice(-12)} className="h-6" />
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Daily puzzle" title={daily.data.title} action={<SampleNotice source={daily.source} />} />
            <CardBody>
              <MiniBoard fen={daily.data.fen} lastMove={daily.data.lastMove} label="Daily puzzle position" />
              <p className="mt-3 text-sm text-fg-muted">{daily.data.teaser}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-fg-subtle">
                <span>{formatCount(daily.data.solvedBy ?? 0)} solved</span>
                <span className="tabular">Rated {daily.data.rating}</span>
              </div>
              <ButtonLink href="/puzzles" variant="primary" block className="mt-4">
                Solve the daily puzzle
              </ButtonLink>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Friends online" icon={<Users className="size-4" />} action={<SampleNotice source={friends.source} />} />
            <ul className="divide-y divide-line pb-2">
              {friends.data.map((f) => (
                <li key={f.username} className="flex items-center gap-3 px-5 py-2.5">
                  <PlayerAvatar name={f.username} size="sm" online={f.online} />
                  <Link href={`/u/${f.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-gold-300">
                    {f.username}
                  </Link>
                  <Button size="sm" variant="secondary" disabled title="Challenges arrive in Stage 8">
                    Challenge
                  </Button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Top blitz players"
              icon={<Trophy className="size-4" />}
              action={
                <ButtonLink href="/leaderboard" variant="ghost" size="sm">
                  View all
                </ButtonLink>
              }
            />
            <ol className="pb-3">
              {top.data.slice(0, 5).map((e) => (
                <li key={e.player.username} className="flex items-center gap-3 px-5 py-2">
                  <span className="tabular w-4 text-sm font-semibold text-fg-subtle">{e.rank}</span>
                  <PlayerAvatar name={e.player.username} size="xs" />
                  <Link href={`/u/${e.player.username}`} className="min-w-0 flex-1 truncate text-sm hover:text-gold-300">
                    {e.player.username}
                  </Link>
                  <CountryTag code={e.player.country} />
                  <span className="tabular text-sm font-semibold">{e.rating}</span>
                </li>
              ))}
            </ol>
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

function ContinueRow({
  href,
  eyebrow,
  title,
  subtitle,
  icon,
  board,
  cta,
}: {
  href: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  board: React.ReactNode;
  cta: string;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-2/60">
        <div className="pointer-events-none w-16 shrink-0 sm:w-[72px]">{board}</div>
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

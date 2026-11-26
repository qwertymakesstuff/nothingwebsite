'use client';

import { getTimeControl } from '@rookery/chess-core';
import type { TournamentView } from '@rookery/protocol';
import { Crown, Flame, LogIn, Pause, Play, Swords, Trophy, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { cancelTournament } from '@/lib/platform';
import { RealtimeSocket, type SocketStatus } from '@/lib/realtime/socket';

export function TournamentClient() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const { status: auth, userId } = useAuth();
  const [view, setView] = useState<TournamentView | null>(null);
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const sock = useRef<RealtimeSocket | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!id || !/^[A-Za-z0-9]{8,24}$/.test(id) || auth === 'loading') return;
    const s = new RealtimeSocket(
      `/ws/tournament/${id}`,
      {
        onStatus: setStatus,
        onMessage: (msg) => {
          if (msg.t === 'tournament') setView(msg.tournament);
          else if (msg.t === 'tournament-paired') router.push(`/game?id=${msg.gameId}&tournament=${id}`);
          else if (msg.t === 'error') {
            if (msg.code === 'not_found') setError('This tournament doesn’t exist.');
            else setNotice(msg.message);
          }
        },
      },
      true,
      true,
    );
    sock.current = s;
    return () => s.close();
  }, [id, auth, router]);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!id) return <EmptyState title="Tournament not found">This link is incomplete.</EmptyState>;
  if (error) return <ErrorState action={<Link href="/tournaments" className="font-semibold text-gold-300">All tournaments</Link>}>{error}</ErrorState>;
  if (!view) return <LoadingState label={status === 'reconnecting' ? 'Reconnecting…' : 'Connecting to the tournament…'} />;

  const now = sock.current?.now() ?? Date.now();
  const tc = getTimeControl(view.tc)?.label ?? view.tc;
  const until = (t: number) => {
    const s = Math.max(0, Math.round((t - now) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}:${String(s % 60).padStart(2, '0')}`;
  };
  const you = view.you;
  const canCancel = view.status === 'scheduled' && userId && view.createdBy === userId;
  const winner = view.status === 'finished' ? view.standings[0] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/tournaments" className="hover:text-gold-200">Tournaments</Link>}
        title={view.name}
        description={`${tc} arena · ${view.rated ? 'rated' : 'casual'} · ${Math.round((view.endsAt - view.startsAt) / 60000)} minutes`}
        actions={canCancel ? (
          <Button
            variant={confirmCancel ? 'danger' : 'ghost'}
            icon={<X className="size-4" />}
            onClick={() => {
              if (!confirmCancel) return setConfirmCancel(true);
              void cancelTournament(view.id).catch((e) => setNotice(e.message));
            }}
            onBlur={() => setConfirmCancel(false)}
          >
            {confirmCancel ? 'Click again to cancel it' : 'Cancel tournament'}
          </Button>
        ) : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-semibold">Standings</h2>
            <span className="flex items-center gap-1.5 text-xs text-fg-muted">
              <Users className="size-3.5" /> {view.players} {view.players === 1 ? 'player' : 'players'} · {view.ongoingGames} {view.ongoingGames === 1 ? 'game' : 'games'} in progress
            </span>
          </div>
          {view.standings.length === 0 ? (
            <EmptyState icon={<Trophy className="size-5" />} title="Nobody has joined yet">Be the first!</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-fg-subtle">
                  <th className="w-10 py-2 pl-5 font-medium">#</th>
                  <th className="py-2 font-medium">Player</th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">W · D · L</th>
                  <th className="py-2 pr-5 text-right font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {view.standings.map((p, i) => (
                  <tr key={p.userId} className={cn(p.userId === userId && 'bg-gold-500/[0.06]')}>
                    <td className="tabular py-2.5 pl-5 text-fg-subtle">{i + 1}</td>
                    <td className="py-2.5">
                      <Link href={`/u/${p.username}`} className={cn('font-semibold hover:text-gold-300', !p.active && 'text-fg-subtle')}>
                        {p.username}
                      </Link>{' '}
                      <span className="tabular text-xs text-fg-subtle">{p.rating}</span>
                      {p.playing && <Badge className="ml-2" tone="info">playing</Badge>}
                      {!p.active && view.status !== 'finished' && <span className="ml-2 text-xs text-fg-subtle">paused</span>}
                    </td>
                    <td className="tabular hidden py-2.5 text-right text-fg-muted sm:table-cell">
                      {p.wins} · {p.draws} · {p.losses}
                    </td>
                    <td className="tabular py-2.5 pr-5 text-right font-semibold">
                      {p.streak >= 2 && <Flame className="mr-1 inline size-3.5 text-[#e76624]" aria-label="On a winning streak: wins score double" />}
                      {p.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            {view.status === 'scheduled' && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Starts in</p>
                <p className="tabular font-[family-name:var(--font-display)] text-4xl font-semibold">{until(view.startsAt)}</p>
              </>
            )}
            {view.status === 'running' && (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-400">Live · ends in</p>
                <p className="tabular font-[family-name:var(--font-display)] text-4xl font-semibold">{until(view.endsAt)}</p>
              </>
            )}
            {view.status === 'finished' && (
              <div className="text-center">
                <Crown className="mx-auto size-8 text-gold-300" />
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">{winner && winner.games > 0 ? winner.username : 'No winner'}</p>
                <p className="text-sm text-fg-muted">{winner && winner.games > 0 ? `won with ${winner.score} points` : 'No games were played.'}</p>
                {view.ongoingGames > 0 && <p className="mt-2 text-xs text-fg-subtle">Final results once the last {view.ongoingGames} games finish.</p>}
              </div>
            )}
            {view.status === 'cancelled' && <p className="font-semibold text-fg-muted">This tournament was cancelled.</p>}

            {(view.status === 'scheduled' || view.status === 'running') && (
              <div className="mt-4 space-y-2">
                {auth !== 'signedIn' ? (
                  <ButtonLink href={`/login?next=${encodeURIComponent(`/tournament?id=${view.id}`)}`} variant="primary" block icon={<LogIn className="size-4" />}>
                    Sign in to join
                  </ButtonLink>
                ) : you?.gameId ? (
                  <ButtonLink href={`/game?id=${you.gameId}&tournament=${view.id}`} variant="primary" block icon={<Swords className="size-4" />}>
                    Back to your game
                  </ButtonLink>
                ) : you?.joined && you.active ? (
                  <>
                    <p className="flex items-center gap-2 text-sm text-fg-muted" role="status">
                      <span className="size-2 animate-pulse rounded-full bg-win motion-reduce:animate-none" />
                      {view.status === 'running' ? 'Waiting for your next opponent…' : 'You’re in. Stay on this page when it starts.'}
                    </p>
                    <Button variant="ghost" block icon={<Pause className="size-4" />} onClick={() => sock.current?.send({ t: 'tournament-pause' })}>
                      Pause (keep my score)
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" block icon={<Play className="size-4" />} disabled={status !== 'online'} onClick={() => sock.current?.send({ t: 'tournament-join' })}>
                    {you?.joined ? 'Resume' : 'Join tournament'}
                  </Button>
                )}
                {view.status === 'running' && you?.joined && <p className="text-xs text-fg-subtle">You’re paired only while this page is open.</p>}
              </div>
            )}
            {notice && (
              <p className="mt-3 text-sm text-loss" role="alert">
                {notice}
              </p>
            )}
          </Card>
          <Card className="p-5 text-sm text-fg-muted">
            <p className="mb-2 font-semibold text-fg">How arenas work</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Join, and you’re paired as soon as someone else is free.</li>
              <li>Win 2 points, draw 1. After two wins in a row, wins (and draws) score double: look for the flame.</li>
              <li>Pause any time; your score stays.</li>
              <li>The highest score when time runs out wins.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

'use client';

import type { GameView, PlayerInfo } from '@rookery/protocol';
import { Chess } from 'chess.js';
import { Check, Copy, Flag, Handshake, Link2, Microscope, RotateCcw, Swords, Wifi, WifiOff, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { ReportButton } from '@/components/moderation/ReportDialog';
import { GameChat } from './GameChat';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { MoveList, MoveNav } from '@/components/board/MoveList';
import { PlayerStrip } from '@/components/board/PlayerStrip';
import { PromotionPicker, type PromotionPiece } from '@/components/board/PromotionPicker';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { RequireAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { avatarUrl } from '@/lib/db';
import { CATEGORY_LABEL } from '@/lib/format';
import { ANALYSIS_HANDOFF_KEY } from '@/lib/gameUtils';
import { material } from '@/lib/material';
import { usePreferences } from '@/lib/preferences';
import { liveClock, tcLabel, useOnlineGame, type OnlineGame } from '@/lib/realtime/useOnlineGame';

type Side = 'white' | 'black';

const REASON: Record<string, string> = {
  checkmate: 'by checkmate',
  stalemate: 'by stalemate',
  insufficient: 'by insufficient material',
  repetition: 'by threefold repetition',
  'fifty-move': 'by the fifty-move rule',
  resign: 'by resignation',
  timeout: 'on time',
  agreement: 'by agreement',
  abandon: 'by abandonment',
};

const FATAL_TEXT: Record<string, { title: string; text: string }> = {
  not_found: { title: 'Game not found', text: 'This game doesn’t exist, or it finished more than a week ago.' },
  not_a_player: { title: 'Private game', text: 'Only the two players can open this game.' },
  seat_taken: { title: 'Game already started', text: 'Someone else accepted this challenge first.' },
  not_invited: { title: 'Not for you', text: 'This challenge was sent to another player.' },
  auth_failed: { title: 'Session expired', text: 'Sign in again to continue.' },
  auth_required: { title: 'Sign in to play', text: 'Live games need an account.' },
};

export function OnlineGameClient() {
  return (
    <RequireAuth>
      <OnlineGameInner />
    </RequireAuth>
  );
}

function OnlineGameInner() {
  const id = useSearchParams().get('id');
  const valid = id !== null && /^[A-Za-z0-9]{8,24}$/.test(id);
  const live = useOnlineGame(valid ? id : null, valid);
  const router = useRouter();

  // Both players accepted a rematch: go to the new game together.
  const next = live.game?.rematch.gameId;
  useEffect(() => {
    if (next) router.push(`/game?id=${next}`);
  }, [next, router]);

  if (!valid) return <Problem title="Game not found" text="This link is incomplete." />;
  if (live.fatal) {
    const f = FATAL_TEXT[live.fatal] ?? { title: 'Can’t open this game', text: live.error ?? 'Something went wrong.' };
    return <Problem title={f.title} text={f.text} />;
  }
  if (!live.game) return <LoadingState label={live.status === 'reconnecting' ? 'Reconnecting…' : 'Connecting to the game…'} />;
  const g = live.game;
  if (g.status === 'waiting') return <WaitingRoom live={live} game={g} />;
  if (g.status === 'cancelled') return <Problem title="Challenge cancelled" text="The challenge was withdrawn before the game started." />;
  if (g.status === 'declined') return <Problem title="Challenge declined" text={`${g.invited?.username ?? 'Your opponent'} declined the challenge.`} />;
  if (g.status === 'expired') return <Problem title="Challenge expired" text="Nobody accepted this challenge in time." />;
  return <GameScreen live={live} game={g} />;
}

// ── Waiting for an opponent (challenges and invitation links) ──────────────────────────────

function WaitingRoom({ live, game }: { live: OnlineGame; game: GameView }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${location.origin}/game?id=${game.id}` : '';
  const me = game.you === 'white' ? game.white : game.black;
  return (
    <div className="mx-auto max-w-lg pt-6">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface-1/95 p-8 text-center shadow-[var(--shadow-card)]">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-gold-500/12 text-gold-300">
          <Swords className="size-6" />
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold">
          {game.invited ? `Waiting for ${game.invited.username}` : 'Waiting for an opponent'}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {tcLabel(game.tc.id)} · {game.rated ? 'Rated' : 'Casual'} · you play {game.you}
          {me && ` · ${me.rating}${me.provisional ? '?' : ''}`}
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          {game.invited
            ? 'They’ve been notified. The game starts as soon as they accept. You can also send them this link:'
            : 'Send this link to the person you want to play. The game starts when they open it.'}
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface-2 p-1.5 pl-3">
          <Link2 className="size-4 shrink-0 text-fg-subtle" />
          <input readOnly value={link} className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-mono)] text-xs text-fg outline-none" aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
          <Button
            size="sm"
            variant="secondary"
            icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            onClick={() => {
              void navigator.clipboard?.writeText(link).then(() => setCopied(true));
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="ghost" icon={<X className="size-4" />} onClick={live.cancel}>
            Cancel challenge
          </Button>
        </div>
        <ConnectionPill status={live.status} className="mx-auto mt-6" />
      </div>
    </div>
  );
}

// ── The game ───────────────────────────────────────────────────────────────────────────────

interface Ply {
  san: string;
  fen: string;
  from: string;
  to: string;
  check: boolean;
}

function GameScreen({ live, game }: { live: OnlineGame; game: GameView }) {
  const router = useRouter();
  const { prefs } = usePreferences();
  const you: Side = game.you === 'black' ? 'black' : 'white';
  const opp: Side = you === 'white' ? 'black' : 'white';
  const [flipped, setFlipped] = useState(false);
  const orientation: Side = flipped ? opp : you;
  const [promo, setPromo] = useState<[string, string] | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [hideResult, setHideResult] = useState(false);

  // Replay the (server-confirmed plus pending) moves for display.
  const line = useMemo<Ply[]>(() => {
    const chess = new Chess();
    const out: Ply[] = [];
    for (const uci of live.moves) {
      try {
        const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        out.push({ san: m.san, fen: chess.fen(), from: m.from, to: m.to, check: chess.inCheck() });
      } catch {
        break;
      }
    }
    return out;
  }, [live.moves]);

  // Follow the game unless the player is looking back through it.
  const [cursor, setCursor] = useState(line.length);
  const following = useRef(true);
  useEffect(() => {
    if (following.current) setCursor(line.length);
  }, [line.length]);
  const goTo = (ply: number) => {
    following.current = ply >= line.length;
    setCursor(Math.max(0, Math.min(line.length, ply)));
  };

  const current = useMemo(() => {
    const chess = new Chess();
    for (const p of line.slice(0, cursor)) chess.move(p.san);
    return chess;
  }, [line, cursor]);
  const atEnd = cursor === line.length;
  const turn: Side = current.turn() === 'w' ? 'white' : 'black';
  const active = game.status === 'active';
  const myTurn = active && atEnd && turn === you && live.moves.length === game.moves.length;

  const dests = useMemo(() => {
    if (!myTurn) return undefined;
    const map = new Map<string, string[]>();
    for (const m of current.moves({ verbose: true })) map.set(m.from, [...(map.get(m.from) ?? []), m.to]);
    return map;
  }, [current, myTurn]);

  // Clocks tick locally between server updates, from the server's own timestamps.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [active]);
  const serverNow = live.now();
  const clocks = liveClock(game, serverNow);

  const send = (from: string, to: string, p?: PromotionPiece) => live.move(`${from}${to}${p ?? ''}`);
  const onMove = (from: string, to: string) => {
    const piece = current.get(from as Parameters<Chess['get']>[0]);
    const promoting = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    if (promoting && !prefs.autoQueen) setPromo([from, to]);
    else send(from, to, promoting ? 'q' : undefined);
  };

  const over = game.status === 'ended' || game.status === 'aborted';
  // Arena games: go back to the tournament automatically, so the next pairing can happen.
  const [returnIn, setReturnIn] = useState<number | null>(null);
  useEffect(() => {
    if (!over || !game.tournamentId) return;
    setReturnIn(6);
    const t = setInterval(() => setReturnIn((n) => (n === null ? null : n - 1)), 1000);
    return () => clearInterval(t);
  }, [over, game.tournamentId]);
  useEffect(() => {
    if (returnIn === 0 && game.tournamentId) router.push(`/tournament?id=${game.tournamentId}`);
  }, [returnIn, game.tournamentId, router]);
  const last = cursor > 0 ? line[cursor - 1] : undefined;
  const mat = material(current.fen());

  const strip = (side: Side) => {
    const p = side === 'white' ? game.white : game.black;
    const change = game.ratingChange?.[side];
    const lead = side === 'white' ? mat.balance : -mat.balance;
    const caps = side === 'white' ? mat.capturedByWhite : mat.capturedByBlack;
    return (
      <PlayerStrip
        name={p ? p.displayName || p.username : '…'}
        rating={p ? ratingText(p, change) : undefined}
        country={p?.country ?? undefined}
        avatar={p ? <PlayerAvatar name={p.username} src={avatarUrl(p.avatarPath)} size="sm" online={game.connected[side]} /> : undefined}
        clockMs={side === 'white' ? clocks.white : clocks.black}
        clockActive={active && game.clock.running === side}
        material={
          caps || lead > 0 ? (
            <span className="tracking-[-0.12em]">
              {caps}
              {lead > 0 && <span className="ml-2 tracking-normal">+{lead}</span>}
            </span>
          ) : undefined
        }
      />
    );
  };

  const openAnalysis = () => {
    const chess = new Chess();
    for (const p of line) chess.move(p.san);
    chess.setHeader('Event', `Rookery ${game.rated ? 'rated' : 'casual'} ${game.tc.category}`);
    chess.setHeader('White', game.white?.username ?? 'White');
    chess.setHeader('Black', game.black?.username ?? 'Black');
    if (game.result) chess.setHeader('Result', game.result);
    try {
      sessionStorage.setItem(ANALYSIS_HANDOFF_KEY, chess.pgn());
    } catch {
      /* ignore */
    }
    router.push('/analysis');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <BoardFrame
        top={strip(orientation === 'white' ? 'black' : 'white')}
        bottom={strip(orientation)}
        board={
          <ChessBoard
            fen={current.fen()}
            orientation={orientation}
            turnColor={turn}
            movableColor={myTurn ? you : undefined}
            dests={dests}
            lastMove={last ? [last.from, last.to] : undefined}
            check={current.inCheck()}
            onMove={onMove}
            label={`Live game, ${turn} to move`}
          />
        }
        overlay={
          <>
            {promo && (
              <PromotionPicker
                color={you}
                onPick={(p) => {
                  send(promo[0], promo[1], p);
                  setPromo(null);
                }}
                onCancel={() => setPromo(null)}
              />
            )}
            {over && !hideResult && <ResultCard game={game} onClose={() => setHideResult(true)} live={live} onAnalyse={openAnalysis} returnIn={returnIn} />}
          </>
        }
      />

      <GamePanel
        title={`${game.rated ? 'Rated' : 'Casual'} ${CATEGORY_LABEL[game.tc.category as keyof typeof CATEGORY_LABEL]?.toLowerCase() ?? ''}`}
        icon={<Swords className="size-5" />}
        action={
          <div className="flex items-center gap-2">
            <span className="tabular rounded-full bg-surface-3 px-2.5 py-1 text-xs font-semibold text-fg-muted">{tcLabel(game.tc.id)}</span>
            <ConnectionPill status={live.status} />
          </div>
        }
        footer={
          <div className="space-y-2">
            <MoveNav cursor={cursor} length={line.length} onGo={goTo} />
            {active ? (
              <div className="grid grid-cols-3 gap-2">
                {game.moves.length < 2 ? (
                  <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={live.abort}>
                    Abort
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Handshake className="size-4" />}
                    disabled={game.drawOffer?.by === you}
                    onClick={() => live.draw(game.drawOffer?.by === opp ? 'accept' : 'offer')}
                  >
                    {game.drawOffer?.by === you ? 'Offered' : 'Draw'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" icon={<Flag className="size-4" />} onClick={() => (prefs.confirmResign ? setConfirmResign(true) : live.resign())}>
                  Resign
                </Button>
                <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => setFlipped((f) => !f)}>
                  Flip
                </Button>
              </div>
            ) : (
              <AfterGameActions game={game} live={live} you={you} onAnalyse={openAnalysis} />
            )}
          </div>
        }
      >
        <StatusBanner game={game} live={live} you={you} turn={turn} serverNow={serverNow} />
        <MoveList
          sans={line.map((p) => p.san)}
          times={game.moveTimes}
          thinkingMs={active && game.turnStartedAt != null && live.moves.length === game.moves.length ? Math.max(0, serverNow - game.turnStartedAt) : null}
          cursor={cursor}
          onSelect={goTo}
          className="flex-1"
          empty={active ? `${turn === you ? 'Your move' : 'Waiting for your opponent’s first move'}.` : 'No moves were played.'} />
        <GameChat
          lines={live.chat.lines}
          enabled={live.chat.enabled}
          you={you}
          names={{ white: game.white?.username ?? 'White', black: game.black?.username ?? 'Black' }}
          onSend={live.chat.send}
        />
        {(opp === 'white' ? game.white : game.black) && (
          <div className="flex justify-end border-t border-line px-3 py-1.5">
            <ReportButton targetId={(opp === 'white' ? game.white : game.black)!.id} username={(opp === 'white' ? game.white : game.black)!.username} gameId={game.status === 'ended' ? game.id : null} />
          </div>
        )}
      </GamePanel>

      <Modal
        open={confirmResign}
        onClose={() => setConfirmResign(false)}
        title="Resign this game?"
        description="Your opponent will be awarded the win."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmResign(false)}>
              Keep playing
            </Button>
            <Button
              variant="danger"
              icon={<Flag className="size-4" />}
              onClick={() => {
                setConfirmResign(false);
                live.resign();
              }}
            >
              Resign
            </Button>
          </>
        }
      />
    </div>
  );
}

function StatusBanner({ game, live, you, turn, serverNow }: { game: GameView; live: OnlineGame; you: Side; turn: Side; serverNow: number }) {
  const opp: Side = you === 'white' ? 'black' : 'white';
  const oppName = (opp === 'white' ? game.white : game.black)?.username ?? 'Your opponent';
  const secs = (deadline: number) => Math.max(0, Math.ceil((deadline - serverNow) / 1000));
  const rows: React.ReactNode[] = [];

  if (live.error) rows.push(<Banner key="err" tone="error">{live.error}</Banner>);
  if (live.status === 'reconnecting') rows.push(<Banner key="net" tone="warn">Connection lost. Reconnecting… your clock keeps running.</Banner>);
  if (game.status === 'active') {
    if (game.away && game.away.color === opp)
      rows.push(
        <Banner key="away" tone="warn">
          {oppName} left the game. If they don’t return within <b className="tabular">{secs(game.away.deadline)}s</b>, you win.
        </Banner>,
      );
    if (!game.connected[opp] && !game.away && game.moves.length < 2) rows.push(<Banner key="wait" tone="info">Waiting for {oppName} to connect…</Banner>);
    if (game.firstMoveDeadline !== null)
      rows.push(
        <Banner key="first" tone="info">
          {turn === you ? 'Make your first move' : `${oppName} has to make their first move`} within <b className="tabular">{secs(game.firstMoveDeadline)}s</b> or the game is aborted.
        </Banner>,
      );
    if (game.drawOffer?.by === opp)
      rows.push(
        <Banner key="draw" tone="gold">
          <span className="flex-1">{oppName} offers a draw.</span>
          <span className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => live.draw('decline')}>
              Decline
            </Button>
            <Button size="sm" variant="primary" onClick={() => live.draw('accept')}>
              Accept
            </Button>
          </span>
        </Banner>,
      );
    if (game.drawOffer?.by === you) rows.push(<Banner key="mydraw" tone="info">Draw offered. Waiting for {oppName}.</Banner>);
    if (!rows.length) rows.push(<Banner key="turn" tone={turn === you ? 'gold' : 'info'}>{turn === you ? 'Your turn.' : `${oppName} is thinking…`}</Banner>);
  }
  return <div className="space-y-2 border-b border-line p-3 empty:hidden">{rows}</div>;
}

function Banner({ tone, children }: { tone: 'info' | 'warn' | 'error' | 'gold'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-[10px] px-3 py-2 text-sm',
        tone === 'info' && 'bg-surface-2 text-fg-muted',
        tone === 'warn' && 'bg-[rgb(214_158_46/0.14)] text-fg',
        tone === 'error' && 'bg-loss/15 text-fg',
        tone === 'gold' && 'bg-gold-500/12 text-fg',
      )}
    >
      {children}
    </div>
  );
}

function outcomeFor(game: GameView, you: Side): { headline: string; detail: string } {
  if (game.status === 'aborted') return { headline: 'Game aborted', detail: 'No result is recorded.' };
  const detail = REASON[game.termination ?? ''] ?? '';
  if (game.result === '1/2-1/2') return { headline: 'Draw', detail };
  const won = (game.result === '1-0') === (you === 'white');
  return { headline: won ? 'You won' : 'You lost', detail };
}

function ResultCard({ game, live, onClose, onAnalyse, returnIn }: { game: GameView; live: OnlineGame; onClose: () => void; onAnalyse: () => void; returnIn: number | null }) {
  const you: Side = game.you === 'black' ? 'black' : 'white';
  const o = outcomeFor(game, you);
  const change = game.ratingChange?.[you];
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="pointer-events-auto relative w-[min(21rem,88%)] rounded-[18px] border border-line-strong bg-surface-1/95 p-6 text-center shadow-[var(--shadow-pop)] backdrop-blur animate-pop-in" role="dialog" aria-label="Game over">
        <button type="button" aria-label="Close" className="absolute top-3 right-3 text-fg-subtle hover:text-fg" onClick={onClose}>
          <X className="size-4" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">{game.result ?? 'Game over'}</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">{o.headline}</p>
        <p className="mt-1 text-sm text-fg-muted">{o.detail}</p>
        {game.status === 'ended' && (
          <p className="mt-3 text-sm">
            {!game.recorded ? (
              <span className="text-fg-subtle">Saving the result…</span>
            ) : game.rated && change !== undefined ? (
              <span className={cn('tabular font-semibold', change > 0 ? 'text-win' : change < 0 ? 'text-loss' : 'text-fg-muted')}>
                Rating {change > 0 ? '+' : ''}
                {change}
              </span>
            ) : (
              <span className="text-fg-subtle">Saved to your history.</span>
            )}
          </p>
        )}
        <div className="mt-5 grid gap-2">
          <AfterGameActions game={game} live={live} you={you} onAnalyse={onAnalyse} stacked />
        </div>
        {returnIn !== null && returnIn > 0 && <p className="mt-3 text-xs text-fg-subtle">Back to the tournament in {returnIn}s…</p>}
      </div>
    </div>
  );
}

function AfterGameActions({ game, live, you, onAnalyse, stacked }: { game: GameView; live: OnlineGame; you: Side; onAnalyse: () => void; stacked?: boolean }) {
  const opp: Side = you === 'white' ? 'black' : 'white';
  if (game.tournamentId) {
    return (
      <div className={cn(stacked ? 'grid gap-2' : 'grid grid-cols-2 gap-2')}>
        <ButtonLink href={`/tournament?id=${game.tournamentId}`} size={stacked ? 'md' : 'sm'} variant="primary">
          Back to the tournament
        </ButtonLink>
        {game.recorded && (
          <ButtonLink href={`/review?id=${game.id}`} size={stacked ? 'md' : 'sm'} variant={stacked ? 'ghost' : 'secondary'} icon={<Microscope className="size-4" />}>
            Review
          </ButtonLink>
        )}
      </div>
    );
  }
  const r = game.rematch;
  const rematchButton =
    game.status !== 'ended' ? null : r.offeredBy === opp ? (
      <div className={cn('grid gap-2', stacked ? 'grid-cols-2' : 'col-span-3 grid-cols-2')}>
        <Button size={stacked ? 'md' : 'sm'} variant="ghost" onClick={() => live.rematch('decline')}>
          Decline
        </Button>
        <Button size={stacked ? 'md' : 'sm'} variant="primary" onClick={() => live.rematch('accept')}>
          Accept rematch
        </Button>
      </div>
    ) : (
      <Button size={stacked ? 'md' : 'sm'} variant="primary" disabled={r.offeredBy === you || r.declined} onClick={() => live.rematch('offer')} className={stacked ? undefined : 'col-span-3'}>
        {r.declined ? 'Rematch declined' : r.offeredBy === you ? 'Rematch offered…' : 'Rematch'}
      </Button>
    );
  return (
    <div className={cn(stacked ? 'grid gap-2' : 'grid grid-cols-3 gap-2')}>
      {rematchButton}
      <ButtonLink href={`/play?tc=${encodeURIComponent(game.tc.id)}&seek=1&rated=${game.rated ? 1 : 0}`} size={stacked ? 'md' : 'sm'} variant="secondary" className={stacked ? undefined : 'col-span-2'}>
        New opponent
      </ButtonLink>
      {game.recorded ? (
        <ButtonLink href={`/review?id=${game.id}`} size={stacked ? 'md' : 'sm'} variant={stacked ? 'ghost' : 'secondary'} icon={<Microscope className="size-4" />}>
          {stacked ? 'Review with Stockfish' : 'Review'}
        </ButtonLink>
      ) : (
        <Button size={stacked ? 'md' : 'sm'} variant={stacked ? 'ghost' : 'secondary'} icon={<Microscope className="size-4" />} onClick={onAnalyse}>
          {stacked ? 'Open in analysis' : 'Analyse'}
        </Button>
      )}
    </div>
  );
}

function ConnectionPill({ status, className }: { status: OnlineGame['status']; className?: string }) {
  const ok = status === 'online';
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', ok ? 'bg-win/15 text-win' : 'bg-surface-3 text-fg-muted', className)}
      title={ok ? 'Connected to the game server' : 'Not connected'}
    >
      {ok ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {ok ? 'Live' : status === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
    </span>
  );
}

function ratingText(p: PlayerInfo, change: number | undefined): string {
  const base = `${p.rating}${p.provisional ? '?' : ''}`;
  if (change === undefined) return base;
  return `${base} ${change >= 0 ? '+' : '−'}${Math.abs(change)}`;
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <EmptyState
      title={title}
      action={
        <ButtonLink href="/play" variant="primary">
          Back to Play
        </ButtonLink>
      }
    >
      {text}
    </EmptyState>
  );
}

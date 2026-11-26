'use client';

import { getTimeControl, resignOutcome, timeoutOutcome, type Outcome } from '@rookery/chess-core';
import { Chess } from 'chess.js';
import { ArrowRight, Bot, FlipVertical2, Flag, Handshake, Microscope, RotateCcw, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { MoveList, MoveNav } from '@/components/board/MoveList';
import { PlayerStrip } from '@/components/board/PlayerStrip';
import { PromotionPicker, type PromotionPiece } from '@/components/board/PromotionPicker';
import { ComingSoon } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { material } from '@/lib/material';
import { usePreferences } from '@/lib/preferences';
import type { Side } from '@/lib/types';
import { useChessClock } from '@/lib/useChessClock';
import { useLocalGame } from '@/lib/useLocalGame';
import { useMoveTimes } from '@/lib/useMoveTimes';
import { OnlinePlay } from '@/components/online/OnlinePlay';
import { TimeControlPicker } from './TimeControlPicker';

import { ANALYSIS_HANDOFF_KEY } from '@/lib/gameUtils';
export { ANALYSIS_HANDOFF_KEY };

const REASON: Record<string, string> = {
  checkmate: 'by checkmate',
  stalemate: 'by stalemate',
  insufficient: 'by insufficient material',
  repetition: 'by threefold repetition',
  'fifty-move': 'by the fifty-move rule',
  resign: 'by resignation',
  timeout: 'on time',
  agreement: 'by agreement',
};

export function describeOutcome(o: Outcome): { headline: string; detail: string } {
  if (!o.winner) return { headline: 'Draw', detail: REASON[o.termination] ?? o.termination };
  return { headline: `${o.winner === 'white' ? 'White' : 'Black'} wins`, detail: REASON[o.termination] ?? o.termination };
}

export function PlayClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { prefs } = usePreferences();
  const [tcId, setTcId] = useState(() => (getTimeControl(params.get('tc') ?? '') ? params.get('tc')! : '10+0'));
  const [useClock, setUseClock] = useState(true);
  const [phase, setPhase] = useState<'setup' | 'playing'>(params.get('mode') === 'local' ? 'playing' : 'setup');
  const [orientation, setOrientation] = useState<Side>('white');
  const [autoFlip, setAutoFlip] = useState(false);
  const [ended, setEnded] = useState<Outcome | null>(null);
  const [pendingPromo, setPendingPromo] = useState<[string, string] | null>(null);
  const [confirm, setConfirm] = useState<'resign' | 'new' | null>(null);

  const game = useLocalGame();
  const tc = getTimeControl(tcId)!;
  const clock = useChessClock(tc.initialMs, tc.incrementMs, (flagged) => {
    setEnded(timeoutOutcome(new Chess(game.view.fen), flagged));
  });

  const outcome = ended ?? (game.atEnd ? game.view.outcome : null);
  const playing = phase === 'playing';
  const over = playing && outcome !== null;
  const [gameKey, setGameKey] = useState(0);
  const moveTimes = useMoveTimes(game.line.length, playing && !over, gameKey);

  // Board-based endings stop the clocks.
  useEffect(() => {
    if (game.view.outcome && game.atEnd && clock.running) clock.halt();
  }, [game.view.outcome, game.atEnd, clock]);

  const start = useCallback(() => {
    setGameKey((k) => k + 1);
    game.reset();
    clock.resetClock(tc.initialMs, tc.incrementMs);
    setEnded(null);
    setOrientation('white');
    setPhase('playing');
    setConfirm(null);
  }, [game, clock, tc.initialMs, tc.incrementMs]);

  // Arriving with ?mode=local starts a fresh local game once.
  useEffect(() => {
    if (params.get('mode') === 'local') start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = (from: string, to: string, promo?: PromotionPiece) => {
    const mover = game.view.turn;
    if (game.play(from, to, promo)) {
      if (useClock) clock.moved(mover);
      if (autoFlip) setOrientation(mover === 'white' ? 'black' : 'white');
    }
  };

  const onMove = (from: string, to: string) => {
    if (game.isPromotion(from, to) && !prefs.autoQueen) setPendingPromo([from, to]);
    else commit(from, to, game.isPromotion(from, to) ? 'q' : undefined);
  };

  const finish = (o: Outcome) => {
    clock.halt();
    setEnded(o);
    setConfirm(null);
  };

  const openInAnalysis = () => {
    try {
      sessionStorage.setItem(ANALYSIS_HANDOFF_KEY, game.pgn);
    } catch {
      /* ignore */
    }
    router.push('/analysis');
  };

  const mat = material(game.view.fen);
  const adv = (side: Side) => {
    const caps = side === 'white' ? mat.capturedByWhite : mat.capturedByBlack;
    const lead = side === 'white' ? mat.balance : -mat.balance;
    return caps || lead > 0 ? (
      <span className="tracking-[-0.12em]">
        {caps}
        {lead > 0 && <span className="ml-2 tracking-normal">+{lead}</span>}
      </span>
    ) : undefined;
  };

  const strip = (side: Side) => (
    <PlayerStrip
      name={playing ? (side === 'white' ? 'White' : 'Black') : side === orientation ? 'You' : 'Opponent'}
      clockMs={useClock ? (side === 'white' ? clock.whiteMs : clock.blackMs) : undefined}
      clockActive={playing && !over && clock.running === side}
      material={playing ? adv(side) : undefined}
      muted={!playing}
    />
  );
  const topSide: Side = orientation === 'white' ? 'black' : 'white';

  const movable = playing && !over && game.atEnd ? 'both' : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <BoardFrame
        top={strip(topSide)}
        bottom={strip(orientation)}
        board={
          <ChessBoard
            fen={game.view.fen}
            orientation={orientation}
            turnColor={game.view.turn}
            movableColor={movable}
            dests={movable ? game.view.dests : undefined}
            lastMove={game.view.lastMove}
            check={game.view.check}
            onMove={onMove}
            label={playing ? `Pass and play board, ${game.view.turn} to move` : 'Board'}
          />
        }
        overlay={
          <>
            {pendingPromo && (
              <PromotionPicker
                color={game.view.turn}
                onPick={(p) => {
                  commit(pendingPromo[0], pendingPromo[1], p);
                  setPendingPromo(null);
                }}
                onCancel={() => setPendingPromo(null)}
              />
            )}
            {over && outcome && <ResultOverlay outcome={outcome} onNew={start} onAnalyse={openInAnalysis} />}
          </>
        }
      />

      {!playing ? (
        <GamePanel title="Play chess" icon={<Swords className="size-5" />}>
          <div className="space-y-6 p-5">
            <section>
              <h2 className="mb-3 text-sm font-semibold text-fg">Time control</h2>
              <TimeControlPicker value={tcId} onChange={setTcId} />
            </section>
            <OnlinePlay tcId={tcId} />
            <section>
              <h2 className="mb-3 text-sm font-semibold text-fg">Other ways to play</h2>
              <div className="space-y-2">
                <ModeRow icon={<Bot />} title="Play the computer" text="Fifteen opponents, beginner to master." href="/bots" />
                <ModeRow icon={<Swords />} title="Pass and play" text="Two players, one device." onClick={start} />
              </div>
            </section>
            <Switch checked={useClock} onChange={setUseClock} label="Use a clock for pass and play" description={`${tc.label} per side`} />
          </div>
        </GamePanel>
      ) : (
        <GamePanel
          title="Pass and play"
          icon={<Users className="size-5" />}
          action={<span className="tabular rounded-full bg-surface-3 px-2.5 py-1 text-xs font-semibold text-fg-muted">{useClock ? tc.label : 'No clock'}</span>}
          footer={
            <div className="space-y-2">
              <MoveNav cursor={game.state.cursor} length={game.line.length} onGo={game.goTo} />
              <div className="grid grid-cols-4 gap-2">
                <Button size="sm" variant="ghost" icon={<FlipVertical2 className="size-4" />} onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
                  Flip
                </Button>
                <Button size="sm" variant="ghost" icon={<Handshake className="size-4" />} disabled={over || game.line.length < 2} onClick={() => finish({ result: '1/2-1/2', termination: 'agreement', winner: null })}>
                  Draw
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Flag className="size-4" />}
                  disabled={over}
                  onClick={() => (prefs.confirmResign ? setConfirm('resign') : finish(resignOutcome(game.view.turn)))}
                >
                  Resign
                </Button>
                <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => (over || !game.line.length ? start() : setConfirm('new'))}>
                  New
                </Button>
              </div>
            </div>
          }
        >
          {over && outcome && (
            <div className="border-b border-line bg-gold-500/8 px-5 py-4">
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold">{describeOutcome(outcome).headline}</p>
              <p className="text-sm text-fg-muted">{describeOutcome(outcome).detail}</p>
            </div>
          )}
          <MoveList
            sans={game.line.map((p) => p.san)}
            times={moveTimes.times}
            thinkingMs={game.atEnd ? moveTimes.thinkingMs : null}
            cursor={game.state.cursor}
            onSelect={game.goTo}
            className="flex-1"
            empty="White to move. Make the first move on the board."
          />
          <div className="border-t border-line px-5 py-1">
            <Switch checked={autoFlip} onChange={setAutoFlip} label="Flip the board after each move" />
          </div>
        </GamePanel>
      )}

      <Modal
        open={confirm === 'resign'}
        onClose={() => setConfirm(null)}
        title={`Resign as ${game.view.turn === 'white' ? 'White' : 'Black'}?`}
        description="The game ends immediately and your opponent wins."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep playing
            </Button>
            <Button variant="danger" icon={<Flag className="size-4" />} onClick={() => finish(resignOutcome(game.view.turn))}>
              Resign
            </Button>
          </>
        }
      />
      <Modal
        open={confirm === 'new'}
        onClose={() => setConfirm(null)}
        title="Start a new game?"
        description="The current game will be discarded."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={start}>
              New game
            </Button>
          </>
        }
      />
    </div>
  );
}

function ModeRow({
  icon,
  title,
  text,
  href,
  onClick,
  stage,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
  onClick?: () => void;
  stage?: number;
  highlight?: boolean;
}) {
  const disabled = stage !== undefined;
  const inner = (
    <>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-[10px] [&>svg]:size-5', highlight ? 'bg-gold-500/15 text-gold-300' : 'bg-surface-3 text-fg-muted')}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-fg">{title}</span>
        <span className="block text-xs text-fg-subtle">{text}</span>
      </span>
      {disabled ? <ComingSoon stage={stage} /> : <ArrowRight className="size-4 text-fg-subtle" aria-hidden />}
    </>
  );
  const cls = cn(
    'flex w-full items-center gap-3 rounded-[12px] border p-3 transition-colors duration-150',
    disabled ? 'cursor-not-allowed border-line opacity-60' : 'border-line hover:border-gold-500/40 hover:bg-surface-2',
    highlight && 'border-gold-500/30 bg-gold-500/[0.05]',
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-disabled={disabled}>
      {inner}
    </button>
  );
}

function ResultOverlay({ outcome, onNew, onAnalyse }: { outcome: Outcome; onNew: () => void; onAnalyse: () => void }) {
  const d = describeOutcome(outcome);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="pointer-events-auto w-[min(20rem,85%)] rounded-[18px] border border-line-strong bg-surface-1/95 p-6 text-center shadow-[var(--shadow-pop)] backdrop-blur animate-pop-in">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">Game over</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">{d.headline}</p>
        <p className="mt-1 text-sm text-fg-muted">{d.detail}</p>
        <div className="mt-5 grid gap-2">
          <Button variant="primary" onClick={onNew}>
            New game
          </Button>
          <Button variant="secondary" icon={<Microscope className="size-4" />} onClick={onAnalyse}>
            Open in analysis
          </Button>
        </div>
      </div>
    </div>
  );
}

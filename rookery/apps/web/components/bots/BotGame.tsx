'use client';

import { displayRating, getOpening } from '@rookery/ai';
import type { Outcome } from '@rookery/chess-core';
import { ArrowLeft, Flag, FlipVertical2, Handshake, ListTree, MessageSquare, Microscope, RefreshCw, RotateCcw, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { MoveList, MoveNav } from '@/components/board/MoveList';
import { PlayerStrip } from '@/components/board/PlayerStrip';
import { PromotionPicker } from '@/components/board/PromotionPicker';
import { ANALYSIS_HANDOFF_KEY, describeOutcome } from '@/components/play/PlayClient';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ErrorState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { material } from '@/lib/material';
import { usePreferences } from '@/lib/preferences';
import type { Side } from '@/lib/types';
import { useBotGame, type BotGameSettings } from '@/lib/useBotGame';
import { PersonaPortrait, SpeechBubble, ThinkingIndicator } from './BotBits';

export function BotGame({ settings, onRematch, onExit }: { settings: BotGameSettings; onRematch: () => void; onExit: () => void }) {
  const router = useRouter();
  const { prefs } = usePreferences();
  const g = useBotGame(settings);
  const { persona, playerColor } = settings;
  const [orientation, setOrientation] = useState<Side>(playerColor);
  const [promo, setPromo] = useState<[string, string] | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [tab, setTab] = useState<'moves' | 'chat'>('moves');

  const view = g.game.view;
  const lastBotLine = [...g.chat].reverse().find((c) => c.from === 'bot')?.text;
  const mat = material(view.fen);

  const onMove = (from: string, to: string) => {
    if (g.game.isPromotion(from, to) && !prefs.autoQueen) setPromo([from, to]);
    else g.playerMove(from, to, g.game.isPromotion(from, to) ? 'q' : undefined);
  };

  const analyse = () => {
    try {
      sessionStorage.setItem(ANALYSIS_HANDOFF_KEY, g.game.pgn);
    } catch {
      /* ignore */
    }
    router.push('/analysis');
  };

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

  const botStrip = (
    <PlayerStrip
      name={persona.name}
      rating={displayRating(persona)}
      country={persona.country}
      avatar={<PersonaPortrait persona={persona} size="sm" className="size-8" />}
      material={
        <span className="flex items-center gap-2">
          {adv(g.botColor)}
          <ThinkingIndicator active={g.thinking} />
        </span>
      }
      clockMs={g.clock ? (g.botColor === 'white' ? g.clock.whiteMs : g.clock.blackMs) : undefined}
      clockActive={!g.over && g.clock?.running === g.botColor}
    />
  );
  const youStrip = (
    <PlayerStrip
      name="You"
      material={adv(playerColor)}
      clockMs={g.clock ? (playerColor === 'white' ? g.clock.whiteMs : g.clock.blackMs) : undefined}
      clockActive={!g.over && g.clock?.running === playerColor}
    />
  );
  const botOnTop = orientation === playerColor;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <BoardFrame
        top={botOnTop ? botStrip : youStrip}
        bottom={botOnTop ? youStrip : botStrip}
        board={
          <ChessBoard
            fen={view.fen}
            orientation={orientation}
            turnColor={view.turn}
            movableColor={g.canMove ? playerColor : undefined}
            dests={g.canMove ? view.dests : undefined}
            lastMove={view.lastMove}
            check={view.check}
            onMove={onMove}
            label={`Game against ${persona.name}. ${g.thinking ? `${persona.name} is thinking.` : g.canMove ? 'Your move.' : ''}`}
          />
        }
        overlay={
          <>
            {promo && (
              <PromotionPicker
                color={playerColor}
                onPick={(p) => {
                  g.playerMove(promo[0], promo[1], p);
                  setPromo(null);
                }}
                onCancel={() => setPromo(null)}
              />
            )}
            {g.outcome && <ResultCard outcome={g.outcome} playerColor={playerColor} personaName={persona.name} onRematch={onRematch} onExit={onExit} onAnalyse={analyse} />}
          </>
        }
      />

      <GamePanel
        title={`vs ${persona.name}`}
        icon={<PersonaPortrait persona={persona} size="sm" className="size-7" />}
        action={
          <button type="button" onClick={onExit} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-fg-subtle hover:bg-surface-2 hover:text-fg">
            <ArrowLeft className="size-3.5" /> Opponents
          </button>
        }
        footer={
          <div className="space-y-2">
            <MoveNav cursor={g.game.state.cursor} length={g.game.line.length} onGo={g.game.goTo} />
            <div className="grid grid-cols-4 gap-2">
              <Button size="sm" variant="ghost" icon={<Undo2 className="size-4" />} disabled={!g.canTakeback} onClick={g.takeback} title={settings.takebacks ? 'Take back your last move' : 'Takebacks are off for this game'}>
                Undo
              </Button>
              <Button size="sm" variant="ghost" icon={<Handshake className="size-4" />} disabled={g.over || g.game.line.length < 2} onClick={g.offerDraw}>
                Draw
              </Button>
              <Button size="sm" variant="ghost" icon={<Flag className="size-4" />} disabled={g.over} onClick={() => (prefs.confirmResign ? setConfirmResign(true) : g.resign())}>
                Resign
              </Button>
              <Button size="sm" variant="ghost" icon={<FlipVertical2 className="size-4" />} onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
                Flip
              </Button>
            </div>
          </div>
        }
      >
        <div className="border-b border-line p-4">
          {lastBotLine ? <SpeechBubble text={lastBotLine} /> : <p className="text-sm text-fg-subtle">{persona.tagline}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
            <span>You play {playerColor}</span>
            <span>·</span>
            <span>{settings.timeControl === 'none' ? 'No clock' : settings.timeControl}</span>
            {settings.openingId && (
              <>
                <span>·</span>
                <span>{getOpening(settings.openingId)?.name}</span>
              </>
            )}
            {g.lastSource === 'book' && <span className="text-gold-300">· book move</span>}
          </p>
        </div>

        {g.engineError ? (
          <ErrorState
            title="The engine stopped responding"
            action={
              <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={g.retryEngine}>
                Restart engine
              </Button>
            }
          >
            {g.engineError} Your browser may be low on memory, or blocking Web Workers.
          </ErrorState>
        ) : (
          <Tabs
            label="Game panels"
            value={tab}
            onChange={setTab}
            listClassName="px-3"
            className="flex min-h-0 flex-1 flex-col"
            panelClassName="flex min-h-0 flex-1 flex-col"
            items={[
              {
                value: 'moves',
                label: 'Moves',
                icon: <ListTree className="size-4" />,
                content: (
                  <MoveList
                    sans={g.game.line.map((p) => p.san)}
                    cursor={g.game.state.cursor}
                    onSelect={g.game.goTo}
                    className="min-h-40 flex-1"
                    empty={g.turn === playerColor ? 'Your move.' : `${persona.name} moves first.`}
                  />
                ),
              },
              {
                value: 'chat',
                label: 'Chat',
                icon: <MessageSquare className="size-4" />,
                count: g.chat.length || undefined,
                content: (
                  <ul className="rk-scroll min-h-40 flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
                    {!prefs.botChat && <li className="text-xs text-fg-subtle">Opponent chat is turned off in Settings.</li>}
                    {g.chat.map((c) => (
                      <li key={c.id} className={cn('text-sm', c.from === 'system' ? 'text-xs text-fg-subtle italic' : 'text-fg')}>
                        {c.from === 'bot' && <span className="mr-1.5 font-semibold text-gold-300">{persona.name}:</span>}
                        {c.text}
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
        )}
      </GamePanel>

      <Modal
        open={confirmResign}
        onClose={() => setConfirmResign(false)}
        title="Resign this game?"
        description={`${persona.name} will be awarded the win.`}
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
                g.resign();
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

function ResultCard({
  outcome,
  playerColor,
  personaName,
  onRematch,
  onExit,
  onAnalyse,
}: {
  outcome: Outcome;
  playerColor: Side;
  personaName: string;
  onRematch: () => void;
  onExit: () => void;
  onAnalyse: () => void;
}) {
  const d = describeOutcome(outcome);
  const you = !outcome.winner ? 'draw' : outcome.winner === playerColor ? 'win' : 'loss';
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div data-testid="game-result" className="pointer-events-auto w-[min(21rem,88%)] rounded-[18px] border border-line-strong bg-surface-1/95 p-6 text-center shadow-[var(--shadow-pop)] backdrop-blur animate-pop-in">
        <p className={cn('text-xs font-semibold uppercase tracking-[0.16em]', you === 'win' ? 'text-win' : you === 'loss' ? 'text-loss' : 'text-gold-400')}>
          {you === 'win' ? 'You won' : you === 'loss' ? `${personaName} won` : 'Draw'}
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">{d.headline}</p>
        <p className="mt-1 text-sm text-fg-muted">{d.detail}</p>
        <div className="mt-5 grid gap-2">
          <Button variant="primary" icon={<RotateCcw className="size-4" />} onClick={onRematch}>
            Rematch
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onExit}>
              New opponent
            </Button>
            <Button variant="secondary" icon={<Microscope className="size-4" />} onClick={onAnalyse}>
              Analyse
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

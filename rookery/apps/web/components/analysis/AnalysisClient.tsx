'use client';

import { START_FEN } from '@rookery/chess-core';
import { Check, ClipboardCopy, Cpu, FileInput, FlipVertical2, Keyboard, ListTree, Microscope, MoreHorizontal, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { GamePanel } from '@/components/board/GamePanel';
import { MoveList, MoveNav } from '@/components/board/MoveList';
import { PromotionPicker, type PromotionPiece } from '@/components/board/PromotionPicker';
import { ANALYSIS_HANDOFF_KEY, describeOutcome } from '@/components/play/PlayClient';
import { ComingSoon } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Menu } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { usePreferences } from '@/lib/preferences';
import type { Side } from '@/lib/types';
import { useLocalGame } from '@/lib/useLocalGame';

export function AnalysisClient() {
  const game = useLocalGame();
  const { prefs } = usePreferences();
  const [orientation, setOrientation] = useState<Side>('white');
  const [tab, setTab] = useState<'moves' | 'import' | 'position'>('moves');
  const [pendingPromo, setPendingPromo] = useState<[string, string] | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // A finished pass-and-play game can be handed over from the Play page.
  useEffect(() => {
    try {
      const pgn = sessionStorage.getItem(ANALYSIS_HANDOFF_KEY);
      if (pgn) {
        sessionStorage.removeItem(ANALYSIS_HANDOFF_KEY);
        game.loadPgn(pgn);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard: ←/→ step, Home/End jump, F flips.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [contenteditable], dialog')) return;
      if (e.key === 'ArrowLeft') game.goTo(game.state.cursor - 1);
      else if (e.key === 'ArrowRight') game.goTo(game.state.cursor + 1);
      else if (e.key === 'Home') game.goTo(0);
      else if (e.key === 'End') game.goTo(game.line.length);
      else if (e.key.toLowerCase() === 'f') setOrientation((o) => (o === 'white' ? 'black' : 'white'));
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game]);

  const onMove = (from: string, to: string) => {
    if (game.isPromotion(from, to) && !prefs.autoQueen) setPendingPromo([from, to]);
    else game.play(from, to, game.isPromotion(from, to) ? 'q' : undefined);
  };

  const copy = async (what: 'FEN' | 'PGN') => {
    try {
      await navigator.clipboard.writeText(what === 'FEN' ? game.view.fen : game.pgn);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setTab('position');
    }
  };

  const outcome = game.view.outcome;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <BoardFrame
        evalBar={<EvalBar cp={null} orientation={orientation} />}
        board={
          <ChessBoard
            fen={game.view.fen}
            orientation={orientation}
            turnColor={game.view.turn}
            movableColor={outcome ? undefined : 'both'}
            dests={game.view.dests}
            lastMove={game.view.lastMove}
            check={game.view.check}
            onMove={onMove}
            label={`Analysis board, ${game.view.turn} to move`}
          />
        }
        overlay={
          pendingPromo && (
            <PromotionPicker
              color={game.view.turn}
              onPick={(p: PromotionPiece) => {
                game.play(pendingPromo[0], pendingPromo[1], p);
                setPendingPromo(null);
              }}
              onCancel={() => setPendingPromo(null)}
            />
          )
        }
        bottom={
          <p className="flex h-8 items-center gap-2 px-1 text-sm text-fg-muted" aria-live="polite">
            {outcome ? (
              <span className="font-semibold text-gold-300">
                {describeOutcome(outcome).headline} {describeOutcome(outcome).detail}
              </span>
            ) : (
              <>
                <span className={game.view.turn === 'white' ? 'size-3 rounded-full bg-[#ece6da]' : 'size-3 rounded-full bg-[#2b2925] ring-1 ring-white/20'} />
                {game.view.turn === 'white' ? 'White' : 'Black'} to move
                {game.view.check && <span className="text-loss">· check</span>}
              </>
            )}
          </p>
        }
      />

      <GamePanel
        title="Analysis"
        icon={<Microscope className="size-5" />}
        action={
          <Menu
            label="Analysis options"
            items={[
              { label: copied === 'FEN' ? 'Copied!' : 'Copy FEN', icon: copied === 'FEN' ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />, onSelect: () => copy('FEN') },
              { label: copied === 'PGN' ? 'Copied!' : 'Copy PGN', icon: copied === 'PGN' ? <Check className="size-4" /> : <ClipboardCopy className="size-4" />, onSelect: () => copy('PGN') },
              { label: 'Import a game', icon: <FileInput className="size-4" />, onSelect: () => setTab('import') },
              { label: 'Keyboard shortcuts', icon: <Keyboard className="size-4" />, onSelect: () => setShortcuts(true), separatorBefore: true },
              { label: 'Reset board', icon: <RotateCcw className="size-4" />, onSelect: () => game.reset() },
            ]}
            trigger={() => (
              <span className="grid size-9 place-items-center rounded-[var(--radius-control)] text-fg-muted hover:bg-surface-2 hover:text-fg">
                <MoreHorizontal className="size-5" />
              </span>
            )}
          />
        }
        footer={
          <div className="flex gap-2">
            <MoveNav cursor={game.state.cursor} length={game.line.length} onGo={game.goTo} className="flex-1" />
            <IconButton aria-label="Flip board" variant="secondary" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
              <FlipVertical2 className="size-4" />
            </IconButton>
          </div>
        }
      >
        <div className="flex items-center gap-3 border-b border-line bg-surface-2/50 px-5 py-3">
          <Cpu className="size-4 text-fg-subtle" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg-muted">Engine analysis</p>
            <p className="text-xs text-fg-subtle">Stockfish evaluation and best lines.</p>
          </div>
          <ComingSoon stage={3} />
        </div>
        <Tabs
          label="Analysis panels"
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
                  sans={game.line.map((p) => p.san)}
                  cursor={game.state.cursor}
                  onSelect={game.goTo}
                  startsWithBlack={game.state.initialFen.split(' ')[1] === 'b'}
                  firstMoveNumber={Number(game.state.initialFen.split(' ')[5] ?? 1)}
                  empty="Move pieces on the board to explore, or import a game."
                  className="min-h-40 flex-1"
                />
              ),
            },
            { value: 'import', label: 'Import', icon: <FileInput className="size-4" />, content: <ImportPanel game={game} onDone={() => setTab('moves')} /> },
            {
              value: 'position',
              label: 'Position',
              content: (
                <div className="space-y-4 p-5">
                  <ReadOnlyField label="FEN" value={game.view.fen} />
                  <ReadOnlyField label="PGN" value={game.pgn || '(no moves yet)'} multiline />
                </div>
              ),
            },
          ]}
        />
      </GamePanel>

      <Modal open={shortcuts} onClose={() => setShortcuts(false)} title="Keyboard shortcuts" size="sm">
        <dl className="space-y-2 text-sm">
          {[
            ['← / →', 'Previous / next move'],
            ['Home / End', 'First / last move'],
            ['F', 'Flip the board'],
            ['Q R B N', 'Pick a promotion piece'],
            ['Esc', 'Cancel promotion, close dialogs'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <dt>
                <kbd className="rounded-md border border-line-strong bg-surface-3 px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs">{k}</kbd>
              </dt>
              <dd className="text-fg-muted">{v}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    </div>
  );
}

function ImportPanel({ game, onDone }: { game: ReturnType<typeof useLocalGame>; onDone: () => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    const input = text.trim();
    if (!input) return setError('Paste a PGN or a FEN first.');
    // A FEN has exactly 8 ranks separated by slashes in its first field.
    const looksLikeFen = /^([^\s/]+\/){7}[^\s/]+\s+[wb]\b/.test(input);
    const err = looksLikeFen ? game.loadFen(input) : game.loadPgn(input);
    setError(err);
    if (!err) {
      setText('');
      onDone();
    }
  };

  return (
    <div className="space-y-3 p-5">
      <label htmlFor="import" className="text-sm font-semibold text-fg">
        Paste a PGN or FEN
      </label>
      <textarea
        id="import"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        rows={8}
        spellCheck={false}
        placeholder={'1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 …\n\nor\n\n' + START_FEN}
        className="block w-full resize-y rounded-[var(--radius-control)] border border-line bg-surface-0/60 p-3 font-[family-name:var(--font-mono)] text-[13px] text-fg placeholder:text-fg-subtle/70 focus:border-gold-500/50 focus:outline-none"
        aria-invalid={!!error}
        aria-describedby={error ? 'import-error' : undefined}
      />
      {error && (
        <p id="import-error" role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="primary" onClick={load} icon={<FileInput className="size-4" />}>
          Load
        </Button>
        <Button variant="ghost" onClick={() => game.reset()}>
          Start position
        </Button>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">{label}</p>
      {multiline ? (
        <textarea readOnly value={value} rows={6} className="block w-full resize-y rounded-[var(--radius-control)] border border-line bg-surface-0/60 p-3 font-[family-name:var(--font-mono)] text-[13px] text-fg-muted" onFocus={(e) => e.currentTarget.select()} />
      ) : (
        <input readOnly value={value} className="block h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface-0/60 px-3 font-[family-name:var(--font-mono)] text-[13px] text-fg-muted" onFocus={(e) => e.currentTarget.select()} />
      )}
    </div>
  );
}

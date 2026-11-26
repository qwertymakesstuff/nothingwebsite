'use client';

// Opening explorer over games actually played on Rookery (not a masters database): for the current
// position, the moves played next, how often, and how those games ended. Opening names come from
// the lichess chess-openings dataset (CC0).

import { Chess } from 'chess.js';
import { BookOpen, RotateCcw, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { cn } from '@/lib/cn';
import { explorerMoves, type ExplorerMove } from '@/lib/platform';
import { loadOpenings, positionKey } from '@/lib/review';

type Source = 'people' | 'computer' | 'all';

export function OpeningExplorer() {
  const [line, setLine] = useState<string[]>([]);
  const [source, setSource] = useState<Source>('people');
  const [ratedOnly, setRatedOnly] = useState(false);
  const [rows, setRows] = useState<ExplorerMove[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<Record<string, [string, string]>>({});

  useEffect(() => {
    void loadOpenings().then(setBook);
  }, []);

  const chess = useMemo(() => {
    const c = new Chess();
    for (const u of line) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return c;
  }, [line]);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(null);
    explorerMoves(line, source, ratedOnly)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load the explorer.'));
    return () => {
      alive = false;
    };
  }, [line, source, ratedOnly]);

  // The most specific name along the line so far.
  const name = useMemo(() => {
    const c = new Chess();
    let found: [string, string] | null = null;
    for (const u of line) {
      c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      found = book[positionKey(c.fen())] ?? found;
    }
    return found;
  }, [line, book]);

  const dests = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of chess.moves({ verbose: true })) map.set(m.from, [...(map.get(m.from) ?? []), m.to]);
    return map;
  }, [chess]);

  const san = (uci: string) => {
    try {
      return new Chess(chess.fen()).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
    } catch {
      return uci;
    }
  };
  const nameAfter = (uci: string) => {
    try {
      const c = new Chess(chess.fen());
      c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      return book[positionKey(c.fen())]?.[1] ?? null;
    } catch {
      return null;
    }
  };

  const total = rows?.reduce((a, r) => a + r.games, 0) ?? 0;
  const last = line.length ? line[line.length - 1]! : null;
  const sans = (() => {
    const c = new Chess();
    return line.map((u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
  })();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-start">
      <BoardFrame
        top={<p className="flex h-11 items-center truncate text-sm font-semibold">{name ? `${name[0]} · ${name[1]}` : line.length ? 'Unnamed position' : 'Starting position'}</p>}
        board={
          <ChessBoard
            fen={chess.fen()}
            turnColor={chess.turn() === 'w' ? 'white' : 'black'}
            movableColor={chess.turn() === 'w' ? 'white' : 'black'}
            dests={dests}
            lastMove={last ? [last.slice(0, 2), last.slice(2, 4)] : undefined}
            onMove={(from, to) => {
              const piece = chess.get(from as Parameters<Chess['get']>[0]);
              const promo = piece?.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : '';
              setLine((l) => [...l, `${from}${to}${promo}`]);
            }}
            label="Explorer board"
          />
        }
      />

      <GamePanel
        title="Opening explorer"
        icon={<BookOpen className="size-5" />}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" icon={<Undo2 className="size-4" />} disabled={!line.length} onClick={() => setLine((l) => l.slice(0, -1))}>
              Back
            </Button>
            <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} disabled={!line.length} onClick={() => setLine([])}>
              Start position
            </Button>
          </div>
        }
      >
        <div className="space-y-3 border-b border-line p-4">
          <div className="grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1" role="radiogroup" aria-label="Games to include">
            {(
              [
                ['people', 'Players'],
                ['computer', 'vs computer'],
                ['all', 'All games'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={source === v} onClick={() => setSource(v)} className={cn('h-8 rounded-[8px] text-xs font-semibold', source === v ? 'bg-surface-4 text-fg' : 'text-fg-subtle hover:text-fg')}>
                {l}
              </button>
            ))}
          </div>
          <Switch checked={ratedOnly} onChange={setRatedOnly} label="Rated games only" />
          {line.length > 0 && (
            <p className="font-[family-name:var(--font-mono)] text-xs leading-relaxed text-fg-muted">
              {sans.map((s, i) => (
                <button key={i} type="button" className="mr-1 hover:text-gold-300" onClick={() => setLine(line.slice(0, i + 1))}>
                  {i % 2 === 0 ? `${i / 2 + 1}.` : ''}
                  {s}
                </button>
              ))}
            </p>
          )}
        </div>

        {error ? (
          <ErrorState>{error}</ErrorState>
        ) : rows === null ? (
          <LoadingState label="Counting games…" />
        ) : rows.length === 0 ? (
          <EmptyState icon={<BookOpen className="size-5" />} title={line.length ? 'No games reached this position' : 'No games yet'}>
            {source === 'people' ? 'Try “All games”, or ' : ''}play a move on the board to explore. Counts come from games played on Rookery.
          </EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-fg-subtle">
                <th className="py-2 pl-4 font-medium">Move</th>
                <th className="py-2 text-right font-medium">Games</th>
                <th className="w-[45%] py-2 pr-4 pl-3 font-medium">White · Draw · Black</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const pct = (n: number) => (r.games ? Math.round((n / r.games) * 100) : 0);
                const label = nameAfter(r.move);
                return (
                  <tr key={r.move} className="cursor-pointer hover:bg-surface-2/60" onClick={() => setLine((l) => [...l, r.move])}>
                    <td className="py-2 pl-4">
                      <span className="font-[family-name:var(--font-mono)] font-semibold">{san(r.move)}</span>
                      {label && <span className="block truncate text-[11px] text-fg-subtle">{label}</span>}
                    </td>
                    <td className="tabular py-2 text-right text-fg-muted">
                      {r.games}
                      <span className="block text-[11px] text-fg-subtle">{Math.round((r.games / Math.max(1, total)) * 100)}%</span>
                    </td>
                    <td className="py-2 pr-4 pl-3">
                      <div className="flex h-5 overflow-hidden rounded-[4px] text-[10px] font-semibold" role="img" aria-label={`White ${pct(r.white_wins)}%, draws ${pct(r.draws)}%, Black ${pct(r.black_wins)}%`}>
                        <span className="grid place-items-center bg-[#ece6da] text-[#1a1612]" style={{ width: `${pct(r.white_wins)}%` }}>{pct(r.white_wins) >= 15 ? `${pct(r.white_wins)}%` : ''}</span>
                        <span className="grid place-items-center bg-[#8f8676] text-[#1a1612]" style={{ width: `${pct(r.draws)}%` }}>{pct(r.draws) >= 15 ? `${pct(r.draws)}%` : ''}</span>
                        <span className="grid place-items-center bg-[#3a352f] text-fg" style={{ width: `${pct(r.black_wins)}%` }}>{pct(r.black_wins) >= 15 ? `${pct(r.black_wins)}%` : ''}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </GamePanel>
    </div>
  );
}

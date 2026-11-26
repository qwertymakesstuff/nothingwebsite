'use client';

// Post-game review: Stockfish evaluates every position (in your browser), then each move is
// classified and the best alternative shown. Reviews of your own games are saved, so they open
// instantly next time and others can see them on your games.

import { ENGINE_INFO } from '@rookery/ai';
import { Chess } from 'chess.js';
import { Cpu, FileDown, Microscope, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { GamePanel } from '@/components/board/GamePanel';
import { formatMoveTime, MoveNav } from '@/components/board/MoveList';
import { PlayerStrip } from '@/components/board/PlayerStrip';
import { EvalGraph } from '@/components/charts/EvalGraph';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import type { GameRow } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { ANALYSIS_HANDOFF_KEY, gamePgn } from '@/lib/gameUtils';
import { getEngine } from '@/lib/engine/browserEngine';
import { fetchGame, fetchReview, saveReview, type StoredEval } from '@/lib/platform';
import { buildReview, formatEval, loadOpenings, MATE_CP, openingOf, terminalEval, type Judgement } from '@/lib/review';

const DEPTH = { quick: 11, deep: 16 } as const;

const PLURAL = { inaccuracy: 'Inaccuracies', mistake: 'Mistakes', blunder: 'Blunders' } as const;

const JUDGE: Record<Judgement, { label: string; symbol: string; className: string }> = {
  best: { label: 'Best move', symbol: '★', className: 'text-win' },
  good: { label: 'Good', symbol: '', className: '' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', className: 'text-[#5aa9e6]' },
  mistake: { label: 'Mistake', symbol: '?', className: 'text-[#d28e05]' },
  blunder: { label: 'Blunder', symbol: '??', className: 'text-[#eb6263]' },
};

export function GameReview() {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const { userId } = useAuth();
  const [game, setGame] = useState<GameRow | null | undefined>(undefined);
  const [evals, setEvals] = useState<StoredEval[]>([]);
  const [saved, setSaved] = useState<{ depth: number; engine: string } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [opening, setOpening] = useState<{ eco: string; name: string } | null>(null);
  const cancel = useRef(false);

  const uci = useMemo(() => (game?.moves ? game.moves.split(' ').filter(Boolean) : []), [game]);
  const isPlayer = Boolean(userId && game && (game.white_id === userId || game.black_id === userId));
  const orientation: 'white' | 'black' = game && userId && game.black_id === userId ? 'black' : 'white';

  useEffect(() => {
    if (!id || !/^[A-Za-z0-9]{8,24}$/.test(id)) return setGame(null);
    let alive = true;
    (async () => {
      const [g, r] = await Promise.all([fetchGame(id), fetchReview(id)]);
      if (!alive) return;
      setGame(g);
      if (r) {
        setEvals(r.evals);
        setSaved({ depth: r.depth, engine: r.engine });
      }
      if (g) {
        const book = await loadOpenings();
        const o = openingOf(book, g.initial_fen, g.moves.split(' ').filter(Boolean));
        if (alive) setOpening(o);
      }
    })().catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load this game.'));
    return () => {
      alive = false;
      cancel.current = true;
    };
  }, [id]);

  const analyse = useCallback(
    async (depth: number) => {
      if (!game) return;
      cancel.current = false;
      setError(null);
      const engine = getEngine();
      await engine.newGame();
      const out: StoredEval[] = [];
      const chess = new Chess(game.initial_fen);
      setProgress({ done: 0, total: uci.length + 1 });
      try {
        for (let i = 0; i <= uci.length; i++) {
          if (cancel.current) return;
          if (i > 0) chess.move({ from: uci[i - 1]!.slice(0, 2), to: uci[i - 1]!.slice(2, 4), promotion: uci[i - 1]![4] });
          const term = terminalEval(chess);
          if (term) out.push(term);
          else {
            const res = await engine.search({ fen: game.initial_fen, moves: uci.slice(0, i), depth });
            const top = res.candidates[0];
            const sign = chess.turn() === 'w' ? 1 : -1;
            const cp = top ? (top.score.mate !== null ? sign * (top.score.mate > 0 ? MATE_CP - top.score.mate : -MATE_CP - top.score.mate) : sign * top.score.cp) : 0;
            out.push({ cp, mate: top?.score.mate !== null && top?.score.mate !== undefined ? sign * top.score.mate : null, best: res.bestmove, pv: top?.pv.slice(0, 8) ?? [] });
          }
          setEvals([...out]);
          setProgress({ done: i + 1, total: uci.length + 1 });
        }
        setProgress(null);
        if (isPlayer) {
          await saveReview(game.id, out, ENGINE_INFO.name, depth, saved !== null);
          setSaved({ depth, engine: ENGINE_INFO.name });
        }
      } catch (e) {
        setProgress(null);
        setError(e instanceof Error ? e.message : 'The engine stopped unexpectedly.');
      }
    },
    [game, uci, isPlayer, saved],
  );

  // A game without a saved review is reviewed automatically when opened (saved if it's yours).
  const started = useRef(false);
  useEffect(() => {
    if (game && !saved && !started.current && evals.length === 0) {
      started.current = true;
      void analyse(DEPTH.quick);
    }
  }, [game, saved, evals.length, analyse]);

  const review = useMemo(() => (game && evals.length === uci.length + 1 ? buildReview(game.initial_fen, uci, evals) : null), [game, uci, evals]);

  const position = useMemo(() => {
    const c = new Chess(game?.initial_fen);
    for (const u of uci.slice(0, cursor)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    return c;
  }, [game, uci, cursor]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return;
      if (e.key === 'ArrowLeft') setCursor((c) => Math.max(0, c - 1));
      if (e.key === 'ArrowRight') setCursor((c) => Math.min(uci.length, c + 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [uci.length]);

  if (game === undefined && !error) return <LoadingState label="Loading the game…" />;
  if (error && !game) return <ErrorState>{error}</ErrorState>;
  if (!game) return <EmptyState title="Game not found">This game doesn’t exist, or the link is incomplete. <Link href="/dashboard" className="font-semibold text-gold-300">Your games</Link></EmptyState>;

  const whiteName = game.white?.username ?? game.bot_name ?? 'White';
  const blackName = game.black?.username ?? game.bot_name ?? 'Black';
  const current = cursor > 0 ? review?.moves[cursor - 1] : undefined;
  const here = evals[cursor];
  const shapes: { orig: string; dest?: string; brush: 'green' | 'red' | 'blue' }[] = [];
  if (current && current.bestUci && (current.judgement === 'mistake' || current.judgement === 'blunder' || current.judgement === 'inaccuracy')) {
    shapes.push({ orig: current.bestUci.slice(0, 2), dest: current.bestUci.slice(2, 4), brush: 'green' });
  } else if (here?.best && cursor < uci.length && !progress) {
    shapes.push({ orig: here.best.slice(0, 2), dest: here.best.slice(2, 4), brush: 'blue' });
  }
  const last = cursor > 0 ? uci[cursor - 1] : undefined;
  const boardFen = current && shapes[0]?.brush === 'green' ? positionBefore(game.initial_fen, uci, cursor) : position.fen();

  const openAnalysis = () => {
    try {
      sessionStorage.setItem(ANALYSIS_HANDOFF_KEY, gamePgn(game, whiteName, blackName));
    } catch {
      /* ignore */
    }
    router.push('/analysis');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
      <BoardFrame
        top={<PlayerStrip name={orientation === 'white' ? blackName : whiteName} rating={(orientation === 'white' ? game.black_rating : game.white_rating) ?? undefined} />}
        bottom={<PlayerStrip name={orientation === 'white' ? whiteName : blackName} rating={(orientation === 'white' ? game.white_rating : game.black_rating) ?? undefined} />}
        evalBar={<EvalBar cp={here ? here.cp : null} orientation={orientation} />}
        board={
          <ChessBoard
            fen={boardFen}
            orientation={orientation}
            lastMove={boardFen === position.fen() && last ? [last.slice(0, 2), last.slice(2, 4)] : undefined}
            check={position.inCheck()}
            shapes={shapes}
            label="Game review board"
          />
        }
      />

      <GamePanel
        title="Game review"
        icon={<Microscope className="size-5" />}
        action={
          saved ? (
            <span className="text-xs text-fg-subtle" title={saved.engine}>
              depth {saved.depth}
            </span>
          ) : null
        }
        footer={
          <div className="space-y-2">
            <MoveNav cursor={cursor} length={uci.length} onGo={(p) => setCursor(Math.max(0, Math.min(uci.length, p)))} />
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} disabled={progress !== null} onClick={() => void analyse(DEPTH.deep)}>
                Deeper review
              </Button>
              <Button size="sm" variant="ghost" icon={<FileDown className="size-4" />} onClick={openAnalysis}>
                Analysis board
              </Button>
            </div>
          </div>
        }
      >
        <div className="border-b border-line px-5 py-3 text-sm">
          <p className="font-semibold">
            {whiteName} vs {blackName} · {game.result}
          </p>
          <p className="text-xs text-fg-subtle">
            {formatDate(game.ended_at)} · {game.time_control === 'none' ? 'no clock' : game.time_control} · {game.rated ? 'rated' : 'casual'} · {game.termination.replace('-', ' ')}
            {opening && (
              <>
                {' '}
                · <span className="text-fg-muted">{opening.eco} {opening.name}</span>
              </>
            )}
          </p>
        </div>

        {progress && (
          <div className="border-b border-line px-5 py-3" role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="size-4 text-gold-300" /> Stockfish is reviewing the game… {Math.round((progress.done / progress.total) * 100)}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full bg-gold-400 transition-[width]" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-fg-subtle">Runs in your browser{isPlayer ? '; saved to the game when finished' : ''}.</p>
          </div>
        )}
        {error && <div className="border-b border-line px-5 py-3 text-sm text-loss">{error}</div>}

        {evals.length > 1 && (
          <div className="border-b border-line px-5 py-4">
            <EvalGraph evals={evals} moves={review?.moves ?? []} cursor={Math.min(cursor, evals.length - 1)} onSelect={setCursor} />
          </div>
        )}

        {review && (
          <div className="grid grid-cols-2 gap-px border-b border-line bg-line text-sm">
            {(['white', 'black'] as const).map((c) => (
              <div key={c} className="bg-surface-1 px-5 py-3">
                <p className="truncate text-xs font-semibold text-fg-subtle">{c === 'white' ? whiteName : blackName}</p>
                <p className="tabular font-[family-name:var(--font-display)] text-2xl font-semibold">{review.accuracy[c] ?? '–'}%</p>
                <p className="text-[11px] text-fg-subtle">accuracy</p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {(['inaccuracy', 'mistake', 'blunder'] as const).map((k) => (
                    <li key={k} className="flex justify-between">
                      <span className={JUDGE[k].className}>
                        {JUDGE[k].symbol} {PLURAL[k]}
                      </span>
                      <span className="tabular">{review.counts[c][k]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* This move */}
        <div className="border-b border-line px-5 py-3 text-sm" aria-live="polite">
          {current ? (
            <>
              <p className="flex items-center gap-2">
                <span className="font-semibold">
                  {Math.ceil(current.ply / 2)}
                  {current.color === 'white' ? '.' : '…'} {current.san}
                </span>
                <span className={cn('font-semibold', JUDGE[current.judgement].className)}>
                  {JUDGE[current.judgement].symbol} {JUDGE[current.judgement].label}
                </span>
                <span className="tabular ml-auto text-fg-subtle">{formatEval(here)}</span>
              </p>
              {current.bestSan && current.judgement !== 'good' && (
                <p className="mt-1 text-fg-muted">
                  <Sparkles className="mr-1 inline size-3.5 text-win" />
                  Best was <b>{current.bestSan}</b> (green arrow).
                </p>
              )}
            </>
          ) : review ? (
            <p className="text-fg-muted">Step through the moves, or click the graph. The blue arrow is the engine’s choice in the current position.</p>
          ) : (
            <p className="text-fg-muted">{progress ? 'Results appear as the review progresses.' : 'No review yet.'}</p>
          )}
          {here?.best && cursor < uci.length && !(current?.bestSan && current.judgement !== 'good') && (
            <p className="mt-1 text-xs text-fg-subtle">Engine’s choice here: {moveSan(position.fen(), here.best)} (blue arrow).</p>
          )}
        </div>

        {/* Move list with judgements */}
        <ol className="rk-scroll grid flex-1 grid-cols-[2.5rem_1fr_1fr] content-start gap-y-0.5 overflow-y-auto px-2 py-2">
          {Array.from({ length: Math.ceil(uci.length / 2) }, (_, r) => (
            <li key={r} className="contents">
              <span className="tabular py-1 pl-2 text-[13px] text-fg-subtle">{r + 1}.</span>
              {[2 * r, 2 * r + 1].map((i) =>
                i < uci.length ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCursor(i + 1)}
                    className={cn('flex items-center gap-1 rounded-[6px] px-2 py-1 text-left font-[family-name:var(--font-mono)] text-[13px]', cursor === i + 1 ? 'bg-gold-500/20 font-semibold text-gold-200' : 'hover:bg-surface-3')}
                  >
                    {review?.moves[i]?.san ?? sanAt(game.initial_fen, uci, i)}
                    {review && review.moves[i] && JUDGE[review.moves[i]!.judgement].symbol && review.moves[i]!.judgement !== 'best' && (
                      <span className={cn('text-[11px] font-bold', JUDGE[review.moves[i]!.judgement].className)}>{JUDGE[review.moves[i]!.judgement].symbol}</span>
                    )}
                    {game.move_times?.[i] != null && (
                      <span className="tabular ml-auto text-[11px] font-normal text-fg-subtle" title="Time taken for this move">
                        {formatMoveTime(game.move_times[i]!)}
                      </span>
                    )}
                  </button>
                ) : (
                  <span key={i} />
                ),
              )}
            </li>
          ))}
        </ol>
      </GamePanel>
    </div>
  );
}

function positionBefore(initialFen: string, uci: string[], ply: number): string {
  const c = new Chess(initialFen);
  for (const u of uci.slice(0, ply - 1)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  return c.fen();
}

function sanAt(initialFen: string, uci: string[], i: number): string {
  const c = new Chess(initialFen);
  for (const u of uci.slice(0, i)) c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
  const u = uci[i]!;
  try {
    return c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san;
  } catch {
    return u;
  }
}

function moveSan(fen: string, uci: string): string {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  } catch {
    return uci;
  }
}

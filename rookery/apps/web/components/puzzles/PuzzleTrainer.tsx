'use client';

import { Chess } from 'chess.js';
import { CalendarDays, Check, Eye, Flame, Infinity as InfinityIcon, Lightbulb, Puzzle, RotateCcw, SkipForward, Tags, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BoardFrame } from '@/components/board/BoardFrame';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GamePanel } from '@/components/board/GamePanel';
import { PromotionPicker, type PromotionPiece } from '@/components/board/PromotionPicker';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { fetchRatings, ApiFailure } from '@/lib/db';
import { formatDate } from '@/lib/format';
import {
  dailyPuzzleId,
  fetchMyPuzzleHistory,
  fetchPuzzle,
  fetchPuzzleStats,
  nextPuzzleId,
  puzzleMove,
  puzzleThemes,
  type PuzzleAttemptRow,
  type PuzzleRow,
  type PuzzleStats,
} from '@/lib/platform';
import { usePreferences } from '@/lib/preferences';

type Status = 'loading' | 'intro' | 'yours' | 'checking' | 'solved' | 'failed' | 'empty' | 'error';

export const THEME_LABEL: Record<string, string> = {
  mate: 'Checkmate',
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  mateIn3: 'Mate in 3',
  mateIn4: 'Mate in 4+',
  oneMove: 'One move',
  advantage: 'Win material',
  short: 'Short',
  long: 'Long',
  fork: 'Fork',
  hangingPiece: 'Hanging piece',
  sacrifice: 'Sacrifice',
  promotion: 'Promotion',
  check: 'Starts with check',
  backRankMate: 'Back-rank mate',
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

const GUEST_RATING = 500;

export function PuzzleTrainer() {
  const params = useSearchParams();
  const router = useRouter();
  const { userId, status: auth } = useAuth();
  const { prefs } = usePreferences();
  const mode: 'daily' | 'practice' = params.get('mode') === 'daily' ? 'daily' : 'practice';
  const theme = params.get('theme');
  const requested = params.get('id');

  const [puzzle, setPuzzle] = useState<PuzzleRow | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [fen, setFen] = useState<string>('');
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [solverMoves, setSolverMoves] = useState<string[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [helped, setHelped] = useState(false);
  const [ratingChange, setRatingChange] = useState<number | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [stats, setStats] = useState<PuzzleStats | null>(null);
  const [history, setHistory] = useState<PuzzleAttemptRow[]>([]);
  const [themes, setThemes] = useState<{ theme: string; count: number }[]>([]);
  const [promo, setPromo] = useState<[string, string] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const seen = useRef<string[]>([]);
  const chess = useRef(new Chess());

  const solver = puzzle ? (new Chess(puzzle.fen).turn() === 'w' ? 'black' : 'white') : 'white';

  const refreshMine = useCallback(async () => {
    if (!userId) return;
    const [ratings, st, hist] = await Promise.all([fetchRatings(userId), fetchPuzzleStats(userId), fetchMyPuzzleHistory(12)]);
    setMyRating(ratings.find((r) => r.category === 'puzzle')?.rating ?? null);
    setStats(st);
    setHistory(hist);
  }, [userId]);

  useEffect(() => {
    void refreshMine().catch(() => undefined);
  }, [refreshMine]);
  useEffect(() => {
    puzzleThemes().then(setThemes).catch(() => setThemes([]));
  }, []);

  /** Loads a puzzle and plays the opponent's setup move. */
  const load = useCallback(async () => {
    if (auth === 'loading') return;
    setStatus('loading');
    setError(null);
    setHint(null);
    setHelped(false);
    setRatingChange(null);
    setSolverMoves([]);
    setMessage(null);
    try {
      const id = requested ?? (mode === 'daily' ? await dailyPuzzleId() : await nextPuzzleId(theme, auth === 'signedIn' ? null : GUEST_RATING, seen.current));
      if (!id) {
        setPuzzle(null);
        setStatus('empty');
        return;
      }
      const p = await fetchPuzzle(id);
      if (!p) throw new Error('That puzzle doesn’t exist.');
      seen.current = [...seen.current, p.id].slice(-200);
      chess.current = new Chess(p.fen);
      setPuzzle(p);
      setFen(p.fen);
      setLastMove(undefined);
      setStatus('intro');
      setTimeout(() => {
        const m = chess.current.move({ from: p.first_move.slice(0, 2), to: p.first_move.slice(2, 4), promotion: p.first_move[4] });
        setFen(chess.current.fen());
        setLastMove([m.from, m.to]);
        setStatus('yours');
      }, 650);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load a puzzle.');
      setStatus('error');
    }
  }, [auth, mode, theme, requested]);

  useEffect(() => {
    void load();
  }, [load]);

  const dests = useMemo(() => {
    if (status !== 'yours') return undefined;
    const c = new Chess(fen);
    const map = new Map<string, string[]>();
    for (const m of c.moves({ verbose: true })) map.set(m.from, [...(map.get(m.from) ?? []), m.to]);
    return map;
  }, [fen, status]);

  const play = (uci: string) => {
    const m = chess.current.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    setFen(chess.current.fen());
    setLastMove([m.from, m.to]);
  };

  const showSolution = async (solution: string[], from: number) => {
    // Rewind to before the wrong move, then play the right line slowly.
    const c = new Chess(puzzle!.fen);
    c.move({ from: puzzle!.first_move.slice(0, 2), to: puzzle!.first_move.slice(2, 4), promotion: puzzle!.first_move[4] });
    for (let i = 0; i < from * 2; i++) c.move({ from: solution[i]!.slice(0, 2), to: solution[i]!.slice(2, 4), promotion: solution[i]![4] });
    chess.current = c;
    setFen(c.fen());
    for (let i = from * 2; i < solution.length; i++) {
      await new Promise((r) => setTimeout(r, 700));
      play(solution[i]!);
    }
  };

  const submit = async (uci: string) => {
    if (!puzzle) return;
    const moves = [...solverMoves, uci];
    play(uci);
    setStatus('checking');
    setHint(null);
    try {
      const res = await puzzleMove(puzzle.id, moves);
      if (res.rating) setRatingChange(res.rating.change);
      if (res.status === 'continue' && res.reply) {
        setSolverMoves(moves);
        setTimeout(() => {
          play(res.reply!);
          setStatus('yours');
        }, 350);
      } else if (res.status === 'solved') {
        setSolverMoves(moves);
        setStatus('solved');
        void refreshMine();
      } else {
        setStatus('failed');
        setMessage('Not the best move.');
        if (res.solution) await showSolution(res.solution, solverMoves.length);
        void refreshMine();
      }
    } catch (e) {
      setMessage(e instanceof ApiFailure ? e.message : 'Couldn’t check that move. Try again.');
      // Undo the optimistic move.
      chess.current.undo();
      setFen(chess.current.fen());
      setStatus('yours');
    }
  };

  const onMove = (from: string, to: string) => {
    const piece = chess.current.get(from as Parameters<Chess['get']>[0]);
    const promoting = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    if (promoting && !prefs.autoQueen) setPromo([from, to]);
    else void submit(`${from}${to}${promoting ? 'q' : ''}`);
  };

  const askHelp = async (kind: 'hint' | 'solution') => {
    if (!puzzle) return;
    try {
      const res = await puzzleMove(puzzle.id, solverMoves, kind);
      setHelped(true);
      if (res.rating) setRatingChange(res.rating.change);
      if (kind === 'hint' && res.hintSquare) setHint(res.hintSquare);
      if (kind === 'solution' && res.solution) {
        setStatus('failed');
        setMessage('Here’s the solution.');
        await showSolution(res.solution, solverMoves.length);
      }
      void refreshMine();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  const go = (q: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ mode, theme, ...q })) if (v) next.set(k, v);
    router.push(`/puzzles${next.size ? `?${next}` : ''}`);
  };

  const done = status === 'solved' || status === 'failed';
  const shownRating = myRating !== null ? Math.round(myRating) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-start">
      <BoardFrame
        top={
          <div className="flex h-11 items-center gap-3">
            <span className={cn('size-3 rounded-full ring-1 ring-inset', solver === 'white' ? 'bg-[#ece6da] ring-black/10' : 'bg-[#2b2925] ring-white/20')} />
            <p className="text-sm font-semibold">
              {status === 'loading' ? 'Loading…' : status === 'intro' ? 'Watch your opponent’s move…' : done ? (status === 'solved' ? 'Solved!' : 'Puzzle failed') : `Find the best move for ${solver}`}
            </p>
            {puzzle && <Badge className="ml-auto" tone="neutral">Rated {Math.round(puzzle.rating)}</Badge>}
          </div>
        }
        board={
          status === 'empty' ? (
            <div className="grid aspect-square place-items-center rounded-[var(--radius-card)] border border-line bg-surface-1">
              <EmptyState icon={<Puzzle className="size-5" />} title={theme ? 'No more puzzles with this theme' : 'You’ve tried every puzzle!'}>
                {theme ? (
                  <button className="font-semibold text-gold-300" onClick={() => go({ theme: null })}>
                    Try any theme
                  </button>
                ) : (
                  'New puzzles are added regularly.'
                )}
              </EmptyState>
            </div>
          ) : status === 'error' ? (
            <div className="grid aspect-square place-items-center rounded-[var(--radius-card)] border border-line bg-surface-1">
              <ErrorState action={<button className="font-semibold text-gold-300" onClick={() => void load()}>Try again</button>}>{error}</ErrorState>
            </div>
          ) : (
            <ChessBoard
              fen={fen || '8/8/8/8/8/8/8/8 w - - 0 1'}
              orientation={solver}
              turnColor={new Chess(fen || undefined).turn() === 'w' ? 'white' : 'black'}
              movableColor={status === 'yours' ? solver : undefined}
              dests={dests}
              lastMove={lastMove}
              check={fen ? new Chess(fen).inCheck() : false}
              onMove={onMove}
              shapes={hint ? [{ orig: hint, brush: 'green' }] : undefined}
              label="Puzzle board"
            />
          )
        }
        overlay={
          promo && (
            <PromotionPicker
              color={solver}
              onPick={(p: PromotionPiece) => {
                void submit(`${promo[0]}${promo[1]}${p}`);
                setPromo(null);
              }}
              onCancel={() => setPromo(null)}
            />
          )
        }
      />

      <GamePanel
        title={mode === 'daily' ? 'Daily puzzle' : theme ? THEME_LABEL[theme] ?? theme : 'Puzzles'}
        icon={mode === 'daily' ? <CalendarDays className="size-5" /> : <Puzzle className="size-5" />}
        footer={
          <div className="space-y-2">
            {done ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" icon={<RotateCcw className="size-4" />} onClick={() => go({ id: puzzle?.id ?? null })}>
                  Retry
                </Button>
                <Button variant="primary" iconRight={<SkipForward className="size-4" />} onClick={() => go({ mode: 'practice', id: null })}>
                  Next puzzle
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2">
                <Button variant="secondary" icon={<Lightbulb className="size-4" />} disabled={status !== 'yours'} onClick={() => void askHelp('hint')}>
                  Hint
                </Button>
                <Button variant="secondary" icon={<Eye className="size-4" />} disabled={status !== 'yours'} onClick={() => void askHelp('solution')}>
                  Solution
                </Button>
                <Button variant="ghost" iconRight={<SkipForward className="size-4" />} onClick={() => go({ mode: 'practice', id: null })}>
                  Skip
                </Button>
              </div>
            )}
            {userId && !helped && !done && <p className="text-center text-xs text-fg-subtle">Hints and the solution count as a miss for your rating.</p>}
          </div>
        }
      >
        {/* Result / feedback */}
        {(done || message) && (
          <div className={cn('border-b border-line px-5 py-4', status === 'solved' ? 'bg-win/10' : status === 'failed' ? 'bg-loss/10' : '')} role="status">
            <p className="flex items-center gap-2 font-semibold">
              {status === 'solved' ? <Check className="size-4 text-win" /> : status === 'failed' ? <X className="size-4 text-loss" /> : null}
              {status === 'solved' ? (helped ? 'Solved, with help' : 'Correct!') : message}
            </p>
            {ratingChange !== null && (
              <p className={cn('tabular mt-1 text-sm font-semibold', ratingChange > 0 ? 'text-win' : ratingChange < 0 ? 'text-loss' : 'text-fg-muted')}>
                Puzzle rating {ratingChange > 0 ? '+' : ''}
                {ratingChange}
              </p>
            )}
            {done && ratingChange === null && userId && <p className="mt-1 text-xs text-fg-subtle">Already attempted: practice only, rating unchanged.</p>}
          </div>
        )}

        {/* Rating and streaks (real, from your account) */}
        <div className="grid grid-cols-3 gap-px border-b border-line bg-line">
          <Stat label="Puzzle rating" value={auth === 'signedIn' ? (shownRating !== null ? `${shownRating}` : '…') : '–'} />
          <Stat label="Solved" value={stats ? `${stats.solved}` : '–'} icon={<Check className="size-3.5" />} />
          <Stat label="Streak" value={stats ? `${stats.current_streak}` : '–'} icon={<Flame className="size-3.5" />} />
        </div>
        {auth !== 'signedIn' && (
          <p className="border-b border-line px-5 py-3 text-sm text-fg-muted">
            <Link href="/login?next=/puzzles" className="font-semibold text-gold-300 hover:underline">
              Sign in
            </Link>{' '}
            to keep a puzzle rating and history. Guests can solve as many as they like.
          </p>
        )}

        {/* Modes */}
        <div className="grid grid-cols-2 gap-2 border-b border-line p-4">
          <Mode icon={<CalendarDays />} title="Daily" text="Today’s puzzle, the same for everyone" active={mode === 'daily'} onClick={() => go({ mode: 'daily', theme: null, id: null })} />
          <Mode icon={<InfinityIcon />} title="Practice" text="Unlimited, matched to your rating" active={mode === 'practice' && !theme} onClick={() => go({ mode: 'practice', theme: null, id: null })} />
        </div>

        {/* Themes */}
        <div className="border-b border-line p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
            <Tags className="size-3.5" /> Themes
          </p>
          {themes.length ? (
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <button
                  key={t.theme}
                  type="button"
                  onClick={() => go({ mode: 'practice', theme: theme === t.theme ? null : t.theme, id: null })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-[13px] transition-colors',
                    theme === t.theme ? 'border-gold-500/60 bg-gold-500/15 text-gold-200' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                  )}
                >
                  {THEME_LABEL[t.theme] ?? t.theme} <span className="tabular text-fg-subtle">{t.count}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-fg-subtle">Loading themes…</p>
          )}
        </div>

        {/* This puzzle */}
        {puzzle && (
          <div className="border-b border-line p-5 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {done && puzzle.themes.map((t) => <Badge key={t}>{THEME_LABEL[t] ?? t}</Badge>)}
              {!done && <span className="text-fg-subtle">Themes are revealed when you finish.</span>}
            </div>
            <p className="mt-2 text-xs text-fg-subtle">
              Played {puzzle.plays} {puzzle.plays === 1 ? 'time' : 'times'}
              {puzzle.plays > 0 && ` · ${Math.round((puzzle.solves / puzzle.plays) * 100)}% solved`}
              {puzzle.rd > 110 && ' · rating still settling'}
            </p>
          </div>
        )}

        {/* Recent attempts */}
        {userId && (
          <div className="p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Your recent puzzles</p>
            {history.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {history.map((h) => (
                  <li key={h.puzzle_id}>
                    <Link
                      href={`/puzzles?id=${h.puzzle_id}`}
                      title={`${formatDate(h.created_at)} · ${h.solved ? 'solved' : 'missed'}${h.rating_after !== null && h.rating_before !== null ? ` · ${Math.round(h.rating_after - h.rating_before) >= 0 ? '+' : ''}${Math.round(h.rating_after - h.rating_before)}` : ''}`}
                      className={cn('grid size-8 place-items-center rounded-[8px] text-xs font-semibold', h.solved ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss')}
                    >
                      {h.solved ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-subtle">Your attempts will appear here.</p>
            )}
          </div>
        )}
        {status === 'loading' && !puzzle && <LoadingState label="Finding a puzzle…" />}
      </GamePanel>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-1 px-4 py-3">
      <p className="flex items-center gap-1 text-[11px] font-medium text-fg-subtle">
        {icon}
        {label}
      </p>
      <p className="tabular font-[family-name:var(--font-display)] text-xl font-semibold">{value}</p>
    </div>
  );
}

function Mode({ icon, title, text, onClick, active }: { icon: React.ReactNode; title: string; text: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('flex flex-col items-start gap-1 rounded-[12px] border p-3 text-left transition-colors', active ? 'border-gold-500/50 bg-gold-500/10' : 'border-line hover:border-line-strong hover:bg-surface-2')}
    >
      <span className="text-gold-400 [&>svg]:size-4">{icon}</span>
      <span className="text-sm font-semibold text-fg">{title}</span>
      <span className="text-xs leading-snug text-fg-subtle">{text}</span>
    </button>
  );
}

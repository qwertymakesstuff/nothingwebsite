'use client';

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Two-column move list (move number, White, Black). Clicking a move jumps to it.
 * `cursor` is the number of plies shown (0 = start).
 */
export function MoveList({
  sans,
  cursor,
  onSelect,
  startsWithBlack = false,
  firstMoveNumber = 1,
  className,
  empty = 'No moves yet.',
  times,
  thinkingMs,
}: {
  sans: string[];
  /** Thinking time of each move (ms), parallel to `sans`; shown beside each move. */
  times?: (number | null | undefined)[];
  /** The side to move's time so far on the move in progress (shown in the next cell). */
  thinkingMs?: number | null;
  cursor: number;
  onSelect?: (ply: number) => void;
  startsWithBlack?: boolean;
  firstMoveNumber?: number;
  className?: string;
  empty?: string;
}) {
  // Pad so that index 0 is always White's move (also for times).
  const timeCells: (number | null | undefined)[] | undefined = times ? (startsWithBlack ? [null, ...times] : [...times]) : undefined;
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.current?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!sans.length && thinkingMs == null) return <p className={cn('px-4 py-6 text-center text-sm text-fg-subtle', className)}>{empty}</p>;

  // Pad so that index 0 is always White's move.
  const cells: (string | null)[] = startsWithBlack ? [null, ...sans] : [...sans];
  const rows: { n: number; w: number; b: number }[] = [];
  const total = cells.length + (thinkingMs != null ? 1 : 0);
  for (let i = 0; i < total; i += 2) rows.push({ n: firstMoveNumber + i / 2, w: i, b: i + 1 });
  const offset = startsWithBlack ? 1 : 0;

  const cell = (idx: number) => {
    const san = cells[idx];
    if (san === undefined) {
      // The move being thought about right now: a live timer in its future cell.
      if (thinkingMs != null && idx === cells.length) {
        return (
          <span className="flex items-center justify-end px-2 py-1" aria-label="Time on this move so far">
            <MoveTime ms={thinkingMs} live />
          </span>
        );
      }
      return <span />;
    }
    if (san === null) return <span className="px-2 text-fg-subtle">…</span>;
    const ply = idx - offset + 1;
    const isActive = ply === cursor;
    return (
      <button
        type="button"
        ref={isActive ? active : undefined}
        onClick={() => onSelect?.(ply)}
        className={cn(
          'rounded-[6px] px-2 py-1 text-left font-[family-name:var(--font-mono)] text-[13px] transition-colors duration-100',
          isActive ? 'bg-gold-500/20 font-semibold text-gold-200' : 'text-fg hover:bg-surface-3',
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span>{san}</span>
          {timeCells?.[idx] != null && <MoveTime ms={timeCells[idx]!} />}
        </span>
      </button>
    );
  };

  return (
    <ol className={cn('rk-scroll grid grid-cols-[2.5rem_1fr_1fr] content-start gap-y-0.5 overflow-y-auto px-2 py-2', className)}>
      {rows.map((r) => (
        <li key={r.n} className="contents">
          <span className="tabular py-1 pl-2 text-[13px] text-fg-subtle">{r.n}.</span>
          {cell(r.w)}
          {cell(r.b)}
        </li>
      ))}
    </ol>
  );
}

/** First / previous / next / last navigation for any move list. */
export function MoveNav({
  cursor,
  length,
  onGo,
  className,
}: {
  cursor: number;
  length: number;
  onGo: (ply: number) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-4 gap-1', className)}>
      <IconButton aria-label="First move" variant="secondary" className="w-full" onClick={() => onGo(0)} disabled={cursor === 0}>
        <ChevronFirst className="size-4" />
      </IconButton>
      <IconButton aria-label="Previous move" variant="secondary" className="w-full" onClick={() => onGo(cursor - 1)} disabled={cursor === 0}>
        <ChevronLeft className="size-4" />
      </IconButton>
      <IconButton aria-label="Next move" variant="secondary" className="w-full" onClick={() => onGo(cursor + 1)} disabled={cursor >= length}>
        <ChevronRight className="size-4" />
      </IconButton>
      <IconButton aria-label="Last move" variant="secondary" className="w-full" onClick={() => onGo(length)} disabled={cursor >= length}>
        <ChevronLast className="size-4" />
      </IconButton>
    </div>
  );
}

/** "3.2s", "24s", "1:05": how long a move took. */
export function formatMoveTime(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  if (s < 10) return `${s.toFixed(1)}s`;
  if (s < 60) return `${Math.floor(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function MoveTime({ ms, live }: { ms: number; live?: boolean }) {
  return (
    <span className={cn('tabular shrink-0 font-[family-name:var(--font-mono)] text-[11px] font-normal', live ? 'text-gold-300' : 'text-fg-subtle')} title={live ? 'Thinking…' : 'Time taken for this move'}>
      {formatMoveTime(ms)}
    </span>
  );
}

'use client';

// Evaluation over the game: White's winning chances (0–100) per position. One series, so no
// legend; the pale area is White's share of the winning chances (the dashed midline is 50%). Hover shows the move and
// evaluation; click jumps there. Mistakes and blunders also carry a marker shape + the move list's
// labels, so they're never told apart by colour alone.

import { useRef, useState } from 'react';
import { formatEval, winPercent, type MoveReview } from '@/lib/review';
import type { StoredEval } from '@/lib/platform';

const W = 600;
const H = 120;

export function EvalGraph({ evals, moves, cursor, onSelect }: { evals: StoredEval[]; moves: MoveReview[]; cursor: number; onSelect: (ply: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const n = Math.max(1, evals.length - 1);
  const x = (i: number) => (i / n) * W;
  const y = (e: StoredEval) => H - (winPercent(e.cp) / 100) * H;
  const pts = evals.map((e, i) => `${x(i).toFixed(1)},${y(e).toFixed(1)}`).join(' ');
  const area = `0,${H} ${pts} ${x(evals.length - 1).toFixed(1)},${H}`;
  const shown = hover ?? cursor;
  const shownEval = evals[shown];
  const move = shown > 0 ? moves[shown - 1] : undefined;

  const pick = (clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return null;
    return Math.max(0, Math.min(evals.length - 1, Math.round(((clientX - r.left) / r.width) * n)));
  };

  return (
    <figure className="relative">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-28 w-full cursor-crosshair touch-none rounded-[10px] bg-[#2b2925]"
        role="img"
        aria-label="Evaluation graph: White’s winning chances after each move"
        onPointerMove={(e) => setHover(pick(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const i = pick(e.clientX);
          if (i !== null) onSelect(i);
        }}
      >
        <polygon points={area} fill="#ece6da" opacity="0.9" />
        <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="#8f8676" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <polyline points={pts} fill="none" stroke="#c9a45c" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1={x(shown)} x2={x(shown)} y1="0" y2={H} stroke="#c9a45c" strokeWidth="1.5" strokeDasharray={hover === null ? undefined : '3 3'} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* Markers in HTML so they stay round on a stretched chart. Shape differs too (blunder: larger, ringed). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28">
        {moves.map((m) =>
          (m.judgement === 'mistake' || m.judgement === 'blunder') && evals[m.ply] ? (
            <span
              key={m.ply}
              title={`${m.judgement}: ${m.san}`}
              className={m.judgement === 'blunder' ? 'absolute size-3 -translate-1/2 rounded-full border-2 border-surface-1 bg-[#eb6263]' : 'absolute size-2.5 -translate-1/2 rotate-45 border-2 border-surface-1 bg-[#d28e05]'}
              style={{ left: `${(x(m.ply) / W) * 100}%`, top: `${(y(evals[m.ply]!) / H) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      {shownEval && (
        <figcaption className="pointer-events-none mt-1.5 flex items-center justify-between text-xs text-fg-subtle">
          <span>{move ? `${Math.ceil(move.ply / 2)}${move.color === 'white' ? '.' : '…'} ${move.san}` : 'Start'}</span>
          <span className="tabular font-semibold text-fg">{formatEval(shownEval)}</span>
        </figcaption>
      )}
    </figure>
  );
}

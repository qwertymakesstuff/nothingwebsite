'use client';

// Rating history, one line per format (Glicko-2 ratings after each rated game or puzzle).
// Colours: validated categorical palette (dataviz reference, dark steps) in fixed order per
// format, so a format keeps its colour when others are filtered out. Legend + filter chips,
// crosshair tooltip with every visible format's rating at that moment, and a table view.

import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { CATEGORY_LABEL, formatDate } from '@/lib/format';
import type { RatingPoint } from '@/lib/platform';

const COLORS: Record<string, string> = { bullet: '#338ced', blitz: '#e76624', rapid: '#00a888', classical: '#d28e05', puzzle: '#e24d8b' };
const ORDER = ['bullet', 'blitz', 'rapid', 'classical', 'puzzle'] as const;
const W = 640;
const H = 220;
const PAD = { l: 44, r: 12, t: 12, b: 24 };

export function RatingChart({ points }: { points: RatingPoint[] }) {
  const present = ORDER.filter((c) => points.some((p) => p.category === c));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const svg = useRef<SVGSVGElement>(null);

  const series = useMemo(
    () => present.filter((c) => !hidden.has(c)).map((c) => ({ c, pts: points.filter((p) => p.category === c).map((p) => ({ t: Date.parse(p.created_at), r: Number(p.rating) })) })),
    [present, hidden, points],
  );
  const all = series.flatMap((s) => s.pts);
  if (!present.length) return <p className="text-sm text-fg-subtle">No rated games or puzzles yet.</p>;

  const t0 = Math.min(...all.map((p) => p.t), Date.now());
  const t1 = Math.max(...all.map((p) => p.t), t0 + 1);
  const rMin = Math.floor((Math.min(...all.map((p) => p.r), 500) - 50) / 100) * 100;
  const rMax = Math.ceil((Math.max(...all.map((p) => p.r), 500) + 50) / 100) * 100;
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (r: number) => PAD.t + (1 - (r - rMin) / Math.max(1, rMax - rMin)) * (H - PAD.t - PAD.b);
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round(rMin + ((rMax - rMin) * i) / 4));
  const at = (t: number) => series.map((s) => ({ c: s.c, r: [...s.pts].reverse().find((p) => p.t <= t)?.r ?? null }));

  const onMove = (clientX: number) => {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    setHover(Math.max(t0, Math.min(t1, t0 + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (t1 - t0))));
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Formats shown">
        {present.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={!hidden.has(c)}
            onClick={() => setHidden((h) => (h.has(c) ? new Set([...h].filter((x) => x !== c)) : new Set([...h, c])))}
            className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs', hidden.has(c) ? 'border-line text-fg-subtle' : 'border-line-strong text-fg')}
          >
            <span className="size-2.5 rounded-full" style={{ background: hidden.has(c) ? 'transparent' : COLORS[c], boxShadow: `inset 0 0 0 1.5px ${COLORS[c]}` }} />
            {CATEGORY_LABEL[c]}
          </button>
        ))}
        <button type="button" className="ml-auto text-xs font-semibold text-gold-300 hover:underline" onClick={() => setTable((v) => !v)}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {table ? (
        <div className="rk-scroll max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-subtle">
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium">Format</th>
                <th className="py-1 text-right font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {points
                .filter((p) => !hidden.has(p.category))
                .slice()
                .reverse()
                .map((p, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1 text-fg-muted">{formatDate(p.created_at)}</td>
                    <td className="py-1">{CATEGORY_LABEL[p.category as keyof typeof CATEGORY_LABEL] ?? p.category}</td>
                    <td className="tabular py-1 text-right">{Math.round(Number(p.rating))}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            ref={svg}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none"
            role="img"
            aria-label="Rating history by format"
            onPointerMove={(e) => onMove(e.clientX)}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#2a2722" strokeWidth="1" />
                <text x={PAD.l - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-fg-subtle text-[11px]">
                  {t}
                </text>
              </g>
            ))}
            <text x={PAD.l} y={H - 6} className="fill-fg-subtle text-[11px]">
              {formatDate(new Date(t0).toISOString())}
            </text>
            <text x={W - PAD.r} y={H - 6} textAnchor="end" className="fill-fg-subtle text-[11px]">
              {formatDate(new Date(t1).toISOString())}
            </text>
            {series.map((s) =>
              s.pts.length === 1 ? (
                <circle key={s.c} cx={x(s.pts[0]!.t)} cy={y(s.pts[0]!.r)} r="4" fill={COLORS[s.c]} stroke="#181714" strokeWidth="2" />
              ) : (
                <polyline key={s.c} fill="none" stroke={COLORS[s.c]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={s.pts.map((p) => `${x(p.t).toFixed(1)},${y(p.r).toFixed(1)}`).join(' ')} />
              ),
            )}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#8f8676" strokeWidth="1" strokeDasharray="3 3" />}
            {hover !== null &&
              at(hover).map((v) => (v.r === null ? null : <circle key={v.c} cx={x(hover)} cy={y(v.r)} r="4" fill={COLORS[v.c]} stroke="#181714" strokeWidth="2" />))}
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute top-2 rounded-[10px] border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-[var(--shadow-pop)]" style={{ left: `${Math.min(70, (x(hover) / W) * 100)}%` }}>
              <p className="mb-1 text-fg-subtle">{formatDate(new Date(hover).toISOString())}</p>
              {at(hover).map((v) => (
                <p key={v.c} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: COLORS[v.c] }} />
                  <span className="text-fg-muted">{CATEGORY_LABEL[v.c]}</span>
                  <span className="tabular ml-auto font-semibold text-fg">{v.r === null ? '–' : Math.round(v.r)}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

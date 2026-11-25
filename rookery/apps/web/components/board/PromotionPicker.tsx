'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/cn';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

const PIECES: { p: PromotionPiece; name: string; role: string }[] = [
  { p: 'q', name: 'Queen', role: 'queen' },
  { p: 'n', name: 'Knight', role: 'knight' },
  { p: 'r', name: 'Rook', role: 'rook' },
  { p: 'b', name: 'Bishop', role: 'bishop' },
];

/**
 * Overlay over the board asking which piece to promote to. Uses chessground's own piece
 * classes so the choices match the board's piece set. Esc cancels.
 */
export function PromotionPicker({
  color,
  onPick,
  onCancel,
}: {
  color: 'white' | 'black';
  onPick: (p: PromotionPiece) => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      const k = e.key.toLowerCase();
      if (k === 'q' || k === 'r' || k === 'b' || k === 'n') onPick(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPick, onCancel]);

  return (
    <div
      className="absolute inset-0 z-10 grid place-items-center rounded-[8px] bg-black/55 backdrop-blur-[1px] animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-label="Choose a piece to promote to"
        className="rounded-[16px] border border-line-strong bg-surface-1 p-3 shadow-[var(--shadow-pop)] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 px-1 text-center text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Promote to</p>
        <div className="cg-wrap flex gap-2" style={{ position: 'static' }}>
          {PIECES.map(({ p, name, role }) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              aria-label={`${name} (${p.toUpperCase()})`}
              className={cn(
                'relative size-16 rounded-[12px] bg-surface-3 transition-colors duration-100 hover:bg-gold-500/30 sm:size-20',
              )}
            >
              <piece className={`${color} ${role}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      piece: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

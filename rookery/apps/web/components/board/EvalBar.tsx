import { cn } from '@/lib/cn';

/**
 * Vertical evaluation bar. `cp` is centipawns from White's view; `null` means no engine yet
 * (Stage 3 connects Stockfish), shown as an even, dimmed bar.
 */
export function EvalBar({ cp, orientation = 'white', className }: { cp: number | null; orientation?: 'white' | 'black'; className?: string }) {
  const whiteShare = cp === null ? 50 : 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
  const label = cp === null ? 'Engine off' : `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(1)}`;
  return (
    <div
      className={cn(
        'relative w-3 shrink-0 overflow-hidden rounded-full bg-[#2b2925] sm:w-4',
        cp === null && 'opacity-50',
        orientation === 'black' && 'rotate-180',
        className,
      )}
      role="meter"
      aria-label={`Evaluation: ${label}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(whiteShare)}
      title={label}
    >
      <div className="absolute inset-x-0 bottom-0 bg-[#ece6da] transition-[height] duration-300" style={{ height: `${whiteShare}%` }} />
      <div className="absolute inset-x-0 top-1/2 h-px bg-gold-500/60" />
    </div>
  );
}

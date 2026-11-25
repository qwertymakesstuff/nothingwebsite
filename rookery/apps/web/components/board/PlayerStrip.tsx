import type { ReactNode } from 'react';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/format';

/** Name, rating and clock shown above/below the board. */
export function PlayerStrip({
  name,
  rating,
  country,
  avatar,
  clockMs,
  clockActive,
  material,
  className,
  muted,
}: {
  name: string;
  rating?: number | string;
  country?: string;
  /** Custom avatar (e.g. a bot portrait); defaults to the player's initials. */
  avatar?: ReactNode;
  clockMs?: number;
  clockActive?: boolean;
  /** Captured-material summary, e.g. "+2". */
  material?: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn('flex h-11 items-center gap-2.5', className)}>
      {avatar ?? <PlayerAvatar name={name} size="sm" />}
      <div className="min-w-0 flex-1">
        <p className={cn('flex items-center gap-1.5 truncate text-sm font-semibold', muted ? 'text-fg-muted' : 'text-fg')}>
          <span className="truncate">{name}</span>
          {rating !== undefined && <span className="tabular font-normal text-fg-subtle">({rating})</span>}
          <CountryTag code={country} />
        </p>
        {material && <p className="text-xs text-fg-subtle">{material}</p>}
      </div>
      {clockMs !== undefined && <Clock ms={clockMs} active={clockActive} />}
    </div>
  );
}

export function Clock({ ms, active }: { ms: number; active?: boolean }) {
  const low = ms < 20_000;
  return (
    <div
      className={cn(
        'tabular flex h-10 min-w-[6.5rem] items-center justify-end rounded-[8px] px-3 font-[family-name:var(--font-mono)] text-[22px] font-semibold tracking-tight transition-colors duration-150',
        active
          ? low
            ? 'bg-loss text-fg-inverse'
            : 'bg-fg text-fg-inverse'
          : 'bg-surface-2 text-fg-muted',
      )}
      role="timer"
      aria-live="off"
    >
      {formatClock(ms)}
    </div>
  );
}

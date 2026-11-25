import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'gold' | 'win' | 'loss' | 'draw' | 'info' | 'warn';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-fg-muted',
  gold: 'bg-gold-500/15 text-gold-300 ring-1 ring-inset ring-gold-500/25',
  win: 'bg-win/15 text-win',
  loss: 'bg-loss/15 text-loss',
  draw: 'bg-draw/15 text-draw',
  info: 'bg-info/15 text-info',
  warn: 'bg-warn/15 text-warn',
};

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
  title,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold leading-none whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** "Stage N" marker for features that are designed but not built yet. */
export function ComingSoon({ stage, className }: { stage: number; className?: string }) {
  return (
    <Badge tone="neutral" className={className} title={`Arrives in Stage ${stage} of the roadmap`}>
      Stage {stage}
    </Badge>
  );
}

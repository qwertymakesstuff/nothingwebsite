'use client';

import type { Persona } from '@rookery/ai';
import { BotPortrait } from '@/components/avatar/BotPortrait';
import { cn } from '@/lib/cn';

export function PersonaPortrait({ persona, size = 'md', className }: { persona: Persona; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <BotPortrait spec={persona.portrait} name={persona.name} size={size} raven={persona.portrait.raven} className={className} />;
}

/** Animated "thinking" dots shown while the engine searches. */
export function ThinkingIndicator({ active, label = 'Thinking' }: { active: boolean; label?: string }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/12 px-2 py-0.5 text-[11px] font-semibold text-gold-300" role="status" aria-live="polite">
      {label}
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1 animate-bounce rounded-full bg-gold-300" style={{ animationDelay: `${i * 140}ms`, animationDuration: '900ms' }} />
        ))}
      </span>
    </span>
  );
}

/** Horizontal 0–1 meter for personality traits. */
export function TraitMeter({ label, value, left, right }: { label: string; value: number; left: string; right: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-fg-muted">{label}</span>
        <span className="text-fg-subtle">{value < 0.34 ? left : value > 0.66 ? right : 'Balanced'}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-3" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-700 to-gold-400" style={{ width: `${Math.max(4, value * 100)}%` }} />
      </div>
    </div>
  );
}

/** Speech bubble for the opponent's latest line. */
export function SpeechBubble({ text, className }: { text: string; className?: string }) {
  return (
    <div
      key={text}
      className={cn(
        'relative rounded-[12px] bg-surface-2 px-4 py-2.5 text-sm text-fg animate-pop-in before:absolute before:-top-1.5 before:left-6 before:size-3 before:rotate-45 before:bg-surface-2',
        className,
      )}
    >
      &ldquo;{text}&rdquo;
    </div>
  );
}

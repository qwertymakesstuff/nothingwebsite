'use client';

import { TIME_CONTROLS, type RatingCategory } from '@rookery/chess-core';
import { CATEGORY_ICON } from '@/lib/categoryIcons';
import { cn } from '@/lib/cn';
import { CATEGORY_LABEL } from '@/lib/format';

const ORDER: RatingCategory[] = ['bullet', 'blitz', 'rapid', 'classical'];

/** All time controls grouped by category (real catalogue from @rookery/chess-core). */
export function TimeControlPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)} role="radiogroup" aria-label="Time control">
      {ORDER.map((cat) => {
        const items = TIME_CONTROLS.filter((t) => t.category === cat);
        if (!items.length) return null;
        const Icon = CATEGORY_ICON[cat];
        return (
          <div key={cat}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-fg-subtle">
              <Icon className="size-3.5 text-gold-400" aria-hidden />
              {CATEGORY_LABEL[cat]}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {items.map((t) => (
                <TimeChip key={t.id} id={t.id} label={t.label} selected={value === t.id} onSelect={onChange} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TimeChip({
  id,
  label,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(id)}
      className={cn(
        'tabular h-10 rounded-[var(--radius-control)] px-1 text-sm font-semibold transition-[background-color,box-shadow,color] duration-150',
        selected
          ? 'bg-gold-500/15 text-gold-200 shadow-[0_0_0_1.5px_var(--color-gold-500)_inset]'
          : 'bg-surface-3 text-fg-muted hover:bg-surface-4 hover:text-fg',
      )}
    >
      {label}
    </button>
  );
}

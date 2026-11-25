'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Accessible on/off switch with a label and optional description. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-6 py-3', disabled && 'opacity-50')}>
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {description && <p className="mt-0.5 text-[13px] text-fg-subtle">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150',
          checked ? 'bg-gold-500' : 'bg-surface-4',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-fg shadow transition-transform duration-150 ease-[var(--ease-out)]',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

/** Row of mutually exclusive options (e.g. play as White / Random / Black). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex rounded-[var(--radius-control)] bg-surface-3 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold transition-colors duration-150',
            value === o.value ? 'bg-surface-1 text-fg shadow-[0_1px_2px_rgb(0_0_0/0.4)]' : 'text-fg-muted hover:text-fg',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

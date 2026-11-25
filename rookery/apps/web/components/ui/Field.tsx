'use client';

import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const inputClass =
  'block h-11 w-full rounded-[var(--radius-control)] border bg-surface-0/60 px-3 text-[15px] text-fg placeholder:text-fg-subtle/70 transition-colors focus:outline-none disabled:opacity-60';

/** Labelled text input with hint and error text wired up for screen readers. */
export function Field({
  label,
  hint,
  error,
  status,
  className,
  ...input
}: { label: ReactNode; hint?: ReactNode; error?: string | null; status?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-fg">
          {label}
        </label>
        {status && <span className="text-xs">{status}</span>}
      </div>
      <input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        className={cn(inputClass, error ? 'border-loss/70 focus:border-loss' : 'border-line focus:border-gold-500/60')}
        {...input}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-fg-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-loss" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Form-level message (success, error or info). */
export function FormMessage({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-[var(--radius-control)] border px-3.5 py-2.5 text-sm',
        tone === 'error' && 'border-loss/40 bg-loss/10 text-loss',
        tone === 'success' && 'border-win/40 bg-win/10 text-win',
        tone === 'info' && 'border-info/40 bg-info/10 text-info',
      )}
    >
      {children}
    </div>
  );
}

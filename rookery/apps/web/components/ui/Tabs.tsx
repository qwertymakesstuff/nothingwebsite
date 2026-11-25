'use client';

// WAI-ARIA tabs: arrow keys move between tabs, only the active panel is rendered.
// Use controlled (value/onChange) or uncontrolled (defaultValue).

import { useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
  content: ReactNode;
}

export function Tabs<T extends string>({
  items,
  value,
  defaultValue,
  onChange,
  variant = 'underline',
  label,
  className,
  listClassName,
  panelClassName,
}: {
  items: TabItem<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
  variant?: 'underline' | 'pill';
  label: string;
  className?: string;
  listClassName?: string;
  panelClassName?: string;
}) {
  const [inner, setInner] = useState<T>(defaultValue ?? items[0]!.value);
  const active = value ?? inner;
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (v: T) => {
    setInner(v);
    onChange?.(v);
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next >= 0) {
      e.preventDefault();
      select(items[next]!.value);
      refs.current[next]?.focus();
    }
  };

  const current = items.find((t) => t.value === active) ?? items[0]!;

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          'rk-scroll flex overflow-x-auto',
          variant === 'underline' ? 'gap-1 border-b border-line' : 'gap-1 rounded-[var(--radius-control)] bg-surface-3 p-1',
          listClassName,
        )}
      >
        {items.map((t, i) => {
          const selected = t.value === active;
          return (
            <button
              key={t.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${base}-tab-${t.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${base}-panel-${t.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.value)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                'flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-semibold transition-colors duration-150',
                variant === 'underline'
                  ? cn(
                      '-mb-px border-b-2 px-3 py-2.5',
                      selected ? 'border-gold-400 text-fg' : 'border-transparent text-fg-subtle hover:text-fg-muted',
                    )
                  : cn(
                      'h-8 flex-1 justify-center rounded-[8px] px-3',
                      selected ? 'bg-surface-1 text-fg shadow-[0_1px_2px_rgb(0_0_0/0.4)]' : 'text-fg-muted hover:text-fg',
                    ),
              )}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className="tabular rounded-full bg-surface-3 px-1.5 text-[11px] text-fg-subtle">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${current.value}`}
        aria-labelledby={`${base}-tab-${current.value}`}
        tabIndex={0}
        className={cn('outline-none', panelClassName)}
      >
        {current.content}
      </div>
    </div>
  );
}

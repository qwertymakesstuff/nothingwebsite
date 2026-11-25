'use client';

// Two keyboard-accessible popovers:
//  - <Menu>: a button that opens a list of actions/links (role="menu").
//  - <Select>: a styled single-choice picker (role="listbox").
// Both close on outside click, Esc and selection, and support arrow keys.

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

function useDismiss(open: boolean, close: () => void, root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close, root]);
}

function moveFocus(container: HTMLElement | null, dir: 1 | -1 | 'first' | 'last') {
  if (!container) return;
  const items = Array.from(container.querySelectorAll<HTMLElement>('[data-item]:not([aria-disabled="true"])'));
  if (!items.length) return;
  const i = items.indexOf(document.activeElement as HTMLElement);
  const next =
    dir === 'first' ? 0 : dir === 'last' ? items.length - 1 : (i + dir + items.length) % items.length;
  items[next]?.focus();
}

const panel =
  'absolute z-50 mt-2 min-w-48 overflow-hidden rounded-[12px] border border-line-strong bg-surface-2 p-1 shadow-[var(--shadow-pop)] animate-pop-in';
const itemCls =
  'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-sm text-fg-muted outline-none hover:bg-surface-3 hover:text-fg focus:bg-surface-3 focus:text-fg aria-disabled:pointer-events-none aria-disabled:opacity-45';

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  hint?: ReactNode;
  separatorBefore?: boolean;
}

export function Menu({
  trigger,
  items,
  align = 'end',
  label,
  header,
}: {
  trigger: (props: { open: boolean }) => ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  label: string;
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, root);

  useEffect(() => {
    if (open) requestAnimationFrame(() => moveFocus(list.current, 'first'));
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(list.current, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(list.current, -1);
    } else if (e.key === 'Home') moveFocus(list.current, 'first');
    else if (e.key === 'End') moveFocus(list.current, 'last');
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKey}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="rounded-[var(--radius-control)]"
      >
        {trigger({ open })}
      </button>
      {open && (
        <div ref={list} id={id} role="menu" aria-label={label} className={cn(panel, align === 'end' ? 'right-0' : 'left-0')}>
          {header}
          {items.map((it, i) => {
            const content = (
              <>
                {it.icon && <span className="text-fg-subtle">{it.icon}</span>}
                <span className="flex-1">{it.label}</span>
                {it.hint && <span className="text-xs text-fg-subtle">{it.hint}</span>}
              </>
            );
            return (
              <div key={i}>
                {it.separatorBefore && <div className="my-1 h-px bg-line" role="separator" />}
                {it.href && !it.disabled ? (
                  <Link href={it.href} role="menuitem" data-item tabIndex={-1} className={itemCls} onClick={close}>
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    data-item
                    tabIndex={-1}
                    aria-disabled={it.disabled || undefined}
                    className={itemCls}
                    onClick={() => {
                      if (it.disabled) return;
                      it.onSelect?.();
                      close();
                    }}
                  >
                    {content}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; description?: ReactNode }[];
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, root);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const sel = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      (sel ?? list.current?.querySelector<HTMLElement>('[data-item]'))?.focus();
    });
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      setOpen(false);
      btn.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(list.current, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(list.current, -1);
    } else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={root} className={cn('relative', className)} onKeyDown={onKey}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line bg-surface-3 px-3 text-sm text-fg hover:border-line-strong"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown className={cn('size-4 text-fg-subtle transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div ref={list} id={id} role="listbox" aria-label={label} className={cn(panel, 'left-0 w-full')}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              data-item
              tabIndex={-1}
              aria-selected={o.value === value}
              className={itemCls}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
                btn.current?.focus();
              }}
            >
              <span className="flex-1">
                <span className="block text-fg">{o.label}</span>
                {o.description && <span className="block text-xs text-fg-subtle">{o.description}</span>}
              </span>
              {o.value === value && <Check className="size-4 text-gold-400" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

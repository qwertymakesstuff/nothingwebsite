import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The right-hand panel next to a board: a titled column that fills the board's height on
 * desktop, with a scrolling body and a pinned footer for controls.
 */
export function GamePanel({
  title,
  icon,
  action,
  children,
  footer,
  className,
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-1/95 shadow-[var(--shadow-card)]',
        'lg:h-[min(calc(100dvh-6.5rem),52rem)]',
        className,
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-5">
        {icon && <span className="text-gold-400">{icon}</span>}
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold">{title}</h1>
        {action && <div className="ml-auto">{action}</div>}
      </header>
      <div className="rk-scroll flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      {footer && <footer className="shrink-0 border-t border-line p-3">{footer}</footer>}
    </section>
  );
}

/** Labelled key/value rows for game information (event, time control, result, etc.). */
export function InfoList({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
          <dt className="text-fg-subtle">{it.label}</dt>
          <dd className="text-right font-medium text-fg">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

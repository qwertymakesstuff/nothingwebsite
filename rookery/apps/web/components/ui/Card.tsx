import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  interactive,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-surface-1/92 shadow-[var(--shadow-card)] backdrop-blur-[2px]',
        interactive && 'transition-colors duration-150 hover:border-line-strong hover:bg-surface-2/90',
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  eyebrow,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 px-5 pt-4 pb-3', className)}>
      {icon && <span className="text-gold-400">{icon}</span>}
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">{eyebrow}</p>}
        <h2 className="truncate text-[15px] font-semibold text-fg">{title}</h2>
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-t border-line px-5 py-3', className)} {...rest} />;
}

/** Small labelled number, e.g. a rating with its change. */
export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
        {icon}
        {label}
      </p>
      <p className="tabular mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold leading-none text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

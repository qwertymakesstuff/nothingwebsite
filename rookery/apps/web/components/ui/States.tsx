import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-gold-400', className)} aria-label={label} role="status" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rk-skeleton rounded-md', className)} aria-hidden />;
}

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-12 text-sm text-fg-muted', className)}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-surface-3 text-gold-400">{icon}</div>
      )}
      <p className="font-semibold text-fg">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-fg-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  children,
  action,
  className,
}: {
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-loss/12 text-loss">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="font-semibold text-fg">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-fg-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

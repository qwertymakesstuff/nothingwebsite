import { FlaskConical } from 'lucide-react';
import type { DataSource } from '@/lib/types';
import { cn } from '@/lib/cn';

/**
 * Shown wherever content comes from lib/sample instead of a real backend.
 * Renders nothing once the data source is 'live'.
 */
export function SampleNotice({
  source,
  variant = 'badge',
  children,
  className,
}: {
  source: DataSource;
  variant?: 'badge' | 'banner';
  children?: React.ReactNode;
  className?: string;
}) {
  if (source !== 'sample') return null;
  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex h-5 items-center gap-1 rounded-full border border-dashed border-info/40 px-2 text-[11px] font-semibold text-info',
          className,
        )}
        title="Example content: this will show real data once the backend for this feature is built."
      >
        <FlaskConical className="size-3" aria-hidden />
        Sample
      </span>
    );
  }
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-info/35 bg-info/[0.06] px-4 py-3 text-sm text-fg-muted',
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
      <p>
        <span className="font-semibold text-info">Preview with sample data.</span>{' '}
        {children ?? 'Players, ratings and games on this page are examples so you can see the layout.'}
      </p>
    </div>
  );
}

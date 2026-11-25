import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Consistent page title block. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end gap-4 lg:mb-8', className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">{eyebrow}</p>}
        <h1 className="font-[family-name:var(--font-display)] text-[28px] leading-tight font-semibold tracking-[-0.01em] text-fg sm:text-[34px]">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

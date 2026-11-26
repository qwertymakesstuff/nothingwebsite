import type { ReactNode } from 'react';
import { LogoMark } from '@/components/Logo';

/** Centred card used by every sign-in / sign-up / recovery page. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md py-6 sm:py-12">
      <div className="rounded-[20px] border border-line bg-surface-1/95 p-6 shadow-[var(--shadow-pop)] sm:p-8">
        <LogoMark className="size-10" />
        <h1 className="mt-5 font-[family-name:var(--font-display)] text-[28px] leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-fg-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-fg-muted">{footer}</div>}
    </div>
  );
}

/** Where to go after signing in: only same-site paths are honoured (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

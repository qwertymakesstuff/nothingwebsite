'use client';

import { Menu as MenuIcon, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Logo, LogoMark } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { isActive, PRIMARY_NAV, SECONDARY_NAV, type NavItem } from '@/lib/nav';
import { RestrictionBanner } from '@/components/moderation/RestrictionBanner';
import { NotificationBell } from '@/components/social/Notifications';
import { AccountMenu } from './AccountMenu';

/**
 * Site frame. Desktop (≥1280px): full sidebar. Tablet (≥768px): icon rail.
 * Phone: top bar + bottom tab bar, with a drawer for everything else.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  return (
    <div className="rk-backdrop min-h-dvh">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-gold-400 px-3 py-2 font-semibold text-fg-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* ── Sidebar (tablet rail / desktop full) ── */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col border-r border-line bg-surface-1/88 px-3 py-4 backdrop-blur-md md:flex xl:w-[248px] xl:px-4"
        aria-label="Sidebar"
      >
        <Link href="/" className="mb-7 flex h-10 items-center justify-center rounded-[var(--radius-control)] xl:justify-start xl:px-2" aria-label="Rookery home">
          <span className="xl:hidden">
            <LogoMark className="size-9" />
          </span>
          <span className="hidden xl:block">
            <Logo />
          </span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {SECONDARY_NAV.map((item) => (
            <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
          <div className="mt-2 border-t border-line pt-3">
            <div className="hidden items-center gap-1 xl:flex">
              <div className="min-w-0 flex-1">
                <AccountMenu align="start" side="top" />
              </div>
              <NotificationBell />
            </div>
            <div className="flex flex-col items-center gap-1 xl:hidden">
              <NotificationBell />
              <AccountMenu compact align="start" side="top" />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface-1/92 px-4 backdrop-blur-md md:hidden">
        <button
          type="button"
          className="-ml-1 grid size-10 place-items-center rounded-[var(--radius-control)] text-fg-muted hover:bg-surface-2"
          aria-label="Open menu"
          aria-expanded={drawer}
          onClick={() => setDrawer(true)}
        >
          <MenuIcon className="size-5" />
        </button>
        <Link href="/" aria-label="Rookery home">
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <AccountMenu compact />
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-line bg-surface-1 p-4 shadow-[var(--shadow-pop)] animate-pop-in">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button
                type="button"
                className="grid size-10 place-items-center rounded-[var(--radius-control)] text-fg-muted hover:bg-surface-2"
                aria-label="Close menu"
                onClick={() => setDrawer(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            {/* Close straight away on tap rather than waiting for the next page to load. */}
            <nav aria-label="Main" className="flex flex-col gap-1" onClick={(e) => (e.target as HTMLElement).closest('a') && setDrawer(false)}>
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
                <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} wide />
              ))}
            </nav>
            <div className="mt-auto space-y-1 border-t border-line pt-3 text-sm">
              <FooterLinks />
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="md:pl-[76px] xl:pl-[248px]">
        <main id="main" className="mx-auto w-full max-w-[1480px] px-4 pt-5 pb-28 sm:px-6 md:pb-10 lg:px-8 lg:pt-7">
          <RestrictionBanner />
          {children}
        </main>
        <footer className="mx-auto hidden max-w-[1480px] items-center gap-6 border-t border-line px-8 py-6 text-[13px] text-fg-subtle md:flex">
          <span className="flex items-center gap-2">
            <LogoMark className="size-5" /> Rookery · free, open-source chess
          </span>
          <span className="ml-auto flex gap-5">
            <FooterLinks />
          </span>
        </footer>
      </div>

      {/* ── Mobile tab bar ── */}
      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        {PRIMARY_NAV.filter((i) => i.mobile).map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold',
                active ? 'text-gold-300' : 'text-fg-subtle',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {item.short ?? item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-fg-subtle"
        >
          <MenuIcon className="size-5" aria-hidden />
          More
        </button>
      </nav>
    </div>
  );
}

function SideLink({ item, active, wide }: { item: NavItem; active: boolean; wide?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      title={item.label}
      className={cn(
        'group relative flex h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-[15px] font-semibold transition-colors duration-150',
        !wide && 'justify-center xl:justify-start',
        active ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
      )}
    >
      {active && <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-full bg-gold-400" aria-hidden />}
      <Icon className={cn('size-5 shrink-0', active ? 'text-gold-300' : 'text-fg-subtle group-hover:text-fg-muted')} aria-hidden />
      <span className={cn(!wide && 'sr-only xl:not-sr-only')}>{item.label}</span>
    </Link>
  );
}

function FooterLinks() {
  return (
    <>
      <Link href="/licenses" className="block rounded-md px-2 py-1.5 text-fg-subtle hover:text-fg md:inline md:p-0">
        Licenses
      </Link>
      <Link href="/design" className="block rounded-md px-2 py-1.5 text-fg-subtle hover:text-fg md:inline md:p-0">
        Design system
      </Link>
      <a href="https://missing.website/" className="block rounded-md px-2 py-1.5 text-fg-subtle hover:text-fg md:inline md:p-0">
        missing.website
      </a>
    </>
  );
}

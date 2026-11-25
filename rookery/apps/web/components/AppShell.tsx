import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo, LogoMark } from './Logo';

// Navigation. Items without `href` are planned features, shown disabled until their phase ships.
const NAV: { label: string; href?: string; icon: string }[] = [
  { label: 'Play', href: '/', icon: '♞' },
  { label: 'Puzzles', icon: '✦' },
  { label: 'Bots', icon: '◉' },
  { label: 'Tournaments', icon: '♛' },
  { label: 'Leaderboard', icon: '▲' },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="rk-backdrop min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-52 flex-col border-r border-white/5 bg-ink-900/90 px-3 py-4 backdrop-blur md:flex">
        <Link href="/" className="mb-6 px-2">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/5 pt-3 text-sm text-ink-400">
          <Link href="/licenses" className="block rounded-md px-2 py-1.5 hover:bg-ink-800 hover:text-ink-50">
            Licenses
          </Link>
          <a href="https://missing.website/" className="block rounded-md px-2 py-1.5 hover:bg-ink-800 hover:text-ink-50">
            ← missing.website
          </a>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-ink-900/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" aria-label="Rookery home">
          <LogoMark />
        </Link>
        <span className="font-[family-name:var(--font-display)] text-lg font-bold">Rookery</span>
        <Link href="/licenses" className="ml-auto text-sm text-ink-400">
          Licenses
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:pl-60 md:pr-8">{children}</main>
    </div>
  );
}

function NavItem({ label, href, icon }: { label: string; href?: string; icon: string }) {
  const inner = (
    <>
      <span className="w-5 text-center text-lg text-ember-400" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
      {!href && <span className="ml-auto rounded bg-ink-800 px-1.5 py-0.5 text-[10px] uppercase text-ink-400">soon</span>}
    </>
  );
  const cls = 'flex items-center gap-3 rounded-md px-2 py-2 font-semibold';
  return href ? (
    <Link href={href} className={`${cls} text-ink-50 hover:bg-ink-800`}>
      {inner}
    </Link>
  ) : (
    <span className={`${cls} cursor-default text-ink-400`} aria-disabled="true">
      {inner}
    </span>
  );
}

// Rookery mark: an original rook silhouette with a perched bird (a rookery is a colony of rooks).

export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        fill="var(--color-ember-500)"
        d="M7 27h18v3H7zM9 24h14l-1.5-3h-11zM11 20h10l-1-9h-8zM8 6h3v2h2V6h2.2v2h1.6V6H19v2h2V6h3v5H8z"
      />
      <path fill="var(--color-ink-50)" d="M19.5 3.2c1.2-.9 3-.8 4 .2l2.3-.4-1.7 1.3c0 1.3-.9 2.2-2.2 2.4l-2.6.3.9-1.2-1.7-.3z" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">Rookery</span>
    </span>
  );
}

import { cn } from '@/lib/cn';

const SIZES = { xs: 'size-6 text-[10px]', sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-24 text-3xl' };

// Warm, desaturated pairs so avatars sit quietly on the charcoal UI.
const PALETTE: [string, string][] = [
  ['#6b5a45', '#3e3326'],
  ['#4f6b5a', '#2f4236'],
  ['#5d5a7a', '#36344a'],
  ['#7a5a6b', '#4a3441'],
  ['#4b5b6e', '#2c3644'],
  ['#6e5d3e', '#433722'],
  ['#5a6e64', '#33423b'],
  ['#8a4b45', '#552c28'],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.replace(/[_\-.]+/g, ' ').trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '?';
  const b = parts.length > 1 ? parts[parts.length - 1]![0] : parts[0]?.[1];
  return (a + (b ?? '')).toUpperCase();
}

/**
 * Player avatar. Shows `src` when a player has uploaded one (Stage 2), otherwise initials on
 * a colour derived from the username, so it stays the same everywhere.
 */
export function PlayerAvatar({
  name,
  src,
  size = 'md',
  online,
  className,
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  className?: string;
}) {
  const [a, b] = PALETTE[hash(name) % PALETTE.length]!;
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={cn(SIZES[size], 'rounded-[28%] object-cover')} />
      ) : (
        <span
          aria-hidden
          className={cn(
            SIZES[size],
            'grid place-items-center rounded-[28%] font-semibold tracking-wide text-fg/90 ring-1 ring-inset ring-white/10',
          )}
          style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface-1',
            online ? 'bg-win' : 'bg-surface-4',
          )}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </span>
  );
}

/** Small country marker: two-letter code (flag emoji don't render on Windows). */
export function CountryTag({ code, className }: { code?: string; className?: string }) {
  if (!code) return null;
  return (
    <span
      className={cn(
        'inline-flex h-4 items-center rounded-[4px] bg-surface-3 px-1 text-[10px] font-bold tracking-wider text-fg-subtle',
        className,
      )}
      title={code}
    >
      {code.toUpperCase()}
    </span>
  );
}

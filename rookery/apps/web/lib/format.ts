import type { Category, GameResult, Side } from './types';

export const CATEGORY_LABEL: Record<Category, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
  puzzle: 'Puzzles',
};

export function formatRating(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString('en-US');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 25, 2026". Deterministic (no locale/timezone differences between build and browser). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "Nov 2026" */
export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Clock display: 5:00, 0:42, 0:09.4 under ten seconds, 1:02:03 over an hour. */
export function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 10_000) return `0:0${(Math.floor(clamped / 100) / 10).toFixed(1)}`; // floors, so never "10.0"
  const total = Math.ceil(clamped / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Result from one player's point of view. */
export function outcomeFor(result: GameResult, side: Side): 'win' | 'loss' | 'draw' {
  if (result === '1/2-1/2') return 'draw';
  return (result === '1-0') === (side === 'white') ? 'win' : 'loss';
}

export function countryName(code?: string): string | undefined {
  if (!code) return undefined;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase());
  } catch {
    return code.toUpperCase();
  }
}

import { ROSTER } from './personas';
import { displayRating, numericRating, TIERS, type Tier } from './schema';

const INFO: Record<Tier, { name: string; blurb: string }> = {
  newcomer: { name: 'Newcomer', blurb: 'Learning how the pieces move. Very forgiving.' },
  casual: { name: 'Casual', blurb: 'Knows the basics and still leaves pieces hanging.' },
  club: { name: 'Club', blurb: 'Solid fundamentals; punishes loose play.' },
  expert: { name: 'Expert', blurb: 'Strong, with a clear personal style.' },
  master: { name: 'Master', blurb: 'Near-perfect play. Bring your best.' },
};

export interface TierInfo {
  id: Tier;
  name: string;
  blurb: string;
  /** Rating span of the opponents currently in the tier, e.g. "900–1220". */
  range: string;
}

/** Tiers in order, with their rating ranges derived from the roster (so they never go stale). */
export function tierInfo(): TierInfo[] {
  return TIERS.map((id) => {
    const members = ROSTER.filter((p) => p.tier === id);
    const lo = members[0];
    const hi = members[members.length - 1];
    const range = !lo || !hi ? '' : lo === hi ? displayRating(lo) : `${displayRating(lo)}–${numericRating(hi) >= 3200 ? '3000+' : displayRating(hi)}`;
    return { id, ...INFO[id], range };
  }).filter((t) => t.range);
}

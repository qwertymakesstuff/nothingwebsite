// Static data that ships with the site. Everything about players (profiles, ratings, games,
// statistics, achievements, puzzles, tournaments) is real and comes from Supabase through
// lib/db.ts and lib/platform.ts.

import { ROSTER, tierInfo, type Persona, type TierInfo } from '@rookery/ai';
import type { Sourced } from '../types';

// ── Computer opponents (live: the configured roster in packages/ai) ─────────────────────
export function getBots(): Sourced<{ tiers: TierInfo[]; bots: Persona[] }> {
  return { data: { tiers: tierInfo(), bots: [...ROSTER] }, source: 'live' };
}

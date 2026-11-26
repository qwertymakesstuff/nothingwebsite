// Matchmaking: one pool per time control (and rated / casual). Players are paired with the
// closest rating available inside both players' acceptable range, which starts narrow and widens
// the longer they wait, so strong and new players alike are paired quickly but fairly.

export interface Seek {
  userId: string;
  tc: string;
  rated: boolean;
  rating: number;
  since: number;
}

/** Acceptable rating difference after waiting `waitMs`: ±100 at first, +10 per second, then anyone after 60 s. */
export function rangeFor(waitMs: number): number {
  const s = Math.max(0, waitMs) / 1000;
  if (s >= 60) return Infinity;
  return Math.min(600, 100 + Math.floor(s) * 10);
}

export function poolKey(s: Pick<Seek, 'tc' | 'rated'>): string {
  return `${s.tc}:${s.rated ? 'rated' : 'casual'}`;
}

/** Pairs as many seeks as possible, longest-waiting first, each with their closest acceptable opponent. */
export function findPairs(seeks: readonly Seek[], now: number): [Seek, Seek][] {
  const pairs: [Seek, Seek][] = [];
  const taken = new Set<string>();
  const ordered = [...seeks].sort((a, b) => a.since - b.since);
  for (const a of ordered) {
    if (taken.has(a.userId)) continue;
    let best: Seek | null = null;
    for (const b of ordered) {
      if (b === a || taken.has(b.userId) || b.userId === a.userId || poolKey(a) !== poolKey(b)) continue;
      const diff = Math.abs(a.rating - b.rating);
      if (diff > Math.min(rangeFor(now - a.since), rangeFor(now - b.since))) continue;
      if (!best || diff < Math.abs(a.rating - best.rating)) best = b;
    }
    if (best) {
      taken.add(a.userId);
      taken.add(best.userId);
      pairs.push([a, best]);
    }
  }
  return pairs;
}

// Arena tournament rules, as pure functions (unit-tested). The Tournament Durable Object keeps the
// state and calls these.
//
// Scoring (the usual arena rules): win 2, draw 1, loss 0. After two wins in a row a player is
// "on fire": while the streak lasts, wins score 4 and draws 2. Any non-win ends the streak.
// Pairing: players who are waiting (in the tournament page, not in a game) are paired with the
// nearest player in the standings, avoiding an immediate rematch when anyone else is available.

export interface ArenaPlayer {
  userId: string;
  username: string;
  rating: number;
  score: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  streak: number;
  /** Wants to be paired (joined and not paused). */
  active: boolean;
  /** Current game, if playing. */
  gameId: string | null;
  lastOpponent: string | null;
  /** Colour balance: +1 per white game, -1 per black. */
  colorBalance: number;
  joinedAt: number;
}

export type Result = '1-0' | '0-1' | '1/2-1/2';

/** Points for one game from this player's side, given their streak before it. */
export function pointsFor(outcome: 'win' | 'draw' | 'loss', streakBefore: number): number {
  const fire = streakBefore >= 2;
  if (outcome === 'win') return fire ? 4 : 2;
  if (outcome === 'draw') return fire ? 2 : 1;
  return 0;
}

/** Applies a finished game to a player (returns a new object). */
export function applyResult(p: ArenaPlayer, color: 'white' | 'black', result: Result): ArenaPlayer {
  const outcome = result === '1/2-1/2' ? 'draw' : (result === '1-0') === (color === 'white') ? 'win' : 'loss';
  return {
    ...p,
    score: p.score + pointsFor(outcome, p.streak),
    games: p.games + 1,
    wins: p.wins + (outcome === 'win' ? 1 : 0),
    draws: p.draws + (outcome === 'draw' ? 1 : 0),
    losses: p.losses + (outcome === 'loss' ? 1 : 0),
    streak: outcome === 'win' ? p.streak + 1 : 0,
    gameId: null,
  };
}

/** Standings order: score, then fewer games (performance per game), then rating. */
export function standings(players: readonly ArenaPlayer[]): ArenaPlayer[] {
  return [...players].sort((a, b) => b.score - a.score || a.games - b.games || b.rating - a.rating || a.joinedAt - b.joinedAt);
}

/**
 * Pairs the waiting players (`ready`): each with the closest-ranked other waiting player,
 * avoiding last opponents where possible. Colours go to balance each player's history.
 */
export function pairArena(players: readonly ArenaPlayer[], ready: (p: ArenaPlayer) => boolean): { white: ArenaPlayer; black: ArenaPlayer }[] {
  const pool = standings(players).filter((p) => p.active && p.gameId === null && ready(p));
  const taken = new Set<string>();
  const pairs: { white: ArenaPlayer; black: ArenaPlayer }[] = [];
  for (let i = 0; i < pool.length; i++) {
    const a = pool[i]!;
    if (taken.has(a.userId)) continue;
    const candidates = pool.slice(i + 1).filter((b) => !taken.has(b.userId));
    if (!candidates.length) break;
    const fresh = candidates.find((b) => b.userId !== a.lastOpponent && a.userId !== b.lastOpponent);
    // Only two players waiting and they just played: let them play again rather than wait forever.
    const b = fresh ?? candidates[0]!;
    taken.add(a.userId);
    taken.add(b.userId);
    const aWhite = a.colorBalance < b.colorBalance || (a.colorBalance === b.colorBalance && a.rating <= b.rating);
    pairs.push(aWhite ? { white: a, black: b } : { white: b, black: a });
  }
  return pairs;
}

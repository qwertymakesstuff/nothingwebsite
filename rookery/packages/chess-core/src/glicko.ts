// Glicko-2 rating system (Mark Glickman, "Example of the Glicko-2 system", 2022 revision),
// applied after every rated game, treating each game as its own rating period (as lichess does).
// Pure functions: the realtime server computes, the database stores (see record_online_game).

export interface Rating {
  rating: number;
  rd: number;
  volatility: number;
}

/** Score from this player's point of view: 1 win, 0.5 draw, 0 loss. */
export type Score = 0 | 0.5 | 1;

const SCALE = 173.7178;
/** System constant: how much volatility may change. Lichess uses 0.75. */
const TAU = 0.75;
const EPSILON = 0.000001;
/** Where every new player starts (the 1500s below are only Glicko-2’s internal scale centre). */
export const DEFAULT_RATING: Rating = { rating: 500, rd: 350, volatility: 0.06 };
export const MIN_RD = 45;
export const MAX_RD = 350;
/** Above this RD a rating is shown as provisional ("500?"). */
export const PROVISIONAL_RD = 110;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));

/**
 * RD grows while a player is inactive: one step per idle day (capped at MAX_RD), so a rating that
 * hasn't been tested in a while moves faster again.
 */
export function inflateRd(r: Rating, idleDays: number): Rating {
  if (idleDays <= 0) return r;
  const phi = r.rd / SCALE;
  const inflated = Math.sqrt(phi * phi + idleDays * r.volatility * r.volatility) * SCALE;
  return { ...r, rd: Math.min(MAX_RD, inflated) };
}

/** New rating for `player` after one game against `opponent` with `score`. */
export function rate(player: Rating, opponent: Rating, score: Score, tau = TAU): Rating {
  return ratePeriod(player, [{ opponent, score }], tau);
}

/** New rating after one rating period containing `games` (the general Glicko-2 step). */
export function ratePeriod(player: Rating, games: readonly { opponent: Rating; score: Score }[], tau = TAU): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.volatility;

  // Steps 3 and 4: estimated variance v and improvement delta.
  let vInv = 0;
  let sum = 0;
  for (const { opponent, score } of games) {
    const muJ = (opponent.rating - 1500) / SCALE;
    const phiJ = opponent.rd / SCALE;
    const gJ = g(phiJ);
    const e = expected(mu, muJ, phiJ);
    vInv += gJ * gJ * e * (1 - e);
    sum += gJ * (score - e);
  }
  const v = 1 / vInv;
  const delta = v * sum;

  // Step 5: new volatility (Illinois algorithm).
  const a = Math.log(sigma * sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (tau * tau);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * tau) < 0) k++;
    B = a - k * tau;
  }
  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > EPSILON; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else fA /= 2;
    B = C;
    fB = fC;
  }
  const sigmaNew = Math.exp(A / 2);

  // Steps 6-8: new RD and rating.
  const phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muNew = mu + phiNew * phiNew * sum;

  return {
    rating: Math.max(100, Math.min(3500, round2(muNew * SCALE + 1500))),
    rd: round2(Math.max(MIN_RD, Math.min(MAX_RD, phiNew * SCALE))),
    volatility: Math.round(Math.min(0.1, sigmaNew) * 1e6) / 1e6,
  };
}

/** Both players' new ratings after a game. `whiteScore` is 1, 0.5 or 0. */
export function rateGame(white: Rating, black: Rating, whiteScore: Score): { white: Rating; black: Rating } {
  return { white: rate(white, black, whiteScore), black: rate(black, white, (1 - whiteScore) as Score) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Chooses the move to play from the engine's candidates. Strength decides which moves are
// acceptable; personality only decides between acceptable ones. Pure and seedable for tests.

import { gamePhase, moveFeatures, type MoveFeatures } from './features';
import type { Persona } from './schema';
import type { StrengthProfile } from './strength';
import type { Candidate } from './uci';

export type Rng = () => number;

export interface SelectInput {
  fen: string;
  ply: number;
  candidates: Candidate[];
  /** Engine's own choice (with UCI_LimitStrength, already weakened by Stockfish). */
  bestmove: string | null;
  legalMoves: string[];
  profile: StrengthProfile;
  personality: Persona['personality'];
  rng: Rng;
}

export interface Selection {
  uci: string;
  reason: 'engine' | 'style' | 'sample' | 'mistake' | 'random' | 'only-move';
  /** Centipawns lost versus the best candidate (0 when unknown). */
  lossCp: number;
  features: MoveFeatures | null;
}

/** −1..1 preference for a move from aggression and risk. */
export function styleScore(f: MoveFeatures | null, personality: Persona['personality'], evalCp: number): number {
  if (!f) return 0;
  const aggr = personality.aggression * 2 - 1; // −1 calm … +1 aggressive
  const risk = personality.risk * 2 - 1;
  let s = 0;
  s += aggr * (0.45 * Number(f.check) + 0.3 * Number(f.capture) + 0.12 * Math.max(-1, Math.min(2, f.approach)) + 0.15 * Number(f.stormPawn));
  // Cautious players trade down when ahead; gamblers avoid simplifying.
  if (f.trade) s += (evalCp > 100 ? -risk : risk * 0.5) * 0.4;
  if (f.castle) s += (-risk) * 0.2;
  return Math.max(-1, Math.min(1, s));
}

function phaseWeight(fen: string, ply: number, personality: Persona['personality']): number {
  const w = personality.mistakePhases;
  const mean = (w.opening + w.middlegame + w.endgame) / 3 || 1;
  return w[gamePhase(fen, ply)] / mean;
}

export function selectMove(input: SelectInput): Selection {
  const { fen, ply, candidates, bestmove, legalMoves, profile, personality, rng } = input;
  if (legalMoves.length === 1) return { uci: legalMoves[0]!, reason: 'only-move', lossCp: 0, features: moveFeatures(fen, legalMoves[0]!) };

  const legal = new Set(legalMoves);
  const cands = candidates.filter((c) => legal.has(c.uci));
  const best = cands[0];
  const evalCp = best?.score.cp ?? 0;
  const loss = (c: Candidate) => (best ? Math.min(2000, best.score.cp - c.score.cp) : 0);
  const feat = new Map<string, MoveFeatures | null>();
  const f = (uci: string) => {
    if (!feat.has(uci)) feat.set(uci, moveFeatures(fen, uci));
    return feat.get(uci)!;
  };

  if (profile.kind === 'engine') {
    const base = (bestmove && legal.has(bestmove) ? bestmove : best?.uci) ?? legalMoves[0]!;
    const baseCand = cands.find((c) => c.uci === base);
    if (!baseCand) return { uci: base, reason: 'engine', lossCp: 0, features: f(base) };
    // Among moves practically as good as the engine's choice, prefer the persona's style.
    let pick = baseCand;
    let pickUtil = 0;
    for (const c of cands) {
      const diff = c.score.cp - baseCand.score.cp;
      if (diff < -profile.styleWindowCp) continue;
      const util = diff + styleScore(f(c.uci), personality, evalCp) * profile.styleWindowCp;
      if (util > pickUtil + 0.5) {
        pick = c;
        pickUtil = util;
      }
    }
    return { uci: pick.uci, reason: pick === baseCand ? 'engine' : 'style', lossCp: loss(pick), features: f(pick.uci) };
  }

  // Sampled (sub-1320) model.
  const w = phaseWeight(fen, ply, personality);
  const r = rng();
  if (r < profile.randomRate * w || !cands.length) {
    const uci = legalMoves[Math.floor(rng() * legalMoves.length)]!;
    const c = cands.find((x) => x.uci === uci);
    return { uci, reason: 'random', lossCp: c ? loss(c) : 0, features: f(uci) };
  }
  if (r < (profile.randomRate + profile.mistakeRate) * w) {
    const bad = cands.filter((c) => loss(c) >= profile.mistakeMinLossCp && loss(c) < 1500);
    if (bad.length) {
      const c = bad[Math.floor(rng() * bad.length)]!;
      return { uci: c.uci, reason: 'mistake', lossCp: loss(c), features: f(c.uci) };
    }
  }
  // Softmax over (style-adjusted) loss.
  const logits = cands.map((c) => (-loss(c) + styleScore(f(c.uci), personality, evalCp) * profile.styleWindowCp) / profile.temperatureCp);
  const max = Math.max(...logits);
  const weights = logits.map((l) => Math.exp(l - max));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < cands.length; i++) {
    x -= weights[i]!;
    if (x <= 0) return { uci: cands[i]!.uci, reason: 'sample', lossCp: loss(cands[i]!), features: f(cands[i]!.uci) };
  }
  const last = cands[cands.length - 1]!;
  return { uci: last.uci, reason: 'sample', lossCp: loss(last), features: f(last.uci) };
}

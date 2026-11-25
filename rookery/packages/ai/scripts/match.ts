// Engine-vs-engine games for tests and calibration (Node only).

import { Chess } from 'chess.js';
import { boardOutcome, START_FEN } from '@rookery/chess-core';
import type { UciEngine } from '../src/engine';
import type { Persona } from '../src/schema';
import { selectMove, type Rng } from '../src/select';
import { type StrengthProfile } from '../src/strength';

export const NEUTRAL: Persona['personality'] = {
  aggression: 0.5,
  risk: 0.5,
  chattiness: 0,
  mistakePhases: { opening: 1, middlegame: 1, endgame: 1 },
  resign: null,
  acceptDrawWithinCp: null,
  thinking: { minMs: 0, maxMs: 0 },
};

export interface Player {
  label: string;
  profile: StrengthProfile;
  personality?: Persona['personality'];
  /** Custom move chooser (e.g. a BotBrain); overrides profile-based play. */
  choose?: (initialFen: string, moves: string[]) => Promise<string>;
}

export interface GameRecord {
  result: '1-0' | '0-1' | '1/2-1/2';
  reason: string;
  moves: string[];
  plies: number;
  illegal?: string;
}

export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays one game. Throws if any player produces an illegal move. */
export async function playGame(
  white: Player,
  black: Player,
  engines: { white: UciEngine; black: UciEngine; judge: UciEngine },
  opts: { openingSan?: string[]; maxPlies?: number; rng: Rng },
): Promise<GameRecord> {
  const chess = new Chess();
  for (const san of opts.openingSan ?? []) chess.move(san);
  const moves = chess.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
  await engines.white.newGame();
  await engines.black.newGame();
  const maxPlies = opts.maxPlies ?? 220;

  while (moves.length < maxPlies) {
    const outcome = boardOutcome(chess);
    if (outcome) return { result: outcome.result, reason: outcome.termination, moves, plies: moves.length };
    const side = chess.turn() === 'w' ? 'white' : 'black';
    const player = side === 'white' ? white : black;
    const engine = engines[side];
    const legal = chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? ''));
    let uci: string;
    if (player.choose) {
      uci = await player.choose(START_FEN, moves);
    } else {
      const p = player.profile;
      const res = await engine.search({
        fen: START_FEN,
        moves,
        multiPv: Math.min(p.multiPv, legal.length),
        ...(p.kind === 'engine' ? { movetimeMs: p.movetimeMs, uciElo: p.uciElo } : { depth: p.depth, nodes: p.nodeCap }),
      });
      uci = selectMove({
        fen: chess.fen(),
        ply: moves.length,
        candidates: res.candidates,
        bestmove: res.bestmove,
        legalMoves: legal,
        profile: p,
        personality: player.personality ?? NEUTRAL,
        rng: opts.rng,
      }).uci;
    }
    if (!legal.includes(uci)) {
      return { result: side === 'white' ? '0-1' : '1-0', reason: 'illegal', moves, plies: moves.length, illegal: `${player.label} played ${uci} in ${chess.fen()}` };
    }
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    moves.push(uci);
  }
  // Move limit reached: adjudicate with a quick full-strength look.
  const res = await engines.judge.search({ fen: START_FEN, moves, depth: 14 });
  const cp = res.candidates[0]?.score.cp ?? 0;
  const whiteCp = chess.turn() === 'w' ? cp : -cp;
  const result = whiteCp > 300 ? '1-0' : whiteCp < -300 ? '0-1' : '1/2-1/2';
  return { result, reason: 'adjudicated', moves, plies: moves.length };
}

/** Elo difference implied by a score fraction (clamped so 0%/100% stay finite). */
export function eloDiff(score: number): number {
  const p = Math.min(0.97, Math.max(0.03, score));
  return -400 * Math.log10(1 / p - 1);
}

// Thin, immutable-style wrapper around chess.js: the only place in Rookery that knows the rules.
// Moves travel as UCI strings ("e2e4", "e7e8q") everywhere; SAN is for display only.

import { Chess } from 'chess.js';
import type { Color } from './clock';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type Termination =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient'
  | 'repetition'
  | 'fifty-move'
  | 'resign'
  | 'timeout'
  | 'agreement'
  | 'abandon';

export type Result = '1-0' | '0-1' | '1/2-1/2';

export interface Outcome {
  result: Result;
  termination: Termination;
  winner: Color | null;
}

export interface AppliedMove {
  uci: string;
  san: string;
  fen: string;
}

const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function isUci(s: string): boolean {
  return UCI.test(s);
}

/** Replays `moves` (UCI) from `initialFen`. Throws on the first illegal move. */
export function replay(moves: readonly string[], initialFen = START_FEN): Chess {
  const chess = new Chess(initialFen);
  for (const uci of moves) {
    if (!tryMove(chess, uci)) throw new Error(`Illegal move in replay: ${uci}`);
  }
  return chess;
}

/** Applies one UCI move to `chess` (mutates). Returns null if it is malformed or illegal. */
export function tryMove(chess: Chess, uci: string): AppliedMove | null {
  if (!isUci(uci)) return null;
  try {
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? uci[4] : undefined,
    });
    return { uci, san: move.san, fen: chess.fen() };
  } catch {
    return null; // chess.js throws on illegal moves
  }
}

export function sideToMove(chess: Chess): Color {
  return chess.turn() === 'w' ? 'white' : 'black';
}

/** Legal destinations per origin square, the shape chessground's `movable.dests` expects. */
export function legalDests(chess: Chess): Map<string, string[]> {
  const dests = new Map<string, string[]>();
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from);
    if (list) {
      if (!list.includes(m.to)) list.push(m.to);
    } else dests.set(m.from, [m.to]);
  }
  return dests;
}

/** Game-ending state reachable from the board alone (no clocks, resignations or agreements). */
export function boardOutcome(chess: Chess): Outcome | null {
  if (chess.isCheckmate()) {
    const winner: Color = sideToMove(chess) === 'white' ? 'black' : 'white';
    return { result: winner === 'white' ? '1-0' : '0-1', termination: 'checkmate', winner };
  }
  if (chess.isStalemate()) return draw('stalemate');
  if (chess.isInsufficientMaterial()) return draw('insufficient');
  if (chess.isThreefoldRepetition()) return draw('repetition');
  if (chess.isDrawByFiftyMoves()) return draw('fifty-move');
  return null;
}

/**
 * Outcome when `flagged` runs out of time: a loss, unless the opponent has no way to ever
 * checkmate (bare king, or king + a single minor piece), which makes it a draw.
 */
export function timeoutOutcome(chess: Chess, flagged: Color): Outcome {
  const opponent: Color = flagged === 'white' ? 'black' : 'white';
  if (!canEverMate(chess, opponent)) return draw('timeout');
  return { result: opponent === 'white' ? '1-0' : '0-1', termination: 'timeout', winner: opponent };
}

export function resignOutcome(resigning: Color): Outcome {
  const winner: Color = resigning === 'white' ? 'black' : 'white';
  return { result: winner === 'white' ? '1-0' : '0-1', termination: 'resign', winner };
}

function draw(termination: Termination): Outcome {
  return { result: '1/2-1/2', termination, winner: null };
}

function canEverMate(chess: Chess, color: Color): boolean {
  const c = color === 'white' ? 'w' : 'b';
  const pieces = chess
    .board()
    .flat()
    .filter((p): p is NonNullable<typeof p> => p !== null && p.color === c && p.type !== 'k');
  if (pieces.length === 0) return false;
  if (pieces.length === 1 && (pieces[0]!.type === 'n' || pieces[0]!.type === 'b')) return false;
  return true;
}

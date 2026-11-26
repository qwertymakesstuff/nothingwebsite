// Checking a puzzle attempt against its secret solution. Pure, so it is unit-tested; the API
// (src/routes.ts) feeds it the stored puzzle and the solver's moves.

import { Chess } from 'chess.js';
import { tryMove } from '@rookery/chess-core';

export interface StoredPuzzle {
  id: string;
  fen: string;
  /** The opponent's move that sets the puzzle up (shown, not solved). */
  first_move: string;
  /** Solver move, reply, solver move, …, ending with a solver move. */
  solution: string[];
  rating: number;
  rd: number;
  volatility: number;
}

export type PuzzleCheck =
  | { status: 'continue'; reply: string }
  | { status: 'solved' }
  | { status: 'failed' }
  | { status: 'invalid' };

/**
 * `moves` are all the solver's moves so far; every one but the last must already have been
 * accepted (otherwise the request is invalid). The last one is judged: the solution move, or any
 * other move that gives checkmate, is correct.
 */
export function checkPuzzleMoves(p: StoredPuzzle, moves: readonly string[]): PuzzleCheck {
  const solverMoves = Math.ceil(p.solution.length / 2);
  if (moves.length < 1 || moves.length > solverMoves) return { status: 'invalid' };
  const chess = new Chess(p.fen);
  if (!tryMove(chess, p.first_move)) return { status: 'invalid' };
  for (let i = 0; i < moves.length - 1; i++) {
    if (moves[i] !== p.solution[2 * i]) return { status: 'invalid' };
    tryMove(chess, p.solution[2 * i]!);
    tryMove(chess, p.solution[2 * i + 1]!);
  }
  const k = moves.length - 1;
  const expected = p.solution[2 * k]!;
  const played = moves[k]!;
  const last = 2 * k === p.solution.length - 1;
  if (played === expected) return last ? { status: 'solved' } : { status: 'continue', reply: p.solution[2 * k + 1]! };
  const probe = new Chess(chess.fen());
  if (!tryMove(probe, played)) return { status: 'invalid' };
  if (probe.isCheckmate()) return { status: 'solved' };
  return { status: 'failed' };
}

/** The square of the piece the solver should move next (for a hint). */
export function hintSquare(p: StoredPuzzle, solved: number): string | null {
  const m = p.solution[2 * solved];
  return m ? m.slice(0, 2) : null;
}

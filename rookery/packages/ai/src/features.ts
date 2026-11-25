// Cheap, rule-based descriptions of a move, used by personality biases and chat reactions.

import { Chess, type Square } from 'chess.js';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export interface MoveFeatures {
  uci: string;
  san: string;
  capture: boolean;
  capturedValue: number;
  check: boolean;
  mate: boolean;
  promotion: boolean;
  castle: boolean;
  /** Chebyshev distance from the moved piece to the enemy king, before minus after (>0 = closer). */
  approach: number;
  /** Pawn move on the side where the enemy king lives (a pawn storm). */
  stormPawn: boolean;
  /** Queens are traded off or a piece is traded evenly (simplifying). */
  trade: boolean;
}

function kingSquare(chess: Chess, color: 'w' | 'b'): Square | null {
  for (const row of chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

function dist(a: string, b: string): number {
  return Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(a.charCodeAt(1) - b.charCodeAt(1)));
}

export function moveFeatures(fen: string, uci: string): MoveFeatures | null {
  const chess = new Chess(fen);
  const us = chess.turn();
  const them = us === 'w' ? 'b' : 'w';
  const theirKing = kingSquare(chess, them);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = chess.get(from as Square);
  let m;
  try {
    m = chess.move({ from, to, promotion: uci[4] });
  } catch {
    return null;
  }
  const capturedValue = m.captured ? VALUE[m.captured]! : 0;
  const movedValue = VALUE[m.piece]!;
  const kingFile = theirKing ? theirKing.charCodeAt(0) - 97 : 4;
  const fileIdx = to.charCodeAt(0) - 97;
  return {
    uci,
    san: m.san,
    capture: !!m.captured,
    capturedValue,
    check: chess.inCheck(),
    mate: chess.isCheckmate(),
    promotion: !!m.promotion,
    castle: m.san.startsWith('O-O'),
    approach: theirKing && piece ? dist(from, theirKing) - dist(to, theirKing) : 0,
    stormPawn: m.piece === 'p' && Math.abs(fileIdx - kingFile) <= 1 && !m.captured,
    trade: !!m.captured && capturedValue > 0 && Math.abs(capturedValue - movedValue) <= 1,
  };
}

/** Game phase from material (excluding kings and pawns). */
export function gamePhase(fen: string, ply: number): 'opening' | 'middlegame' | 'endgame' {
  if (ply < 20) return 'opening';
  const board = fen.split(' ')[0]!;
  let material = 0;
  for (const ch of board) if (/[nbrqNBRQ]/.test(ch)) material += VALUE[ch.toLowerCase()]!;
  return material <= 26 ? 'endgame' : 'middlegame';
}

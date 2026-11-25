import { Chess } from 'chess.js';
import { START_FEN } from '@rookery/chess-core';

export interface Replayed {
  fen: string;
  uci: string[];
  san: string[];
  lastMove?: [string, string];
}

/** Replays SAN moves (e.g. from a PGN) and throws on the first illegal one. */
export function replaySan(sans: readonly string[], initialFen = START_FEN): Replayed {
  const chess = new Chess(initialFen);
  const uci: string[] = [];
  let lastMove: [string, string] | undefined;
  for (const san of sans) {
    const m = chess.move(san); // throws on illegal SAN
    uci.push(m.from + m.to + (m.promotion ?? ''));
    lastMove = [m.from, m.to];
  }
  return { fen: chess.fen(), uci, san: chess.history(), lastMove };
}

/** Splits "1. e4 e5 2. Nf3" style text into SAN tokens. */
export function sanTokens(movetext: string): string[] {
  return movetext
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
}

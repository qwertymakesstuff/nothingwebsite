'use client';

// Post-game review with Stockfish (in the browser): evaluates every position, then classifies
// each move by how much it changed the mover's winning chances, and computes accuracy.
// Win chances and accuracy use the published formulas lichess uses
// (lichess-org/lila: WinPercent.scala, AccuracyPercent.scala), so numbers are comparable.

import { Chess } from 'chess.js';
import type { StoredEval } from './platform';

export const MATE_CP = 100_000;

/** Winning chances (0–100) for White, from a White-relative centipawn score. */
export function winPercent(cpWhite: number): number {
  const cp = Math.max(-1000, Math.min(1000, cpWhite));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Accuracy (0–100) of a move that dropped the mover's win chances by `loss` points. */
export function moveAccuracy(loss: number): number {
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * Math.max(0, loss)) - 3.1669 + 1));
}

export type Judgement = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveReview {
  ply: number;
  san: string;
  uci: string;
  color: 'white' | 'black';
  /** Drop in the mover's winning chances, in percentage points. */
  loss: number;
  accuracy: number;
  judgement: Judgement;
  /** The engine's preferred move (SAN), when different. */
  bestSan: string | null;
  bestUci: string | null;
}

export interface Review {
  moves: MoveReview[];
  accuracy: { white: number | null; black: number | null };
  counts: Record<'white' | 'black', Record<'inaccuracy' | 'mistake' | 'blunder', number>>;
}

/** Turns per-position evaluations (index 0 = start) into a move-by-move review. */
export function buildReview(initialFen: string, uciMoves: string[], evals: StoredEval[]): Review {
  const chess = new Chess(initialFen);
  const moves: MoveReview[] = [];
  for (let i = 0; i < uciMoves.length; i++) {
    const uci = uciMoves[i]!;
    const color = chess.turn() === 'w' ? 'white' : 'black';
    const before = evals[i];
    const after = evals[i + 1];
    const best = before?.best ?? null;
    let bestSan: string | null = null;
    if (best && best !== uci) {
      try {
        bestSan = new Chess(chess.fen()).move({ from: best.slice(0, 2), to: best.slice(2, 4), promotion: best[4] }).san;
      } catch {
        bestSan = null;
      }
    }
    const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    let loss = 0;
    if (before && after) {
      const sign = color === 'white' ? 1 : -1;
      loss = Math.max(0, sign * (winPercent(before.cp) - winPercent(after.cp)));
    }
    const judgement: Judgement = best === uci ? 'best' : loss >= 30 ? 'blunder' : loss >= 20 ? 'mistake' : loss >= 10 ? 'inaccuracy' : 'good';
    moves.push({ ply: i + 1, san: m.san, uci, color, loss, accuracy: moveAccuracy(loss), judgement, bestSan: judgement === 'best' ? null : bestSan, bestUci: judgement === 'best' ? null : best });
  }
  const avg = (c: 'white' | 'black') => {
    const xs = moves.filter((m) => m.color === c).map((m) => m.accuracy);
    return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
  };
  const count = (c: 'white' | 'black') => ({
    inaccuracy: moves.filter((m) => m.color === c && m.judgement === 'inaccuracy').length,
    mistake: moves.filter((m) => m.color === c && m.judgement === 'mistake').length,
    blunder: moves.filter((m) => m.color === c && m.judgement === 'blunder').length,
  });
  return { moves, accuracy: { white: avg('white'), black: avg('black') }, counts: { white: count('white'), black: count('black') } };
}

/** Evaluation of a finished position without the engine (mate/stalemate), White-relative. */
export function terminalEval(chess: Chess): StoredEval | null {
  if (chess.isCheckmate()) return { cp: chess.turn() === 'w' ? -MATE_CP : MATE_CP, mate: 0, best: null, pv: [] };
  if (chess.isStalemate() || chess.isInsufficientMaterial() || chess.isThreefoldRepetition() || chess.isDrawByFiftyMoves()) return { cp: 0, mate: null, best: null, pv: [] };
  return null;
}

/** Human-readable evaluation ("+1.3", "#4", "−#2"). */
export function formatEval(e: StoredEval | undefined): string {
  if (!e) return '…';
  if (e.mate !== null) return e.mate === 0 ? '#' : `${e.cp > 0 ? '' : '−'}#${Math.abs(e.mate)}`;
  const v = e.cp / 100;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
}

// ── Opening names (lichess chess-openings, CC0) ───────────────────────────────────────────
let book: Promise<Record<string, [string, string]>> | null = null;
export function loadOpenings(): Promise<Record<string, [string, string]>> {
  book ??= fetch('/data/openings.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  return book;
}
export function positionKey(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}
/** The most specific named opening along a line of UCI moves, and the ply where it was reached. */
export function openingOf(b: Record<string, [string, string]>, initialFen: string, uciMoves: string[]): { eco: string; name: string; ply: number } | null {
  const chess = new Chess(initialFen);
  let found: { eco: string; name: string; ply: number } | null = null;
  for (let i = 0; i < Math.min(uciMoves.length, 40); i++) {
    const u = uciMoves[i]!;
    try {
      chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    } catch {
      break;
    }
    const hit = b[positionKey(chess.fen())];
    if (hit) found = { eco: hit[0], name: hit[1], ply: i + 1 };
  }
  return found;
}

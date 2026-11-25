'use client';

// A game held entirely in this browser: pass-and-play and the analysis board. Real chess
// (chess.js via @rookery/chess-core). Never used for rated or online games: those are
// validated by the realtime server (Stage 4).

import { Chess } from 'chess.js';
import { boardOutcome, legalDests, sideToMove, START_FEN, tryMove, type Outcome } from '@rookery/chess-core';
import { useCallback, useMemo, useState } from 'react';
import { sanTokens } from './chess';
import type { Side } from './types';

export interface LocalGameState {
  initialFen: string;
  /** Full line of moves (UCI). */
  moves: string[];
  /** Number of moves currently shown (0 = initial position). */
  cursor: number;
}

export interface PlyInfo {
  san: string;
  uci: string;
  fenAfter: string;
}

export function useLocalGame(initialFen = START_FEN) {
  const [state, setState] = useState<LocalGameState>({ initialFen, moves: [], cursor: 0 });

  // Replay the whole line once; every ply's SAN and FEN is then available for the move list.
  const line = useMemo(() => {
    const chess = new Chess(state.initialFen);
    const plies: PlyInfo[] = [];
    for (const uci of state.moves) {
      const m = tryMove(chess, uci);
      if (!m) break;
      plies.push({ san: m.san, uci, fenAfter: m.fen });
    }
    return plies;
  }, [state.initialFen, state.moves]);

  const view = useMemo(() => {
    const fen = state.cursor === 0 ? state.initialFen : line[state.cursor - 1]!.fenAfter;
    const chess = new Chess(fen);
    const last = state.cursor > 0 ? line[state.cursor - 1]!.uci : undefined;
    return {
      chess,
      fen,
      turn: sideToMove(chess) as Side,
      dests: legalDests(chess),
      check: chess.inCheck(),
      outcome: boardOutcome(chess) as Outcome | null,
      lastMove: last ? ([last.slice(0, 2), last.slice(2, 4)] as [string, string]) : undefined,
    };
  }, [state.cursor, state.initialFen, line]);

  const atEnd = state.cursor === line.length;

  /** Whether moving from→to is a pawn promotion (so the UI must ask which piece). */
  const isPromotion = useCallback(
    (from: string, to: string) => {
      const piece = view.chess.get(from as never);
      return piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    },
    [view.chess],
  );

  /** Plays a move from the shown position. If not at the end, the later moves are replaced. */
  const play = useCallback(
    (from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n') => {
      const uci = from + to + (promotion ?? '');
      if (!tryMove(new Chess(view.fen), uci)) return false;
      setState((s) => {
        const kept = s.moves.slice(0, s.cursor);
        return { ...s, moves: [...kept, uci], cursor: kept.length + 1 };
      });
      return true;
    },
    [view.fen],
  );

  /**
   * Appends a move at the end of the game, whatever position is being viewed, and jumps to it.
   * Used for opponents' moves (computer, or later the server), which must never truncate history.
   */
  const push = useCallback(
    (uci: string) => {
      const endFen = line.length ? line[line.length - 1]!.fenAfter : state.initialFen;
      if (!tryMove(new Chess(endFen), uci)) return false;
      setState((s) => ({ ...s, moves: [...s.moves, uci], cursor: s.moves.length + 1 }));
      return true;
    },
    [line, state.initialFen],
  );

  /** Removes the last `n` moves (takebacks) and shows the new final position. */
  const takeBack = useCallback(
    (n: number) =>
      setState((s) => {
        const moves = s.moves.slice(0, Math.max(0, s.moves.length - n));
        return { ...s, moves, cursor: moves.length };
      }),
    [],
  );

  /** Starts a new game from `fen`, optionally after a sequence of SAN moves (an opening). */
  const start = useCallback((fen = START_FEN, openingSan: string[] = []) => {
    const chess = new Chess(fen);
    const moves: string[] = [];
    for (const san of openingSan) {
      const m = chess.move(san);
      moves.push(m.from + m.to + (m.promotion ?? ''));
    }
    setState({ initialFen: fen, moves, cursor: moves.length });
  }, []);

  const goTo = useCallback(
    (ply: number) => setState((s) => ({ ...s, cursor: Math.max(0, Math.min(ply, line.length)) })),
    [line.length],
  );

  const undo = useCallback(
    () => setState((s) => (s.moves.length ? { ...s, moves: s.moves.slice(0, -1), cursor: Math.min(s.cursor, s.moves.length - 1) } : s)),
    [],
  );

  const reset = useCallback((fen = START_FEN) => setState({ initialFen: fen, moves: [], cursor: 0 }), []);

  /** Loads a FEN. Returns an error message, or null on success. */
  const loadFen = useCallback((fen: string): string | null => {
    try {
      new Chess(fen.trim());
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid FEN';
    }
    setState({ initialFen: fen.trim(), moves: [], cursor: 0 });
    return null;
  }, []);

  /** Loads PGN movetext (headers allowed; variations ignored). Returns an error, or null. */
  const loadPgn = useCallback((pgn: string): string | null => {
    const fenTag = pgn.match(/\[FEN "([^"]+)"\]/)?.[1];
    const body = pgn.replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ');
    const chess = new Chess(fenTag ?? START_FEN);
    const moves: string[] = [];
    for (const san of sanTokens(body)) {
      try {
        const m = chess.move(san);
        moves.push(m.from + m.to + (m.promotion ?? ''));
      } catch {
        return `Couldn't read move ${Math.floor(moves.length / 2) + 1}${moves.length % 2 ? '…' : '.'} ${san}`;
      }
    }
    if (!moves.length) return 'No moves found in that PGN.';
    setState({ initialFen: fenTag ?? START_FEN, moves, cursor: moves.length });
    return null;
  }, []);

  /** Current line as PGN movetext. */
  const pgn = useMemo(() => {
    const chess = new Chess(state.initialFen);
    for (const p of line) chess.move({ from: p.uci.slice(0, 2), to: p.uci.slice(2, 4), promotion: p.uci[4] });
    return chess.pgn();
  }, [line, state.initialFen]);

  return { state, line, view, atEnd, isPromotion, play, push, takeBack, start, goTo, undo, reset, loadFen, loadPgn, pgn, endFen: line.length ? line[line.length - 1]!.fenAfter : state.initialFen };
}

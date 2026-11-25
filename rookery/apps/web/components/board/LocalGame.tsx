'use client';

// Pass-and-play on one device. Phase 0 smoke test of board + chess-core; promotion picker,
// clocks and the move list arrive in Phase 1.

import { Chess } from 'chess.js';
import { boardOutcome, legalDests, sideToMove, tryMove, type Outcome } from '@rookery/chess-core';
import { useMemo, useState } from 'react';
import { ChessBoard } from './ChessBoard';

export function LocalGame() {
  const [moves, setMoves] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);

  const state = useMemo(() => {
    const chess = new Chess();
    let last: [string, string] | undefined;
    for (const uci of moves) {
      tryMove(chess, uci);
      last = [uci.slice(0, 2), uci.slice(2, 4)];
    }
    return {
      chess,
      fen: chess.fen(),
      turn: sideToMove(chess),
      dests: legalDests(chess),
      outcome: boardOutcome(chess),
      check: chess.inCheck(),
      last,
      sans: chess.history(),
    };
  }, [moves]);

  function onMove(from: string, to: string) {
    const piece = state.chess.get(from as never);
    const promotes = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    const uci = from + to + (promotes ? 'q' : '');
    if (tryMove(new Chess(state.fen), uci)) setMoves((m) => [...m, uci]);
  }

  return (
    <div className="flex flex-col gap-3">
      <ChessBoard
        fen={state.fen}
        orientation={flipped ? 'black' : 'white'}
        turnColor={state.turn}
        movableColor={state.outcome ? undefined : 'both'}
        dests={state.outcome ? new Map() : state.dests}
        lastMove={state.last}
        check={state.check}
        onMove={onMove}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="w-full text-ink-200 sm:mr-auto sm:w-auto" aria-live="polite">
          {state.outcome ? describe(state.outcome) : `${capitalise(state.turn)} to move`}
        </span>
        <button className={btnGhost} onClick={() => setMoves((m) => m.slice(0, -1))} disabled={!moves.length}>
          Undo
        </button>
        <button className={btnGhost} onClick={() => setFlipped((f) => !f)}>
          Flip
        </button>
        <button className={btnGhost} onClick={() => setMoves([])} disabled={!moves.length}>
          Reset
        </button>
      </div>
      {state.sans.length > 0 && (
        <p className="font-mono text-xs leading-relaxed text-ink-400">
          {state.sans.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(' ')}
        </p>
      )}
    </div>
  );
}

const btnGhost =
  'rounded-md bg-ink-800 px-3 py-1.5 font-semibold text-ink-200 hover:bg-ink-700 disabled:opacity-40 disabled:hover:bg-ink-800';

function capitalise(s: string) {
  return s[0]!.toUpperCase() + s.slice(1);
}

function describe(o: Outcome): string {
  const reasons: Record<string, string> = {
    checkmate: 'checkmate',
    stalemate: 'stalemate',
    insufficient: 'insufficient material',
    repetition: 'threefold repetition',
    'fifty-move': 'fifty-move rule',
  };
  const why = reasons[o.termination] ?? o.termination;
  return o.winner ? `${capitalise(o.winner)} wins by ${why}` : `Draw by ${why}`;
}

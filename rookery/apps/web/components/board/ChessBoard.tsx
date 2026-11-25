'use client';

// React wrapper around chessground (GPL-3.0-or-later, see /licenses). The board is "dumb":
// it shows `fen`, lets the user drag/click only the moves in `dests`, and reports moves as UCI.
// Rules live in @rookery/chess-core; authority for live games lives on the server.

import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { Color, Key } from '@lichess-org/chessground/types';
import { useEffect, useRef } from 'react';

export type BoardTheme = 'slate' | 'walnut' | 'harbor';

export interface ChessBoardProps {
  fen: string;
  orientation?: Color;
  /** Side allowed to move pieces, 'both' for local play, or undefined for a view-only board. */
  movableColor?: Color | 'both';
  turnColor?: Color;
  /** Legal destinations per origin square (from chess-core `legalDests`). */
  dests?: Map<string, string[]>;
  lastMove?: [string, string];
  check?: boolean;
  theme?: BoardTheme;
  coordinates?: boolean;
  /** Called with a UCI string. Promotions need the caller to supply the piece (see `needsPromotion`). */
  onMove?: (from: string, to: string) => void;
  className?: string;
}

export function ChessBoard({
  fen,
  orientation = 'white',
  movableColor,
  turnColor,
  dests,
  lastMove,
  check = false,
  theme = 'slate',
  coordinates = true,
  onMove,
  className = '',
}: ChessBoardProps) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const config: Config = {
    fen,
    orientation,
    turnColor,
    coordinates,
    check,
    lastMove: lastMove as Key[] | undefined,
    viewOnly: movableColor === undefined,
    highlight: { lastMove: true, check: true },
    animation: { enabled: true, duration: 180 },
    movable: {
      free: false,
      color: movableColor,
      dests: dests as Map<Key, Key[]> | undefined,
      showDests: true,
      events: { after: (orig, dest) => onMoveRef.current?.(orig, dest) },
    },
    premovable: { enabled: false },
    draggable: { enabled: true, showGhost: true },
  };

  // Create once; later renders only push config changes into the existing instance.
  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, config);
    return () => {
      api.current?.destroy();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.set(config);
  });

  return (
    <div className={`rk-board theme-${theme} aspect-square w-full ${className}`}>
      <div ref={el} className="h-full w-full" />
    </div>
  );
}

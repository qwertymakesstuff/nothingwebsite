'use client';

// React wrapper around chessground (GPL-3.0-or-later, see /licenses). The board is "dumb":
// it shows `fen`, lets the user drag/click only the moves in `dests`, and reports moves.
// Rules live in @rookery/chess-core; authority for live games lives on the server.
// Appearance (theme, coordinates, animation, legal-move dots) follows the user's preferences
// unless overridden by props.

import { Chessground } from '@lichess-org/chessground';
import type { Api } from '@lichess-org/chessground/api';
import type { Config } from '@lichess-org/chessground/config';
import type { DrawShape } from '@lichess-org/chessground/draw';
import type { Color, Key } from '@lichess-org/chessground/types';
import { useEffect, useRef } from 'react';
import type { BoardThemeId } from '@/lib/boardThemes';
import { cn } from '@/lib/cn';
import { ANIMATION_MS, usePreferences } from '@/lib/preferences';

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
  /** Overrides the user's preference (used by the settings preview). */
  theme?: BoardThemeId;
  coordinates?: boolean;
  onMove?: (from: string, to: string) => void;
  className?: string;
  /** Accessible description of the position. */
  label?: string;
  /**
   * Purely decorative board that will never accept moves (mini boards, previews). Chessground
   * only binds input handlers when a board is created interactive, so boards that may become
   * playable later must leave this off and control moves through `movableColor` instead.
   */
  viewOnly?: boolean;
  /** Arrows and circles drawn on the board (hints, best moves). */
  shapes?: { orig: string; dest?: string; brush: 'green' | 'red' | 'blue' | 'yellow' | 'paleBlue' | 'paleGreen' }[];
}

export function ChessBoard({
  fen,
  orientation = 'white',
  movableColor,
  turnColor,
  dests,
  lastMove,
  check = false,
  theme,
  coordinates,
  onMove,
  className,
  label = 'Chess board',
  viewOnly = false,
  shapes,
}: ChessBoardProps) {
  const { prefs } = usePreferences();
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const showCoords = coordinates ?? prefs.showCoordinates;
  const anim = ANIMATION_MS[prefs.reduceMotion ? 'off' : prefs.animation];

  const config: Config = {
    fen,
    orientation,
    turnColor,
    coordinates: showCoords,
    check,
    lastMove: prefs.highlightLastMove ? (lastMove as Key[] | undefined) : undefined,
    viewOnly,
    highlight: { lastMove: prefs.highlightLastMove, check: true },
    animation: { enabled: anim > 0, duration: anim },
    movable: {
      free: false,
      color: movableColor,
      dests: dests as Map<Key, Key[]> | undefined,
      showDests: prefs.showLegalMoves,
      events: { after: (orig, dest) => onMoveRef.current?.(orig, dest) },
    },
    premovable: { enabled: false },
    drawable: { autoShapes: (shapes ?? []) as DrawShape[] },
    draggable: { enabled: movableColor !== undefined, showGhost: true },
    selectable: { enabled: movableColor !== undefined },
  };

  // Create once; later renders only push config changes into the existing instance.
  // `coordinates` and `viewOnly` only take effect at creation, so the board is rebuilt when they change.
  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, config);
    return () => {
      api.current?.destroy();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCoords, viewOnly]);

  useEffect(() => {
    api.current?.set(config);
  });

  return (
    <div
      className={cn('rk-board aspect-square w-full', `theme-${theme ?? prefs.boardTheme}`, className)}
      role="img"
      aria-label={label}
    >
      <div ref={el} className="h-full w-full" />
    </div>
  );
}

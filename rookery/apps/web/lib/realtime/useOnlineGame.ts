'use client';

// A live game, as seen by one player. The server sends the full game after every change; moves
// are shown immediately (optimistically) and confirmed or rolled back by the next server state.

import { getTimeControl } from '@rookery/chess-core';
import type { GameView } from '@rookery/protocol';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeSocket, type SocketStatus } from './socket';

export interface OnlineGame {
  game: GameView | null;
  /** Moves including one sent but not yet confirmed. */
  moves: string[];
  status: SocketStatus;
  fatal: string | null;
  /** Last error from the server, e.g. "That move isn't legal." (cleared after a few seconds). */
  error: string | null;
  /** Server time now. */
  now: () => number;
  move: (uci: string) => void;
  resign: () => void;
  abort: () => void;
  draw: (action: 'offer' | 'accept' | 'decline') => void;
  rematch: (action: 'offer' | 'accept' | 'decline') => void;
  cancel: () => void;
}

export function useOnlineGame(gameId: string | null, enabled: boolean): OnlineGame {
  const [game, setGame] = useState<GameView | null>(null);
  const [pending, setPending] = useState<{ uci: string; ply: number } | null>(null);
  const [status, setStatus] = useState<SocketStatus>('connecting');
  const [fatal, setFatal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sock = useRef<RealtimeSocket | null>(null);
  const latest = useRef<GameView | null>(null);
  latest.current = game;

  useEffect(() => {
    if (!gameId || !enabled) return;
    setGame(null);
    setFatal(null);
    const s = new RealtimeSocket(`/ws/game/${gameId}`, {
      onStatus: setStatus,
      onFatal: (code) => setFatal((f) => f ?? code),
      onMessage: (msg) => {
        if (msg.t === 'state') {
          setGame((prev) => (prev && prev.id === msg.game.id && prev.version > msg.game.version ? prev : msg.game));
          setPending(null);
        } else if (msg.t === 'error') {
          if (['not_found', 'not_a_player', 'seat_taken', 'not_invited'].includes(msg.code)) setFatal(msg.code);
          setError(msg.message);
          setPending(null);
        }
      },
    }, true);
    sock.current = s;
    return () => {
      s.close();
      sock.current = null;
    };
  }, [gameId, enabled]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const ply = () => latest.current?.moves.length ?? 0;
  const send = useCallback((m: Parameters<RealtimeSocket['send']>[0]) => sock.current?.send(m), []);

  const moves = useMemo(() => {
    if (!game) return [];
    return pending && pending.ply === game.moves.length ? [...game.moves, pending.uci] : game.moves;
  }, [game, pending]);

  return {
    game,
    moves,
    status,
    fatal,
    error,
    now: () => sock.current?.now() ?? Date.now(),
    move: (uci) => {
      const p = ply();
      setPending({ uci, ply: p });
      send({ t: 'move', uci, ply: p });
    },
    resign: () => send({ t: 'resign', ply: ply() }),
    abort: () => send({ t: 'abort' }),
    draw: (action) => send({ t: 'draw', action, ply: ply() }),
    rematch: (action) => send({ t: 'rematch', action }),
    cancel: () => send({ t: 'cancel' }),
  };
}

/** Each side's clock right now, counting down the running side from the server's timestamp. */
export function liveClock(game: GameView, serverNow: number): { white: number; black: number } {
  const { whiteMs, blackMs, running, at } = game.clock;
  const elapsed = game.status === 'active' && running ? Math.max(0, serverNow - at) : 0;
  return {
    white: running === 'white' ? Math.max(0, whiteMs - elapsed) : whiteMs,
    black: running === 'black' ? Math.max(0, blackMs - elapsed) : blackMs,
  };
}

export function tcLabel(id: string): string {
  return getTimeControl(id)?.label ?? id;
}

'use client';

// Thinking time per move for games played in this browser (computer games, pass-and-play).
// Measures the gap between moves; take-backs drop the times of undone moves; a new game
// (a different `gameKey`) starts afresh. Live games use server-measured times instead.

import { useEffect, useRef, useState } from 'react';

export function useMoveTimes(plies: number, running: boolean, gameKey: unknown): { times: number[]; thinkingMs: number | null } {
  const [times, setTimes] = useState<number[]>([]);
  const lastAt = useRef<number>(performance.now());
  const prevPlies = useRef(plies);
  const prevKey = useRef(gameKey);
  const [, tick] = useState(0);

  useEffect(() => {
    const now = performance.now();
    if (prevKey.current !== gameKey) {
      // New game: moves already on the board (e.g. a chosen opening) took no thinking time.
      prevKey.current = gameKey;
      prevPlies.current = plies;
      lastAt.current = now;
      setTimes(Array.from({ length: plies }, () => 0));
      return;
    }
    const before = prevPlies.current;
    prevPlies.current = plies;
    if (plies > before) {
      const gap = now - lastAt.current;
      setTimes((t) => [...t.slice(0, before), gap, ...Array.from({ length: plies - before - 1 }, () => 0)]);
      lastAt.current = now;
    } else if (plies < before) {
      setTimes((t) => t.slice(0, plies));
      lastAt.current = now;
    }
  }, [plies, gameKey]);

  // Tick the live timer for the move being thought about.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick((n) => n + 1), 200);
    return () => clearInterval(t);
  }, [running]);

  return { times, thinkingMs: running ? performance.now() - lastAt.current : null };
}

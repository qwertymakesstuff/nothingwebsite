'use client';

// Local two-player clock built on chess-core's pure clock maths. Used only for pass-and-play;
// online clocks are kept by the realtime server (Stage 4).

import { createClock, flagAt, press, remaining, start, stop, type ClockState } from '@rookery/chess-core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Side } from './types';

export function useChessClock(initialMs: number, incrementMs: number, onFlag: (side: Side) => void) {
  const [clock, setClock] = useState<ClockState>(() => createClock(initialMs, incrementMs));
  const [, setTick] = useState(0);
  const onFlagRef = useRef(onFlag);
  onFlagRef.current = onFlag;

  // Re-render ~10×/s while a clock runs; fire onFlag exactly when time runs out.
  useEffect(() => {
    if (!clock.running) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    const at = flagAt(clock);
    const flagTimer =
      at !== null
        ? setTimeout(() => {
            const side = clock.running!;
            setClock((c) => stop(c, performance.now()));
            onFlagRef.current(side);
          }, Math.max(0, at - performance.now()))
        : undefined;
    return () => {
      clearInterval(id);
      clearTimeout(flagTimer);
    };
  }, [clock]);

  /** Called after a move by `mover`. The first move starts the opponent's clock. */
  const moved = useCallback((mover: Side) => {
    const now = performance.now();
    setClock((c) => {
      if (c.running === null) return start(c, mover === 'white' ? 'black' : 'white', now);
      return press(c, now).clock;
    });
  }, []);

  const halt = useCallback(() => setClock((c) => stop(c, performance.now())), []);
  const resetClock = useCallback((ms: number, inc: number) => setClock(createClock(ms, inc)), []);

  const now = performance.now();
  return {
    whiteMs: remaining(clock, 'white', now),
    blackMs: remaining(clock, 'black', now),
    running: clock.running as Side | null,
    moved,
    halt,
    resetClock,
  };
}

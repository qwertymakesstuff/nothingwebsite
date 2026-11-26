'use client';

// Live engine analysis of one position (analysis board): Stockfish in the browser, three best
// lines at increasing depth, restarted whenever the position changes.

import { Chess } from 'chess.js';
import { useEffect, useState } from 'react';
import { getEngine } from './engine/browserEngine';
import { MATE_CP } from './review';

export interface Line {
  /** White-relative centipawns (mates mapped near ±MATE_CP). */
  cp: number;
  mate: number | null;
  sans: string[];
  uci: string[];
}

export function useLiveAnalysis(fen: string, enabled: boolean): { lines: Line[]; depth: number; running: boolean } {
  const [lines, setLines] = useState<Line[]>([]);
  const [depth, setDepth] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLines([]);
    setDepth(0);
    const chess = new Chess(fen);
    if (chess.isGameOver()) return;
    const sign = chess.turn() === 'w' ? 1 : -1;
    (async () => {
      setRunning(true);
      const engine = getEngine();
      for (const d of [10, 14, 18]) {
        if (!alive) break;
        const res = await engine.search({ fen, depth: d, multiPv: 3 });
        if (!alive) break;
        setLines(
          res.candidates.map((c) => {
            const probe = new Chess(fen);
            const sans: string[] = [];
            for (const u of c.pv.slice(0, 10)) {
              try {
                sans.push(probe.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
              } catch {
                break;
              }
            }
            const cp = c.score.mate !== null ? sign * (c.score.mate > 0 ? MATE_CP - c.score.mate : -MATE_CP - c.score.mate) : sign * c.score.cp;
            return { cp, mate: c.score.mate !== null ? sign * c.score.mate : null, sans, uci: c.pv.slice(0, 10) };
          }),
        );
        setDepth(d);
      }
    })()
      .catch(() => undefined)
      .finally(() => alive && setRunning(false));
    return () => {
      alive = false;
      getEngine().stop();
    };
  }, [fen, enabled]);
  return { lines, depth, running };
}

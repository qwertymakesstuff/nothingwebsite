'use client';

// Decorative board on the homepage: replays Morphy's "Opera Game" (Paris, 1858, public domain)
// move by move, pausing on the final checkmate before starting over.

import { useEffect, useMemo, useState } from 'react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { replaySan, sanTokens } from '@/lib/chess';
import { usePreferences } from '@/lib/preferences';

const OPERA =
  '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';

export function HeroBoard() {
  const { prefs } = usePreferences();
  const frames = useMemo(() => {
    const sans = sanTokens(OPERA);
    return Array.from({ length: sans.length + 1 }, (_, i) => {
      const r = replaySan(sans.slice(0, i));
      return { fen: r.fen, lastMove: r.lastMove, san: i ? sans[i - 1] : undefined, ply: i };
    });
  }, []);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (prefs.reduceMotion) {
      setI(frames.length - 1);
      return;
    }
    const last = i === frames.length - 1;
    const t = setTimeout(() => setI(last ? 0 : i + 1), last ? 4200 : i === 0 ? 1200 : 1100);
    return () => clearTimeout(t);
  }, [i, frames.length, prefs.reduceMotion]);

  const f = frames[i]!;
  const moveNo = f.ply ? `${Math.ceil(f.ply / 2)}${f.ply % 2 ? '.' : '…'} ${f.san}` : 'Starting position';

  return (
    <figure className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(closest-side,rgb(193_154_82/0.18),transparent)]" aria-hidden />
      <div className="rounded-[14px] border border-line-strong bg-surface-1/80 p-2.5 shadow-[var(--shadow-pop)] sm:p-3">
        <ChessBoard fen={f.fen} lastMove={f.lastMove} check={f.san?.includes('+') || f.san?.includes('#')} label="Morphy's Opera Game, replaying" />
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-3 px-1 text-[13px] text-fg-subtle">
        <span>
          <span className="text-fg-muted">Morphy vs Duke Karl &amp; Count Isouard</span> · Paris, 1858
        </span>
        <span className="tabular font-[family-name:var(--font-mono)] text-gold-300">{moveNo}</span>
      </figcaption>
    </figure>
  );
}

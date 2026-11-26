'use client';

import { Chess } from 'chess.js';
import { useEffect, useState } from 'react';
import { MiniBoard } from '@/components/board/MiniBoard';
import { ButtonLink } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/States';
import { dailyPuzzleId, fetchPuzzle } from '@/lib/platform';

/** Today's real daily puzzle (the position after the opponent's move), or a clear empty state. */
export function DailyPuzzleCard({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<{ fen: string; lastMove: [string, string]; rating: number; orientation: 'white' | 'black' } | 'loading' | 'none' | 'error'>('loading');
  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await dailyPuzzleId();
      const p = id ? await fetchPuzzle(id) : null;
      if (!alive) return;
      if (!p) return setState('none');
      const c = new Chess(p.fen);
      const m = c.move({ from: p.first_move.slice(0, 2), to: p.first_move.slice(2, 4), promotion: p.first_move[4] });
      setState({ fen: c.fen(), lastMove: [m.from, m.to], rating: Math.round(p.rating), orientation: c.turn() === 'w' ? 'white' : 'black' });
    })().catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);
  if (state === 'loading') return <LoadingState label="Loading today’s puzzle…" />;
  if (state === 'none' || state === 'error') return <p className="text-sm text-fg-muted">{state === 'none' ? 'No daily puzzle today.' : 'Couldn’t load today’s puzzle.'}</p>;
  return (
    <div>
      <MiniBoard fen={state.fen} lastMove={state.lastMove} orientation={state.orientation} label="Daily puzzle position" />
      {!compact && (
        <ButtonLink href="/puzzles?mode=daily" variant="primary" block className="mt-4">
          Solve it · {state.orientation} to move · rated {state.rating}
        </ButtonLink>
      )}
    </div>
  );
}

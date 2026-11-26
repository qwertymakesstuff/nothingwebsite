'use client';

// Extra statistics on profiles, all computed from real data: rating history (rating_history),
// puzzle performance (puzzle_stats), results by how games ended, and the openings played most
// (opening names from the CC0 lichess dataset, matched against the recorded moves).

import { useEffect, useMemo, useState } from 'react';
import { RatingChart } from '@/components/charts/RatingChart';
import { LoadingState } from '@/components/ui/States';
import type { GameRow } from '@/lib/db';
import { winRate } from '@/lib/gameUtils';
import { fetchPuzzleStats, fetchRatingHistory, type PuzzleStats, type RatingPoint } from '@/lib/platform';
import { loadOpenings, openingOf } from '@/lib/review';

export function ProfileInsights({ profileId, games }: { profileId: string; games: GameRow[] }) {
  const [history, setHistory] = useState<RatingPoint[] | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleStats | null>(null);
  const [book, setBook] = useState<Record<string, [string, string]> | null>(null);

  useEffect(() => {
    void fetchRatingHistory(profileId).then(setHistory).catch(() => setHistory([]));
    void fetchPuzzleStats(profileId).then(setPuzzles).catch(() => setPuzzles(null));
    void loadOpenings().then(setBook);
  }, [profileId]);

  const openings = useMemo(() => {
    if (!book) return null;
    const map = new Map<string, { name: string; eco: string; games: number; wins: number; draws: number }>();
    for (const g of games) {
      if (!g.moves) continue;
      const o = openingOf(book, g.initial_fen, g.moves.split(' '));
      if (!o) continue;
      const family = o.name.split(':')[0]!;
      const side = g.white_id === profileId ? 'white' : 'black';
      const won = g.result === (side === 'white' ? '1-0' : '0-1');
      const e = map.get(family) ?? { name: family, eco: o.eco, games: 0, wins: 0, draws: 0 };
      e.games++;
      if (won) e.wins++;
      if (g.result === '1/2-1/2') e.draws++;
      map.set(family, e);
    }
    return [...map.values()].sort((a, b) => b.games - a.games).slice(0, 8);
  }, [book, games, profileId]);

  const endings = useMemo(() => {
    const m = new Map<string, { won: number; lost: number; drawn: number }>();
    for (const g of games) {
      const side = g.white_id === profileId ? 'white' : 'black';
      const e = m.get(g.termination) ?? { won: 0, lost: 0, drawn: 0 };
      if (g.result === '1/2-1/2') e.drawn++;
      else if (g.result === (side === 'white' ? '1-0' : '0-1')) e.won++;
      else e.lost++;
      m.set(g.termination, e);
    }
    return [...m.entries()].sort((a, b) => b[1].won + b[1].lost + b[1].drawn - (a[1].won + a[1].lost + a[1].drawn));
  }, [games, profileId]);

  return (
    <div className="space-y-8 border-t border-line p-5">
      <section>
        <h3 className="mb-3 text-sm font-semibold">Rating history</h3>
        {history === null ? <LoadingState label="Loading ratings…" /> : <RatingChart points={history} />}
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        <section>
          <h3 className="mb-3 text-sm font-semibold">Puzzles</h3>
          {puzzles && puzzles.attempts > 0 ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Fact label="Rated attempts" value={puzzles.attempts} />
              <Fact label="Solved" value={`${puzzles.solved} (${Math.round((puzzles.solved / puzzles.attempts) * 100)}%)`} />
              <Fact label="Best streak" value={puzzles.best_streak} />
              <Fact label="Solved today" value={puzzles.solved_today} />
            </dl>
          ) : (
            <p className="text-sm text-fg-subtle">No rated puzzles yet.</p>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold">How games ended</h3>
          {endings.length ? (
            <ul className="space-y-1.5 text-sm">
              {endings.map(([t, e]) => (
                <li key={t} className="flex justify-between gap-3">
                  <span className="capitalize text-fg-muted">{t.replace('-', ' ')}</span>
                  <span className="tabular text-fg-subtle">
                    <span className="text-win">{e.won}</span> · <span className="text-draw">{e.drawn}</span> · <span className="text-loss">{e.lost}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-subtle">No games yet.</p>
          )}
          <p className="mt-2 text-[11px] text-fg-subtle">won · drawn · lost, recent games</p>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold">Most-played openings</h3>
          {openings === null ? (
            <LoadingState label="Matching openings…" />
          ) : openings.length ? (
            <ul className="space-y-1.5 text-sm">
              {openings.map((o) => (
                <li key={o.name} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-fg-muted" title={o.name}>
                    <span className="text-fg-subtle">{o.eco}</span> {o.name}
                  </span>
                  <span className="tabular shrink-0 text-fg-subtle">
                    {o.games} · {winRate(o.wins, o.draws, o.games)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-subtle">No recognised openings yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-surface-2 p-3">
      <dt className="text-[11px] text-fg-subtle">{label}</dt>
      <dd className="tabular mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

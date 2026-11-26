import type { Metadata } from 'next';
import { PuzzlesClient } from '@/components/puzzles/PuzzlesClient';
import { getDailyPuzzle, getPuzzles } from '@/lib/data';

export const metadata: Metadata = { title: 'Puzzles' };

export default function PuzzlesPage() {
  const { data, source } = getPuzzles();
  const daily = getDailyPuzzle().data;
  return (
    <PuzzlesClient
      puzzles={data.puzzles}
      daily={daily}
      themes={data.themes}
      source={source}
    />
  );
}

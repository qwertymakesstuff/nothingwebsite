import type { Metadata } from 'next';
import { PuzzlesClient } from '@/components/puzzles/PuzzlesClient';
import { getDailyPuzzle, getPreviewProfile, getPuzzles } from '@/lib/data';

export const metadata: Metadata = { title: 'Puzzles' };

export default function PuzzlesPage() {
  const { data, source } = getPuzzles();
  const daily = getDailyPuzzle().data;
  const rating = getPreviewProfile().data.ratings.find((r) => r.category === 'puzzle')!;
  return (
    <PuzzlesClient
      puzzles={data.puzzles}
      daily={daily}
      themes={data.themes}
      rating={rating.rating}
      ratingHistory={rating.history}
      source={source}
    />
  );
}

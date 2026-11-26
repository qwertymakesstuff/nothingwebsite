import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PuzzleTrainer } from '@/components/puzzles/PuzzleTrainer';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Puzzles' };

export default function PuzzlesPage() {
  return (
    <Suspense fallback={<LoadingState label="Finding a puzzle…" />}>
      <PuzzleTrainer />
    </Suspense>
  );
}

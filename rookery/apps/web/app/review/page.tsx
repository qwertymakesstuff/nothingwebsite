import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GameReview } from '@/components/review/GameReview';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Game review' };

export default function ReviewPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading the game…" />}>
      <GameReview />
    </Suspense>
  );
}

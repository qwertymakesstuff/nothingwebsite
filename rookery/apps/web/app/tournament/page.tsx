import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TournamentClient } from '@/components/tournaments/TournamentClient';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Tournament' };

export default function TournamentPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading the tournament…" />}>
      <TournamentClient />
    </Suspense>
  );
}

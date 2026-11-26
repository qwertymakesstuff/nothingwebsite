import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlayersClient } from '@/components/social/Friends';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Find players' };

export default function PlayersPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <PlayersClient />
    </Suspense>
  );
}

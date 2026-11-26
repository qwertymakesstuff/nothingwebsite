import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OnlineGameClient } from '@/components/online/OnlineGameClient';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Live game' };

export default function GamePage() {
  return (
    // The game id is in the query string (?id=), read in the browser.
    <Suspense fallback={<LoadingState label="Connecting to the game…" />}>
      <OnlineGameClient />
    </Suspense>
  );
}

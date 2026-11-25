import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BotsClient } from '@/components/bots/BotsClient';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Computer opponents' };

export default function BotsPage() {
  return (
    // useSearchParams (?bot=) needs a Suspense boundary in a static export.
    <Suspense fallback={<LoadingState label="Gathering opponents…" />}>
      <BotsClient />
    </Suspense>
  );
}

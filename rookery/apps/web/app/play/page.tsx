import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlayClient } from '@/components/play/PlayClient';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Play' };

export default function PlayPage() {
  return (
    // useSearchParams (?tc=, ?mode=) needs a Suspense boundary in a static export.
    <Suspense fallback={<LoadingState label="Setting up the board…" />}>
      <PlayClient />
    </Suspense>
  );
}

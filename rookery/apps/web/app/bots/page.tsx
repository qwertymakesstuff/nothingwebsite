import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BotsClient } from '@/components/bots/BotsClient';
import { LoadingState } from '@/components/ui/States';
import { getBots } from '@/lib/data';

export const metadata: Metadata = { title: 'Computer opponents' };

export default function BotsPage() {
  const { data, source } = getBots();
  return (
    <Suspense fallback={<LoadingState label="Gathering opponents…" />}>
      <BotsClient tiers={data.tiers} bots={data.bots} source={source} />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = { title: 'Leaderboards' };

export default function LeaderboardPage() {
  return (
    <>
      <PageHeader eyebrow="Rankings" title="Leaderboards" description="The strongest players in each time control, and the sharpest puzzle solvers." />
      <LeaderboardClient />
    </>
  );
}

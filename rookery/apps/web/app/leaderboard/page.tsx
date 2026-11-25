import type { Metadata } from 'next';
import { LeaderboardClient } from '@/components/leaderboard/LeaderboardClient';
import { PageHeader } from '@/components/layout/PageHeader';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { getLeaderboard } from '@/lib/data';
import type { Category, LeaderboardEntry } from '@/lib/types';

export const metadata: Metadata = { title: 'Leaderboards' };

const CATEGORIES: Category[] = ['bullet', 'blitz', 'rapid', 'classical', 'puzzle'];

export default function LeaderboardPage() {
  const results = CATEGORIES.map((c) => [c, getLeaderboard(c)] as const);
  const boards = Object.fromEntries(results.map(([c, r]) => [c, r.data])) as Record<Category, LeaderboardEntry[]>;
  const source = results.some(([, r]) => r.source === 'sample') ? 'sample' : 'live';
  return (
    <>
      <PageHeader
        eyebrow="Rankings"
        title={
          <span className="flex flex-wrap items-center gap-3">
            Leaderboards <SampleNotice source={source} />
          </span>
        }
        description="The strongest active players in each time control, and the sharpest puzzle solvers."
      />
      <LeaderboardClient boards={boards} source={source} />
    </>
  );
}

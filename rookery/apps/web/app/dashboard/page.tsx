import type { Metadata } from 'next';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { getDailyPuzzle } from '@/lib/data';

export const metadata: Metadata = { title: 'Home' };

export default function DashboardPage() {
  return <DashboardClient daily={getDailyPuzzle()} />;
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminClient } from '@/components/admin/AdminClient';
import { LoadingState } from '@/components/ui/States';

export const metadata: Metadata = { title: 'Moderation', robots: { index: false } };

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading…" />}>
      <AdminClient />
    </Suspense>
  );
}

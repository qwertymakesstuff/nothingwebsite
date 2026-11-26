import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageHeader';
import { Suspense } from 'react';
import { SettingsClient } from '@/components/settings/SettingsClient';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Make the board yours. Signed in, your settings are saved to your account and follow you to every device." />
      <Suspense>
        <SettingsClient />
      </Suspense>
    </>
  );
}

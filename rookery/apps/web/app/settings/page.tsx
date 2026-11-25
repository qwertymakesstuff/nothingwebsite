import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsClient } from '@/components/settings/SettingsClient';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" description="Make the board yours. Settings are saved in this browser; once accounts exist they follow you to every device." />
      <SettingsClient />
    </>
  );
}

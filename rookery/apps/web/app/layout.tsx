import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { SITE_URL } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Rookery: play chess online', template: '%s · Rookery' },
  description: 'Play chess online against friends, players worldwide and characterful computer opponents.',
};

export const viewport: Viewport = {
  themeColor: '#0e0e10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SITE_URL } from '@/lib/config';
import { AuthProvider } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences';
import { LobbyProvider } from '@/lib/realtime/lobby';
import { Notifications } from '@/components/realtime/Notifications';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Rookery: play chess online', template: '%s · Rookery' },
  description:
    'Play chess online against friends, players worldwide and characterful computer opponents. Puzzles, analysis and leaderboards. Free and open source.',
};

export const viewport: Viewport = {
  themeColor: '#100f0d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-backdrop="study">
      <body>
        <AuthProvider>
          <PreferencesProvider>
            <LobbyProvider>
              <AppShell>{children}</AppShell>
              <Notifications />
            </LobbyProvider>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

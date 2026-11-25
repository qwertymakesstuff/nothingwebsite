import type { Metadata } from 'next';
import { ProfileRoute } from '@/components/profile/ProfileRoute';

// One static shell (/u/_) serves every profile: the Worker rewrites /u/<name> to it and the
// browser loads the player from Supabase. See apps/realtime/src/index.ts.
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ username: '_' }];
}

export const metadata: Metadata = { title: 'Player profile' };

export default function ProfilePage() {
  return <ProfileRoute />;
}

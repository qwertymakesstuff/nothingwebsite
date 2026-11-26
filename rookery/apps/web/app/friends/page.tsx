import type { Metadata } from 'next';
import { FriendsClient } from '@/components/social/Friends';

export const metadata: Metadata = { title: 'Friends' };

export default function FriendsPage() {
  return <FriendsClient />;
}

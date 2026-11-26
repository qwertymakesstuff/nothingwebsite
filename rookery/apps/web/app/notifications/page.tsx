import type { Metadata } from 'next';
import { NotificationsClient } from '@/components/social/Notifications';

export const metadata: Metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return <NotificationsClient />;
}

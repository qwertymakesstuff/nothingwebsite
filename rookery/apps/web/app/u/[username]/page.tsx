import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProfileView } from '@/components/profile/ProfileView';
import { getAchievements, getProfile, getRecentGames, listProfileUsernames } from '@/lib/data';

// Static export: every known profile is prerendered. When accounts arrive (Stage 2) this route
// is served by the Worker with the profile fetched from Supabase in the browser.
export const dynamicParams = false;

export function generateStaticParams() {
  return listProfileUsernames().map((username) => ({ username }));
}

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: `${username}'s profile` };
}

export default async function ProfilePage({ params }: Params) {
  const { username } = await params;
  const profile = getProfile(username);
  if (!profile) notFound();
  const games = getRecentGames(username, 20);
  const achievements = getAchievements(username);
  return <ProfileView profile={profile.data} games={games.data} achievements={achievements.data} source={profile.source} />;
}

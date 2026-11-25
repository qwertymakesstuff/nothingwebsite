'use client';

import { ChevronDown, Home, LogIn, LogOut, Settings, UserPlus, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { Menu } from '@/components/ui/Dropdown';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { avatarUrl } from '@/lib/db';

/** Account menu: sign-in links for guests, profile/settings/sign-out for signed-in players. */
export function AccountMenu({ compact, align = 'end', side }: { compact?: boolean; align?: 'start' | 'end'; side?: 'top' | 'bottom' }) {
  const { status, profile, email, signOut } = useAuth();
  const router = useRouter();

  if (status !== 'signedIn') {
    if (compact) {
      return (
        <Link href="/login" aria-label="Sign in" className="grid size-10 place-items-center rounded-[var(--radius-control)] text-fg-muted hover:bg-surface-2 hover:text-fg">
          <LogIn className="size-5" />
        </Link>
      );
    }
    return (
      <div className={cn('grid gap-2', status === 'loading' && 'opacity-60')}>
        <Link href="/signup" className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-gradient-to-b from-gold-400 to-gold-500 text-sm font-semibold text-fg-inverse hover:from-gold-300 hover:to-gold-400">
          <UserPlus className="size-4" /> Create account
        </Link>
        <Link href="/login" className="flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-surface-3 text-sm font-semibold text-fg hover:bg-surface-4">
          <LogIn className="size-4" /> Sign in
        </Link>
      </div>
    );
  }

  const name = profile?.username ?? 'Player';
  return (
    <Menu
      label="Account"
      align={align}
      side={side}
      header={
        <div className="mb-1 border-b border-line px-3 pt-2 pb-3">
          <p className="truncate text-sm font-semibold text-fg">{profile?.display_name || name}</p>
          <p className="truncate text-xs text-fg-subtle">{email}</p>
        </div>
      }
      items={[
        { label: 'Your profile', icon: <UserRound className="size-4" />, href: `/u/${name}` },
        { label: 'Dashboard', icon: <Home className="size-4" />, href: '/dashboard' },
        { label: 'Settings', icon: <Settings className="size-4" />, href: '/settings' },
        {
          label: 'Sign out',
          icon: <LogOut className="size-4" />,
          separatorBefore: true,
          onSelect: async () => {
            await signOut();
            router.push('/');
          },
        },
      ]}
      trigger={({ open }) => (
        <span className={cn('flex items-center gap-2.5 rounded-[var(--radius-control)] p-1.5 text-left transition-colors hover:bg-surface-2', open && 'bg-surface-2', !compact && 'w-full pr-3')}>
          <PlayerAvatar name={name} src={avatarUrl(profile?.avatar_path)} size="sm" />
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{name}</span>
                <span className="block truncate text-xs text-fg-subtle">Signed in</span>
              </span>
              <ChevronDown className="size-4 text-fg-subtle" aria-hidden />
            </>
          )}
        </span>
      )}
    />
  );
}

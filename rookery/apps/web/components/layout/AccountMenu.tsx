'use client';

import { ChevronDown, LogIn, Settings, UserRound } from 'lucide-react';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { Menu } from '@/components/ui/Dropdown';
import { cn } from '@/lib/cn';

/**
 * Account menu. Accounts arrive in Stage 2, so there is no signed-in user yet: the menu offers
 * the sample profile preview and settings, and shows sign-in as not yet available.
 * (No fake authentication: nothing here pretends a user is logged in.)
 */
export function AccountMenu({ compact, align = 'end' }: { compact?: boolean; align?: 'start' | 'end' }) {
  return (
    <Menu
      label="Account"
      align={align}
      header={
        <div className="mb-1 border-b border-line px-3 pt-2 pb-3">
          <p className="text-sm font-semibold text-fg">You&apos;re browsing as a guest</p>
          <p className="mt-0.5 text-xs text-fg-subtle">Accounts open in Stage 2. Settings are saved on this device.</p>
        </div>
      }
      items={[
        { label: 'Sign in', icon: <LogIn className="size-4" />, disabled: true, hint: 'Stage 2' },
        { label: 'Sample profile', icon: <UserRound className="size-4" />, href: '/u/nightowl', separatorBefore: true },
        { label: 'Settings', icon: <Settings className="size-4" />, href: '/settings' },
      ]}
      trigger={({ open }) => (
        <span
          className={cn(
            'flex items-center gap-2.5 rounded-[var(--radius-control)] p-1.5 text-left transition-colors hover:bg-surface-2',
            open && 'bg-surface-2',
            !compact && 'w-full pr-3',
          )}
        >
          <PlayerAvatar name="Guest" size="sm" />
          {!compact && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">Guest</span>
                <span className="block truncate text-xs text-fg-subtle">Not signed in</span>
              </span>
              <ChevronDown className="size-4 text-fg-subtle" aria-hidden />
            </>
          )}
        </span>
      )}
    />
  );
}

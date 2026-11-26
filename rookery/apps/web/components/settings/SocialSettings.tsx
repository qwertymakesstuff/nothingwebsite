'use client';

import { useEffect, useState } from 'react';
import { Select } from '@/components/ui/Dropdown';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth';
import { fetchSocialSettings, saveSocialSettings, type SocialSettings as S } from '@/lib/platform';

/** Who can challenge you and who you chat with (stored on your account; the game server enforces it). */
export function SocialSettings() {
  const { userId, status } = useAuth();
  const [s, setS] = useState<S | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  useEffect(() => {
    if (userId) void fetchSocialSettings(userId).then(setS).catch(() => setSaved('error'));
  }, [userId]);

  if (status !== 'signedIn')
    return (
      <EmptyState title="Social settings need an account" action={<ButtonLink href="/login?next=/settings?section=social" variant="primary">Sign in</ButtonLink>}>
        Choose who can challenge you and who you chat with.
      </EmptyState>
    );
  if (!s) return <LoadingState label="Loading…" />;

  const update = (patch: Partial<S>) => {
    setS({ ...s, ...patch });
    setSaved('saving');
    saveSocialSettings(userId!, patch)
      .then(() => setSaved('saved'))
      .catch(() => setSaved('error'));
  };

  return (
    <div className="divide-y divide-line">
      <Row label="Who can challenge you" hint="Applies to challenges by username. Invitation links you create are unaffected.">
        <Select
          label="Who can challenge you"
          value={s.allow_challenges}
          onChange={(v) => update({ allow_challenges: v as S['allow_challenges'] })}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'friends', label: 'Friends only' },
            { value: 'none', label: 'Nobody' },
          ]}
        />
      </Row>
      <Row label="In-game chat" hint="What you see from opponents. Chat is moderated; offensive messages are blocked and can be reported.">
        <Select
          label="In-game chat"
          value={s.chat}
          onChange={(v) => update({ chat: v as S['chat'] })}
          options={[
            { value: 'all', label: 'Everyone' },
            { value: 'friends', label: 'Friends only' },
            { value: 'presets', label: 'Preset phrases only' },
            { value: 'off', label: 'Off' },
          ]}
        />
      </Row>
      <p className="py-3 text-xs text-fg-subtle" role="status">
        {saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved to your account.' : saved === 'error' ? 'Couldn’t save. Try again.' : 'Changes save automatically.'}
      </p>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 max-w-md text-[13px] text-fg-subtle">{hint}</p>
      </div>
      <div className="w-full sm:w-56">{children}</div>
    </div>
  );
}

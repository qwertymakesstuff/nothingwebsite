'use client';

import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { fetchMyActiveRestrictions, type RestrictionRow } from '@/lib/platform';

const TEXT: Record<RestrictionRow['kind'], string> = {
  mute: 'You can’t use chat',
  no_play: 'You can’t start online games',
  no_tournaments: 'You can’t join or create tournaments',
  ban: 'Your account is suspended',
};

/** Tells a signed-in player, on every page, about restrictions on their account and why. */
export function RestrictionBanner() {
  const { userId } = useAuth();
  const [rows, setRows] = useState<RestrictionRow[]>([]);
  useEffect(() => {
    if (!userId) return setRows([]);
    void fetchMyActiveRestrictions(userId).then(setRows).catch(() => setRows([]));
  }, [userId]);
  if (!rows.length) return null;
  return (
    <div className="mb-5 space-y-2" role="status">
      {rows.map((r) => (
        <div key={r.id} className="flex items-start gap-3 rounded-[12px] border border-loss/30 bg-loss/10 px-4 py-3 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-loss" />
          <p>
            <b>{TEXT[r.kind]}</b>
            {r.expires_at ? ` until ${formatDate(r.expires_at)}` : ''}. Reason: {r.reason}
          </p>
        </div>
      ))}
    </div>
  );
}

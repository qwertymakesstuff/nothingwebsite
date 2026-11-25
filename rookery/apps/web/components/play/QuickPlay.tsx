'use client';

import { getTimeControl, QUICK_PLAY_IDS } from '@rookery/chess-core';
import { Bot, Microscope, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ButtonLink } from '@/components/ui/Button';
import { TimeChip } from './TimeControlPicker';

/** Dashboard quick-start: pick a time control, then go to the Play page with it selected. */
export function QuickPlay() {
  const [tc, setTc] = useState<string>(QUICK_PLAY_IDS[0]);
  const label = getTimeControl(tc)?.label ?? tc;
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Time control">
        {QUICK_PLAY_IDS.map((id) => (
          <TimeChip key={id} id={id} label={getTimeControl(id)!.label} selected={tc === id} onSelect={setTc} />
        ))}
      </div>
      <ButtonLink href={`/play?tc=${encodeURIComponent(tc)}`} variant="primary" size="lg" block icon={<Swords className="size-5" />}>
        Play {label}
      </ButtonLink>
      <div className="grid grid-cols-3 gap-2">
        <ModeLink href="/bots" icon={<Bot className="size-4" />} label="Computer" />
        <ModeLink href="/play?mode=local" icon={<Users className="size-4" />} label="Pass & play" />
        <ModeLink href="/analysis" icon={<Microscope className="size-4" />} label="Analysis" />
      </div>
    </div>
  );
}

function ModeLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex h-16 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-surface-2 text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
    >
      <span className="text-gold-400">{icon}</span>
      {label}
    </Link>
  );
}

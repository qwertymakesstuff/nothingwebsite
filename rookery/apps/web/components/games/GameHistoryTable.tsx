import Link from 'next/link';
import { CountryTag, PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { cn } from '@/lib/cn';
import { CATEGORY_LABEL, formatDate, outcomeFor } from '@/lib/format';
import { CATEGORY_ICON } from '@/lib/categoryIcons';
import type { GameSummary, PlayerRef } from '@/lib/types';

const OUTCOME_STYLE = {
  win: 'bg-win/15 text-win',
  loss: 'bg-loss/15 text-loss',
  draw: 'bg-draw/15 text-draw',
};
const OUTCOME_TEXT = { win: 'Won', loss: 'Lost', draw: 'Draw' };

/**
 * Game history from one player's perspective (`perspective` = their username). Rows link to
 * the player profiles; game review pages arrive with Stage 5.
 */
export function GameHistoryTable({ games, perspective, compact }: { games: GameSummary[]; perspective: string; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-medium text-fg-subtle">
            <th className="py-2.5 pl-5 font-medium">Type</th>
            <th className="py-2.5 font-medium">Players</th>
            <th className="py-2.5 text-center font-medium">Result</th>
            {!compact && <th className="py-2.5 text-center font-medium">Accuracy</th>}
            <th className="py-2.5 text-right font-medium">Moves</th>
            <th className="py-2.5 pr-5 text-right font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {games.map((g) => {
            const side = g.white.username === perspective ? 'white' : 'black';
            const outcome = outcomeFor(g.result, side);
            const Icon = CATEGORY_ICON[g.category];
            return (
              <tr key={g.id} className="transition-colors hover:bg-surface-2/60">
                <td className="py-3 pl-5">
                  <span className="flex items-center gap-2 text-fg-muted" title={CATEGORY_LABEL[g.category]}>
                    <Icon className="size-4 text-gold-400" aria-hidden />
                    <span className="tabular text-xs">{g.timeControl}</span>
                  </span>
                </td>
                <td className="py-2">
                  <PlayerLine p={g.white} color="white" bold={g.result === '1-0'} />
                  <PlayerLine p={g.black} color="black" bold={g.result === '0-1'} />
                </td>
                <td className="py-3 text-center">
                  <span className={cn('inline-flex h-6 min-w-12 items-center justify-center rounded-full px-2 text-xs font-semibold', OUTCOME_STYLE[outcome])}>
                    {OUTCOME_TEXT[outcome]}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-fg-subtle capitalize">{g.termination}</span>
                </td>
                {!compact && (
                  <td className="tabular py-3 text-center text-xs text-fg-muted">
                    {g.accuracy ? (
                      <>
                        <span className="block">{g.accuracy.white.toFixed(1)}</span>
                        <span className="block">{g.accuracy.black.toFixed(1)}</span>
                      </>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </td>
                )}
                <td className="tabular py-3 text-right text-fg-muted">{Math.ceil(g.plies / 2)}</td>
                <td className="py-3 pr-5 text-right text-xs whitespace-nowrap text-fg-subtle">{formatDate(g.playedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlayerLine({ p, color, bold }: { p: PlayerRef; color: 'white' | 'black'; bold: boolean }) {
  return (
    <span className="flex items-center gap-2 py-0.5">
      <span
        className={cn('size-2.5 shrink-0 rounded-[3px] ring-1 ring-inset', color === 'white' ? 'bg-[#ece6da] ring-black/10' : 'bg-[#2b2925] ring-white/15')}
        aria-label={color}
      />
      <PlayerAvatar name={p.username} size="xs" />
      <Link href={`/u/${p.username}`} className={cn('truncate hover:text-gold-300', bold ? 'font-semibold text-fg' : 'text-fg-muted')}>
        {p.username}
      </Link>
      {p.rating !== undefined && <span className="tabular text-xs text-fg-subtle">({p.rating})</span>}
      <CountryTag code={p.country} />
    </span>
  );
}

'use client';

import { Bell, Bot, Check, Gamepad2, LayoutGrid, Lock, MonitorCog, RotateCcw, UserRound } from 'lucide-react';
import { useState } from 'react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { ComingSoon } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/States';
import { EngineSettings } from './EngineSettings';
import { Switch } from '@/components/ui/Switch';
import { BACKDROPS, BOARD_THEMES, PIECE_SETS } from '@/lib/boardThemes';
import { cn } from '@/lib/cn';
import { usePreferences, type Preferences } from '@/lib/preferences';

type Section = 'board' | 'gameplay' | 'computer' | 'interface' | 'profile' | 'account' | 'notifications';

const SECTIONS: { id: Section; label: string; icon: typeof LayoutGrid; stage?: number }[] = [
  { id: 'board', label: 'Board & pieces', icon: LayoutGrid },
  { id: 'gameplay', label: 'Gameplay', icon: Gamepad2 },
  { id: 'computer', label: 'Computer opponents', icon: Bot },
  { id: 'interface', label: 'Interface', icon: MonitorCog },
  { id: 'profile', label: 'Profile', icon: UserRound, stage: 2 },
  { id: 'account', label: 'Account & privacy', icon: Lock, stage: 2 },
  { id: 'notifications', label: 'Notifications', icon: Bell, stage: 8 },
];

// A middlegame position with a highlighted last move, for the live preview.
const PREVIEW_FEN = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N1PN2/PP2BPPP/R2QKB1R w KQ - 0 8';

export function SettingsClient() {
  const { prefs, setPref, reset } = usePreferences();
  const [section, setSection] = useState<Section>('board');
  const [confirmReset, setConfirmReset] = useState(false);
  const current = SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Section nav: vertical on desktop, scrolling pills on mobile */}
      <nav aria-label="Settings sections" className="rk-scroll -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = s.id === section;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-11 shrink-0 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-semibold transition-colors',
                active ? 'bg-surface-3 text-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              <Icon className={cn('size-4', active ? 'text-gold-300' : 'text-fg-subtle')} aria-hidden />
              <span className="whitespace-nowrap">{s.label}</span>
              {s.stage && <ComingSoon stage={s.stage} className="ml-auto hidden lg:inline-flex" />}
            </button>
          );
        })}
      </nav>

      <Card className="min-w-0 p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{current.label}</h2>
          {!current.stage && (
            <span className="flex items-center gap-1 text-xs text-fg-subtle">
              <Check className="size-3.5 text-win" aria-hidden /> Saved on this device automatically
            </span>
          )}
        </div>

        {section === 'board' && (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-8">
              <Field label="Board" hint="Squares are drawn in CSS, so every theme stays sharp at any size.">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {BOARD_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPref('boardTheme', t.id)}
                      aria-pressed={prefs.boardTheme === t.id}
                      className={cn(
                        'group rounded-[12px] border p-2 text-left transition-colors',
                        prefs.boardTheme === t.id ? 'border-gold-500/70 bg-gold-500/10' : 'border-line hover:border-line-strong',
                      )}
                    >
                      <span
                        className="block aspect-square w-full rounded-[6px]"
                        style={{
                          backgroundImage: `repeating-conic-gradient(${t.dark} 0 25%, ${t.light} 0 50%)`,
                          backgroundSize: '50% 50%',
                        }}
                        aria-hidden
                      />
                      <span className="mt-2 block truncate text-xs font-semibold text-fg-muted group-aria-pressed:text-fg">{t.name}</span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Pieces">
                <div className="flex flex-wrap gap-3">
                  {PIECE_SETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPref('pieceSet', p.id)}
                      aria-pressed={prefs.pieceSet === p.id}
                      className={cn(
                        'cg-wrap relative flex items-center gap-3 rounded-[12px] border p-3 pr-4 text-left',
                        prefs.pieceSet === p.id ? 'border-gold-500/70 bg-gold-500/10' : 'border-line',
                      )}
                      style={{ position: 'relative' }}
                    >
                      <span className="relative block size-12 shrink-0 rounded-[8px] bg-surface-3">
                        <piece className="white knight" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{p.name}</span>
                        <span className="block text-[11px] text-fg-subtle">{p.credit}</span>
                      </span>
                    </button>
                  ))}
                  <div className="flex items-center rounded-[12px] border border-dashed border-line px-4 text-xs text-fg-subtle">
                    More piece sets are on the way
                  </div>
                </div>
              </Field>

              <Field label="Background">
                <div className="grid gap-2 sm:grid-cols-2">
                  {BACKDROPS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setPref('backdrop', b.id)}
                      aria-pressed={prefs.backdrop === b.id}
                      className={cn(
                        'rounded-[12px] border px-4 py-3 text-left transition-colors',
                        prefs.backdrop === b.id ? 'border-gold-500/70 bg-gold-500/10' : 'border-line hover:border-line-strong',
                      )}
                    >
                      <span className="block text-sm font-semibold">{b.name}</span>
                      <span className="block text-xs text-fg-subtle">{b.description}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="xl:sticky xl:top-6 xl:self-start">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Preview</p>
              <ChessBoard fen={PREVIEW_FEN} lastMove={['c1', 'e3']} label="Board preview" />
              <p className="mt-2 text-xs text-fg-subtle">Every board on the site uses these settings.</p>
            </div>
          </div>
        )}

        {section === 'gameplay' && (
          <div className="max-w-2xl divide-y divide-line">
            <PrefSwitch k="showLegalMoves" label="Show legal moves" description="Dots on squares the selected piece can move to." />
            <PrefSwitch k="highlightLastMove" label="Highlight the last move" />
            <PrefSwitch k="showCoordinates" label="Show board coordinates" />
            <PrefSwitch k="autoQueen" label="Always promote to a queen" description="Skip the promotion picker." />
            <PrefSwitch k="confirmResign" label="Confirm before resigning" />
            <div className="flex items-center justify-between gap-6 py-3">
              <div>
                <p className="text-sm font-medium">Piece animation</p>
                <p className="mt-0.5 text-[13px] text-fg-subtle">How quickly pieces glide to their new square.</p>
              </div>
              <Select<Preferences['animation']>
                label="Piece animation"
                className="w-40"
                value={prefs.animation}
                onChange={(v) => setPref('animation', v)}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'fast', label: 'Fast' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'slow', label: 'Slow' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between gap-6 py-3 opacity-60">
              <div>
                <p className="text-sm font-medium">Premoves</p>
                <p className="mt-0.5 text-[13px] text-fg-subtle">Queue a move during your opponent&apos;s turn in online games.</p>
              </div>
              <ComingSoon stage={4} />
            </div>
          </div>
        )}

        {section === 'computer' && <EngineSettings />}

        {section === 'interface' && (
          <div className="max-w-2xl divide-y divide-line">
            <PrefSwitch k="reduceMotion" label="Reduce motion" description="Turns off animations across the site, including piece movement." />
            <PrefSwitch k="sound" label="Sound effects" description="Move and capture sounds (they play once live games arrive in Stage 4)." />
            <div className="flex items-center justify-between gap-6 py-4">
              <div>
                <p className="text-sm font-medium">Reset all settings</p>
                <p className="mt-0.5 text-[13px] text-fg-subtle">Restore the default board, pieces and gameplay options on this device.</p>
              </div>
              <Button variant="outline" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {current.stage && (
          <EmptyState icon={<current.icon className="size-5" />} title={`${current.label} needs an account`}>
            {section === 'notifications'
              ? 'Challenge, friend and tournament notifications arrive with social features in Stage 8.'
              : 'Sign-up opens in Stage 2. You will then be able to edit your profile, change your email and password, and download or delete your data.'}
          </EmptyState>
        )}
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all settings?"
        description="Board, pieces, background and gameplay options go back to their defaults on this device."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                reset();
                setConfirmReset(false);
              }}
            >
              Reset settings
            </Button>
          </>
        }
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{label}</h3>
      {hint && <p className="mt-0.5 text-[13px] text-fg-subtle">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

type BoolKey = { [K in keyof Preferences]: Preferences[K] extends boolean ? K : never }[keyof Preferences];

function PrefSwitch({ k, label, description }: { k: BoolKey; label: string; description?: string }) {
  const { prefs, setPref } = usePreferences();
  return <Switch checked={prefs[k]} onChange={(v) => setPref(k, v)} label={label} description={description} />;
}

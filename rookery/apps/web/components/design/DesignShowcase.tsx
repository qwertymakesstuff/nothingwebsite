'use client';

import { Bell, Copy, Flag, Search, Settings, Swords, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BotPortrait } from '@/components/avatar/BotPortrait';
import { PlayerAvatar } from '@/components/avatar/PlayerAvatar';
import { MiniBoard } from '@/components/board/MiniBoard';
import { PlayerStrip } from '@/components/board/PlayerStrip';
import { Sparkline } from '@/components/charts/Sparkline';
import { Badge, ComingSoon } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, Stat } from '@/components/ui/Card';
import { Menu, Select } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { SampleNotice } from '@/components/ui/SampleNotice';
import { EmptyState, ErrorState, LoadingState, Skeleton, Spinner } from '@/components/ui/States';
import { Segmented, Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import type { BotProfile } from '@/lib/types';

const SWATCHES = [
  ['surface-0', 'bg-surface-0'], ['surface-1', 'bg-surface-1'], ['surface-2', 'bg-surface-2'], ['surface-3', 'bg-surface-3'], ['surface-4', 'bg-surface-4'],
  ['gold-300', 'bg-gold-300'], ['gold-400', 'bg-gold-400'], ['gold-500', 'bg-gold-500'], ['gold-600', 'bg-gold-600'], ['gold-700', 'bg-gold-700'],
  ['fg', 'bg-fg'], ['fg-muted', 'bg-fg-muted'], ['fg-subtle', 'bg-fg-subtle'], ['win', 'bg-win'], ['loss', 'bg-loss'], ['draw', 'bg-draw'], ['info', 'bg-info'],
];

export function DesignShowcase({ bots }: { bots: BotProfile[] }) {
  const [modal, setModal] = useState(false);
  const [sw, setSw] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('b');
  const [sel, setSel] = useState('rapid');

  return (
    <div className="space-y-8">
      <Section title="Colour">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {SWATCHES.map(([name, cls]) => (
            <div key={name}>
              <div className={`h-12 rounded-[10px] ring-1 ring-line-strong ring-inset ${cls}`} />
              <p className="mt-1.5 font-[family-name:var(--font-mono)] text-[11px] text-fg-subtle">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.02em]">Fraunces display</p>
        <p className="mt-2 text-lg text-fg-muted">Inter for interface text: clear at every size, with tabular figures for ratings like 1,842.</p>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-fg-muted">JetBrains Mono for clocks and notation: 1. e4 e5 2. Nf3 · 4:59.3</p>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<Swords className="size-4" />}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" icon={<Flag className="size-4" />}>Danger</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <IconButton aria-label="Settings" variant="secondary"><Settings className="size-4" /></IconButton>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl" variant="primary">Extra large</Button>
        </div>
      </Section>

      <Section title="Badges and notices">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge><Badge tone="gold">Gold</Badge><Badge tone="win">Win</Badge><Badge tone="loss">Loss</Badge>
          <Badge tone="draw">Draw</Badge><Badge tone="info">Info</Badge><ComingSoon stage={4} /><SampleNotice source="sample" />
        </div>
        <SampleNotice source="sample" variant="banner" className="mt-4">Banner form, used at the top of pages built on sample data.</SampleNotice>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Dropdowns and modal" bare>
          <Card>
            <CardBody className="flex flex-wrap items-start gap-3 pt-5">
              <Menu
                label="Example menu"
                align="start"
                items={[
                  { label: 'Copy link', icon: <Copy className="size-4" /> },
                  { label: 'Notifications', icon: <Bell className="size-4" />, hint: '3' },
                  { label: 'Delete', icon: <Trash2 className="size-4" />, disabled: true, separatorBefore: true },
                ]}
                trigger={() => <span className="inline-flex h-10 items-center rounded-[var(--radius-control)] bg-surface-3 px-4 text-sm font-semibold">Open menu</span>}
              />
              <Select
                label="Category"
                className="w-44"
                value={sel}
                onChange={setSel}
                options={[
                  { value: 'bullet', label: 'Bullet' },
                  { value: 'blitz', label: 'Blitz' },
                  { value: 'rapid', label: 'Rapid', description: '10 to 25 minutes' },
                ]}
              />
              <Button onClick={() => setModal(true)}>Open modal</Button>
            </CardBody>
          </Card>
        </Section>
        <Section title="Controls" bare>
          <Card>
            <CardBody className="pt-3">
              <Switch checked={sw} onChange={setSw} label="Switch" description="With a description line" />
              <Segmented label="Segmented" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'White' }, { value: 'b', label: 'Random' }, { value: 'c', label: 'Black' }]} />
              <div className="mt-4 flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface-3 px-3 text-sm text-fg-subtle">
                <Search className="size-4" aria-hidden /> Search players…
              </div>
            </CardBody>
          </Card>
        </Section>
      </div>

      <Section title="Tabs">
        <Card className="overflow-hidden">
          <Tabs label="Example tabs" listClassName="px-3" items={[
            { value: 'a', label: 'Overview', content: <p className="p-5 text-sm text-fg-muted">Underline tabs: arrow keys move between them.</p> },
            { value: 'b', label: 'Games', count: 12, content: <p className="p-5 text-sm text-fg-muted">Tabs can show counts.</p> },
            { value: 'c', label: 'Stats', content: <p className="p-5 text-sm text-fg-muted">Only the active panel renders.</p> },
          ]} />
        </Card>
        <Tabs className="mt-4 max-w-sm" variant="pill" label="Pill tabs" items={[
          { value: 'a', label: 'Moves', content: null }, { value: 'b', label: 'Info', content: null }, { value: 'c', label: 'Chat', content: null },
        ]} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Avatars" bare>
          <Card>
            <CardBody className="space-y-4 pt-5">
              <div className="flex items-end gap-3">
                <PlayerAvatar name="quietrook" size="xs" /><PlayerAvatar name="tempo_tamsin" size="sm" /><PlayerAvatar name="nightowl" size="md" online />
                <PlayerAvatar name="brassbishop" size="lg" online={false} />
              </div>
              <div className="flex flex-wrap gap-2">
                {bots.map((b) => <BotPortrait key={b.id} spec={b.portrait} name={b.name} size="sm" raven={b.id === 'corvus'} />)}
              </div>
            </CardBody>
          </Card>
        </Section>
        <Section title="Card + stat" bare>
          <Card>
            <CardHeader eyebrow="Eyebrow" title="Card header" action={<Badge tone="gold">Action</Badge>} />
            <CardBody className="grid grid-cols-2 gap-4">
              <Stat label="Blitz" value="1,842" hint="+24 this week" />
              <div className="self-end"><Sparkline values={[1790, 1802, 1795, 1810, 1822, 1818, 1842]} /></div>
            </CardBody>
          </Card>
        </Section>
        <Section title="Game information" bare>
          <Card className="p-4">
            <PlayerStrip name="quietrook" rating={2480} country="NO" clockMs={182_000} />
            <MiniBoard fen="r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4" lastMove={['g8', 'f6']} className="my-2" />
            <PlayerStrip name="nightowl" rating={1460} country="GB" clockMs={8_400} clockActive />
          </Card>
        </Section>
      </div>

      <Section title="Loading, empty and error states">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="space-y-3 p-5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-24 w-full" /></Card>
          <Card><LoadingState /></Card>
          <Card><EmptyState icon={<Swords className="size-5" />} title="No games yet">Your finished games appear here.</EmptyState></Card>
          <Card><ErrorState action={<Button size="sm">Try again</Button>}>We couldn&apos;t load this.</ErrorState></Card>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-fg-subtle"><Spinner className="size-4" /> Inline spinner</div>
      </Section>

      <Modal open={modal} onClose={() => setModal(false)} title="Example modal" description="Native dialog: focus is trapped, Esc and backdrop clicks close it."
        footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button variant="primary" onClick={() => setModal(false)}>Confirm</Button></>}>
        <p className="text-sm text-fg-muted">Modals are used for confirmations such as resigning or starting a new game.</p>
      </Modal>
    </div>
  );
}

function Section({ title, children, bare }: { title: string; children: React.ReactNode; bare?: boolean }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gold-400">{title}</h2>
      {bare ? children : <Card className="p-5 sm:p-6">{children}</Card>}
    </section>
  );
}

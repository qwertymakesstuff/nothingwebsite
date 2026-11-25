'use client';

import { ENGINE_INFO } from '@rookery/ai';
import { START_FEN } from '@rookery/chess-core';
import { Cpu, Gauge } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Dropdown';
import { Spinner } from '@/components/ui/States';
import { Switch } from '@/components/ui/Switch';
import { engineStatus, getEngine, subscribeEngineStatus } from '@/lib/engine/browserEngine';
import { usePreferences, type Preferences } from '@/lib/preferences';

/** Settings → Computer opponents: real, per-device options plus a live engine check. */
export function EngineSettings() {
  const { prefs, setPref } = usePreferences();
  const status = useSyncExternalStore(subscribeEngineStatus, () => engineStatus().status, () => 'idle' as const);
  const [bench, setBench] = useState<{ running: boolean; result?: string; error?: string }>({ running: false });

  const runBenchmark = async () => {
    setBench({ running: true });
    try {
      const engine = getEngine();
      const r = await engine.search({ fen: START_FEN, movetimeMs: 1000 });
      const depth = r.candidates[0]?.depth ?? 0;
      setBench({ running: false, result: `Depth ${depth} in ${(r.ms / 1000).toFixed(1)}s. Best move ${r.bestmove}. The engine is working.` });
    } catch (e) {
      setBench({ running: false, error: e instanceof Error ? e.message : 'The engine did not respond.' });
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="divide-y divide-line">
        <div className="flex items-center justify-between gap-6 py-3">
          <div>
            <p className="text-sm font-medium">Move speed</p>
            <p className="mt-0.5 text-[13px] text-fg-subtle">How long opponents pause before moving. Strength is the same either way.</p>
          </div>
          <Select<Preferences['botMoveSpeed']>
            label="Move speed"
            className="w-44"
            value={prefs.botMoveSpeed}
            onChange={(v) => setPref('botMoveSpeed', v)}
            options={[
              { value: 'natural', label: 'Natural', description: 'Human-like thinking time' },
              { value: 'fast', label: 'Fast' },
              { value: 'instant', label: 'Instant', description: 'Moves as soon as it has searched' },
            ]}
          />
        </div>
        <Switch checked={prefs.botChat} onChange={(v) => setPref('botChat', v)} label="Opponent chat" description="Show opponents' greetings and reactions during games." />
      </div>

      <div className="mt-6 rounded-[14px] border border-line p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Cpu className="size-4 text-gold-400" aria-hidden /> Engine
        </p>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[9rem_1fr]">
          <dt className="text-fg-subtle">Engine</dt>
          <dd>{ENGINE_INFO.name}</dd>
          <dt className="text-fg-subtle">Runs</dt>
          <dd>In your browser, in a background worker (nothing is sent to a server)</dd>
          <dt className="text-fg-subtle">Status</dt>
          <dd className="capitalize">{status === 'idle' ? 'Not loaded yet' : status}</dd>
          <dt className="text-fg-subtle">Licence</dt>
          <dd>
            {ENGINE_INFO.licence} ·{' '}
            <a className="text-gold-300 underline" href={ENGINE_INFO.source}>
              source
            </a>{' '}
            ·{' '}
            <a className="text-gold-300 underline" href="/engine/COPYING.txt">
              licence text
            </a>
          </dd>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" icon={bench.running ? <Spinner className="size-4" /> : <Gauge className="size-4" />} onClick={runBenchmark} disabled={bench.running}>
            {bench.running ? 'Testing…' : 'Test the engine'}
          </Button>
          {bench.result && <p className="text-sm text-win">{bench.result}</p>}
          {bench.error && (
            <p className="text-sm text-loss" role="alert">
              {bench.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

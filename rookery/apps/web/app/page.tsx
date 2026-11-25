import { LocalGame } from '@/components/board/LocalGame';
import { ServerStatus } from '@/components/ServerStatus';

export default function HomePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Board" className="mx-auto w-full max-w-[min(100%,78vh)]">
        <LocalGame />
      </section>

      <aside className="space-y-4">
        <div className="rounded-xl bg-ink-900/90 p-5 ring-1 ring-white/5">
          <p className="text-xs font-bold uppercase tracking-widest text-ember-400">Coming soon</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">Rookery</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-200">
            An online chess club: rated games against players worldwide, computer opponents with
            personalities, daily puzzles, game review and tournaments. Free to play.
          </p>
          <p className="mt-3 text-sm text-ink-400">
            While it&apos;s being built, try the board: it&apos;s a two-player game on one device.
          </p>
        </div>

        <div className="rounded-xl bg-ink-900/90 p-5 ring-1 ring-white/5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-ink-400">System status</h2>
          <ServerStatus />
        </div>
      </aside>
    </div>
  );
}

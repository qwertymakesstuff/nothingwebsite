import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Licenses' };

const REPO = 'https://github.com/qwertymakesstuff/nothingwebsite/tree/main/rookery';

const COMPONENTS: { name: string; licence: string; use: string; source: string }[] = [
  {
    name: 'Chessground',
    licence: 'GPL-3.0-or-later',
    use: 'The interactive chessboard.',
    source: 'https://github.com/lichess-org/chessground',
  },
  {
    name: 'Chess pieces “cburnett” by Colin M.L. Burnett',
    licence: 'GPL-2.0-or-later (also available under BSD and GFDL)',
    use: 'Default piece set, shipped with Chessground.',
    source: 'https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces',
  },
  {
    name: 'chess.js',
    licence: 'BSD-2-Clause',
    use: 'Chess rules and move validation.',
    source: 'https://github.com/jhlywa/chess.js',
  },
  {
    name: 'Next.js, React',
    licence: 'MIT',
    use: 'Website framework.',
    source: 'https://github.com/vercel/next.js',
  },
  {
    name: 'Zod',
    licence: 'MIT',
    use: 'Message validation.',
    source: 'https://github.com/colinhacks/zod',
  },
  {
    name: 'Supabase JS',
    licence: 'MIT',
    use: 'Accounts and data.',
    source: 'https://github.com/supabase/supabase-js',
  },
];

export default function LicensesPage() {
  return (
    <article className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">Licenses</h1>
        <p className="mt-2 leading-relaxed text-ink-200">
          Rookery is free software: you can redistribute it and/or modify it under the terms of the{' '}
          <a className="text-ember-400 underline" href="https://www.gnu.org/licenses/gpl-3.0.html">
            GNU General Public License, version 3
          </a>{' '}
          or (at your option) any later version. The complete source code of this website is available at{' '}
          <a className="text-ember-400 underline" href={REPO}>
            github.com/qwertymakesstuff/nothingwebsite
          </a>
          . Rookery is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-bold">Third-party software and assets</h2>
        <ul className="divide-y divide-white/5 overflow-hidden rounded-xl bg-ink-900/90 ring-1 ring-white/5">
          {COMPONENTS.map((c) => (
            <li key={c.name} className="grid gap-1 p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-ink-400">{c.use}</p>
              </div>
              <div className="text-sm sm:text-right">
                <p className="text-ink-200">{c.licence}</p>
                <a className="text-ember-400 underline" href={c.source}>
                  source
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm text-ink-400">
        Rookery is an independent project. It is not affiliated with Lichess, Chess.com or any other chess site.
      </p>
    </article>
  );
}

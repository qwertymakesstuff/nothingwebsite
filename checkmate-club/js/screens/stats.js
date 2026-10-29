// Statistics: club-wide totals and a record for each game.

import { h } from '../ui/dom.js';
import { screenHeader, scoreDisplay, button } from '../ui/components.js';
import { GAMES } from '../core/registry.js';
import { formatTime } from '../core/timer.js';

export function render(app) {
  const body = h('div', { class: 'stats-body' });

  function draw() {
    const t = app.stats.totals();
    const winRate = t.played ? `${Math.round((t.wins / t.played) * 100)}%` : '—';
    body.replaceChildren(...[
      h('section', { class: 'stats-totals', 'aria-label': 'Totals' },
        scoreDisplay({ label: 'Games played', value: t.played }),
        scoreDisplay({ label: 'Wins', value: t.wins }),
        scoreDisplay({ label: 'Win rate', value: winRate }),
        scoreDisplay({ label: 'Best streak', value: t.bestStreak }),
        scoreDisplay({ label: 'Time played', value: formatTime(t.totalTime) })),
      h('div', { class: 'table-scroll' },
        h('table', { class: 'stats-table' },
          h('caption', {}, 'Record by game'),
          h('thead', {}, h('tr', {}, ['Game', 'Played', 'Won', 'Lost', 'Drawn', 'Streak', 'Best streak', 'Best time', 'Best score'].map(c => h('th', { scope: 'col' }, c)))),
          h('tbody', {}, GAMES.map(g => {
            const r = app.stats.get(g.id);
            return h('tr', {},
              h('th', { scope: 'row' }, h('span', { 'aria-hidden': 'true', class: 'stats-glyph' }, g.glyph), g.name),
              [r.played, r.wins, r.losses, r.draws, r.streak, r.bestStreak].map(v => h('td', {}, v)),
              h('td', {}, r.bestTime == null ? '—' : formatTime(r.bestTime)),
              h('td', {}, r.bestScore == null ? '—' : r.bestScore));
          })))),
      t.played ? null : h('p', { class: 'stats-empty' }, 'No games finished yet. Results appear here as each table opens.'),
    ].filter(Boolean));
  }

  draw();
  const el = h('main', { class: 'stats' },
    screenHeader({ title: 'Statistics', eyebrow: 'The club ledger', onBack: () => app.go('menu'), backLabel: 'Menu' }),
    body,
    h('div', { class: 'settings-foot' },
      button({ label: 'Reset statistics', variant: 'ghost', onClick: async () => {
        if (await app.confirm({ title: 'Reset all statistics?', message: 'Every record in the ledger will be erased. This can’t be undone.', confirmLabel: 'Erase records', danger: true })) { app.stats.reset(); draw(); }
      } })));
  return { el, title: 'Statistics' };
}

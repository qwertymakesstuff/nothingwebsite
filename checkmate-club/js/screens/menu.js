// Main menu: the club entrance, with a tile for every table and the way into each section.

import { h } from '../ui/dom.js';
import { button, gameCard } from '../ui/components.js';
import { GAMES } from '../core/registry.js';

export function render(app) {
  const name = app.settings.get('playerName');
  const totals = app.stats.totals();
  const el = h('main', { class: 'menu' },
    h('section', { class: 'menu-hero' },
      h('div', { class: 'menu-crest', 'aria-hidden': 'true' }, '♚'),
      h('p', { class: 'eyebrow' }, 'Members’ lounge · est. tonight'),
      h('h1', { class: 'menu-title' }, 'Checkmate Club'),
      h('p', { class: 'menu-welcome' }, `Good evening, ${name}. Chess, cards and a quiet table.`),
      h('nav', { class: 'menu-actions', 'aria-label': 'Main menu' },
        button({ label: 'Enter the library', icon: '♠', variant: 'primary', size: 'lg', onClick: () => app.go('library'), attrs: { 'data-autofocus': true } }),
        button({ label: 'Statistics', icon: '▤', onClick: () => app.go('stats') }),
        button({ label: 'Settings', icon: '⚙', onClick: () => app.go('settings') }),
        button({ label: 'Rules', icon: '❦', onClick: () => app.go('rules') })),
      totals.played ? h('p', { class: 'menu-totals' }, `${totals.played} games played · ${totals.wins} won`) : null),
    h('section', { class: 'menu-tables', 'aria-labelledby': 'menu-tables-h' },
      h('h2', { id: 'menu-tables-h', class: 'section-title' }, 'The tables'),
      h('div', { class: 'game-grid' },
        GAMES.map(g => gameCard(g, { record: app.stats.get(g.id), onOpen: () => app.go('game', g.id), onRules: () => app.go('rules', g.id) })),
        h('div', { class: 'game-card game-card-more', 'aria-hidden': 'true' },
          h('span', { class: 'game-card-glyph' }, '♣'),
          h('span', {}, 'More tables are being set up')))),
    h('footer', { class: 'menu-foot' },
      h('a', { href: '../' }, '← missing.website'),
      h('span', {}, app.store.persistent ? 'Progress is saved in this browser.' : 'This browser is not saving progress (private mode or blocked storage).')));
  return { el, title: '' };
}

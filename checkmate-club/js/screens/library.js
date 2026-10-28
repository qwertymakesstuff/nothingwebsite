// Game library: every table with filters by kind, arrow-key navigation and a rules shortcut.

import { h } from '../ui/dom.js';
import { gameCard, screenHeader } from '../ui/components.js';
import { CATEGORIES, gamesIn } from '../core/registry.js';

export function render(app) {
  let category = 'all';
  const grid = h('div', { class: 'game-grid', id: 'library-grid' });
  const tabs = CATEGORIES.map(([id, label]) => h('button', {
    type: 'button', class: 'tab', role: 'tab', id: `tab-${id}`, 'aria-controls': 'library-grid',
    'aria-selected': String(id === category), tabindex: id === category ? '0' : '-1',
    onclick: () => select(id),
  }, label));

  function select(id) {
    category = id;
    for (const t of tabs) {
      const on = t.id === `tab-${id}`;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    grid.setAttribute('aria-labelledby', `tab-${id}`);
    grid.replaceChildren(...gamesIn(id).map(g =>
      gameCard(g, { record: app.stats.get(g.id), onOpen: () => app.go('game', g.id), onRules: () => app.go('rules', g.id) })));
  }

  const tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Filter tables' }, tabs);
  tablist.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0 || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); next.click();
  });

  // Arrow keys move between cards, following the grid's visual columns.
  grid.addEventListener('keydown', e => {
    const cards = [...grid.querySelectorAll('.game-card-open')];
    const i = cards.indexOf(document.activeElement);
    if (i < 0) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (!step) return;
    const next = cards[i + step];
    if (next) { e.preventDefault(); next.focus(); }
  });

  select('all');
  const el = h('main', { class: 'library' },
    screenHeader({ title: 'Game Library', eyebrow: 'Choose a table', onBack: () => app.go('menu'), backLabel: 'Menu' }),
    tablist, grid,
    h('p', { class: 'library-note' }, 'Tables marked “In development” are set up but not playable yet. Each one opens as soon as its game is finished.'));
  return { el, title: 'Library' };
}

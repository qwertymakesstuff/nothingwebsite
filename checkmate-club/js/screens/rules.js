// Rules and instructions: one page per game, plus how to get around the club.

import { h } from '../ui/dom.js';
import { screenHeader, badge, button } from '../ui/components.js';
import { GAMES, getGame, isPlayable, statusLabel } from '../core/registry.js';

const CONTROLS = {
  id: 'controls',
  name: 'Club controls',
  rules: [
    { heading: 'Mouse', items: ['Click a table to open it. Every button and setting works with a mouse alone.'] },
    { heading: 'Keyboard', items: [
      'Tab and Shift+Tab move between controls; Enter or Space activates them.',
      'Arrow keys move between tables in the library and between tabs.',
      'Esc goes back a screen or closes a dialog. At a table, Esc or P pauses the game.',
    ] },
    { heading: 'Saving', items: ['Settings and statistics are saved in this browser automatically. Nothing is sent anywhere.'] },
  ],
};

export function rulesContent(game) {
  return h('div', { class: 'rules-body' },
    game.tagline ? h('p', { class: 'rules-lead' }, game.tagline) : null,
    game.rules.map(s => h('section', { class: 'rules-section' },
      h('h3', {}, s.heading),
      h('ul', {}, s.items.map(i => h('li', {}, i))))));
}

export function render(app, param) {
  const pages = [...GAMES, CONTROLS];
  const page = pages.find(p => p.id === param) || pages[0];
  const nav = h('nav', { class: 'rules-nav', 'aria-label': 'Rules pages' },
    pages.map(p => h('a', { href: `#/rules/${p.id}`, class: 'rules-link', 'aria-current': p === page ? 'page' : null },
      p.glyph ? h('span', { 'aria-hidden': 'true' }, p.glyph) : h('span', { 'aria-hidden': 'true' }, '⌨'), p.name)));
  const game = getGame(page.id);
  const article = h('article', { class: 'rules-article', 'aria-labelledby': 'rules-h' },
    h('header', { class: 'rules-article-head' },
      h('h2', { id: 'rules-h' }, page.name),
      game ? badge(statusLabel(game), isPlayable(game) ? 'ready' : 'pending') : null),
    rulesContent(page),
    game ? h('div', { class: 'rules-actions' },
      button({ label: isPlayable(game) ? `Play ${game.name}` : `Visit the ${game.name} table`, variant: 'primary', onClick: () => app.go('game', game.id) })) : null);
  const el = h('main', { class: 'rules' },
    screenHeader({ title: 'Rules & Instructions', eyebrow: 'How to play', onBack: () => history.length > 1 ? history.back() : app.go('menu') }),
    h('div', { class: 'rules-layout' }, nav, article));
  return { el, title: `${page.name} rules` };
}

// The game screen every table shares: top bar with timer and pause, player panels, score
// displays and the table itself. Until a game's rules engine and renderer exist (later stages),
// the table is set but clearly marked as not yet playable.

import { h } from '../ui/dom.js';
import { button, badge, scoreDisplay, playerInfo, gameTimer, settingsPanel } from '../ui/components.js';
import { getGame, isPlayable, statusLabel } from '../core/registry.js';
import { GameTimer, formatTime } from '../core/timer.js';
import * as rules from './rules.js';

const OPPONENT = {
  chess: { role: 'Opponent', name: 'Club computer', avatar: '♛' },
  poker: { role: 'Opponents', name: 'Five club regulars', avatar: '♣' },
  blackjack: { role: 'House', name: 'The dealer', avatar: '♦' },
  solitaire: null,
};

function tablePreview(game) {
  if (game.id === 'chess') {
    return h('div', { class: 'preview-board', 'aria-hidden': 'true' },
      Array.from({ length: 64 }, (_, i) => h('span', { class: (Math.floor(i / 8) + i) % 2 ? 'dark' : 'light' })));
  }
  const slot = () => h('span', { class: 'preview-card' });
  const rows = { poker: [5, 2], blackjack: [2, 2], solitaire: [7] }[game.id] || [3];
  return h('div', { class: `preview-cards preview-${game.id}`, 'aria-hidden': 'true' },
    rows.map(n => h('div', { class: 'preview-row' }, Array.from({ length: n }, slot))));
}

export function render(app, id) {
  const game = getGame(id);
  if (!game) {
    const el = h('main', { class: 'not-found' },
      h('h1', {}, 'No such table'),
      h('p', {}, 'That game isn’t part of the club.'),
      button({ label: 'Back to the library', variant: 'primary', onClick: () => app.go('library'), attrs: { 'data-back': true } }));
    return { el, title: 'Not found' };
  }

  const playable = isPlayable(game);
  const timer = new GameTimer();
  const timerEl = gameTimer(timer, { label: 'At the table' });
  const record = app.stats.get(game.id);
  const you = playerInfo({ name: app.settings.get('playerName'), role: 'You', avatar: '★', detail: `${record.wins} wins` });
  const opp = OPPONENT[game.id] && playerInfo({ ...OPPONENT[game.id], side: 'right', detail: 'Waiting' });
  you.setActive(true);
  const offName = app.settings.on(key => { if (key === 'playerName' || key === null) you.setName(app.settings.get('playerName')); });

  let pauseDlg = null;
  function pause() {
    if (pauseDlg) return;
    timer.pause(); timerEl.refresh();
    pauseDlg = app.dialog({
      title: 'Paused',
      className: 'dialog-pause',
      body: h('div', { class: 'pause-menu' },
        h('p', { class: 'pause-sub' }, `${game.name} · ${formatTime(timer.elapsed())} at the table`),
        h('div', { class: 'pause-actions' },
          button({ label: 'Resume', icon: '▶', variant: 'primary', onClick: () => pauseDlg.close(), attrs: { 'data-autofocus': true } }),
          button({ label: 'Restart', icon: '↺', onClick: restart }),
          button({ label: 'Rules', icon: '❦', onClick: showRules }),
          button({ label: 'Settings', icon: '⚙', onClick: showSettings }),
          button({ label: 'Quit to library', icon: '←', variant: 'danger', onClick: quit }))),
      onClose: () => { pauseDlg = null; timer.start(); timerEl.refresh(); },
    });
  }

  async function guard(title, message, confirmLabel) {
    // Only a game in progress has anything to lose; in-development tables never do.
    if (!playable || !app.settings.get('confirmLeave')) return true;
    return app.confirm({ title, message, confirmLabel, danger: true });
  }

  async function restart() {
    if (!(await guard('Restart this game?', 'The current game will be abandoned.', 'Restart'))) return;
    timer.reset();
    pauseDlg?.close();
  }

  async function quit() {
    if (!(await guard('Quit to the library?', 'The current game will be abandoned.', 'Quit'))) return;
    app.go('library');
  }

  function showRules() {
    const dlg = app.dialog({ title: `${game.name} rules`, className: 'dialog-wide', body: rules.rulesContent(game),
      actions: [button({ label: 'Close', variant: 'primary', onClick: () => dlg.close() })] });
  }

  function showSettings() {
    const panel = settingsPanel(app.settings);
    app.dialog({ title: 'Settings', className: 'dialog-wide', body: panel, onClose: () => panel.destroy() });
  }

  const scores = [
    scoreDisplay({ label: 'Played', value: record.played }),
    scoreDisplay({ label: 'Wins', value: record.wins }),
    scoreDisplay({ label: 'Best streak', value: record.bestStreak }),
  ];

  const el = h('main', { class: `game game-${game.id}`, style: { '--accent': game.accent } },
    h('header', { class: 'game-bar' },
      button({ label: 'Library', icon: '←', variant: 'ghost', onClick: quit, attrs: { 'data-back': true } }),
      h('div', { class: 'game-bar-title' }, h('h1', {}, game.name), badge(statusLabel(game), playable ? 'ready' : 'pending')),
      timerEl,
      button({ label: 'Pause', icon: '❚❚', onClick: pause, title: 'Pause (Esc or P)', attrs: { 'aria-keyshortcuts': 'Escape P' } })),
    h('div', { class: 'game-players' }, you, h('div', { class: 'game-scores' }, scores), opp),
    h('section', { class: 'table', 'aria-label': `${game.name} table` },
      h('div', { class: 'table-felt' },
        tablePreview(game),
        playable ? null : h('div', { class: 'table-notice', role: 'status' },
          h('h2', {}, 'This table isn’t open yet'),
          h('p', {}, `${game.name} is being built and arrives in Stage ${game.stage}. Nothing here is playable yet; the table, timer and pause menu are ready for it.`),
          h('div', { class: 'table-notice-actions' },
            button({ label: 'Read the rules', variant: 'primary', onClick: () => app.go('rules', game.id), attrs: { 'data-autofocus': true } }),
            button({ label: 'Back to the library', onClick: () => app.go('library') }))))));

  const onVisibility = () => { if (document.hidden) pause(); };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    el, title: game.name,
    enter: () => timer.start(),
    onKey(e) {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (e.target.matches?.('input, select, textarea')) return false;
        e.preventDefault(); pause(); return true;
      }
      return false;
    },
    destroy() { timerEl.destroy(); offName(); document.removeEventListener('visibilitychange', onVisibility); },
    timer, pause,
  };
}

// The game screen every table shares: top bar with timer and pause, the pause menu, the game-over
// dialog and statistics recording. A playable game supplies a "table" (its own rules engine and
// renderer) through TABLES; games still in development show a set-but-closed table instead.

import { h } from '../ui/dom.js';
import { button, badge, scoreDisplay, playerInfo, gameTimer, settingsPanel } from '../ui/components.js';
import { getGame, isPlayable, statusLabel } from '../core/registry.js';
import { GameTimer, formatTime } from '../core/timer.js';
import * as rules from './rules.js';
import { createChessTable } from '../games/chess/table.js';

export const TABLES = { chess: createChessTable };

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

  const playable = isPlayable(game) && TABLES[game.id];
  const timer = new GameTimer();
  const timerEl = gameTimer(timer, { label: playable ? 'Game time' : 'At the table' });
  let table = null;
  let paused = false;

  // ---- services offered to the table ----
  const frame = {
    app, game, timer,
    get paused() { return paused; },
    pause: () => pause(),
    refreshTimer: () => timerEl.refresh(),
    // Record a finished game and show the game-over dialog.
    gameOver({ title, message, outcome, record = true, actions = [] }) {
      timer.pause(); timerEl.refresh();
      const seconds = timer.elapsed();
      let rec = null;
      if (record && outcome) rec = app.stats.record(game.id, { result: outcome, time: seconds });
      app.audio.play(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'gameover');
      const dlg = app.dialog({
        title, className: `dialog-gameover outcome-${outcome || 'none'}`,
        body: h('div', { class: 'gameover' },
          h('p', { class: 'gameover-message' }, message),
          h('p', { class: 'gameover-meta' }, `Game time ${formatTime(seconds)}`),
          rec ? h('div', { class: 'gameover-record' },
            scoreDisplay({ label: 'Wins', value: rec.wins }),
            scoreDisplay({ label: 'Draws', value: rec.draws }),
            scoreDisplay({ label: 'Losses', value: rec.losses }),
            scoreDisplay({ label: 'Streak', value: rec.streak })) : null,
          !record ? h('p', { class: 'gameover-meta' }, 'Two-player games aren’t counted in your record.') : null),
        actions: [
          ...actions.map(a => button({ ...a, onClick: () => { dlg.close(); a.onClick(); } })),
          button({ label: 'Library', variant: 'ghost', onClick: () => { dlg.close(); app.go('library'); } }),
        ],
      });
      return dlg;
    },
  };

  // ---- pause menu ----
  let pauseDlg = null;
  function pause() {
    if (pauseDlg) return;
    paused = true;
    timer.pause(); timerEl.refresh();
    table?.onPause?.();
    pauseDlg = app.dialog({
      title: 'Paused',
      className: 'dialog-pause',
      body: h('div', { class: 'pause-menu' },
        h('p', { class: 'pause-sub' }, `${game.name} · ${formatTime(timer.elapsed())}`),
        h('div', { class: 'pause-actions' },
          button({ label: 'Resume', icon: '▶', variant: 'primary', onClick: () => pauseDlg.close(), attrs: { 'data-autofocus': true } }),
          button({ label: playable ? 'New game' : 'Restart', icon: '↺', onClick: restart }),
          button({ label: 'Rules', icon: '❦', onClick: showRules }),
          button({ label: 'Settings', icon: '⚙', onClick: showSettings }),
          button({ label: 'Quit to library', icon: '←', variant: 'danger', onClick: quit }))),
      onClose: () => {
        pauseDlg = null; paused = false;
        if (!table || table.inProgress?.()) timer.start();
        timerEl.refresh();
        table?.onResume?.();
      },
    });
  }

  async function guard(title, message, confirmLabel) {
    // Only a game in progress has anything to lose.
    if (!table?.inProgress?.() || !app.settings.get('confirmLeave')) return true;
    return app.confirm({ title, message, confirmLabel, danger: true });
  }

  async function restart() {
    if (!(await guard('Start a new game?', 'The current game will be abandoned.', 'New game'))) return;
    pauseDlg?.close();
    if (table) table.newGame(); else timer.reset();
  }

  async function quit() {
    if (!(await guard('Quit to the library?', 'Your game is saved; you can carry on next time you sit down.', 'Quit'))) return;
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

  const bar = h('header', { class: 'game-bar' },
    button({ label: 'Library', icon: '←', variant: 'ghost', onClick: quit, attrs: { 'data-back': true } }),
    h('div', { class: 'game-bar-title' }, h('h1', {}, game.name), badge(statusLabel(game), isPlayable(game) ? 'ready' : 'pending')),
    timerEl,
    button({ label: 'Pause', icon: '❚❚', onClick: pause, title: 'Pause (Esc or P)', attrs: { 'aria-keyshortcuts': 'Escape P' } }));

  let body;
  if (playable) {
    table = TABLES[game.id](frame);
    body = table.el;
  } else {
    const record = app.stats.get(game.id);
    const you = playerInfo({ name: app.settings.get('playerName'), role: 'You', avatar: '★', detail: `${record.wins} wins` });
    const opp = OPPONENT[game.id] && playerInfo({ ...OPPONENT[game.id], side: 'right', detail: 'Waiting' });
    you.setActive(true);
    body = h('div', { class: 'game-placeholder' },
      h('div', { class: 'game-players' }, you, h('div', { class: 'game-scores' },
        scoreDisplay({ label: 'Played', value: record.played }),
        scoreDisplay({ label: 'Wins', value: record.wins }),
        scoreDisplay({ label: 'Best streak', value: record.bestStreak })), opp),
      h('section', { class: 'table', 'aria-label': `${game.name} table` },
        h('div', { class: 'table-felt' },
          tablePreview(game),
          h('div', { class: 'table-notice', role: 'status' },
            h('h2', {}, 'This table isn’t open yet'),
            h('p', {}, `${game.name} is being built and arrives in Stage ${game.stage}. Nothing here is playable yet.`),
            h('div', { class: 'table-notice-actions' },
              button({ label: 'Read the rules', variant: 'primary', onClick: () => app.go('rules', game.id), attrs: { 'data-autofocus': true } }),
              button({ label: 'Back to the library', onClick: () => app.go('library') }))))));
  }

  const el = h('main', { class: `game game-${game.id}`, style: { '--accent': game.accent } }, bar, body);

  const onVisibility = () => { if (document.hidden && !app.dialogOpen?.()) pause(); };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    el, title: game.name,
    enter: () => { if (table) table.enter?.(); else timer.start(); },
    onKey(e) {
      if (table?.onKey?.(e)) return true;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (e.target.matches?.('input, select, textarea')) return false;
        e.preventDefault(); pause(); return true;
      }
      return false;
    },
    destroy() { timerEl.destroy(); table?.destroy?.(); document.removeEventListener('visibilitychange', onVisibility); },
    timer, pause, table,
  };
}

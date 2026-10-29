// The chess table: connects the game controller, the board renderer and the computer opponent,
// and draws the players, move history, captured pieces and controls around the board.

import { h } from '../../ui/dom.js';
import { button, playerInfo } from '../../ui/components.js';
import { ChessGame, REASONS, colorName, other } from './game.js';
import { BoardView } from './board.js';
import { AiClient } from './ai-client.js';
import { LEVELS, getLevel, acceptsDraw } from './ai.js';
import { pieceImage } from './pieces.js';
import { WHITE, BLACK, START_FEN, colorOf } from './engine.js';
import { KEYS } from '../../core/storage.js';

const PIECE_VALUE = [0, 1, 3, 3, 5, 9, 0];
const LETTER = ['', 'p', 'n', 'b', 'r', 'q', 'k'];
const SAVE_KEY = KEYS.progress('chess');

export function sanitizeSetup(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    mode: s.mode === 'local' ? 'local' : 'ai',
    color: ['w', 'b', 'random'].includes(s.color) ? s.color : 'w',
    level: LEVELS.some(l => l.id === s.level) ? s.level : 'casual',
  };
}

export function createChessTable(frame) {
  const { app, timer } = frame;
  const assets = app.assets;
  const ai = new AiClient();
  let saved = app.store.read(SAVE_KEY) || {};
  let setup = sanitizeSetup(saved.setup);
  let game = null;
  let thinking = false;
  let heldAiMove = null;
  let finished = false;

  // ---- layout ----
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  const status = h('p', { class: 'chess-status', role: 'status' });
  const feedback = h('p', { class: 'chess-feedback', 'aria-live': 'assertive' });
  const moveList = h('ol', { class: 'move-list', 'aria-label': 'Moves played' });
  const players = { top: playerInfo({ name: '', role: '', avatar: '♛' }), bottom: playerInfo({ name: '', role: '', avatar: '★' }) };
  const captureRows = { top: h('div', { class: 'captures' }), bottom: h('div', { class: 'captures' }) };

  const board = new BoardView({
    assets,
    onMove: (from, to) => tryMove(from, to),
    legalTargets: sq => (game ? game.targets(sq) : []),
    canMove: sq => !!game && game.isHumanTurn() && !thinking && colorOf(game.chess.get(sq)) === game.turn,
    announce: text => { live.textContent = text; },
  });

  const controls = {
    undo: button({ label: 'Undo', icon: '↶', size: 'sm', onClick: () => undo(), title: 'Take back a move (U)' }),
    flip: button({ label: 'Flip board', icon: '⇅', size: 'sm', onClick: () => flip(), title: 'Flip the board (F)' }),
    draw: button({ label: 'Offer draw', icon: '½', size: 'sm', onClick: () => offerDraw() }),
    resign: button({ label: 'Resign', icon: '⚑', size: 'sm', variant: 'danger', onClick: () => resign() }),
    newGame: button({ label: 'New game', icon: '↺', size: 'sm', onClick: () => newGame() }),
  };

  const el = h('div', { class: 'chess-table' },
    h('section', { class: 'chess-board-wrap', 'aria-label': 'Board' },
      h('div', { class: 'chess-player chess-player-top' }, players.top, captureRows.top),
      h('div', { class: 'chess-board-frame' }, board.el),
      h('div', { class: 'chess-player chess-player-bottom' }, players.bottom, captureRows.bottom)),
    h('aside', { class: 'chess-side', 'aria-label': 'Game information' },
      status, feedback,
      h('div', { class: 'move-panel' }, h('h2', { class: 'side-title' }, 'Moves'), moveList),
      h('div', { class: 'chess-controls' }, Object.values(controls)),
      h('p', { class: 'chess-help' }, 'Click a piece, then a square — or drag it. Keyboard: Tab to the board, arrows to move, Enter to pick up and place.'),
      live));

  // ---- settings ----
  function applySettings() {
    board.setOptions({
      hints: app.settings.get('chessHints'),
      coordinates: app.settings.get('chessCoordinates'),
      theme: app.settings.get('chessBoard'),
      duration: app.duration,
    });
  }
  const offSettings = app.settings.on(key => {
    if (key === null || key.startsWith('chess') || key === 'animationSpeed' || key === 'reduceMotion') applySettings();
  });

  // ---- persistence ----
  function save() {
    if (!game) return;
    const data = { setup, game: null };
    if (!finished && game.moveList.length) {
      data.game = { mode: game.mode, human: game.human, level: game.level, moves: game.moveList.map(m => ({ from: m.from, to: m.to, promotion: m.promotion })), elapsedMs: timer.elapsedMs() };
    }
    saved = data;
    app.store.write(SAVE_KEY, data);
  }

  // ---- drawing ----
  function sideInfo(color) {
    if (game.mode === 'local') return { name: colorName(color), role: color === WHITE ? 'White' : 'Black', avatar: color === WHITE ? '♔' : '♚' };
    return color === game.human
      ? { name: app.settings.get('playerName'), role: `You · ${colorName(color)}`, avatar: '★' }
      : { name: getLevel(game.level).name, role: `Club computer · ${colorName(color)}`, avatar: '♛' };
  }

  function drawCaptures(row, color) {
    const caps = game.captured();
    const mine = caps[color].reduce((s, t) => s + PIECE_VALUE[t], 0), theirs = caps[other(color)].reduce((s, t) => s + PIECE_VALUE[t], 0);
    row.replaceChildren(
      ...caps[color].map(t => h('img', { src: pieceImage(assets, other(color), LETTER[t]), alt: '', class: 'capture-icon' })),
      ...(mine > theirs ? [h('span', { class: 'material' }, `+${mine - theirs}`)] : []));
    row.setAttribute('aria-label', caps[color].length ? `Captured: ${caps[color].map(t => ['', 'pawn', 'knight', 'bishop', 'rook', 'queen'][t]).join(', ')}` : 'No captures');
  }

  function refresh({ move = null } = {}) {
    const bottom = board.orientation, top = other(bottom);
    for (const [slot, color] of [['top', top], ['bottom', bottom]]) {
      const info = sideInfo(color);
      players[slot].setName(info.name);
      players[slot].querySelector('.player-role').textContent = info.role;
      players[slot].querySelector('.player-avatar').textContent = info.avatar;
      players[slot].setActive(!game.over && game.turn === color);
      players[slot].setDetail(!game.over && game.turn === color ? (thinking && game.isComputerTurn() ? 'Thinking…' : 'To move') : '');
      drawCaptures(captureRows[slot], color);
    }
    board.setPosition(game.chess.board, { move, check: game.checkSquare(), lastMove: game.moveList[game.moveList.length - 1] || null });

    const rows = game.history();
    moveList.replaceChildren(...rows.map((r, i) => h('li', { class: i === rows.length - 1 ? 'is-latest' : '' },
      h('span', { class: 'move-n' }, `${r.n}.`), h('span', { class: 'move-w' }, r.white), h('span', { class: 'move-b' }, r.black))));
    moveList.scrollTop = moveList.scrollHeight;

    let text;
    if (game.over) text = `${REASONS[game.ended.reason]} — ${game.ended.winner ? `${colorName(game.ended.winner)} wins` : 'draw'}`;
    else if (thinking) text = 'The computer is thinking…';
    else if (game.mode === 'ai') text = game.turn === game.human ? 'Your move' : 'Computer to move';
    else text = `${colorName(game.turn)} to move`;
    if (!game.over && game.chess.inCheck()) text += ' — check!';
    status.textContent = text;
    status.classList.toggle('is-check', !game.over && game.chess.inCheck());

    controls.undo.disabled = !game.canUndo() || thinking;
    controls.draw.disabled = game.over || thinking || !game.moveList.length;
    controls.resign.disabled = game.over || !game.moveList.length;
  }

  function say(text, tone = 'info') {
    feedback.textContent = text;
    feedback.dataset.tone = tone;
    clearTimeout(say.t);
    say.t = setTimeout(() => { feedback.textContent = ''; }, 4000);
  }

  // ---- playing ----
  async function tryMove(from, to) {
    if (!game || game.over || thinking) return;
    if (to < 0 || !game.targets(from).some(t => t.to === to)) {
      const why = game.explainIllegal(from, to);
      say(why, 'warn');
      live.textContent = why;
      if (to >= 0) { app.audio.play('error'); board.shake(from); }
      return;
    }
    let promotion;
    if (game.needsPromotion(from, to)) {
      promotion = await choosePromotion(game.turn);
      if (!promotion) { refresh(); return; }
    }
    commit({ from, to, promotion });
  }

  function commit(input) {
    const m = game.play(input);
    if (!m) return null;
    feedback.textContent = '';
    if (game.moveList.length === 1) timer.start();
    app.audio.play(m.san.includes('#') || m.san.includes('+') ? 'check' : m.captured ? 'capture' : 'move');
    live.textContent = `${colorName(m.color)} played ${m.san}.`;
    refresh({ move: m });
    save();
    if (game.over) endGame();
    else maybeComputerMove();
    return m;
  }

  async function maybeComputerMove() {
    if (!game.isComputerTurn() || thinking) return;
    thinking = true;
    refresh();
    const forGame = game;
    try {
      const move = await ai.request(game.chess.fen(), game.level, { minDelay: Math.max(250, app.duration * 2) });
      if (!move || forGame !== game) return;
      thinking = false;
      if (frame.paused) { heldAiMove = move; refresh(); return; }
      commit(move);
    } catch (err) {
      console.error(err);
      say('The computer couldn’t find a move. Try undo or a new game.', 'warn');
    } finally {
      if (forGame === game) thinking = false;
      if (forGame === game) refresh();
    }
  }

  function endGame() {
    finished = true;
    save();
    const e = game.ended;
    const outcome = game.mode === 'ai' ? game.outcomeFor() : null;
    let title;
    if (game.mode === 'ai') title = outcome === 'win' ? 'You win!' : outcome === 'loss' ? 'The computer wins' : 'A draw';
    else title = e.winner ? `${colorName(e.winner)} wins` : 'A draw';
    const message = {
      checkmate: `Checkmate after ${game.moveList.length} moves.`,
      stalemate: `${colorName(game.turn)} has no legal move and isn’t in check: stalemate.`,
      'insufficient-material': 'Neither side has enough material left to checkmate.',
      'threefold-repetition': 'The same position came up three times.',
      'fifty-move-rule': 'Fifty moves each without a capture or a pawn move.',
      resignation: `${colorName(e.resigned)} resigned.`,
      agreement: 'Both sides agreed to a draw.',
    }[e.reason];
    setTimeout(() => frame.gameOver({
      title, message, outcome, record: game.mode === 'ai',
      actions: [
        { label: 'Rematch', variant: 'primary', onClick: () => start({ ...setup, color: setup.color === 'random' ? 'random' : other(setup.color) }) },
        { label: 'New game…', onClick: () => newGame() },
        { label: 'Review board', variant: 'ghost', onClick: () => {} },
      ],
    }), app.duration + 150);
  }

  function choosePromotion(color) {
    return new Promise(resolve => {
      let pick = null;
      const opts = ['q', 'r', 'b', 'n'].map((t, i) => h('button', {
        type: 'button', class: 'promo-option', 'data-autofocus': i === 0 || null,
        'aria-label': ['Queen', 'Rook', 'Bishop', 'Knight'][i],
        onclick: () => { pick = t; dlg.close(); },
      }, h('img', { src: pieceImage(assets, color, t), alt: '' }), h('span', {}, ['Queen', 'Rook', 'Bishop', 'Knight'][i])));
      const dlg = app.dialog({ title: 'Promote your pawn', className: 'dialog-promo', body: h('div', { class: 'promo-grid' }, opts), onClose: () => resolve(pick) });
    });
  }

  // ---- controls ----
  function undo() {
    if (!game.canUndo() || thinking) return;
    ai.cancel(); thinking = false; heldAiMove = null;
    const wasOver = game.over;
    const n = game.undo();
    if (wasOver) { finished = false; timer.start(); }
    say(n === 2 ? 'Took back your move and the computer’s reply.' : 'Move taken back.');
    refresh();
    save();
  }

  function flip() { board.setOrientation(other(board.orientation)); refresh(); }

  async function offerDraw() {
    if (game.over || thinking) return;
    if (game.mode === 'local') {
      const ok = await app.confirm({ title: 'Draw offered', message: `${colorName(game.turn)} offers a draw. Does ${colorName(other(game.turn))} accept?`, confirmLabel: 'Accept draw', cancelLabel: 'Decline' });
      if (ok) { game.agreeDraw(); refresh(); endGame(); } else say('Draw declined.');
      return;
    }
    if (acceptsDraw(game.chess, other(game.human))) { game.agreeDraw(); refresh(); endGame(); }
    else say('The computer declines: it likes its position.', 'warn');
  }

  async function resign() {
    if (game.over) return;
    const who = game.mode === 'ai' ? game.human : game.turn;
    if (app.settings.get('confirmLeave')) {
      const ok = await app.confirm({ title: 'Resign this game?', message: game.mode === 'ai' ? 'It will count as a loss.' : `${colorName(who)} resigns and ${colorName(other(who))} wins.`, confirmLabel: 'Resign', danger: true });
      if (!ok) return;
    }
    ai.cancel(); thinking = false;
    game.resign(who);
    refresh();
    endGame();
  }

  // ---- starting games ----
  function start(opts, resume = null) {
    setup = sanitizeSetup(opts);
    ai.cancel(); thinking = false; heldAiMove = null; finished = false;
    const human = setup.color === 'random' ? (Math.random() < 0.5 ? WHITE : BLACK) : setup.color;
    game = new ChessGame({ mode: setup.mode, human, level: setup.level, fen: START_FEN });
    timer.reset();
    if (resume) {
      for (const m of resume.moves) if (!game.play(m)) break;
      timer.setElapsed(Number(resume.elapsedMs) || 0);
      if (game.moveList.length) timer.start();
    }
    board.setOrientation(setup.mode === 'ai' ? human : WHITE);
    applySettings();
    refresh();
    save();
    frame.refreshTimer();
    if (game.over) endGame(); else maybeComputerMove();
  }

  function newGame() {
    const choice = (name, value, options) => h('fieldset', { class: 'setup-group' }, h('legend', {}, name),
      h('div', { class: 'setup-options' }, options.map(([v, label, hint]) => h('label', { class: 'setup-option' },
        h('input', { type: 'radio', name, value: v, checked: v === value }), h('span', {}, label, hint ? h('small', {}, hint) : null)))));
    const form = h('form', { class: 'setup-form', onsubmit: e => e.preventDefault() },
      choice('mode', setup.mode, [['ai', 'Against the computer'], ['local', 'Two players, one device']]),
      choice('color', setup.color, [['w', 'White'], ['b', 'Black'], ['random', 'Random']]),
      choice('level', setup.level, LEVELS.map(l => [l.id, l.name, l.blurb])));
    const sync = () => { const ai = form.elements.mode.value === 'ai'; for (const n of ['color', 'level']) form.querySelector(`input[name=${n}]`).closest('fieldset').hidden = !ai; };
    form.addEventListener('change', sync); sync();
    let begin = false;
    const dlg = app.dialog({
      title: 'New game of chess', className: 'dialog-wide dialog-setup', body: form,
      actions: [
        button({ label: 'Cancel', variant: 'ghost', onClick: () => dlg.close() }),
        button({ label: 'Start game', variant: 'primary', onClick: () => { begin = true; dlg.close(); }, attrs: { 'data-autofocus': true } }),
      ],
      onClose: () => {
        if (begin) start({ mode: form.elements.mode.value, color: form.elements.color.value, level: form.elements.level.value });
        else if (!game) start(setup);
      },
    });
  }

  function enter() {
    const g = saved.game;
    if (g && Array.isArray(g.moves) && g.moves.length) {
      start({ ...setup, mode: g.mode, color: g.human, level: g.level }, g);
      say('Welcome back: your game was saved where you left it.');
    } else {
      start(setup);
      newGame();
    }
  }

  return {
    el,
    enter,
    newGame,
    inProgress: () => !!game && !game.over && game.moveList.length > 0,
    onPause: () => {},
    onResume: () => { if (heldAiMove) { const m = heldAiMove; heldAiMove = null; commit(m); } },
    onKey(e) {
      if (e.target.matches?.('input, select, textarea')) return false;
      if (e.key === 'u' || e.key === 'U') { undo(); return true; }
      if (e.key === 'f' || e.key === 'F') { flip(); return true; }
      return false;
    },
    destroy() { ai.destroy(); offSettings(); save(); },
    get game() { return game; },
    get board() { return board; },
    commit, tryMove,
  };
}


// Chessboard renderer (SVG). Draws squares, coordinates, highlights and pieces, animates moves and
// turns mouse, drag and keyboard input into move requests. It knows nothing about the rules: the
// table asks it to show a position and tells it which moves are legal.

import { squareName, colorOf, pieceLetter } from './engine.js';
import { pieceImage } from './pieces.js';

const NS = 'http://www.w3.org/2000/svg';
const S = 100; // square size in SVG units
const NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export const THEMES = {
  walnut: { name: 'Walnut & maple', light: '#e9d7b3', dark: '#9a6a45', texture: true },
  tournament: { name: 'Tournament green', light: '#eeeed2', dark: '#6f8f55' },
  slate: { name: 'Slate blue', light: '#dfe3e8', dark: '#5b7391' },
  contrast: { name: 'High contrast (colour-blind friendly)', light: '#f4f1e8', dark: '#3e4f86' },
};

const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  return el;
};

export const describePiece = p => `${colorOf(p) === 'w' ? 'white' : 'black'} ${NAMES[pieceLetter(p).toLowerCase()]}`;

export class BoardView {
  constructor({ assets, onMove, legalTargets, canMove, announce }) {
    this.assets = assets;
    this.onMove = onMove;           // (from, to) -> void; the table validates and plays it
    this.legalTargets = legalTargets; // (sq) -> [{ to, capture }]
    this.canMove = canMove;         // (sq) -> bool: may the user pick up the piece on sq?
    this.announce = announce || (() => {});
    this.orientation = 'w';
    this.board = new Int8Array(64);
    this.selected = -1;
    this.cursor = 12; // e2
    this.options = { hints: true, coordinates: true, theme: 'walnut', duration: 200 };
    this.marks = { lastFrom: -1, lastTo: -1, check: -1 };

    this.el = svg('svg', { viewBox: `0 0 ${8 * S} ${8 * S}`, class: 'chessboard', tabindex: '0', role: 'application',
      'aria-roledescription': 'chessboard', 'aria-label': 'Chessboard. Use arrow keys to move, Enter to pick up and place a piece.' });
    this.defs = svg('defs');
    this.layers = {};
    this.el.append(this.defs);
    for (const name of ['squares', 'marks', 'coords', 'hints', 'pieces', 'cursor', 'drag']) {
      this.layers[name] = svg('g', { class: `layer-${name}` });
      this.el.append(this.layers[name]);
    }
    this.bindInput();
    this.drawSquares();
  }

  // ---- geometry ----
  xy(sq) {
    const f = sq & 7, r = sq >> 3;
    return this.orientation === 'w' ? [f * S, (7 - r) * S] : [(7 - f) * S, r * S];
  }

  squareAt(clientX, clientY) {
    const rect = this.el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 8, y = ((clientY - rect.top) / rect.height) * 8;
    if (x < 0 || y < 0 || x >= 8 || y >= 8) return -1;
    const f = Math.floor(x), r = Math.floor(y);
    return this.orientation === 'w' ? (7 - r) * 8 + f : r * 8 + (7 - f);
  }

  // ---- drawing ----
  setOptions(opts) {
    const themeChanged = opts.theme && opts.theme !== this.options.theme;
    Object.assign(this.options, opts);
    if (themeChanged) this.drawSquares();
    this.drawCoords();
    this.drawHints();
  }

  setOrientation(color) {
    this.orientation = color;
    this.drawSquares();
    this.drawCoords();
    this.render();
  }

  drawSquares() {
    const theme = THEMES[this.options.theme] || THEMES.walnut;
    const g = this.layers.squares;
    g.replaceChildren();
    this.defs.replaceChildren();
    let light = theme.light, dark = theme.dark;
    if (theme.texture && this.assets?.setReady('board.textures')) {
      // ForgeGUI wood textures when downloaded, tinted by the flat colour underneath.
      for (const [id, asset] of [['tex-light', 'tex.maple'], ['tex-dark', 'tex.walnut']]) {
        const url = this.assets?.url(asset);
        if (!url) continue;
        const pat = svg('pattern', { id, patternUnits: 'userSpaceOnUse', width: 2 * S, height: 2 * S });
        pat.append(svg('image', { href: url, width: 2 * S, height: 2 * S, preserveAspectRatio: 'xMidYMid slice' }));
        this.defs.append(pat);
        if (id === 'tex-light') light = 'url(#tex-light)'; else dark = 'url(#tex-dark)';
      }
    }
    for (let sq = 0; sq < 64; sq++) {
      const [x, y] = this.xy(sq);
      const isLight = ((sq & 7) + (sq >> 3)) % 2 === 1;
      g.append(svg('rect', { x, y, width: S, height: S, fill: isLight ? light : dark, class: isLight ? 'sq-light' : 'sq-dark' }));
    }
    this.colors = theme;
  }

  // Square shown at screen column col, row row (0,0 = top left).
  displaySquare(col, row) { return this.orientation === 'w' ? (7 - row) * 8 + col : row * 8 + (7 - col); }

  drawCoords() {
    const g = this.layers.coords;
    g.replaceChildren();
    if (!this.options.coordinates) return;
    const tone = sq => (((sq & 7) + (sq >> 3)) % 2 === 1 ? 'on-light' : 'on-dark');
    for (let i = 0; i < 8; i++) {
      const fsq = this.displaySquare(i, 7), rsq = this.displaySquare(0, i);
      const file = svg('text', { x: i * S + S - 6, y: 8 * S - 7, 'text-anchor': 'end', class: `coord ${tone(fsq)}` });
      file.textContent = 'abcdefgh'[fsq & 7];
      const rank = svg('text', { x: 6, y: i * S + 22, class: `coord ${tone(rsq)}` });
      rank.textContent = String((rsq >> 3) + 1);
      g.append(file, rank);
    }
  }

  drawMarks() {
    const g = this.layers.marks;
    g.replaceChildren();
    const rect = (sq, cls) => { const [x, y] = this.xy(sq); g.append(svg('rect', { x, y, width: S, height: S, class: cls })); };
    if (this.marks.lastFrom >= 0) { rect(this.marks.lastFrom, 'mark-last'); rect(this.marks.lastTo, 'mark-last'); }
    if (this.selected >= 0) rect(this.selected, 'mark-selected');
    if (this.marks.check >= 0) {
      const [x, y] = this.xy(this.marks.check);
      g.append(svg('circle', { cx: x + S / 2, cy: y + S / 2, r: S * 0.48, class: 'mark-check' }));
    }
  }

  drawHints() {
    const g = this.layers.hints;
    g.replaceChildren();
    if (this.selected < 0 || !this.options.hints) return;
    for (const { to, capture } of this.legalTargets(this.selected)) {
      const [x, y] = this.xy(to);
      g.append(capture
        ? svg('circle', { cx: x + S / 2, cy: y + S / 2, r: S * 0.44, class: 'hint-capture' })
        : svg('circle', { cx: x + S / 2, cy: y + S / 2, r: S * 0.15, class: 'hint-move' }));
    }
  }

  drawCursor() {
    const g = this.layers.cursor;
    g.replaceChildren();
    if (!this.keyboardActive) return;
    const [x, y] = this.xy(this.cursor);
    g.append(svg('rect', { x: x + 3, y: y + 3, width: S - 6, height: S - 6, class: 'kb-cursor' }));
  }

  pieceEl(p, sq) {
    const [x, y] = this.xy(sq);
    const img = svg('image', { href: pieceImage(this.assets, colorOf(p), pieceLetter(p).toLowerCase()), x: x + 4, y: y + 4, width: S - 8, height: S - 8, class: 'piece' });
    img.dataset.square = sq;
    img.addEventListener('error', () => {
      // A generated image that fails to load falls back to the procedural piece.
      const id = `chess.${colorOf(p)}.${pieceLetter(p).toLowerCase()}`;
      if (this.assets?.has(id)) { this.assets.markBroken(id); this.render(); } // whole set now falls back
    }, { once: true });
    return img;
  }

  render() {
    const g = this.layers.pieces;
    g.replaceChildren();
    this.pieceEls = new Map();
    for (let sq = 0; sq < 64; sq++) {
      const p = this.board[sq];
      if (!p) continue;
      const el = this.pieceEl(p, sq);
      this.pieceEls.set(sq, el);
      g.append(el);
    }
    this.drawMarks();
    this.drawHints();
    this.drawCursor();
  }

  // Show a position. move (optional) animates from -> to, plus the rook when castling and a fading
  // copy of any captured piece.
  setPosition(board, { move = null, check = -1, lastMove = null } = {}) {
    const before = this.board;
    this.board = Int8Array.from(board);
    this.marks = { lastFrom: lastMove ? lastMove.from : -1, lastTo: lastMove ? lastMove.to : -1, check };
    this.selected = -1;
    this.render();
    if (move && this.options.duration > 0) this.animate(move, before);
  }

  animate(move, before) {
    const d = this.options.duration;
    const slide = (from, to) => {
      const el = this.pieceEls.get(to);
      if (!el?.animate) return;
      const [fx, fy] = this.xy(from), [tx, ty] = this.xy(to);
      el.animate([{ transform: `translate(${fx - tx}px, ${fy - ty}px)` }, { transform: 'translate(0,0)' }], { duration: d, easing: 'cubic-bezier(.2,.7,.2,1)' });
    };
    slide(move.from, move.to);
    if (move.flags?.includes('k')) slide(move.to + 1, move.to - 1);
    if (move.flags?.includes('q')) slide(move.to - 2, move.to + 1);
    const capSq = move.flags?.includes('e') ? move.to + (colorOf(move.piece) === 'w' ? -8 : 8) : move.to;
    const captured = before[capSq];
    if (move.captured && captured && colorOf(captured) !== colorOf(move.piece)) {
      const ghost = this.pieceEl(captured, capSq);
      ghost.classList.add('captured');
      this.layers.pieces.prepend(ghost);
      const [cx, cy] = this.xy(capSq);
      const anim = ghost.animate?.([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.6)' }],
        { duration: d * 1.4, easing: 'ease-in', delay: d * 0.4, fill: 'forwards' });
      ghost.style.transformOrigin = `${cx + S / 2}px ${cy + S / 2}px`;
      if (anim) anim.onfinish = () => ghost.remove(); else ghost.remove();
    }
  }

  shake(sq) {
    const el = this.pieceEls?.get(sq);
    el?.animate?.([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 240 });
  }

  // ---- selection ----
  select(sq) {
    this.selected = sq;
    this.drawMarks();
    this.drawHints();
    if (sq >= 0) {
      const n = this.legalTargets(sq).length;
      this.announce(`${describePiece(this.board[sq])} on ${squareName(sq)} selected, ${n} legal move${n === 1 ? '' : 's'}.`);
    }
  }

  // A click (or Enter) on a square: pick up, switch piece, put down or deselect.
  activate(sq) {
    if (sq < 0) return;
    const p = this.board[sq];
    if (this.selected >= 0) {
      if (sq === this.selected) { this.select(-1); return; }
      if (p && this.canMove(sq) && colorOf(p) === colorOf(this.board[this.selected])) { this.select(sq); return; }
      const from = this.selected;
      // Keep the piece in hand after an illegal target so the player can try again.
      if (this.legalTargets(from).some(t => t.to === sq)) this.select(-1);
      this.onMove(from, sq);
      return;
    }
    if (p && this.canMove(sq)) this.select(sq);
    else if (p) this.onMove(sq, -1); // lets the table explain why that piece can't move
  }

  // ---- input ----
  bindInput() {
    let press = null;
    this.el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const sq = this.squareAt(e.clientX, e.clientY);
      if (sq < 0) return;
      this.keyboardActive = false; this.drawCursor();
      press = { sq, x: e.clientX, y: e.clientY, dragging: false, wasSelected: this.selected === sq, id: e.pointerId };
      if (this.board[sq] && this.canMove(sq) && this.selected !== sq) this.select(sq);
      if (this.board[sq] && this.canMove(sq)) this.el.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    this.el.addEventListener('pointermove', e => {
      if (!press || !this.board[press.sq] || !this.canMove(press.sq)) return;
      if (!press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) return;
      const el = this.pieceEls.get(press.sq);
      if (!el) return;
      if (!press.dragging) { press.dragging = true; el.classList.add('dragging'); this.layers.drag.append(el); }
      const rect = this.el.getBoundingClientRect(), k = (8 * S) / rect.width;
      const [x, y] = this.xy(press.sq);
      el.setAttribute('transform', `translate(${(e.clientX - rect.left) * k - x - S / 2} ${(e.clientY - rect.top) * k - y - S / 2})`);
    });
    const finish = e => {
      if (!press) return;
      const p = press; press = null;
      const target = this.squareAt(e.clientX, e.clientY);
      if (p.dragging) {
        if (target >= 0 && target !== p.sq) { this.select(-1); this.render(); this.onMove(p.sq, target); }
        else { this.render(); this.select(p.sq); }
        return;
      }
      if (this.selected >= 0 && this.selected !== p.sq) { this.activate(p.sq); return; }
      if (p.wasSelected) this.select(-1);
      else if (!(this.board[p.sq] && this.canMove(p.sq))) this.activate(p.sq);
    };
    this.el.addEventListener('pointerup', finish);
    this.el.addEventListener('pointercancel', () => { press = null; this.render(); });
    this.el.addEventListener('focus', () => { if (!this.pointerFocus) { this.keyboardActive = true; this.drawCursor(); } });
    this.el.addEventListener('blur', () => { this.keyboardActive = false; this.drawCursor(); });
    this.el.addEventListener('mousedown', () => { this.pointerFocus = true; setTimeout(() => { this.pointerFocus = false; }, 0); });
    this.el.addEventListener('keydown', e => this.onKey(e));
  }

  onKey(e) {
    const flip = this.orientation === 'w' ? 1 : -1;
    const step = { ArrowUp: 8 * flip, ArrowDown: -8 * flip, ArrowRight: flip, ArrowLeft: -flip }[e.key];
    if (step) {
      e.preventDefault();
      this.keyboardActive = true;
      const next = this.cursor + step;
      if (next < 0 || next > 63 || (Math.abs(step) === 1 && (next >> 3) !== (this.cursor >> 3))) return;
      this.cursor = next;
      this.drawCursor();
      const p = this.board[next];
      this.announce(`${squareName(next)}${p ? `, ${describePiece(p)}` : ''}`);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.keyboardActive = true;
      this.activate(this.cursor);
      return;
    }
    if (e.key === 'Escape' && this.selected >= 0) {
      e.preventDefault(); e.stopPropagation();
      this.select(-1);
      this.announce('Selection cleared.');
    }
  }
}


// Reading things: a book, a letter, a card. Pages turn with left/right (or a click on either
// half); Enter on the last page or Esc closes. Works as a runner blocker inside a scene (a
// script step ['read', itemId]) and, through ReaderScene, from the pockets page of the journal.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { wrap } from '../engine/font.js';
import { ITEMS } from '../game/items.js';
import { panel, dim } from '../ui/panel.js';

const LINES = 12;

// an item's pages, already split to fit; locked pages read as pages he hasn't gotten to
export function pagesOf(id, state) {
  const it = ITEMS[id];
  if (!it || !it.pages) return [];
  const raw = typeof it.pages === 'function' ? it.pages(state) : it.pages;
  const out = [];
  for (const p of raw) {
    const open = !p.when || state.has(p.when);
    const body = open ? p.text : '(Pages he hasn\'t been able to read yet. Some of them are stuck together.)';
    const lines = wrap(body, 44);
    for (let i = 0; i < lines.length; i += LINES) out.push({ head: open ? p.head || '' : '', lines: lines.slice(i, i + LINES) });
  }
  return out;
}

export class DocReader {
  constructor(app, id, state) {
    this.app = app;
    this.title = ITEMS[id]?.name || id;
    this.pages = pagesOf(id, state);
    if (!this.pages.length) this.pages = [{ head: '', lines: ['(Nothing written here.)'] }];
    this.page = 0;
    this.t = 0;
  }

  update(dt, input) {
    this.t += dt;
    if (this.t < 0.15) return false;
    const a = this.app.audio, m = input.mouse;
    const next = () => { if (this.page < this.pages.length - 1) { this.page++; a.sfx('move'); return false; } a.sfx('back'); return true; };
    if (input.pressed('cancel')) { a.sfx('back'); return true; }
    if (input.pressed('menuRight') || input.pressed('confirm')) return next();
    if (input.pressed('menuLeft') && this.page > 0) { this.page--; a.sfx('move'); }
    if (m.clicked) {
      if (m.x < W / 2 && this.page > 0) { this.page--; a.sfx('move'); } else return next();
    }
    return false;
  }

  draw(g) {
    dim(g, 0.8);
    panel(g, 22, 8, W - 44, H - 16, { fill: '#d8d0bc', border: C.woodD, alpha: 1 });
    const p = this.pages[this.page];
    g.text(this.title.toUpperCase(), W / 2, 14, C.woodD, { align: 'center' });
    if (p.head) g.text(p.head, W / 2, 26, C.redD, { align: 'center' });
    p.lines.forEach((l, i) => g.text(l, 32, 40 + i * 10, '#2a2420'));
    g.text(`${this.page + 1} / ${this.pages.length}`, W / 2, H - 20, C.creamD, { align: 'center' });
    g.text('< >  turn    Esc  close', W - 30, H - 20, C.creamD, { align: 'right' });
  }
}

export class ReaderScene {
  constructor(app, id, state) { this.app = app; this.opaque = false; this.doc = new DocReader(app, id, state); }
  update(dt, input) { if (this.doc.update(dt, input)) { input.consume(); this.app.pop(); } }
  draw(g) { this.doc.draw(g); }
}

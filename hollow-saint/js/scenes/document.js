// Reading a document: a sheet of paper over the dimmed game. Handwriting wobbles, typing
// doesn't, and crossed-out lines stay legible under the stroke.

import { C } from '../engine/palette.js';
import { W, H, hash } from '../game/config.js';
import { DOCS } from '../game/docs.js';
import { centerText } from '../ui/panel.js';
import { normalize, GLYPHS, GLYPH_W, GLYPH_H } from '../engine/font.js';

const STYLE = {
  hand: { paper: C.PALE, edge: C.STONE, ink: C.INK, strike: C.BLOOD, wobble: true },
  typed: { paper: C.BONE, edge: C.PALE, ink: C.NEAR, strike: C.NEAR, wobble: false },
  print: { paper: C.BONE, edge: C.PALE, ink: C.INK, strike: C.INK, wobble: false, center: true },
};

const PX = 26, PY = 10, PW = W - 52, PH = H - 20;

// handwriting: each letter sits a pixel high or low
function handText(fb, str, x, y, c, seed) {
  let cx = x;
  [...normalize(str)].forEach((ch, i) => {
    const g = GLYPHS[ch];
    const dy = hash(i, seed, 3) < 0.25 ? -1 : hash(i, seed, 5) < 0.2 ? 1 : 0;
    if (g) for (let j = 0; j < GLYPH_H; j++) for (let k = 0; k < GLYPH_W; k++) if (g[j * GLYPH_W + k]) fb.pset(cx + k, y + j + dy, c);
    cx += 6;
  });
}

export class DocumentScene {
  constructor(app, id, onClose = null) {
    this.app = app;
    this.doc = DOCS[id];
    this.id = id;
    this.page = 0;
    this.opaque = false;
    this.onClose = onClose;
    this.t = 0;
  }

  enter() { this.app.sfx('page'); }

  close() { this.app.pop(); this.onClose?.(); }

  update(input) {
    this.t++;
    const n = this.doc.pages.length;
    if (input.pressed('cancel') || input.pressed('inventory')) { this.close(); return; }
    if (input.pressed('menuLeft') && this.page > 0) { this.page--; this.app.sfx('page'); return; }
    if (input.pressed('menuRight') && this.page < n - 1) { this.page++; this.app.sfx('page'); return; }
    if (input.pressed('confirm') || input.pressed('interact') || input.mouse.clicked) {
      if (this.page < n - 1) { this.page++; this.app.sfx('page'); } else this.close();
    }
  }

  render(fb) {
    fb.shade(0, 0, W, H, 3);
    const st = STYLE[this.doc.kind] || STYLE.hand;
    fb.rect(PX, PY, PW, PH, st.paper);
    fb.frame(PX, PY, PW, PH, st.edge);
    // a torn corner on handwritten pages
    if (this.doc.kind === 'hand') for (let i = 0; i < 6; i++) fb.hline(PX + PW - 6 + i, PX + PW - 1, PY + i, C.BLACK);
    const lines = this.doc.pages[this.page];
    lines.forEach((raw, i) => {
      const line = typeof raw === 'string' ? { s: raw } : raw;
      const y = PY + 10 + i * 11;
      const width = [...normalize(line.s)].length * 6;
      const x = st.center ? Math.round(W / 2 - width / 2) : PX + 8;
      const c = line.red ? C.BLOOD : st.ink;
      if (st.wobble) handText(fb, line.s, x, y, c, i + this.page * 31);
      else fb.text(line.s, x, y, c);
      if (line.strike) {
        for (let k = 0; k < width - 1; k++) fb.pset(x + k, y + 3 + (hash(k >> 2, i, 9) < 0.5 ? 0 : 1), st.strike);
      }
    });
    const n = this.doc.pages.length;
    const foot = n > 1 ? `${this.page > 0 ? '◄ ' : '  '}${this.page + 1}/${n}${this.page < n - 1 ? ' ►' : '  '}` : '';
    if (foot) centerText(fb, foot, PY + PH - 12, st.edge);
  }
}

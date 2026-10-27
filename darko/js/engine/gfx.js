// Drawing on the 320x180 canvas: rectangles, dithered fills and bitmap text. Everything is
// drawn at whole-pixel coordinates; the page scales the canvas up with nearest-neighbour.

import { GLYPHS, GLYPH_W, GLYPH_H, ADVANCE, normalize } from './font.js';

export const W = 320, H = 180;

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const CHARS = Object.keys(GLYPHS);
const INDEX = new Map(CHARS.map((c, i) => [c, i]));

// 4x4 ordered-dither thresholds, shared with the lighting pass
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

export class Gfx {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    this.atlases = new Map();
    this.patterns = new Map();
  }

  atlas(col) {
    let a = this.atlases.get(col);
    if (!a) {
      a = makeCanvas(CHARS.length * GLYPH_W, GLYPH_H);
      const x = a.getContext('2d');
      x.fillStyle = col;
      CHARS.forEach((ch, i) => {
        const b = GLYPHS[ch];
        for (let p = 0; p < b.length; p++) if (b[p]) x.fillRect(i * GLYPH_W + p % GLYPH_W, (p / GLYPH_W) | 0, 1, 1);
      });
      this.atlases.set(col, a);
    }
    return a;
  }

  clear(col = '#000') { this.rect(0, 0, W, H, col); }

  rect(x, y, w, h, col) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  px(x, y, col) { this.rect(x, y, 1, 1, col); }

  // one-pixel outline
  box(x, y, w, h, col) {
    this.rect(x, y, w, 1, col); this.rect(x, y + h - 1, w, 1, col);
    this.rect(x, y, 1, h, col); this.rect(x + w - 1, y, 1, h, col);
  }

  alpha(a, fn) {
    const prev = this.ctx.globalAlpha;
    this.ctx.globalAlpha = prev * a;
    try { fn(); } finally { this.ctx.globalAlpha = prev; }
  }

  // ordered-dither fill: level 0..1 is the share of pixels painted
  dither(x, y, w, h, col, level) {
    const lv = Math.max(0, Math.min(16, Math.round(level * 16)));
    if (!lv) return;
    if (lv === 16) { this.rect(x, y, w, h, col); return; }
    const key = col + lv;
    let pat = this.patterns.get(key);
    if (!pat) {
      const c = makeCanvas(4, 4), cx = c.getContext('2d');
      cx.fillStyle = col;
      for (let i = 0; i < 16; i++) if (BAYER[i] < lv / 16) cx.fillRect(i % 4, i >> 2, 1, 1);
      pat = this.ctx.createPattern(c, 'repeat');
      this.patterns.set(key, pat);
    }
    this.ctx.fillStyle = pat;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  textWidth(str, scale = 1, spacing = 0) {
    const n = [...normalize(str)].length;
    return n ? (n * (ADVANCE + spacing) - 1 - spacing) * scale : 0;
  }

  text(str, x, y, col, { scale = 1, align = 'left', shadow = null, spacing = 0 } = {}) {
    const s = [...normalize(str)];
    const w = this.textWidth(str, scale, spacing);
    let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    y = Math.round(y);
    if (shadow) this.text(str, x + scale, y + scale, shadow, { scale, align, spacing });
    const a = this.atlas(col);
    for (const ch of s) {
      const i = INDEX.get(ch);
      if (i !== undefined && ch !== ' ') this.ctx.drawImage(a, i * GLYPH_W, 0, GLYPH_W, GLYPH_H, cx, y, GLYPH_W * scale, GLYPH_H * scale);
      cx += (ADVANCE + spacing) * scale;
    }
    return w;
  }

  image(img, x, y) { this.ctx.drawImage(img, Math.round(x), Math.round(y)); }

  translate(x, y, fn) {
    this.ctx.save();
    this.ctx.translate(Math.round(x), Math.round(y));
    try { fn(); } finally { this.ctx.restore(); }
  }
}

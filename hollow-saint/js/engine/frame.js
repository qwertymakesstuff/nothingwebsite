// An indexed-colour framebuffer. Everything is drawn into a Uint8Array of palette indices and
// converted to RGBA once per frame, so nothing can ever appear off-palette or anti-aliased.

import { TRANSPARENT, SHADE } from './palette.js';
import { GLYPHS, GLYPH_W, GLYPH_H, ADVANCE, normalize } from './font.js';

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class Frame {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.px = new Uint8Array(w * h);
  }

  clear(c = 0) { this.px.fill(c); }

  pset(x, y, c) {
    x |= 0; y |= 0;
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }

  get(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : 0;
  }

  rect(x, y, w, h, c) {
    x |= 0; y |= 0;
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let j = y0; j < y1; j++) this.px.fill(c, j * this.w + x0, j * this.w + x1);
  }

  frame(x, y, w, h, c) {
    this.rect(x, y, w, 1, c); this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c); this.rect(x + w - 1, y, 1, h, c);
  }

  hline(x0, x1, y, c) { if (x1 < x0) [x0, x1] = [x1, x0]; this.rect(x0, y, x1 - x0 + 1, 1, c); }
  vline(x, y0, y1, c) { if (y1 < y0) [y0, y1] = [y1, y0]; this.rect(x, y0, 1, y1 - y0 + 1, c); }

  line(x0, y0, x1, y1, c) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.pset(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // fill a rectangle with a dithered pattern: density 0..16 of pixels set to c
  dither(x, y, w, h, c, density) {
    const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
    const x1 = Math.min(this.w, (x + w) | 0), y1 = Math.min(this.h, (y + h) | 0);
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++)
      if (BAYER4[(i & 3) + ((j & 3) << 2)] < density) this.px[j * this.w + i] = c;
  }

  // darken every pixel in a rectangle by `steps` shade levels
  shade(x = 0, y = 0, w = this.w, h = this.h, steps = 1) {
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      let c = this.px[j * this.w + i];
      for (let s = 0; s < steps; s++) c = SHADE[c];
      this.px[j * this.w + i] = c;
    }
  }

  // sprite: { w, h, px: Uint8Array } with TRANSPARENT holes. opts: flip, color (solid recolour)
  blit(spr, x, y, opts = {}) {
    if (!spr) return;
    x |= 0; y |= 0;
    const { flip = false, color = -1 } = opts;
    for (let j = 0; j < spr.h; j++) {
      const ty = y + j;
      if (ty < 0 || ty >= this.h) continue;
      for (let i = 0; i < spr.w; i++) {
        const tx = x + i;
        if (tx < 0 || tx >= this.w) continue;
        const c = spr.px[j * spr.w + (flip ? spr.w - 1 - i : i)];
        if (c !== TRANSPARENT) this.px[ty * this.w + tx] = color >= 0 ? color : c;
      }
    }
  }

  // copy a window of another frame (used to show part of a baked room)
  copyFrom(src, sx, sy, dx = 0, dy = 0, w = this.w, h = this.h) {
    for (let j = 0; j < h; j++) {
      const ty = dy + j, fy = sy + j;
      if (ty < 0 || ty >= this.h) continue;
      for (let i = 0; i < w; i++) {
        const tx = dx + i, fx = sx + i;
        if (tx < 0 || tx >= this.w) continue;
        this.px[ty * this.w + tx] = fx >= 0 && fy >= 0 && fx < src.w && fy < src.h ? src.px[fy * src.w + fx] : 0;
      }
    }
  }

  text(str, x, y, c, opts = {}) {
    const { scale = 1, shadow = -1 } = opts;
    if (shadow >= 0) this.text(str, x + scale, y + scale, shadow, { scale });
    let cx = x | 0;
    for (const ch of normalize(str)) {
      const g = GLYPHS[ch];
      if (g) for (let j = 0; j < GLYPH_H; j++) for (let i = 0; i < GLYPH_W; i++)
        if (g[j * GLYPH_W + i]) {
          if (scale === 1) this.pset(cx + i, y + j, c);
          else this.rect(cx + i * scale, y + j * scale, scale, scale, c);
        }
      cx += ADVANCE * scale;
    }
  }

  toRGBA(out32, pal32) {
    const px = this.px;
    for (let i = 0; i < px.length; i++) out32[i] = pal32[px[i]];
  }
}

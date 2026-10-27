// Sprites are authored as rows of characters. '.' and ' ' are transparent; the hex digits
// 0-9 and a-f pick palette colours 0-15.

import { TRANSPARENT } from './palette.js';

export function sprite(rows) {
  if (typeof rows === 'string') rows = rows.trim().split('\n').map(r => r.trim());
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const px = new Uint8Array(w * h).fill(TRANSPARENT);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const v = parseInt(ch, 16);
      if (Number.isNaN(v)) throw new Error(`bad sprite pixel "${ch}"`);
      px[y * w + x] = v;
    }
  });
  return { w, h, px };
}

// blank sprite you can draw into with a Frame-like painter
export function canvasSprite(w, h, paint) {
  const px = new Uint8Array(w * h).fill(TRANSPARENT);
  const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) px[(y | 0) * w + (x | 0)] = c; };
  const rect = (x, y, rw, rh, c) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) set(x + i, y + j, c); };
  const line = (x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) set(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c);
  };
  const disc = (cx, cy, rx, ry, c) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1) <= 1.05) set(cx + x, cy + y, c);
  };
  // ordered dither: every other pixel in a checker
  const dith = (x, y, rw, rh, c, odd = 0) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) if ((x + i + y + j + odd) % 2 === 0) set(x + i, y + j, c); };
  paint({ set, rect, line, disc, dith, w, h });
  return { w, h, px };
}

// replace whole rows of a sprite (used to build walk frames from a standing pose)
export function withRows(rows, from, replacement) {
  const out = rows.slice();
  replacement.forEach((r, i) => { out[from + i] = r; });
  return out;
}

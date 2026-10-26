import { C } from '../engine/palette.js';
import { textWidth } from '../engine/font.js';
import { W } from '../game/config.js';

export function panel(fb, x, y, w, h) {
  fb.rect(x, y, w, h, C.BLACK);
  fb.frame(x, y, w, h, C.ASH);
  fb.frame(x + 2, y + 2, w - 4, h - 4, C.INK);
  // nicked corners
  fb.pset(x, y, C.BLACK); fb.pset(x + w - 1, y, C.BLACK); fb.pset(x, y + h - 1, C.BLACK); fb.pset(x + w - 1, y + h - 1, C.BLACK);
}

export function centerText(fb, str, y, color, opts = {}) {
  const x = Math.round((W - textWidth(str, opts.scale || 1)) / 2);
  fb.text(str, x, y, color, opts);
  return x;
}

export function heading(fb, str, y) {
  const x = centerText(fb, str, y, C.PALE);
  const w = textWidth(str);
  fb.hline(x - 14, x - 5, y + 3, C.BLOOD);
  fb.hline(x + w + 4, x + w + 13, y + 3, C.BLOOD);
}

export function formatTime(ticks) {
  const s = Math.floor(ticks / 60), m = Math.floor(s / 60), h = Math.floor(m / 60);
  const pad = n => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

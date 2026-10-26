// The message box at the foot of the screen: typewriter text, paged, advanced with interact.

import { C } from '../engine/palette.js';
import { wrap, LINE_H, textWidth } from '../engine/font.js';
import { W, H } from '../game/config.js';

export const BOX = { x: 6, y: H - 54, w: W - 12, h: 50 };
const TOP_Y = 4;
const COLS = Math.floor((BOX.w - 12) / 6), ROWS = 4;
export const SPEEDS = { slow: 0.4, normal: 0.9, fast: 2, instant: 9999 };

export function paginate(lines) {
  const pages = [];
  for (const raw of lines) {
    const line = typeof raw === 'string' ? { text: raw } : raw;
    const system = /^\[.*\]$/.test(line.text);
    const wrapped = wrap(line.text, COLS);
    for (let i = 0; i < wrapped.length; i += ROWS) pages.push({ who: line.who || null, system, rows: wrapped.slice(i, i + ROWS) });
  }
  return pages;
}

export class TextBox {
  constructor(app) {
    this.app = app;
    this.pages = [];
    this.page = 0;
    this.shown = 0;
    this.onClose = null;
    this.tick = 0;
    this.top = false;     // set by the play scene when the player is under the usual spot
  }

  get active() { return this.pages.length > 0; }

  open(lines, onClose = null) {
    this.pages = paginate(lines);
    this.page = 0; this.shown = 0; this.onClose = onClose;
    if (!this.pages.length) this.close();
  }

  close() {
    const cb = this.onClose;
    this.pages = []; this.onClose = null;
    if (cb) cb();
  }

  get pageLength() { return this.pages[this.page].rows.join('').length; }
  get complete() { return this.shown >= this.pageLength; }

  update(input) {
    if (!this.active) return;
    this.tick++;
    const speed = SPEEDS[this.app.settings.textSpeed] ?? SPEEDS.normal;
    if (!this.complete) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.pageLength, this.shown + speed);
      if (Math.floor(this.shown) !== before && before % 3 === 0 && speed < 5) this.app.sfx('text');
    }
    if (input.pressed('confirm') || input.pressed('interact') || input.mouse.clicked) {
      if (!this.complete) this.shown = this.pageLength;
      else if (this.page < this.pages.length - 1) { this.page++; this.shown = 0; }
      else this.close();
    }
  }

  render(fb) {
    if (!this.active) return;
    const pg = this.pages[this.page];
    const B = { ...BOX, y: this.top ? TOP_Y + 4 : BOX.y };
    fb.rect(B.x, B.y, B.w, B.h, C.BLACK);
    fb.frame(B.x, B.y, B.w, B.h, C.ASH);
    fb.frame(B.x + 2, B.y + 2, B.w - 4, B.h - 4, C.INK);
    if (pg.who) {
      const tw = textWidth(pg.who) + 8;
      fb.rect(B.x + 6, B.y - 4, tw, 9, C.BLACK);
      fb.text(pg.who, B.x + 10, B.y - 3, C.CANDLE);
    }
    let left = Math.floor(this.shown);
    pg.rows.forEach((row, i) => {
      const part = row.slice(0, Math.max(0, left));
      left -= row.length;
      fb.text(part, B.x + 6, B.y + 6 + i * LINE_H, pg.system ? C.STONE : C.PALE);
    });
    if (this.complete && Math.floor(this.tick / 24) % 2 === 0) {
      fb.text(this.page < this.pages.length - 1 ? '▼' : '■', B.x + B.w - 11, B.y + B.h - 10, C.STONE);
    }
  }
}

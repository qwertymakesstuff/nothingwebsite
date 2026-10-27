// The message box: typewriter text, paged, advanced with interact. Lines can carry a speaker
// (shown with a portrait if there is one), can be cut off mid-sentence (`cut`), and the box can
// end on a list of choices instead of closing.

import { C } from '../engine/palette.js';
import { wrap, LINE_H, textWidth } from '../engine/font.js';
import { W, H } from '../game/config.js';
import { PORTRAITS } from '../game/art.js';

export const BOX = { x: 6, y: H - 54, w: W - 12, h: 50 };
const TOP_Y = 8;
const ROWS = 4;
const COLS = Math.floor((BOX.w - 12) / 6);
const COLS_PORTRAIT = Math.floor((BOX.w - 12 - 30) / 6);
export const SPEEDS = { slow: 0.4, normal: 0.9, fast: 2, instant: 9999 };

export function paginate(lines) {
  const pages = [];
  for (const raw of lines) {
    const line = typeof raw === 'string' ? { text: raw } : raw;
    const system = /^\[.*\]$/.test(line.text);
    const portrait = !!(line.who && PORTRAITS[line.who]);
    const wrapped = wrap(line.text, portrait ? COLS_PORTRAIT : COLS);
    for (let i = 0; i < wrapped.length; i += ROWS) {
      pages.push({ who: line.who || null, portrait, system, cut: !!line.cut && i + ROWS >= wrapped.length, rows: wrapped.slice(i, i + ROWS) });
    }
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
    this.choices = null;      // [{ text }] shown after the last page
    this.onChoice = null;
    this.choiceIndex = 0;
    this.tick = 0;
    this.cutT = 0;
    this.top = false;         // set by the play scene when the player is under the usual spot
  }

  get active() { return this.pages.length > 0; }
  get choosing() { return this.active && !!this.choices && this.page === this.pages.length - 1 && this.complete; }

  open(lines, onClose = null, { choices = null, onChoice = null } = {}) {
    this.pages = paginate(lines);
    this.page = 0; this.shown = 0; this.onClose = onClose; this.cutT = 0;
    this.choices = choices && choices.length ? choices : null;
    this.onChoice = onChoice; this.choiceIndex = 0;
    if (!this.pages.length) {
      if (this.choices) this.pages = [{ who: null, rows: [''], system: false }];
      else this.close();
    }
  }

  close() {
    const cb = this.onClose;
    this.pages = []; this.onClose = null; this.choices = null;
    if (cb) cb();
  }

  pick(i) {
    const cb = this.onChoice;
    this.pages = []; this.onClose = null; this.choices = null;
    this.app.sfx('ui_select');
    if (cb) cb(i);
  }

  get pageLength() { return this.pages[this.page].rows.join('').length; }
  get complete() { return this.shown >= this.pageLength; }

  advance() {
    if (this.page < this.pages.length - 1) { this.page++; this.shown = 0; this.cutT = 0; }
    else if (!this.choices) this.close();
  }

  // rectangles of the choice rows, for the mouse
  choiceRects() {
    const n = this.choices.length, bh = n * 11 + 8;
    const y0 = this.top ? TOP_Y + BOX.h + 4 : BOX.y - bh - 4;
    return this.choices.map((c, i) => ({ x: BOX.x + 40, y: y0 + 5 + i * 11 - 1, w: BOX.w - 48, h: 11, box: { y: y0, h: bh } }));
  }

  update(input) {
    if (!this.active) return;
    this.tick++;
    const speed = SPEEDS[this.app.settings.textSpeed] ?? SPEEDS.normal;
    const pg = this.pages[this.page];
    if (!this.complete) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.pageLength, this.shown + speed);
      if (Math.floor(this.shown) !== before && before % 3 === 0 && speed < 5) this.app.sfx('text');
      return this.skipInput(input);
    }
    // an interrupted line moves on by itself
    if (pg.cut && !this.choosing) { if (++this.cutT > 14) this.advance(); return; }
    if (this.choosing) {
      const m = input.mouse;
      const rects = this.choiceRects();
      if (m.moved) rects.forEach((r, i) => { if (m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h) this.choiceIndex = i; });
      if (input.pressed('menuUp')) { this.choiceIndex = (this.choiceIndex + this.choices.length - 1) % this.choices.length; this.app.sfx('ui_move'); }
      if (input.pressed('menuDown')) { this.choiceIndex = (this.choiceIndex + 1) % this.choices.length; this.app.sfx('ui_move'); }
      const clicked = m.clicked && rects.some(r => m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h);
      if (input.pressed('confirm') || input.pressed('interact') || clicked) this.pick(this.choiceIndex);
      return;
    }
    if (input.pressed('confirm') || input.pressed('interact') || input.mouse.clicked) this.advance();
  }

  skipInput(input) {
    if (input.pressed('confirm') || input.pressed('interact') || input.mouse.clicked) this.shown = this.pageLength;
  }

  render(fb) {
    if (!this.active) return;
    const pg = this.pages[this.page];
    const B = { ...BOX, y: this.top ? TOP_Y : BOX.y };
    fb.rect(B.x, B.y, B.w, B.h, C.BLACK);
    fb.frame(B.x, B.y, B.w, B.h, C.ASH);
    fb.frame(B.x + 2, B.y + 2, B.w - 4, B.h - 4, C.INK);
    let tx = B.x + 6;
    if (pg.portrait) {
      const frames = PORTRAITS[pg.who];
      fb.blit(frames[Math.floor(this.tick / 4) % frames.length], B.x + 6, B.y + 13);
      fb.frame(B.x + 5, B.y + 12, 26, 26, C.INK);
      tx = B.x + 36;
    }
    if (pg.who) {
      const tw = textWidth(pg.who) + 8;
      fb.rect(B.x + 6, B.y - 4, tw, 9, C.BLACK);
      fb.text(pg.who, B.x + 10, B.y - 3, pg.who === '?' ? C.RED : C.CANDLE);
    }
    let left = Math.floor(this.shown);
    pg.rows.forEach((row, i) => {
      const part = row.slice(0, Math.max(0, left));
      left -= row.length;
      fb.text(part, tx, B.y + 6 + i * LINE_H, pg.system ? C.STONE : C.PALE);
    });
    if (this.choosing) {
      const rects = this.choiceRects(), bx = rects[0].box;
      fb.rect(B.x + 32, bx.y, B.w - 32, bx.h, C.BLACK);
      fb.frame(B.x + 32, bx.y, B.w - 32, bx.h, C.ASH);
      this.choices.forEach((c, i) => {
        const sel = i === this.choiceIndex;
        fb.text(c.text, rects[i].x + 4, rects[i].y + 1, sel ? C.BONE : C.STONE);
        if (sel) fb.text('►', rects[i].x - 5, rects[i].y + 1, Math.floor(this.tick / 20) % 2 ? C.BLOOD : C.RED);
      });
    } else if (this.complete && !pg.cut && Math.floor(this.tick / 24) % 2 === 0) {
      fb.text(this.page < this.pages.length - 1 ? '▼' : '■', B.x + B.w - 11, B.y + B.h - 10, C.STONE);
    }
  }
}

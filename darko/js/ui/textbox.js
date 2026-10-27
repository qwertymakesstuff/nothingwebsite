// Dialogue: a typewriter text box with a speaker tag, and a choice list. Both are runner
// blockers, so update() returns true once the player has finished with them.

import { wrap, LINE_H } from '../engine/font.js';
import { C } from '../game/palette.js';
import { speakerName, speakerCol } from '../game/cast.js';
import { panel } from './panel.js';

export const BOX = { x: 8, y: 124, w: 304, h: 50 };
const CHARS = 49, LINES = 4;
const SPEED = { slow: 28, normal: 50, fast: 110, instant: Infinity };

export function paginate(text, chars = CHARS, lines = LINES) {
  const all = wrap(text, chars);
  const pages = [];
  for (let i = 0; i < all.length; i += lines) pages.push(all.slice(i, i + lines));
  return pages.length ? pages : [['']];
}

export class TextBox {
  constructor(app) { this.app = app; }

  open(who, text) {
    this.who = who;
    this.pages = paginate(text);
    this.page = 0;
    this.shown = 0;
    this.t = 0;
    return this;
  }

  get len() { return this.pages[this.page].join('').length; }

  update(dt, input) {
    this.t += dt;
    const speed = SPEED[this.app.settings.textSpeed] ?? SPEED.normal;
    if (this.shown < this.len) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(this.len, this.shown + speed * dt);
      if (Math.floor(this.shown / 3) > Math.floor(before / 3) && speed !== Infinity) this.app.audio.sfx(this.who ? 'blip' : 'blipLow');
      if (input.advance() && this.t > 0.08) { this.shown = this.len; input.consume(); }
      return false;
    }
    if (input.advance()) {
      this.page++;
      this.shown = 0;
      this.app.audio.sfx('move');
      return this.page >= this.pages.length;
    }
    return false;
  }

  draw(g) {
    const b = BOX;
    panel(g, b.x, b.y, b.w, b.h);
    if (this.who) {
      const name = speakerName(this.who);
      const w = g.textWidth(name) + 8;
      panel(g, b.x + 6, b.y - 10, w, 11, { border: C.grey });
      g.text(name, b.x + 10, b.y - 8, speakerCol(this.who));
    }
    let left = Math.floor(this.shown);
    const col = this.who ? C.bone : C.mist;
    this.pages[this.page].forEach((line, i) => {
      if (left <= 0) return;
      g.text(line.slice(0, left), b.x + 8, b.y + 6 + i * LINE_H, col);
      left -= line.length;
    });
    if (this.shown >= this.len && Math.floor(this.t * 2.5) % 2 === 0) g.text('▼', b.x + b.w - 12, b.y + b.h - 10, C.red);
  }
}

export class ChoiceBox {
  constructor(app, options, onPick) {
    this.app = app;
    this.options = options;
    this.onPick = onPick;
    this.sel = 0;
    this.t = 0;
  }

  rows() {
    const h = this.options.length * 11 + 8;
    return { x: BOX.x, y: BOX.y + BOX.h - h, w: BOX.w, h };
  }

  update(dt, input) {
    this.t += dt;
    const n = this.options.length;
    if (input.pressed('menuUp')) { this.sel = (this.sel - 1 + n) % n; this.app.audio.sfx('move'); }
    if (input.pressed('menuDown')) { this.sel = (this.sel + 1) % n; this.app.audio.sfx('move'); }
    const r = this.rows(), m = input.mouse;
    let clicked = false;
    if (m.inside && m.x >= r.x && m.x < r.x + r.w) {
      const i = Math.floor((m.y - r.y - 4) / 11);
      if (i >= 0 && i < n) {
        if (m.moved && i !== this.sel) { this.sel = i; this.app.audio.sfx('move'); }
        if (m.clicked) { this.sel = i; clicked = true; }
      }
    }
    if (this.t > 0.15 && (clicked || input.pressed('confirm'))) {
      this.app.audio.sfx('select');
      this.onPick(this.sel);
      return true;
    }
    return false;
  }

  draw(g) {
    const r = this.rows();
    panel(g, r.x, r.y, r.w, r.h, { border: C.fog });
    this.options.forEach((label, i) => {
      const on = i === this.sel;
      if (on) g.text('►', r.x + 6, r.y + 5 + i * 11, C.red);
      g.text(label, r.x + 16, r.y + 5 + i * 11, on ? C.white : C.fog);
    });
  }
}

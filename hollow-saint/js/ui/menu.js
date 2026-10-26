// A vertical list menu driven by keyboard or mouse.
// items: { label, value?(), enabled?(), onSelect?(), onLeft?(), onRight?() }

import { C } from '../engine/palette.js';
import { textWidth } from '../engine/font.js';

const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);

export class Menu {
  constructor(app, items, { x = 0, y = 0, w = 120, lineH = 12, center = false, valueX = null } = {}) {
    this.app = app;
    this.items = items;
    Object.assign(this, { x, y, w, lineH, center, valueX });
    this.index = Math.max(0, items.findIndex(i => this.enabled(i)));
  }

  enabled(item) { return item.enabled === undefined ? true : !!val(item.enabled); }

  rowRect(i) { return { x: this.x - 4, y: this.y + i * this.lineH - 2, w: this.w + 8, h: this.lineH }; }

  move(d) {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const j = (this.index + d * k + n * k) % n;
      if (this.enabled(this.items[j])) { if (j !== this.index) this.app.sfx('ui_move'); this.index = j; return; }
    }
  }

  update(input) {
    const m = input.mouse;
    if (m.moved || m.clicked) {
      this.items.forEach((it, i) => {
        const r = this.rowRect(i);
        if (m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h && this.enabled(it)) {
          if (i !== this.index && m.moved) { this.index = i; this.app.sfx('ui_move'); }
          if (m.clicked) {
            this.index = i;
            if (it.onRight) { it.onRight(); this.app.sfx('ui_move'); }
            else if (it.onSelect) { this.app.sfx('ui_select'); it.onSelect(); }
          }
        }
      });
      if (m.clicked) return;
    }
    if (input.pressed('menuUp')) this.move(-1);
    else if (input.pressed('menuDown')) this.move(1);
    const it = this.items[this.index];
    if (!it || !this.enabled(it)) return;
    if (input.pressed('menuLeft') && it.onLeft) { it.onLeft(); this.app.sfx('ui_move'); }
    else if (input.pressed('menuRight') && it.onRight) { it.onRight(); this.app.sfx('ui_move'); }
    else if (input.pressed('confirm')) {
      if (it.onSelect) { this.app.sfx('ui_select'); it.onSelect(); }
      else if (it.onRight) { it.onRight(); this.app.sfx('ui_move'); }
    }
  }

  render(fb, tick = 0) {
    this.items.forEach((it, i) => {
      const sel = i === this.index, on = this.enabled(it);
      const label = val(it.label);
      const y = this.y + i * this.lineH;
      const color = !on ? C.SLATE : sel ? C.BONE : C.STONE;
      const x = this.center ? Math.round(this.x + (this.w - textWidth(label)) / 2) : this.x;
      fb.text(label, x, y, color);
      if (sel && on) {
        const blink = Math.floor(tick / 20) % 2 === 0;
        fb.text('►', x - 9, y, blink ? C.RED : C.BLOOD);
      }
      if (it.value) {
        const v = val(it.value);
        const vx = this.valueX !== null ? this.x + this.valueX : this.x + this.w - textWidth(v);
        fb.text(v, vx, y, sel ? C.PALE : C.ASH);
      }
    });
  }
}

export const bar = (v, n = 10) => '■'.repeat(Math.round(v * n)) + '□'.repeat(n - Math.round(v * n));

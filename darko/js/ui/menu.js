// A vertical menu driven by keys or mouse. Items: { label: string | () => string, action?,
// disabled?: bool | () => bool, left?, right? }. left/right adjust values (settings sliders).

import { C } from '../game/palette.js';

const val = v => (typeof v === 'function' ? v() : v);

export class Menu {
  constructor(app, items, { x = 160, y = 100, lineH = 13, align = 'center', width = 140, onCancel = null } = {}) {
    this.app = app;
    this.items = items;
    Object.assign(this, { x, y, lineH, align, width, onCancel });
    this.sel = 0;
    this.skipDisabled(1);
  }

  isDisabled(i) { return !!val(this.items[i].disabled); }

  skipDisabled(dir) {
    for (let k = 0; k < this.items.length && this.isDisabled(this.sel); k++) this.sel = (this.sel + dir + this.items.length) % this.items.length;
  }

  rowRect(i) {
    const left = this.align === 'center' ? this.x - this.width / 2 : this.x;
    return { x: left, y: this.y + i * this.lineH - 2, w: this.width, h: this.lineH };
  }

  update(input) {
    const a = this.app.audio;
    const n = this.items.length;
    if (input.pressed('menuUp')) { this.sel = (this.sel - 1 + n) % n; this.skipDisabled(-1); a.sfx('move'); }
    if (input.pressed('menuDown')) { this.sel = (this.sel + 1) % n; this.skipDisabled(1); a.sfx('move'); }
    const m = input.mouse;
    let clickedRow = -1;
    if (m.inside) {
      for (let i = 0; i < n; i++) {
        const r = this.rowRect(i);
        if (m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h) {
          if (m.moved && this.sel !== i && !this.isDisabled(i)) { this.sel = i; a.sfx('move'); }
          if (m.clicked) clickedRow = i;
        }
      }
    }
    const it = this.items[this.sel];
    if (it && !this.isDisabled(this.sel)) {
      if (input.pressed('menuLeft') && it.left) { it.left(); a.sfx('move'); }
      if (input.pressed('menuRight') && it.right) { it.right(); a.sfx('move'); }
    }
    if (clickedRow >= 0 && !this.isDisabled(clickedRow)) {
      this.sel = clickedRow;
      const c = this.items[clickedRow];
      // clicking a value row cycles it; clicking an action row runs it
      if (c.action) { a.sfx('select'); input.consume(); c.action(); }
      else if (c.right) { c.right(); a.sfx('move'); }
      return;
    }
    if (input.pressed('confirm') && it && !this.isDisabled(this.sel)) {
      if (it.action) { a.sfx('select'); input.consume(); it.action(); }
      else if (it.right) { it.right(); a.sfx('move'); }
      return;
    }
    if (input.pressed('cancel') && this.onCancel) { a.sfx('back'); input.consume(); this.onCancel(); }
  }

  draw(g) {
    this.items.forEach((it, i) => {
      const y = this.y + i * this.lineH;
      const on = i === this.sel;
      const dis = this.isDisabled(i);
      const label = val(it.label);
      const col = dis ? C.grey : on ? C.white : C.fog;
      if (this.align === 'center') {
        g.text(label, this.x, y, col, { align: 'center' });
        if (on && !dis) {
          const w = g.textWidth(label);
          g.text('►', this.x - w / 2 - 10, y, C.red);
        }
      } else {
        g.text(label, this.x + 10, y, col);
        if (on && !dis) g.text('►', this.x, y, C.red);
      }
    });
  }
}

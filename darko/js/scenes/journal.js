// The journal: dated entries Donnie has written, the things in his pockets, and what he is
// supposed to be doing. Tabs switch with left/right or a click.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { dim, panel } from '../ui/panel.js';
import { wrap } from '../engine/font.js';
import { NOTES } from '../game/journal.js';
import { ITEMS } from '../game/items.js';
import { formatDate, formatTime } from '../game/calendar.js';

const TABS = ['JOURNAL', 'POCKETS'];
const LIST = { x: 14, y: 46, w: 112, rowH: 11 };

export class JournalScene {
  constructor(app, play) {
    this.app = app;
    this.play = play;
    this.opaque = false;
    this.tab = 0;
    this.sel = 0;
  }

  entries() {
    const s = this.play.state;
    if (this.tab === 0) return s.notes.slice().reverse().map(n => ({ title: NOTES[n.id]?.title || n.id, text: NOTES[n.id]?.text || '', stamp: `${formatDate(n.day)}, ${formatTime(n.time)}` }));
    return s.items.map(id => ({ title: ITEMS[id]?.name || id, text: ITEMS[id]?.text || '' }));
  }

  update(dt, input) {
    const a = this.app.audio;
    if (input.pressed('cancel') || input.pressed('journal')) { a.sfx('back'); input.consume(); this.app.pop(); return; }
    if (input.pressed('menuLeft') || input.pressed('menuRight')) { this.tab = 1 - this.tab; this.sel = 0; a.sfx('move'); }
    const list = this.entries();
    if (input.pressed('menuUp') && list.length) { this.sel = (this.sel - 1 + list.length) % list.length; a.sfx('move'); }
    if (input.pressed('menuDown') && list.length) { this.sel = (this.sel + 1) % list.length; a.sfx('move'); }
    const m = input.mouse;
    if (m.clicked || m.moved) {
      TABS.forEach((_, i) => {
        const x = 14 + i * 64;
        if (m.clicked && m.x >= x && m.x < x + 60 && m.y >= 30 && m.y < 40 && this.tab !== i) { this.tab = i; this.sel = 0; a.sfx('move'); }
      });
      const i = Math.floor((m.y - LIST.y + 2) / LIST.rowH);
      if (m.x >= LIST.x && m.x < LIST.x + LIST.w && i >= 0 && i < list.length && i !== this.sel) { this.sel = i; a.sfx('move'); }
    }
  }

  draw(g) {
    dim(g, 0.7);
    panel(g, 6, 6, W - 12, H - 12, { fill: '#0c0b10', alpha: 1 });
    const s = this.play.state;
    g.text(`${formatDate(s.day)}  ${formatTime(s.time)}`, 14, 14, C.bone);
    g.text('J / Esc: close', W - 14, 14, C.grey, { align: 'right' });
    TABS.forEach((t, i) => {
      const x = 14 + i * 64;
      g.text(t, x, 31, i === this.tab ? C.white : C.grey);
      if (i === this.tab) g.rect(x, 40, g.textWidth(t), 1, C.red);
    });
    g.rect(14, 43, W - 28, 1, C.slate);
    const list = this.entries();
    if (!list.length) g.text(this.tab === 0 ? 'Nothing written yet.' : 'Empty pockets.', LIST.x, LIST.y, C.grey);
    list.forEach((e, i) => {
      const on = i === this.sel;
      const title = e.title.length > 17 ? e.title.slice(0, 16) + '…' : e.title;
      g.text(title, LIST.x + 8, LIST.y + i * LIST.rowH, on ? C.white : C.fog);
      if (on) g.text('►', LIST.x, LIST.y + i * LIST.rowH, C.red);
    });
    const e = list[this.sel];
    const dx = 136;
    g.rect(dx - 6, 46, 1, H - 70, C.slate);
    if (e) {
      let y = 46;
      g.text(e.title, dx, y, C.bone); y += 11;
      if (e.stamp) { g.text(e.stamp, dx, y, C.grey); y += 13; }
      for (const line of wrap(e.text, 28)) { g.text(line, dx, y, C.mist); y += 10; }
    }
    g.rect(14, H - 26, W - 28, 1, C.slate);
    g.text(s.objective ? `NOW: ${s.objective}` : '', 14, H - 20, C.lamp);
  }
}

// The journal: dated entries Donnie has written, the things in his pockets, and what he is
// supposed to be doing. Tabs switch with left/right or a click.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { dim, panel } from '../ui/panel.js';
import { wrap } from '../engine/font.js';
import { NOTES } from '../game/journal.js';
import { ITEMS } from '../game/items.js';
import { formatDate, formatTime, weekday } from '../game/calendar.js';
import { countdown, formatCountdown, CALENDAR_MARKS, beatById } from '../game/timeline.js';
import { ReaderScene } from './reader.js';

const TABS = ['JOURNAL', 'POCKETS', 'CALENDAR'];
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
    if (this.tab === 2) return [];
    if (this.tab === 0) return s.notes.slice().reverse().map(n => ({ title: NOTES[n.id]?.title || n.id, text: NOTES[n.id]?.text || '', stamp: `${formatDate(n.day)}, ${formatTime(n.time)}` }));
    return s.items.map(id => ({ id, title: ITEMS[id]?.name || id, text: ITEMS[id]?.text || '', readable: !!ITEMS[id]?.pages }));
  }

  update(dt, input) {
    const a = this.app.audio;
    if (input.pressed('cancel') || input.pressed('journal')) { a.sfx('back'); input.consume(); this.app.pop(); return; }
    if (input.pressed('menuLeft')) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; a.sfx('move'); }
    if (input.pressed('menuRight')) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; a.sfx('move'); }
    const list = this.entries();
    if (input.pressed('menuUp') && list.length) { this.sel = (this.sel - 1 + list.length) % list.length; a.sfx('move'); }
    if (input.pressed('menuDown') && list.length) { this.sel = (this.sel + 1) % list.length; a.sfx('move'); }
    const pick = list[this.sel];
    if (this.tab === 1 && pick?.readable && (input.pressed('confirm') || (input.mouse.clicked && input.mouse.x > 130))) {
      a.sfx('select'); input.consume(); this.app.push(new ReaderScene(this.app, pick.id, this.play.state)); return;
    }
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
    if (this.tab === 2) { this.drawCalendar(g); return; }
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
      if (e.readable) g.text('Enter: read it', dx, y + 4, C.lamp);
    }
    g.rect(14, H - 26, W - 28, 1, C.slate);
    g.text(s.objective ? `NOW: ${s.objective}` : '', 14, H - 20, C.lamp);
  }

  // October 1988, with the days lived through crossed off and, once he knows it, the 30th
  drawCalendar(g) {
    const s = this.play.state;
    const x0 = 18, y0 = 58, cw = 20, ch = 15;
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d, i) => g.text(d, x0 + i * cw + 6, 48, C.grey));
    const first = weekday(1);
    for (let day = 1; day <= 31; day++) {
      const cell = first + day - 1, x = x0 + (cell % 7) * cw, y = y0 + Math.floor(cell / 7) * ch;
      const today = day === s.day, past = day < s.day;
      if (today) g.rect(x, y - 2, cw - 2, ch - 2, C.dusk);
      g.text(String(day), x + 3, y, past ? C.grey : today ? C.white : C.fog);
      if (past) { g.rect(x + 1, y + 3, cw - 5, 1, C.redD); }
      if (day === 30 && s.has('countdown')) g.box(x - 1, y - 3, cw, ch, C.red);
    }
    const dx = 168;
    g.rect(dx - 6, 46, 1, H - 70, C.slate);
    const b = beatById(s.beat);
    g.text(b.chapter.toUpperCase(), dx, 48, C.grey);
    g.text(b.title, dx, 58, C.bone);
    let y = 74;
    for (const [d, text] of Object.entries(CALENDAR_MARKS)) {
      if (Number(d) >= s.day) break;
      g.text(`OCT ${d}`, dx, y, C.grey);
      wrap(text, 16).forEach((l, i) => g.text(l, dx + 42, y + i * 9, C.mist));
      y += 9 * wrap(text, 16).length + 2;
    }
    if (s.has('countdown')) {
      const c = countdown(s.day, s.time);
      g.text(formatCountdown(c), W - 16, H - 36, C.red, { align: 'right' });
    }
  }
}

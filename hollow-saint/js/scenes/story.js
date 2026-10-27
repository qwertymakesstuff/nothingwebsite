// Chapter cards and ending screens: the pauses between the parts of the story.

import { C } from '../engine/palette.js';
import { W, H } from '../game/config.js';
import { wrap } from '../engine/font.js';
import { centerText } from '../ui/panel.js';
import { CHAPTERS } from '../game/chapters.js';
import { ENDINGS, ENDING_IDS } from '../game/endings.js';
import { Menu } from '../ui/menu.js';

export class ChapterScene {
  constructor(app, n, onDone) {
    this.app = app; this.n = n; this.onDone = onDone;
    this.opaque = true; this.t = 0; this.done = false;
  }

  enter() { this.app.ambience(null); this.app.sfx('chapter'); }

  finish() {
    if (this.done) return;
    this.done = true;
    this.app.transition(() => { this.app.pop(); this.onDone?.(); }, { speed: 3 });
  }

  update(input) {
    this.t++;
    if (this.t > 60 && (input.pressed('confirm') || input.pressed('interact') || input.pressed('cancel') || input.mouse.clicked)) this.finish();
    if (this.t > 330) this.finish();
  }

  render(fb) {
    fb.clear(C.BLACK);
    const ch = CHAPTERS[this.n];
    if (this.t > 20) centerText(fb, `CHAPTER ${ch.roman}`, 64, C.ASH);
    if (this.t > 50) centerText(fb, ch.title.toUpperCase(), 80, C.PALE, { scale: 2, shadow: C.DRIED });
    if (this.t > 110) wrap(ch.line, 38).forEach((l, i) => centerText(fb, l, 118 + i * 11, C.STONE));
  }
}

export class EndingScene {
  constructor(app, id, onDone) {
    this.app = app; this.id = id; this.onDone = onDone;
    this.opaque = true; this.t = 0;
    // rows of text, with a little extra space where a paragraph begins
    this.rows = ENDINGS[id].lines.flatMap(l => wrap(l, 40).map((text, i) => ({ text, gap: i === 0 ? 4 : 0 })));
    this.menu = new Menu(app, [{ label: 'Return to the title', onSelect: () => onDone?.() }], { x: 68, y: H - 22, w: 120, lineH: 12, center: true });
  }

  enter() { this.app.ambience('title'); this.app.sfx('ending'); }

  get revealed() { return Math.min(this.rows.length, Math.floor(this.t / 24)); }

  update(input) {
    this.t++;
    const all = this.revealed >= this.rows.length;
    if (!all && (input.pressed('confirm') || input.pressed('interact') || input.mouse.clicked)) { this.t = this.rows.length * 24; return; }
    if (all && this.t > this.rows.length * 24 + 60) this.menu.update(input);
  }

  render(fb) {
    fb.clear(C.BLACK);
    const e = ENDINGS[this.id];
    const height = this.rows.reduce((h, r) => h + 9 + r.gap, 0);
    let y = Math.max(6, Math.round((H - 44 - height) / 2));
    this.rows.slice(0, this.revealed).forEach(r => { y += r.gap; centerText(fb, r.text, y, C.STONE); y += 9; });
    if (this.revealed >= this.rows.length) {
      centerText(fb, `ENDING ${e.n} OF ${ENDING_IDS.length}: ${e.title.toUpperCase()}`, H - 40, C.PALE);
      if (this.t > this.rows.length * 24 + 60) this.menu.render(fb, this.t);
    }
  }
}

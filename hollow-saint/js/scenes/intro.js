// The opening card before play begins. Interact advances, Esc skips.

import { C } from '../engine/palette.js';
import { wrap } from '../engine/font.js';
import { H } from '../game/config.js';
import { centerText } from '../ui/panel.js';

export const INTRO = [
  { lines: ['BELLWETHER COUNTY', 'OCTOBER, 1987'], color: C.PALE, hold: 150 },
  { lines: ["Mara's tape came in a padded envelope.", 'No return address.'], hold: 200 },
  { lines: ['Nine minutes of a prayer you almost remember.', 'A string of numbers.', 'And under it, the whole time, a voice that was not hers.'], hold: 300 },
  { lines: ["You haven't been back in eleven years."], hold: 200 },
];

export class IntroScene {
  constructor(app, onDone) {
    this.app = app; this.opaque = true; this.onDone = onDone;
    this.card = 0; this.t = 0; this.done = false;
  }

  enter() { this.app.ambience('title'); }

  next() {
    if (this.done) return;
    this.card++; this.t = 0;
    if (this.card >= INTRO.length) { this.done = true; this.onDone(); }
  }

  update(input) {
    this.t++;
    if (input.pressed('cancel')) { this.card = INTRO.length - 1; this.next(); return; }
    if (input.pressed('confirm') || input.pressed('interact') || input.mouse.clicked) {
      if (this.t < 40) this.t = 40; else this.next();
      return;
    }
    if (this.t > (INTRO[this.card]?.hold || 200)) this.next();
  }

  render(fb) {
    fb.clear(C.BLACK);
    const card = INTRO[Math.min(this.card, INTRO.length - 1)];
    const rows = card.lines.flatMap(l => wrap(l, 40));
    // reveal a row at a time, in hard steps
    const shown = Math.min(rows.length, 1 + Math.floor(this.t / 20));
    const top = Math.round(H / 2 - rows.length * 6);
    rows.slice(0, shown).forEach((r, i) => centerText(fb, r, top + i * 12, card.color ?? C.STONE));
    if (this.t > 40) centerText(fb, 'E continue   Esc skip', H - 14, C.INK);
  }
}

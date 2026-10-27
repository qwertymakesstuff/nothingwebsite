// Credits.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { dim } from '../ui/panel.js';

const LINES = [
  ['DONNIE DARKO', C.bone],
  ['a retro psychological horror adaptation', C.fog],
  ['', null],
  ['Based on the film Donnie Darko', C.mist],
  ['written and directed by Richard Kelly', C.mist],
  ['', null],
  ['Code, pixel art and synthesized sound', C.fog],
  ['made for this game. No ripped assets,', C.fog],
  ['no recordings, no samples.', C.fog],
  ['', null],
  ['Bitmap font shared with The Hollow Saint.', C.grey],
  ['', null],
  ['Stage 1 build: the house, the street,', C.grey],
  ['and the evening of October 2, 1988.', C.grey],
];

export class CreditsScene {
  constructor(app) { this.app = app; this.opaque = false; this.t = 0; }

  update(dt, input) {
    this.t += dt;
    if (this.t > 0.2 && (input.pressed('cancel') || input.pressed('confirm') || input.mouse.clicked)) {
      this.app.audio.sfx('back');
      input.consume();
      this.app.pop();
    }
  }

  draw(g) {
    dim(g, 0.85);
    LINES.forEach(([s, col], i) => { if (s) g.text(s, W / 2, 18 + i * 10, col, { align: 'center' }); });
    g.text('press any key', W / 2, H - 12, C.grey, { align: 'center' });
  }
}

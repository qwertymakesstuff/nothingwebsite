// Full-screen title cards (a runner blocker), and the card that closes the Stage 1 build.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';

export class Card {
  constructor(lines, secs = 3) { this.lines = lines; this.secs = secs; this.t = 0; }

  update(dt, input) {
    this.t += dt;
    if (this.t > 0.8 && this.t < this.secs && input.advance()) this.t = this.secs;
    return this.t >= this.secs + 0.6;
  }

  draw(g) {
    g.rect(0, 0, W, H, C.black);
    const a = Math.max(0, Math.min(1, this.t / 0.6, (this.secs + 0.6 - this.t) / 0.6));
    const top = H / 2 - this.lines.length * 6;
    g.alpha(a, () => this.lines.forEach((l, i) => g.text(l, W / 2, top + i * 12, i === 0 ? C.bone : C.fog, { align: 'center' })));
  }
}

export class EndScene {
  constructor(app, lines) {
    this.app = app; this.opaque = true; this.t = 0;
    this.lines = lines || ['The story continues in the next stage of the build.'];
  }

  enter() { this.app.audio.ambience('night'); this.app.audio.sfx('sting'); }

  update(dt, input) {
    this.t += dt;
    if (this.t > 2 && (input.advance() || input.pressed('cancel'))) { input.consume(); this.app.toTitle(); }
  }

  draw(g) {
    g.rect(0, 0, W, H, C.black);
    const a = Math.min(1, this.t / 1.5);
    g.alpha(a, () => {
      g.text('DONNIE DARKO', W / 2, 50, C.bone, { scale: 2, align: 'center', spacing: 1 });
      g.text('END OF THE CURRENT BUILD', W / 2, 80, C.red, { align: 'center' });
      this.lines.forEach((l, i) => g.text(l, W / 2, 100 + i * 10, C.fog, { align: 'center' }));
      g.text('Your progress was autosaved.', W / 2, 140, C.grey, { align: 'center' });
    });
    if (this.t > 2 && Math.floor(this.t * 2) % 2) g.text('press any key', W / 2, H - 16, C.grey, { align: 'center' });
  }
}

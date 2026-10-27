// Playing a recording on Elias's Walkman: the reels turn, the hiss runs, and the transcript
// comes up a line at a time with a voice under it that you can't quite make out.

import { C } from '../engine/palette.js';
import { W, H } from '../game/config.js';
import { tapeLines, TAPES } from '../game/tapes.js';
import { wrap } from '../engine/font.js';
import { panel, centerText } from '../ui/panel.js';

const VOICE = { Mara: { pitch: 1.3 }, '?': { pitch: 0.55, rough: true } };

export class TapeScene {
  constructor(app, id, playIndex, onDone) {
    this.app = app;
    this.id = id;
    this.lines = tapeLines(id, playIndex);
    this.onDone = onDone;
    this.opaque = false;
    this.t = 0;
    this.line = -1;
    this.lineT = 0;
    this.done = false;
    this.hiss = null;
  }

  enter() { this.app.sfx('tape_click'); this.hiss = this.app.audio?.loop('hiss') || null; }

  durationOf(l) { return 50 + l.text.length * 2.6; }

  stop() {
    if (this.done) return;
    this.done = true;
    this.hiss?.stop();
    this.app.sfx('tape_click');
  }

  next() {
    this.line++;
    this.lineT = 0;
    if (this.line >= this.lines.length) { this.stop(); return; }
    const l = this.lines[this.line], v = VOICE[l.who];
    if (v) this.app.sfx('voice', { ...v, dur: Math.min(3, l.text.length / 14) });
  }

  update(input) {
    this.t++;
    if (this.done) {
      if (input.pressed('confirm') || input.pressed('interact') || input.pressed('cancel') || input.mouse.clicked) {
        this.app.pop();
        this.onDone?.();
      }
      return;
    }
    if (input.pressed('cancel')) { this.stop(); return; }
    if (this.t < 30) return;
    if (this.line < 0) { this.next(); return; }
    this.lineT++;
    const skip = input.pressed('confirm') || input.pressed('interact') || input.mouse.clicked;
    if (this.lineT > this.durationOf(this.lines[this.line]) || (skip && this.lineT > 20)) this.next();
  }

  render(fb) {
    fb.shade(0, 0, W, H, 3);
    panel(fb, 16, 10, W - 32, H - 20);
    // the Walkman
    const x = 88, y = 20;
    fb.rect(x, y, 80, 40, C.SLATE); fb.frame(x, y, 80, 40, C.ASH);
    fb.rect(x + 8, y + 8, 64, 22, C.NEAR); fb.frame(x + 8, y + 8, 64, 22, C.INK);
    const spin = this.done ? 0 : Math.floor(this.t / 5);
    for (const cx of [x + 24, x + 56]) {
      const cy = y + 19;
      fb.rect(cx - 6, cy - 6, 12, 12, C.ASH); fb.rect(cx - 2, cy - 2, 4, 4, C.BLACK);
      for (let k = 0; k < 3; k++) {
        const a = spin * 0.6 + k * 2.094;
        fb.pset(Math.round(cx + Math.cos(a) * 4), Math.round(cy + Math.sin(a) * 4), C.INK);
      }
    }
    fb.rect(x + 30, y + 20, 20, 2, C.DIRT);
    fb.text(this.done ? 'STOP' : 'PLAY', x + 4, y + 31, this.done ? C.STONE : C.RED);
    centerText(fb, TAPES[this.id].title, y + 45, C.STONE);

    // transcript: the current line bright, older lines fading
    let ty = 78;
    const start = Math.max(0, this.line - 3);
    for (let i = start; i <= Math.min(this.line, this.lines.length - 1); i++) {
      const l = this.lines[i], current = i === this.line;
      const shown = current ? l.text.slice(0, Math.floor(this.lineT * 1.2)) : l.text;
      const label = l.who ? `${l.who}: ` : '';
      const rows = wrap(label + shown, 34);
      const col = current ? (l.who === '?' ? C.RED : l.who ? C.PALE : C.STONE) : C.ASH;
      rows.forEach(r => { if (ty < H - 26) fb.text(r, 28, ty, col); ty += 10; });
      ty += 3;
    }
    if (this.done) centerText(fb, '[ E ]', H - 22, C.SLATE);
    else centerText(fb, 'Esc stop', H - 22, C.INK);
  }
}


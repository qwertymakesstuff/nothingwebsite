// Brightness calibration, shown at the start of every new game and from Settings. Three marks
// sit on black in the game's three darkest colours: turn the brightness up until the faintest
// is only just there. The darkness has to stay dark for the game to work.

import { C } from '../engine/palette.js';
import { W, H } from '../game/config.js';
import { Frame } from '../engine/frame.js';
import { applyLighting, lightTuning } from '../game/lighting.js';
import { bar } from '../ui/menu.js';
import { centerText } from '../ui/panel.js';

const MARKS = [C.NEAR, C.INK, C.SLATE];

function mark(fb, cx, cy, c) {
  fb.rect(cx - 2, cy - 14, 4, 30, c);
  fb.rect(cx - 10, cy - 6, 20, 4, c);
}

// a patch of ground lit by a lantern, so the setting can be judged on the real thing
function sample(brightness, t) {
  const f = new Frame(120, 40);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 120; x++) {
    const h = (x * 7 + y * 13 + (x * y) % 5) % 11;
    f.pset(x, y, h === 0 ? C.MOSS : h === 1 ? C.INK : C.FOREST);
  }
  f.rect(52, 0, 16, 40, C.DIRT);
  const tune = lightTuning(brightness);
  applyLighting(f, [{ x: 60 + Math.sin(t / 60) * 6, y: 20, r: 34 * tune.radius }], 0.05 + tune.ambient);
  return f;
}

export class CalibrateScene {
  constructor(app, onDone, { fromSettings = false } = {}) {
    this.app = app;
    this.onDone = onDone;
    this.fromSettings = fromSettings;
    this.opaque = true;
    this.t = 0;
  }

  set(v) {
    const s = this.app.settings;
    s.brightness = Math.round(Math.min(1, Math.max(0, v)) * 10) / 10;
    this.app.saveSettings();
    this.app.sfx('ui_move');
  }

  done() {
    this.app.settings.calibrated = true;
    this.app.saveSettings();
    this.app.sfx('ui_select');
    this.onDone?.();
  }

  update(input) {
    this.t++;
    const b = this.app.settings.brightness;
    if (input.pressed('menuLeft')) this.set(b - 0.1);
    else if (input.pressed('menuRight')) this.set(b + 0.1);
    else if (input.pressed('confirm') || input.pressed('interact')) this.done();
    else if (input.pressed('cancel')) this.done();
    else if (input.mouse.clicked) {
      const m = input.mouse;
      if (m.y >= 140 && m.y < 152 && m.x >= 92 && m.x < 164) this.set((m.x - 92) / 70);
      else if (m.y > 160) this.done();
    }
  }

  render(fb) {
    fb.clear(C.BLACK);
    centerText(fb, 'BEFORE YOU GO IN', 10, C.PALE);
    centerText(fb, 'Turn the brightness up until the', 24, C.STONE);
    centerText(fb, 'left mark is only just visible.', 34, C.STONE);
    MARKS.forEach((c, i) => mark(fb, 78 + i * 50, 66, c));
    const s = sample(this.app.settings.brightness, this.t);
    fb.copyFrom(s, 0, 0, 68, 92, s.w, s.h);
    fb.frame(67, 91, s.w + 2, s.h + 2, C.INK);
    const b = this.app.settings.brightness;
    centerText(fb, `◄ ${bar(b)} ►`, 142, C.PALE);
    centerText(fb, 'The rest of the dark should stay dark.', 158, C.ASH);
    centerText(fb, this.fromSettings ? 'Enter: done' : 'Enter: begin', 174, Math.floor(this.t / 30) % 2 ? C.SLATE : C.STONE);
  }
}

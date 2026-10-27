// "Press any key": the first screen, which also gives the browser the gesture it needs to
// allow audio.

import { C } from '../engine/palette.js';
import { H } from '../game/config.js';
import { centerText } from '../ui/panel.js';
import { TitleScene } from './title.js';

export class BootScene {
  constructor(app) { this.app = app; this.opaque = true; this.t = 0; this.going = false; }

  update(input) {
    this.t++;
    if (!this.going && this.t > 20 && input.anyPressed) {
      this.going = true;
      this.app.transition(() => this.app.replace(new TitleScene(this.app)), { speed: 3 });
    }
  }

  render(fb) {
    fb.clear(C.BLACK);
    if (Math.floor(this.t / 40) % 2 === 0) centerText(fb, 'PRESS ANY KEY', H / 2 - 4, C.STONE);
    centerText(fb, 'This game contains disturbing imagery.', H - 30, C.SLATE);
    centerText(fb, 'Flashing can be reduced in Settings.', H - 20, C.SLATE);
  }
}

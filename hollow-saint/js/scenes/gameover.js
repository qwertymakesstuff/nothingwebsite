// When Elias falls. You wake at the last place the game was saved.

import { C } from '../engine/palette.js';
import { W, H } from '../game/config.js';
import { Menu } from '../ui/menu.js';
import { centerText } from '../ui/panel.js';
import { PlayScene } from './play.js';
import { TitleScene } from './title.js';

const LINES = {
  hollow: ['Something thin and pale', 'kneels over you for a while.'],
  shade: ['A face with nothing on it', 'comes down close to yours.'],
  default: ["You don't remember falling."],
};

export class GameOverScene {
  constructor(app, by) {
    this.app = app;
    this.opaque = true;
    this.t = 0;
    this.lines = LINES[by] || LINES.default;
    this.menu = new Menu(app, [
      { label: 'Wake up', enabled: () => app.store.hasGame(), onSelect: () => this.wake() },
      { label: 'Quit to title', onSelect: () => this.quit() },
    ], { x: 88, y: 132, w: 80, lineH: 12, center: true });
    if (!app.store.hasGame()) this.menu.index = 1;
  }

  enter() { this.app.ambience(null); }

  wake() {
    const app = this.app, save = app.store.loadGame();
    app.transition(() => app.replace(new PlayScene(app, save)), { speed: 4 });
  }

  quit() {
    const app = this.app;
    app.transition(() => app.replace(new TitleScene(app)), { speed: 3 });
  }

  update(input) {
    this.t++;
    if (this.t > 90) this.menu.update(input);
  }

  render(fb) {
    fb.clear(C.BLACK);
    const n = Math.min(this.lines.length, Math.floor(this.t / 40));
    this.lines.slice(0, n).forEach((l, i) => centerText(fb, l, 70 + i * 12, C.STONE));
    if (this.t > 90) this.menu.render(fb, this.t);
    if (this.t < 30) fb.dither(0, 0, W, H, C.BLOOD, 12 - Math.floor(this.t / 3));
  }
}

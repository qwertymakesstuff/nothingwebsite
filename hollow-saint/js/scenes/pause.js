// Pause overlay. The game underneath stays exactly as it was and resumes on Esc or Resume.

import { C } from '../engine/palette.js';
import { W, H } from '../game/config.js';
import { Menu } from '../ui/menu.js';
import { panel, centerText, heading, formatTime } from '../ui/panel.js';
import { SettingsScene, ConfirmScene } from './menus.js';
import { TitleScene } from './title.js';

export class PauseScene {
  constructor(app, play) {
    this.app = app;
    this.play = play;
    this.opaque = false;
    this.t = 0;
    this.menu = new Menu(app, [
      { label: 'Resume', onSelect: () => this.resumeGame() },
      { label: 'Settings', onSelect: () => app.push(new SettingsScene(app)) },
      { label: 'Save & quit to title', onSelect: () => this.quit() },
    ], { x: 68, y: 92, w: 120, lineH: 12, center: true });
  }

  enter() { this.app.sfx('ui_back'); }

  resumeGame() { this.app.pop(); }

  quit() {
    const app = this.app;
    app.push(new ConfirmScene(app, ['Quit to the title screen?', 'Your position will be saved.'], () => {
      this.play.checkpoint(false);
      app.pop();
      app.transition(() => app.replace(new TitleScene(app)), { speed: 3 });
    }, () => app.pop()));
  }

  update(input) {
    this.t++;
    if (input.pressed('pause') || input.pressed('cancel')) { this.app.sfx('ui_select'); this.resumeGame(); return; }
    this.menu.update(input);
  }

  render(fb) {
    fb.shade(0, 0, W, H, 2);
    panel(fb, 56, 46, W - 112, 96);
    heading(fb, 'PAUSED', 56);
    const st = this.play.state;
    centerText(fb, this.play.world.room.name, 72, C.STONE);
    centerText(fb, formatTime(st.playtime), 81, C.SLATE);
    this.menu.render(fb, this.t);
  }
}

// The title screen: a night sky over the Darko house, the title, and the main menu.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { Menu } from '../ui/menu.js';
import { SettingsScene } from './settings.js';
import { CreditsScene } from './credits.js';
import { SaveLoadScene } from './saveload.js';

export class TitleScene {
  constructor(app) {
    this.app = app;
    this.opaque = true;
    this.t = 0;
    this.stars = Array.from({ length: 40 }, (_, i) => [(i * 97 + 13) % W, (i * 53 + 7) % 90, i % 3]);
    const hasSave = () => !!app.store.latest();
    this.menu = new Menu(app, [
      { label: 'Continue', action: () => app.continueGame(), disabled: () => !hasSave() },
      { label: 'New Game', action: () => app.newGame() },
      { label: 'Load Game', action: () => app.push(new SaveLoadScene(app, 'load')), disabled: () => !hasSave() },
      { label: 'Settings', action: () => app.push(new SettingsScene(app)) },
      { label: 'Credits', action: () => app.push(new CreditsScene(app)) },
    ], { x: W / 2, y: 98, lineH: 13 });
  }

  enter() { this.app.audio.ambience('title'); }
  resume() { this.app.audio.ambience('title'); this.menu.skipDisabled(1); }

  update(dt, input) {
    this.t += dt;
    this.menu.update(input);
  }

  draw(g) {
    const t = this.t;
    // sky in dithered bands
    g.rect(0, 0, W, H, C.ink);
    g.dither(0, 30, W, 40, C.night, 0.5);
    g.rect(0, 70, W, 50, C.night);
    g.dither(0, 100, W, 30, C.deep, 0.5);
    for (const [x, y, k] of this.stars) if ((Math.floor(t * 1.3 + x) % 7) || k) g.px(x, y, k ? C.grey : C.fog);
    // clouds drifting the wrong way, slowly
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 110 - t * (4 + i)) % (W + 140) + W + 140) % (W + 140) - 70;
      g.dither(cx, 20 + i * 14, 70 + i * 10, 5, C.slate, 0.5);
      g.dither(cx + 10, 24 + i * 14, 50, 3, C.slate, 0.25);
    }
    // the house and the trees
    const gy = 150;
    g.rect(0, gy, W, H - gy, C.black);
    g.rect(0, gy - 6, 130, 6, C.black); g.rect(220, gy - 9, 100, 9, C.black);
    for (const [x, w, h] of [[226, 30, 46], [272, 34, 54], [298, 26, 40]]) {
      for (let y = 0; y < h; y++) { const half = Math.round(w / 2 * Math.sin(Math.PI * (y + 1) / (h + 1))); g.rect(x + w / 2 - half, gy - h + y, half * 2, 1, C.black); }
    }
    const hx = 14, hw = 96;
    g.rect(hx, gy - 34, hw, 34, C.black);
    for (let i = 0; i < 18; i++) g.rect(hx - 6 + i, gy - 34 - i, hw + 12 - i * 2, 1, C.black);
    g.rect(hx + 82, gy - 58, 6, 14, C.black);
    // Donnie's window: on, mostly
    const flick = this.app.settings.reduceFlashing ? 1 : (Math.sin(t * 13) > -0.97 ? 1 : 0);
    if (flick) { g.rect(hx + 24, gy - 46, 9, 7, C.lamp); g.rect(hx + 28, gy - 46, 1, 7, C.black); }
    g.rect(hx + 70, gy - 22, 10, 8, C.grey);
    g.rect(hx + 50, gy - 18, 8, 18, C.ink);

    // the title
    // every few seconds the title slips sideways for a moment
    const glitch = !this.app.settings.reduceFlashing && t % 7 > 6.85;
    if (glitch) g.text('DONNIE DARKO', W / 2 + 3, 32, C.red, { scale: 3, align: 'center', spacing: 1 });
    g.text('DONNIE DARKO', W / 2 - (glitch ? 1 : 0), 32, C.bone, { scale: 3, align: 'center', spacing: 1, shadow: glitch ? null : C.black });
    g.text('MIDDLESEX, VIRGINIA  -  OCTOBER 1988', W / 2, 64, C.fog, { align: 'center' });

    this.menu.draw(g);
    g.text('arrows / WASD, Enter, or the mouse', W / 2, H - 10, C.grey, { align: 'center' });
  }
}

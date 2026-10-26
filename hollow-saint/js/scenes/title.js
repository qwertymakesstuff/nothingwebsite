// Title screen: a dead treeline, a far chapel with one lit window, and the main menu.

import { Frame } from '../engine/frame.js';
import { C } from '../engine/palette.js';
import { W, H, hash } from '../game/config.js';
import { Menu } from '../ui/menu.js';
import { centerText } from '../ui/panel.js';
import { SettingsScene, CreditsScene, ConfirmScene } from './menus.js';
import { IntroScene } from './intro.js';
import { PlayScene } from './play.js';

let backdrop = null;

function paintBackdrop() {
  const f = new Frame(W, H);
  f.clear(C.BLACK);
  // overcast sky, a little lighter toward the horizon so the trees stand out against it
  for (let y = 40; y < 124; y += 4) f.dither(0, y, W, 4, C.INK, Math.min(14, Math.floor((y - 40) / 6)));
  // a moon going behind cloud
  for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) {
    const d = x * x + y * y;
    if (d <= 90) f.pset(226 + x, 16 + y, d < 30 && x < 2 ? C.STONE : C.ASH);
  }
  f.dither(200, 14, 56, 3, C.BLACK, 12); f.dither(204, 20, 52, 2, C.BLACK, 8); f.dither(196, 25, 60, 4, C.BLACK, 14);
  // far hills
  for (let x = 0; x < W; x++) {
    const hy = 120 + Math.round(Math.sin(x / 37) * 4 + Math.sin(x / 13) * 2);
    f.vline(x, hy, H, C.NEAR);
  }
  // the chapel, small and far away
  const cx = 186, base = 118;
  f.rect(cx, base - 16, 22, 16, C.BLACK);
  for (let r = 0; r < 7; r++) f.rect(cx - 1 + r, base - 17 - r, 24 - r * 2, 1, C.BLACK);
  f.rect(cx + 2, base - 36, 6, 20, C.BLACK);
  for (let r = 0; r < 8; r++) f.rect(cx + 5 - Math.floor(r / 2), base - 44 + r, 1 + Math.floor(r / 2) * 2, 1, C.BLACK);
  f.vline(cx + 5, base - 52, base - 44, C.SLATE); f.hline(cx + 3, cx + 7, base - 49, C.SLATE);
  // pines
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash(i, 1, 5) * (W + 20)) - 10;
    if (x > cx - 12 && x < cx + 32) continue;
    const ht = 16 + Math.floor(hash(i, 3, 5) * 44), by = 128 + Math.floor(hash(i, 4, 5) * 8);
    for (let r = 0; r < ht; r++) {
      const half = Math.floor((r / ht) * 7) + ((r % 4) === 3 ? 1 : 0);
      f.hline(x - half, x + half, by - ht + r, C.BLACK);
    }
    f.vline(x, by, by + 4, C.BLACK);
  }
  f.rect(0, 134, W, H - 134, C.BLACK);
  // the road, leading off toward the chapel
  for (let y = 120; y < H; y++) {
    const t = (y - 120) / (H - 120);
    const x = Math.round(196 - t * 60 + Math.sin(t * 4) * 6), half = Math.floor(t * 10);
    if (y >= 134 || (x > cx - 12 && x < cx + 32)) f.dither(x - half, y, half * 2 + 1, 1, C.DIRT, 2 + Math.floor(t * 8));
  }
  return f;
}

export class TitleScene {
  constructor(app) {
    this.app = app;
    this.opaque = true;
    this.t = 0;
    this.glitch = null;
    const store = app.store;
    this.menu = new Menu(app, [
      { label: 'New Game', onSelect: () => this.newGame() },
      { label: 'Continue', enabled: () => store.hasGame(), onSelect: () => this.continueGame() },
      { label: 'Settings', onSelect: () => app.push(new SettingsScene(app)) },
      { label: 'Credits', onSelect: () => app.push(new CreditsScene(app)) },
    ], { x: 88, y: 140, w: 80, lineH: 12, center: true });
    if (store.hasGame()) this.menu.index = 1;
  }

  enter() { this.app.ambience('title'); }
  resume() { this.app.ambience('title'); }

  newGame() {
    const app = this.app;
    const begin = () => app.transition(() => {
      app.store.clearGame();
      app.replace(new IntroScene(app, () => app.transition(() => app.replace(new PlayScene(app, null)), { speed: 4 })));
    }, { speed: 3 });
    if (app.store.hasGame()) {
      app.push(new ConfirmScene(app, ['Begin again?', 'Your saved progress will be erased.', 'Settings are kept.'], () => { app.pop(); begin(); }, () => app.pop()));
    } else begin();
  }

  continueGame() {
    const app = this.app, save = app.store.loadGame();
    if (!save) return;
    app.transition(() => app.replace(new PlayScene(app, save)), { speed: 3 });
  }

  update(input) {
    this.t++;
    if (!this.glitch && hash(this.t, 9, 1) < 0.004) this.glitch = { t: 6, y: 28 + Math.floor(hash(this.t, 3) * 12), dx: hash(this.t, 4) < 0.5 ? -3 : 4 };
    if (this.glitch && --this.glitch.t <= 0) this.glitch = null;
    this.menu.update(input);
  }

  render(fb) {
    backdrop ||= paintBackdrop();
    fb.px.set(backdrop.px);
    // the chapel window
    const lit = hash(Math.floor(this.t / 9), 2, 2) > 0.12;
    fb.rect(190, 106, 2, 3, lit ? C.RED : C.BLOOD);
    if (lit && hash(Math.floor(this.t / 9), 5) > 0.7) fb.pset(190, 106, C.CANDLE);

    centerText(fb, 'THE HOLLOW SAINT', 30, C.PALE, { scale: 2, shadow: C.DRIED });
    if (this.glitch) {
      // tear a few rows of the title sideways, like a bad tape
      const { y, dx } = this.glitch;
      for (let j = y; j < y + 3; j++) {
        const row = fb.px.slice(j * W, (j + 1) * W);
        for (let i = 0; i < W; i++) fb.px[j * W + i] = row[(i - dx + W) % W];
      }
    }
    centerText(fb, 'B E L L W E T H E R ,   1 9 8 7', 52, C.ASH);
    this.menu.render(fb, this.t);
    fb.text('v0.1', W - 28, H - 10, C.INK);
  }
}

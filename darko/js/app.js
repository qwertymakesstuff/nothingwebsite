// The application: a stack of scenes (title, play, and overlays like pause), the shared input,
// audio, storage and settings, and the moves between them (new game, continue, back to title).

import { Gfx } from './engine/gfx.js';
import { Input } from './engine/input.js';
import { Store } from './engine/storage.js';
import { GameState } from './game/state.js';
import { TitleScene } from './scenes/title.js';
import { PlayScene } from './scenes/play.js';

export class App {
  constructor({ ctx, audio, platform, store }) {
    this.g = ctx ? new Gfx(ctx) : null;
    this.audio = audio;
    this.platform = platform || { applyDisplay() {}, toggleFullscreen() {}, isFullscreen: () => false };
    this.store = store || new Store();
    this.settings = this.store.loadSettings();
    this.input = new Input();
    this.scenes = [];
    this.applySettings(false);
  }

  get top() { return this.scenes[this.scenes.length - 1] || null; }

  push(s) { this.scenes.push(s); s.enter?.(); }
  pop() { const s = this.scenes.pop(); s?.exit?.(); this.top?.resume?.(); return s; }
  replace(s) {
    while (this.scenes.length) this.scenes.pop().exit?.();
    this.push(s);
  }

  update(dt) {
    this.top?.update(dt, this.input);
    this.input.endFrame();
  }

  render() {
    if (!this.g) return;
    let i = this.scenes.length - 1;
    while (i > 0 && !this.scenes[i].opaque) i--;
    for (; i < this.scenes.length; i++) this.scenes[i].draw(this.g);
  }

  applySettings(save = true) {
    this.audio?.setVolumes(this.settings);
    this.platform.applyDisplay(this.settings);
    if (save) this.store.saveSettings(this.settings);
  }

  toTitle() { this.replace(new TitleScene(this)); }
  newGame() { this.replace(new PlayScene(this, new GameState(), { intro: true })); }
  loadGame(data) { this.replace(new PlayScene(this, GameState.fromSave(data))); }
  continueGame() {
    const latest = this.store.latest();
    if (latest) this.loadGame(latest.data);
  }
}

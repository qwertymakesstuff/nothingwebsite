// The application shell: settings, persistence, audio, input, the scene stack and the
// stepped dissolve used between screens. Knows nothing about the DOM; main.js supplies a
// `platform` object for fullscreen and display scaling.

import { Frame } from './engine/frame.js';
import { Input } from './engine/input.js';
import { Store } from './engine/storage.js';
import { W, H } from './game/config.js';
import { C } from './engine/palette.js';

const noop = () => {};
const POINTER = ['X....', 'XX...', 'XBX..', 'XBBX.', 'XBBBX', 'XBXX.', 'XX...'];

export class App {
  constructor({ store = new Store(), audio = null, platform = {} } = {}) {
    this.store = store;
    this.audio = audio;
    this.platform = { toggleFullscreen: noop, isFullscreen: () => false, applyDisplay: noop, ...platform };
    this.settings = store.loadSettings();
    this.input = new Input(this.settings.bindings);
    this.fb = new Frame(W, H);
    this.scenes = [];
    this.tick = 0;
    this.fade = null;     // { level, dir, mid, done }
    this.flash = 0;
    this.shake = 0;
    this.mouseIdle = 999;
    this.applySettings();
  }

  get top() { return this.scenes[this.scenes.length - 1] || null; }

  push(scene) { this.scenes.push(scene); scene.enter?.(); this.input.consume(); }
  pop() { const s = this.scenes.pop(); s?.leave?.(); this.top?.resume?.(); this.input.consume(); return s; }
  replace(scene) { while (this.scenes.length) this.scenes.pop().leave?.(); this.push(scene); }

  // fade to black, run `mid` at full black, fade back in
  transition(mid, { speed = 2 } = {}) {
    if (this.fade) return false;
    this.fade = { level: 0, dir: 1, mid, speed };
    return true;
  }

  get busy() { return !!this.fade; }

  sfx(name, opts) { this.audio?.sfx(name, opts); }
  ambience(name) { this.audio?.ambience(name); }

  doFlash(color, frames = 8) { if (!this.settings.reduceFlashing) { this.flash = frames; this.flashColor = color; } }
  doShake(frames = 10) { if (this.settings.screenShake) this.shake = frames; }

  applySettings() {
    this.input.setBindings(this.settings.bindings);
    this.audio?.setVolumes(this.settings);
    this.platform.applyDisplay(this.settings);
  }

  saveSettings() { this.store.saveSettings(this.settings); this.applySettings(); }

  update() {
    this.tick++;
    if (this.fade) {
      const f = this.fade;
      if (this.tick % f.speed === 0) f.level += f.dir * 2;
      if (f.dir > 0 && f.level >= 16) { f.level = 16; f.dir = -1; const m = f.mid; f.mid = null; m?.(); this.input.consume(); }
      else if (f.dir < 0 && f.level <= 0) this.fade = null;
    } else {
      this.top?.update(this.input);
    }
    this.mouseIdle = this.input.mouse.moved || this.input.mouse.clicked ? 0 : this.mouseIdle + 1;
    if (this.flash > 0) this.flash--;
    if (this.shake > 0) this.shake--;
    this.input.endFrame();
  }

  render() {
    const fb = this.fb;
    let from = this.scenes.length - 1;
    while (from > 0 && !this.scenes[from].opaque) from--;
    fb.clear(0);
    for (let i = Math.max(0, from); i < this.scenes.length; i++) this.scenes[i].render(fb);
    if (this.flash) fb.dither(0, 0, W, H, this.flashColor, Math.min(12, this.flash * 2));
    if (this.fade) fb.dither(0, 0, W, H, 0, this.fade.level);
    // a small pointer for the menus, while the mouse is in use
    const m = this.input.mouse;
    if (this.top && this.top.cursor !== false && m.inside && this.mouseIdle < 180) {
      POINTER.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') fb.pset(m.x + i, m.y + j, ch === 'B' ? C.BONE : C.BLACK); }));
    }
    return fb;
  }

  // offset applied to the whole picture by main.js
  shakeOffset() {
    if (!this.shake) return [0, 0];
    return [((this.tick * 7) % 3) - 1, ((this.tick * 5) % 3) - 1];
  }
}

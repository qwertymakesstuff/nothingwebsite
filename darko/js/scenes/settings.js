// Settings: volumes, text speed, accessibility (shake, flashing), display. Every change applies
// immediately and is saved to localStorage.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { Menu } from '../ui/menu.js';
import { dim, panel } from '../ui/panel.js';
import { TEXT_SPEEDS, SHAKE } from '../engine/storage.js';
import { ACTIONS, ACTION_LABELS, keyName } from '../engine/input.js';

const bar = v => '■'.repeat(Math.round(v * 10)) + '□'.repeat(10 - Math.round(v * 10));
const cycle = (list, v, d) => list[(list.indexOf(v) + d + list.length) % list.length];

export class SettingsScene {
  constructor(app) {
    this.app = app;
    this.opaque = false;
    this.showKeys = false;
    const s = () => app.settings;
    const set = (k, v) => { app.settings[k] = v; app.applySettings(); };
    const vol = (k, label) => ({
      label: () => `${label.padEnd(10)} ${bar(s()[k])}`,
      left: () => set(k, Math.max(0, Math.round((s()[k] - 0.1) * 10) / 10)),
      right: () => set(k, Math.min(1, Math.round((s()[k] + 0.1) * 10) / 10)),
    });
    const pick = (k, label, list, names = {}) => ({
      label: () => `${label.padEnd(10)} ${(names[s()[k]] || s()[k]).toUpperCase()}`,
      left: () => set(k, cycle(list, s()[k], -1)),
      right: () => set(k, cycle(list, s()[k], 1)),
    });
    const flag = (k, label, on = 'ON', off = 'OFF') => ({
      label: () => `${label.padEnd(10)} ${s()[k] ? on : off}`,
      left: () => set(k, !s()[k]), right: () => set(k, !s()[k]),
    });
    this.menu = new Menu(app, [
      vol('master', 'Master'),
      vol('music', 'Ambience'),
      vol('sfx', 'Sound'),
      pick('textSpeed', 'Text', TEXT_SPEEDS),
      pick('shake', 'Shake', SHAKE),
      flag('reduceFlashing', 'Flashing', 'REDUCED', 'FULL'),
      flag('scanlines', 'Scanlines'),
      pick('scaling', 'Scaling', ['integer', 'fit'], { integer: 'pixel perfect', fit: 'fill screen' }),
      { label: () => `${'Fullscreen'.padEnd(10)} ${app.platform.isFullscreen() ? 'ON' : 'OFF'}`, action: () => app.platform.toggleFullscreen() },
      { label: 'Controls', action: () => { this.showKeys = true; } },
      { label: 'Back', action: () => app.pop() },
    ], { x: 64, y: 30, lineH: 12, align: 'left', width: 200, onCancel: () => app.pop() });
  }

  update(dt, input) {
    if (this.showKeys) {
      if (input.pressed('cancel') || input.pressed('confirm') || input.mouse.clicked) { this.showKeys = false; input.consume(); this.app.audio.sfx('back'); }
      return;
    }
    this.menu.update(input);
  }

  draw(g) {
    dim(g, 0.75);
    panel(g, 48, 10, W - 96, H - 20, { alpha: 1 });
    g.text('SETTINGS', W / 2, 16, C.bone, { align: 'center' });
    if (this.showKeys) {
      ACTIONS.forEach((a, i) => {
        g.text(ACTION_LABELS[a], 64, 32 + i * 12, C.fog);
        g.text(this.app.input.bindings[a].map(keyName).join(' / '), W - 64, 32 + i * 12, C.bone, { align: 'right' });
      });
      g.text('Mouse: click to walk, click things to use them', W / 2, 32 + ACTIONS.length * 12 + 4, C.grey, { align: 'center' });
      g.text('F: fullscreen', W / 2, 32 + ACTIONS.length * 12 + 14, C.grey, { align: 'center' });
      return;
    }
    this.menu.draw(g);
    g.text('left / right to change', W / 2, H - 18, C.grey, { align: 'center' });
  }
}

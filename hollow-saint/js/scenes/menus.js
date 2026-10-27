// Settings, key remapping, credits and the yes/no confirmation overlay.

import { C } from '../engine/palette.js';
import { W, H } from '../game/config.js';
import { Menu, bar } from '../ui/menu.js';
import { panel, centerText, heading } from '../ui/panel.js';
import { TEXT_SPEEDS } from '../engine/storage.js';
import { ACTIONS, ACTION_LABELS, DEFAULT_BINDINGS, keyName } from '../engine/input.js';
import { CalibrateScene } from './calibrate.js';

const cap = s => s[0].toUpperCase() + s.slice(1);
const onOff = v => (v ? 'On' : 'Off');

export class SettingsScene {
  constructor(app) {
    this.app = app;
    this.opaque = true;
    this.t = 0;
    const s = () => app.settings;
    const change = fn => () => { fn(s()); app.saveSettings(); };
    const vol = key => ({
      label: { master: 'Master volume', music: 'Music volume', sfx: 'Effects volume' }[key],
      value: () => bar(s()[key]),
      onLeft: change(x => { x[key] = Math.max(0, Math.round((x[key] - 0.1) * 10) / 10); }),
      onRight: change(x => { x[key] = Math.min(1, Math.round((x[key] + 0.1) * 10) / 10); }),
    });
    const toggle = (label, key) => ({ label, value: () => onOff(s()[key]), onLeft: change(x => { x[key] = !x[key]; }), onRight: change(x => { x[key] = !x[key]; }) });
    const cycle = d => change(x => { x.textSpeed = TEXT_SPEEDS[(TEXT_SPEEDS.indexOf(x.textSpeed) + d + TEXT_SPEEDS.length) % TEXT_SPEEDS.length]; });
    const scaling = change(x => { x.scaling = x.scaling === 'integer' ? 'fit' : 'integer'; });
    this.menu = new Menu(app, [
      vol('master'), vol('music'), vol('sfx'),
      { label: 'Brightness...', value: () => bar(s().brightness), onSelect: () => app.push(new CalibrateScene(app, () => app.pop(), { fromSettings: true })) },
      { label: 'Text speed', value: () => cap(s().textSpeed), onLeft: cycle(-1), onRight: cycle(1) },
      toggle('Reduce flashing', 'reduceFlashing'),
      toggle('Screen shake', 'screenShake'),
      toggle('Scanlines', 'scanlines'),
      { label: 'Scaling', value: () => (s().scaling === 'integer' ? 'Sharp' : 'Fit'), onLeft: scaling, onRight: scaling },
      { label: 'Fullscreen', value: () => onOff(app.platform.isFullscreen()), onSelect: () => app.platform.toggleFullscreen(), onRight: () => app.platform.toggleFullscreen(), onLeft: () => app.platform.toggleFullscreen() },
      { label: 'Controls...', onSelect: () => app.push(new ControlsScene(app)) },
      { label: 'Back', onSelect: () => app.pop() },
    ], { x: 44, y: 32, w: 168, lineH: 11 });
  }

  update(input) {
    this.t++;
    if (input.pressed('cancel')) { this.app.sfx('ui_back'); this.app.pop(); return; }
    this.menu.update(input);
  }

  render(fb) {
    fb.clear(C.BLACK);
    panel(fb, 24, 10, W - 48, H - 20);
    heading(fb, 'SETTINGS', 18);
    this.menu.render(fb, this.t);
    centerText(fb, '◄ ► change   Esc back', H - 22, C.SLATE);
  }
}

export class ControlsScene {
  constructor(app) {
    this.app = app;
    this.opaque = true;
    this.t = 0;
    this.capturing = null;
    const b = () => app.settings.bindings;
    this.menu = new Menu(app, [
      ...ACTIONS.map(a => ({
        label: ACTION_LABELS[a],
        value: () => (this.capturing === a ? (Math.floor(this.t / 15) % 2 ? '...' : '') : b()[a].map(keyName).join(' / ')),
        onSelect: () => { this.capturing = a; app.input.consume(); },
      })),
      { label: 'Reset to defaults', onSelect: () => { app.settings.bindings = structuredClone(DEFAULT_BINDINGS); app.saveSettings(); } },
      { label: 'Back', onSelect: () => app.pop() },
    ], { x: 40, y: 30, w: 176, lineH: 11 });
  }

  bind(action, code) {
    const binds = this.app.settings.bindings;
    const old = binds[action][0];
    // a key belongs to one action: take it from wherever it was and give that action our old key
    for (const a of ACTIONS) {
      if (a === action) continue;
      const i = binds[a].indexOf(code);
      if (i >= 0) { binds[a][i] = old; binds[a] = [...new Set(binds[a])]; }
    }
    binds[action] = [...new Set([code, ...binds[action].slice(1)])];
    this.app.saveSettings();
  }

  update(input) {
    this.t++;
    if (this.capturing) {
      if (input.anyPressed && input.lastCode && input.pressedCodes.size) {
        const code = input.lastCode;
        if (code !== 'Escape') { this.bind(this.capturing, code); this.app.sfx('ui_select'); } else this.app.sfx('ui_back');
        this.capturing = null;
        input.consume();
      }
      return;
    }
    if (input.pressed('cancel')) { this.app.sfx('ui_back'); this.app.pop(); return; }
    this.menu.update(input);
  }

  render(fb) {
    fb.clear(C.BLACK);
    panel(fb, 24, 10, W - 48, H - 20);
    heading(fb, 'CONTROLS', 18);
    this.menu.render(fb, this.t);
    centerText(fb, this.capturing ? 'Press a key. Esc cancels.' : 'Enter rebind   Esc back', H - 34, C.SLATE);
    centerText(fb, 'Arrows, Enter and Esc always work in menus.', H - 24, C.INK);
  }
}

const CREDITS = [
  ['THE HOLLOW SAINT', C.PALE],
  ['', 0],
  ['Writing, design, code, pixels', C.STONE],
  ['and sound made for missing.website', C.STONE],
  ['', 0],
  ['Every sprite is drawn in code.', C.ASH],
  ['Every sound is synthesised live.', C.ASH],
  ['No samples. No borrowed assets.', C.ASH],
  ['', 0],
  ['Made in the spirit of the', C.SLATE],
  ['low-colour horror games of', C.SLATE],
  ['the 2010s and the machines', C.SLATE],
  ['they pretended to run on.', C.SLATE],
  ['', 0],
  ['For anyone who kept a tape', C.BLOOD],
  ['they should have thrown out.', C.BLOOD],
];

export class CreditsScene {
  constructor(app) { this.app = app; this.opaque = true; this.t = 0; }
  update(input) {
    this.t++;
    if (input.pressed('cancel') || input.pressed('confirm') || input.mouse.clicked) { this.app.sfx('ui_back'); this.app.pop(); }
  }
  render(fb) {
    fb.clear(C.BLACK);
    // lines appear one by one, in steps
    const n = Math.floor(this.t / 8);
    CREDITS.slice(0, n).forEach(([line, c], i) => centerText(fb, line, 14 + i * 10, c));
    if (n > CREDITS.length) centerText(fb, 'Esc back', H - 14, C.INK);
  }
}

export class ConfirmScene {
  constructor(app, lines, onYes, onNo) {
    this.app = app;
    this.opaque = false;
    this.t = 0;
    this.lines = lines;
    this.onNo = onNo;
    this.menu = new Menu(app, [
      { label: 'No', onSelect: onNo },
      { label: 'Yes', onSelect: onYes },
    ], { x: 108, y: 112, w: 40, lineH: 12, center: true });
  }
  update(input) {
    this.t++;
    if (input.pressed('cancel')) { this.app.sfx('ui_back'); this.onNo(); return; }
    this.menu.update(input);
  }
  render(fb) {
    fb.shade(0, 0, W, H, 2);
    panel(fb, 40, 60, W - 80, 84);
    this.lines.forEach((l, i) => centerText(fb, l, 70 + i * 11, i ? C.STONE : C.PALE));
    this.menu.render(fb, this.t);
  }
}

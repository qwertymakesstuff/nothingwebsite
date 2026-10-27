// The pause menu, over the frozen game.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { Menu } from '../ui/menu.js';
import { dim, panel } from '../ui/panel.js';
import { formatLongDate, formatTime } from '../game/calendar.js';
import { SettingsScene } from './settings.js';
import { SaveLoadScene } from './saveload.js';
import { JournalScene } from './journal.js';

export class PauseScene {
  constructor(app, play) {
    this.app = app;
    this.play = play;
    this.opaque = false;
    this.confirmQuit = false;
    const resume = () => app.pop();
    this.menu = new Menu(app, [
      { label: 'Resume', action: resume },
      { label: 'Journal', action: () => app.push(new JournalScene(app, play)) },
      { label: () => (play.busy ? 'Save Game (not during a scene)' : 'Save Game'), action: () => app.push(new SaveLoadScene(app, 'save', play)), disabled: () => play.busy },
      { label: 'Load Game', action: () => app.push(new SaveLoadScene(app, 'load', play)), disabled: () => !app.store.latest() },
      { label: 'Settings', action: () => app.push(new SettingsScene(app)) },
      { label: () => (this.confirmQuit ? 'Quit? Unsaved progress is lost' : 'Quit to Title'), action: () => { if (this.confirmQuit) app.toTitle(); else this.confirmQuit = true; } },
    ], { x: W / 2, y: 60, lineH: 13, width: 200, onCancel: resume });
  }

  update(dt, input) {
    if (input.pressed('pause') && !input.pressed('cancel')) { this.app.audio.sfx('back'); input.consume(); this.app.pop(); return; }
    const before = this.menu.sel;
    this.menu.update(input);
    if (this.menu.sel !== before) this.confirmQuit = false;
  }

  draw(g) {
    dim(g, 0.6);
    panel(g, 50, 24, W - 100, 128);
    g.text('PAUSED', W / 2, 32, C.bone, { align: 'center' });
    const s = this.play.state;
    g.text(`${formatLongDate(s.day)}, ${formatTime(s.time)}`, W / 2, 44, C.grey, { align: 'center' });
    this.menu.draw(g);
    if (s.objective) g.text(s.objective, W / 2, H - 16, C.fog, { align: 'center' });
  }
}

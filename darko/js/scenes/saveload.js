// Save and load screens. Three manual slots plus the autosave, which is written on every room
// change and at story beats. Continue on the title screen loads whichever was written last.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { Menu } from '../ui/menu.js';
import { dim, panel } from '../ui/panel.js';
import { MANUAL_SLOTS, SLOTS } from '../engine/storage.js';
import { formatDate, formatTime } from '../game/calendar.js';
import { ROOMS } from '../game/rooms/index.js';

const clock = s => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`;

export function describe(d) {
  if (!d) return '- empty -';
  return `${formatDate(d.day).slice(4)} ${formatTime(d.time)}  ${ROOMS[d.room]?.name || d.room}`;
}

export class SaveLoadScene {
  constructor(app, mode, play = null) {
    this.app = app;
    this.mode = mode;
    this.play = play;
    this.opaque = false;
    this.msg = '';
    this.msgT = 0;
    const slots = mode === 'save' ? MANUAL_SLOTS : SLOTS;
    this.menu = new Menu(app, [
      ...slots.map(slot => ({
        label: () => `${slot === 'auto' ? 'AUTO' : 'SLOT ' + slot}  ${describe(app.store.load(slot))}`,
        disabled: () => mode === 'load' && !app.store.load(slot),
        action: () => this.pick(slot),
      })),
      { label: 'Back', action: () => app.pop() },
    ], { x: 26, y: 46, lineH: 14, align: 'left', width: W - 52, onCancel: () => app.pop() });
  }

  pick(slot) {
    if (this.mode === 'save') {
      const ok = this.app.store.save(slot, this.play.state.toSave());
      this.msg = ok ? 'Saved.' : 'Could not save (storage is full or blocked).';
      this.msgT = 2;
      this.app.audio.sfx(ok ? 'save' : 'deny');
    } else {
      const d = this.app.store.load(slot);
      if (d) this.app.loadGame(d);
    }
  }

  update(dt, input) {
    this.msgT -= dt;
    this.menu.update(input);
  }

  draw(g) {
    dim(g, 0.75);
    panel(g, 16, 18, W - 32, H - 36, { alpha: 1 });
    g.text(this.mode === 'save' ? 'SAVE GAME' : 'LOAD GAME', W / 2, 26, C.bone, { align: 'center' });
    this.menu.draw(g);
    const d = this.menu.items[this.menu.sel];
    if (this.msgT > 0) g.text(this.msg, W / 2, H - 32, C.lamp, { align: 'center' });
    else if (d && this.mode === 'load') {
      const slot = SLOTS[this.menu.sel];
      const data = slot && this.app.store.load(slot);
      if (data) g.text(`played ${clock(data.playtime)}`, W / 2, H - 32, C.grey, { align: 'center' });
    }
  }
}

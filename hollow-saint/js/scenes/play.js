// The game itself: runs the World, turns its events into sound, text and transitions, and
// draws the room with its darkness.

import { C } from '../engine/palette.js';
import { textWidth } from '../engine/font.js';
import { keyName } from '../engine/input.js';
import { W, H } from '../game/config.js';
import { World } from '../game/world.js';
import { bakeRoom } from '../game/tiles.js';
import { PLAYER, spriteFrame } from '../game/art.js';
import { applyLighting } from '../game/lighting.js';
import { newRunState, stateFromSave, saveFromState } from '../game/state.js';
import { TextBox } from '../ui/textbox.js';
import { PauseScene } from './pause.js';

const FLASH = { red: C.RED, white: C.BONE, blood: C.BLOOD };

export class PlayScene {
  constructor(app, save = null) {
    this.app = app;
    this.opaque = true;
    this.state = save ? stateFromSave(save) : newRunState();
    this.world = new World(this.state);
    this.text = new TextBox(app);
    this.baked = new Map();
    this.banner = null;
    this.savedT = 0;
    this.t = 0;
    const ev = save
      ? this.world.enter(save.room, { x: save.x, y: save.y, facing: save.facing })
      : this.world.enter(this.state.room, this.state.spawn);
    this.handle(ev);
    if (!save) this.checkpoint(false);
  }

  enter() { this.app.ambience(this.world.room.ambience); }
  resume() { this.app.ambience(this.world.room.ambience); }

  onBlur() { if (!this.app.busy && this.app.top === this) this.app.push(new PauseScene(this.app, this)); }

  checkpoint(show = true) {
    const ok = this.app.store.saveGame(saveFromState(this.state, this.world.player));
    if (ok && show) this.savedT = 110;
    return ok;
  }

  say(lines) { if (lines && lines.length) this.text.open(lines); }

  handle(events) {
    for (const e of events) {
      switch (e.type) {
        case 'enter':
          this.app.ambience(this.world.room.ambience);
          this.banner = { text: this.world.room.name, t: 0 };
          break;
        case 'step':
          this.app.sfx('step', { surface: e.surface });
          break;
        case 'say':
        case 'interact':
          this.app.sfx(e.sfx || (e.type === 'interact' ? 'interact' : null));
          if (e.flash) this.app.doFlash(FLASH[e.flash] ?? C.BONE);
          if (e.save) this.checkpoint();
          this.say(e.lines);
          break;
        case 'exit': {
          const ex = e.exit;
          if (ex.sfx) this.app.sfx(ex.sfx);
          this.app.transition(() => {
            this.handle(this.world.enter(ex.to, ex.spawn));
            this.checkpoint();
          });
          break;
        }
      }
    }
  }

  update(input) {
    this.t++;
    if (this.banner) this.banner.t++;
    if (this.savedT > 0) this.savedT--;
    if (input.pressed('pause') || input.pressedCodes.has('Escape')) { this.app.push(new PauseScene(this.app, this)); return; }
    if (this.text.active) { this.text.update(input); this.world.player.moving = false; return; }
    const { dx, dy } = input.axis();
    this.handle(this.world.update({ dx, dy, interact: input.pressed('interact') }));
  }

  camera() {
    const w = this.world, p = w.player;
    const cx = w.roomW <= W ? -Math.floor((W - w.roomW) / 2) : Math.max(0, Math.min(w.roomW - W, Math.round(p.x - W / 2)));
    const cy = w.roomH <= H ? -Math.floor((H - w.roomH) / 2) : Math.max(0, Math.min(w.roomH - H, Math.round(p.y - 8 - H / 2)));
    return [cx, cy];
  }

  render(fb) {
    const w = this.world, room = w.room, p = w.player;
    if (!this.baked.has(w.state.room)) this.baked.set(w.state.room, bakeRoom(room));
    const [cx, cy] = this.camera();
    fb.copyFrom(this.baked.get(w.state.room), cx, cy);

    const props = w.props();
    const draw = props.filter(pr => pr.sprite && !pr.glow).map(pr => ({ y: pr.baseline, fn: () => fb.blit(spriteFrame(pr.sprite, w.tick, pr.anim || 12), pr.px - cx, pr.py - cy) }));
    const dir = p.facing === 'left' ? 'right' : p.facing;
    const frame = p.moving ? Math.floor(p.anim / 9) % 4 : 0;
    draw.push({ y: p.y + 0.5, fn: () => fb.blit(PLAYER[dir][frame], Math.round(p.x) - 4 - cx, Math.round(p.y) - 15 - cy, { flip: p.facing === 'left' }) });
    draw.sort((a, b) => a.y - b.y).forEach(d => d.fn());

    applyLighting(fb, w.lights().map(L => ({ ...L, x: L.x - cx, y: L.y - cy })), room.ambient || 0);

    for (const pr of props) if (pr.glow && pr.sprite) fb.blit(spriteFrame(pr.sprite, w.tick, pr.anim || 12), pr.px - cx, pr.py - cy);

    // what you can interact with: a small key cap over it
    if (!this.text.active && !this.app.busy) {
      const tg = w.target();
      if (tg && Math.floor(this.t / 20) % 3 !== 2) {
        const label = keyName(this.app.settings.bindings.interact[0]);
        const bw = textWidth(label) + 4;
        const x = Math.round(tg.zoneRect.x + tg.zoneRect.w / 2 - bw / 2) - cx;
        const y = Math.max(2, Math.round(Math.min(tg.py, tg.zoneRect.y) - 11) - cy);
        fb.rect(x, y, bw, 10, C.BLACK); fb.frame(x, y, bw, 10, C.ASH);
        fb.text(label, x + 2, y + 1, C.PALE);
      }
    }

    // room name: types in, holds, then goes
    if (this.banner && this.banner.t < 200) {
      const b = this.banner, n = Math.min(b.text.length, Math.floor(b.t / 3));
      const shown = b.t < 160 ? b.text.slice(0, n) : b.text.slice(0, Math.max(0, b.text.length - Math.floor((b.t - 160) / 2)));
      if (shown) {
        const x = Math.round((W - textWidth(b.text)) / 2);
        fb.rect(x - 4, 4, textWidth(b.text) + 8, 11, C.BLACK);
        fb.text(shown, x, 6, C.STONE);
      }
    }

    if (this.savedT > 0 && Math.floor(this.savedT / 10) % 2 === 0) {
      fb.text('†', W - 46, H - 12, C.CANDLE);
      fb.text('saved', W - 36, H - 12, C.ASH);
    }

    this.text.top = Math.round(p.y) - cy > H - 64;
    this.text.render(fb);
  }
}

// The game itself: runs the World, turns its events into sound, text, conversations and
// transitions, and draws the room with its darkness, the things in it, and the relic's light.

import { C } from '../engine/palette.js';
import { textWidth } from '../engine/font.js';
import { keyName } from '../engine/input.js';
import { BAYER4 } from '../engine/frame.js';
import { W, H } from '../game/config.js';
import { World, INVULNERABLE } from '../game/world.js';
import { ROOMS } from '../game/rooms/index.js';
import { bakeRoom } from '../game/tiles.js';
import { PLAYER, SPRITES, ICONS, spriteFrame } from '../game/art.js';
import { applyLighting } from '../game/lighting.js';
import { RELIC } from '../game/entities.js';
import { ITEMS } from '../game/items.js';
import { addNote, MAX_HP, newRunState, stateFromSave, saveFromState } from '../game/state.js';
import { docNoteId } from '../game/docs.js';
import { entryNode, enterNode, choose } from '../game/dialogue.js';
import { TextBox } from '../ui/textbox.js';
import { PauseScene } from './pause.js';
import { DocumentScene } from './document.js';
import { TapeScene } from './tape.js';
import { InventoryScene } from './inventory.js';
import { GameOverScene } from './gameover.js';

const FLASH = { red: C.RED, white: C.BONE, blood: C.BLOOD };
const AIM_IDLE = 240;   // ticks after the mouse last moved before aiming falls back to facing

export class PlayScene {
  constructor(app, save = null) {
    this.app = app;
    this.opaque = true;
    this.cursor = false;
    // a save from a newer or broken build that names a room we don't have starts afresh
    if (save && !ROOMS[save.room]) save = null;
    this.state = save ? stateFromSave(save) : newRunState();
    this.world = new World(this.state);
    this.text = new TextBox(app);
    this.baked = new Map();
    this.banner = null;
    this.savedT = 0;
    this.hurtT = 0;
    this.deathT = 0;
    this.mouseT = AIM_IDLE;
    this.t = 0;
    const ev = save
      ? this.world.enter(save.room, { x: save.x, y: save.y, facing: save.facing })
      : this.world.enter(this.state.room, this.state.spawn);
    this.handle(ev);
    if (!save) this.checkpoint(false);
  }

  enter() { this.app.ambience(this.world.room.ambience); }
  resume() { this.app.ambience(this.world.room.ambience); }

  onBlur() { if (!this.app.busy && this.app.top === this && !this.deathT) this.app.push(new PauseScene(this.app, this)); }

  checkpoint(show = true) {
    if (this.world.player.dead) return false;
    const ok = this.app.store.saveGame(saveFromState(this.state, this.world.player));
    if (ok && show) this.savedT = 110;
    return ok;
  }

  // ---- hand-offs: reading, listening, talking ----------------------------------------------

  readDoc(id) {
    this.state.flags.add('read:' + id);
    addNote(this.state, docNoteId(id));
  }

  showDoc(id, then) {
    this.readDoc(id);
    this.app.push(new DocumentScene(this.app, id, then));
  }

  playTape(id) {
    const key = 'tape:' + id;
    const n = this.state.counts[key] || 0;
    this.app.push(new TapeScene(this.app, id, n, () => {
      this.state.counts[key] = n + 1;
      this.state.flags.add('heard:' + id);
      this.handle(this.world.playedTape(id));
    }));
  }

  talk(id, then) {
    const node = entryNode(id, this.state);
    if (node) this.showNode(id, node, then);
  }

  showNode(id, nodeId, then) {
    const view = enterNode(id, nodeId, this.state);
    if (view.sfx) this.app.sfx(view.sfx);
    if (view.flash) this.app.doFlash(FLASH[view.flash] ?? C.BONE);
    const finish = () => (view.next ? this.showNode(id, view.next, then) : then?.());
    if (view.choices.length) {
      this.text.open(view.lines, null, {
        choices: view.choices,
        onChoice: k => {
          const next = choose(id, nodeId, view.choices[k].i, this.state);
          if (next) this.showNode(id, next, then); else then?.();
        },
      });
    } else this.text.open(view.lines, finish);
    if (!this.text.active) finish();
  }

  // ---- events from the world ---------------------------------------------------------------

  say(lines, then) { if (lines && lines.length) this.text.open(lines, then); else then?.(); }

  // what happens after a script's lines: a document, a tape, a conversation, a doorway
  followUp(e) {
    return () => {
      if (e.doc) this.showDoc(e.doc, e.tape || e.talk || e.go ? this.followUp({ ...e, doc: null }) : null);
      else if (e.talk) this.talk(e.talk);
      else if (e.tape) this.playTape(e.tape);
      else if (e.go) this.go(e.go);
      else if (e.after) this.handle([e.after]);
    };
  }

  go(exit) {
    if (exit.sfx) this.app.sfx(exit.sfx);
    this.app.transition(() => {
      this.handle(this.world.enter(exit.to, exit.spawn));
      this.checkpoint();
    });
  }

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
          if (e.shake) this.app.doShake(12);
          if (e.save) this.checkpoint();
          this.say(e.lines, this.followUp(e));
          break;
        case 'exit':
          this.go(e.exit);
          break;
        case 'relic':
          this.app.sfx('relic');
          break;
        case 'hit':
          if (e.sfx) this.app.sfx(e.sfx);
          if (e.effect === 'unmade') { this.app.doFlash(C.BONE, 6); this.app.doShake(10); }
          if (e.effect === 'ignored' && !this.text.active) this.say(['It does not look up. The cross is just tin to it.']);
          break;
        case 'cue':
          this.app.sfx(e.sfx);
          break;
        case 'hurt':
          this.app.sfx('hurt');
          this.app.doFlash(C.BLOOD, 10);
          this.app.doShake(14);
          this.hurtT = 240;
          break;
        case 'death':
          this.app.sfx('death');
          this.deathT = 1;
          this.deathBy = e.by;
          break;
        case 'released':
          this.say(['The kneeling figure lifts its head, as if it had been waiting to hear that.', 'It stands. It is much taller standing. Then it is not there.']);
          break;
        case 'vanished':
          this.app.sfx('shade_stun');
          break;
      }
    }
  }

  // ---- the tick ----------------------------------------------------------------------------

  aimAngle(input) {
    const p = this.world.player, [cx, cy] = this.camera();
    if (this.mouseT >= AIM_IDLE || !input.mouse.inside) return null;
    return Math.atan2(input.mouse.y - (p.y - 7 - cy), input.mouse.x - (p.x - cx));
  }

  update(input) {
    this.t++;
    if (this.banner) this.banner.t++;
    if (this.savedT > 0) this.savedT--;
    if (this.hurtT > 0) this.hurtT--;
    if (input.mouse.moved) this.mouseT = 0; else if (this.mouseT < AIM_IDLE) this.mouseT++;

    if (this.deathT) {
      if (++this.deathT > 80) this.app.replace(new GameOverScene(this.app, this.deathBy));
      return;
    }
    if (input.pressed('pause') || input.pressedCodes.has('Escape')) { this.app.push(new PauseScene(this.app, this)); return; }
    // a dead phone that rings
    const ring = this.world.room.ringing;
    if (ring && this.state.flags.has(ring) && this.t % 150 === 1) this.app.sfx('phone_ring');

    if (this.text.active) { this.text.update(input); this.world.player.moving = false; return; }
    if (input.pressed('inventory')) { this.app.push(new InventoryScene(this.app, this, 0)); return; }
    if (input.pressed('map')) { this.app.push(new InventoryScene(this.app, this, 2)); return; }
    const { dx, dy } = input.axis();
    const aim = this.aimAngle(input);
    const relic = input.pressed('relic') || (input.mouse.clicked && input.mouse.inside);
    this.handle(this.world.update({ dx, dy, interact: input.pressed('interact'), relic, aim }));
  }

  camera() {
    const w = this.world, p = w.player;
    const cx = w.roomW <= W ? -Math.floor((W - w.roomW) / 2) : Math.max(0, Math.min(w.roomW - W, Math.round(p.x - W / 2)));
    const cy = w.roomH <= H ? -Math.floor((H - w.roomH) / 2) : Math.max(0, Math.min(w.roomH - H, Math.round(p.y - 8 - H / 2)));
    return [cx, cy];
  }

  // ---- drawing -----------------------------------------------------------------------------

  bakedRoom() {
    const w = this.world, key = w.state.room + '|' + w.overrideKey();
    if (!this.baked.has(key)) this.baked.set(key, bakeRoom(w.room, (x, y) => w.tileAt(x, y)));
    return this.baked.get(key);
  }

  entityDrawables(fb, cx, cy) {
    const w = this.world, p = w.player, out = [], glow = [];
    for (const e of w.entities) {
      const x = Math.round(e.x) - cx, y = Math.round(e.y) - cy;
      const f = Math.floor(e.anim / 12) % 2;
      switch (e.type) {
        case 'hollow':
          if (e.state === 'dying') out.push({ y: e.y, fn: () => fb.blit(SPRITES.hollow_dead, x - 6, y - 5) });
          else out.push({ y: e.y, fn: () => fb.blit(SPRITES.hollow[e.state === 'circle' ? 0 : f], x - 5, y - 15, { flip: p.x < e.x, color: e.hurtT % 4 >= 2 ? C.BONE : -1 }) });
          break;
        case 'shade': {
          const hide = e.stun > 0 && Math.floor(e.stun / 3) % 2 === 0;
          if (!hide) {
            out.push({ y: e.y, fn: () => fb.blit(SPRITES.shade[f], x - 6, y - 24) });
            glow.push(() => fb.blit(SPRITES.shade_face, x - 2, y - 22, { color: e.stun > 0 ? C.RED : -1 }));
          }
          break;
        }
        case 'penitent':
          if (e.state === 'rising') { if (e.t % 4 < 2 + Math.floor(e.t / 30)) out.push({ y: e.y, fn: () => fb.blit(SPRITES.penitent_rise, x - 6, y - 18) }); }
          else out.push({ y: e.y, fn: () => fb.blit(SPRITES.penitent, x - 6, y - 11) });
          break;
        case 'watcher':
          glow.push(() => fb.blit(SPRITES.watcher, x - 3, y - 22));
          break;
      }
    }
    return { out, glow };
  }

  drawRelicCone(fb, cx, cy) {
    const p = this.world.player, R = p.relic;
    if (!R.active) return;
    const ox = Math.round(p.x) - cx, oy = Math.round(p.y) - 7 - cy;
    const density = Math.max(2, Math.floor((R.active / RELIC.active) * 9));
    const r = RELIC.range;
    for (let y = Math.max(0, oy - r); y < Math.min(H, oy + r); y++) for (let x = Math.max(0, ox - r); x < Math.min(W, ox + r); x++) {
      const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy);
      if (d > r || d < 5) continue;
      let a = Math.atan2(dy, dx) - R.aim;
      a = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
      if (a > RELIC.half) continue;
      const fall = density - Math.floor((d / r) * 4);
      if (BAYER4[(x & 3) + ((y & 3) << 2)] < fall) fb.pset(x, y, d > r - 3 || a > RELIC.half - 0.05 ? C.PALE : C.BONE);
    }
    fb.blit(SPRITES.held_cross, ox + Math.round(Math.cos(R.aim) * 8) - 2, oy + Math.round(Math.sin(R.aim) * 8) - 3);
  }

  drawHud(fb) {
    const s = this.state, p = this.world.player;
    // wounds: shown while hurt, and whenever something hostile is near
    const threat = this.world.entities.some(e => (e.type === 'hollow' || e.type === 'shade') && Math.hypot(e.x - p.x, e.y - p.y) < 120);
    if (this.hurtT > 0 || s.hp < MAX_HP || threat) {
      for (let i = 0; i < MAX_HP; i++) {
        const on = i < s.hp;
        fb.rect(6 + i * 7, 6, 5, 5, on ? (s.hp === 1 && this.t % 40 < 20 ? C.RED : C.BLOOD) : C.INK);
        fb.frame(5 + i * 7, 5, 7, 7, C.BLACK);
      }
    }
    // what is in hand
    const held = this.world.relicItem();
    if (held) {
      const ready = !p.relic.cool && !p.relic.active;
      fb.rect(4, H - 14, 12, 12, C.BLACK); fb.frame(4, H - 14, 12, 12, ready ? C.ASH : C.INK);
      fb.blit(ICONS[ITEMS[held].icon], 6, H - 12, { color: ready ? -1 : C.SLATE });
    }
  }

  drawReticle(fb, input) {
    if (!this.world.relicItem() || this.mouseT >= AIM_IDLE || !input.mouse.inside || this.text.active) return;
    const { x, y } = input.mouse, c = this.world.player.relic.cool ? C.ASH : C.PALE;
    fb.pset(x, y, c);
    for (const k of [2, 3]) { fb.pset(x - k, y, c); fb.pset(x + k, y, c); fb.pset(x, y - k, c); fb.pset(x, y + k, c); }
  }

  render(fb) {
    const w = this.world, room = w.room, p = w.player;
    const [cx, cy] = this.camera();
    fb.copyFrom(this.bakedRoom(), cx, cy);

    const props = w.props();
    const draw = props.filter(pr => pr.sprite && !pr.glow).map(pr => ({ y: pr.baseline, fn: () => fb.blit(spriteFrame(pr.sprite, w.tick, pr.anim || 12), pr.px - cx, pr.py - cy) }));
    const ents = this.entityDrawables(fb, cx, cy);
    draw.push(...ents.out);
    const dir = p.facing === 'left' ? 'right' : p.facing;
    const frame = p.moving ? Math.floor(p.anim / 9) % 4 : 0;
    const blink = p.inv > 0 && p.inv < INVULNERABLE - 10 && Math.floor(p.inv / 4) % 2 === 0;
    if (!blink && !p.dead) draw.push({ y: p.y + 0.5, fn: () => fb.blit(PLAYER[dir][frame], Math.round(p.x) - 4 - cx, Math.round(p.y) - 15 - cy, { flip: p.facing === 'left' }) });
    if (p.dead) draw.push({ y: p.y, fn: () => fb.blit(SPRITES.hollow_dead, Math.round(p.x) - 6 - cx, Math.round(p.y) - 5 - cy, { color: C.ASH }) });
    draw.sort((a, b) => a.y - b.y).forEach(d => d.fn());

    applyLighting(fb, w.lights().map(L => ({ ...L, x: L.x - cx, y: L.y - cy })), room.ambient || 0);

    for (const pr of props) if (pr.glow && pr.sprite) fb.blit(spriteFrame(pr.sprite, w.tick, pr.anim || 12), pr.px - cx, pr.py - cy);
    ents.glow.forEach(fn => fn());
    this.drawRelicCone(fb, cx, cy);

    // what you can interact with: a small key cap over it
    if (!this.text.active && !this.app.busy && !p.relic.active) {
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

    this.drawHud(fb);
    if (this.deathT) fb.dither(0, 0, W, H, C.BLACK, Math.min(16, Math.floor(this.deathT / 4)));
    this.drawReticle(fb, this.app.input);
    this.text.top = Math.round(p.y) - cy > H - 64;
    this.text.render(fb);
  }
}

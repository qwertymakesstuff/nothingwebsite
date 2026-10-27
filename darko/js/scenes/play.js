// The game itself: walking around, using things, room transitions, and running scenes. It is
// also the host for the script runner, carrying out each step a script asks for.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { World, WALK_SPEED, RUN_SPEED } from '../game/world.js';
import { Runner } from '../game/script.js';
import { cond, START } from '../game/state.js';
import { Lighting, ambientFor, activeLights } from '../game/lighting.js';
import { formatDate, formatTime, parseTime, phase } from '../game/calendar.js';
import { ITEMS } from '../game/items.js';
import { NOTES } from '../game/journal.js';
import { TILE } from '../game/tiles.js';
import { overlaps } from '../engine/collision.js';
import { TextBox, ChoiceBox } from '../ui/textbox.js';
import { keyHint } from '../ui/panel.js';
import { PauseScene } from './pause.js';
import { JournalScene } from './journal.js';
import { Card, EndScene } from './end.js';

const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const FADE_SPEED = 4;

export class PlayScene {
  constructor(app, state, { intro = false } = {}) {
    this.app = app;
    this.state = state;
    this.opaque = true;
    this.world = new World(state);
    if (state.fresh) { this.world.enter(START.room, START.spawn); state.fresh = false; }
    else this.world.restore(state.room, state.x, state.y, state.facing);
    this.textbox = new TextBox(app);
    this.lighting = new Lighting();
    this.runner = null;
    this.trans = null;
    this.fade = 1; this.fadeTarget = 0;
    this.toasts = [];
    this.shakeAmt = 0; this.shakeT = 0;
    this.goal = null; this.hover = null; this.focus = null;
    this.roomLabelT = 2.5;
    this.stepAcc = 0;
    this.safe = { x: this.world.player.x, y: this.world.player.y };
    this.cam = { x: 0, y: 0 };
    this.snapCamera();
    if (intro) this.start('intro');
    else this.checkOnEnter();
  }

  get busy() { return !!this.runner || !!this.trans; }

  enter() { this.updateAmbience(); }
  resume() { this.updateAmbience(); }
  onBlur() { if (this.app.top === this) this.app.push(new PauseScene(this.app, this)); }

  start(script) {
    this.goal = null;
    this.world.player.moving = false;
    this.runner = new Runner(script, this, typeof script === 'string' ? script : null);
  }

  toast(text) { this.toasts.push({ text, t: 0 }); }

  autosave() { this.world.sync(); this.app.store.save('auto', this.state.toSave()); }

  shake(amt, secs) { this.shakeAmt = amt; this.shakeT = secs; }

  view() {
    return { t: this.world.t, state: this.state, phase: phase(this.state.time), flash: this.app.settings.reduceFlashing };
  }

  updateAmbience() {
    const room = this.world.room;
    const ph = phase(this.state.time);
    const name = room.outside ? (ph === 'night' ? 'night' : 'dusk') : (room.ambience || 'house');
    this.app.audio.ambience(name);
  }

  // ---- runner host -------------------------------------------------------------------------

  exec(op, args, runner) {
    const s = this.state, w = this.world, a = this.app.audio;
    switch (op) {
      case 'say': return this.textbox.open(args[0], args[1]);
      case 'choice': {
        const opts = args[0];
        return new ChoiceBox(this.app, opts.map(o => o[0]), i => runner.push(opts[i][1]));
      }
      case 'set': s.set(args[0]); w.refresh(); return null;
      case 'unset': s.unset(args[0]); w.refresh(); return null;
      case 'give': if (s.give(args[0])) { a.sfx('pickup'); this.toast(`Got: ${ITEMS[args[0]]?.name || args[0]}`); } return null;
      case 'take': s.take(args[0]); return null;
      case 'note': if (s.addNote(args[0])) { a.sfx('note'); this.toast(`Journal: ${NOTES[args[0]]?.title || args[0]}`); } return null;
      case 'obj': s.objective = args[0]; this.toast(args[0]); return null;
      case 'go': return this.transition(args[0], args[1]);
      case 'place': w.placePlayer(args[1], args[2], args[3]); this.snapCamera(); this.safe = { x: w.player.x, y: w.player.y }; return null;
      case 'walk': {
        const e = w.startWalk(args[0], args[1], args[2], args[3]);
        return e ? { update: () => !e.walk } : null;
      }
      case 'face': { const e = w.entity(args[0]); if (e) e.facing = args[1]; w.sync(); return null; }
      case 'time': s.time = parseTime(args[0]); this.updateAmbience(); return null;
      case 'wait': { let t = args[0]; return { update: dt => (t -= dt) <= 0 }; }
      case 'fadeOut': this.fadeTarget = 1; return { update: () => this.fade >= 1 };
      case 'fadeIn': this.fadeTarget = 0; return { update: () => this.fade <= 0 };
      case 'card': return new Card(args[0], args[1]);
      case 'sfx': a.sfx(args[0]); return null;
      case 'shake': this.shake(args[0], args[1]); return null;
      case 'save': this.autosave(); return null;
      case 'call': args[0](s, this); w.refresh(); return null;
      case 'amb': a.ambience(args[0]); return null;
      case 'end': this.app.replace(new EndScene(this.app)); return { update: () => false };
      default:
        console.warn(`unknown script step: ${op}`);
        return null;
    }
  }

  transition(room, spawn) {
    this.goal = null;
    this.fadeTarget = 1;
    let entered = false;
    return {
      update: () => {
        if (!entered && this.fade >= 1) {
          this.world.enter(room, spawn);
          this.safe = { x: this.world.player.x, y: this.world.player.y };
          this.snapCamera();
          this.updateAmbience();
          this.roomLabelT = 2.5;
          this.fadeTarget = 0;
          entered = true;
        }
        return entered && this.fade <= 0;
      },
    };
  }

  checkOnEnter() {
    if (this.runner) return;
    for (const e of this.world.room.onEnter) {
      if (cond(this.state, e.when)) { this.start(e.script); return; }
    }
  }

  // ---- play --------------------------------------------------------------------------------

  interact(t) {
    const p = this.world.player;
    if (t.kind === 'npc') {
      const n = t.ref;
      if (n.pose !== 'sit' && n.pose !== 'blower') n.facing = { up: 'down', down: 'up', left: 'right', right: 'left' }[p.facing];
    }
    const def = t.ref.def || t.ref;
    let id = def.script;
    if (def.again && this.state.has(`seen:${def.script}`)) id = def.again;
    this.state.set(`seen:${def.script}`);
    this.start(id);
  }

  // can the player use this thing from where they stand, if they turn to face it?
  inReach(t) {
    const w = this.world, p = w.player;
    const r = w.reachRect(t);
    const was = p.facing;
    w.face(r.x + r.w / 2 - p.x, Math.max(r.y, Math.min(p.y - 3, r.y + r.h)) - p.y);
    const ok = overlaps(w.probeBox(), r);
    if (!ok) p.facing = was;
    w.sync();
    return ok;
  }

  update(dt, input) {
    const s = this.state, w = this.world, p = w.player;
    s.playtime += dt;
    this.fade = approach(this.fade, this.fadeTarget, dt * FADE_SPEED);
    w.update(dt);
    this.shakeT -= dt;
    this.roomLabelT -= dt;
    if (this.toasts.length) { this.toasts[0].t += dt; if (this.toasts[0].t > 2.6) this.toasts.shift(); }
    this.updateCamera(dt);

    if (input.pressed('pause')) { this.app.audio.sfx('back'); input.consume(); this.app.push(new PauseScene(this.app, this)); return; }

    if (this.trans) {
      if (this.trans.update(dt, input)) { this.trans = null; this.autosave(); this.checkOnEnter(); }
      return;
    }
    if (this.runner) {
      this.runner.update(dt, input);
      if (this.runner?.done) {
        this.runner = null;
        w.refresh();
        this.updateAmbience();
        this.safe = { x: p.x, y: p.y };
        this.checkOnEnter();
      }
      return;
    }

    if (input.pressed('journal')) { this.app.audio.sfx('select'); input.consume(); this.app.push(new JournalScene(this.app, this)); return; }

    // movement: keys first, then a click-to-walk goal
    let { dx, dy } = input.axis();
    if (dx || dy) this.goal = null;
    else if (this.goal) {
      const g = this.goal;
      if (g.target && this.inReach(g.target)) { const t = g.target; this.goal = null; p.moving = false; this.interact(t); return; }
      const gx = g.x - p.x, gy = g.y - p.y;
      if (Math.hypot(gx, gy) < 2) { this.goal = null; }
      else { dx = gx; dy = gy; }
    }
    p.moving = false;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const speed = input.held('run') ? RUN_SPEED : WALK_SPEED;
      w.face(dx, dy);
      const moved = w.move(dx / len * speed * dt, dy / len * speed * dt);
      p.moving = moved > 0.05;
      if (this.goal) {
        this.goal.stuck = moved < speed * dt * 0.3 ? (this.goal.stuck || 0) + dt : 0;
        if (this.goal.stuck > 0.3) this.goal = null;
      }
      this.stepAcc += moved;
      if (this.stepAcc > 13) { this.stepAcc = 0; this.app.audio.sfx(w.room.outside ? 'stepOut' : 'step'); }
    }

    // exits
    const e = w.exitAt();
    if (e) {
      const blocked = !e.to || (e.blockWhen !== undefined && cond(s, e.blockWhen));
      if (blocked) {
        p.x = this.safe.x; p.y = this.safe.y; w.sync();
        this.goal = null;
        if (e.script) this.start(e.script);
        return;
      }
      this.trans = this.transition(e.to, e.spawn);
      if (e.y < 1.5 || e.y > w.room.h - 1.5) this.app.audio.sfx(w.room.id === 'living' && e.to === 'yard' ? 'door' : 'step');
      return;
    }
    this.safe = { x: p.x, y: p.y };

    // using things
    this.focus = w.target();
    const m = input.mouse;
    this.hover = m.inside ? w.hit(m.x + this.cam.x, m.y + this.cam.y) : null;
    if (m.clicked) {
      if (this.hover) {
        if (this.inReach(this.hover)) { this.interact(this.hover); return; }
        this.goal = { ...w.approachPoint(this.hover), target: this.hover };
      } else {
        this.goal = { x: m.x + this.cam.x, y: m.y + this.cam.y };
      }
    }
    if (input.pressed('interact') && this.focus) this.interact(this.focus);
  }

  // ---- camera and drawing ------------------------------------------------------------------

  camTarget() {
    const room = this.world.room, p = this.world.player;
    const rw = room.w * TILE, rh = room.h * TILE;
    const x = rw <= W ? -(W - rw) / 2 : Math.max(0, Math.min(rw - W, p.x - W / 2));
    const y = rh <= H ? -(H - rh) / 2 : Math.max(0, Math.min(rh - H, p.y - 10 - H / 2));
    return { x, y };
  }

  snapCamera() { this.cam = this.camTarget(); }

  updateCamera(dt) {
    const t = this.camTarget();
    const k = Math.min(1, dt * 8);
    this.cam.x += (t.x - this.cam.x) * k;
    this.cam.y += (t.y - this.cam.y) * k;
    if (Math.abs(t.x - this.cam.x) < 0.5) this.cam.x = t.x;
    if (Math.abs(t.y - this.cam.y) < 0.5) this.cam.y = t.y;
  }

  draw(g) {
    const st = this.app.settings, w = this.world;
    g.clear(C.black);
    let sx = 0, sy = 0;
    if (this.shakeT > 0 && st.shake !== 'off') {
      const amt = this.shakeAmt * (st.shake === 'reduced' ? 0.35 : 1);
      sx = Math.round((Math.random() * 2 - 1) * amt); sy = Math.round((Math.random() * 2 - 1) * amt);
    }
    const cx = Math.round(this.cam.x) + sx, cy = Math.round(this.cam.y) + sy;
    const v = this.view();
    g.translate(-cx, -cy, () => w.draw(g, v));
    this.lighting.draw(g, ambientFor(w.room, this.state), activeLights(w.room, this.state, w.t, st.reduceFlashing), cx, cy);

    if (!this.busy) {
      // what you'd use: a small marker above it, and a hint at the bottom
      const mark = this.hover || this.focus;
      if (mark) {
        const r = w.reachRect(mark);
        const top = mark.kind === 'npc' ? r.y : mark.ref.y;
        const bob = Math.floor(w.t * 3) % 2;
        g.text('▼', r.x + r.w / 2 - cx - 2, top - 10 - bob - cy, mark === this.focus ? C.bone : C.fog);
      }
      if (this.focus) keyHint(g, 'E', this.focus.label, W / 2, H - 12, 'center');
      else if (this.hover) g.text(this.hover.label, W / 2, H - 12, C.fog, { align: 'center', shadow: C.black });
    }
    this.drawHud(g);
    if (this.fade > 0) g.alpha(this.fade, () => g.rect(0, 0, W, H, C.black));
    this.runner?.draw(g);
    this.drawToast(g);
  }

  drawHud(g) {
    const s = this.state;
    const label = `${formatDate(s.day)}  ${formatTime(s.time)}`;
    g.alpha(0.7, () => g.rect(2, 2, g.textWidth(label) + 8, 12, C.black));
    g.text(label, 6, 4, C.mist);
    if (this.roomLabelT > 0) {
      const a = Math.min(1, this.roomLabelT);
      g.alpha(a, () => g.text(this.world.room.name.toUpperCase(), W - 6, 4, C.fog, { align: 'right', shadow: C.black }));
    }
    if (s.playtime < 25 && !this.busy) g.text('J journal   Esc pause', W - 6, H - 12, C.grey, { align: 'right' });
  }

  drawToast(g) {
    const t = this.toasts[0];
    if (!t) return;
    const a = Math.min(1, t.t * 4, (2.6 - t.t) * 3);
    const w = g.textWidth(t.text) + 12;
    g.alpha(a, () => {
      g.rect(W / 2 - w / 2, 17, w, 12, C.ink);
      g.box(W / 2 - w / 2, 17, w, 12, C.dusk);
      g.text(t.text, W / 2, 19, C.lamp, { align: 'center' });
    });
  }
}

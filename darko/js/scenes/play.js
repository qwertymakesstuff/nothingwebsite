// The game itself: walking around, using things, room transitions, and running scenes. It is
// also the host for the script runner, carrying out each step a script asks for.

import { W, H } from '../engine/gfx.js';
import { C } from '../game/palette.js';
import { World, WALK_SPEED, RUN_SPEED } from '../game/world.js';
import { Runner } from '../game/script.js';
import { cond, START } from '../game/state.js';
import { beatById, nextBeat, countdown, formatCountdown } from '../game/timeline.js';
import { Lighting, ambientFor, activeLights } from '../game/lighting.js';
import { formatDate, formatTime, parseTime, phase } from '../game/calendar.js';
import { ITEMS } from '../game/items.js';
import { NOTES } from '../game/journal.js';
import { TILE } from '../game/tiles.js';
import { overlaps } from '../engine/collision.js';
import { TextBox, ChoiceBox } from '../ui/textbox.js';
import { drawFrank } from '../game/art.js';
import { keyHint } from '../ui/panel.js';
import { PauseScene } from './pause.js';
import { JournalScene } from './journal.js';
import { Card, EndScene, CreditsRoll } from './end.js';
import { DocReader } from './reader.js';

const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const FADE_SPEED = 4;
// while the player explores, one in-game minute passes every three seconds
const CLOCK_RATE = 1 / 3;

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
    this.fx = { wobble: 0, wobbleT: 0, flash: 0, dust: 0, particles: [], rewind: 0 };
    this.snapCamera();
    // a save from inside the epilogue has nothing to walk around in: replay it
    if (intro || this.beat.last) this.start(beatById(state.beat).start);
    else if (!this.checkBeat()) this.checkOnEnter();
  }

  get beat() { return beatById(this.state.beat); }

  // move on to the next beat once this one's done flag is set; true if a new beat started
  checkBeat() {
    const b = this.beat;
    if (b.last || !this.state.has(b.done)) return false;
    const nb = nextBeat(b.id);
    if (!nb) return false;
    Object.assign(this.state, { beat: nb.id, day: nb.day, time: parseTime(nb.time), objective: '' });
    this.state.unset('flashlight');
    this.world.refresh();
    this.start(nb.start);
    return true;
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

  // days left on the countdown, or Infinity before Frank and after the end
  daysLeft() {
    const s = this.state;
    if (!s.has('countdown') || s.beat === 'tangent') return Infinity;
    return countdown(s.day, s.time).total / 86400;
  }

  updateAmbience() {
    const room = this.world.room, s = this.state;
    const ph = phase(s.time);
    const partying = (s.beat === 'oct30' || (s.beat === 'oct29' && s.has('party_on'))) && ['living', 'kitchen', 'backyard', 'hall', 'parents_room', 'bathroom'].includes(room.id);
    let name = room.outside ? (ph === 'night' ? 'night' : 'dusk') : (room.ambience || 'house');
    if (room.outside && this.daysLeft() < 6) name = 'storm';
    if (partying) name = 'party';
    if (s.has('portal_sound')) name = 'portal';
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
      case 'end': this.app.replace(new EndScene(this.app, args[0])); return { update: () => false };
      case 'sleep': s.set(this.beat.done); return null;
      case 'wobble': this.fx.wobble = args[0]; this.fx.wobbleT = args[1] ?? 1e9; return null;
      case 'flash': if (!this.app.settings.reduceFlashing) this.fx.flash = 1; return null;
      case 'dust': this.fx.dust = args[0]; return null;
      case 'follow': { const e = w.entity(args[0]); if (e) e.follow = args[1] !== false; return null; }
      case 'rewind': return this.rewind(args[0], args[1], parseTime(args[2]));
      case 'read': return new DocReader(this.app, args[0], s);
      case 'credits': this.app.replace(new CreditsRoll(this.app)); return { update: () => false };
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

  // the end of the tangent: the picture tears and the calendar runs backward to a day and time
  rewind(secs, day, time) {
    const from = s => s.day * 1440 + s.time;
    const a = from(this.state), b = day * 1440 + time;
    let t = 0;
    this.fx.rewind = 1;
    this.app.audio.sfx('rewind');
    return {
      update: dt => {
        t += dt;
        const k = Math.min(1, t / secs), now = a + (b - a) * (k * k);
        this.state.day = Math.floor(now / 1440); this.state.time = now - this.state.day * 1440;
        if (k >= 1) { this.fx.rewind = 0; return true; }
        return false;
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
    this.tickEffects(dt);
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
        if (!this.checkBeat()) this.checkOnEnter();
      }
      return;
    }

    // the clock creeps on while you explore, but never past the current beat
    const until = this.beat.until ? parseTime(this.beat.until) : null;
    if (until !== null && s.time < until) {
      const before = phase(s.time);
      s.time = Math.min(until, s.time + dt * CLOCK_RATE);
      if (phase(s.time) !== before) { this.updateAmbience(); w.refresh(); }
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
    if (e && e.trigger) {
      s.set(e.once);
      this.goal = null;
      p.moving = false;
      this.start(e.script);
      return;
    }
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
    const lights = activeLights(w.room, this.state, w.t, st.reduceFlashing);
    if (this.state.has('flashlight')) {
      // a flashlight beam: a pool of light a little ahead of Donnie
      const p = w.player, d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing];
      lights.push({ x: p.x + d[0] * 28, y: p.y - 6 + d[1] * 28, r: 42, i: 0.9 }, { x: p.x, y: p.y - 6, r: 20, i: 0.4 });
    }
    this.lighting.draw(g, ambientFor(w.room, this.state), lights, cx, cy);
    this.drawEffects(g);

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

  tickEffects(dt) {
    const fx = this.fx;
    fx.flash = Math.max(0, fx.flash - dt * 2.5);
    fx.wobbleT -= dt;
    if (fx.wobbleT <= 0) fx.wobble = 0;
    if (fx.dust > 0) {
      fx.dust -= dt;
      for (let i = 0; i < 3; i++) fx.particles.push({ x: Math.random() * W, y: -2, vy: 40 + Math.random() * 60, c: Math.random() < 0.7 ? C.bone : C.cream });
    }
    for (const q of fx.particles) q.y += q.vy * dt;
    fx.particles = fx.particles.filter(q => q.y < H);
  }

  drawEffects(g) {
    const fx = this.fx, st = this.app.settings, t = this.world.t;
    // the last week: outside, the sky closes in; inside, something stands at the edge of the frame
    const left = this.daysLeft();
    if (left < 8 && this.world.room.outside) {
      const k = Math.min(1, (8 - left) / 8);
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 97 - t * (3 + i)) % (W + 120) + W + 120) % (W + 120) - 60;
        g.dither(cx, i * 8, 90 + i * 16, 8 + k * 10, '#1a1826', 0.3 + k * 0.4);
      }
    }
    if (left < 5 && !this.busy && !st.reduceFlashing && Math.sin(t * 0.37) > 0.995 && !this.world.room.outside) {
      g.alpha(0.35, () => drawFrank(g, W - 18, H - 30, 'left', t, true));
    }
    for (const q of fx.particles) g.rect(q.x, q.y, 1, 2, q.c);
    if (fx.rewind) {
      // tape tracking: torn bands of the picture racing sideways, with snow
      const src = g.ctx.canvas;
      for (let y = 0; y < H; y += 6) {
        const dx = Math.round(Math.sin(y * 0.3 + t * 30) * 12);
        g.ctx.drawImage(src, 0, y, W, 6, dx, y, W, 6);
      }
      for (let i = 0; i < 160; i++) g.px((i * 53 + Math.floor(t * 900)) % W, (i * 31 + Math.floor(t * 700)) % H, i % 2 ? C.white : C.grey);
      g.alpha(0.5, () => g.rect(0, (t * 140) % H, W, 6, C.white));
    }
    if (fx.wobble > 0) {
      // the picture bends: each band of rows slides sideways a little
      const amt = fx.wobble * (st.reduceFlashing ? 0.4 : 1), t = this.world.t;
      const src = g.ctx.canvas;
      for (let y = 0; y < H; y += 3) {
        const dx = Math.round(Math.sin(y * 0.09 + t * 4) * amt);
        if (dx) g.ctx.drawImage(src, 0, y, W, 3, dx, y, W, 3);
      }
    }
    if (fx.flash > 0) g.alpha(fx.flash, () => g.rect(0, 0, W, H, C.white));
  }

  drawHud(g) {
    const s = this.state;
    const label = `${formatDate(s.day)}  ${formatTime(s.time)}`;
    g.alpha(0.7, () => g.rect(2, 2, g.textWidth(label) + 8, 12, C.black));
    g.text(label, 6, 4, C.mist);
    if (s.has('countdown') && s.beat !== 'tangent') {
      // the numbers on his arm, counting down
      const c = countdown(s.day, s.time), txt = formatCountdown(c);
      const urgent = c.d < 3 && !this.app.settings.reduceFlashing;
      g.alpha(0.7, () => g.rect(2, 15, g.textWidth(txt) + 8, 11, C.black));
      g.text(txt, 6, 16, urgent && Math.floor(this.world.t * 2) % 2 ? C.white : C.red);
    }
    if (this.roomLabelT > 0) {
      const a = Math.min(1, this.roomLabelT);
      g.alpha(a, () => g.text(this.world.room.name.toUpperCase(), W - 6, 4, C.fog, { align: 'right', shadow: C.black }));
    }
    if (s.playtime < 25 && !this.busy && !this.focus && !this.hover) g.text('J journal   Esc pause', W - 6, H - 12, C.grey, { align: 'right' });
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

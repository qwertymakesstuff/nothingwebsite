// The playable world: the current room, the player, collision, exits, triggers and
// interactions. Pure logic driven by an intent object ({ dx, dy, interact }), so the game can
// be stepped headlessly in tests; the play scene turns the events it returns into presentation.

import { ROOMS } from './rooms.js';
import { TILES, isSolidChar } from './tiles.js';
import { SPRITES } from './art.js';
import { TILE, PLAYER_SPEED, STEP_EVERY, INTERACT_COOLDOWN, hash } from './config.js';
import { overlaps, moveBox, center } from '../engine/collision.js';
import { conditionHolds, runVariant, runScript } from './script.js';

const FACE_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const playerBox = (x, y) => ({ x: x - 3, y: y - 3, w: 6, h: 3 });

export function probeBox(x, y, facing) {
  switch (facing) {
    case 'up': return { x: x - 4, y: y - 16, w: 8, h: 14 };
    case 'down': return { x: x - 4, y: y - 3, w: 8, h: 11 };
    case 'left': return { x: x - 13, y: y - 10, w: 11, h: 12 };
    default: return { x: x + 2, y: y - 10, w: 11, h: 12 };
  }
}

const tileRect = (r, room) => ({ ...r, x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE, room });

function spriteSize(name) {
  const s = SPRITES[name];
  const f = Array.isArray(s) ? s[0] : s;
  return f ? { w: f.w, h: f.h } : { w: TILE, h: TILE };
}

export class World {
  constructor(state, rooms = ROOMS) {
    this.state = state;
    this.rooms = rooms;
    this.player = { x: 0, y: 0, facing: 'down', moving: false, anim: 0, stepT: 0 };
    this.tick = 0;
    this.exitArmed = false;
    this.inTriggers = new Set();
    this.cooldown = 0;
  }

  get room() { return this.rooms[this.state.room]; }
  get roomW() { return this.room.map[0].length * TILE; }
  get roomH() { return this.room.map.length * TILE; }

  // ---- entering rooms --------------------------------------------------------------------

  enter(roomId, spawn) {
    const room = this.rooms[roomId];
    if (!room) throw new Error(`no room "${roomId}"`);
    this.state.room = roomId;
    const p = this.player;
    if (typeof spawn === 'string' || spawn == null) {
      const sp = room.spawns[spawn] || Object.values(room.spawns)[0];
      p.x = sp[0] * TILE; p.y = sp[1] * TILE; p.facing = sp[2] || 'down';
    } else {
      p.x = spawn.x; p.y = spawn.y; p.facing = spawn.facing || 'down';
    }
    p.moving = false; p.anim = 0; p.stepT = STEP_EVERY - 4;
    const first = !this.state.visited.has(roomId);
    this.state.visited.add(roomId);
    const events = [{ type: 'enter', room: roomId, first }];
    for (const e of room.onEnter || []) {
      if (e.once && this.state.flags.has('entered:' + e.id)) continue;
      if (!conditionHolds(e.when, this.state, null)) continue;
      if (e.once) this.state.flags.add('entered:' + e.id);
      const res = runVariant(e, this.state, null);
      if (res.lines.length || res.sfx || res.flash) events.push({ type: 'say', id: e.id, ...res });
    }
    const box = playerBox(p.x, p.y);
    this.exitArmed = !this.exitAt(box);
    this.inTriggers = new Set(this.triggers().filter(t => overlaps(box, t)).map(t => t.id));
    this.cooldown = INTERACT_COOLDOWN;
    return events;
  }

  // ---- room geometry ---------------------------------------------------------------------

  tileAt(tx, ty) {
    const m = this.room.map;
    return ty >= 0 && ty < m.length && tx >= 0 && tx < m[0].length ? m[ty][tx] : undefined;
  }

  surfaceAt(x, y) {
    const t = TILES[this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE))];
    return (t && t.surface) || 'dirt';
  }

  // props with their flag-dependent variant applied, in pixel space
  props() {
    const out = [];
    for (const base of this.room.props || []) {
      if (base.when && !conditionHolds(base.when, this.state, base.id)) continue;
      let p = base;
      for (const alt of base.alt || []) if (conditionHolds(alt.when, this.state, base.id)) { p = { ...base, ...alt }; break; }
      const size = p.sprite ? spriteSize(p.sprite) : { w: (p.w || 1) * TILE, h: (p.h || 1) * TILE };
      const x = p.x * TILE, y = p.y * TILE;
      const z = p.zone || [-2, -2, size.w + 4, size.h + 4];
      out.push({
        ...p, px: x, py: y, w: size.w, h: size.h,
        solidRect: p.solid ? { x: x + p.solid[0], y: y + p.solid[1], w: p.solid[2], h: p.solid[3] } : null,
        zoneRect: { x: x + z[0], y: y + z[1], w: z[2], h: z[3] },
        baseline: y + size.h,
      });
    }
    return out;
  }

  exits() { return (this.room.exits || []).map(e => tileRect(e, this.state.room)); }
  triggers() { return (this.room.triggers || []).map(t => tileRect(t, this.state.room)); }

  exitAt(box) { return this.exits().find(e => overlaps(box, e)) || null; }

  blocked(box, props = this.props()) {
    if (box.x < 0 || box.y < 0 || box.x + box.w > this.roomW || box.y + box.h > this.roomH) return true;
    const x0 = Math.floor(box.x / TILE), y0 = Math.floor(box.y / TILE);
    const x1 = Math.floor((box.x + box.w - 0.001) / TILE), y1 = Math.floor((box.y + box.h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidChar(this.tileAt(tx, ty))) return true;
    for (const p of props) if (p.solidRect && overlaps(box, p.solidRect)) return true;
    return false;
  }

  // the interactable the player is facing, if any
  target() {
    const p = this.player;
    const probe = probeBox(p.x, p.y, p.facing);
    let best = null, bestD = Infinity;
    for (const pr of this.props()) {
      if (!pr.script || !overlaps(probe, pr.zoneRect)) continue;
      const c = center(pr.zoneRect);
      const d = (c.x - p.x) ** 2 + (c.y - (p.y - 6)) ** 2;
      if (d < bestD) { best = pr; bestD = d; }
    }
    return best;
  }

  // light sources in room coordinates
  lights() {
    const p = this.player, [fx, fy] = FACE_VEC[p.facing];
    const out = [{ x: p.x + fx * 10, y: p.y - 7 + fy * 8, r: this.room.light || 48, i: 1 }];
    const step = Math.floor(this.tick / 6);
    for (const pr of this.props()) if (pr.light) {
      const L = pr.light;
      const jitter = L.flicker ? Math.floor(hash(step, 0, pr.px) * 4) - 1 : 0;
      out.push({ x: pr.px + (L.dx || 0), y: pr.py + (L.dy || 0), r: L.r + jitter, i: L.i || 1 });
    }
    return out;
  }

  // ---- the tick --------------------------------------------------------------------------

  update(intent = {}) {
    const events = [];
    const p = this.player, s = this.state;
    this.tick++; s.playtime++;
    if (this.cooldown > 0) this.cooldown--;

    let dx = Math.sign(intent.dx || 0), dy = Math.sign(intent.dy || 0);
    if (dx || dy) {
      if (dx && dy) {
        const keep = (p.facing === 'left' && dx < 0) || (p.facing === 'right' && dx > 0) || (p.facing === 'up' && dy < 0) || (p.facing === 'down' && dy > 0);
        if (!keep) p.facing = dx < 0 ? 'left' : 'right';
      } else p.facing = dx ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      const k = dx && dy ? Math.SQRT1_2 : 1;
      const props = this.props();
      const box = playerBox(p.x, p.y);
      const moved = moveBox(box, dx * PLAYER_SPEED * k, dy * PLAYER_SPEED * k, b => this.blocked(b, props));
      const did = moved.x !== box.x || moved.y !== box.y;
      p.x = moved.x + 3; p.y = moved.y + 3;
      p.moving = did;
      if (did) {
        p.anim++;
        if (++p.stepT >= STEP_EVERY) { p.stepT = 0; events.push({ type: 'step', surface: this.surfaceAt(p.x, p.y - 1) }); }
      }
    } else { p.moving = false; p.anim = 0; p.stepT = STEP_EVERY - 4; }

    const box = playerBox(p.x, p.y);

    // exits fire on walking into them; you have to leave one before it can fire again
    const ex = this.exitAt(box);
    if (!ex) this.exitArmed = true;
    else if (this.exitArmed) {
      this.exitArmed = false;
      if (ex.lockedUnless && !s.flags.has(ex.lockedUnless)) {
        const res = runScript(ex.locked || [{ say: ['Locked.'] }], s, 'exit:' + ex.to);
        events.push({ type: 'say', ...res, sfx: res.sfx || 'locked' });
      } else events.push({ type: 'exit', exit: ex });
    }

    for (const t of this.triggers()) {
      const inside = overlaps(box, t);
      if (inside && !this.inTriggers.has(t.id)) {
        this.inTriggers.add(t.id);
        if (t.once && s.flags.has('fired:' + t.id)) continue;
        if (!conditionHolds(t.when, s, t.id)) continue;
        s.flags.add('fired:' + t.id);
        const res = runScript(t.script, s, t.id);
        if (res) events.push({ type: 'say', id: t.id, ...res });
      } else if (!inside) this.inTriggers.delete(t.id);
    }

    if (intent.interact && this.cooldown === 0) {
      const tg = this.target();
      if (tg) {
        const res = runScript(tg.script, s, tg.id);
        if (res) { events.push({ type: 'interact', id: tg.id, ...res }); this.cooldown = INTERACT_COOLDOWN; }
      }
    }
    return events;
  }
}

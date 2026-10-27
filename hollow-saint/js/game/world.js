// The playable world: the current room, the player, collision, exits, triggers, interactions,
// the relic and everything that moves. Pure logic driven by an intent object
//   { dx, dy, interact, relic, aim }   (aim: an angle in radians, or null to use facing)
// so the game can be stepped headlessly in tests; the play scene turns the events it returns
// into sound, text and transitions.

import { ROOMS } from './rooms/index.js';
import { TILES, isSolidChar } from './tiles.js';
import { SPRITES } from './art.js';
import { ITEMS } from './items.js';
import { TILE, PLAYER_SPEED, STEP_EVERY, INTERACT_COOLDOWN, hash } from './config.js';
import { overlaps, moveBox, center } from '../engine/collision.js';
import { conditionHolds, runVariant, runScript } from './script.js';
import { MAX_HP } from './state.js';
import { RELIC, TYPES, spawnEntity, updateEntity, relicHits, inCone, hitBox, entityBox, hearsTape } from './entities.js';

const FACE_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const FACE_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
export const INVULNERABLE = 90;

export const playerBox = (x, y) => ({ x: x - 3, y: y - 3, w: 6, h: 3 });
export const playerHitBox = (x, y) => ({ x: x - 3, y: y - 12, w: 6, h: 12 });

export function probeBox(x, y, facing) {
  switch (facing) {
    case 'up': return { x: x - 4, y: y - 16, w: 8, h: 14 };
    case 'down': return { x: x - 4, y: y - 3, w: 8, h: 11 };
    case 'left': return { x: x - 13, y: y - 10, w: 11, h: 12 };
    default: return { x: x + 2, y: y - 10, w: 11, h: 12 };
  }
}

export function facingFromAngle(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return Math.abs(c) >= Math.abs(s) ? (c >= 0 ? 'right' : 'left') : (s >= 0 ? 'down' : 'up');
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
    this.player = { x: 0, y: 0, facing: 'down', moving: false, anim: 0, stepT: 0, inv: 0, dead: false, relic: { active: 0, cool: 0, aim: 0, hit: new Set() } };
    this.tick = 0;
    this.exitArmed = false;
    this.inTriggers = new Set();
    this.cooldown = 0;
    this.entities = [];
    this.deniedT = 0;
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
    p.relic.active = 0; p.relic.cool = 0;
    const first = !this.state.visited.has(roomId);
    this.state.visited.add(roomId);
    const events = [{ type: 'enter', room: roomId, first }];
    for (const e of room.onEnter || []) {
      if (e.once && this.state.flags.has('entered:' + e.id)) continue;
      if (!conditionHolds(e.when, this.state, null)) continue;
      if (e.once) this.state.flags.add('entered:' + e.id);
      const res = runVariant(e, this.state, null);
      if (res.lines.length || res.sfx || res.flash || res.talk) events.push({ type: 'say', id: e.id, ...res });
    }
    this.entities = (room.entities || [])
      .filter(s => !this.state.flags.has('dead:' + s.id) && conditionHolds(s.when, this.state, null))
      .map(s => spawnEntity({ ...s, x: s.x * TILE, y: s.y * TILE }));
    const box = playerBox(p.x, p.y);
    this.exitArmed = !this.exitAt(box);
    this.inTriggers = new Set(this.triggers().filter(t => overlaps(box, t)).map(t => t.id));
    this.cooldown = INTERACT_COOLDOWN;
    return events;
  }

  // ---- room geometry ---------------------------------------------------------------------

  // tile changes that depend on story flags (an unchained gate, a cleared doorway)
  activeOverrides() {
    return (this.room.overrides || []).filter(o => conditionHolds(o.when, this.state, null));
  }

  overrideKey() { return this.activeOverrides().map(o => (this.room.overrides.indexOf(o))).join(','); }

  tileAt(tx, ty) {
    const m = this.room.map;
    if (!(ty >= 0 && ty < m.length && tx >= 0 && tx < m[0].length)) return undefined;
    for (const o of this.room.overrides || []) {
      if (tx >= o.x && tx < o.x + (o.w || 1) && ty >= o.y && ty < o.y + (o.h || 1) && conditionHolds(o.when, this.state, null)) return o.ch;
    }
    return m[ty][tx];
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
        baseline: y + size.h + (p.sortOffset || 0),
      });
    }
    // where defeated things fell, in this room
    for (const [id, r] of Object.entries(this.state.remains)) {
      if (r.room === this.state.room) out.push({ id: 'remains:' + id, sprite: 'ash', px: r.x - 6, py: r.y - 4, w: 12, h: 5, zoneRect: { x: 0, y: 0, w: 0, h: 0 }, baseline: r.y - 4 });
    }
    return out;
  }

  exits() { return (this.room.exits || []).map(e => tileRect(e, this.state.room)); }
  triggers() { return (this.room.triggers || []).map(t => tileRect(t, this.state.room)); }

  exitAt(box) { return this.exits().find(e => overlaps(box, e)) || null; }

  blocked(box, props = this.props(), solidEntities = true) {
    if (box.x < 0 || box.y < 0 || box.x + box.w > this.roomW || box.y + box.h > this.roomH) return true;
    const x0 = Math.floor(box.x / TILE), y0 = Math.floor(box.y / TILE);
    const x1 = Math.floor((box.x + box.w - 0.001) / TILE), y1 = Math.floor((box.y + box.h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidChar(this.tileAt(tx, ty))) return true;
    for (const p of props) if (p.solidRect && overlaps(box, p.solidRect)) return true;
    if (solidEntities) for (const e of this.entities) if (TYPES[e.type].solid && overlaps(box, { x: e.x - 6, y: e.y - 4, w: 12, h: 5 })) return true;
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
    // a kneeling figure can be looked at too
    for (const e of this.entities) {
      if (e.type !== 'penitent') continue;
      const z = { x: e.x - 8, y: e.y - 14, w: 16, h: 18 };
      if (!overlaps(probe, z)) continue;
      const d = (e.x - p.x) ** 2 + (e.y - 6 - (p.y - 6)) ** 2;
      if (d < bestD) { best = { id: 'penitent', px: e.x - 5, py: e.y - 12, zoneRect: z, script: PENITENT_SCRIPT }; bestD = d; }
    }
    return best;
  }

  relicItem() { const id = this.state.equipped; return id && ITEMS[id]?.relic ? id : null; }

  // which way the player is looking: the aim if a relic is in hand, else where they face
  viewAngle(aim = null) {
    if (this.player.relic.active) return this.player.relic.aim;
    return aim ?? FACE_ANGLE[this.player.facing];
  }

  // light sources in room coordinates
  lights() {
    const p = this.player, [fx, fy] = FACE_VEC[p.facing];
    const out = [{ x: p.x + fx * 10, y: p.y - 7 + fy * 8, r: this.room.light || 48, i: 1 }];
    if (p.relic.active) {
      const a = p.relic.aim;
      out.push({ x: p.x + Math.cos(a) * 26, y: p.y - 7 + Math.sin(a) * 26, r: 34, i: 0.9 });
    }
    const step = Math.floor(this.tick / 6);
    for (const pr of this.props()) if (pr.light) {
      const L = pr.light;
      const jitter = L.flicker ? Math.floor(hash(step, 0, pr.px) * 4) - 1 : 0;
      out.push({ x: pr.px + (L.dx || 0), y: pr.py + (L.dy || 0), r: L.r + jitter, i: L.i || 1 });
    }
    return out;
  }

  // ---- things that happen to the player --------------------------------------------------

  hurt(damage, from, events) {
    const p = this.player, s = this.state;
    if (p.inv > 0 || p.dead) return;
    s.hp = Math.max(0, s.hp - damage);
    p.inv = INVULNERABLE;
    // knocked back, away from what hit you
    const dx = p.x - from.x, dy = p.y - from.y, d = Math.hypot(dx, dy) || 1;
    const props = this.props();
    const m = moveBox(playerBox(p.x, p.y), dx / d * 10, dy / d * 10, b => this.blocked(b, props));
    p.x = m.x + 3; p.y = m.y + 3;
    events.push({ type: 'hurt', hp: s.hp, from: from.type });
    if (s.hp <= 0) { p.dead = true; events.push({ type: 'death', by: from.type }); }
  }

  useRelic(aim, events) {
    const p = this.player, room = this.room;
    if (p.relic.cool > 0 || p.relic.active) return;
    const item = this.relicItem();
    if (!item) {
      if (this.deniedT <= 0) {
        this.deniedT = 240;
        const holding = this.state.items.some(i => ITEMS[i]?.relic);
        events.push({ type: 'say', lines: [holding ? '[ Nothing in your hand. Open your pockets (Tab) and equip the crucifix. ]' : '[ You have nothing to hold up. ]'] });
      }
      return;
    }
    const lock = room.noRelic || (this.state.flags.has('relic_locked') ? 'Your arm will not lift it.' : null);
    if (lock) {
      if (this.deniedT <= 0) { this.deniedT = 240; events.push({ type: 'say', lines: [lock], sfx: 'bump' }); }
      return;
    }
    const a = aim ?? FACE_ANGLE[p.facing];
    p.relic.active = RELIC.active; p.relic.cool = RELIC.cooldown; p.relic.aim = a; p.relic.hit = new Set();
    p.facing = facingFromAngle(a);
    events.push({ type: 'relic', aim: a });
  }

  // a tape played from Elias's pocket, here
  playedTape(id, events = []) {
    const p = this.player;
    for (const e of this.entities) if (hearsTape(e, p.x, p.y)) events.push({ type: 'cue', sfx: 'penitent_rise', entity: e });
    return events;
  }

  // ---- the tick --------------------------------------------------------------------------

  update(intent = {}) {
    const events = [];
    const p = this.player, s = this.state;
    this.tick++; s.playtime++;
    if (this.cooldown > 0) this.cooldown--;
    if (this.deniedT > 0) this.deniedT--;
    if (p.inv > 0) p.inv--;
    if (p.dead) return events;
    const R = p.relic;
    if (R.active > 0) R.active--; else if (R.cool > 0) R.cool--;

    if (intent.relic) this.useRelic(intent.aim ?? null, events);

    let dx = Math.sign(intent.dx || 0), dy = Math.sign(intent.dy || 0);
    const props = this.props();
    if (dx || dy) {
      if (R.active) { /* facing stays on the relic */ } else if (dx && dy) {
        const keep = (p.facing === 'left' && dx < 0) || (p.facing === 'right' && dx > 0) || (p.facing === 'up' && dy < 0) || (p.facing === 'down' && dy > 0);
        if (!keep) p.facing = dx < 0 ? 'left' : 'right';
      } else p.facing = dx ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      const k = (dx && dy ? Math.SQRT1_2 : 1) * (R.active ? 0.45 : 1);
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

    // the relic's touch, once per raising per thing
    if (R.active) {
      const ox = p.x, oy = p.y - 7;
      for (const e of this.entities) {
        if (R.hit.has(e) || !inCone(ox, oy, R.aim, e.x, e.y - 6)) continue;
        R.hit.add(e);
        const ev = relicHits(e);
        if (ev) events.push(ev);
        if (ev && ev.effect === 'unmade') {
          s.flags.add('dead:' + e.id);
          s.remains[e.id] = { room: s.room, x: Math.round(e.x), y: Math.round(e.y) };
        }
      }
    }

    // everything else moves
    const ctx = {
      player: p, playerHit: playerHitBox(p.x, p.y), view: this.viewAngle(intent.aim ?? null),
      relicHeld: !!this.relicItem() && !this.room.noRelic, events: [], flags: s.flags,
      blocked: b => this.blocked(b, props, false),
    };
    for (const e of this.entities) updateEntity(e, ctx);
    for (const ev of ctx.events) {
      if (ev.type === 'touch') this.hurt(ev.damage, ev.entity, events);
      else {
        if (ev.type === 'released' || ev.type === 'vanished') s.flags.add('dead:' + ev.entity.id);
        events.push(ev);
      }
    }
    this.entities = this.entities.filter(e => e.alive);
    if (p.dead) return events;

    const box = playerBox(p.x, p.y);

    // exits fire on walking into them; you have to leave one before it can fire again
    const ex = this.exitAt(box);
    if (!ex) this.exitArmed = true;
    else if (this.exitArmed) {
      this.exitArmed = false;
      events.push(...this.tryExit(ex));
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

    if (intent.interact && this.cooldown === 0 && !R.active) {
      const tg = this.target();
      if (tg) {
        const res = runScript(tg.script, s, tg.id);
        if (res) {
          events.push({ type: 'interact', id: tg.id, ...res });
          this.cooldown = INTERACT_COOLDOWN;
        }
      }
    }
    return events;
  }

  // walking into an exit: locked, unlocked with something you carry, or simply open
  tryExit(ex) {
    const s = this.state, lock = ex.lock;
    if (!lock || s.flags.has(lock.flag)) return [{ type: 'exit', exit: ex }];
    if (lock.key && s.items.includes(lock.key)) {
      s.flags.add(lock.flag);
      const lines = lock.open || [`[ You unlock it with the ${ITEMS[lock.key].name.toLowerCase()}. ]`];
      return [{ type: 'say', lines, sfx: 'unlock', after: { type: 'exit', exit: ex } }];
    }
    const res = runScript(lock.locked || [{ say: ['Locked.'] }], s, 'lock:' + lock.flag);
    return [{ type: 'say', ...res, sfx: res.sfx || 'locked' }];
  }
}

const PENITENT_SCRIPT = [
  { when: { times: 0 }, say: ['Someone kneeling, robed, head bowed to the floor. It does not breathe that you can see.', 'It is in the way.'] },
  { say: ['It does not look up.'] },
];

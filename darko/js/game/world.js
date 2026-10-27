// The world model for the current room: the player, props and people, collision against tiles
// and solid things, what the player is facing, which exit they are standing in, and scripted
// walking. Positions are in pixels; a person's (x, y) is the middle of their feet.

import { ROOMS } from './rooms/index.js';
import { TILE, isSolidChar, bakeRoom } from './tiles.js';
import { cond } from './state.js';
import { CAST } from './cast.js';
import { overlaps, moveBox } from '../engine/collision.js';
import { drawPerson, drawDog, drawFrank, drawSpear, drawProp, PROPS } from './art.js';
import { C } from './palette.js';

export const PW = 8, PH = 5;
export const WALK_SPEED = 60, RUN_SPEED = 96;
export const feetBox = (x, y) => ({ x: x - PW / 2, y: y - PH, w: PW, h: PH });

const T = v => v * TILE;
const tileRect = a => ({ x: T(a[0]), y: T(a[1]), w: T(a[2]), h: T(a[3]) });

const npcBox = n => (n.who === 'dog' ? { x: n.x - 7, y: n.y - 4, w: 14, h: 4 } : { x: n.x - 5, y: n.y - 4, w: 10, h: 4 });
const bodyH = n => (n.who === 'frank' || n.who === 'frankman' ? 36 : CAST[n.who]?.look?.h || 18);
const npcBody = n => (n.who === 'dog' ? { x: n.x - 8, y: n.y - 12, w: 16, h: 13 } : { x: n.x - 6, y: n.y - bodyH(n) - 1, w: 12, h: bodyH(n) + 2 });

export class World {
  constructor(state) {
    this.state = state;
    this.room = null;
    this.player = { x: 0, y: 0, facing: 'down', walkT: 0, moving: false, walk: null };
    this.props = [];
    this.npcs = [];
    this.t = 0;
    this.baked = null;
  }

  enter(id, spawn) {
    const room = ROOMS[id];
    if (!room) throw new Error(`no room ${id}`);
    this.room = room;
    this.state.room = id;
    this.state.visited.add(id);
    this.npcs = [];
    this.player.walk = null;
    const sp = room.spawns[spawn] || Object.values(room.spawns)[0];
    this.placePlayer(sp[0], sp[1], sp[2]);
    this.refresh();
  }

  // put the player back exactly where a save says (pixel coordinates)
  restore(id, x, y, facing) {
    const room = ROOMS[id];
    if (!room) return false;
    this.room = room;
    this.state.visited.add(id);
    this.npcs = [];
    Object.assign(this.player, { x, y, facing, walk: null });
    this.refresh();
    if (this.blocked(feetBox(x, y), true)) {
      const sp = Object.values(room.spawns)[0];
      this.placePlayer(sp[0], sp[1], sp[2]);
    }
    this.sync();
    return true;
  }

  placePlayer(tx, ty, facing) {
    this.player.x = T(tx); this.player.y = T(ty);
    if (facing) this.player.facing = facing;
    this.sync();
  }

  sync() {
    this.state.x = Math.round(this.player.x * 10) / 10;
    this.state.y = Math.round(this.player.y * 10) / 10;
    this.state.facing = this.player.facing;
  }

  // re-evaluate which props and people are present; people keep their position if they stay
  refresh() {
    const s = this.state;
    this.props = this.room.props.filter(p => cond(s, p.when)).map(p => {
      const r = { ...p, def: p, x: T(p.x), y: T(p.y), w: T(p.w), h: T(p.h) };
      r.solidRect = p.solid === true ? { x: r.x, y: r.y, w: r.w, h: r.h } : Array.isArray(p.solid) ? tileRect(p.solid) : null;
      r.sortY = p.sy !== undefined ? T(p.sy) : r.y + r.h;
      return r;
    });
    const old = new Map(this.npcs.map(n => [n.id, n]));
    this.npcs = this.room.npcs.filter(n => cond(s, n.when)).map(n => old.get(n.id) || { ...n, def: n, x: T(n.x), y: T(n.y), walk: null, walkT: 0 });
  }

  tileAt(tx, ty) { return (this.room.map[ty] || '')[tx]; }

  blocked(box, ignoreNpcs = false) {
    const x0 = Math.floor(box.x / TILE), x1 = Math.floor((box.x + box.w - 0.001) / TILE);
    const y0 = Math.floor(box.y / TILE), y1 = Math.floor((box.y + box.h - 0.001) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidChar(this.tileAt(tx, ty))) return true;
    for (const p of this.props) if (p.solidRect && overlaps(box, p.solidRect)) return true;
    if (!ignoreNpcs) for (const n of this.npcs) if (!n.walk && !n.follow && overlaps(box, npcBox(n))) return true;
    return false;
  }

  // move the player by (dx, dy) pixels with collision; returns how far they actually went
  move(dx, dy) {
    const p = this.player;
    const box = feetBox(p.x, p.y);
    moveBox(box, dx, dy, b => this.blocked(b));
    const nx = box.x + PW / 2, ny = box.y + PH;
    const moved = Math.hypot(nx - p.x, ny - p.y);
    p.x = nx; p.y = ny;
    p.walkT += moved;
    this.sync();
    return moved;
  }

  face(dx, dy) {
    if (!dx && !dy) return;
    this.player.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    this.sync();
  }

  probeBox() {
    const p = this.player, d = 11;
    switch (p.facing) {
      case 'up': return { x: p.x - 4, y: p.y - PH - d, w: 8, h: d };
      case 'down': return { x: p.x - 4, y: p.y - 2, w: 8, h: d };
      case 'left': return { x: p.x - 4 - d, y: p.y - PH - 4, w: d, h: PH + 6 };
      default: return { x: p.x + 4, y: p.y - PH - 4, w: d, h: PH + 6 };
    }
  }

  // the area that counts as "touching" a thing you can use
  reachRect(t) {
    if (t.kind === 'npc') return npcBody(t.ref);
    const p = t.ref;
    if (p.layer === 'wall') return { x: p.x, y: p.y, w: p.w, h: Math.max(p.h, this.floorBelow(p) - p.y + 6) };
    return { x: p.x - 2, y: p.y - 2, w: p.w + 4, h: p.h + 4 };
  }

  interactables() {
    const out = [];
    for (const p of this.props) if (p.script) out.push({ kind: 'prop', ref: p, label: p.label || p.id });
    for (const n of this.npcs) if (n.script) out.push({ kind: 'npc', ref: n, label: CAST[n.who]?.name ? capital(CAST[n.who].name) : n.id });
    return out;
  }

  // what the player would use by pressing interact right now
  target() {
    const probe = this.probeBox();
    const px = probe.x + probe.w / 2, py = probe.y + probe.h / 2;
    let best = null, bestD = Infinity;
    for (const t of this.interactables()) {
      const r = this.reachRect(t);
      if (!overlaps(probe, r)) continue;
      const d = Math.hypot(r.x + r.w / 2 - px, Math.min(Math.abs(r.y + r.h - py), Math.abs(r.y + r.h / 2 - py)));
      const bias = t.kind === 'npc' ? -6 : 0;
      if (d + bias < bestD) { best = t; bestD = d + bias; }
    }
    return best;
  }

  // pixel y where walkable floor starts below a wall-mounted prop
  floorBelow(p) {
    const tx = Math.floor((p.x + p.w / 2) / TILE);
    let ty = Math.floor((p.y + p.h - 1) / TILE);
    while (ty < this.room.h && isSolidChar(this.tileAt(tx, ty))) ty++;
    return T(ty);
  }

  // the thing drawn under a point (world pixels), for the mouse
  hit(x, y) {
    let best = null, bestY = -Infinity;
    for (const t of this.interactables()) {
      const r = t.kind === 'npc' ? npcBody(t.ref) : { x: t.ref.x, y: t.ref.y, w: t.ref.w, h: Math.max(t.ref.h, 6) };
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
        const depth = t.kind === 'npc' ? t.ref.y : t.ref.layer === 'wall' ? -1000 : t.ref.layer === 'floor' ? -2000 : t.ref.sortY;
        if (depth > bestY) { best = t; bestY = depth; }
      }
    }
    return best;
  }

  // a standing spot from which the player can reach a target
  approachPoint(t) {
    const r = this.reachRect(t);
    const cx = r.x + r.w / 2;
    const below = { x: cx, y: r.y + r.h + PH + 2, facing: 'up' };
    if (t.kind === 'prop' && t.ref.layer === 'wall') return { x: cx, y: this.floorBelow(t.ref) + PH + 2, facing: 'up' };
    return below;
  }

  exitAt() {
    const box = feetBox(this.player.x, this.player.y);
    for (const e of this.room.exits) {
      if (e.when !== undefined && !cond(this.state, e.when)) continue;
      if (e.trigger && this.state.has(e.once)) continue;
      if (overlaps(box, tileRect([e.x, e.y, e.w, e.h]))) return e;
    }
    return null;
  }

  // scripted walking: straight lines, no collision, for cutscenes
  startWalk(who, tx, ty, speed = 40) {
    const ent = who === 'player' ? this.player : this.npcs.find(n => n.id === who);
    if (!ent) return null;
    ent.walk = { x: T(tx), y: T(ty), speed };
    return ent;
  }

  entity(who) { return who === 'player' ? this.player : this.npcs.find(n => n.id === who); }

  update(dt) {
    this.t += dt;
    // followers keep a step behind the player
    for (const n of this.npcs) {
      if (!n.follow || n.walk) continue;
      const dx = this.player.x - n.x, dy = this.player.y - n.y, d = Math.hypot(dx, dy);
      if (d > 18) {
        const step = Math.min(d - 18, 62 * dt);
        n.x += dx / d * step; n.y += dy / d * step;
        n.walkT = (n.walkT || 0) + step;
        n.moving = true;
        n.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      } else n.moving = false;
    }
    for (const e of [this.player, ...this.npcs]) {
      if (!e.walk) continue;
      const dx = e.walk.x - e.x, dy = e.walk.y - e.y, d = Math.hypot(dx, dy);
      const step = e.walk.speed * dt;
      if (d <= step) { e.x = e.walk.x; e.y = e.walk.y; e.walk = null; continue; }
      e.x += dx / d * step; e.y += dy / d * step;
      e.walkT = (e.walkT || 0) + step;
      e.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    }
    this.sync();
  }

  // ---- drawing -----------------------------------------------------------------------------

  draw(g, view) {
    if (!this.baked || this.bakedId !== this.room.id) { this.baked = bakeRoom(this.room); this.bakedId = this.room.id; }
    g.image(this.baked, 0, 0);
    for (const p of this.props) if (p.layer === 'floor') drawProp(g, p, view);
    for (const p of this.props) if (p.layer === 'wall') drawProp(g, p, view);
    const list = [];
    for (const p of this.props) if (!p.layer) list.push([p.sortY, () => drawProp(g, p, view)]);
    for (const n of this.npcs) list.push([n.sy !== undefined ? T(n.sy) : n.y, () => this.drawNpc(g, n, view)]);
    const pl = this.player;
    const look = this.state.has('costume') ? CAST.skeleton.look : CAST.donnie.look;
    if (!this.state.has('hide_player')) list.push([pl.y, () => drawPerson(g, pl.x, pl.y, look, pl.facing, walkFrame(pl))]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, fn] of list) fn();
    if (this.state.has('spears')) this.drawSpears(g);
  }

  // during a vision, everyone's spear shows where they are about to go. Donnie's own points
  // at the room's spear target, if it has one, and he follows it
  drawSpears(g) {
    const dir = f => ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[f] || [0, 1]);
    for (const n of this.npcs) {
      if (n.who === 'dog' || n.who === 'transam' || n.who === 'frankman') continue;
      const [dx, dy] = dir(n.facing);
      drawSpear(g, n.x, n.y - 9, dx, dy, (CAST[n.who]?.look?.h || 18) * 1.4, this.t + n.x);
    }
    if (this.state.has('hide_player')) return;
    const p = this.player, tg = typeof this.room.spear === 'function' ? this.room.spear(this.state) : this.room.spear;
    const [dx, dy] = tg ? [T(tg[0]) - p.x, T(tg[1]) - p.y] : dir(p.facing);
    drawSpear(g, p.x, p.y - 9, dx, dy, Math.min(40, Math.hypot(dx, dy) || 40), this.t);
  }

  drawNpc(g, n, view) {
    if (n.who === 'frank') { drawFrank(g, n.x, n.y, n.facing, this.t, view.flash, this.state.has('frank_unmasked') ? { unmasked: true, wounded: true } : {}); return; }
    if (n.who === 'frankman') { drawFrank(g, n.x, n.y, n.facing, this.t, true, { unmasked: true, helmet: true, still: true }); return; }
    if (n.who === 'transam') { PROPS.carh(g, { x: n.x - 27, y: n.y - 13, w: 54, h: 26, col: '#16161c' }); return; }
    if (n.who === 'dog') {
      const asleep = view.phase === 'night' && this.state.has('rose_talk');
      drawDog(g, n.x, n.y, n.facing, Math.floor(this.t * 2) % 2, asleep, this.t);
      return;
    }
    const look = CAST[n.who].look;
    drawPerson(g, n.x, n.y, look, n.facing, walkFrame(n), n.pose === 'sit' ? 'sit' : 'stand');
    if (n.pose === 'blower') {
      // the leaf blower, running, and what it does to the leaves
      const dir = n.facing === 'left' ? -1 : 1;
      const hx = Math.round(n.x + dir * 3), hy = Math.round(n.y - 8);
      g.rect(n.x - 4 - (dir > 0 ? 2 : -2), n.y - 15, 4, 6, C.ink);
      g.rect(Math.min(hx, hx + dir * 9), hy, 10, 2, C.fog);
      for (let i = 0; i < 6; i++) {
        const k = (this.t * 1.7 + i / 6) % 1;
        const lx = hx + dir * (10 + k * 30), ly = n.y - 3 + Math.sin(i * 2.1 + this.t * 9) * 4 * k;
        g.px(lx, ly, i % 2 ? C.amber : C.brick);
      }
    }
  }
}

export function walkFrame(e) {
  if (!e.moving && !e.walk) return 0;
  return [1, 0, 2, 0][Math.floor((e.walkT || 0) / 5) % 4];
}

const capital = s => s.charAt(0) + s.slice(1).toLowerCase();

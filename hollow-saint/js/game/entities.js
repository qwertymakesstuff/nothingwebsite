// Things that move. Each type has its own rules, and the relic means something different to
// each one, so the player has to learn when to raise it and when to run.
//
//   hollow    pale, thin, hungry. Stalks you. Shies away from a raised crucifix, and circles
//             for your back when you face it with one in hand. Three repulsions unmake it.
//   shade     tall, black, a pale disc for a face. Moves only while you are not looking at
//             it, and through walls. The relic stuns it; nothing kills it.
//   penitent  kneels, blocks the way. Iron and prayer do nothing. It listens: play it something.
//   watcher   stands far off. Gone when you get close. Leaves something behind.

import { overlaps } from '../engine/collision.js';
import { hash } from './config.js';

export const RELIC = { range: 54, half: 0.55, active: 30, cooldown: 80 };

export const TYPES = {
  hollow: { hp: 3, speed: 0.4, chase: 0.62, flee: 1.0, aggro: 104, damage: 1, relic: 'repel' },
  shade: { speed: 0.34, aggro: 170, damage: 1, relic: 'stun', ghost: true },
  penitent: { relic: 'none', solid: true, listens: true },
  watcher: { relic: 'none', vanish: 84 },
};

export const entityBox = e => ({ x: e.x - 3, y: e.y - 3, w: 6, h: 3 });
export const hitBox = e => ({ x: e.x - 4, y: e.y - 12, w: 8, h: 12 });

export function angleDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// is point (x, y) inside the cone from (ox, oy) pointing at `angle`?
export function inCone(ox, oy, angle, x, y, range = RELIC.range, half = RELIC.half) {
  const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d < 6) return true;
  return angleDiff(Math.atan2(dy, dx), angle) <= half;
}

export function spawnEntity(spec) {
  const t = TYPES[spec.type];
  return {
    id: spec.id, type: spec.type,
    x: spec.x, y: spec.y, homeX: spec.x, homeY: spec.y,
    hp: t.hp || 1, state: 'idle', t: 0, stun: 0, hurtT: 0, side: 1, cueT: 0, anim: 0,
    alive: true,
  };
}

// move with collision unless the type walks through walls; slide along whatever blocks
function step(e, dx, dy, ctx) {
  if (TYPES[e.type].ghost) { e.x += dx; e.y += dy; return; }
  const box = entityBox(e);
  const try1 = { ...box, x: box.x + dx };
  if (!ctx.blocked(try1)) e.x += dx;
  const try2 = { ...entityBox(e), y: box.y + dy };
  if (!ctx.blocked(try2)) e.y += dy;
}

function toward(e, tx, ty, speed, ctx) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  step(e, dx / d * speed, dy / d * speed, ctx);
}

// ctx: { player, view (angle the player is looking), relicHeld, blocked, events, flags }
export function updateEntity(e, ctx) {
  const T = TYPES[e.type], p = ctx.player;
  e.anim++;
  if (e.hurtT > 0) e.hurtT--;
  if (e.cueT > 0) e.cueT--;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy);

  switch (e.type) {
    case 'hollow': {
      if (e.state === 'dying') { if (--e.t <= 0) { e.alive = false; ctx.events.push({ type: 'unmade', entity: e }); } return; }
      if (e.state === 'flee') {
        toward(e, e.x - dx, e.y - dy, T.flee, ctx);
        if (--e.t <= 0) e.state = 'stalk';
        return;
      }
      if (d > T.aggro && e.state !== 'stalk') {
        // idle: shuffle in place
        if (e.anim % 160 < 30) toward(e, e.homeX + Math.cos(e.anim / 40) * 10, e.homeY, 0.2, ctx);
        return;
      }
      if (e.state === 'idle') { e.state = 'stalk'; ctx.events.push({ type: 'cue', sfx: 'hollow_cue', entity: e }); e.cueT = 200; }
      if (d > T.aggro * 1.8) { e.state = 'idle'; return; }
      if (e.cueT === 0 && d < 80) { ctx.events.push({ type: 'cue', sfx: 'hollow_breath', entity: e }); e.cueT = 150 + Math.floor(hash(e.anim, 3) * 120); }
      // faced with the cross in hand, it won't come straight at you: it circles for your back
      const faced = ctx.relicHeld && d < 64 && angleDiff(ctx.view, Math.atan2(e.y - p.y, e.x - p.x)) < 0.7;
      e.state = faced ? 'circle' : 'stalk';
      if (faced) {
        if (e.anim % 90 === 0) e.side = hash(e.anim, 7, e.homeX) < 0.5 ? -1 : 1;
        const n = d || 1;
        step(e, (-dy / n) * e.side * 0.38 + (dx / n) * (d > 40 ? 0.08 : -0.12), (dx / n) * e.side * 0.38 + (dy / n) * (d > 40 ? 0.08 : -0.12), ctx);
      } else toward(e, p.x, p.y, d < 34 ? T.chase : T.speed, ctx);
      if (overlaps(hitBox(e), ctx.playerHit)) {
        ctx.events.push({ type: 'touch', entity: e, damage: T.damage });
        e.state = 'flee'; e.t = 45;
      }
      return;
    }
    case 'shade': {
      if (e.stun > 0) { e.stun--; e.state = 'stunned'; return; }
      if (d > T.aggro) { e.state = 'idle'; return; }
      const seen = angleDiff(ctx.view, Math.atan2(e.y - 6 - (p.y - 7), e.x - p.x)) < 0.8;
      if (e.state === 'idle') { ctx.events.push({ type: 'cue', sfx: 'shade_cue', entity: e }); }
      e.state = seen ? 'seen' : 'moving';
      if (!seen) toward(e, p.x, p.y, T.speed, ctx);
      if (overlaps(hitBox(e), ctx.playerHit)) {
        ctx.events.push({ type: 'touch', entity: e, damage: T.damage });
        // it is somewhere else again, as if it had always been
        e.x = e.homeX; e.y = e.homeY; e.state = 'idle';
      }
      return;
    }
    case 'penitent': {
      if (e.state === 'rising') { if (--e.t <= 0) { e.alive = false; ctx.events.push({ type: 'released', entity: e }); } }
      return;
    }
    case 'watcher': {
      if (d < T.vanish) { e.alive = false; ctx.events.push({ type: 'vanished', entity: e }); }
      return;
    }
  }
}

// the relic touches an entity; returns an event describing what happened
export function relicHits(e) {
  switch (TYPES[e.type].relic) {
    case 'repel':
      if (e.state === 'dying') return null;
      e.hp--; e.hurtT = 24;
      if (e.hp <= 0) { e.state = 'dying'; e.t = 50; return { type: 'hit', effect: 'unmade', entity: e, sfx: 'hollow_die' }; }
      e.state = 'flee'; e.t = 140;
      return { type: 'hit', effect: 'repelled', entity: e, sfx: 'hollow_hurt' };
    case 'stun':
      e.stun = 150; e.hurtT = 12;
      return { type: 'hit', effect: 'stunned', entity: e, sfx: 'shade_stun' };
    case 'none':
      return e.type === 'penitent' ? { type: 'hit', effect: 'ignored', entity: e } : null;
  }
  return null;
}

// a recording played nearby
export function hearsTape(e, px, py) {
  if (!TYPES[e.type].listens || e.state === 'rising') return false;
  if (Math.hypot(px - e.x, py - e.y) > 90) return false;
  e.state = 'rising'; e.t = 80;
  return true;
}

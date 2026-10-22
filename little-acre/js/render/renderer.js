// Draws the world: ground, soil, then everything that stands up (trees, buildings, crops,
// objects, villagers, the player) sorted by depth, then weather, night lighting and effects.
// The camera follows the player and the whole scene is scaled by an integer zoom so pixels
// stay square.

import { TILE, CLOCK } from '../config.js';
import { MAPS } from '../data/maps.js';
import { NPCS_BY_ID } from '../data/npcs.js';
import { OBJECTS } from '../data/objects.js';
import * as W from '../world.js';
import { cropStage } from '../farming.js';
import { machineReady } from '../crafting.js';
import { tileSprite, waterSprite, treeSprite, hedgeSprite, cropSprite, soilSprite, objectSprite, furnitureSprite, buildingSprite, charSprite, itemIcon, hash } from './sprites.js';

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.zoom = 3;
    this.fade = 0;
    this.light = document.createElement('canvas');
    this.drops = Array.from({ length: 90 }, (_, i) => ({ x: hash(i, 1) , y: hash(i, 2), s: 0.6 + hash(i, 3) * 0.6 }));
    this.cursor = null;     // tile under the mouse
    this.target = null;     // tile the next action applies to
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    this.canvas.width = w; this.canvas.height = h;
    this.light.width = w; this.light.height = h;
    this.dpr = dpr;
    // about 18 x 11 tiles on a desktop, about 11 across on a phone held upright
    const across = Math.max(10, Math.min(18, window.innerWidth / 34));
    this.zoom = Math.max(2, Math.floor(Math.min(w / (across * TILE), h / (11 * TILE))));
  }

  camera() {
    const p = this.game.player, m = MAPS[p.map];
    const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
    const mw = m.w * TILE, mh = m.h * TILE;
    const cx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, p.x - vw / 2));
    const cy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, p.y - 12 - vh / 2));
    return { x: Math.round(cx * this.zoom) / this.zoom, y: Math.round(cy * this.zoom) / this.zoom, vw, vh };
  }

  // screen pixel (CSS px) -> tile
  screenToTile(sx, sy) {
    const cam = this.camera();
    const wx = (sx * this.dpr) / this.zoom + cam.x, wy = (sy * this.dpr) / this.zoom + cam.y;
    return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
  }

  draw(time) {
    const { ctx, game } = this;
    const s = game.state, p = s.player, mapId = p.map, m = MAPS[mapId];
    const season = s.date.season;
    const cam = this.camera();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = m.outdoor ? '#1a2a1a' : '#120c08';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.zoom, 0, 0, this.zoom, -cam.x * this.zoom, -cam.y * this.zoom);

    const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1), y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const x1 = Math.min(m.w - 1, Math.ceil((cam.x + cam.vw) / TILE) + 1), y1 = Math.min(m.h - 1, Math.ceil((cam.y + cam.vh) / TILE) + 3);
    const frame = Math.floor(time / 450) % 3;
    const ms = s.maps[mapId];
    const sorted = [];

    // ground
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ch = W.tileChar(s, mapId, x, y);
      const v = Math.floor(hash(x, y) * 8);
      const px = x * TILE, py = y * TILE;
      if (ch === '~') { this.water(x, y, frame, season, mapId); continue; }
      if (ch === 'F') { ctx.drawImage(tileSprite('c', season, v), px, py); ctx.drawImage(waterSprite(frame, season), 2, 2, 12, 12, px + 2, py + 2, 12, 12); ctx.fillStyle = '#c8c8d0'; ctx.fillRect(px, py, 16, 2); ctx.fillRect(px, py + 14, 16, 2); ctx.fillRect(px, py, 2, 16); ctx.fillRect(px + 14, py, 2, 16); continue; }
      if (ch === 'b') { ctx.drawImage(waterSprite(frame, season), px, py); ctx.drawImage(tileSprite('b', season, 0), px, py); continue; }
      const groundCh = m.outdoor && ['T', 'h', '#', 'x', 'B', 'D'].includes(ch) ? (mapId === 'quarry' ? 'g' : '.') : !m.outdoor && ch === 'D' ? 'f' : ch;
      ctx.drawImage(tileSprite(groundCh, season, v), px, py);
      if (!m.outdoor && ch === 'D') { ctx.fillStyle = '#6a3a2a'; ctx.fillRect(px + 1, py + 4, 14, 10); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(px + 2, py + 5, 12, 1); ctx.fillRect(px + 2, py + 12, 12, 1); }
      if (ch === 'W' && y <= 1 && x > 0 && x < m.w - 1) this.wallFace(px, py, y);
      if (ch === 'T') sorted.push({ y: py + 16, img: treeSprite(season, v), x: px - 8, dy: py + 16 - 42 });
      else if (ch === 'h') sorted.push({ y: py + 14, img: hedgeSprite(season), x: px, dy: py - 2 });
      else if (ch === 'x') sorted.push({ y: py + 14, img: objectSprite('oldfence', season), x: px, dy: py - 8 });
    }

    // soil and flat objects
    for (const [k, so] of Object.entries(ms.soil)) {
      const [x, y] = W.unkey(k);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      ctx.drawImage(soilSprite(so.w, season), x * TILE, y * TILE);
      if (so.f) { ctx.fillStyle = '#9ad04a'; ctx.fillRect(x * TILE + 3, y * TILE + 3, 1, 1); ctx.fillRect(x * TILE + 12, y * TILE + 11, 1, 1); ctx.fillRect(x * TILE + 8, y * TILE + 6, 1, 1); }
      if (so.c) sorted.push({ y: y * TILE + 14, img: cropSprite(so.c.id, cropStage(so.c), so.c.dead), x: x * TILE, dy: y * TILE - 8 });
    }
    for (const [k, o] of Object.entries(ms.objects)) {
      const [x, y] = W.unkey(k);
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const def = OBJECTS[o.t], px = x * TILE, py = y * TILE;
      const shake = game.effects.find(e => e.kind === 'shake' && e.tx === x && e.ty === y);
      const sx = shake ? Math.round(Math.sin(time / 20) * 1) : 0;
      if (def.floor) { ctx.drawImage(objectSprite(o.t, season), px, py - 6); continue; }
      if (o.t === 'tree') { sorted.push({ y: py + 16, img: treeSprite(season, x + y), x: px - 8 + sx, dy: py + 16 - 42 }); continue; }
      if (o.t === 'forage' || o.t === 'drop') {
        const bob = o.t === 'drop' ? Math.round(Math.sin(time / 250 + x) * 1) : 0;
        sorted.push({ y: py + 8, draw: () => { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px + 4, py + 12, 8, 2); ctx.drawImage(itemIcon(o.item), px, py - 2 + bob); } });
        continue;
      }
      let extra = '';
      if (o.t === 'fence') extra = ['0', +(W.objectAt(s, mapId, x + 1, y)?.t === 'fence'), '0', +(W.objectAt(s, mapId, x - 1, y)?.t === 'fence')].join('');
      if (def.machine && o.job) extra = 'on';
      sorted.push({ y: py + 14, img: objectSprite(o.t, season, extra), x: px + sx, dy: py - 8 });
      if (def.machine && machineReady(s, o)) sorted.push({ y: py + 15, img: itemIcon(o.job.out), x: px, dy: py - 18 + Math.round(Math.sin(time / 300) * 1.5) });
    }

    // buildings and fixed things
    const night = this.darkness() > 0.2;
    for (const b of m.buildings) sorted.push({ y: (b.y + b.h) * TILE, img: buildingSprite(b, season, night), x: b.x * TILE, dy: b.y * TILE - 12 });
    for (const t of m.things) {
      const px = t.x * TILE, py = t.y * TILE;
      if (['bin', 'well', 'board', 'sign'].includes(t.type)) sorted.push({ y: py + 14, img: objectSprite(t.type, season), x: px, dy: py - 8 });
      else if (t.type === 'bed') sorted.push({ y: py + 2, img: furnitureSprite('bed', t.w, t.h), x: px, dy: py - 8 });
      else if (t.type === 'kitchen') sorted.push({ y: py + 2, img: furnitureSprite('kitchen', t.w, t.h, s.unlocks.kitchen ? 'new' : ''), x: px, dy: py - 8 });
      else if (t.type === 'decor') sorted.push({ y: py + t.h * TILE - (t.walk === false || m.outdoor ? 2 : 14), img: furnitureSprite(t.sprite, t.w, t.h, night ? 'night' : ''), x: px, dy: py - 8 });
    }

    // villagers and the player
    for (const n of Object.values(game.npcs)) {
      if (n.hidden || n.map !== mapId) continue;
      const fr = n.moving ? Math.floor(n.walkT * 8) % 4 : 0;
      sorted.push({ y: n.y, img: charSprite(NPCS_BY_ID[n.id].look, n.dir, fr), x: Math.round(n.x - 8), dy: Math.round(n.y - 23), shadow: true });
    }
    const pf = game.moving ? Math.floor(game.walkT * 9) % 4 : 0;
    const tool = game.swing ? game.swing.tool : game.fishing ? 'rod' : '';
    sorted.push({ y: p.y + 0.5, img: charSprite(p.look, p.dir, pf, tool), x: Math.round(p.x - 8), dy: Math.round(p.y - 23), shadow: true, player: true });

    sorted.sort((a, b) => a.y - b.y);
    for (const d of sorted) {
      if (d.shadow) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(d.x + 4, d.dy + 21, 8, 3); }
      if (d.draw) d.draw(); else ctx.drawImage(d.img, d.x, d.dy);
      if (d.player && game.swing) this.swingArc(p, game.swing);
    }

    this.drawTarget();
    this.drawFishing(time);
    this.drawEffects(time);
    this.drawWeather(time, cam);
    this.drawLighting(cam, time);
    if (this.fade > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); this.fade = Math.max(0, this.fade - 0.06); }
  }

  water(x, y, frame, season, mapId) {
    const { ctx } = this, s = this.game.state;
    const px = x * TILE, py = y * TILE;
    ctx.drawImage(waterSprite((frame + x + y) % 3, season), px, py);
    const land = (dx, dy) => { const c = W.tileChar(s, mapId, x + dx, y + dy); return c !== '~' && c !== 'b' && c !== ' '; };
    ctx.fillStyle = season === 3 ? '#e8f0f8' : '#9fd0f0';
    if (land(0, -1)) ctx.fillRect(px, py, 16, 2);
    if (land(0, 1)) ctx.fillRect(px, py + 15, 16, 1);
    if (land(-1, 0)) ctx.fillRect(px, py, 1, 16);
    if (land(1, 0)) ctx.fillRect(px + 15, py, 1, 16);
  }

  wallFace(px, py, row = 1) {
    const { ctx } = this;
    ctx.fillStyle = row === 0 ? '#c9a87a' : '#d8b98a';
    ctx.fillRect(px, py, 16, 16);
    ctx.fillStyle = '#b8966a';
    for (let x = 2; x < 16; x += 6) ctx.fillRect(px + x, py, 1, 16);
    if (row === 1) { ctx.fillStyle = '#6a4426'; ctx.fillRect(px, py + 12, 16, 4); }
  }

  swingArc(p, sw) {
    const { ctx } = this;
    const k = 1 - sw.t / 0.22;
    const [dx, dy] = W.DIRS[p.dir];
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x + dx * 6, p.y - 10 + dy * 6, 9, -Math.PI / 2 + k * Math.PI, k * Math.PI + 0.4);
    ctx.stroke();
  }

  drawTarget() {
    const t = this.target;
    if (!t) return;
    const { ctx } = this;
    ctx.strokeStyle = t.active ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(t.x * TILE + 0.5, t.y * TILE + 0.5, TILE - 1, TILE - 1);
  }

  drawFishing(time) {
    const f = this.game.fishing;
    if (!f) return;
    const { ctx } = this, p = this.game.player;
    const bx = f.tx * TILE + 8, by = f.ty * TILE + 8 + (f.phase === 'bite' ? Math.sin(time / 40) * 1.5 : Math.sin(time / 400));
    const [dx] = W.DIRS[p.dir];
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.moveTo(p.x + 4 + dx * 4, p.y - 20); ctx.quadraticCurveTo((p.x + bx) / 2, Math.min(p.y, by) - 12, bx, by); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 2, by - 2, 4, 2); ctx.fillStyle = '#e03a3a'; ctx.fillRect(bx - 2, by, 4, 2);
    if (f.phase === 'bite') this.bubble(p.x, p.y - 30, '!');
  }

  bubble(x, y, text) {
    const { ctx } = this;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5, y - 7, 10, 11); ctx.fillRect(x - 1, y + 4, 2, 2);
    ctx.fillStyle = '#2a1a10'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText(text, x, y + 2);
  }

  drawEffects() {
    const { ctx, game } = this;
    for (const e of game.effects) {
      if (e.map !== game.player.map) continue;
      if (e.kind === 'text') {
        const rise = (1.1 - e.t) * 14;
        ctx.font = '8px "Jersey 10", monospace';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(1, e.t * 2);
        ctx.fillStyle = '#2a1a10'; ctx.fillText(e.text, e.tx * TILE + 8.5, e.ty * TILE - 2.5 - rise);
        ctx.fillStyle = '#fff7d0'; ctx.fillText(e.text, e.tx * TILE + 8, e.ty * TILE - 3 - rise);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'leaves') {
        ctx.fillStyle = '#6ab04a';
        for (let i = 0; i < 6; i++) ctx.fillRect(e.tx * TILE + 8 + Math.sin(i * 2 + e.t * 9) * 10, e.ty * TILE - 10 + (0.6 - e.t) * 30 + i * 2, 2, 2);
      }
    }
  }

  // 0 (day) .. ~0.6 (night) for outdoor maps.
  darkness() {
    const s = this.game.state, m = s.date.minutes;
    let d = 0;
    if (m >= 17 * 60) d = Math.min(0.62, ((m - 17 * 60) / 240) * 0.62);
    if (m < 7 * 60) d = Math.max(0, 0.3 - ((m - CLOCK.dayStart) / 60) * 0.3);
    if (s.weather.today === 'rain') d = Math.min(0.7, d + 0.14);
    return d;
  }

  drawWeather(time, cam) {
    const w = this.game.state.weather.today;
    if (w === 'sun' || !MAPS[this.game.player.map].outdoor) return;
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const W_ = this.canvas.width, H = this.canvas.height;
    for (const d of this.drops) {
      if (w === 'rain') {
        const y = ((d.y * H + time * 0.9 * d.s * this.zoom) % (H + 40)) - 20;
        const x = ((d.x * W_ - time * 0.15 * d.s * this.zoom) % W_ + W_) % W_;
        ctx.fillStyle = 'rgba(190,215,255,.55)';
        ctx.fillRect(x, y, Math.max(1, this.zoom / 2), this.zoom * 4);
      } else {
        const y = ((d.y * H + time * 0.08 * d.s * this.zoom) % (H + 20)) - 10;
        const x = ((d.x * W_ + Math.sin(time / 900 + d.y * 9) * 20 * d.s) % W_ + W_) % W_;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillRect(x, y, this.zoom, this.zoom);
      }
    }
  }

  drawLighting(cam, time) {
    const s = this.game.state, m = MAPS[s.player.map];
    const dark = m.outdoor ? this.darkness() : 0;
    if (dark <= 0.01) return;
    const lc = this.light.getContext('2d');
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, this.light.width, this.light.height);
    lc.fillStyle = `rgba(14,16,48,${dark})`;
    lc.fillRect(0, 0, this.light.width, this.light.height);
    if (dark > 0.2) {
      lc.globalCompositeOperation = 'destination-out';
      const glow = (wx, wy, r) => {
        const sx = (wx - cam.x) * this.zoom, sy = (wy - cam.y) * this.zoom, rr = r * this.zoom * (1 + Math.sin(time / 300 + wx) * 0.03);
        const g = lc.createRadialGradient(sx, sy, 0, sx, sy, rr);
        g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        lc.fillStyle = g; lc.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
      };
      for (const b of m.buildings) if (b.light) glow((b.x + b.w / 2) * TILE, (b.y + b.h) * TILE, 34);
      for (const t of m.things) if (t.light) glow((t.x + 0.5) * TILE, t.y * TILE, 40);
      for (const [k, o] of Object.entries(s.maps[s.player.map].objects)) {
        if (!OBJECTS[o.t].light || (o.t === 'furnace' && !o.job)) continue;
        const [x, y] = W.unkey(k);
        glow((x + 0.5) * TILE, y * TILE, o.t === 'furnace' ? 30 : 46);
      }
      glow(s.player.x, s.player.y - 10, 26);
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.light, 0, 0);
    // a warm tint over the lights
    if (dark > 0.2) {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255,180,90,.08)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

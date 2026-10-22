// The tile world: what is on a tile, whether it blocks, collision for a moving box, warps and
// facing tiles. Pure functions of (state, mapId, ...) so they can be tested without a browser.

import { MAPS } from './data/maps.js';
import { tileInfo } from './data/tiles.js';
import { OBJECTS } from './data/objects.js';
import { TILE } from './config.js';

export const key = (x, y) => `${x},${y}`;
export const unkey = k => k.split(',').map(Number);
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export const mapDef = id => MAPS[id];
export const mapState = (state, id) => (state.maps[id] ||= { soil: {}, objects: {} });

// Raw tile character, with the north field's old fence turned into grass once it is cleared.
export function tileChar(state, mapId, x, y) {
  const m = MAPS[mapId];
  if (!m || x < 0 || y < 0 || x >= m.w || y >= m.h) return ' ';
  const ch = m.rows[y][x];
  if (ch === 'x' && state?.unlocks?.northfield) return '.';
  return ch;
}

export const buildingAt = (mapId, x, y) => MAPS[mapId].buildings.find(b => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) || null;
export const thingAt = (mapId, x, y) => MAPS[mapId].things.find(t => x >= t.x && y >= t.y && x < t.x + t.w && y < t.y + t.h) || null;
export const objectAt = (state, mapId, x, y) => state.maps[mapId]?.objects[key(x, y)] || null;
export const soilAt = (state, mapId, x, y) => state.maps[mapId]?.soil[key(x, y)] || null;

export function isWater(state, mapId, x, y) {
  return !!tileInfo(tileChar(state, mapId, x, y)).water;
}

// Does this tile stop the player? (Villagers are checked separately, they move.)
export function blocked(state, mapId, x, y) {
  const ch = tileChar(state, mapId, x, y);
  const info = tileInfo(ch);
  if (ch === 'D') { const b = buildingAt(mapId, x, y); if (b && b.locked) return true; }
  else if (!info.walk) return true;
  const t = thingAt(mapId, x, y);
  if (t && !t.walk) return true;
  const o = objectAt(state, mapId, x, y);
  if (o && !OBJECTS[o.t]?.walk) return true;
  return false;
}

// Player / villager collision box: feet-sized, in pixels, centred on (px, py) = feet position.
export const FEET = { w: 10, h: 6 };
export const boxAt = (px, py) => ({ x: px - FEET.w / 2, y: py - FEET.h, w: FEET.w, h: FEET.h });

export function canOccupy(state, mapId, box, extraBlocked = null) {
  const x0 = Math.floor(box.x / TILE), x1 = Math.floor((box.x + box.w - 0.01) / TILE);
  const y0 = Math.floor(box.y / TILE), y1 = Math.floor((box.y + box.h - 0.01) / TILE);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (blocked(state, mapId, x, y)) return false;
    if (extraBlocked && extraBlocked(x, y)) return false;
  }
  return true;
}

// Move a box by (dx, dy) one axis at a time so you slide along walls. Returns the new feet pos.
export function moveWithCollision(state, mapId, px, py, dx, dy, extraBlocked) {
  let nx = px, ny = py;
  if (dx && canOccupy(state, mapId, boxAt(px + dx, py), extraBlocked)) nx = px + dx;
  if (dy && canOccupy(state, mapId, boxAt(nx, py + dy), extraBlocked)) ny = py + dy;
  // corner help: when pushing straight into a corner, slide sideways toward the nearest free
  // lane (makes doorways and gaps between trees easy to walk through)
  const free = (x, y) => canOccupy(state, mapId, boxAt(x, y), extraBlocked);
  if (dx && nx === px && !dy) {
    for (const n of [2, -2, 4, -4, 6, -6]) if (free(px + dx, py + n)) { const s = Math.sign(n) * Math.min(1, Math.abs(dx)); if (free(px, py + s)) ny = py + s; break; }
  }
  if (dy && ny === py && !dx) {
    for (const n of [2, -2, 4, -4, 6, -6]) if (free(px + n, py + dy)) { const s = Math.sign(n) * Math.min(1, Math.abs(dy)); if (free(px + s, py)) nx = px + s; break; }
  }
  return [nx, ny];
}

export const tileOf = (px, py) => [Math.floor(px / TILE), Math.floor((py - 1) / TILE)];
export const centerOf = (tx, ty) => [tx * TILE + TILE / 2, ty * TILE + TILE - 2];

export function facingTile(px, py, dir) {
  const [tx, ty] = tileOf(px, py);
  const [dx, dy] = DIRS[dir];
  return [tx + dx, ty + dy];
}

export function warpAt(mapId, tx, ty) {
  return MAPS[mapId].warps.find(w => tx >= w.x && ty >= w.y && tx < w.x + w.w && ty < w.y + w.h) || null;
}

// The tile a warp drops you on, keeping your offset along a wide edge.
export function warpTarget(w, tx, ty) {
  const off = w.w > 1 ? tx - w.x : w.h > 1 ? ty - w.y : 0;
  return w.w > 1 ? [w.tx + off, w.ty] : [w.tx, w.ty + off];
}

export function doorAt(mapId, tx, ty) {
  const b = buildingAt(mapId, tx, ty);
  return b && b.door.x === tx && b.door.y === ty ? b : null;
}

export function inLockedArea(state, mapId, x, y) {
  const a = MAPS[mapId].lockedArea;
  return !!a && !state.unlocks?.[a.expansion] && x >= a.x && y >= a.y && x < a.x + a.w && y < a.y + a.h;
}

// Can a hoe turn this tile into soil?
export function tillable(state, mapId, x, y) {
  const m = MAPS[mapId];
  if (!m.farmable) return false;
  if (!tileInfo(tileChar(state, mapId, x, y)).till) return false;
  if (buildingAt(mapId, x, y) || thingAt(mapId, x, y) || objectAt(state, mapId, x, y) || soilAt(state, mapId, x, y)) return false;
  if (inLockedArea(state, mapId, x, y)) return false;
  // keep the doorstep and the path to it clear
  for (const b of m.buildings) if (x === b.door.x && y === b.door.y + 1) return false;
  return true;
}

// Is a tile free to drop a new object on (debris spawn, placing, forage)?
export function freeForObject(state, mapId, x, y, ground = null) {
  const ch = tileChar(state, mapId, x, y);
  if (ground ? ch !== ground && !(ground === '.' && ch === '"') : !tileInfo(ch).walk || ch === 'D') return false;
  if (buildingAt(mapId, x, y) || thingAt(mapId, x, y) || objectAt(state, mapId, x, y) || soilAt(state, mapId, x, y)) return false;
  const m = MAPS[mapId];
  for (const b of m.buildings) if (Math.abs(x - b.door.x) <= 1 && y >= b.door.y + 1 && y <= b.door.y + 2) return false;
  for (const w of m.warps) if (x >= w.x - 2 && x < w.x + w.w + 2 && y >= w.y - 2 && y < w.y + w.h + 2) return false;
  return true;
}

// Breadth-first path between two tiles over walkable ground (used by villagers).
export function findPath(state, mapId, from, to, isBlocked = null, limit = 4000) {
  const m = MAPS[mapId];
  const [sx, sy] = from, [gx, gy] = to;
  if (sx === gx && sy === gy) return [];
  const prev = new Map();
  const start = key(sx, sy);
  prev.set(start, null);
  const q = [[sx, sy]];
  let found = false, n = 0;
  while (q.length && n++ < limit) {
    const [x, y] = q.shift();
    if (x === gx && y === gy) { found = true; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      const goal = nx === gx && ny === gy;
      if (!goal && (blocked(state, mapId, nx, ny) || (isBlocked && isBlocked(nx, ny)))) continue;
      prev.set(k, key(x, y));
      q.push([nx, ny]);
    }
  }
  if (!found) return null;
  const path = [];
  let k = key(gx, gy);
  while (k && k !== start) { path.unshift(unkey(k)); k = prev.get(k); }
  return path;
}

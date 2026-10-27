// Using the selected item on a tile: tools, seeds, fertilizer, placing objects and picking
// them back up. Each function returns a result { ok, msg?, sfx?, got?: [[id, n]], energy? } and
// only changes state when ok (except refusals that cost nothing).

import { OBJECTS } from './data/objects.js';
import { ITEMS_BY_ID } from './data/items.js';
import { TOOL_ENERGY, TOOL_AREA, TOOL_POWER, CAN_CAPACITY } from './config.js';
import { key, DIRS, objectAt, soilAt, thingAt, isWater, tileChar, freeForObject, buildingAt, inLockedArea } from './world.js';
import { till, water, plant, plantProblem, fertilize, harvest, peekHarvest, isRipe, clearDead, sprinklerTiles } from './farming.js';
import { add, room, remove, count } from './inventory.js';
import { tileInfo } from './data/tiles.js';
import { MAPS } from './data/maps.js';
import { randInt } from './rng.js';

const TOOL_LEVEL_NAMES = ['basic', 'copper', 'iron'];

function spend(state, tool) {
  const cost = TOOL_ENERGY[tool][state.tools[tool] || 0];
  state.player.energy = Math.max(0, state.player.energy - cost);
  return cost;
}
const tired = (state, tool) => state.player.energy < TOOL_ENERGY[tool][state.tools[tool] || 0];
const TIRED = { ok: false, msg: "You're too tired. Eat something or get some sleep.", sfx: 'deny' };

// Roll an object's drops. Returns [[id, n]].
export function rollDrops(type, rng) {
  const out = [];
  for (const [id, min, max, chance] of OBJECTS[type].drops || []) {
    if (rng() >= chance) continue;
    const n = randInt(rng, min, max);
    if (n > 0) out.push([id, n]);
  }
  return out;
}

// Give items, leaving whatever does not fit as a 'drop' object on the tile.
export function giveOrDrop(state, mapId, x, y, items) {
  const got = [];
  for (const [id, n] of items) {
    const left = add(state, id, n);
    if (n - left) got.push([id, n - left]);
    state.seen[id] = true;
    if (left) {
      const k = key(x, y);
      const o = state.maps[mapId].objects[k];
      if (!o) state.maps[mapId].objects[k] = { t: 'drop', item: id, n: left };
      else if (o.t === 'drop' && o.item === id) o.n += left;
    }
  }
  return got;
}

function lineTiles(x, y, dir, len) {
  const [dx, dy] = DIRS[dir];
  return Array.from({ length: len }, (_, i) => [x + dx * i, y + dy * i]);
}

// Hit a breakable object with a tool.
function hitObject(state, mapId, x, y, tool, rng) {
  const o = objectAt(state, mapId, x, y);
  const def = o && OBJECTS[o.t];
  if (!def || !def.tool || def.tool === 'none') return null;
  if (def.tool !== 'any' && def.tool !== tool) return null;
  const lvl = state.tools[tool] || 0;
  if ((def.minLevel || 0) > lvl) return { ok: false, msg: `This ${def.name.toLowerCase()} needs a ${TOOL_LEVEL_NAMES[def.minLevel]} ${ITEMS_BY_ID[tool].name.toLowerCase()} or better.`, sfx: 'clank' };
  if (tired(state, tool)) return TIRED;
  const energy = spend(state, tool);
  if (o.hp == null) o.hp = def.hp;
  o.hp -= def.tool === 'any' ? 99 : TOOL_POWER[lvl];
  if (o.hp > 0) return { ok: true, energy, sfx: tool === 'axe' ? 'chop' : 'clink', shake: true };
  delete state.maps[mapId].objects[key(x, y)];
  const got = giveOrDrop(state, mapId, x, y, rollDrops(o.t, rng));
  if (def.debris) state.stats.cleared += 1;
  if (['rock', 'copper', 'iron', 'gemrock', 'boulder', 'stone'].includes(o.t)) state.stats.mined[o.t] = (state.stats.mined[o.t] || 0) + 1;
  return { ok: true, energy, sfx: tool === 'axe' ? 'fell' : tool === 'pickaxe' ? 'smash' : 'cut', got, cleared: def.debris ? 1 : 0, broke: o.t };
}

// Pick a placed object back up with the pickaxe or axe.
function pickUp(state, mapId, x, y) {
  const o = objectAt(state, mapId, x, y);
  const def = o && OBJECTS[o.t];
  if (!def || !def.item) return null;
  if (o.items?.some(Boolean)) return { ok: false, msg: 'Empty the chest first.', sfx: 'deny' };
  if (o.job) return { ok: false, msg: 'It is still working.', sfx: 'deny' };
  if (room(state, def.item) < 1) return { ok: false, msg: 'No room in your bag.', sfx: 'deny' };
  delete state.maps[mapId].objects[key(x, y)];
  add(state, def.item, 1);
  return { ok: true, sfx: 'pop', got: [[def.item, 1]] };
}

export function useTool(state, tool, mapId, x, y, dir, rng) {
  const lvl = state.tools[tool] || 0;
  switch (tool) {
    case 'hoe': {
      if (objectAt(state, mapId, x, y)?.t === 'forage') return { ok: false, msg: 'Pick it up first (E).', sfx: 'deny' };
      if (!MAPS[mapId].farmable) return { ok: false, msg: 'You can only farm on your farm.', sfx: 'deny' };
      if (tired(state, 'hoe')) return TIRED;
      let n = 0;
      for (const [tx, ty] of lineTiles(x, y, dir, TOOL_AREA[lvl])) if (till(state, mapId, tx, ty)) n++;
      if (!n) return { ok: false, msg: inLockedArea(state, mapId, x, y) ? 'The old north field is fenced off. Mabel could clear it.' : null, sfx: 'thud' };
      return { ok: true, energy: spend(state, 'hoe'), sfx: 'till', tilled: n };
    }
    case 'can': {
      const t = thingAt(mapId, x, y);
      if (isWater(state, mapId, x, y) || t?.type === 'well') {
        state.player.water = CAN_CAPACITY[lvl];
        return { ok: true, sfx: 'refill', msg: 'Watering can filled.' };
      }
      if (state.player.water <= 0) return { ok: false, msg: 'Your watering can is empty. Refill it at water or the well.', sfx: 'deny' };
      if (tired(state, 'can')) return TIRED;
      let n = 0;
      for (const [tx, ty] of lineTiles(x, y, dir, TOOL_AREA[lvl])) {
        if (state.player.water <= 0) break;
        if (water(state, mapId, tx, ty)) { n++; state.player.water -= 1; }
      }
      if (!n) return { ok: false, sfx: 'splash' };
      return { ok: true, energy: spend(state, 'can'), sfx: 'water', watered: n };
    }
    case 'axe':
    case 'pickaxe': {
      const hit = hitObject(state, mapId, x, y, tool, rng);
      if (hit) return hit;
      const up = pickUp(state, mapId, x, y);
      if (up) return up;
      if (tool === 'pickaxe') {
        const s = soilAt(state, mapId, x, y);
        if (s && !s.c) { if (tired(state, tool)) return TIRED; delete state.maps[mapId].soil[key(x, y)]; return { ok: true, energy: spend(state, tool), sfx: 'thud' }; }
      }
      if (tool === 'axe' && clearDead(state, mapId, x, y)) return { ok: true, sfx: 'cut' };
      return { ok: false, sfx: 'swing' };
    }
    case 'scythe': {
      const hit = hitObject(state, mapId, x, y, 'scythe', rng);
      if (hit) return hit;
      const s = soilAt(state, mapId, x, y);
      if (s?.c?.dead) { clearDead(state, mapId, x, y); return { ok: true, sfx: 'cut', msg: 'Cleared the withered plant.' }; }
      if (s && isRipe(s.c)) return harvestAt(state, mapId, x, y, rng);
      return { ok: false, sfx: 'swing' };
    }
    default:
      return { ok: false };
  }
}

export function harvestAt(state, mapId, x, y, rng) {
  const s = soilAt(state, mapId, x, y);
  if (!s || !isRipe(s.c)) return null;
  const items = peekHarvest(state, mapId, x, y, rng);
  const [[id, n]] = items;
  if (room(state, id) < n) return { ok: false, msg: 'No room in your bag.', sfx: 'deny' };
  harvest(state, mapId, x, y);
  add(state, id, n);
  state.seen[id] = true;
  state.stats.harvested[id] = (state.stats.harvested[id] || 0) + n;
  return { ok: true, sfx: 'harvest', got: items, harvested: id, n };
}

// Use a non-tool item on a tile: seeds, fertilizer, acorns, placeables.
export function useItem(state, itemId, mapId, x, y) {
  const it = ITEMS_BY_ID[itemId];
  if (!it) return { ok: false };
  if (it.cat === 'seed') {
    const why = plantProblem(state, mapId, x, y, itemId);
    if (why) return { ok: false, msg: why, sfx: 'deny' };
    remove(state, itemId, 1);
    plant(state, mapId, x, y, itemId);
    return { ok: true, sfx: 'plant', planted: it.crop };
  }
  if (it.soil) {
    if (!fertilize(state, mapId, x, y)) return { ok: false, msg: 'Use it on tilled soil before the seed sprouts.', sfx: 'deny' };
    remove(state, itemId, 1);
    return { ok: true, sfx: 'plant' };
  }
  if (it.place) return place(state, itemId, mapId, x, y);
  return { ok: false };
}

export function placeProblem(state, itemId, mapId, x, y) {
  const it = ITEMS_BY_ID[itemId];
  const type = it.place;
  if (count(state, itemId) < 1) return `You don't have a ${it.name}.`;
  const allowed = type === 'chest' ? ['farm', 'house'] : type === 'sapling' ? ['farm', 'forest'] : ['farm'];
  if (!allowed.includes(mapId)) return mapId === 'house' ? 'You can only place that outdoors.' : 'You can only decorate your own farm.';
  if (inLockedArea(state, mapId, x, y)) return 'That part of the farm is still fenced off.';
  const ch = tileChar(state, mapId, x, y);
  if (!tileInfo(ch).walk || ch === 'D' || buildingAt(mapId, x, y) || thingAt(mapId, x, y)) return "You can't put that there.";
  if (objectAt(state, mapId, x, y)) return 'Something is already there.';
  const s = soilAt(state, mapId, x, y);
  if (s && (s.c || OBJECTS[type].floor)) return 'Clear the soil first.';
  if (type === 'sapling' && !tileInfo(ch).till) return 'Acorns need to go in grass.';
  if (!freeForObject(state, mapId, x, y) && !s) return "You can't put that there.";
  return null;
}

export function place(state, itemId, mapId, x, y) {
  const why = placeProblem(state, itemId, mapId, x, y);
  if (why) return { ok: false, msg: why, sfx: 'deny' };
  const type = ITEMS_BY_ID[itemId].place;
  remove(state, itemId, 1);
  if (soilAt(state, mapId, x, y)) delete state.maps[mapId].soil[key(x, y)];
  const o = { t: type };
  if (OBJECTS[type].storage) o.items = Array(OBJECTS[type].storage).fill(null);
  if (type === 'sapling') o.age = 0;
  state.maps[mapId].objects[key(x, y)] = o;
  if (OBJECTS[type].sprinkles) for (const [tx, ty] of sprinklerTiles(type, x, y)) water(state, mapId, tx, ty);
  return { ok: true, sfx: 'place', placed: type };
}

export { count };

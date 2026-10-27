// Overnight respawns: forage in the wild, rocks and ore in the quarry, trees in the forest, and
// weeds and stones creeping back onto the farm.

import { MAPS } from './data/maps.js';
import { SPAWNS, NODES } from './data/forage.js';
import { FARM } from './config.js';
import { OBJECTS } from './data/objects.js';
import { key, freeForObject, inLockedArea } from './world.js';
import { pick, weighted, randInt } from './rng.js';

const countWhere = (objects, fn) => Object.values(objects).filter(fn).length;

function randomFreeTile(state, mapId, rng, ground, tries = 60) {
  const m = MAPS[mapId];
  for (let i = 0; i < tries; i++) {
    const x = randInt(rng, 1, m.w - 2), y = randInt(rng, 1, m.h - 2);
    if (freeForObject(state, mapId, x, y, ground)) return [x, y];
  }
  return null;
}

// `boost` multiplies the per-day amounts (used to fill the world on a new game).
export function spawnDailyStuff(state, rng, boost = 1) {
  const season = state.date.season;
  for (const s of SPAWNS) {
    const objects = state.maps[s.map].objects;
    const pool = s.items[season] || [];
    if (!pool.length) continue;
    let have = countWhere(objects, o => o.t === 'forage');
    for (let i = 0; i < s.perDay * boost && have < s.cap; i++) {
      const at = randomFreeTile(state, s.map, rng, s.ground);
      if (!at) break;
      objects[key(...at)] = { t: 'forage', item: pick(rng, pool) };
      have++;
    }
  }
  for (const n of NODES) {
    const objects = state.maps[n.map].objects;
    const kinds = new Set(n.kinds.map(k => k[0]));
    let have = countWhere(objects, o => kinds.has(o.t));
    for (let i = 0; i < n.perDay * boost && have < n.cap; i++) {
      const at = randomFreeTile(state, n.map, rng, n.ground);
      if (!at) break;
      objects[key(...at)] = { t: weighted(rng, n.kinds), hp: null };
      have++;
    }
  }
}

export function creepFarm(state, rng) {
  const objects = state.maps.farm.objects;
  const debris = countWhere(objects, o => OBJECTS[o.t]?.debris);
  if (debris >= FARM.debrisCap) return 0;
  let added = 0;
  const todo = [['weed', FARM.weedsPerDay], ['stone', FARM.stonesPerDay]];
  for (const [t, n] of todo) for (let i = 0; i < n; i++) {
    const at = randomFreeTile(state, 'farm', rng, '.');
    if (!at) continue;
    if (at[0] <= 13 && at[1] <= 16) continue;
    if (inLockedArea(state, 'farm', ...at)) continue;
    objects[key(...at)] = { t, hp: null };
    added++;
  }
  return added;
}

// Soil and crops. A soil tile is { w: watered today, f: fertilized, c: crop | null } where a crop
// is { id, age, grow, dead }. `age` counts watered nights; the crop is ripe when age >= grow.
// Regrowing crops drop back to `grow - regrow` after a harvest.

import { CROPS_BY_ID, FERTILIZER_SPEED } from './data/crops.js';
import { ITEMS_BY_ID } from './data/items.js';
import { FARM } from './config.js';
import { key, unkey, tillable, soilAt, objectAt } from './world.js';
import { OBJECTS } from './data/objects.js';
import { randInt } from './rng.js';

export const isRipe = c => !!c && !c.dead && c.age >= c.grow;

// 0..4 growth picture: 0 = seed, 1-3 = growing, 4 = ripe. Dead crops are drawn separately.
export function cropStage(c) {
  if (isRipe(c)) return 4;
  return Math.min(3, Math.floor((c.age / c.grow) * 4));
}

export function till(state, mapId, x, y) {
  if (!tillable(state, mapId, x, y)) return false;
  state.maps[mapId].soil[key(x, y)] = { w: state.weather.today === 'rain', f: false, c: null };
  return true;
}

export function water(state, mapId, x, y) {
  const s = soilAt(state, mapId, x, y);
  if (!s || s.w) return false;
  s.w = true;
  return true;
}

export function fertilize(state, mapId, x, y) {
  const s = soilAt(state, mapId, x, y);
  if (!s || s.f || (s.c && s.c.age > 0)) return false;
  s.f = true;
  if (s.c) s.c.grow = Math.ceil(CROPS_BY_ID[s.c.id].days * FERTILIZER_SPEED);
  return true;
}

// Can `seedItem` go in this soil right now? Returns an error string or null.
export function plantProblem(state, mapId, x, y, seedItem) {
  const it = ITEMS_BY_ID[seedItem];
  const crop = it && CROPS_BY_ID[it.crop];
  if (!crop) return 'That is not a seed.';
  const s = soilAt(state, mapId, x, y);
  if (!s) return 'Till the ground with the hoe first.';
  if (s.c) return 'Something is already growing there.';
  if (!crop.seasons.includes(state.date.season)) return `${crop.name} won't grow in this season.`;
  return null;
}

export function plant(state, mapId, x, y, seedItem) {
  if (plantProblem(state, mapId, x, y, seedItem)) return false;
  const crop = CROPS_BY_ID[ITEMS_BY_ID[seedItem].crop];
  const s = soilAt(state, mapId, x, y);
  s.c = { id: crop.id, age: 0, grow: s.f ? Math.ceil(crop.days * FERTILIZER_SPEED) : crop.days, dead: false };
  state.stats.planted += 1;
  return true;
}

// Harvest a ripe crop. Returns [[itemId, n]] or null. The caller adds the items (so it can
// refuse when the bag is full) and calls this only once they fit; `peekHarvest` predicts it.
export function peekHarvest(state, mapId, x, y, rng) {
  const s = soilAt(state, mapId, x, y);
  if (!s || !isRipe(s.c)) return null;
  const crop = CROPS_BY_ID[s.c.id];
  return [[crop.id, randInt(rng, crop.yield[0], crop.yield[1])]];
}

export function harvest(state, mapId, x, y) {
  const s = soilAt(state, mapId, x, y);
  if (!s || !isRipe(s.c)) return false;
  const crop = CROPS_BY_ID[s.c.id];
  if (crop.regrow) s.c.age = s.c.grow - crop.regrow;
  else { s.c = null; s.f = false; }
  return true;
}

export function clearDead(state, mapId, x, y) {
  const s = soilAt(state, mapId, x, y);
  if (!s || !s.c || !s.c.dead) return false;
  s.c = null;
  return true;
}

// Sprinklers water their tiles each morning (and when first placed).
export function sprinklerTiles(type, x, y) {
  const cross = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const ring = [...cross, [1, 1], [1, -1], [-1, 1], [-1, -1]];
  return (OBJECTS[type]?.sprinkles === 'square' ? ring : OBJECTS[type]?.sprinkles === 'cross' ? cross : []).map(([dx, dy]) => [x + dx, y + dy]);
}

export function runSprinklers(state, mapId) {
  let n = 0;
  for (const [k, o] of Object.entries(state.maps[mapId].objects)) {
    if (!OBJECTS[o.t]?.sprinkles) continue;
    const [x, y] = unkey(k);
    for (const [tx, ty] of sprinklerTiles(o.t, x, y)) if (water(state, mapId, tx, ty)) n++;
  }
  return n;
}

// Is a farm tile within a scarecrow's reach?
function guarded(state, mapId, x, y) {
  for (const [k, o] of Object.entries(state.maps[mapId].objects)) {
    if (o.t !== 'scarecrow') continue;
    const [sx, sy] = unkey(k);
    if (Math.hypot(sx - x, sy - y) <= FARM.scarecrowRadius) return true;
  }
  return false;
}

// The overnight growth pass for one map. `nextSeason` is the season of the coming day; `rain`
// is whether it rains tomorrow (rain waters every soil tile in the morning). Returns a report.
export function growNight(state, mapId, nextSeason, rain, rng) {
  const report = { grew: 0, withered: 0, eaten: [], reverted: 0 };
  const soil = state.maps[mapId].soil;
  for (const [k, s] of Object.entries(soil)) {
    if (s.c && !s.c.dead) {
      const crop = CROPS_BY_ID[s.c.id];
      if (s.w && s.c.age < s.c.grow) { s.c.age += 1; report.grew++; }
      if (!crop.seasons.includes(nextSeason)) { s.c.dead = true; report.withered++; }
    } else if (!s.c && !s.w && rng() < FARM.untilledDecay) {
      const [x, y] = unkey(k);
      if (!objectAt(state, mapId, x, y)) { delete soil[k]; report.reverted++; continue; }
    }
    s.w = false;
  }
  // crows: on some nights one unguarded, growing crop gets eaten (never on a brand-new farm)
  const growing = Object.entries(soil).filter(([, s]) => s.c && !s.c.dead && s.c.age > 0);
  if (growing.length >= 12 && rng() < FARM.crowChance) {
    const victims = growing.filter(([k]) => !guarded(state, mapId, ...unkey(k)));
    if (victims.length) {
      const [, s] = victims[Math.floor(rng() * victims.length)];
      report.eaten.push(s.c.id);
      s.c = null;
    }
  }
  if (rain) for (const s of Object.values(soil)) s.w = true;
  runSprinklers(state, mapId);
  return report;
}

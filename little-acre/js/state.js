// A brand-new game. The save file is exactly this object (see save.js).

import { SAVE_VERSION, PLAYER, CLOCK, CAN_CAPACITY } from './config.js';
import { NPCS } from './data/npcs.js';
import { MAPS } from './data/maps.js';
import { FARM_DEBRIS } from './data/objects.js';
import { rngFor, randInt } from './rng.js';
import { key, freeForObject, centerOf } from './world.js';
import { add } from './inventory.js';
import { spawnDailyStuff } from './spawns.js';

export const DEFAULT_LOOK = { skin: '#f0c8a0', hair: '#5a3a22', hairStyle: 'short', shirt: '#c8463a', pants: '#3a4a7a', eyes: '#2a1a10' };

export function emptyStats() {
  return { shipped: {}, harvested: {}, caught: {}, foraged: {}, crafted: {}, cooked: {}, mined: {}, cleared: 0, planted: 0, earned: 0, shippedTotal: 0, days: 1, biggestDay: 0, fishBest: {} };
}

export function newGame({ name = 'Sam', farm = 'Little Acre', seed = Date.now() % 1e9, look = DEFAULT_LOOK } = {}) {
  const [px, py] = centerOf(6, 4);
  const state = {
    version: SAVE_VERSION,
    seed: seed >>> 0,
    player: { name: String(name).slice(0, 16) || 'Sam', farm: String(farm).slice(0, 20) || 'Little Acre', look: { ...DEFAULT_LOOK, ...look }, map: 'house', x: px, y: py, dir: 'down', energy: PLAYER.maxEnergy, maxEnergy: PLAYER.maxEnergy, money: PLAYER.startMoney, slot: 0, backpack: PLAYER.backpack, water: CAN_CAPACITY[0] },
    tools: { hoe: 0, can: 0, axe: 0, pickaxe: 0, scythe: 0, rod: 0 },
    date: { day: 1, season: 0, year: 1, minutes: CLOCK.dayStart },
    weather: { today: 'sun', tomorrow: 'sun' },
    inventory: Array(PLAYER.maxBackpack).fill(null),
    maps: Object.fromEntries(Object.keys(MAPS).map(id => [id, { soil: {}, objects: {} }])),
    shipping: [],
    npcs: Object.fromEntries(NPCS.map(n => [n.id, { points: 0, talked: -1, gifted: -1, met: false, rewards: [] }])),
    quests: { active: {}, done: [] },
    board: { day: -1, request: null },
    requests: [],
    unlocks: { northfield: false, kitchen: false },
    stats: emptyStats(),
    seen: {},
    festivals: {},
    settings: { music: true, sfx: true, volume: 0.6 },
  };
  for (const id of ['hoe', 'can', 'axe', 'pickaxe', 'scythe']) add(state, id, 1);
  add(state, 'seed_turnip', 15);
  for (const s of state.inventory) if (s) state.seen[s.id] = true;
  scatterDebris(state, 'farm', { x: 2, y: 9, w: 36, h: 19 }, 1, rngFor(state.seed, 'farm-debris'));
  // a first day's forage, rocks and trees so every area has something to do on day one
  spawnDailyStuff(state, rngFor(state.seed, 'spawn', 0), 6);
  return state;
}

// Scatter the starting junk over an area of the farm (also used when the north field opens).
export function scatterDebris(state, mapId, area, scale, rng) {
  const objects = state.maps[mapId].objects;
  for (const [type, n] of FARM_DEBRIS) {
    const count = Math.round(n * scale * (area.w * area.h) / (36 * 19));
    for (let i = 0, tries = 0; i < count && tries < count * 20; tries++) {
      const x = area.x + randInt(rng, 0, area.w - 1), y = area.y + randInt(rng, 0, area.h - 1);
      if (!freeForObject(state, mapId, x, y, '.')) continue; // grass only: keep paths clear
      if (mapId === 'farm' && x <= 13 && y <= 16) continue; // keep the yard around the house tidy
      objects[key(x, y)] = { t: type, hp: null };
      i++;
    }
  }
}


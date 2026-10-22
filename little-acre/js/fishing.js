// Fishing: which fish bites where, and the catch minigame as a pure simulation. The minigame
// is a vertical track 0..1 (0 = bottom). The fish moves on its own; holding the button pushes
// the green catch bar up, letting go lets it fall. Progress fills while the fish is inside the
// bar and drains while it is not. Catch at 1, lose it at 0.

import { FISH, JUNK, JUNK_CHANCE } from './data/fish.js';
import { MAPS } from './data/maps.js';
import { weighted } from './rng.js';

// Which body of water a map's water belongs to (farm pond, forest creek, lake).
export const waterBody = mapId => MAPS[mapId]?.water || null;

export function fishHere(state, mapId) {
  const where = waterBody(mapId);
  const hour = state.date.minutes / 60;
  const rain = state.weather.today === 'rain';
  return FISH.filter(f => f.where.includes(where) && f.seasons.includes(state.date.season) && hour >= f.hours[0] && hour < f.hours[1] && (!f.rain || rain));
}

// Returns { id, fish: def | null } — fish null means junk (no minigame).
export function rollCatch(state, mapId, rng) {
  const pool = fishHere(state, mapId);
  if (!pool.length || rng() < JUNK_CHANCE) return { id: weighted(rng, JUNK.map(j => [j.id, j.weight])), fish: null };
  const f = weighted(rng, pool.map(f => [f, f.weight]));
  return { id: f.id, fish: f };
}

// Seconds until a bite: shorter with bait and a better rod.
export const biteDelay = (rng, bait, rodLevel) => (1.2 + rng() * 4) * (bait ? 0.5 : 1) * (1 - rodLevel * 0.12);

export function createMinigame(fish, rodLevel, rng) {
  return {
    fish, rng,
    barSize: 0.26 + rodLevel * 0.05,
    bar: 0, barV: 0,                 // bar bottom position and velocity
    pos: 0.3, target: 0.5, fishV: 0, // fish position
    progress: 0.3,
    time: 0, done: null,             // 'caught' | 'lost'
    perfect: true,
  };
}

const D = 1 / 60;
// Advance by dt seconds (in fixed steps so the result does not depend on frame rate).
export function stepMinigame(g, dt, holding) {
  let left = dt;
  while (left > 1e-9 && !g.done) {
    const h = Math.min(D, left); left -= h;
    g.time += h;
    const diff = g.fish.difficulty / 100;
    // fish: pick a new target now and then; darters jump, sinkers favour the bottom, floaters the top
    if (g.rng() < h * (0.6 + diff * 2.4)) {
      const m = g.fish.motion;
      let t = g.rng();
      if (m === 'sink') t = t * t;
      if (m === 'float') t = 1 - t * t;
      if (m === 'dart' && g.rng() < 0.5) t = g.pos > 0.5 ? g.rng() * 0.3 : 0.7 + g.rng() * 0.3;
      g.target = t;
    }
    const speed = 0.5 + diff * 2.2;
    g.fishV += (g.target - g.pos) * speed * 6 * h;
    g.fishV *= Math.pow(0.08, h);
    g.pos = Math.max(0, Math.min(1, g.pos + g.fishV * h));
    // the player's bar
    g.barV += (holding ? 2.6 : -2.2) * h;
    g.bar += g.barV * h;
    if (g.bar < 0) { g.bar = 0; g.barV = Math.max(0, -g.barV * 0.3); }
    if (g.bar > 1 - g.barSize) { g.bar = 1 - g.barSize; g.barV = Math.min(0, -g.barV * 0.3); }
    const inside = g.pos >= g.bar && g.pos <= g.bar + g.barSize;
    g.progress += (inside ? 0.32 : -0.26 - diff * 0.12) * h;
    if (!inside) g.perfect = false;
    if (g.progress >= 1) { g.progress = 1; g.done = 'caught'; }
    if (g.progress <= 0) { g.progress = 0; g.done = 'lost'; }
  }
  return g;
}

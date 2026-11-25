// Game state for the UI prototype. Deliberately thin: just enough numbers to drive the HUD, the country
// panel and the sample event. The real simulation (provinces, armies, AI, politics) replaces the
// placeholder formulas in budget()/monthTick() in a later checkpoint without changing this module's shape.
import { COUNTRIES } from '../data/world.js';
import { NATIONS, GOV } from '../data/nations.js';
import { clamp } from './format.js';

export const SAVE_KEY = 'world-dominion-save-v0';
export const SAVE_VERSION = 0;

const BY_ID = new Map(COUNTRIES.map((c) => [c.id, c]));
export const shape = (id) => BY_ID.get(id);

// Merged, read-only view of a country's starting data.
export function nation(id) {
  const c = BY_ID.get(id);
  if (!c) return null;
  const [capital = '—', pop = 0, gdp = 0, gov = 'aut', army = 0, owner = null] = NATIONS[id] || [];
  return { id, name: c.name, capital, pop, gdp, gov, govLabel: GOV[gov] || GOV.aut, army, owner, territory: !!owner, neighbors: c.neighbors, tint: c.tint };
}

// Territories and data-less shapes can't be picked as a starting nation.
export const playable = (id) => { const n = nation(id); return !!n && !n.territory && n.gdp > 0; };

const BASE_STABILITY = { dem: 70, mon: 72, abs: 66, one: 62, aut: 58, jun: 42, theo: 52, ter: 70 };

// Stable pseudo-random number in [0,1) for a string — used for starting opinions so they don't change between loads.
export function hash01(s) { let x = 2166136261; for (const ch of s) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return ((x >>> 0) % 10000) / 10000; }

export function newGame(playerId) {
  const n = nation(playerId);
  if (!n || !playable(playerId)) throw new Error('not a playable nation: ' + playerId);
  return {
    v: SAVE_VERSION,
    player: playerId,
    day: 0,
    treasury: money2(n.gdp * 0.03),
    stability: BASE_STABILITY[n.gov] ?? 60,
    taxRate: 30,
    army: n.army,
    opinions: {},       // id -> -100..100, only once it differs from the seeded default
    flags: {},          // one-off event ids that have fired
  };
}

// Opinion of `other` toward the player: neighbours start a little cooler, everyone else spread around neutral.
export function opinion(state, other) {
  if (other in state.opinions) return state.opinions[other];
  const n = nation(state.player);
  const base = Math.round((hash01(state.player + ':' + other) - 0.5) * 70);
  return clamp(n.neighbors.includes(other) ? base - 10 : base, -100, 100);
}
export function relation(state, id) {
  if (id === state.player) return { key: 'you', label: 'Your nation' };
  const owner = nation(id)?.owner;
  if (owner === state.player) return { key: 'you', label: 'Your territory' };
  const o = opinion(state, id);
  if (o >= 35) return { key: 'good', label: 'Friendly' };
  if (o >= 10) return { key: 'info', label: 'Cordial' };
  if (o > -20) return { key: 'plain', label: 'Neutral' };
  if (o > -45) return { key: 'warn', label: 'Wary' };
  return { key: 'bad', label: 'Hostile' };
}

// Monthly budget in US$ billions. Placeholder economics: tax revenue vs. a fixed cost of running the state.
export function budget(state) {
  const gdp = nation(state.player).gdp;
  const income = gdp * (state.taxRate / 100) * 0.6 / 12;
  const expenses = gdp * 0.17 / 12 + state.army * 0.00008;
  return { income: money2(income), expenses: money2(expenses), balance: money2(income - expenses) };
}
// Taxes above 30% slowly erode stability, lower taxes slowly build it (per month).
export const taxMood = (taxRate) => round1((30 - taxRate) * 0.08);

export function monthTick(state) {
  const b = budget(state);
  state.treasury = money2(state.treasury + b.balance);
  state.stability = clamp(round1(state.stability + taxMood(state.taxRate)), 0, 100);
  return b;
}

export function applyEffects(state, fx) {
  if (fx.treasury) state.treasury = money2(state.treasury + fx.treasury);
  if (fx.stability) state.stability = clamp(round1(state.stability + fx.stability), 0, 100);
  if (fx.army) state.army = Math.max(0, state.army + fx.army);
}

export function serialize(state) { return JSON.stringify(state); }
export function deserialize(text) {
  try {
    const s = JSON.parse(text);
    if (!s || s.v !== SAVE_VERSION || !playable(s.player) || typeof s.day !== 'number') return null;
    return { opinions: {}, flags: {}, ...s };
  } catch { return null; }
}

function round1(n) { return Math.round(n * 10) / 10; }
// Money is in US$ billions, kept to 0.01 (= $10M) so micro-economies don't round to zero.
export function money2(n) { return Math.round(n * 100) / 100; }

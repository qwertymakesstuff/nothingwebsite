// Game state: the parts of the world that change during play. Starting facts come from core/db.js.
// Still deliberately thin — the simulation (armies, AI, politics) arrives in later checkpoints and adds fields
// here (they are all plain JSON so saves stay simple).
import { country, playable, ownerOf, hash01, ALL } from './db.js';
import { clamp } from './format.js';

export { playable, hash01 };
export const SAVE_KEY = 'world-dominion-save-v0';  // storage key kept stable; the format version is inside
export const SAVE_VERSION = 1;

export function newGame(playerId) {
  const c = country(playerId);
  if (!c || !playable(playerId)) throw new Error('not a playable nation: ' + playerId);
  return {
    v: SAVE_VERSION,
    player: playerId,
    day: 0,
    treasury: money2(Math.max(0.05, c.gdp * 0.03)),   // floor so micro-states don't start broke
    stability: c.stability,
    taxRate: 30,
    army: c.troops,
    opinions: {},       // id -> -100..100, only once it differs from the seeded default
    flags: {},          // one-off event ids that have fired
    owners: {},         // country id -> owner id, only where it differs from the start (conquest, independence)
    regionOwners: {},   // region id -> owner id, for partial control (future: occupation, separatism, civil war)
    buildings: {},      // country id -> [{ type, region? }]
  };
}

// Opinion of `other` toward the player: neighbours start a little cooler, everyone else spread around neutral.
export function opinion(state, other) {
  if (other in state.opinions) return state.opinions[other];
  const base = Math.round((hash01(state.player + ':' + other) - 0.5) * 70);
  return clamp(country(state.player).neighbors.includes(other) ? base - 10 : base, -100, 100);
}
export function relation(state, id) {
  if (id === state.player) return { key: 'you', label: 'Your nation' };
  const owner = ownerOf(state, id);
  if (owner === state.player) return { key: 'you', label: 'Your territory' };
  const o = opinion(state, owner);
  if (o >= 35) return { key: 'good', label: 'Friendly' };
  if (o >= 10) return { key: 'info', label: 'Cordial' };
  if (o > -20) return { key: 'plain', label: 'Neutral' };
  if (o > -45) return { key: 'warn', label: 'Wary' };
  return { key: 'bad', label: 'Hostile' };
}

// Monthly budget in US$ billions. Placeholder economics: tax revenue vs. a fixed cost of running the state.
export function budget(state) {
  const gdp = country(state.player).gdp;
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
    let s = JSON.parse(text);
    if (s && s.v === 0) s = migrateV0(s);
    if (!s || s.v !== SAVE_VERSION || !playable(s.player) || typeof s.day !== 'number') return null;
    return { opinions: {}, flags: {}, owners: {}, regionOwners: {}, buildings: {}, ...s };
  } catch { return null; }
}

// Version 0 (checkpoint 1) keyed countries by ISO numeric code ("276"); version 1 uses the stable ids in world.js.
const LEGACY = { 'x-kos': 'KOS', 'x-ncy': 'CYN', 'x-sol': 'SOL' };
function migrateV0(s) {
  const byNum = new Map(ALL.filter((c) => c.isoNum).map((c) => [c.isoNum, c.id]));
  const map = (k) => LEGACY[k] || byNum.get(k);
  const opinions = {};
  for (const [k, v] of Object.entries(s.opinions || {})) if (map(k)) opinions[map(k)] = v;
  return { ...s, v: 1, player: map(s.player), opinions };
}

function round1(n) { return Math.round(n * 10) / 10; }
// Money is in US$ billions, kept to 0.01 (= $10M) so micro-economies don't round to zero.
export function money2(n) { return Math.round(n * 100) / 100; }

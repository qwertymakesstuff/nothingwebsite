// Game state: everything that changes during play, as plain JSON (so saving is one JSON.stringify).
// The rules that change it live in core/sim.js; starting facts come from core/db.js.
//
// state = {
//   v, seed, player, month,                 // month 0 = January 2026; time only moves through sim.tickMonth
//   nations: { [id]: nation },              // every country's simulated numbers and policies (see sim.initNation)
//   owners, regionOwners, buildings,        // control of land; empty until wars and building arrive
//   opinions, flags, cooldowns,             // diplomacy and event bookkeeping
// }
import { country, playable, ownerOf, hash01, ALL } from './db.js';
import { initNations, initNation } from './sim.js';
import { clamp } from './format.js';

export { playable, hash01 };
export const SAVE_KEY = 'world-dominion-save-v0';  // storage key kept stable; the format version is inside
export const SAVE_VERSION = 2;

export function newGame(playerId, seed = String(Date.now() % 1e9)) {
  if (!playable(playerId)) throw new Error('not a playable nation: ' + playerId);
  return {
    v: SAVE_VERSION, seed, player: playerId, month: 0,
    nations: initNations(),
    owners: {}, regionOwners: {}, buildings: {},
    opinions: {}, flags: {}, cooldowns: {},
  };
}
export const me = (state) => state.nations[state.player];

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

export function serialize(state) { return JSON.stringify(state); }
export function deserialize(text) {
  try {
    let s = JSON.parse(text);
    if (s && s.v === 0) s = migrateV0(s);
    if (s && s.v === 1) s = migrateV1(s);
    if (!s || s.v !== SAVE_VERSION || !playable(s.player) || typeof s.month !== 'number' || !s.nations) return null;
    for (const c of ALL) if (!s.nations[c.id]) s.nations[c.id] = initNation(c.id);   // countries added by a data update
    return { owners: {}, regionOwners: {}, buildings: {}, opinions: {}, flags: {}, cooldowns: {}, ...s };
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
// Version 1 (checkpoints 1–2) counted days and only tracked the player's money; version 2 simulates everyone monthly.
function migrateV1(s) {
  const nations = initNations();
  const n = nations[s.player];
  if (n && n.policy) {
    if (typeof s.treasury === 'number') n.treasury = s.treasury;
    if (typeof s.stability === 'number') n.stability = s.stability;
    if (typeof s.army === 'number') n.troops = s.army;
    if (typeof s.taxRate === 'number') n.policy.tax = s.taxRate;
  }
  return { v: 2, seed: 'migrated-' + (s.player || ''), player: s.player, month: Math.floor((s.day || 0) / 30.44), nations,
    owners: s.owners || {}, regionOwners: s.regionOwners || {}, buildings: s.buildings || {}, opinions: s.opinions || {}, flags: s.flags || {}, cooldowns: {} };
}

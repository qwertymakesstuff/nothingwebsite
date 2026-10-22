// Saving and loading. The whole game state is one JSON object in localStorage under SAVE_KEY.
// Loading never trusts the stored data: it is migrated to the current version, then every part
// is checked against a fresh game and anything missing or broken is replaced. Data that can't
// be read at all is copied to a backup key instead of being thrown away.

import { SAVE_KEY, SAVE_VERSION, PLAYER, CAN_CAPACITY } from './config.js';
import { ITEMS_BY_ID } from './data/items.js';
import { CROPS_BY_ID } from './data/crops.js';
import { OBJECTS } from './data/objects.js';
import { MAPS } from './data/maps.js';
import { QUESTS_BY_ID } from './data/quests.js';
import { NPCS_BY_ID } from './data/npcs.js';
import { newGame, emptyStats } from './state.js';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v, d, min = -Infinity, max = Infinity) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const int = (v, d, min, max) => Math.floor(num(v, d, min, max));
const str = (v, d) => (typeof v === 'string' ? v : d);
const KEY_RE = /^-?\d+,-?\d+$/;

// Version steps live here (none yet: version 1 is the first).
const MIGRATIONS = {};
export function migrate(data) {
  let d = { ...data };
  let v = Number.isInteger(d.version) ? d.version : 1;
  while (v < SAVE_VERSION && MIGRATIONS[v]) { d = MIGRATIONS[v](d); v += 1; }
  d.version = SAVE_VERSION;
  return d;
}

function cleanSlot(s) {
  if (!isObj(s) || !ITEMS_BY_ID[s.id]) return null;
  const n = int(s.n, 0, 0, ITEMS_BY_ID[s.id].tool ? 1 : PLAYER.stack);
  return n > 0 ? { id: s.id, n } : null;
}

function cleanCrop(c) {
  if (!isObj(c) || !CROPS_BY_ID[c.id]) return null;
  const grow = int(c.grow, CROPS_BY_ID[c.id].days, 1, 60);
  return { id: c.id, age: int(c.age, 0, 0, grow), grow, dead: !!c.dead };
}

function cleanObject(o) {
  if (!isObj(o) || !OBJECTS[o.t]) return null;
  const out = { t: o.t };
  if (o.hp != null) out.hp = int(o.hp, null, 0, 99);
  else if (o.t !== 'forage' && o.t !== 'drop' && OBJECTS[o.t].hp) out.hp = null;
  if (o.t === 'forage' || o.t === 'drop') { if (!ITEMS_BY_ID[o.item]) return null; out.item = o.item; }
  if (o.t === 'drop') out.n = int(o.n, 1, 1, 9999);
  if (o.t === 'sapling') out.age = int(o.age, 0, 0, 99);
  if (OBJECTS[o.t].storage) out.items = Array.from({ length: OBJECTS[o.t].storage }, (_, i) => cleanSlot(o.items?.[i]));
  if (OBJECTS[o.t].machine && isObj(o.job) && ITEMS_BY_ID[o.job.out]) out.job = { out: o.job.out, ready: num(o.job.ready, 0) };
  return out;
}

// Returns a valid state built from `data` (anything unusable falls back to a new game's value).
export function sanitize(data) {
  const fresh = newGame({ seed: int(data?.seed, 1, 0, 2 ** 32 - 1) });
  if (!isObj(data)) return fresh;
  const d = migrate(data);
  const s = fresh;
  s.seed = int(d.seed, s.seed, 0, 2 ** 32 - 1);

  const p = isObj(d.player) ? d.player : {};
  s.player.name = str(p.name, s.player.name).slice(0, 16);
  s.player.farm = str(p.farm, s.player.farm).slice(0, 20);
  if (isObj(p.look)) for (const k of Object.keys(s.player.look)) if (typeof p.look[k] === 'string') s.player.look[k] = p.look[k];
  s.player.map = MAPS[p.map] ? p.map : 'house';
  s.player.x = num(p.x, s.player.x, 0, MAPS[s.player.map].w * 16);
  s.player.y = num(p.y, s.player.y, 0, MAPS[s.player.map].h * 16);
  s.player.dir = ['up', 'down', 'left', 'right'].includes(p.dir) ? p.dir : 'down';
  s.player.maxEnergy = int(p.maxEnergy, PLAYER.maxEnergy, 1, 999);
  s.player.energy = num(p.energy, s.player.maxEnergy, 0, s.player.maxEnergy);
  s.player.money = int(p.money, PLAYER.startMoney, 0, 1e9);
  s.player.backpack = [PLAYER.backpack, PLAYER.maxBackpack].includes(p.backpack) ? p.backpack : PLAYER.backpack;
  s.player.slot = int(p.slot, 0, 0, PLAYER.hotbar - 1);

  if (isObj(d.tools)) for (const t of Object.keys(s.tools)) s.tools[t] = int(d.tools[t], 0, 0, 2);
  s.player.water = int(p.water, CAN_CAPACITY[s.tools.can], 0, CAN_CAPACITY[s.tools.can]);

  if (isObj(d.date)) s.date = { day: int(d.date.day, 1, 1, 28), season: int(d.date.season, 0, 0, 3), year: int(d.date.year, 1, 1, 999), minutes: int(d.date.minutes, 360, 360, 26 * 60) };
  if (isObj(d.weather)) for (const k of ['today', 'tomorrow']) if (['sun', 'rain', 'snow'].includes(d.weather[k])) s.weather[k] = d.weather[k];

  if (Array.isArray(d.inventory)) s.inventory = Array.from({ length: PLAYER.maxBackpack }, (_, i) => cleanSlot(d.inventory[i]));

  if (isObj(d.maps)) for (const id of Object.keys(MAPS)) {
    const m = d.maps[id];
    if (!isObj(m)) continue;
    const soil = {}, objects = {};
    for (const [k, v] of Object.entries(isObj(m.soil) ? m.soil : {})) if (KEY_RE.test(k) && isObj(v)) soil[k] = { w: !!v.w, f: !!v.f, c: cleanCrop(v.c) };
    for (const [k, v] of Object.entries(isObj(m.objects) ? m.objects : {})) { const o = KEY_RE.test(k) && cleanObject(v); if (o) objects[k] = o; }
    s.maps[id] = { soil, objects };
  }

  s.shipping = (Array.isArray(d.shipping) ? d.shipping : []).map(cleanSlot).filter(Boolean);
  if (isObj(d.npcs)) for (const id of Object.keys(s.npcs)) {
    const n = d.npcs[id];
    if (!isObj(n)) continue;
    s.npcs[id] = { points: int(n.points, 0, 0, 1000), talked: int(n.talked, -1, -1, 1e6), gifted: int(n.gifted, -1, -1, 1e6), met: !!n.met, rewards: Array.isArray(n.rewards) ? n.rewards.filter(r => typeof r === 'string') : [] };
  }
  if (isObj(d.quests)) {
    s.quests.done = (Array.isArray(d.quests.done) ? d.quests.done : []).filter(id => QUESTS_BY_ID[id]);
    s.quests.active = {};
    for (const [id, a] of Object.entries(isObj(d.quests.active) ? d.quests.active : {})) {
      if (!QUESTS_BY_ID[id] || s.quests.done.includes(id)) continue;
      s.quests.active[id] = { n: int(a?.n, 0, 0, 1e6), talked: Array.isArray(a?.talked) ? a.talked.filter(x => NPCS_BY_ID[x]) : [] };
    }
  }
  const cleanReq = r => (isObj(r) && NPCS_BY_ID[r.npc] && ITEMS_BY_ID[r.item] ? { npc: r.npc, item: r.item, n: int(r.n, 1, 1, 999), reward: int(r.reward, 0, 0, 1e6), posted: int(r.posted, 0, 0, 1e6), due: int(r.due, 0, 0, 1e6) } : null);
  if (isObj(d.board)) s.board = { day: int(d.board.day, -1, -1, 1e6), request: cleanReq(d.board.request) };
  s.requests = (Array.isArray(d.requests) ? d.requests : []).map(cleanReq).filter(Boolean);
  if (isObj(d.unlocks)) for (const k of Object.keys(s.unlocks)) s.unlocks[k] = !!d.unlocks[k];

  const st = emptyStats();
  if (isObj(d.stats)) for (const [k, v] of Object.entries(st)) {
    if (isObj(v)) { for (const [id, c] of Object.entries(isObj(d.stats[k]) ? d.stats[k] : {})) if (Number.isFinite(c)) v[id] = c; }
    else st[k] = num(d.stats[k], v, 0);
  }
  if (Number.isFinite(d.stats?.requests)) st.requests = d.stats.requests;
  s.stats = st;
  s.seen = {};
  for (const [id, v] of Object.entries(isObj(d.seen) ? d.seen : {})) if (v && ITEMS_BY_ID[id]) s.seen[id] = true;
  s.festivals = isObj(d.festivals) ? JSON.parse(JSON.stringify(d.festivals)) : {};
  if (isObj(d.settings)) s.settings = { music: d.settings.music !== false, sfx: d.settings.sfx !== false, volume: num(d.settings.volume, 0.6, 0, 1) };
  s.pending = (Array.isArray(d.pending) ? d.pending : []).filter(x => Array.isArray(x) && ITEMS_BY_ID[x[0]] && Number.isFinite(x[1]) && x[1] > 0);
  return s;
}

export const serialize = state => JSON.stringify({ ...state, savedAt: Date.now() });

export function deserialize(text) {
  const data = JSON.parse(text);
  return sanitize(data);
}

const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function saveGame(state) {
  const ls = storage();
  if (!ls) return false;
  try { ls.setItem(SAVE_KEY, serialize(state)); return true; } catch { return false; }
}

export function loadGame() {
  const ls = storage();
  if (!ls) return null;
  let text = null;
  try { text = ls.getItem(SAVE_KEY); } catch { return null; }
  if (!text) return null;
  try { return deserialize(text); }
  catch {
    try { ls.setItem(`${SAVE_KEY}-broken-${Date.now()}`, text); ls.removeItem(SAVE_KEY); } catch { /* storage full */ }
    return null;
  }
}

export function hasSave() {
  try { return !!storage()?.getItem(SAVE_KEY); } catch { return false; }
}

export function deleteSave() {
  try { storage()?.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

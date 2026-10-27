// Persistence: the campaign in one versioned JSON object, a checkpoint taken at the start of each
// shift (so a lost job can be retried from there), and settings kept separately so they survive a
// new game. Loading never trusts stored data; anything broken is repaired or replaced.

import { SAVE_KEY, CHECKPOINT_KEY, SETTINGS_KEY, SAVE_VERSION } from './config.js';
import { newPlayer, emptyStats, cleanName } from './campaign.js';
import { SHOP_BY_ID } from './upgrades.js';
import { CAMPAIGN } from './shifts.js';
import { SCENES, ENDINGS } from './story.js';

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}

export const defaultSettings = () => ({ master: 0.8, music: 0.5, sfx: 0.8, timer: 'standard', textSize: 'normal', reduceMotion: false, hints: true, contrast: false });
export const TIMER_SPEEDS = { relaxed: 0.6, standard: 1, brisk: 1.25 };

const num = (v, d, lo = -Infinity, hi = Infinity) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

const MIGRATIONS = {}; // version n -> n+1, none yet

export function sanitizePlayer(raw) {
  if (!isObj(raw)) return null;
  let d = { ...raw };
  let v = Number.isInteger(d.version) ? d.version : 1;
  while (v < SAVE_VERSION && MIGRATIONS[v]) { d = MIGRATIONS[v](d); v++; }
  const p = newPlayer(d.name);
  p.money = Math.round(num(d.money, p.money, -1e6, 1e7));
  p.index = Math.round(num(d.index, 0, 0, CAMPAIGN.length));
  p.phase = ['scene', 'briefing', 'career'].includes(d.phase) ? d.phase : 'scene';
  p.flags = isObj(d.flags) ? { ...d.flags } : { outcomes: {} };
  if (!isObj(p.flags.outcomes)) p.flags.outcomes = {};
  p.owned = Array.isArray(d.owned) ? [...new Set(d.owned.filter(id => SHOP_BY_ID[id]))] : p.owned;
  for (const base of ['bus', 'couch']) if (!p.owned.includes(base)) p.owned.push(base);
  p.transport = p.owned.includes(d.transport) && SHOP_BY_ID[d.transport]?.slot === 'transport' ? d.transport : 'bus';
  p.housing = p.owned.includes(d.housing) && SHOP_BY_ID[d.housing]?.slot === 'housing' ? d.housing : 'couch';
  p.warnings = Math.round(num(d.warnings, 0, 0, 10));
  p.stats = { ...emptyStats() };
  if (isObj(d.stats)) for (const k of Object.keys(p.stats)) p.stats[k] = num(d.stats[k], 0, 0);
  p.history = Array.isArray(d.history) ? d.history.filter(isObj).slice(-50) : [];
  p.seenScenes = Array.isArray(d.seenScenes) ? d.seenScenes.filter(id => SCENES.some(s => s.id === id)) : [];
  p.ending = ENDINGS[d.ending] ? d.ending : null;
  p.gameOver = ['fired', 'evicted'].includes(d.gameOver) ? d.gameOver : null;
  p.name = cleanName(d.name);
  p.createdAt = num(d.createdAt, Date.now());
  return p;
}

function read(storage, key) {
  try { const s = storage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}
function write(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export const loadPlayer = storage => sanitizePlayer(read(storage, SAVE_KEY));
export const savePlayer = (storage, p) => write(storage, SAVE_KEY, { ...p, version: SAVE_VERSION, savedAt: Date.now() });
export const saveCheckpoint = (storage, p) => write(storage, CHECKPOINT_KEY, p);
export const loadCheckpoint = storage => sanitizePlayer(read(storage, CHECKPOINT_KEY));
export function clearSave(storage) { try { storage.removeItem(SAVE_KEY); storage.removeItem(CHECKPOINT_KEY); } catch { /* ignore */ } }

export function loadSettings(storage) {
  const d = read(storage, SETTINGS_KEY);
  const s = defaultSettings();
  if (!isObj(d)) return s;
  for (const k of ['master', 'music', 'sfx']) s[k] = num(d[k], s[k], 0, 1);
  if (TIMER_SPEEDS[d.timer]) s.timer = d.timer;
  if (['normal', 'large'].includes(d.textSize)) s.textSize = d.textSize;
  for (const k of ['reduceMotion', 'hints', 'contrast']) if (typeof d[k] === 'boolean') s[k] = d[k];
  return s;
}
export const saveSettings = (storage, s) => write(storage, SETTINGS_KEY, s);

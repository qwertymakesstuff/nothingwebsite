// Persistence. Settings and the run save live under separate keys, so starting a new game or a
// corrupt save can never touch the player's settings (and vice versa).

import { DEFAULT_BINDINGS, ACTIONS } from './input.js';

export const KEYS = { settings: 'hollowsaint.settings.v1', save: 'hollowsaint.save.v1', meta: 'hollowsaint.meta.v1' };
export const SAVE_VERSION = 1;

export const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.7,
  sfx: 0.8,
  textSpeed: 'normal',      // slow | normal | fast | instant
  reduceFlashing: false,
  screenShake: true,
  scanlines: true,
  scaling: 'integer',       // integer | fit
  brightness: 0.5,          // 0..1, set on the calibration screen
  calibrated: false,
  bindings: DEFAULT_BINDINGS,
};

export const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'];

export function memoryStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    _map: m,
  };
}

const clamp01 = v => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null);

export function sanitizeSettings(raw) {
  const s = structuredClone(DEFAULT_SETTINGS);
  if (!raw || typeof raw !== 'object') return s;
  for (const k of ['master', 'music', 'sfx', 'brightness']) { const v = clamp01(raw[k]); if (v !== null) s[k] = Math.round(v * 10) / 10; }
  if (TEXT_SPEEDS.includes(raw.textSpeed)) s.textSpeed = raw.textSpeed;
  for (const k of ['reduceFlashing', 'screenShake', 'scanlines', 'calibrated']) if (typeof raw[k] === 'boolean') s[k] = raw[k];
  if (raw.scaling === 'integer' || raw.scaling === 'fit') s.scaling = raw.scaling;
  if (raw.bindings && typeof raw.bindings === 'object') {
    for (const a of ACTIONS) {
      const codes = raw.bindings[a];
      if (Array.isArray(codes) && codes.length && codes.every(c => typeof c === 'string')) s.bindings[a] = codes.slice(0, 2);
    }
  }
  return s;
}

export function sanitizeSave(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== SAVE_VERSION) return null;
  if (typeof raw.room !== 'string' || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null;
  return {
    v: SAVE_VERSION,
    room: raw.room,
    x: raw.x, y: raw.y,
    facing: ['up', 'down', 'left', 'right'].includes(raw.facing) ? raw.facing : 'down',
    flags: Array.isArray(raw.flags) ? raw.flags.filter(f => typeof f === 'string') : [],
    visited: Array.isArray(raw.visited) ? raw.visited.filter(f => typeof f === 'string') : [],
    counts: Object.fromEntries(Object.entries(raw.counts && typeof raw.counts === 'object' ? raw.counts : {})
      .filter(([, n]) => Number.isInteger(n) && n >= 0)),
    items: Array.isArray(raw.items) ? [...new Set(raw.items.filter(f => typeof f === 'string'))] : undefined,
    equipped: typeof raw.equipped === 'string' ? raw.equipped : null,
    notes: Array.isArray(raw.notes) ? [...new Set(raw.notes.filter(f => typeof f === 'string'))] : [],
    remains: Object.fromEntries(Object.entries(raw.remains && typeof raw.remains === 'object' ? raw.remains : {})
      .filter(([, r]) => r && typeof r.room === 'string' && Number.isFinite(r.x) && Number.isFinite(r.y))),
    chapter: Number.isInteger(raw.chapter) ? raw.chapter : 1,
    playtime: Number.isFinite(raw.playtime) ? raw.playtime : 0,
    savedAt: Number.isFinite(raw.savedAt) ? raw.savedAt : 0,
  };
}

export class Store {
  constructor(storage) {
    if (storage === undefined) {
      try { storage = globalThis.localStorage; } catch { storage = null; }
    }
    this.storage = storage || memoryStorage();
  }

  read(key) {
    try { const t = this.storage.getItem(key); return t ? JSON.parse(t) : null; } catch { return null; }
  }
  write(key, value) {
    try { this.storage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  loadSettings() { return sanitizeSettings(this.read(KEYS.settings)); }
  saveSettings(s) { return this.write(KEYS.settings, sanitizeSettings(s)); }

  loadGame() { return sanitizeSave(this.read(KEYS.save)); }
  hasGame() { return !!this.loadGame(); }
  saveGame(data) {
    const clean = sanitizeSave({ ...data, v: SAVE_VERSION, savedAt: Date.now() });
    return clean ? this.write(KEYS.save, clean) : false;
  }
  clearGame() { try { this.storage.removeItem(KEYS.save); } catch { /* storage unavailable */ } }

  // things that outlive a single run (endings seen, chapter select unlocks)
  loadMeta() { const m = this.read(KEYS.meta); return m && typeof m === 'object' ? m : {}; }
  saveMeta(m) { return this.write(KEYS.meta, m); }
}

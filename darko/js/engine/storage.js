// Persistence. Settings and each save slot live under their own localStorage key, so a corrupt
// save can never take the settings with it (and starting a new game never touches them).

export const SAVE_VERSION = 2;
export const KEYS = {
  settings: 'darko.settings.v1',
  slot: n => `darko.save.${n}.v1`,
};
export const SLOTS = ['1', '2', '3', 'auto'];
export const MANUAL_SLOTS = ['1', '2', '3'];

export const SHAKE = ['full', 'reduced', 'off'];
export const TEXT_SPEEDS = ['slow', 'normal', 'fast', 'instant'];

export const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.7,       // ambience and drones
  sfx: 0.8,
  textSpeed: 'normal',
  shake: 'full',
  reduceFlashing: false,
  scanlines: true,
  scaling: 'integer', // integer | fit
};

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
const strings = a => (Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string'))] : []);

export function sanitizeSettings(raw) {
  const s = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== 'object') return s;
  for (const k of ['master', 'music', 'sfx']) { const v = clamp01(raw[k]); if (v !== null) s[k] = Math.round(v * 10) / 10; }
  if (TEXT_SPEEDS.includes(raw.textSpeed)) s.textSpeed = raw.textSpeed;
  if (SHAKE.includes(raw.shake)) s.shake = raw.shake;
  for (const k of ['reduceFlashing', 'scanlines']) if (typeof raw[k] === 'boolean') s[k] = raw[k];
  if (raw.scaling === 'integer' || raw.scaling === 'fit') s.scaling = raw.scaling;
  return s;
}

const FACINGS = ['up', 'down', 'left', 'right'];

export function sanitizeSave(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== SAVE_VERSION) return null;
  if (typeof raw.room !== 'string' || !Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null;
  if (!Number.isInteger(raw.day) || !Number.isFinite(raw.time)) return null;
  return {
    v: SAVE_VERSION,
    room: raw.room,
    x: raw.x, y: raw.y,
    facing: FACINGS.includes(raw.facing) ? raw.facing : 'down',
    day: raw.day,
    time: Math.max(0, Math.min(24 * 60 - 1, Math.round(raw.time))),
    beat: typeof raw.beat === 'string' ? raw.beat : 'oct1',
    flags: strings(raw.flags),
    items: strings(raw.items),
    notes: (Array.isArray(raw.notes) ? raw.notes : [])
      .filter(n => n && typeof n.id === 'string' && Number.isInteger(n.day) && Number.isFinite(n.time))
      .map(n => ({ id: n.id, day: n.day, time: n.time })),
    visited: strings(raw.visited),
    objective: typeof raw.objective === 'string' ? raw.objective : '',
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

  load(slot) { return sanitizeSave(this.read(KEYS.slot(slot))); }
  save(slot, data) {
    const clean = sanitizeSave({ ...data, v: SAVE_VERSION, savedAt: Date.now() });
    return clean ? this.write(KEYS.slot(slot), clean) : false;
  }
  clear(slot) { try { this.storage.removeItem(KEYS.slot(slot)); } catch { /* storage unavailable */ } }

  // the most recently written slot, for Continue
  latest() {
    let best = null;
    for (const slot of SLOTS) {
      const d = this.load(slot);
      if (d && (!best || d.savedAt >= best.data.savedAt)) best = { slot, data: d };
    }
    return best;
  }
}

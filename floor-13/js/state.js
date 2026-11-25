// Persistent save (localStorage) for FLOOR 13. Everything lives in one object; the current
// night (run) is saved inside it so closing the tab mid-night resumes exactly where you were.
export const SAVE_KEY = 'floor13.save.v1';
export const SAVE_VERSION = 1;

export function freshSave() {
  return {
    v: SAVE_VERSION,
    created: Date.now(),
    bank: 0,
    tokens: 0,
    night: 0,
    run: null,
    upgrades: {},
    items: {},
    lost: {},
    blueprints: {},
    clues: {},
    floorsSeen: {},
    people: {},
    achievements: {},
    endings: {},
    flags: {},
    stats: {
      floors: 0, rooms: 0, searches: 0, puzzles: 0, puzzleTypes: {}, encounters: 0, rareEncounters: 0,
      anomalies: 0, changed: 0, banked: 0, spent: 0, bestBank: 0, blackouts: 0, nightsDone: 0, nightsStarted: 0,
      bestFloorsNight: 0, phoneCalls: 0, catPets: 0, keypadClean: 0, gilded: 0, first13Night: 0,
    },
    settings: { sound: true, volume: 0.6, ambience: true, grain: true, motion: true },
    lastRun: null,
  };
}

let memory = null; // fallback when storage is unavailable (private mode etc.)

export function loadSave(storage = globalThis.localStorage) {
  let raw = null;
  try { raw = storage ? storage.getItem(SAVE_KEY) : memory; } catch { raw = memory; }
  if (!raw) return freshSave();
  try {
    const data = JSON.parse(raw);
    return migrate(data);
  } catch {
    return freshSave();
  }
}

// Fill in anything missing from older saves so new fields never crash the game.
export function migrate(data) {
  const base = freshSave();
  const out = { ...base, ...data };
  for (const k of ['upgrades', 'items', 'lost', 'blueprints', 'clues', 'floorsSeen', 'people', 'achievements', 'endings', 'flags']) out[k] = { ...(data[k] || {}) };
  out.stats = { ...base.stats, ...(data.stats || {}) };
  out.stats.puzzleTypes = { ...(data.stats?.puzzleTypes || {}) };
  out.settings = { ...base.settings, ...(data.settings || {}) };
  out.v = SAVE_VERSION;
  return out;
}

export function writeSave(S, storage = globalThis.localStorage) {
  const raw = JSON.stringify(S);
  try { if (storage) storage.setItem(SAVE_KEY, raw); else memory = raw; return true; } catch { memory = raw; return false; }
}

export function clearSave(storage = globalThis.localStorage) {
  memory = null;
  try { if (storage) storage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

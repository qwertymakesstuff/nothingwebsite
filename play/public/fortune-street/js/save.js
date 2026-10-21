// Saving and loading. The game is saved after every accepted action, and actions are atomic
// (engine.dispatch), so a save never holds a half-finished transaction: reloading resumes at
// the next decision. Saves carry a format version and are checked before use; anything
// unreadable is set aside instead of crashing the game.
import { STATE_VERSION, validateState } from './engine.js';

export const SAVE_KEY = 'fortune-street:save';
export const SETTINGS_KEY = 'fortune-street:settings';
const SAVE_FORMAT = 1;

function storage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function saveGame(state) {
  const s = storage();
  if (!s) return false;
  try {
    const { fx, ...rest } = state; // animation cues are not part of the game
    s.setItem(SAVE_KEY, JSON.stringify({ format: SAVE_FORMAT, version: STATE_VERSION, savedAt: Date.now(), state: rest }));
    return true;
  } catch {
    return false;
  }
}

// -> { state } | { error } | {} (nothing saved)
export function loadGame() {
  const s = storage();
  if (!s) return {};
  let raw;
  try { raw = s.getItem(SAVE_KEY); } catch { return {}; }
  if (!raw) return {};
  return parseSave(raw);
}

export function parseSave(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return { error: 'The saved game is corrupted.' }; }
  if (!data || data.format !== SAVE_FORMAT) return { error: 'The saved game uses an unknown format.' };
  const state = migrate(data.state, data.version);
  if (!state) return { error: `The saved game is from an incompatible version (${data.version}).` };
  state.fx = { dice: null, moves: [], cards: [], sounds: [] };
  const problem = validateState(state);
  if (problem) return { error: `The saved game could not be restored (${problem}).` };
  return { state, savedAt: data.savedAt };
}

// upgrade older state versions here as the format evolves
function migrate(state, version) {
  if (!state || typeof state !== 'object') return null;
  if (version === STATE_VERSION) return state;
  return null;
}

export function clearSave() {
  try { storage()?.removeItem(SAVE_KEY); } catch { /* storage blocked */ }
}

// keep a bad save around once so it is not silently lost
export function quarantineSave() {
  const s = storage();
  try {
    const raw = s?.getItem(SAVE_KEY);
    if (raw) s.setItem(`${SAVE_KEY}:broken`, raw);
    s?.removeItem(SAVE_KEY);
  } catch { /* storage blocked */ }
}

export const DEFAULT_SETTINGS = {
  sound: true,
  volume: 0.6,
  animation: 'normal', // normal | fast | off
  reducedMotion: 'auto', // auto | on | off
  aiSpeed: 'normal', // relaxed | normal | fast
  theme: 'night', // night | day
  textSize: 'normal', // normal | large
  confirmEndTurn: false,
};

export function loadSettings() {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const out = { ...DEFAULT_SETTINGS };
    for (const k of Object.keys(DEFAULT_SETTINGS)) {
      if (parsed && typeof parsed[k] === typeof DEFAULT_SETTINGS[k]) out[k] = parsed[k];
    }
    return out;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try { storage()?.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage blocked */ }
}

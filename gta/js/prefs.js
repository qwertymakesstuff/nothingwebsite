// Player preferences (volumes, look sensitivity, shadows, key bindings), saved with the rest of the save data. Plain data and
// small helpers; the settings screen edits it and input.js / audio.js / environment.js read it. Safe without a DOM.
import { data, persist } from './save.js';

export const ACTIONS = [
  { id: 'forward', label: 'move forward / accelerate', def: 'KeyW', alt: 'ArrowUp' },
  { id: 'back', label: 'move back / brake and reverse', def: 'KeyS', alt: 'ArrowDown' },
  { id: 'left', label: 'move left / steer left', def: 'KeyA', alt: 'ArrowLeft' },
  { id: 'right', label: 'move right / steer right', def: 'KeyD', alt: 'ArrowRight' },
  { id: 'run', label: 'run', def: 'ShiftLeft', alt: 'ShiftRight' },
  { id: 'brake', label: 'handbrake', def: 'Space' },
  { id: 'interact', label: 'get in or out of a car, use, talk', def: 'KeyE', alt: 'KeyF' },
  { id: 'fire', label: 'shoot (the left mouse button also shoots)', def: 'KeyJ' },
  { id: 'punch', label: 'punch', def: 'KeyQ' },
  { id: 'horn', label: 'horn', def: 'KeyH' },
  { id: 'radio', label: 'change the car radio station', def: 'KeyR' },
  { id: 'map', label: 'open the map', def: 'KeyM' },
  { id: 'pause', label: 'pause (Esc always works too)', def: 'KeyP' }
];
export const DEFAULTS = { master: 1, sfx: 1, voice: .9, mouse: 1, touchLook: 1, invertY: false, shadows: 'high', binds: {} };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const listeners = new Set();

function sane(p) {
  const o = Object.assign({}, DEFAULTS, p && typeof p === 'object' ? p : {});
  for (const k of ['master', 'sfx', 'voice']) o[k] = clamp(Number(o[k]), 0, 1); for (const k of ['master', 'sfx', 'voice']) if (!Number.isFinite(o[k])) o[k] = DEFAULTS[k];
  for (const k of ['mouse', 'touchLook']) { o[k] = clamp(Number(o[k]), .25, 3); if (!Number.isFinite(o[k])) o[k] = 1; }
  o.invertY = !!o.invertY; if (!['off', 'medium', 'high'].includes(o.shadows)) o.shadows = 'high';
  const binds = {}; for (const a of ACTIONS) { const v = o.binds && o.binds[a.id]; binds[a.id] = typeof v === 'string' && /^[A-Za-z0-9]{2,20}$/.test(v) ? v : a.def; }
  o.binds = binds; return o;
}
export const prefs = sane(data.prefs);
if (typeof data.voiceVol === 'number' && !(data.prefs && 'voice' in data.prefs)) prefs.voice = clamp(data.voiceVol, 0, 1);   // the voice slider used to live outside prefs

function save() { data.prefs = prefs; data.voiceVol = prefs.voice; persist(); }
export function setPref(key, value) {
  if (!(key in DEFAULTS) || key === 'binds') return false;
  const next = sane(Object.assign({}, prefs, { [key]: value }));
  prefs[key] = next[key]; save(); listeners.forEach(f => f(key, prefs[key])); return true;
}
export const onPref = f => { listeners.add(f); return () => listeners.delete(f); };

/* ---- key bindings ---- */
export const actionOf = id => ACTIONS.find(a => a.id === id);
export const codeOf = id => prefs.binds[id];
/** does this key press mean `id`? The fixed alternates (arrows, F, right shift) always work as well. */
export function isKey(id, code) { const a = actionOf(id); return !!a && (prefs.binds[id] === code || a.alt === code); }
export function keyName(code) {
  if (!code) return '';
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return { Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Alt', AltRight: 'Right Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace' }[code] || code;
}
/** bind a key to an action. If another action already uses it, the two swap, so nothing ends up unbound. Returns the action that was swapped, or null. */
export function setBind(id, code) {
  if (!actionOf(id) || code === 'Escape' || !/^[A-Za-z0-9]{2,20}$/.test(code)) return { ok: false };
  const other = ACTIONS.find(a => a.id !== id && prefs.binds[a.id] === code), old = prefs.binds[id];
  if (other) prefs.binds[other.id] = old; prefs.binds[id] = code; save(); listeners.forEach(f => f('binds', prefs.binds));
  return { ok: true, swapped: other ? other.id : null };
}
export function resetBinds() { for (const a of ACTIONS) prefs.binds[a.id] = a.def; save(); listeners.forEach(f => f('binds', prefs.binds)); }
export function resetPrefs() { Object.assign(prefs, sane({})); save(); listeners.forEach(f => f('all', null)); }

/** is saving available at all (not a private window with storage blocked)? */
export function canPersist() { try { const k = 'gta:probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } }

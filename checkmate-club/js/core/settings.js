// The shared settings system. One schema describes every option: its default, how to validate a
// stored value and how the settings panel should present it. Games read settings through
// Settings.get() and listen for changes with Settings.on().

import { KEYS } from './storage.js';

export const SCHEMA = [
  { section: 'Profile', key: 'playerName', type: 'text', label: 'Player name', default: 'Guest', maxLength: 16 },

  { section: 'Display', key: 'animationSpeed', type: 'choice', label: 'Animation speed', default: 'normal',
    options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']] },
  { section: 'Display', key: 'reduceMotion', type: 'toggle', label: 'Reduce motion',
    help: 'Turns off screen transitions and other nonessential movement.', default: false },
  { section: 'Display', key: 'tableFelt', type: 'choice', label: 'Table felt', default: 'green',
    options: [['green', 'Club green'], ['blue', 'Midnight blue'], ['red', 'Burgundy']] },

  { section: 'Audio', key: 'sound', type: 'toggle', label: 'Sound effects', default: true },
  { section: 'Audio', key: 'sfxVolume', type: 'range', label: 'Effects volume', default: 0.6, min: 0, max: 1, step: 0.1 },

  { section: 'Chess', key: 'chessBoard', type: 'choice', label: 'Board', default: 'walnut',
    options: [['walnut', 'Walnut & maple'], ['tournament', 'Tournament green'], ['slate', 'Slate blue'], ['contrast', 'High contrast (colour-blind friendly)']] },
  { section: 'Chess', key: 'chessHints', type: 'toggle', label: 'Show legal moves', help: 'Dots mark where the selected piece can go.', default: true },
  { section: 'Chess', key: 'chessCoordinates', type: 'toggle', label: 'Show board coordinates', default: true },

  { section: 'Cards', key: 'cardBack', type: 'choice', label: 'Card back', default: 'oxblood',
    options: [['oxblood', 'Oxblood damask'], ['midnight', 'Midnight art deco']] },

  { section: 'Gameplay', key: 'confirmLeave', type: 'toggle', label: 'Confirm before resigning, quitting or restarting',
    help: 'Asks before you throw away a game in progress.', default: true },
];

export const DEFAULTS = Object.fromEntries(SCHEMA.map(o => [o.key, o.default]));
const BY_KEY = Object.fromEntries(SCHEMA.map(o => [o.key, o]));

export function sanitizeValue(key, v) {
  const o = BY_KEY[key];
  if (!o) return undefined;
  switch (o.type) {
    case 'toggle': return typeof v === 'boolean' ? v : o.default;
    case 'choice': return o.options.some(([val]) => val === v) ? v : o.default;
    case 'range': {
      if (typeof v !== 'number' || !Number.isFinite(v)) return o.default;
      const clamped = Math.min(o.max, Math.max(o.min, v));
      return Math.round(Math.round(clamped / o.step) * o.step * 100) / 100;
    }
    case 'text': {
      if (typeof v !== 'string') return o.default;
      const t = v.replace(/\s+/g, ' ').trim().slice(0, o.maxLength);
      return t || o.default;
    }
    default: return o.default;
  }
}

export function sanitizeSettings(raw) {
  const s = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return s;
  for (const key of Object.keys(DEFAULTS)) if (key in raw) s[key] = sanitizeValue(key, raw[key]);
  return s;
}

export class Settings {
  constructor(store) {
    this.store = store;
    this.values = sanitizeSettings(store.read(KEYS.settings));
    this.listeners = new Set();
  }

  get(key) { return this.values[key]; }
  all() { return { ...this.values }; }

  set(key, value) {
    if (!(key in DEFAULTS)) return false;
    const v = sanitizeValue(key, value);
    if (this.values[key] === v) return true;
    this.values[key] = v;
    this.store.write(KEYS.settings, this.values);
    for (const fn of this.listeners) fn(key, v, this.values);
    return true;
  }

  reset() {
    this.values = { ...DEFAULTS };
    this.store.write(KEYS.settings, this.values);
    for (const fn of this.listeners) fn(null, null, this.values);
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

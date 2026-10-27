// Player settings: kept apart from the run so they survive new runs and progress resets.

import { SETTINGS_KEY } from './config.js';

export const SPEEDS = { relaxed: 1.35, normal: 1, fast: 0.55 };

export const defaultSettings = () => ({
  volume: 0.7,
  sound: true,
  animations: true,
  speed: 'normal',
  explanations: true,
  rain: true,
  confirmSkip: false,
});

export function sanitizeSettings(raw) {
  const s = defaultSettings();
  if (!raw || typeof raw !== 'object') return s;
  if (Number.isFinite(raw.volume)) s.volume = Math.min(1, Math.max(0, raw.volume));
  for (const k of ['sound', 'animations', 'explanations', 'rain', 'confirmSkip']) if (typeof raw[k] === 'boolean') s[k] = raw[k];
  if (SPEEDS[raw.speed]) s.speed = raw.speed;
  return s;
}

export function loadSettings(storage) {
  try { return sanitizeSettings(JSON.parse(storage.getItem(SETTINGS_KEY) || 'null')); } catch { return defaultSettings(); }
}
export function saveSettings(storage, s) {
  try { storage.setItem(SETTINGS_KEY, JSON.stringify(s)); return true; } catch { return false; }
}

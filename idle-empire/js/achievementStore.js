// Keeps unlocked achievements in localStorage so they survive a refresh.
// Stored as { version: 1, unlocked: { id: timestamp } }. Loading is defensive: unknown ids,
// bad timestamps and corrupted JSON are dropped rather than trusted.
// (The full save system in a later phase will take this over and migrate this key.)
import { ACHIEVEMENTS_BY_ID } from './achievements.js';

export const STORAGE_KEY = 'idleEmpire:achievements';

function storage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function loadAchievements(now = Date.now()) {
  const ls = storage();
  if (!ls) return {};
  let data;
  try { data = JSON.parse(ls.getItem(STORAGE_KEY) || 'null'); } catch { return {}; }
  const unlocked = data && typeof data === 'object' && data.unlocked && typeof data.unlocked === 'object' ? data.unlocked : {};
  const out = {};
  for (const [id, t] of Object.entries(unlocked)) {
    // a timestamp from the future (beyond a day of clock drift) is not believable
    if (ACHIEVEMENTS_BY_ID[id] && Number.isFinite(t) && t > 0 && t <= now + 864e5) out[id] = t;
  }
  return out;
}

export function saveAchievements(achievements) {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify({ version: 1, unlocked: achievements }));
    return true;
  } catch {
    return false; // storage full or blocked: keep playing, nothing else depends on it
  }
}

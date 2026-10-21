// Achievement rules: checking, granting (exactly once, with a timestamp) and the reward.
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from './achievements.js';
import * as economy from './economy.js';

export function isUnlocked(state, id) {
  return Object.prototype.hasOwnProperty.call(state.achievements, id);
}

export function unlockedCount(state) {
  return ACHIEVEMENTS.reduce((n, a) => n + (isUnlocked(state, a.id) ? 1 : 0), 0);
}

// grants one achievement; false when unknown or already granted, so a reward can never repeat
export function grant(state, id, now = Date.now()) {
  if (!ACHIEVEMENTS_BY_ID[id] || isUnlocked(state, id)) return false;
  state.achievements = { ...state.achievements, [id]: now };
  return true;
}

// checks every locked achievement; returns the ids granted now
export function checkAchievements(state, now = Date.now()) {
  const ctx = { now, pps: economy.productionPerSecond(state) };
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (isUnlocked(state, a.id)) continue;
    if (a.check(state, ctx) && grant(state, a.id, now)) fresh.push(a.id);
  }
  return fresh;
}

export function achievementProgress(state, id, now = Date.now()) {
  const a = ACHIEVEMENTS_BY_ID[id];
  if (isUnlocked(state, id)) return 1;
  if (!a.progress) return 0;
  return a.progress(state, { now, pps: economy.productionPerSecond(state) });
}

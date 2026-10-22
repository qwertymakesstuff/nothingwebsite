// The campaign state (one object, saved whole) and the steps between shifts:
//   scene(s) → briefing → shift → summary/paycheck → career screen → scenes → next briefing …

import { STARTING_MONEY, SAVE_VERSION, CAREER } from './config.js';
import { CAMPAIGN, SHIFTS, shiftIdAt } from './shifts.js';
import { pendingScenes } from './story.js';

export function newPlayer(name = 'Sam') {
  return {
    version: SAVE_VERSION, name: cleanName(name), money: STARTING_MONEY,
    index: 0, phase: 'scene', flags: { outcomes: {} },
    owned: ['bus', 'couch'], transport: 'bus', housing: 'couch',
    warnings: 0, stats: emptyStats(), history: [], seenScenes: [],
    ending: null, gameOver: null, createdAt: Date.now(),
  };
}

export const emptyStats = () => ({ shifts: 0, correct: 0, wrong: 0, walkouts: 0, tips: 0, fakesCaught: 0, underageStopped: 0, earned: 0, bestStreak: 0 });

export function cleanName(s) {
  const t = String(s ?? '').replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, 16);
  return t || 'Sam';
}

export const currentShiftId = p => shiftIdAt(p.index, p.flags);
export const currentShift = p => SHIFTS[currentShiftId(p)] ?? null;
export const totalShifts = () => CAMPAIGN.length;

// What the main menu's "Continue" should open.
export function nextStep(p) {
  if (p.gameOver) return { type: 'gameover', reason: p.gameOver };
  if (p.ending) return { type: 'ending', id: p.ending };
  if (p.phase === 'career') return { type: 'career' };
  if (p.phase === 'scene') {
    const scenes = pendingScenes(p, p.index - 1);
    if (scenes.length) return { type: 'scene', id: scenes[0].id };
    if (p.index >= CAMPAIGN.length) return { type: 'finish' };
    p.phase = 'briefing';
  }
  return { type: 'briefing', shiftId: currentShiftId(p) };
}

export function markSceneSeen(p, id) {
  if (!p.seenScenes.includes(id)) p.seenScenes.push(id);
  if (p.warnings >= CAREER.maxWarnings) p.gameOver = 'fired';
}

// Leaving the career screen moves on to the next shift's scenes.
export function finishCareer(p) {
  p.index += 1;
  p.phase = 'scene';
}

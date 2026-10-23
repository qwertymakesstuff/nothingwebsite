// Workshop progression: level from experience, what upgrades and subscriptions do, and the
// milestones. Every effect is read through these helpers so the rest of the code never needs to
// know which upgrade gives what.

import { UPGRADES, UPGRADE, SUBSCRIPTION } from '../data/tools.js';
import { BASE_CAPACITY, BASE_INTAKE, LEVELS } from './config.js';
import { CATEGORY, PART } from '../data/catalog.js';

const sumEffect = (state, key) => UPGRADES.filter(u => state.upgrades[u.id]).reduce((s, u) => s + (u.effect[key] || 0), 0);
const hasEffect = (state, key) => UPGRADES.some(u => state.upgrades[u.id] && u.effect[key]);

export const benchCount = state => 1 + sumEffect(state, 'benches');
export const capacity = state => BASE_CAPACITY + sumEffect(state, 'capacity');
export const intakeCap = state => BASE_INTAKE + sumEffect(state, 'intake');
export const supplierTier = state => 2 + sumEffect(state, 'supplierTier'); // highest part tier the store sells
export const shipBonus = state => sumEffect(state, 'shipDays');
export const sameDayExpress = state => hasEffect(state, 'sameDay');
export const storeDiscount = state => (state.subs.club ? 0.08 : 0);
export const freeExpress = state => !!state.subs.courier;

export function timeFactor(state, kind) {
  if (kind === 'install') return 1 - sumEffect(state, 'installSpeed');
  if (kind === 'test') return 1 - sumEffect(state, 'testSpeed');
  if (kind === 'visual') return 1 - sumEffect(state, 'visualSpeed');
  return 1;
}

export function levelFor(xp) {
  let l = 1;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i]) l = i + 1;
  return l;
}
export const nextLevelXp = level => LEVELS[level] ?? null;

export function canBuyUpgrade(state, id) {
  const u = UPGRADE[id];
  if (!u) return { ok: false, reason: 'Unknown upgrade.' };
  if (state.upgrades[id]) return { ok: false, reason: 'Already owned.' };
  if (state.level < u.level) return { ok: false, reason: `Requires workshop level ${u.level}.` };
  if (u.requires && !state.upgrades[u.requires]) return { ok: false, reason: `Requires ${UPGRADE[u.requires].name} first.` };
  if (state.money < u.price) return { ok: false, reason: 'Not enough money.' };
  return { ok: true };
}

// shelf space used by loose parts plus anything still on order
export function shelfUsed(state) {
  let s = 0;
  for (const u of state.inventory) { const p = state.parts[u]; if (p) s += CATEGORY[PART[p.id].cat].size; }
  for (const o of state.orders) for (const id of o.items) s += CATEGORY[PART[id].cat].size;
  return s;
}

export const MILESTONES = [
  { id: 'first-job', label: 'Open for business', desc: 'Complete your first job.', test: s => s.stats.jobsDone >= 1, reward: { money: 50 } },
  { id: 'repairs-5', label: 'Fixer', desc: 'Complete 5 repairs.', test: s => s.stats.repairs >= 5, reward: { money: 150, rep: 2 } },
  { id: 'repairs-20', label: 'Bench veteran', desc: 'Complete 20 repairs.', test: s => s.stats.repairs >= 20, reward: { money: 500, rep: 4 } },
  { id: 'repairs-50', label: 'Master technician', desc: 'Complete 50 repairs.', test: s => s.stats.repairs >= 50, reward: { money: 1500, rep: 6 } },
  { id: 'builds-5', label: 'Builder', desc: 'Deliver 5 custom builds.', test: s => s.stats.builds >= 5, reward: { money: 200, rep: 2 } },
  { id: 'highend-1', label: 'Big league', desc: 'Deliver a high-end build.', test: s => s.stats.highEnd >= 1, reward: { money: 250, rep: 3 } },
  { id: 'highend-5', label: 'Boutique builder', desc: 'Deliver 5 high-end builds.', test: s => s.stats.highEnd >= 5, reward: { money: 1000, rep: 5 } },
  { id: 'profit-1k', label: 'In the black', desc: 'Earn $1,000 total profit.', test: s => s.stats.profit >= 1000, reward: { rep: 2 } },
  { id: 'profit-5k', label: 'Healthy margins', desc: 'Earn $5,000 total profit.', test: s => s.stats.profit >= 5000, reward: { rep: 3 } },
  { id: 'profit-20k', label: 'Silicon tycoon', desc: 'Earn $20,000 total profit.', test: s => s.stats.profit >= 20000, reward: { rep: 5 } },
  { id: 'five-stars', label: 'Five stars', desc: 'Get a five-star review.', test: s => s.stats.fiveStars >= 1, reward: { money: 75 } },
  { id: 'happy-10', label: 'Loved locally', desc: 'Average satisfaction of 85+ over your last 10 jobs.', test: s => s.stats.recentSat.length >= 10 && s.stats.recentSat.reduce((a, b) => a + b, 0) / s.stats.recentSat.length >= 85, reward: { money: 400, rep: 4 } },
  { id: 'level-3', label: 'Growing shop', desc: 'Reach workshop level 3.', test: s => s.level >= 3, reward: { money: 200 } },
  { id: 'level-5', label: 'Established', desc: 'Reach workshop level 5.', test: s => s.level >= 5, reward: { money: 800 } },
  { id: 'contract-1', label: 'Specialist', desc: 'Complete a specialist contract.', test: s => s.stats.contracts >= 1, reward: { money: 600, rep: 4 } },
  { id: 'recovery-3', label: 'Data whisperer', desc: 'Recover files for 3 customers.', test: s => s.stats.recoveries >= 3, reward: { money: 250, rep: 2 } },
];

export function checkMilestones(state) {
  const got = [];
  for (const m of MILESTONES) {
    if (state.milestones[m.id] || !m.test(state)) continue;
    state.milestones[m.id] = state.day;
    got.push(m);
  }
  return got;
}

export { SUBSCRIPTION };

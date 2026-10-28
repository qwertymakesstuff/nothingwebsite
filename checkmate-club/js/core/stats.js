// Statistics. Each game keeps a record of finished games; games call Stats.record() when a game
// ends. Values are validated on load so a hand-edited or corrupt entry can't break the screen.

import { KEYS } from './storage.js';

export const RESULTS = ['win', 'loss', 'draw'];

export const emptyRecord = () => ({
  played: 0, wins: 0, losses: 0, draws: 0,
  streak: 0, bestStreak: 0,
  bestTime: null,   // seconds, lower is better (only for wins)
  bestScore: null,  // higher is better
  totalTime: 0,     // seconds
  lastPlayed: null, // epoch ms
});

const count = v => (Number.isInteger(v) && v >= 0 ? v : 0);
const optNum = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

export function sanitizeRecord(raw) {
  const r = emptyRecord();
  if (!raw || typeof raw !== 'object') return r;
  for (const k of ['played', 'wins', 'losses', 'draws', 'streak', 'bestStreak']) r[k] = count(raw[k]);
  r.bestTime = optNum(raw.bestTime);
  r.bestScore = optNum(raw.bestScore);
  r.totalTime = optNum(raw.totalTime) ?? 0;
  r.lastPlayed = optNum(raw.lastPlayed);
  r.bestStreak = Math.max(r.bestStreak, r.streak);
  return r;
}

export function sanitizeStats(raw) {
  const out = { games: {} };
  const games = raw && typeof raw === 'object' && raw.games && typeof raw.games === 'object' ? raw.games : {};
  for (const [id, rec] of Object.entries(games)) if (/^[a-z0-9-]{1,32}$/.test(id)) out.games[id] = sanitizeRecord(rec);
  return out;
}

export function applyResult(rec, { result, time, score, at = Date.now() }) {
  if (!RESULTS.includes(result)) throw new Error(`unknown result: ${result}`);
  const r = { ...rec };
  r.played += 1;
  if (result === 'win') { r.wins += 1; r.streak += 1; } else { r.streak = 0; }
  if (result === 'loss') r.losses += 1;
  if (result === 'draw') r.draws += 1;
  r.bestStreak = Math.max(r.bestStreak, r.streak);
  const t = optNum(time);
  if (t !== null) {
    r.totalTime += t;
    if (result === 'win' && (r.bestTime === null || t < r.bestTime)) r.bestTime = t;
  }
  const s = optNum(score);
  if (s !== null && (r.bestScore === null || s > r.bestScore)) r.bestScore = s;
  r.lastPlayed = at;
  return r;
}

export class Stats {
  constructor(store) {
    this.store = store;
    this.data = sanitizeStats(store.read(KEYS.stats));
  }

  get(id) { return this.data.games[id] ? { ...this.data.games[id] } : emptyRecord(); }

  record(id, outcome) {
    this.data.games[id] = applyResult(this.get(id), outcome);
    this.store.write(KEYS.stats, this.data);
    return this.get(id);
  }

  totals() {
    const t = { played: 0, wins: 0, losses: 0, draws: 0, bestStreak: 0, totalTime: 0 };
    for (const r of Object.values(this.data.games)) {
      for (const k of ['played', 'wins', 'losses', 'draws', 'totalTime']) t[k] += r[k];
      t.bestStreak = Math.max(t.bestStreak, r.bestStreak);
    }
    return t;
  }

  reset() {
    this.data = { games: {} };
    this.store.write(KEYS.stats, this.data);
  }
}

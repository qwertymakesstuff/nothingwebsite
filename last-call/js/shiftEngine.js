// One shift, as a pure state machine. The UI calls tick(dt) every frame, decide() when the player
// stamps, and resolveIncident() when they answer an incident. Nothing here touches the DOM, so the
// whole shift can be simulated in tests.

import { rulesAt } from './rules.js';
import { judge } from './validation.js';
import { clockAt } from './timeline.js';
import { INCIDENTS } from './incidents.js';
import { PAY, SPEED_TIERS, RATING } from './config.js';
import { testCondition } from './conditions.js';

const ANGRY = new Set(['grumpy', 'arrogant', 'rowdy', 'impatient']);
export const HEADS_UP = 20;

export function createShift(prepared, mods = {}) {
  const { def, customers } = prepared;
  return {
    def, customers: [...customers].sort((a, b) => a.arriveAt - b.arriveAt),
    nextIdx: 0, queue: [], current: null, deskSince: 0, t: 0,
    inside: def.inside ?? 0, outflowAcc: 0,
    records: [], walkouts: [], strikes: 0, maxStrikes: def.strikes + (mods.extraStrikes ?? 0),
    streak: 0, bestStreak: 0, streakBonuses: 0,
    firedChanges: 0, headsUp: 0, incidentIdx: 0, incident: null, incidentLog: [],
    patienceMult: mods.patienceMult ?? 1, patienceRate: 1, ratingAdj: 0, incidentMoney: 0,
    mods, outcomes: {}, flagInc: {}, flagSet: {},
    events: [], ended: false, endReason: null,
  };
}

export const rulesNow = s => rulesAt(s.def, s.t);
export const clockNow = s => clockAt(s.def, s.t);
export const ctxNow = s => ({ date: s.def.date, clockMin: clockNow(s), inside: s.inside, rules: rulesNow(s) });
const emit = (s, e) => { s.events.push({ ...e, t: s.t }); };

function end(s, reason) {
  if (s.ended) return;
  s.ended = true; s.endReason = reason;
  emit(s, { type: 'end', reason });
}

function callNext(s) {
  if (s.current || !s.queue.length) return;
  s.current = s.queue.shift();
  s.deskSince = s.t;
  emit(s, { type: 'desk', uid: s.current.uid });
}

export function tick(s, dt) {
  if (s.ended || s.incident || dt <= 0) return;
  s.t = Math.min(s.def.duration, s.t + dt);
  while (s.nextIdx < s.customers.length && s.customers[s.nextIdx].arriveAt <= s.t) {
    const c = s.customers[s.nextIdx++];
    s.queue.push({ ...c, patienceMax: c.patience * s.patienceMult, waitLeft: c.patience * s.patienceMult });
    emit(s, { type: 'arrive', uid: c.uid });
  }
  for (const q of s.queue) q.waitLeft -= dt * s.patienceRate;
  const gone = s.queue.filter(q => q.waitLeft <= 0);
  if (gone.length) {
    s.queue = s.queue.filter(q => q.waitLeft > 0);
    for (const g of gone) { s.walkouts.push(g); emit(s, { type: 'walkout', uid: g.uid, name: g.name }); }
  }
  callNext(s);
  if (s.def.outflow) {
    s.outflowAcc += dt;
    while (s.outflowAcc >= s.def.outflow) { s.outflowAcc -= s.def.outflow; if (s.inside > 0) { s.inside -= 1; emit(s, { type: 'leave-inside' }); } }
  }
  const changes = s.def.changes ?? [];
  if (s.mods.earpiece) while (s.headsUp < changes.length && changes[s.headsUp].at - HEADS_UP <= s.t) {
    emit(s, { type: 'heads-up', message: changes[s.headsUp].message, inSeconds: Math.max(0, Math.round(changes[s.headsUp].at - s.t)) });
    s.headsUp++;
  }
  while (s.firedChanges < changes.length && changes[s.firedChanges].at <= s.t) {
    emit(s, { type: 'rule-change', message: changes[s.firedChanges].message, rules: Object.keys(changes[s.firedChanges].rules) });
    s.firedChanges++;
  }
  const inc = s.def.incidents ?? [];
  if (s.incidentIdx < inc.length && inc[s.incidentIdx].at <= s.t) {
    const def = INCIDENTS[inc[s.incidentIdx].id];
    s.incident = { id: inc[s.incidentIdx].id, ...def };
    s.incidentIdx++;
    emit(s, { type: 'incident', id: s.incident.id });
    return;
  }
  if (s.t >= s.def.duration) end(s, 'time');
  else if (s.nextIdx >= s.customers.length && !s.queue.length && !s.current) end(s, 'clear');
}

export function speedTier(seconds, grace = 0) {
  return SPEED_TIERS.find(t => seconds <= t.max + grace);
}

// verdict: 'admit' | 'refuse'; reason: a rule id or null.
export function decide(s, verdict, reason = null) {
  if (s.ended || s.incident || !s.current) return null;
  const c = s.current;
  const ctx = ctxNow(s);
  const j = judge(c, ctx, verdict, reason);
  const took = s.t - s.deskSince;
  const tier = speedTier(took);
  const rec = {
    uid: c.uid, name: c.docs.id?.name ?? c.name, realName: c.name, customer: c, verdict, reason, judgement: j,
    correct: j.correct, timeTaken: took, speed: tier.label, tip: 0, fine: 0, citation: 0, bribe: 0, clock: ctx.clockMin,
  };
  if (j.correct) {
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    if (s.streak % PAY.streakEvery === 0) { s.streakBonuses++; emit(s, { type: 'streak', streak: s.streak }); }
    if (verdict === 'admit') rec.tip = Math.round(c.tipBase * tier.mult * (s.mods.tipMult ?? 1));
    if (j.citationCorrect) rec.citation = PAY.citationBonus;
  } else {
    s.streak = 0;
    s.strikes++;
    rec.fine = verdict === 'admit' ? (j.violations.includes('age') ? PAY.fineUnderage : PAY.fineWrongAdmit) : PAY.fineWrongRefuse;
  }
  if (verdict === 'admit') { s.inside++; if (c.bribe) rec.bribe = c.bribe.amount; }
  if (verdict === 'refuse' && ANGRY.has(c.personality) && !s.mods.deescalation) {
    for (const q of s.queue) q.waitLeft = Math.max(1, q.waitLeft - 8);
    rec.scene = true;
  }
  if (c.story) s.outcomes[c.story] = { verdict, correct: j.correct };
  s.records.push(rec);
  s.current = null;
  emit(s, { type: 'decision', record: rec });
  if (s.strikes > s.maxStrikes) { end(s, 'sent-home'); return rec; }
  callNext(s);
  return rec;
}

export function choiceAvailable(choice, player) {
  if (!choice.requires) return true;
  if (typeof choice.requires === 'string') return player.owned.includes(choice.requires);
  return testCondition(choice.requires, player.flags, player);
}

export function resolveIncident(s, index, player) {
  if (!s.incident) return null;
  const choice = s.incident.choices[index];
  if (!choice || !choiceAvailable(choice, player)) return null;
  const e = choice.effects ?? {};
  if (e.time) s.t = Math.min(s.def.duration, s.t + e.time);
  if (e.patience) for (const q of s.queue) q.waitLeft = Math.max(1, Math.min(q.patienceMax * 1.5, q.waitLeft + e.patience));
  if (e.walk) for (let i = 0; i < e.walk && s.queue.length; i++) { const g = s.queue.pop(); s.walkouts.push(g); emit(s, { type: 'walkout', uid: g.uid, name: g.name }); }
  if (e.money) s.incidentMoney += e.money;
  if (e.rating) s.ratingAdj += e.rating;
  if (e.patienceRate) s.patienceRate = e.patienceRate;
  for (const [k, v] of Object.entries(e.inc ?? {})) s.flagInc[k] = (s.flagInc[k] ?? 0) + v;
  Object.assign(s.flagSet, e.flags ?? {});
  s.incidentLog.push({ id: s.incident.id, title: s.incident.title, choice: choice.label, result: choice.result, money: e.money ?? 0 });
  const result = choice.result;
  s.incident = null;
  emit(s, { type: 'incident-resolved', result });
  if (s.t >= s.def.duration) end(s, 'time');
  return result;
}

// The numbers the summary and paycheck are built from.
export function summarize(s) {
  const decided = s.records.length;
  const correct = s.records.filter(r => r.correct).length;
  const total = s.customers.length;
  const accuracy = decided ? correct / decided : 0;
  const throughput = total ? decided / total : 0;
  const raw = RATING.accuracyWeight * accuracy + RATING.throughputWeight * throughput - RATING.walkoutPenalty * s.walkouts.length + s.ratingAdj;
  const rating = Math.max(0, Math.min(100, Math.round(raw)));
  const sentHome = s.endReason === 'sent-home';
  const sum = k => s.records.reduce((a, r) => a + r[k], 0);
  const wrongAdmits = s.records.filter(r => !r.correct && r.verdict === 'admit');
  return {
    shiftId: s.def.id, decided, correct, wrong: decided - correct, total, walkouts: s.walkouts.length,
    unserved: total - decided - s.walkouts.length, accuracy, throughput, rating, target: s.def.target,
    passed: !sentHome && rating >= s.def.target, sentHome, endReason: s.endReason,
    tips: sum('tip'), fines: sum('fine'), citations: sum('citation'), bribes: sum('bribe'),
    bribeCount: s.records.filter(r => r.bribe > 0).length,
    streakBonuses: s.streakBonuses, bestStreak: s.bestStreak, earlyFinish: s.endReason === 'clear',
    incidentMoney: s.incidentMoney, incidentLog: s.incidentLog, outcomes: s.outcomes, flagInc: s.flagInc, flagSet: s.flagSet,
    fakesCaught: s.records.filter(r => r.correct && r.verdict === 'refuse' && r.judgement.violations.includes('forgery')).length,
    underageStopped: s.records.filter(r => r.correct && r.verdict === 'refuse' && r.judgement.violations.includes('age')).length,
    seriousMisses: wrongAdmits.filter(r => r.judgement.violations.some(v => ['age', 'forgery', 'identity', 'sober'].includes(v))).length,
    records: s.records,
  };
}

// Paychecks and living costs. computePaycheck() turns a shift summary into itemised lines;
// applyShiftResult() books it to the player along with stats, story outcomes and career standing.

import { PAY, CAREER } from './config.js';
import { VENUES } from './venues.js';
import { upkeep, owns } from './upgrades.js';

export function computePaycheck(result, player, def) {
  const venue = VENUES[def.venue];
  const lines = [];
  const add = (label, amount, kind, note = '') => { if (amount !== 0 || kind === 'wage') lines.push({ label, amount: Math.round(amount), kind, note }); };
  const wage = venue.wage + (owns(player, 'licence') ? 20 : 0);
  add(`Base wage — ${venue.name}`, result.sentHome ? wage * PAY.sentHomeWageFactor : wage, 'wage', result.sentHome ? 'halved: sent home early' : owns(player, 'licence') ? 'includes licence +$20' : '');
  add(`Correct calls (${result.correct} × $${PAY.perCorrect})`, result.correct * PAY.perCorrect, 'income');
  add('Tips', result.tips, 'income');
  add('Citation bonuses', result.citations, 'bonus');
  add(`Streak bonuses (${result.streakBonuses})`, result.streakBonuses * PAY.streakBonus, 'bonus');
  if (result.earlyFinish) add('Line cleared early', PAY.earlyFinishBonus, 'bonus');
  if (!result.sentHome && result.rating >= result.target + 15) add('Performance bonus', PAY.performanceBonus, 'bonus');
  add(`Fines (${result.wrong} mistake${result.wrong === 1 ? '' : 's'})`, -result.fines, 'fine');
  add(`Walkouts (${result.walkouts})`, -result.walkouts * PAY.walkoutDeduction, 'fine');
  add('Incidents', result.incidentMoney, result.incidentMoney < 0 ? 'fine' : 'bonus');
  if (result.bribes) add('Cash in hand', result.bribes, 'bribe', 'off the books');
  const u = upkeep(player);
  add('Rent', -u.housing, 'expense');
  add('Food', -PAY.food, 'expense');
  add('Transport', -u.transport, 'expense');
  if (def.transitStrike && player.transport === 'bus') add('Late (bus strike)', -10, 'expense', 'docked for arriving late');
  const net = lines.reduce((a, l) => a + l.amount, 0);
  return { lines, net, before: player.money, after: player.money + net };
}

export function applyShiftResult(player, result, pay, def) {
  player.money = pay.after;
  const st = player.stats;
  st.shifts += 1; st.correct += result.correct; st.wrong += result.wrong; st.walkouts += result.walkouts;
  st.tips += result.tips; st.fakesCaught += result.fakesCaught; st.underageStopped += result.underageStopped;
  st.earned += pay.lines.filter(l => l.amount > 0).reduce((a, l) => a + l.amount, 0);
  st.bestStreak = Math.max(st.bestStreak, result.bestStreak);
  const f = player.flags;
  f.outcomes = { ...(f.outcomes ?? {}), ...result.outcomes };
  for (const [k, v] of Object.entries(result.flagInc)) f[k] = (f[k] ?? 0) + v;
  Object.assign(f, result.flagSet);
  if (result.bribeCount) f.bribes_taken = (f.bribes_taken ?? 0) + result.bribeCount;
  if (def.id === 'lantern-finale') f.finale_passed = result.passed && result.seriousMisses === 0;
  if (!result.passed) player.warnings += 1;
  player.history.push({ shiftId: def.id, rating: result.rating, target: result.target, passed: result.passed, net: pay.net, money: player.money });
  if (player.warnings >= CAREER.maxWarnings) player.gameOver = 'fired';
  else if (player.money < CAREER.evictionDebt) player.gameOver = 'evicted';
  return player;
}

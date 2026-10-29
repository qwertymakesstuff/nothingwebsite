// One run of PUMPED: a market, a portfolio and the run's statistics. Pure logic, no DOM.

import { createMarket, stepMarket } from './market.js';
import * as P from './portfolio.js';

export const MODES = {
  sprint:  { label: 'Sprint',  ticks: 180, blurb: '3 minutes. Make as much as you can.' },
  session: { label: 'Session', ticks: 300, blurb: '5 minutes. The classic.' },
  endless: { label: 'Endless', ticks: 0,   blurb: 'No clock. Chase the biggest net worth you can, or go broke trying.' },
};

export const WORTH_EVERY = 2;   // net worth sampled every 2 ticks for the results chart
const WORTH_LEN = 1800;

export function createRun({ seed = 'PUMPED', mode = 'session', startCash = 1000, markets = ['main'], tuning = {}, leverage = false } = {}) {
  const market = createMarket({ seed, markets, tuning });
  const pf = P.createPortfolio(startCash);
  return {
    v: 1, seed: String(seed), mode, duration: (MODES[mode] || MODES.session).ticks,
    market, pf, over: false, end: null,
    selected: market.order.includes('MBYT') ? 'MBYT' : market.order[0],
    lev: 1, leverageOk: !!leverage,
    stats: {
      start: pf.cash, peak: pf.cash, low: pf.cash, trades: 0, buys: 0, sells: 0,
      bestTrade: 0, bestTradeT: null, bestPct: 0, worstTrade: 0, liquidations: 0, winners: 0, losers: 0,
      worth: [pf.cash], crashWatch: null, crashesSurvived: 0, maxPositions: 0, memeWins: 0,
    },
  };
}

export const priceFn = run => t => (run.market.assets[t] ? run.market.assets[t].p : 0);
export const worthOf = run => P.netWorth(run.pf, priceFn(run));

export function stepRun(run) {
  if (run.over) return [];
  const notes = stepMarket(run.market);
  const tick = run.market.tick;
  for (const tx of P.checkLiquidations(run.pf, priceFn(run), tick)) {
    run.stats.liquidations++;
    run.stats.losers++;
    notes.push({ type: 'liquidation', tx });
  }
  const w = worthOf(run);
  const s = run.stats;
  if (w > s.peak) s.peak = w;
  if (w < s.low) s.low = w;
  if (tick % WORTH_EVERY === 0) { s.worth.push(w); if (s.worth.length > WORTH_LEN) s.worth.shift(); }

  if (run.duration && tick >= run.duration) { endRun(run, 'time'); notes.push({ type: 'run_end', reason: 'time' }); }
  else if (P.isBankrupt(run.pf, priceFn(run))) { endRun(run, 'bankrupt'); notes.push({ type: 'run_end', reason: 'bankrupt' }); }
  return notes;
}

// order: { side: 'buy', t, amount, lev } or { side: 'sell', t, fraction | value }
export function trade(run, order) {
  if (run.over) return { ok: false, error: 'This run is over.' };
  const a = run.market.assets[order.t];
  if (!a) return { ok: false, error: 'Unknown asset.' };
  const tick = run.market.tick;
  const res = order.side === 'buy'
    ? P.buy(run.pf, { t: order.t, price: a.p, amount: order.amount, lev: order.lev || 1, tick })
    : P.sell(run.pf, { t: order.t, price: a.p, fraction: order.fraction ?? null, value: order.value ?? null, tick });
  if (!res.ok) return res;
  const s = run.stats, tx = res.tx;
  s.trades++;
  if (tx.side === 'buy') s.buys++;
  else {
    s.sells++;
    if (tx.pnl > s.bestTrade) { s.bestTrade = tx.pnl; s.bestTradeT = tx.t; }
    if (tx.pct > s.bestPct) s.bestPct = tx.pct;
    if (tx.pnl < s.worstTrade) s.worstTrade = tx.pnl;
    if (tx.pnl > 0) s.winners++; else if (tx.pnl < 0) s.losers++;
  }
  s.maxPositions = Math.max(s.maxPositions, Object.keys(run.pf.positions).length);
  const w = worthOf(run);
  if (w > s.peak) s.peak = w;
  if (w < s.low) s.low = w;
  if (P.isBankrupt(run.pf, priceFn(run))) endRun(run, 'bankrupt');
  return res;
}

export function endRun(run, reason) {
  if (run.over) return;
  run.over = true;
  run.end = { reason, tick: run.market.tick, worth: worthOf(run) };
}

// Endless mode: lock in the result (positions are valued at the current price).
export function cashOut(run) {
  P.sellAll(run.pf, priceFn(run), run.market.tick);
  endRun(run, 'cashout');
}

export const timeLeft = run => (run.duration ? Math.max(0, run.duration - run.market.tick) : Infinity);

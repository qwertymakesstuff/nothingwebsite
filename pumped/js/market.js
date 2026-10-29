// The simulated market. Pure logic, no DOM: everything lives in one plain JSON object that can be
// saved and reloaded, and every random draw comes from the seeded stream in rng.js, so the same
// seed always plays out the same market (as long as the same events are forced).
//
// Each asset has a price and a hidden "fair value" (both in log units). Every tick:
//   fair value drifts (category drift + regime + news) with a little noise
//   price = previous price + short-term trend (an OU process) + noise
//           + pull back towards fair value (switched off while pumping or crashing)
//           + pump / crash / news shock terms
// Pumps and crashes push price away from fair value. When a pump ends its fate decides what
// happens next: 'moon' keeps most of the gain (fair value moves up), 'fade' slowly gives it back,
// 'rug' collapses at once. Crashes either 'recover' (price drifts back to fair) or are
// 'permanent' (fair value drops too).

import { createRng, hashSeed } from './rng.js';
import { CATS, ASSET_BY_T, ANCHOR, assetsFor } from './assets.js';
import { EVENTS, EVENT_BY_ID, CAST, fillTemplate } from './events.js';

export const HIST_LEN = 900;      // full-resolution ticks kept per asset (15 minutes)
export const LONG_EVERY = 10;     // every 10th tick also goes into the long history
export const LONG_LEN = 1500;     // long history points kept (~4 hours)
export const MIN_PRICE = 1e-9;
export const MAX_PRICE = 1e12;
export const NEWS_LEN = 60;
const LOG_MIN = Math.log(MIN_PRICE);
const LOG_MAX = Math.log(MAX_PRICE);
const TIER_MUL = { mini: 1, big: 1.7, mega: 2.6, moonshot: 5 };

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export function createMarket({ seed = 'PUMPED', markets = ['main'], tuning = {} } = {}) {
  const rng = createRng(hashSeed(seed));
  const assets = {};
  const order = [];
  for (const d of assetsFor(markets)) {
    const jitter = d.stable ? 0 : rng.range(-0.15, 0.15);  // runs start from slightly different prices
    const logP = Math.log(d.price) + jitter;
    const p = Math.exp(logP);
    assets[d.t] = {
      t: d.t, logP, p, open: p, high: p, low: p, base: logP,
      logFair: d.stable ? Math.log(d.price) : logP + rng.gauss() * 0.03,
      trend: 0, shock: 0, hype: CATS[d.cat].hypeable && !d.stable ? Math.round(rng.range(0, 25)) : 0,
      pump: null, crash: null, vol: null, drift: null,
      hist: [p], long: [p],
    };
    order.push(d.t);
  }
  return {
    v: 1, seed: String(seed), rngState: rng.state, tick: 0, markets: [...markets],
    tuning: { events: 1, pumps: 1, crashes: 1, vol: 1, regimes: 1, ...tuning },
    assets, order, pending: [], news: [], newsId: 0,
    nextEventIn: rng.int(4, 9),
    regime: null, nextRegimeIn: rng.int(70, 140),
    sentiment: 50,
  };
}

// ── Regimes (market-wide special events) ─────────────────────────────────────
// Filled in by regimes.js; the market only needs to know how a regime changes each category.
let REGIMES = {};
export function registerRegimes(table) { REGIMES = table; }

function regimeMods(m, cat) {
  const r = m.regime && REGIMES[m.regime.id];
  const mods = r && (r.cats[cat] || r.cats.all);
  return { vol: 1, drift: 0, pump: 1, crash: 1, ...(r && r.cats.all), ...mods };
}

// ── Stepping ─────────────────────────────────────────────────────────────────
export function stepMarket(m) {
  const rng = createRng(m.rngState);
  const notes = [];
  m.tick++;

  stepRegime(m, rng, notes);

  for (let i = 0; i < m.pending.length; i++) {
    const p = m.pending[i];
    if (p.due <= m.tick) { m.pending.splice(i--, 1); resolvePending(m, p, rng, notes); }
  }

  if (m.tuning.events > 0 && --m.nextEventIn <= 0) {
    fireEvent(m, pickEvent(m, rng), null, rng, notes);
    m.nextEventIn = Math.max(2, Math.round(rng.int(8, 16) / m.tuning.events));
  }

  for (const t of m.order) stepAsset(m, m.assets[t], rng, notes);
  updateSentiment(m);
  m.rngState = rng.state;
  return notes;
}

function stepAsset(m, a, rng, notes) {
  const d = ASSET_BY_T[a.t], c = CATS[d.cat];
  const R = regimeMods(m, d.cat);
  const sigma = c.sigma * d.volMul * R.vol * (a.vol ? a.vol.mul : 1) * m.tuning.vol;

  // fair value
  if (d.stable) a.logFair = Math.log(d.price);
  else {
    const base = a.base + (c.fairDrift + d.driftAdd) * m.tick;
    a.logFair += c.fairDrift + d.driftAdd + R.drift + (a.drift ? a.drift.add : 0) + ANCHOR * (base - a.logFair)
      + c.fairVol * d.volMul * rng.gauss();
  }

  // short-term trend + noise
  a.trend = a.trend * 0.96 + sigma * 0.07 * rng.gauss();
  let r = a.trend + sigma * rng.gauss();
  if (a.shock) { r += a.shock; a.shock = 0; }

  if (a.pump) {
    const p = a.pump;
    const ramp = p.ticks < 3 ? 0.5 + p.ticks * 0.2 : 1;   // pumps start gently, so you can catch them
    const step = p.str * ramp * (0.4 + 1.2 * rng.next());
    r += step; p.gain += step; p.ticks++;
    if (c.hypeable && !d.stable) a.hype += 1.2 * TIER_MUL[p.tier];
    if (p.ticks >= p.len || p.gain >= c.pumpCap * (p.tier === 'moonshot' ? 1.5 : 1)) endPump(m, a, rng, notes);
  } else if (a.crash) {
    const k = a.crash;
    const step = k.str * (0.5 + rng.next());
    r -= step; k.lost += step; k.ticks++;
    if (k.ticks >= k.len) {
      if (k.fate === 'permanent') a.logFair -= k.lost * rng.range(0.5, 0.9);
      notes.push({ type: 'crash_end', t: a.t, fate: k.fate, lost: k.lost });
      a.crash = null;
    }
  } else {
    r += c.revert * (a.logFair - a.logP);
    const hype = a.hype || 0;
    const overheat = Math.max(0, hype - 75) / 25;                 // 0..1 above 75 hype
    const pumpP = c.pump * d.pumpMul * R.pump * m.tuning.pumps * (1 + hype / 45);
    const crashP = c.crash * d.crashMul * R.crash * m.tuning.crashes * (1 + overheat * 6);
    if (rng.chance(pumpP)) startPump(m, a, rng, notes, { cause: 'spontaneous' });
    else if (rng.chance(crashP)) startCrash(m, a, rng, notes, { cause: overheat > 0.3 ? 'overheated' : 'spontaneous' });
  }

  // rare assets: occasional giant gaps either way
  if (c.jump && rng.chance(c.jump * m.tuning.pumps)) {
    const up = rng.chance(0.5);
    const j = (up ? 1 : -1) * rng.range(0.3, 0.9);
    r += j; a.logFair += j * 0.5;
    notes.push({ type: 'jump', t: a.t, size: j });
  }

  r = clamp(r, -2.5, 1.2);
  a.logP = clamp(a.logP + r, LOG_MIN, LOG_MAX);
  a.logFair = clamp(a.logFair, LOG_MIN + 2, LOG_MAX - 2);

  // hype cools off and follows price action
  if (c.hypeable && !d.stable) {
    if (r > 2.5 * sigma) a.hype += 1; else if (r < -2.5 * sigma) a.hype -= 1.5;
    a.hype = clamp(a.hype * 0.985, 0, 100);
  }

  if (a.vol && --a.vol.ticks <= 0) a.vol = null;
  if (a.drift && --a.drift.ticks <= 0) a.drift = null;

  const p = Math.max(MIN_PRICE, Math.exp(a.logP));
  a.p = p;
  if (p > a.high) a.high = p;
  if (p < a.low) a.low = p;
  a.hist.push(p);
  if (a.hist.length > HIST_LEN + 1) a.hist.shift();
  if (m.tick % LONG_EVERY === 0) { a.long.push(p); if (a.long.length > LONG_LEN) a.long.shift(); }
}

export function startPump(m, a, rng, notes, { mul = 1, len = null, fates = null, cause = 'spontaneous' } = {}) {
  const d = ASSET_BY_T[a.t], c = CATS[d.cat];
  if (d.pumpMul === 0 && cause === 'spontaneous') return;
  const wild = ['degen', 'rare'].includes(d.cat);
  const tier = rng.weighted([['mini', 0.6], ['big', 0.3], ['mega', 0.1], ['moonshot', wild ? 0.035 : 0]]);
  const hypeMul = 1 + (a.hype || 0) / 150;
  const str = rng.range(c.pumpStr[0], c.pumpStr[1]) * TIER_MUL[tier] * mul * hypeMul;
  const n = rng.int(...(len || c.pumpLen));
  let w = { ...c.fates, ...fates };
  const overheat = Math.max(0, (a.hype || 0) - 75) / 25;
  if (overheat > 0) w = { ...w, rug: w.rug + overheat * 0.35 };  // overheated pumps end badly more often
  const fate = rng.weighted(Object.entries(w));
  if (a.pump) {               // already pumping: the pump gets longer and stronger
    a.pump.len += Math.ceil(n / 2);
    a.pump.str = Math.max(a.pump.str, str);
    if (fates) a.pump.fate = fate;
    return;
  }
  a.crash = null;             // a pump can cut a crash short
  a.pump = { str, len: n, ticks: 0, gain: 0, fate, tier, cause };
  notes.push({ type: 'pump_start', t: a.t, tier, cause });
}

export function startCrash(m, a, rng, notes, { mul = 1, len = null, fate = null, cause = 'spontaneous' } = {}) {
  const c = CATS[ASSET_BY_T[a.t].cat];
  if (a.pump) a.pump = null;  // the pump is over, whatever it was going to do
  const str = rng.range(c.crashStr[0], c.crashStr[1]) * mul;
  const n = rng.int(...(len || c.crashLen));
  const f = fate || rng.weighted([['recover', 0.55], ['permanent', 0.45]]);
  if (a.crash) { a.crash.len += Math.ceil(n / 2); a.crash.str = Math.max(a.crash.str, str); return; }
  a.crash = { str, len: n, ticks: 0, lost: 0, fate: f, cause };
  notes.push({ type: 'crash_start', t: a.t, cause });
}

function endPump(m, a, rng, notes) {
  const p = a.pump;
  a.pump = null;
  if (p.fate === 'moon') a.logFair = Math.max(a.logFair, a.logFair + p.gain * rng.range(0.5, 0.85));
  else if (p.fate === 'fade') a.logFair += p.gain * rng.range(0, 0.2);
  else if (p.fate === 'rug') {
    const n = rng.int(2, 4);
    a.crash = { str: (p.gain * rng.range(0.8, 1.1)) / n, len: n, ticks: 0, lost: 0, fate: 'recover', cause: 'rug' };
    a.hype = Math.max(0, (a.hype || 0) - 35);
    notes.push({ type: 'rug', t: a.t, gain: p.gain });
  }
  notes.push({ type: 'pump_end', t: a.t, fate: p.fate, gain: p.gain });
}

// ── News ─────────────────────────────────────────────────────────────────────
function pickEvent(m, rng) {
  const pool = EVENTS.filter(e => candidates(m, e).length > 0);
  const regime = m.regime && REGIMES[m.regime.id];
  return rng.weighted(pool.map(e => [e, e.weight * ((regime && regime.events && regime.events[e.id]) || 1)]));
}

function candidates(m, ev) {
  return m.order.filter(t => {
    const d = ASSET_BY_T[t];
    if (ev.only) return ev.only.includes(t);
    if (d.stable) return false;             // the stablecoin only reacts to its own events
    if (ev.exclude && ev.exclude.includes(t)) return false;
    return !ev.cats || ev.cats.includes(d.cat);
  });
}

function castVars(rng) {
  const v = { n: rng.int(6, 60) };
  for (const k of Object.keys(CAST)) v[k] = rng.pick(CAST[k]);
  return v;
}

// the people a headline names (so Chirper can have them post about it)
function castUsed(tmpl, vars) {
  const out = {};
  for (const k of Object.keys(CAST)) if (tmpl.includes(`{${k}}`)) out[k] = vars[k];
  return out;
}

function pushNews(m, h, notes) {
  m.news.unshift(h);
  if (m.news.length > NEWS_LEN) m.news.length = NEWS_LEN;
  notes.push({ type: 'headline', headline: h });
}

export function fireEvent(m, ev, forcedT, rng, notes) {
  if (!ev) return null;
  const list = ev.target === 'all' ? m.order.filter(t => !ASSET_BY_T[t].stable) : candidates(m, ev);
  if (!list.length) return null;
  const vars = castVars(rng);
  let tickers;
  if (ev.target === 'asset') {
    const t = forcedT && list.includes(forcedT) ? forcedT : rng.pick(list);
    tickers = [t];
    vars.t = t; vars.name = ASSET_BY_T[t].name;
  } else {
    tickers = list;
    vars.t = vars.name = 'the market';
  }
  const tmpl = rng.pick(ev.text);
  const h = { id: ++m.newsId, tick: m.tick, text: fillTemplate(tmpl, vars), tickers: ev.target === 'asset' ? tickers : [], scope: ev.target, cats: ev.cats || null, tone: ev.tone, kind: ev.id, cast: castUsed(tmpl, vars) };
  for (const t of tickers) {
    const a = m.assets[t];
    if (ev.target === 'all' && ASSET_BY_T[t].cat === 'safe' && ev.safeBonus) { a.shock += rng.range(...ev.safeBonus); continue; }
    applyEffect(m, a, ev.effect, rng, notes, ev.target === 'asset' ? 1 : rng.range(0.6, 1.2), ev.id);
  }
  if (ev.pending) {
    const truth = rng.chance(ev.pending.truth);
    m.pending.push({ due: m.tick + rng.int(...ev.pending.in), ev: ev.id, t: tickers[0], vars, truth, parent: h.id });
    h.pending = true;
  }
  pushNews(m, h, notes);
  return h;
}

function resolvePending(m, p, rng, notes) {
  const ev = EVENT_BY_ID[p.ev];
  if (!ev || !m.assets[p.t]) return;
  const branch = p.truth ? ev.pending.yes : ev.pending.no;
  const h = { id: ++m.newsId, tick: m.tick, text: fillTemplate(branch.text, p.vars), tickers: [p.t], scope: 'asset', tone: branch.tone, kind: p.ev + (p.truth ? '_yes' : '_no'), followUp: p.parent, cast: castUsed(branch.text, p.vars) };
  const parent = m.news.find(n => n.id === p.parent);
  if (parent) parent.resolved = p.truth ? 'yes' : 'no';
  applyEffect(m, m.assets[p.t], branch.effect, rng, notes, 1, h.kind);
  pushNews(m, h, notes);
}

export function applyEffect(m, a, eff, rng, notes, scale = 1, cause = 'news') {
  if (!eff) return;
  if (eff.odds !== undefined && !rng.chance(eff.odds)) return;
  const d = ASSET_BY_T[a.t];
  if (eff.shock) a.shock += rng.range(...eff.shock) * scale;
  if (eff.fair && !d.stable) a.logFair += rng.range(...eff.fair) * scale;
  if (eff.hype && CATS[d.cat].hypeable && !d.stable) a.hype = clamp((a.hype || 0) + eff.hype * scale, 0, 100);
  if (eff.vol) a.vol = { mul: Math.max(eff.vol[0], a.vol ? a.vol.mul : 0), ticks: eff.vol[1] };
  if (eff.drift) a.drift = { add: eff.drift[0], ticks: eff.drift[1] };
  if (eff.pump) startPump(m, a, rng, notes, { mul: eff.pump.mul * scale, len: eff.pump.len, fates: eff.pump.fates, cause });
  if (eff.crash) startCrash(m, a, rng, notes, { mul: eff.crash.mul * scale, len: eff.crash.len, fate: eff.crash.fate, cause });
}

// For testing and debugging: fire a specific event (optionally on a specific asset) right now.
export function forceEvent(m, id, t = null) {
  const rng = createRng(m.rngState);
  const notes = [];
  const h = fireEvent(m, EVENT_BY_ID[id], t, rng, notes);
  m.rngState = rng.state;
  return { headline: h, notes };
}

export function forcePump(m, t, opts = {}) {
  const rng = createRng(m.rngState);
  const notes = [];
  startPump(m, m.assets[t], rng, notes, { cause: 'forced', ...opts });
  m.rngState = rng.state;
  return notes;
}

export function forceCrash(m, t, opts = {}) {
  const rng = createRng(m.rngState);
  const notes = [];
  startCrash(m, m.assets[t], rng, notes, { cause: 'forced', ...opts });
  m.rngState = rng.state;
  return notes;
}

// ── Regime stepping (the table itself lives in regimes.js) ──────────────────
function stepRegime(m, rng, notes) {
  if (!Object.keys(REGIMES).length || !(m.tuning.regimes > 0)) return;
  if (m.regime) {
    const r = REGIMES[m.regime.id];
    m.regime.left--;
    if (r && r.onTick) r.onTick(m, rng, notes, { startPump, startCrash, fireEvent, applyEffect });
    if (m.regime.left <= 0) {
      notes.push({ type: 'regime_end', id: m.regime.id });
      m.regime = null;
      m.nextRegimeIn = Math.round(rng.int(90, 180) / m.tuning.regimes);
    }
    return;
  }
  if (--m.nextRegimeIn > 0) return;
  const pool = Object.values(REGIMES).filter(r => !r.markets || r.markets.some(x => m.markets.includes(x)));
  startRegime(m, rng.weighted(pool.map(r => [r.id, r.weight])), rng, notes);
}

export function startRegime(m, id, rng, notes) {
  const r = REGIMES[id];
  if (!r) return;
  m.regime = { id, left: rng.int(...r.len), total: 0 };
  m.regime.total = m.regime.left;
  if (r.onStart) r.onStart(m, rng, notes, { startPump, startCrash, fireEvent, applyEffect });
  notes.push({ type: 'regime_start', id });
  pushNews(m, { id: ++m.newsId, tick: m.tick, text: r.headline, tickers: [], scope: 'regime', tone: r.tone, kind: 'regime_' + id, regime: id }, notes);
}

export function forceRegime(m, id) {
  const rng = createRng(m.rngState);
  const notes = [];
  if (m.regime) m.regime = null;
  startRegime(m, id, rng, notes);
  m.rngState = rng.state;
  return notes;
}

// ── Sentiment: a fear & greed reading from recent moves, hype and the regime ──
function updateSentiment(m) {
  let sum = 0, n = 0, hype = 0, hn = 0;
  for (const t of m.order) {
    const a = m.assets[t];
    if (ASSET_BY_T[t].stable) continue;
    const h = a.hist, back = h[Math.max(0, h.length - 21)];
    sum += Math.log(h[h.length - 1] / back); n++;
    if (CATS[ASSET_BY_T[t].cat].hypeable) { hype += a.hype; hn++; }
  }
  const avg = n ? sum / n : 0;
  const r = m.regime && REGIMES[m.regime.id];
  const target = clamp(50 + avg * 450 + (hn ? (hype / hn - 25) * 0.4 : 0) + (r ? r.tone * 12 : 0), 0, 100);
  m.sentiment = m.sentiment + (target - m.sentiment) * 0.15;
}

// ── Reading prices ───────────────────────────────────────────────────────────
export const price = (m, t) => m.assets[t].p;

// price `ticks` ago (or the opening price if the history doesn't go back that far)
export function priceAgo(m, t, ticks) {
  const a = m.assets[t];
  if (ticks <= a.hist.length - 1) return a.hist[a.hist.length - 1 - ticks];
  const li = Math.floor((m.tick - ticks) / LONG_EVERY) - (Math.floor(m.tick / LONG_EVERY) - (a.long.length - 1));
  return li >= 0 && li < a.long.length ? a.long[li] : a.open;
}

export function changePct(m, t, ticks = null) {
  const a = m.assets[t];
  const base = ticks == null ? a.open : priceAgo(m, t, ticks);
  return base > 0 ? (a.p / base - 1) * 100 : 0;
}

// Points for the chart. range = number of ticks, or 'all'. Returns { points, step } where step is
// the number of ticks between points.
export function series(m, t, range) {
  const a = m.assets[t];
  if (range !== 'all' && range <= HIST_LEN) return { points: a.hist.slice(-(range + 1)), step: 1 };
  if (m.tick <= HIST_LEN) return { points: a.hist.slice(), step: 1 };
  const pts = a.long.slice();
  if (m.tick % LONG_EVERY) pts.push(a.p);
  return { points: pts, step: LONG_EVERY };
}

export function sentimentLabel(v) {
  return v < 20 ? 'Extreme fear' : v < 40 ? 'Fear' : v < 60 ? 'Neutral' : v < 80 ? 'Greed' : 'Extreme greed';
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../pumped/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const M = await load('market.js');
const P = await load('portfolio.js');
const G = await load('game.js');
const { ASSETS, ASSET_BY_T, CATS } = await load('assets.js');
const { EVENTS } = await load('events.js');
const SV = await load('save.js');
const F = await load('format.js');

const root = new URL('../../pumped/', import.meta.url).pathname;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)), `${a} ≈ ${b}`);

test('pumped: every module has valid syntax', () => {
  const files = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
  for (const f of files(path.join(root, 'js'))) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('pumped: assets are complete and tickers unique', () => {
  assert.equal(new Set(ASSETS.map(a => a.t)).size, ASSETS.length);
  for (const a of ASSETS) {
    assert.ok(a.name && a.bio && a.price > 0 && CATS[a.cat], a.t);
  }
  for (const cat of Object.keys(CATS)) assert.ok(ASSETS.some(a => a.cat === cat && a.market === 'main'), `main market has ${cat}`);
});

test('pumped: the same seed gives the same market', () => {
  const a = M.createMarket({ seed: 'SAME' }), b = M.createMarket({ seed: 'SAME' }), c = M.createMarket({ seed: 'OTHER' });
  for (let i = 0; i < 400; i++) { M.stepMarket(a); M.stepMarket(b); M.stepMarket(c); }
  assert.deepEqual(a, b);
  assert.notEqual(a.assets.MBYT.p, c.assets.MBYT.p);
});

test('pumped: prices stay positive and finite over long, extreme runs', () => {
  for (const seed of ['X1', 'X2', 'X3']) {
    const m = M.createMarket({ seed, markets: ['main', 'orbit', 'night'], tuning: { pumps: 4, crashes: 4, events: 3, vol: 3 } });
    for (let i = 0; i < 3000; i++) M.stepMarket(m);
    for (const t of m.order) {
      const a = m.assets[t];
      assert.ok(Number.isFinite(a.p) && a.p >= M.MIN_PRICE && a.p <= M.MAX_PRICE, `${t} ${a.p}`);
      assert.ok(a.hist.every(v => v > 0 && Number.isFinite(v)));
      assert.ok(a.hist.length <= M.HIST_LEN + 1 && a.long.length <= M.LONG_LEN);
      assert.ok(a.hype >= 0 && a.hype <= 100);
    }
  }
});

test('pumped: markets move both ways: rises, falls, pumps, crashes and news all happen', () => {
  let up = 0, down = 0, pumps = 0, crashes = 0, heads = 0, rugs = 0;
  for (let s = 0; s < 20; s++) {
    const m = M.createMarket({ seed: 'MIX' + s });
    for (let i = 0; i < 300; i++) for (const n of M.stepMarket(m)) {
      if (n.type === 'pump_start') pumps++;
      if (n.type === 'crash_start') crashes++;
      if (n.type === 'rug') rugs++;
      if (n.type === 'headline') heads++;
    }
    for (const t of m.order) { const r = m.assets[t].p / m.assets[t].open; if (r > 1.02) up++; if (r < 0.98) down++; }
  }
  assert.ok(up > 50 && down > 50, `up ${up} down ${down}`);
  assert.ok(pumps / 20 > 8 && pumps / 20 < 60, `pumps per run ${pumps / 20}`);
  assert.ok(crashes > 0 && rugs > 0 && heads / 20 > 15);
});

test('pumped: forced pumps raise the price, forced crashes lower it', () => {
  const m = M.createMarket({ seed: 'FORCE', tuning: { events: 0, pumps: 0, crashes: 0 } });
  const p0 = m.assets.GOB.p;
  M.forcePump(m, 'GOB', { mul: 3, len: [10, 10], fates: { moon: 1, fade: 0, rug: 0 } });
  for (let i = 0; i < 10; i++) M.stepMarket(m);
  assert.ok(m.assets.GOB.p > p0 * 1.2, `pumped ${m.assets.GOB.p / p0}`);
  const p1 = m.assets.MBYT.p;
  M.forceCrash(m, 'MBYT', { mul: 2, len: [6, 6] });
  for (let i = 0; i < 6; i++) M.stepMarket(m);
  assert.ok(m.assets.MBYT.p < p1 * 0.85, `crashed ${m.assets.MBYT.p / p1}`);
});

test('pumped: every news event can fire and pending stories resolve', () => {
  const m = M.createMarket({ seed: 'NEWS', tuning: { events: 0 } });
  for (const e of EVENTS) {
    const { headline } = M.forceEvent(m, e.id);
    assert.ok(headline && headline.text && !headline.text.includes('{'), e.id);
  }
  for (let i = 0; i < 30; i++) M.stepMarket(m);
  assert.equal(m.pending.length, 0);
  assert.ok(m.news.some(n => n.followUp));
  assert.ok(m.news.filter(n => n.pending).every(n => n.resolved));
});

test('pumped: buying and selling update cash, positions and P/L exactly', () => {
  const pf = P.createPortfolio(1000);
  let r = P.buy(pf, { t: 'AAA', price: 10, amount: 500 });
  assert.ok(r.ok);
  assert.equal(pf.cash, 500);
  const pos = pf.positions.AAA;
  near(pos.qty, (500 / 1.001) / 10);
  near(P.netWorth(pf, () => 10), 500 + 500 / 1.001);
  // price doubles: sell everything
  r = P.sell(pf, { t: 'AAA', price: 20, fraction: 1 });
  assert.ok(r.ok);
  const gross = (500 / 1.001) / 10 * 20;
  near(pf.cash, Math.round((500 + gross * 0.999) * 100) / 100, 1e-9);
  near(r.tx.pnl, Math.round(gross * 0.999 * 100) / 100 - 500, 1e-9);
  assert.ok(!pf.positions.AAA);
  near(pf.realized, r.tx.pnl);
});

test('pumped: insufficient cash, overselling and bad input are rejected without side effects', () => {
  const pf = P.createPortfolio(100);
  const before = JSON.stringify(pf);
  for (const amount of [100.01, 1e9, -5, 0, NaN, 'abc', 0.5]) assert.equal(P.buy(pf, { t: 'A', price: 1, amount }).ok, false, String(amount));
  assert.equal(P.buy(pf, { t: 'A', price: 0, amount: 10 }).ok, false);
  assert.equal(P.sell(pf, { t: 'A', price: 1, fraction: 0.5 }).ok, false);
  assert.equal(JSON.stringify(pf), before);
  assert.ok(P.buy(pf, { t: 'A', price: 2, amount: 50 }).ok);
  const snap = JSON.stringify(pf);
  assert.equal(P.sell(pf, { t: 'A', price: 2, fraction: 1.5 }).ok, false);
  assert.equal(P.sell(pf, { t: 'A', price: 2, value: 1000 }).ok, false);
  assert.equal(P.sell(pf, { t: 'A', price: 2, value: -1 }).ok, false);
  assert.equal(JSON.stringify(pf), snap);
});

test('pumped: hundreds of rapid trades keep the books balanced', () => {
  const run = G.createRun({ seed: 'RAPID', mode: 'endless' });
  let cashFlow = run.pf.cash;
  for (let i = 0; i < 600; i++) {
    const t = run.market.order[i % run.market.order.length];
    const r = i % 3 === 2 ? G.trade(run, { side: 'sell', t, fraction: 0.5 }) : G.trade(run, { side: 'buy', t, amount: Math.min(run.pf.cash, 7.77) });
    if (r.ok) cashFlow += r.tx.side === 'buy' ? -r.tx.amount : r.tx.amount;
    if (i % 10 === 0) G.stepRun(run);
    assert.ok(run.pf.cash >= 0);
  }
  near(run.pf.cash, cashFlow, 1e-6);
  for (const p of Object.values(run.pf.positions)) assert.ok(p.qty > 0 && p.cost > 0);
  // realized + unrealized = net worth change
  const w = G.worthOf(run);
  near(run.pf.realized + P.unrealized(run.pf, G.priceFn(run)), w - run.stats.start, 1e-6);
});

test('pumped: leverage amplifies and liquidates', () => {
  const pf = P.createPortfolio(1000);
  assert.ok(P.buy(pf, { t: 'L', price: 100, amount: 100, lev: 10 }).ok);
  const pos = pf.positions.L;
  near(pos.qty * 100, (100 / 1.01) * 10);
  assert.equal(P.buy(pf, { t: 'L', price: 100, amount: 10, lev: 2 }).ok, false); // leverage must match
  // +5% price → about +50% on the margin
  const eq = P.equityOf(pos, 105);
  assert.ok(eq > 100 / 1.01 * 1.45 && eq < 100 / 1.01 * 1.55);
  const liq = P.liqPrice(pos);
  assert.ok(liq > 90 && liq < 92, `liq ${liq}`);
  assert.equal(P.checkLiquidations(pf, () => liq * 1.01).length, 0);
  const out = P.checkLiquidations(pf, () => liq * 0.99, 5);
  assert.equal(out.length, 1);
  assert.ok(!pf.positions.L);
  near(out[0].pnl, -100);
  assert.equal(pf.cash, 900);
  // equity never goes negative, even on a gap through the liquidation price
  P.buy(pf, { t: 'G', price: 100, amount: 100, lev: 50 });
  assert.equal(P.equityOf(pf.positions.G, 1), 0);
  assert.ok(P.netWorth(pf, () => 1) >= 0);
});

test('pumped: bankruptcy ends the run', () => {
  const run = G.createRun({ seed: 'BROKE', mode: 'endless', tuning: { events: 0 } });
  assert.ok(G.trade(run, { side: 'buy', t: 'GOB', amount: 1000, lev: 1 }).ok);
  run.market.assets.GOB.logP = Math.log(M.MIN_PRICE);
  run.market.assets.GOB.p = M.MIN_PRICE;
  run.market.assets.GOB.logFair = Math.log(M.MIN_PRICE) + 2;
  G.stepRun(run);
  assert.ok(run.over);
  assert.equal(run.end.reason, 'bankrupt');
  assert.equal(G.trade(run, { side: 'buy', t: 'MBYT', amount: 1 }).ok, false);
});

test('pumped: timed sessions end on time', () => {
  const run = G.createRun({ seed: 'TIME', mode: 'sprint' });
  let ends = 0;
  for (let i = 0; i < 400 && !run.over; i++) ends += G.stepRun(run).filter(n => n.type === 'run_end').length;
  assert.equal(run.market.tick, G.MODES.sprint.ticks);
  assert.equal(ends, 1);
  assert.equal(run.end.reason, 'time');
});

test('pumped: runs survive save and reload, and keep playing identically', () => {
  const storage = SV.memoryStorage();
  const store = new SV.Store(storage);
  const run = G.createRun({ seed: 'SAVE', mode: 'endless' });
  for (let i = 0; i < 1200; i++) G.stepRun(run);
  G.trade(run, { side: 'buy', t: 'CORN', amount: 250 });
  assert.ok(store.saveRun(run));
  const back = store.loadRun();
  assert.ok(back);
  assert.equal(back.pf.cash, run.pf.cash);
  assert.deepEqual(back.pf.positions, run.pf.positions);
  for (let i = 0; i < 50; i++) { G.stepRun(run); G.stepRun(back); }
  near(back.market.assets.CORN.p, run.market.assets.CORN.p, 1e-5);
  assert.equal(back.market.tick, run.market.tick);
});

test('pumped: corrupt saves are ignored, meta falls back to defaults', () => {
  const storage = SV.memoryStorage();
  const store = new SV.Store(storage);
  storage.setItem(SV.KEYS.run, '{not json');
  storage.setItem(SV.KEYS.meta, '[]');
  assert.equal(store.loadRun(), null);
  assert.deepEqual(store.loadMeta(), SV.defaultMeta());
  storage.setItem(SV.KEYS.run, JSON.stringify({ v: 1, market: { tick: 3, order: ['NOPE'], assets: {}, rngState: 1 }, pf: { cash: 1 }, stats: {} }));
  assert.equal(store.loadRun(), null);
  const run = G.createRun({ seed: 'C' });
  run.pf.cash = -5;
  storage.setItem(SV.KEYS.run, JSON.stringify(run));
  assert.equal(store.loadRun(), null);
  const meta = SV.sanitizeMeta({ clout: -3, settings: { volume: 9, speed: 7, sound: 'yes' }, watch: ['GOB', 'FAKE', 'GOB'], scores: { session: [{ worth: 'x' }, { worth: 5000, seed: 'A' }] } });
  assert.equal(meta.clout, 0);
  assert.equal(meta.settings.volume, 1);
  assert.equal(meta.settings.speed, 1);
  assert.equal(meta.settings.sound, true);
  assert.deepEqual(meta.watch, ['GOB']);
  assert.equal(meta.scores.session.length, 1);
});

test('pumped: high scores are sorted and capped', () => {
  const meta = SV.defaultMeta();
  for (let i = 0; i < 15; i++) SV.addScore(meta, 'session', { worth: i * 100, peak: i * 100, date: 0, seed: 'S', reason: 'time' });
  assert.equal(meta.scores.session.length, SV.SCORES_KEPT);
  assert.equal(meta.scores.session[0].worth, 1400);
  assert.equal(SV.addScore(meta, 'session', { worth: 1, peak: 1, date: 0, seed: 'S', reason: 'time' }), -1);
  assert.equal(SV.addScore(meta, 'session', { worth: 99999, peak: 1, date: 0, seed: 'S', reason: 'time' }), 0);
});

test('pumped: number formatting', () => {
  assert.equal(F.money(1234.5), '$1,234.50');
  assert.equal(F.money(-3), '-$3.00');
  assert.equal(F.money(12, { sign: true }), '+$12.00');
  assert.equal(F.price(41250.1), '41,250.10');
  assert.equal(F.price(0.0423), '0.0423');
  assert.equal(F.price(1e-7), '1.00e-7');
  assert.equal(F.price(0.000083), '0.0000830');
  assert.equal(F.pct(-1.5), '−1.50%');
  assert.equal(F.clock(185), '3:05');
});

test('pumped: the page wires up its scripts and ids', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<script type="module" src="js\/main\.js">/);
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8') + fs.readFileSync(path.join(root, 'js/chirper-ui.js'), 'utf8');
  const made = new Set([...main.matchAll(/id: '([A-Za-z]+)'/g)].map(m => m[1]));  // created by the script
  for (const id of new Set([...main.matchAll(/\$\('#([A-Za-z]+)'\)/g)].map(m => m[1]))) if (!made.has(id)) assert.match(html, new RegExp(`id="${id}"`), `#${id} missing from index.html`);
});

// ── Phase 2: regimes, progression ────────────────────────────────────────────
const PG = await load('progression.js');
const { REGIMES } = await load('regimes.js');

test('pumped: every regime starts, changes the market and ends', () => {
  for (const id of Object.keys(REGIMES)) {
    const m = M.createMarket({ seed: 'REG' + id });
    const notes = M.forceRegime(m, id);
    assert.ok(notes.some(n => n.type === 'regime_start' && n.id === id));
    assert.equal(m.news[0].regime, id);
    let ended = false;
    for (let i = 0; i < 200 && !ended; i++) ended = M.stepMarket(m).some(n => n.type === 'regime_end');
    assert.ok(ended, id);
  }
  // flash crash knocks most of the market down at once; safe assets don't crash
  const m = M.createMarket({ seed: 'FLASH', tuning: { events: 0 } });
  M.forceRegime(m, 'flash');
  const crashing = m.order.filter(t => m.assets[t].crash);
  assert.ok(crashing.length > m.order.length / 2);
  assert.ok(crashing.every(t => ASSET_BY_T[t].cat !== 'safe'));
});

test('pumped: bull runs lift and bear markets sink the market on average', () => {
  const avg = id => {
    let sum = 0, n = 0;
    for (let s = 0; s < 12; s++) {
      const m = M.createMarket({ seed: id + s, tuning: { regimes: 0 } });
      if (id !== 'none') M.forceRegime(m, id);
      m.regime && (m.regime.left = 60);
      for (let i = 0; i < 60; i++) M.stepMarket(m);
      for (const t of m.order) if (ASSET_BY_T[t].cat !== 'safe') { sum += Math.log(m.assets[t].p / m.assets[t].open); n++; }
    }
    return sum / n;
  };
  const bull = avg('bull'), bear = avg('bear'), none = avg('none');
  assert.ok(bull > none && none > bear, `bull ${bull} none ${none} bear ${bear}`);
});

test('pumped: hype drives pumps, overheating raises crash risk', () => {
  const count = (hype, kind) => {
    let n = 0;
    for (let s = 0; s < 6; s++) {
      const m = M.createMarket({ seed: 'HYPE' + s, tuning: { events: 0, regimes: 0 } });
      for (let i = 0; i < 400; i++) {
        for (const t of ['GOB', 'PUP', 'FIRE', 'HFROG']) if (!m.assets[t].pump && !m.assets[t].crash) m.assets[t].hype = hype;
        n += M.stepMarket(m).filter(x => x.type === kind && ['GOB', 'PUP', 'FIRE', 'HFROG'].includes(x.t)).length;
      }
    }
    return n;
  };
  assert.ok(count(95, 'pump_start') > count(0, 'pump_start') * 1.5);
  assert.ok(count(100, 'crash_start') > count(40, 'crash_start') * 2);
});

test('pumped: upgrades cost clout, cap out and change the rules', () => {
  const meta = SV.defaultMeta();
  assert.equal(PG.buyUpgrade(meta, 'start').ok, false);
  meta.clout = 1000;
  assert.equal(PG.startCash(meta), 1000);
  for (let i = 0; i < 3; i++) assert.ok(PG.buyUpgrade(meta, 'start').ok);
  assert.equal(PG.buyUpgrade(meta, 'start').ok, false);
  assert.equal(PG.startCash(meta), 2000);
  assert.equal(meta.clout, 1000 - 25 - 60 - 150);
  assert.deepEqual(PG.leverageOptions(meta), [1, 2, 5]);
  PG.buyUpgrade(meta, 'margin'); PG.buyUpgrade(meta, 'margin');
  assert.deepEqual(PG.leverageOptions(meta), [1, 2, 5, 10, 25, 50]);
  assert.equal(PG.scannerDelay(meta), null);
  PG.buyUpgrade(meta, 'scanner');
  assert.equal(PG.scannerDelay(meta), 6);
  PG.buyUpgrade(meta, 'orbit');
  assert.deepEqual(PG.markets(meta), ['main', 'orbit']);
  const run = G.createRun({ seed: 'O', markets: PG.markets(meta) });
  assert.ok(run.market.assets.MDRT && !run.market.assets.LAMBO);
  assert.ok(PG.buyTheme(meta, 'synthwave').ok);
  assert.equal(PG.buyTheme(meta, 'synthwave').ok, false);
  const back = SV.sanitizeMeta(JSON.parse(JSON.stringify(meta)));
  assert.deepEqual(back.upgrades, meta.upgrades);
  assert.ok(back.themes.includes('synthwave'));
});

test('pumped: achievements unlock once and pay clout', () => {
  const meta = SV.defaultMeta();
  const run = G.createRun({ seed: 'ACH', mode: 'sprint', tuning: { events: 0 } });
  assert.deepEqual(PG.checkAchievements(meta, { run, worth: 1000 }).map(a => a.id), []);
  const r = G.trade(run, { side: 'buy', t: 'MBYT', amount: 500 });
  run.market.assets.MBYT.p *= 3;
  const s = G.trade(run, { side: 'sell', t: 'MBYT', fraction: 1 });
  const got = PG.checkAchievements(meta, { run, worth: G.worthOf(run), tx: s.tx }).map(a => a.id);
  assert.ok(r.ok && got.includes('first_trade') && got.includes('first_profit') && got.includes('double'), got.join());
  const clout = meta.clout;
  assert.equal(PG.checkAchievements(meta, { run, worth: G.worthOf(run), tx: s.tx }).length, 0);
  assert.equal(meta.clout, clout);
  assert.ok(PG.checkAchievements(meta, { run, worth: 1.2e6 }).some(a => a.id === 'millionaire'));
  // comeback: fell below 20% then recovered
  run.stats.low = 150;
  assert.ok(PG.checkAchievements(meta, { run, worth: 1200 }).some(a => a.id === 'comeback'));
});

test('pumped: clout rewards bigger runs; bankrupt runs pay less', () => {
  const mk = (worth, peak, reason, duration = 300) => ({ end: { worth, reason }, stats: { peak }, duration });
  assert.ok(PG.cloutFor(mk(100000, 100000, 'time')) > PG.cloutFor(mk(5000, 5000, 'time')));
  assert.ok(PG.cloutFor(mk(0, 5000, 'bankrupt')) < PG.cloutFor(mk(5000, 5000, 'time')));
  assert.ok(PG.cloutFor(mk(0, 0, 'bankrupt')) >= 1);
});

test('pumped: surviving a market-wide crash is tracked', () => {
  const run = G.createRun({ seed: 'SURV', tuning: { events: 0, regimes: 0 } });
  G.trade(run, { side: 'buy', t: 'BORE', amount: 900 });
  M.forceRegime(run.market, 'flash');
  run.market.regime.left = 30;
  // the forced regime's notes were consumed, so replay the trigger through a tick with a fake note
  run.stats.crashWatch = { w: G.worthOf(run), until: run.market.tick + 25 };
  for (let i = 0; i < 30; i++) G.stepRun(run);
  assert.equal(run.stats.crashesSurvived, 1);
});

test('pumped: parsing typed amounts', () => {
  assert.equal(F.parseAmount('1,000'), 1000);
  assert.equal(F.parseAmount('$250.50'), 250.5);
  assert.equal(F.parseAmount('2k'), 2000);
  assert.equal(F.parseAmount('1.5m'), 1.5e6);
  assert.ok(Number.isNaN(F.parseAmount('abc')));
  assert.ok(Number.isNaN(F.parseAmount('')));
  assert.ok(Number.isNaN(F.parseAmount('-5')));
});

// ── Squawker, more crypto, simple view ──────────────────────────────────────
// ── Chirper ─────────────────────────────────────────────────────────────────
const CF = await load('chirper/feed.js');
const CA = await load('chirper/accounts.js');
const { THREADS } = await load('chirper/threads.js');
const { MOVES, canMove, ASSET_COOLDOWN, PAIR_COOLDOWN } = await load('chirper/effects.js');
const SYS = await load('chirper/system.js');
const { CAST } = await load('events.js');
const PLACEHOLDERS = /\{(\w+)\}/g;
const ALLOWED = new Set(['asset', 't', 'rival', 'pct', 'you']);
const stepBoth = (run, feed) => CF.stepFeed(feed, run, G.stepRun(run), { handle: 'tester' });

test('pumped: the crypto market is well populated', () => {
  const main = ASSETS.filter(a => a.market === 'main');
  assert.ok(main.filter(a => a.cat === 'crypto').length >= 14);
  assert.ok(main.filter(a => a.cat === 'degen').length >= 12);
  // stablecoins hold their peg without news
  const m = M.createMarket({ seed: 'PEG', tuning: { events: 0, regimes: 0 } });
  for (let i = 0; i < 600; i++) M.stepMarket(m);
  for (const t of ['TSD', 'PSE']) assert.ok(Math.abs(m.assets[t].p / ASSET_BY_T[t].price - 1) < 0.05, `${t} ${m.assets[t].p}`);
});

test('chirper: the full celebrity cast with deep, distinct pools', () => {
  const names = ['Dax Dollar', 'Lil Margin', 'Bradley Beef', 'Madame Moonshot', 'Gordon Grumble', 'Princess Paywall', 'The Algorithm', 'Johnny Jackpot', 'Dr. Buzzkill', 'DJ Liquidity',
    'Brock Blockchain', 'Chadwick Gains', 'Vivienne Viral', 'Sir Reginald Rich', 'Meme Lord Supreme', 'Kiki Clout', 'Rex Rocket', 'Uncle Bagholder', 'Sasha Shortsell', 'Baby Bull'];
  assert.deepEqual(CA.CELEBS.map(c => c.name).sort(), [...names].sort());
  const ids = new Set(CA.CELEBS.map(c => c.id));
  for (const c of CA.CELEBS) {
    assert.ok(c.handle && c.bio && c.style && c.avatar && c.followers > 0, c.id);
    assert.ok(c.posts.length >= 25, `${c.id} posts ${c.posts.length}`);
    assert.ok(Object.values(c.replies).flat().length >= 15, `${c.id} replies`);
    assert.ok(Object.values(c.react).flat().length >= 10, `${c.id} reactions`);
    for (const k of ['topics', 'assets', 'rivals', 'jokes', 'catchphrases']) assert.ok(c[k].length > 0, `${c.id} ${k}`);
    for (const t of c.assets) assert.ok(ASSET_BY_T[t], `${c.id} asset ${t}`);
    for (const r of c.rivals) assert.ok(ids.has(r) && r !== c.id, `${c.id} rival ${r}`);
    assert.ok(c.moves.length >= 3 && c.moves.every(m => MOVES[m.type] && m.text && (!m.asset || ASSET_BY_T[m.asset])), `${c.id} moves`);
    const all = [...c.posts, ...Object.values(c.replies).flat(), ...Object.values(c.react).flat()];
    assert.equal(new Set(all).size, all.length, `${c.id} repeats itself`);
  }
  // no two celebrities share lines
  const lines = CA.CELEBS.flatMap(c => c.posts);
  assert.equal(new Set(lines).size, lines.length);
});

test('chirper: 40+ regular users with their own posts, replies and reactions', () => {
  assert.ok(CA.USERS.length >= 40);
  for (const h of ['rentisdue', 'chartgoblin', 'bagholder420', 'normalperson87', 'definitelynotabroker', 'redcandlesonly', 'coinfliptrader', 'myportfoliohurts', 'lunchbreakinvestor', 'grandmasdaytrading',
    'sellbuttonmissing', 'thelastbull', 'unemployedanalyst', 'boughtatpeak', 'justhereforlore', 'notfinancialadvicebro', 'taxesarecoming', 'sleepyshareholder', 'cryptidcapital', 'wrongtickeragain']) assert.ok(CA.byHandle(h), h);
  for (const u of CA.USERS) {
    assert.ok(u.bio && u.style && u.interests.length && u.talks.length, u.handle);
    assert.ok(u.posts.length >= 8, `${u.handle} posts`);
    assert.ok(Object.values(u.replies).flat().length >= 8, `${u.handle} replies`);
    assert.ok(Object.values(u.react).flat().length >= 3, `${u.handle} reactions`);
    for (const x of u.talks) assert.ok(ASSET_BY_T[x] || CA.account('c:' + x) || CA.byHandle(x), `${u.handle} talks about unknown ${x}`);
  }
  const lines = CA.USERS.flatMap(u => u.posts);
  assert.equal(new Set(lines).size, lines.length, 'users share posts');
});

test('chirper: usernames are unique everywhere and every template is fillable', () => {
  const handles = [...CA.ACCOUNTS.values()].map(a => a.handle.toLowerCase());
  assert.equal(new Set(handles).size, handles.length, 'duplicate handle');
  for (const b of SYS.BOT_HANDLES) assert.ok(!CA.byHandle(b), `bot ${b} clashes with an account`);
  assert.ok(SYS.BOT_HANDLES.length >= 300);
  for (const a of CA.ACCOUNTS.values()) {
    const texts = [...(a.posts || []), ...Object.values(a.replies || {}).flat(), ...Object.values(a.react || {}).flat(), ...(a.moves || []).map(m => m.text)];
    for (const t of texts) {
      for (const [, k] of t.matchAll(PLACEHOLDERS)) assert.ok(ALLOWED.has(k), `${a.key}: {${k}} in "${t}"`);
      if (t.includes('{rival}')) assert.ok(a.rivals && a.rivals.length, `${a.key} has no rivals for "${t}"`);
      assert.ok(t.length <= 240, `${a.key}: too long "${t}"`);
    }
  }
  for (const name of [...CAST.celeb, ...CAST.influencer, ...CAST.official]) assert.ok(CA.castAccount(name), `no account for headline name ${name}`);
});

test('chirper: 30+ coherent threads between real accounts', () => {
  assert.ok(THREADS.length >= 30);
  assert.equal(new Set(THREADS.map(t => t.id)).size, THREADS.length);
  for (const th of THREADS) {
    assert.ok(CA.threadRef(th.post.by), `${th.id} author ${th.post.by}`);
    assert.ok(th.replies.length >= 3 && th.replies.length <= 6, `${th.id} has ${th.replies.length} replies`);
    for (const t of th.assets) assert.ok(ASSET_BY_T[t], `${th.id} asset ${t}`);
    if (th.effect) assert.ok(MOVES[th.effect.type], th.id);
    const speakers = new Set([th.post.by, ...th.replies.map(r => r.by)]);
    assert.ok(speakers.size >= 3, `${th.id} needs several voices`);
    for (const msg of [th.post, ...th.replies]) {
      assert.ok(CA.threadRef(msg.by), `${th.id}: unknown account ${msg.by}`);
      for (const [, k] of msg.text.matchAll(PLACEHOLDERS)) assert.ok(ALLOWED.has(k), `${th.id}: {${k}}`);
      for (const [m] of msg.text.matchAll(/@[A-Za-z0-9_]+/g)) assert.ok(CA.byHandle(m), `${th.id}: ${m} is not an account`);
    }
  }
});

test('chirper: an hour of feed is valid, varied, bounded and saveable', () => {
  const run = G.createRun({ seed: 'CHIRPTEST', mode: 'endless' });
  const feed = CF.createFeed(run.seed);
  const seen = new Map(), ids = new Set();
  let dups = 0, threads = 0, moves = 0, celebs = 0, users = 0, replies = 0;
  for (let i = 0; i < 3600; i++) {
    stepBoth(run, feed);
    for (const p of feed.posts) {
      if (ids.has(p.id)) continue;
      ids.add(p.id);
      assert.ok(p.a.p || p.a.b || CA.ACCOUNTS.has(p.a.k), 'post by unknown account');
      assert.ok(p.text.length > 0 && p.text.length <= CF.MAX_LEN && !/\{\w+\}/.test(p.text), `bad text "${p.text}"`);
      if (p.parent) { replies++; assert.ok(feed.posts.some(q => q.id === p.parent), 'reply to a missing post'); continue; }
      if (p.thread) threads++;
      if (p.effect) moves++;
      if (p.a.k && p.a.k.startsWith('c:')) celebs++;
      if (p.a.k && p.a.k.startsWith('u:')) users++;
      if (!p.news) { const last = seen.get(p.text); if (last != null && p.tick - last < 900) dups++; seen.set(p.text, p.tick); }
    }
  }
  assert.equal(dups, 0, 'the same chirp came back within 15 minutes');
  assert.ok(threads >= 20 && moves >= 40 && celebs > 300 && users > 300 && replies > 3000, JSON.stringify({ threads, moves, celebs, users, replies }));
  assert.ok(feed.posts.filter(p => !p.parent).length <= CF.FEED_LEN && feed.posts.length <= CF.FEED_LEN * 5);
  assert.equal(CF.trending(feed, run.market.tick).length, 8);
  const back = JSON.parse(JSON.stringify(feed));
  assert.ok(CF.validFeed(back));
  assert.equal(CF.validFeed({ ...back, v: 1 }), false, 'old Squawker feeds are replaced');
});

test('chirper: the same seed and market give the same feed', () => {
  const play = () => { const run = G.createRun({ seed: 'DET' }); const feed = CF.createFeed(run.seed); for (let i = 0; i < 400; i++) stepBoth(run, feed); return JSON.stringify([feed, run.market]); };
  assert.equal(play(), play());
});

const saved0 = f => f;
test('chirper: market-moving posts apply once, respect cooldowns and stay bounded', () => {
  const run = G.createRun({ seed: 'MOVES', mode: 'endless', tuning: { events: 0, regimes: 0, pumps: 0, crashes: 0 } });
  const feed = CF.createFeed(run.seed);
  feed.nextMove = 0;
  stepBoth(run, feed);
  const post = feed.posts.find(p => p.effect);
  assert.ok(post, 'a market-moving post was made');
  const t = post.effect.t;
  assert.equal(saved0(feed).cd.asset[t], post.tick);
  // the next ticks (and a save/load) must not apply that post again
  const saved = JSON.parse(JSON.stringify(feed));
  saved.nextMove = 1e9;
  for (let i = 0; i < 5; i++) stepBoth(run, saved);
  const again = saved.posts.filter(p => p.effect && p.effect.t === t);
  assert.equal(again.length, 1, 'only the one market-moving post');
  assert.equal(saved.cd.asset[t], post.tick, 'the effect was not applied again');
  assert.equal(canMove(saved, post.a.k, t, run.market.tick, run.market), false, 'asset cooldown');
  assert.equal(canMove(saved, post.a.k, t, post.tick + ASSET_COOLDOWN + 1, run.market), false, 'same account, same asset: longer cooldown');
  assert.equal(canMove(saved, 'c:zzz', t, post.tick + ASSET_COOLDOWN + 1, run.market), true);
  // over an hour no asset is moved more often than the cooldowns allow, and no account owns an asset
  const run2 = G.createRun({ seed: 'MOVES2', mode: 'endless' });
  const f2 = CF.createFeed(run2.seed);
  const per = {}, pair = {}, ids = new Set();
  for (let i = 0; i < 3600; i++) {
    stepBoth(run2, f2);
    for (const p of f2.posts) if (p.effect && !ids.has(p.id)) { ids.add(p.id); per[p.effect.t] = (per[p.effect.t] || 0) + 1; const k = p.a.k + '>' + p.effect.t; pair[k] = (pair[k] || 0) + 1; }
  }
  for (const [t2, n] of Object.entries(per)) assert.ok(n <= Math.ceil(3600 / ASSET_COOLDOWN), `${t2} moved ${n} times`);
  for (const [k, n] of Object.entries(pair)) assert.ok(n <= Math.ceil(3600 / PAIR_COOLDOWN) + 1, `${k} moved ${n} times`);
  const total = Object.values(per).reduce((a, b) => a + b, 0);
  assert.ok(Math.max(...Object.values(pair)) / total < 0.1, 'one account dominates');
});

test('chirper: celebrities in the news post it, and bad calls get apologies and receipts', () => {
  const run = G.createRun({ seed: 'NEWS2', tuning: { events: 0, regimes: 0, pumps: 0, crashes: 0 } });
  const feed = CF.createFeed(run.seed);
  const { headline, notes } = M.forceEvent(run.market, 'celebrity', 'MOONCAT');
  CF.stepFeed(feed, run, notes, null);
  const acct = CA.castAccount(headline.cast.celeb);
  assert.ok(acct && feed.posts.some(p => p.a.k === acct.key), `${headline.cast.celeb} should chirp about the news`);
  assert.ok(feed.posts.some(p => p.a.k === 's:news' && p.news === headline.id), 'breaking news post');
  // an endorsement followed by a crash gets an apology (or a reaction) and "aged like milk" replies
  const by = CA.CELEBS.find(c => c.moves.some(m => m.type === 'apology'));
  feed.nextMove = 1e9;
  const p = CF.addPost(feed, { k: 'c:' + by.id }, 'buy $GOB', run.market.tick, {});
  feed.endorse.push({ post: p.id, key: 'c:' + by.id, t: 'GOB', price: run.market.assets.GOB.p, tick: run.market.tick });
  for (let i = 0; i < 16; i++) stepBoth(run, feed);
  const gob = run.market.assets.GOB;
  gob.logP += Math.log(0.5); gob.logFair = gob.logP; gob.p = Math.exp(gob.logP);
  stepBoth(run, feed);
  assert.ok(!feed.endorse.some(e => e.post === p.id), 'the endorsement was judged');
  assert.ok(feed.posts.some(q => q.parent === p.id && q.hindsight === 'bad'), 'hindsight reply');
  assert.ok(feed.posts.some(q => q.a.k === 'c:' + by.id && q.tick === run.market.tick && !q.parent), 'the celebrity responds');
});

test('chirper: without market-moving posts, the feed never changes the market', () => {
  const a = G.createRun({ seed: 'QUIET' }), b = G.createRun({ seed: 'QUIET' });
  const feed = CF.createFeed('x');
  for (let i = 0; i < 400; i++) {
    feed.nextMove = 1e9; feed.endorse = [];                       // no celebrity moves or apologies
    for (const th of THREADS) feed.threads[th.id] = a.market.tick; // no scripted threads (some move markets)
    CF.stepFeed(feed, a, G.stepRun(a), null);
    G.stepRun(b);
  }
  assert.ok(feed.posts.length > 100);
  assert.deepEqual(a.market, b.market);
});

test('chirper: player chirps get replies, mentions and limited hype', () => {
  const run = G.createRun({ seed: 'SHILL', tuning: { events: 0 } });
  const feed = CF.createFeed(run.seed);
  assert.equal(CF.playerPost(feed, run, '   ').ok, false);
  assert.equal(CF.playerPost(feed, run, 'x'.repeat(281)).ok, false);
  run.market.assets.GOB.hype = 10;
  let r = CF.playerPost(feed, run, 'buy $gob and $MBYT and $TSD and $GIGACOIN');
  assert.ok(r.ok);
  assert.deepEqual(r.post.tickers, ['GOB', 'MBYT', 'TSD', 'GIGACOIN']);
  assert.ok(r.hyped.includes('GOB') && !r.hyped.includes('MBYT') && !r.hyped.includes('TSD'));
  assert.equal(run.market.assets.GOB.hype, 10 + CF.SHILL_HYPE);
  r = CF.playerPost(feed, run, '$GOB again');
  assert.deepEqual(r.hyped, []);
  for (let i = 0; i < 12; i++) stepBoth(run, feed);
  assert.ok(feed.posts.some(p => p.toMe) && feed.mentions > 0);
  const reply = CF.playerPost(feed, run, 'thanks', { parent: r.post.id });
  assert.ok(reply.ok && reply.post.parent === r.post.id);
  assert.ok(CF.toggleLike(feed, r.post.id).liked);
  assert.ok(!CF.toggleLike(feed, r.post.id).liked);
});

test('chirper: profile, follows and feed settings are saved and sanitised', () => {
  const meta = SV.sanitizeMeta({ profile: { name: '  Ape  ', handle: 'ape <script>' }, follows: ['c:dax', 'c:dax', 'bad key', 'u:rentisdue', 's:news'], chirper: { autoRefresh: false, showEffects: 'yes' } });
  assert.deepEqual(meta.profile, { name: 'Ape', handle: 'apescript' });
  assert.deepEqual(meta.follows, ['c:dax', 'u:rentisdue', 's:news']);
  assert.deepEqual(meta.chirper, { autoRefresh: false, showEffects: true });
  for (const k of SV.defaultMeta().follows) assert.ok(CA.ACCOUNTS.has(k), k);
});

test('chirper: trading still works with the feed running', () => {
  const run = G.createRun({ seed: 'TRADE', mode: 'endless' });
  const feed = CF.createFeed(run.seed);
  for (let i = 0; i < 200; i++) stepBoth(run, feed);
  const cash = run.pf.cash;
  assert.ok(G.trade(run, { side: 'buy', t: 'BEEP', amount: 300 }).ok);
  for (let i = 0; i < 50; i++) stepBoth(run, feed);
  const s = G.trade(run, { side: 'sell', t: 'BEEP', fraction: 1 });
  assert.ok(s.ok);
  near(run.pf.cash, cash - 300 + s.tx.amount, 1e-9);
  assert.ok(Object.keys(run.pf.positions).length === 0);
});

test('pumped: simple.pumped is the same page in simple mode', () => {
  const full = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const simple = fs.readFileSync(new URL('../../simple.pumped/index.html', import.meta.url), 'utf8');
  const expect = full.replace('<html lang="en">', '<html lang="en" class="simple">')
    .replace('href="css/style.css"', 'href="../pumped/css/style.css"').replace('src="js/main.js"', 'src="../pumped/js/main.js"')
    .replace('<title>PUMPED</title>', '<title>PUMPED (simple view)</title>')
    .replace('<!doctype html>', '<!doctype html>\n<!-- Simple view of /pumped/: generated copy of pumped/index.html (tests keep the two in sync). -->');
  assert.equal(simple, expect, 'regenerate simple.pumped/index.html from pumped/index.html');
});

test('simpleplay worker: / goes to /pumped/, which serves the game files', async () => {
  const { default: worker } = await import(new URL('../../simpleplay/worker.js', import.meta.url));
  const seen = [];
  const env = { ASSETS: { fetch: req => { seen.push(new URL(req.url).pathname); return new Response('asset'); } } };
  const get = p => worker.fetch(new Request('https://simple.missing.website' + p), env);
  for (const p of ['/', '/pumped', '/simple.pumped', '/simple.pumped/', '/Simple.Pumped/js/main.js', '/?seed=X']) {
    const r = await get(p);
    assert.equal(r.status, 301, p);
    assert.equal(r.headers.get('location'), 'https://simple.missing.website/pumped/' + (p.includes('?') ? '?seed=X' : ''), p);
  }
  for (const p of ['/pumped/', '/pumped/index.html', '/pumped/js/main.js', '/pumped/css/style.css?v=2']) assert.equal((await get(p)).status, 200, p);
  assert.deepEqual(seen, ['/', '/', '/js/main.js', '/css/style.css']);
  assert.equal((await get('/js/main.js')).status, 404);      // files only exist under /pumped/
  assert.equal((await get('/pages.html')).status, 404);
  const cfg = fs.readFileSync(new URL('../../simpleplay/wrangler.jsonc', import.meta.url), 'utf8');
  assert.match(cfg, /"name": "simpleplay"/);
  assert.match(cfg, /"directory": "\.\.\/pumped"/);
  assert.match(cfg, /"run_worker_first": true/);
  assert.match(cfg, /"pattern": "simple\.missing\.website"/);
  // everything the page loads is relative, and simple.* turns on the simple HUD
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /(href|src)="\/(?!\/)/);
  assert.match(html, /location\.hostname\.indexOf\('simple\.'\) === 0/);
});

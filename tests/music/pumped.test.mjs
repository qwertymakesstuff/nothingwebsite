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
  for (const f of fs.readdirSync(path.join(root, 'js'))) {
    const r = spawnSync(process.execPath, ['--check', path.join(root, 'js', f)]);
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
  M.forcePump(m, 'GOB', { mul: 2, len: [10, 10], fates: { moon: 1, fade: 0, rug: 0 } });
  for (let i = 0; i < 10; i++) M.stepMarket(m);
  assert.ok(m.assets.GOB.p > p0 * 1.3, `pumped ${m.assets.GOB.p / p0}`);
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
  assert.equal(F.pct(-1.5), '−1.50%');
  assert.equal(F.clock(185), '3:05');
});

test('pumped: the page wires up its scripts and ids', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<script type="module" src="js\/main\.js">/);
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const made = new Set([...main.matchAll(/id: '([A-Za-z]+)'/g)].map(m => m[1]));  // created by the script
  for (const id of new Set([...main.matchAll(/\$\('#([A-Za-z]+)'\)/g)].map(m => m[1]))) if (!made.has(id)) assert.match(html, new RegExp(`id="${id}"`), `#${id} missing from index.html`);
});

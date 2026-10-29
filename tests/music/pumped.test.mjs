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
  const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
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
const SQ = await load('social.js');
const SD = await load('social-data.js');
const { CAST } = await load('events.js');
const seeded = (s = 1) => () => (s = (s * 16807) % 2147483647) / 2147483647;

test('pumped: the crypto market is well populated', () => {
  const main = ASSETS.filter(a => a.market === 'main');
  assert.ok(main.filter(a => a.cat === 'crypto').length >= 14);
  assert.ok(main.filter(a => a.cat === 'degen').length >= 12);
  // stablecoins hold their peg without news
  const m = M.createMarket({ seed: 'PEG', tuning: { events: 0, regimes: 0 } });
  for (let i = 0; i < 600; i++) M.stepMarket(m);
  for (const t of ['TSD', 'PSE']) assert.ok(Math.abs(m.assets[t].p / ASSET_BY_T[t].price - 1) < 0.05, `${t} ${m.assets[t].p}`);
});

test('squawker: lots of accounts, every named celebrity has one', () => {
  assert.ok(SD.BOT_HANDLES.length >= 300);
  assert.equal(new Set(SD.BOT_HANDLES).size, SD.BOT_HANDLES.length, 'bot handles are unique');
  assert.ok(SD.CELEBS.length >= 30);
  assert.equal(new Set(SD.CELEBS.map(c => c.handle)).size, SD.CELEBS.length);
  for (const name of [...CAST.celeb, ...CAST.influencer]) assert.ok(SQ.castAccount(name), `no account for ${name}`);
  const rnd = seeded(5);
  const handles = new Set(Array.from({ length: 2000 }, () => SQ.botAuthor(rnd).b));
  assert.ok(handles.size > 600, `only ${handles.size} distinct bots`);
});

test('squawker: the feed reacts to the market and stays bounded', () => {
  const run = G.createRun({ seed: 'FEED', mode: 'endless' });
  const feed = SQ.createFeed();
  const rnd = seeded(9);
  for (let i = 0; i < 1500; i++) SQ.stepFeed(feed, run, G.stepRun(run), rnd);
  const top = feed.posts.filter(p => !p.parent);
  assert.equal(top.length, SQ.FEED_LEN);
  assert.ok(feed.posts.some(p => p.parent), 'replies exist');
  assert.ok(top.some(p => p.a.c === 'wire'), 'news account posts headlines');
  assert.ok(top.some(p => p.a.b) && top.some(p => p.a.c && p.a.c !== 'wire'), 'bots and celebrities post');
  assert.ok(feed.posts.every(p => p.text.length <= SQ.MAX_LEN && !/\{\w+\}/.test(p.text)), 'templates fully filled');
  assert.ok(feed.posts.every(p => !p.parent || feed.posts.some(q => q.id === p.parent)), 'no orphan replies');
  assert.ok(SQ.trending(feed, run.market.tick).length === 8);
  const back = JSON.parse(JSON.stringify(feed));
  assert.ok(SQ.validFeed(back));
});

test('squawker: a celebrity in the news posts it themselves', () => {
  const run = G.createRun({ seed: 'CELEB', tuning: { events: 0 } });
  const feed = SQ.createFeed();
  const { headline, notes } = M.forceEvent(run.market, 'celebrity', 'GOB');
  SQ.stepFeed(feed, run, notes, seeded(3));
  const acct = SQ.castAccount(headline.cast.celeb);
  assert.ok(acct);
  assert.ok(feed.posts.some(p => p.a.c === acct.id && p.tickers.includes('GOB')), `${acct.name} should squawk about $GOB`);
});

test('squawker: reading the feed never changes the market', () => {
  const a = G.createRun({ seed: 'SAME2' }), b = G.createRun({ seed: 'SAME2' });
  const feed = SQ.createFeed();
  for (let i = 0; i < 300; i++) { SQ.stepFeed(feed, a, G.stepRun(a), Math.random); G.stepRun(b); }
  assert.deepEqual(a.market, b.market);
});

test('squawker: player posts get replies and shill hype with a cooldown', () => {
  const run = G.createRun({ seed: 'SHILL', tuning: { events: 0 } });
  const feed = SQ.createFeed();
  const rnd = seeded(4);
  assert.equal(SQ.playerPost(feed, run, '   ').ok, false);
  assert.equal(SQ.playerPost(feed, run, 'x'.repeat(281)).ok, false);
  run.market.assets.GOB.hype = 10;
  let r = SQ.playerPost(feed, run, 'buy $gob and $MBYT and $TSD', { rnd });
  assert.ok(r.ok);
  assert.deepEqual(r.post.tickers, ['GOB', 'MBYT', 'TSD']);
  assert.deepEqual(r.hyped, ['GOB']);               // stocks and stablecoins can't be hyped
  assert.equal(run.market.assets.GOB.hype, 10 + SQ.SHILL_HYPE);
  r = SQ.playerPost(feed, run, '$GOB again', { rnd });
  assert.deepEqual(r.hyped, []);                    // cooldown
  for (let i = 0; i < 12; i++) SQ.stepFeed(feed, run, G.stepRun(run), rnd);
  assert.ok(feed.posts.some(p => p.toMe) && feed.mentions > 0);
  const reply = SQ.playerPost(feed, run, 'thanks', { parent: r.post.id, rnd });
  assert.ok(reply.ok && reply.post.parent === r.post.id);
  const p = SQ.toggleLike(feed, r.post.id);
  assert.ok(p.liked);
  SQ.toggleLike(feed, r.post.id);
  assert.ok(!p.liked);
});

test('squawker: profile and follows are sanitised', () => {
  const meta = SV.sanitizeMeta({ profile: { name: '  Ape  ', handle: 'ape <script>' }, follows: ['c:rex', 'c:rex', 'bad key', 'b:MoonBoi420'] });
  assert.deepEqual(meta.profile, { name: 'Ape', handle: 'apescript' });
  assert.deepEqual(meta.follows, ['c:rex', 'b:MoonBoi420']);
  assert.deepEqual(SV.sanitizeMeta({ profile: { name: '', handle: '' } }).profile, SV.defaultMeta().profile);
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

test('simpleplay worker: game at the root, typed paths redirect, the rest is the asset store', async () => {
  const { default: worker } = await import(new URL('../../simpleplay/worker.js', import.meta.url));
  const seen = [];
  const env = { ASSETS: { fetch: req => { seen.push(new URL(req.url).pathname); return new Response('asset', { status: 404 }); } } };
  for (const p of ['/pumped', '/pumped/', '/simple.pumped/', '/Pumped/js/main.js']) {
    const r = await worker.fetch(new Request('https://simple.missing.website' + p + '?seed=X'), env);
    assert.equal(r.status, 301, p);
    assert.equal(r.headers.get('location'), 'https://simple.missing.website/?seed=X');
  }
  const r = await worker.fetch(new Request('https://simple.missing.website/nope'), env);
  assert.equal(r.status, 404);
  assert.deepEqual(seen, ['/nope']);
  const cfg = fs.readFileSync(new URL('../../simpleplay/wrangler.jsonc', import.meta.url), 'utf8');
  assert.match(cfg, /"name": "simpleplay"/);
  assert.match(cfg, /"directory": "\.\.\/pumped"/);
  assert.match(cfg, /"pattern": "simple\.missing\.website"/);
  // everything the page loads is relative, so it works from simple.missing.website/
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /(href|src)="\/(?!\/)/);
  assert.match(html, /location\.hostname\.indexOf\('simple\.'\) === 0/);
});

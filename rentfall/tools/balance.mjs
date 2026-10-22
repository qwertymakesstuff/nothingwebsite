// Balance harness: plays whole campaigns with simple bots and prints win rates and where runs end.
//   node rentfall/tools/balance.mjs [runs] [bot]     bot = naive | random | smart (default: all)
// "smart" estimates each choice by simulating a dozen spins of the resulting collection.
import * as S from '../js/state.js';
import { rentDue, DEADLINES } from '../js/rent.js';
import { resolveSpin } from '../js/effects.js';
import { placeGrid } from '../js/generate.js';
import { createRng } from '../js/rng.js';
import { noticeFor } from '../js/rent.js';
import { priceOf } from '../js/shop.js';

const RUNS = Number(process.argv[2] || 40);
const ONLY = process.argv[3];

function estimate(run, collection, n = 14, seed = 1) {
  const rng = createRng(seed * 7919 + run.deadline);
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const coll = structuredClone(collection);
    const { grid, leftOver } = placeGrid(coll.map(s => s.uid), rng, { landlord: !!noticeFor(run.deadline)?.landlord });
    const res = resolveSpin({ grid, instances: new Map(coll.map(s => [s.uid, s])), relics: run.relics, deadline: run.deadline, rng, leftOver });
    sum += res.total - res.rentUp;
  }
  return sum / n;
}
const withSym = (run, id) => [...run.collection, { uid: 'x', id, bonus: 0, laminated: false, data: {} }];
const without = (run, uid) => run.collection.filter(s => s.uid !== uid);

function play(seed, bot) {
  let run = S.newRun(seed);
  let guard = 0;
  while (!['won', 'lost'].includes(run.phase) && guard++ < 2000) {
    if (run.phase === 'spin') run = S.spin(run).run;
    else if (run.phase === 'delivery') {
      let pick = 0;
      if (bot === 'random') pick = Math.floor(Math.random() * (run.delivery.options.length + 1)); 
      if (bot === 'smart') {
        const base = estimate(run, run.collection);
        let best = -1, bestV = base + 0.05;
        run.delivery.options.forEach((id, k) => { const v = estimate(run, withSym(run, id)); if (v > bestV) { bestV = v; best = k; } });
        pick = best;
      }
      run = S.chooseDelivery(run, pick >= 0 && pick < run.delivery.options.length ? pick : null).run;
    } else if (run.phase === 'rent') run = S.payRent(run).run;
    else if (run.phase === 'shop') {
      if (bot === 'smart') {
        const nextRent = rentDue(run);
        // keep a reserve toward the next rent, scaled by how far into the campaign we are
        const reserve = () => Math.max(0, nextRent - estimate(run, run.collection, 8) * run.spinsLeft * 0.8);
        for (let pass = 0; pass < 3; pass++) {
          const base = estimate(run, run.collection);
          const opts = [];
          run.shop.symbols.forEach((o, k) => { if (!o.sold) opts.push({ k, kind: 'sym', gain: estimate(run, withSym(run, o.id)) - base, price: priceOf(run, o.base) }); });
          run.shop.relics.forEach((o, k) => { if (!o.sold && ['coin_purse','union_card','cat_cafe','rent_control','night_shift','compound_interest','insurance'].includes(o.id)) opts.push({ k, kind: 'relic', gain: o.id === 'rent_control' ? DEADLINES[run.deadline].rent * 0.12 / run.spinsLeft * 2 : 3, price: priceOf(run, o.base) }); });
          opts.sort((a, b) => b.gain / Math.max(1, b.price) - a.gain / Math.max(1, a.price));
          const o = opts.find(o => o.gain > 0.5 && run.money - o.price >= reserve());
          if (!o) break;
          const r = o.kind === 'sym' ? S.buySymbol(run, o.k) : S.buyRelic(run, o.k);
          if (r.ok) run = r.run; else break;
        }
        // remove the worst symbol if it is dragging the average down
        const base = estimate(run, run.collection);
        let worst = null, wv = base + 0.4;
        for (const s of run.collection) { const v = estimate(run, without(run, s.uid), 8); if (v > wv) { wv = v; worst = s.uid; } }
        if (worst) { const r = S.removeSymbol(run, worst); if (r.ok && run.money - r.run.money < run.money * 0.3) run = r.run; }
      }
      run = S.leaveShop(run).run;
    }
  }
  return run;
}

for (const bot of ONLY ? [ONLY] : ['naive', 'random', 'smart']) {
  const ends = new Array(DEADLINES.length + 1).fill(0);
  let wins = 0, spinsMax = 0;
  const margins = DEADLINES.map(() => []);
  for (let i = 0; i < (bot === 'smart' ? Math.ceil(RUNS / 2) : RUNS); i++) {
    const run = play(`BAL-${i}`, bot);
    if (run.phase === 'won') wins++;
    ends[run.phase === 'won' ? DEADLINES.length : run.deadline]++;
    for (const e of run.ledger) margins[e.deadline].push(e.before / e.rent);
    spinsMax = Math.max(spinsMax, run.stats.bestSpin);
  }
  const n = bot === 'smart' ? Math.ceil(RUNS / 2) : RUNS;
  console.log(`${bot.padEnd(6)} win ${(100 * wins / n).toFixed(0)}%  ended at deadline:`, ends.map((c, k) => `${k + 1 > DEADLINES.length ? 'W' : k + 1}:${c}`).join(' '), ' best spin', spinsMax);
  console.log('        money/rent at each deadline (median):', margins.map(m => m.length ? (m.sort((a, b) => a - b)[m.length >> 1]).toFixed(2) : '-').join(' '));
}

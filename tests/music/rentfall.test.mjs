import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../rentfall/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { SYMBOLS, SYMBOL_BY_ID, DRAFTABLE, PHASES } = await load('symbols.js');
const { RELICS, RELIC_BY_ID, ITEMS, SERVICES } = await load('relics.js');
const { resolveSpin, explainCell } = await load('effects.js');
const { DEADLINES, NOTICES, rentDue, FINAL_DEADLINE } = await load('rent.js');
const { placeGrid, rollSymbols } = await load('generate.js');
const { createRng, seedToState } = await load('rng.js');
const S = await load('state.js');
const shop = await load('shop.js');
const save = await load('save.js');
const { sanitizeSettings, defaultSettings } = await load('settings.js');
const { hasIcon } = await load('icons.js');
const { shopDiscount, deliveryChoices } = await load('collection.js');
const { GRID_SIZE, RUN_KEY, MAX_ITEMS, START_COLLECTION } = await load('config.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
const fixed = x => ({ next: () => x, state: 0 });   // a "random" stream that always returns x
const NEVER = fixed(0.999);                          // no chance-based effect fires
const at = (r, c) => r * 5 + c;

// board({ [index]: id }) → resolves one spin with those symbols in those windows.
function board(cells, { relics = [], deadline = 0, rng = NEVER, data = {}, bonus = {}, laminated = [], leftOver = 0, spinMult = 1 } = {}) {
  const instances = new Map();
  const grid = new Array(GRID_SIZE).fill(null);
  for (const [i, id] of Object.entries(cells)) {
    const uid = `u${i}`;
    instances.set(uid, { uid, id, bonus: bonus[i] || 0, laminated: laminated.includes(Number(i)), data: { ...(data[i] || {}) } });
    grid[i] = id === 'landlord' ? 'landlord' : uid;
  }
  const res = resolveSpin({ grid, instances, relics, deadline, rng, leftOver, spinMult });
  return { res, inst: i => instances.get(`u${i}`), v: i => res.cells[i].value, cell: i => res.cells[i] };
}

function playRun(seed, pickDelivery = () => 0, shopFn = null) {
  let run = S.newRun(seed);
  const trail = [];
  for (let guard = 0; guard < 3000 && !['won', 'lost'].includes(run.phase); guard++) {
    let res;
    if (run.phase === 'spin') res = S.spin(run);
    else if (run.phase === 'delivery') res = S.chooseDelivery(run, pickDelivery(run));
    else if (run.phase === 'rent') res = S.payRent(run);
    else if (run.phase === 'shop') { if (shopFn) run = shopFn(run); res = S.leaveShop(run); }
    assert.ok(res.ok, `${run.phase}: ${res.error}`);
    run = res.run;
    trail.push(run);
  }
  return { run, trail };
}

function checkInvariants(run) {
  assert.ok(Number.isInteger(run.money) && run.money >= 0, `money ${run.money}`);
  assert.ok(Number.isInteger(run.totalEarned) && run.totalEarned >= 0);
  assert.ok(S.PHASE_LIST.includes(run.phase));
  const uids = run.collection.map(s => s.uid);
  assert.equal(new Set(uids).size, uids.length, 'duplicate uids');
  for (const s of run.collection) assert.ok(SYMBOL_BY_ID[s.id] && !SYMBOL_BY_ID[s.id].board, `bad id ${s.id}`);
  for (const id of run.relics) assert.ok(RELIC_BY_ID[id]);
  assert.ok(run.items.length <= MAX_ITEMS);
  assert.ok(run.spinsLeft >= 0);
}

// ── Modules and data ─────────────────────────────────────────────────────────
test('every rentfall module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(dir.pathname);
  assert.ok(files.length >= 20);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('at least 40 original, fully described symbols across every category', () => {
  assert.ok(DRAFTABLE.length >= 40, `${DRAFTABLE.length} draftable symbols`);
  assert.equal(new Set(SYMBOLS.map(s => s.id)).size, SYMBOLS.length, 'unique ids');
  assert.equal(new Set(SYMBOLS.map(s => s.name)).size, SYMBOLS.length, 'unique names');
  for (const s of SYMBOLS) {
    assert.ok(['common', 'uncommon', 'rare', 'legendary'].includes(s.rarity), s.id);
    assert.ok(Number.isInteger(s.base), s.id);
    assert.ok(s.desc.length > 10 && s.trigger.length > 2, s.id);
    assert.ok(Array.isArray(s.tags), s.id);
    assert.ok(hasIcon(s.id), `icon for ${s.id}`);
  }
  for (const cat of ['income', 'multiplier', 'synergy', 'risk', 'utility']) assert.ok(DRAFTABLE.filter(s => s.category === cat).length >= 3, cat);
  for (const r of ['common', 'uncommon', 'rare', 'legendary']) assert.ok(DRAFTABLE.some(s => s.rarity === r), r);
});

test('no two symbols are the same rules in different art', () => {
  const sig = s => JSON.stringify({ base: s.base, passive: s.passive || null, hooks: [...PHASES, 'onDestroy'].map(p => String(s[p] || '')) });
  const seen = new Map();
  for (const s of DRAFTABLE) {
    assert.ok(!seen.has(sig(s)), `${s.id} duplicates ${seen.get(sig(s))}`);
    seen.set(sig(s), s.id);
  }
});

test('every symbol, relic, supply and service id referenced anywhere exists and has art', () => {
  const src = fs.readFileSync(new URL('symbols.js', dir), 'utf8') + fs.readFileSync(new URL('relics.js', dir), 'utf8') + fs.readFileSync(new URL('state.js', dir), 'utf8');
  const refs = [...src.matchAll(/(?:adjId\(ctx, c, |\.id === |ctx\.add\(|transform\([a-z]+, |addInstance\(r, )'([a-z_]+)'/g)].map(m => m[1]);
  assert.ok(refs.length > 20);
  for (const id of refs) assert.ok(SYMBOL_BY_ID[id], `unknown symbol reference '${id}'`);
  for (const r of RELICS) { assert.ok(hasIcon(r.icon), r.id); assert.ok(r.price >= 0, r.id); }
  for (const r of ITEMS) { assert.ok(hasIcon(r.icon), r.id); assert.ok(r.price > 0, r.id); }
  for (const r of SERVICES) assert.ok(hasIcon(r.icon), r.id);
  for (const id of START_COLLECTION) assert.ok(SYMBOL_BY_ID[id]);
});

test('campaign: twelve deadlines of rising rent, a final notice, notices that exist', () => {
  assert.ok(DEADLINES.length >= 12);
  for (let i = 1; i < DEADLINES.length; i++) {
    assert.ok(DEADLINES[i].rent > DEADLINES[i - 1].rent, `rent rises at ${i}`);
    assert.ok(DEADLINES[i].spins >= DEADLINES[i - 1].spins, `spins never shrink at ${i}`);
  }
  assert.ok(DEADLINES[FINAL_DEADLINE].final);
  for (const d of DEADLINES) if (d.notice) assert.ok(NOTICES[d.notice], d.notice);
});

// ── Effects ──────────────────────────────────────────────────────────────────
test('basic income and adjacency (diagonals count)', () => {
  const { v } = board({ [at(0, 0)]: 'coin', [at(1, 1)]: 'wallet', [at(2, 2)]: 'coin', [at(3, 4)]: 'coin' });
  assert.equal(v(at(0, 0)), 1);
  assert.equal(v(at(1, 1)), 3, 'wallet: 1 + 2 diagonal coins');
  assert.equal(v(at(3, 4)), 1);
});

test('flat bonuses resolve before multipliers', () => {
  // Worker gives the Typewriter +2, then the Calculator doubles it: (1 + 2) × 2 = 6.
  // Typewriter: (1 base + 2 Worker + 1 office symbol in its row) × 2 Calculator = 8, never 1 × 2 + 3.
  const { v, res } = board({ [at(0, 0)]: 'calculator', [at(0, 1)]: 'typewriter', [at(0, 2)]: 'worker' });
  assert.equal(v(at(0, 1)), 8);
  const order = res.log.filter(e => e.target === at(0, 1)).map(e => e.phase);
  assert.deepEqual(order, ['earn', 'earn', 'boost']);
});

test('multipliers never deepen a penalty', () => {
  // Cursed Idol gives the Coin −1 (1 − 1 = 0) and the Gremlin −2 − 1 = −3; the Lucky Charm cannot double either.
  const { v } = board({ [at(1, 1)]: 'cursed_idol', [at(1, 2)]: 'coin', [at(0, 2)]: 'lucky_charm', [at(2, 2)]: 'gremlin' });
  assert.equal(v(at(1, 2)), 0);
  assert.equal(v(at(2, 2)), -3);
  assert.equal(v(at(1, 1)), 12);
});

test('cats eat mice in setup; dogs act first and stop them', () => {
  const a = board({ [at(0, 0)]: 'cat', [at(0, 1)]: 'mouse' });
  assert.equal(a.v(at(0, 0)), 7);
  assert.ok(a.cell(at(0, 1)).destroyed);
  assert.equal(a.v(at(0, 1)), 0);
  assert.deepEqual(a.res.destroyed, ['u1']);

  // The Dog is placed after the Cat in reading order but has setup priority, so the Cat is chased off first.
  const b = board({ [at(0, 0)]: 'cat', [at(0, 1)]: 'mouse', [at(1, 0)]: 'dog' });
  assert.ok(b.cell(at(0, 0)).disabled);
  assert.equal(b.v(at(0, 0)), 0);
  assert.ok(!b.cell(at(0, 1)).destroyed);
  assert.equal(b.res.destroyed.length, 0);

  // ...unless the Cat Café relic is owned.
  const c = board({ [at(0, 0)]: 'cat', [at(0, 1)]: 'mouse', [at(1, 0)]: 'dog' }, { relics: ['cat_cafe'] });
  assert.ok(!c.cell(at(0, 0)).disabled);
  assert.equal(c.v(at(0, 0)), 1 + 6 + 1);
});

test('the Black Cat jinxes charms; the Horseshoe protects and strengthens them', () => {
  const a = board({ [at(0, 0)]: 'black_cat', [at(0, 1)]: 'lucky_charm', [at(0, 2)]: 'coin' });
  assert.ok(a.cell(at(0, 1)).disabled);
  assert.equal(a.v(at(0, 2)), 1);
  const b = board({ [at(0, 0)]: 'black_cat', [at(0, 1)]: 'lucky_charm', [at(0, 2)]: 'coin' }, { relics: ['horseshoe'] });
  assert.equal(b.v(at(0, 2)), 3, 'charm ×2 becomes ×3');
});

test('Clover triples the best neighbour; Golden Ticket acts last', () => {
  const a = board({ [at(1, 1)]: 'clover', [at(0, 0)]: 'coin', [at(0, 1)]: 'apple', [at(2, 2)]: 'pigeon' });
  assert.equal(a.v(at(0, 1)), 6);
  assert.equal(a.v(at(0, 0)), 1);
  const b = board({ [at(0, 0)]: 'golden_ticket', [at(3, 3)]: 'apple', [at(3, 4)]: 'microwave' }, { rng: fixed(0) });
  const boosts = b.res.log.filter(e => e.kind === 'mult');
  assert.equal(boosts[boosts.length - 1].srcName, 'Golden Ticket');
  // ×2 (microwave) then ×5 (ticket) on whichever earning symbol the ticket picked.
  assert.ok(b.v(at(3, 3)) === 20 || b.v(at(3, 4)) === 5);
});

test('Spotlight hits the window below, or above on the bottom row', () => {
  assert.equal(board({ [at(0, 2)]: 'spotlight', [at(1, 2)]: 'apple' }).v(at(1, 2)), 8);
  assert.equal(board({ [at(3, 2)]: 'spotlight', [at(2, 2)]: 'apple' }).v(at(2, 2)), 8);
});

test('rows: Neon Sign and Typewriter', () => {
  const { v } = board({ [at(2, 0)]: 'neon_sign', [at(2, 4)]: 'coin', [at(2, 3)]: 'typewriter', [at(2, 1)]: 'calculator', [at(1, 4)]: 'coin' });
  assert.equal(v(at(2, 4)), 2);
  assert.equal(v(at(1, 4)), 1);
  assert.equal(v(at(2, 3)), 1 + 1 + 1, 'typewriter: base + neon + 1 office (calculator) in row');
});

test('keys open safes; hammers smash piggy banks for double', () => {
  const a = board({ [at(0, 0)]: 'key', [at(0, 1)]: 'safe' }, { data: { 1: { stored: 20 } } });
  assert.ok(a.cell(at(0, 1)).destroyed && a.cell(at(0, 0)).destroyed);
  assert.equal(a.res.payoutTotal, 20);
  assert.equal(a.res.total, 20);
  const b = board({ [at(0, 0)]: 'hammer', [at(0, 1)]: 'piggy_bank' }, { data: { 1: { stored: 7 } } });
  assert.equal(b.res.payoutTotal, 14);
  const c = board({ [at(0, 0)]: 'coin', [at(0, 1)]: 'piggy_bank', [at(1, 1)]: 'coin' });
  assert.equal(c.inst(1).data.stored, 2, 'piggy bank saves ¤1 per adjacent coin');
});

test('laminated symbols resist other symbols but can still use themselves up', () => {
  const a = board({ [at(0, 0)]: 'cat', [at(0, 1)]: 'mouse' }, { laminated: [1] });
  assert.ok(!a.cell(at(0, 1)).destroyed);
  assert.equal(a.v(at(0, 0)), 1);
  const b = board({ [at(0, 0)]: 'candle' }, { laminated: [0], data: { 0: { count: 5 } } });
  assert.ok(b.cell(0).destroyed, 'burns out regardless');
});

test('scaling counters: Overtime Clock, Cheese, Candle', () => {
  const instances = new Map([['c', { uid: 'c', id: 'overtime_clock', bonus: 0, laminated: false, data: {} }]]);
  const grid = new Array(GRID_SIZE).fill(null); grid[0] = 'c';
  const values = [];
  for (let k = 0; k < 15; k++) values.push(resolveSpin({ grid, instances, rng: NEVER }).cells[0].value);
  assert.deepEqual(values.slice(0, 4), [0, 1, 2, 3]);
  assert.equal(values[14], 12, 'capped at +12');
  assert.equal(board({ 0: 'cheese' }, { data: { 0: { count: 7 } } }).v(0), 4);
  const lastBurn = board({ 0: 'candle' }, { data: { 0: { count: 5 } } });
  assert.equal(lastBurn.v(0), 3, 'still earns on its last appearance');
  assert.ok(lastBurn.cell(0).destroyed);
});

test('seeds grow (faster with a watering can and Green Thumb)', () => {
  const a = board({ 0: 'seed' }, { data: { 0: { count: 1 } } });
  assert.equal(a.inst(0).id, 'seed');
  const b = board({ 0: 'seed' }, { data: { 0: { count: 2 } } });
  assert.equal(b.inst(0).id, 'flower');
  assert.equal(b.v(0), 0, 'it turns into a flower after earning');
  assert.deepEqual(b.res.transforms, [{ uid: 'u0', from: 'seed', to: 'flower' }]);
  assert.equal(board({ 0: 'seed', 1: 'watering_can' }).inst(0).id, 'flower');
  assert.equal(board({ 0: 'seed' }, { relics: ['green_thumb'], data: { 0: { count: 1 } } }).inst(0).id, 'flower');
});

test('bees make honey every third time they visit a flower', () => {
  const a = board({ 0: 'bee', 1: 'flower' }, { data: { 0: { honey: 2 } } });
  assert.deepEqual(a.res.added, ['honey']);
  assert.equal(a.v(0), 2);
  assert.equal(a.v(1), 3);
});

test('suspicious package: valuables, a symbol, junk, or keyed riches', () => {
  const rich = board({ 0: 'package' }, { rng: fixed(0.1), deadline: 2 });
  assert.equal(rich.res.payoutTotal, 8 + 4);
  const sym = board({ 0: 'package' }, { rng: fixed(0.6) });
  assert.equal(sym.res.added.length, 1);
  assert.equal(SYMBOL_BY_ID[sym.res.added[0]].rarity, 'uncommon');
  const junk = board({ 0: 'package' }, { rng: fixed(0.9) });
  assert.equal(junk.inst(0).id, 'junk');
  const keyed = board({ 0: 'package', 1: 'key' }, { rng: fixed(0.9), deadline: 1 });
  assert.equal(keyed.res.payoutTotal, 14 + 4);
});

test('junk can be recycled before raccoons eat it', () => {
  const a = board({ 0: 'junk', 1: 'recycling_bin', 5: 'raccoon' });
  assert.equal(a.inst(0).id, 'coin');
  assert.equal(a.v(0), 1);
  assert.equal(a.v(5), 1, 'nothing left for the raccoon');
  const b = board({ 0: 'junk', 5: 'raccoon' });
  assert.equal(b.v(5), 6);
});

test('battery: supercharges appliances, can short out and disable its neighbours', () => {
  const ok = board({ 0: 'battery', 1: 'microwave' });
  assert.equal(ok.v(1), 3);
  const zap = board({ 0: 'battery', 1: 'microwave', 5: 'coin' }, { rng: fixed(0.01) });
  assert.ok(zap.cell(0).destroyed);
  assert.ok(zap.cell(1).disabled && zap.cell(5).disabled);
  assert.equal(zap.res.total, 0);
  const fused = board({ 0: 'battery', 1: 'microwave' }, { rng: fixed(0.01), relics: ['fuse'] });
  assert.ok(!fused.cell(0).destroyed);
  assert.equal(fused.v(1), (1 + 1) * 3);
});

test('utility symbols report extra spins, rent changes, rerolls and erasures', () => {
  const a = board({ 0: 'alarm_clock', 1: 'loan_shark', 2: 'fortune_cookie' }, { deadline: 3 });
  assert.equal(a.res.extraSpins, 1);
  assert.equal(a.res.rentUp, 5);
  assert.equal(a.res.rerolls, 1);
  assert.equal(a.inst(0).data.deadline, 3);
  const again = board({ 0: 'alarm_clock' }, { deadline: 3, data: { 0: { deadline: 3 } } });
  assert.equal(again.res.extraSpins, 0, 'once per deadline');
  const e = board({ 0: 'eraser', 1: 'coin', 5: 'apple' });
  assert.ok(e.cell(1).destroyed && e.cell(0).destroyed && !e.cell(5).destroyed);
  assert.equal(e.res.payoutTotal, 3);
});

test('every effect fires once per phase per spin', () => {
  const { res } = board({ 0: 'neon_sign', 1: 'coin', 2: 'coin', 3: 'worker', 4: 'typewriter', 5: 'manager', 6: 'worker' });
  const key = e => `${e.phase}|${e.kind}|${e.src}|${e.target}|${e.text}`;
  const counts = new Map();
  for (const e of res.log) counts.set(key(e), (counts.get(key(e)) || 0) + 1);
  for (const [k, n] of counts) assert.equal(n, 1, `${k} fired ${n} times`);
  assert.equal(res.cells[1].value, 2);
});

test('relics and notices change the rules', () => {
  assert.equal(board({ 0: 'coin' }, { relics: ['coin_purse'] }).v(0), 2);
  assert.equal(board({ 0: 'coin' }, { relics: ['minimalist'] }).res.total, 1 + 19 * 2);
  assert.equal(board({ 0: 'coin' }, { relics: ['hoarder'], leftOver: 7 }).res.total, 8);
  assert.equal(board({ 0: 'cat', 1: 'mouse' }, { relics: ['insurance'] }).res.payoutTotal, 3);
  assert.equal(board({ 0: 'apple', 4: 'flower' }, { deadline: 4 }).res.total, 1 + 3, 'heat wave');
  assert.equal(board({ 0: 'pigeon' }, { deadline: 9 }).v(0), 0, 'noise complaint');
  assert.equal(board({ 0: 'apple' }, { spinMult: 2 }).res.total, 4);
  assert.ok(explainCell(board({ 0: 'calculator', 1: 'typewriter' }).cell(1)).includes('×2'));
});

test('placement: up to 20 symbols, the rest sit out; the landlord takes a slot', () => {
  const rng = createRng(5);
  const uids = Array.from({ length: 27 }, (_, k) => `s${k}`);
  const { grid, leftOver } = placeGrid(uids, rng);
  assert.equal(grid.filter(Boolean).length, 20);
  assert.equal(new Set(grid).size, 20);
  assert.equal(leftOver, 7);
  const small = placeGrid(['a', 'b'], rng, { landlord: true });
  assert.equal(small.grid.filter(x => x === 'landlord').length, 1);
  assert.equal(small.grid.filter(Boolean).length, 3);
  const offers = rollSymbols(createRng(9), 0, 5);
  assert.equal(new Set(offers).size, 5);
  for (const id of offers) assert.ok(SYMBOL_BY_ID[id].draftable !== false);
  assert.ok(rollSymbols(createRng(1), 0, 300).every(id => ['common', 'uncommon'].includes(SYMBOL_BY_ID[id].rarity)), 'no rares at the very start');
});

// ── Run flow ─────────────────────────────────────────────────────────────────
test('seeded runs are reproducible', () => {
  const a = playRun('SAME-1', run => run.delivery.options.length - 1);
  const b = playRun('SAME-1', run => run.delivery.options.length - 1);
  assert.deepEqual({ ...a.run, createdAt: 0 }, { ...b.run, createdAt: 0 });
  const c = playRun('OTHER-2', run => run.delivery.options.length - 1);
  assert.notDeepEqual(a.run.collection, c.run.collection);
  assert.equal(seedToState('X'), seedToState('X'));
});

test('actions out of turn fail and change nothing', () => {
  const run = S.newRun('ORDER');
  for (const res of [S.chooseDelivery(run, 0), S.payRent(run), S.leaveShop(run), S.buySymbol(run, 0), S.rerollDelivery(run), S.useItem(run, 0)]) {
    assert.equal(res.ok, false);
    assert.equal(res.run, run);
  }
  const spun = S.spin(run).run;
  assert.equal(spun.phase, 'delivery');
  assert.equal(S.spin(spun).ok, false);
  assert.equal(S.chooseDelivery(spun, 9).ok, false);
  assert.equal(S.chooseDelivery(spun, -1).ok, false);
});

test('a spin updates money, counters and the delivery exactly once', () => {
  const run = S.newRun('ONE-SPIN');
  const { run: r, result } = S.spin(run);
  assert.equal(r.money, Math.max(0, run.money + result.total));
  assert.equal(r.spinsLeft, run.spinsLeft - 1);
  assert.equal(r.stats.spins, 1);
  assert.equal(r.delivery.options.length, 3);
  assert.equal(run.stats.spins, 0, 'original untouched');
  const took = S.chooseDelivery(r, 1).run;
  assert.equal(took.collection.length, r.collection.length + 1);
  assert.equal(took.collection.at(-1).id, r.delivery.options[1]);
  assert.equal(took.phase, 'spin');
  const skipped = S.chooseDelivery(r, null).run;
  assert.equal(skipped.collection.length, r.collection.length);
  assert.equal(skipped.money, r.money);
});

test('rent: paying advances the deadline and opens the shop; short money loses', () => {
  let run = S.newRun('RENT');
  run = { ...run, phase: 'rent', spinsLeft: 0, money: 50 };
  const paid = S.payRent(run);
  assert.ok(paid.paid);
  assert.equal(paid.run.money, 50 - DEADLINES[0].rent);
  assert.equal(paid.run.deadline, 1);
  assert.equal(paid.run.spinsLeft, DEADLINES[1].spins);
  assert.equal(paid.run.phase, 'shop');
  assert.ok(paid.run.shop.symbols.length > 0);
  assert.equal(paid.run.ledger[0].paid, true);

  const short = S.payRent({ ...run, money: DEADLINES[0].rent - 1 });
  assert.equal(short.run.phase, 'lost');
  assert.equal(short.run.result.short, 1);
  assert.equal(short.run.money, DEADLINES[0].rent - 1, 'nothing taken when you cannot pay');

  const exact = S.payRent({ ...run, money: DEADLINES[0].rent });
  assert.equal(exact.run.money, 0);
  assert.equal(exact.run.phase, 'shop');
});

test('rent modifiers: loan shark interest, envelope, relics, compound interest', () => {
  const run = { ...S.newRun('MOD'), deadline: 2 };
  assert.equal(rentDue(run), DEADLINES[2].rent);
  assert.equal(rentDue({ ...run, rentExtra: 10 }), DEADLINES[2].rent + 10);
  assert.equal(rentDue({ ...run, rentDiscount: 0.15 }), Math.round(DEADLINES[2].rent * 0.85));
  assert.equal(rentDue({ ...run, relics: ['rent_control'] }), Math.round(DEADLINES[2].rent * 0.88));
  const r = S.payRent({ ...run, phase: 'rent', money: DEADLINES[2].rent + 100, relics: ['compound_interest'] });
  assert.equal(r.interest, 12);
  assert.equal(r.run.money, 112);
});

test('paying the final notice wins; the run then refuses further actions', () => {
  const run = { ...S.newRun('WIN'), deadline: FINAL_DEADLINE, phase: 'rent', spinsLeft: 0, money: 99999 };
  const res = S.payRent(run);
  assert.ok(res.won);
  assert.equal(res.run.phase, 'won');
  assert.equal(res.run.money, 99999 - DEADLINES[FINAL_DEADLINE].rent);
  assert.equal(S.spin(res.run).ok, false);
  assert.equal(S.payRent(res.run).ok, false);
});

test('final notice puts the landlord on the grid every spin', () => {
  const run = { ...S.newRun('LANDLORD'), deadline: FINAL_DEADLINE, spinsLeft: 10 };
  const { result } = S.spin(run);
  assert.equal(result.grid.filter(x => x === 'landlord').length, 1);
  assert.equal(result.cells.find(c => c.id === 'landlord').value, -5);
});

test('night shift and double shift multiply a whole spin', () => {
  const base = { ...S.newRun('MULT'), spinsLeft: 1 };
  const plain = S.spin(base).result;
  const night = S.spin({ ...base, relics: ['night_shift'] }).result;
  assert.equal(night.total, Math.floor(plain.total * 2));
  const dbl = S.spin({ ...base, spinsLeft: 3, doubleNext: true });
  assert.equal(dbl.result.spinMult, 2);
  assert.equal(dbl.run.doubleNext, false);
});

test('alarm clocks add spins, but no more than three per deadline', () => {
  let run = S.newRun('ALARM');
  run.collection = Array.from({ length: 6 }, (_, k) => ({ uid: `a${k}`, id: 'alarm_clock', bonus: 0, laminated: false, data: {} }));
  const { run: r, result } = S.spin(run);
  assert.equal(result.extraSpins, 3);
  assert.equal(r.spinsLeft, run.spinsLeft - 1 + 3);
});

// ── Shop ─────────────────────────────────────────────────────────────────────
function shopRun(money = 500, extra = {}) {
  const run = { ...S.newRun('SHOP'), phase: 'rent', spinsLeft: 0, money: money + DEADLINES[0].rent };
  const r = S.payRent(run).run;
  return { ...r, ...extra };
}

test('buying: exact prices, sold offers, insufficient funds change nothing', () => {
  const run = shopRun(500);
  const offer = run.shop.symbols[0];
  const price = shop.priceOf(run, offer.base);
  assert.ok(price > 0);
  const bought = S.buySymbol(run, 0);
  assert.ok(bought.ok);
  assert.equal(bought.run.money, run.money - price);
  assert.equal(bought.run.collection.length, run.collection.length + 1);
  assert.equal(bought.run.collection.at(-1).id, offer.id);
  assert.equal(S.buySymbol(bought.run, 0).ok, false, 'cannot buy a sold offer');
  assert.equal(S.buySymbol(run, 99).ok, false);

  const broke = { ...run, money: price - 1 };
  const fail = S.buySymbol(broke, 0);
  assert.equal(fail.ok, false);
  assert.equal(fail.run, broke);
  assert.equal(broke.shop.symbols[0].sold, false);
});

test('prices never go negative, never round a paid item to free, and coupons apply at once', () => {
  const run = shopRun(500);
  for (const base of [1, 2, 3, 5, 10, 45]) assert.ok(shop.priceOf({ ...run, deadline: 0, collection: Array(10).fill({ id: 'coupon' }), shop: { extraDiscount: 0.2 } }, base) >= 1);
  assert.equal(shop.priceOf(run, 0), 0);
  assert.equal(shop.priceOf(run, -5), 0);
  const before = shop.priceOf(run, 40);
  const withCoupons = { ...run, collection: [...run.collection, { uid: 'c1', id: 'coupon' }, { uid: 'c2', id: 'coupon' }, { uid: 'c3', id: 'coupon' }, { uid: 'c4', id: 'coupon' }] };
  assert.equal(shopDiscount(withCoupons), 0.3, 'coupons cap at 30%');
  assert.ok(shop.priceOf(withCoupons, 40) < before);
});

test('relics: no duplicates, second mortgage pays out, offers exclude owned', () => {
  let run = shopRun(500);
  const id = run.shop.relics[0].id;
  const r = S.buyRelic(run, 0);
  assert.ok(r.ok);
  assert.ok(r.run.relics.includes(id));
  const again = { ...r.run, shop: { ...r.run.shop, relics: [{ id, base: 10, sold: false }] } };
  assert.equal(S.buyRelic(again, 0).ok, false);
  const reroll = S.rerollShop(r.run).run;
  assert.ok(!reroll.shop.relics.some(o => o.id === id));
  const mort = { ...run, shop: { ...run.shop, relics: [{ id: 'second_mortgage', base: 0, sold: false }] } };
  const m = S.buyRelic(mort, 0);
  assert.equal(m.run.money, run.money + 45);
  assert.ok(rentDue(m.run) > rentDue(run));
});

test('supplies: carry limit, and each one works', () => {
  let run = shopRun(500);
  run = { ...run, items: ['bribe', 'bribe', 'bribe'] };
  assert.equal(S.buyItem(run, 0).ok, false, 'pockets are full');

  const base = { ...S.newRun('ITEMS'), items: ['overtime_pass', 'double_shift', 'bribe'] };
  const o = S.useItem(base, 0);
  assert.equal(o.run.spinsLeft, base.spinsLeft + 1);
  assert.deepEqual(o.run.items, ['double_shift', 'bribe']);
  const d = S.useItem(o.run, 0);
  assert.equal(d.run.doubleNext, true);
  const b = S.useItem(d.run, 0);
  assert.equal(rentDue(b.run), Math.round(DEADLINES[0].rent * 0.85));
  assert.equal(S.useItem(b.run, 0).ok, false, 'no item left');
  const pests = { ...S.newRun('PESTS'), items: ['pest_control'] };
  pests.collection.push({ uid: 'm1', id: 'mouse', bonus: 0, laminated: false, data: {} }, { uid: 'j1', id: 'junk', bonus: 0, laminated: false, data: {} });
  assert.equal(S.useItem(pests, 0).run.collection.length, START_COLLECTION.length);
  const penny = S.useItem({ ...S.newRun('PENNY'), items: ['lucky_coin'] }, 0);
  assert.equal(penny.run.collection.filter(s => s.id === 'coin').length, 4);
});

test('services and removal', () => {
  const run = shopRun(500);
  const target = run.collection[0];
  const rm = S.removeSymbol(run, target.uid);
  assert.ok(rm.ok);
  assert.equal(rm.run.collection.length, run.collection.length - 1);
  assert.ok(shop.removeCost(rm.run) > shop.removeCost(run), 'removals get pricier');
  assert.equal(S.removeSymbol(run, 'nope').ok, false);
  const one = { ...run, collection: [run.collection[0]] };
  assert.equal(S.removeSymbol(one, one.collection[0].uid).ok, false, 'keep at least one');

  for (const svc of ['polish', 'laminate', 'photocopy']) {
    const r = { ...run, shop: { ...run.shop, service: svc } };
    const res = S.buyService(r, svc, target.uid);
    assert.ok(res.ok, svc);
    const after = res.run.collection.find(s => s.uid === target.uid);
    if (svc === 'polish') assert.equal(after.bonus, 1);
    if (svc === 'laminate') { assert.equal(after.laminated, true); assert.equal(S.buyService(res.run, svc, target.uid).ok, false); }
    if (svc === 'photocopy') assert.equal(res.run.collection.filter(s => s.id === target.id).length, run.collection.filter(s => s.id === target.id).length + 1);
  }
  assert.equal(S.buyService(run, run.shop.service === 'polish' ? 'laminate' : 'polish', target.uid).ok, false, 'only today\'s service');
});

test('rerolls use free tokens first, then money', () => {
  const run = { ...shopRun(500), rerolls: 1 };
  const a = S.rerollShop(run).run;
  assert.equal(a.money, run.money);
  assert.equal(a.rerolls, 0);
  const b = S.rerollShop(a).run;
  assert.equal(b.money, a.money - 3);
  const c = S.rerollShop(b).run;
  assert.equal(c.money, b.money - 5);
  assert.equal(S.rerollShop({ ...c, money: 0 }).ok, false);
});

test('delivery choices grow with mailboxes, bulk mail and market day (max 5)', () => {
  const run = S.newRun('MAIL');
  assert.equal(deliveryChoices(run), 3);
  const more = { ...run, relics: ['bulk_mail'], collection: [...run.collection, { id: 'mailbox' }, { id: 'mailbox' }, { id: 'mailbox' }] };
  assert.equal(deliveryChoices(more), 5);
  assert.equal(deliveryChoices({ ...run, deadline: 6 }), 4);
  assert.equal(S.skipBonus({ ...run, relics: ['bulk_mail'], deadline: 2 }), 6);
});

// ── Saving ───────────────────────────────────────────────────────────────────
test('save round trip restores a run exactly', () => {
  const store = save.memoryStorage();
  let { run } = playRun('SAVE-ME', () => 0);
  let mid = S.newRun('SAVE-MID');
  for (let k = 0; k < 7; k++) { mid = mid.phase === 'spin' ? S.spin(mid).run : mid.phase === 'delivery' ? S.chooseDelivery(mid, 0).run : mid.phase === 'rent' ? S.payRent(mid).run : S.leaveShop(mid).run; }
  for (const r of [mid, run]) {
    save.saveRun(store, r);
    assert.deepEqual(save.loadRun(store), JSON.parse(JSON.stringify(r)));
  }
  // continuing a restored run plays exactly like the original
  save.saveRun(store, mid);
  const restored = save.loadRun(store);
  const go = r => (r.phase === 'spin' ? S.spin(r).run : r.phase === 'delivery' ? S.chooseDelivery(r, 0).run : r.phase === 'rent' ? S.payRent(r).run : S.leaveShop(r).run);
  assert.deepEqual(go(go(restored)), JSON.parse(JSON.stringify(go(go(mid)))));
});

test('loading rejects or repairs bad data', () => {
  const store = save.memoryStorage();
  store.setItem(RUN_KEY, '{not json');
  assert.equal(save.loadRun(store), null);
  assert.equal(save.sanitizeRun(null), null);
  assert.equal(save.sanitizeRun({ version: 99, collection: [] }), null, 'future versions are refused');
  assert.equal(save.sanitizeRun({ version: 1, collection: 'x' }), null);
  const good = S.newRun('FIX');
  const bad = JSON.parse(JSON.stringify(good));
  bad.money = -50; bad.deadline = 99; bad.phase = 'dancing'; bad.relics = ['coin_purse', 'coin_purse', 'teleporter'];
  bad.items = ['bribe', 'nuke', 'bribe', 'bribe', 'bribe'];
  bad.collection.push({ uid: 's1', id: 'coin' }, { uid: 'zz', id: 'dragon' }, { uid: 'yy', id: 'landlord' }, { uid: 'xx', id: 'cat', bonus: 1e9, data: { count: 'lots', stored: 4 } });
  const fixedRun = save.sanitizeRun(bad);
  assert.equal(fixedRun.money, 0);
  assert.equal(fixedRun.deadline, FINAL_DEADLINE);
  assert.equal(fixedRun.phase, 'spin');
  assert.deepEqual(fixedRun.relics, ['coin_purse']);
  assert.equal(fixedRun.items.length, MAX_ITEMS);
  assert.ok(fixedRun.collection.every(s => SYMBOL_BY_ID[s.id] && !SYMBOL_BY_ID[s.id].board));
  assert.equal(new Set(fixedRun.collection.map(s => s.uid)).size, fixedRun.collection.length);
  const cat = fixedRun.collection.find(s => s.uid === 'xx');
  assert.equal(cat.bonus, 99);
  assert.deepEqual(cat.data, { stored: 4 });
  assert.ok(fixedRun.nextUid > Math.max(...fixedRun.collection.map(s => Number(s.uid.replace(/\D/g, '')) || 0)));
  // a delivery with no valid offers falls back to a playable phase
  const del = save.sanitizeRun({ ...JSON.parse(JSON.stringify(good)), phase: 'delivery', delivery: { options: ['dragon'] } });
  assert.equal(del.phase, 'spin');
  // a shop with corrupt offers keeps only the valid ones
  const sh = save.sanitizeRun({ ...JSON.parse(JSON.stringify(good)), phase: 'shop', shop: { symbols: [{ id: 'coin', base: -4 }, { id: 'nope' }], relics: [{ id: 'fuse', base: 22 }], items: 'x', service: 'magic' } });
  assert.deepEqual(sh.shop.symbols, [{ id: 'coin', base: 0, sold: false }]);
  assert.equal(sh.shop.service, 'polish');
  assert.deepEqual(sh.shop.items, []);
  // a spin phase with no spins left becomes rent day
  assert.equal(save.sanitizeRun({ ...JSON.parse(JSON.stringify(good)), spinsLeft: 0 }).phase, 'rent');
});

test('profile: wins, losses, best run and history are recorded once', () => {
  let p = save.emptyProfile();
  const lost = { ...S.newRun('L1'), phase: 'lost', deadline: 3, totalEarned: 400, result: { won: false } };
  p = save.recordRun(p, lost);
  p = save.recordRun(p, lost);
  assert.equal(p.losses, 1);
  assert.equal(p.history.length, 1);
  assert.equal(p.best.reached, 3);
  const won = { ...S.newRun('W1'), phase: 'won', deadline: FINAL_DEADLINE, totalEarned: 9000, result: { won: true } };
  p = save.recordRun(p, won);
  assert.equal(p.wins, 1);
  assert.equal(p.best.won, true);
  assert.equal(p.best.reached, DEADLINES.length);
  assert.equal(save.recordRun(p, S.newRun('NOT-OVER')), p, 'unfinished runs are not recorded');
  const store = save.memoryStorage();
  save.saveProfile(store, p);
  assert.deepEqual(save.loadProfile(store), save.sanitizeProfile(JSON.parse(JSON.stringify(p))));
  save.saveRun(store, S.newRun('GONE'));
  save.resetProgress(store);
  assert.equal(save.loadRun(store), null);
  assert.deepEqual(save.loadProfile(store), save.emptyProfile());
  assert.equal(save.sanitizeProfile({ wins: -3, losses: 'x', history: [{ seed: 5 }] }).wins, 0);
});

test('settings are validated', () => {
  assert.deepEqual(sanitizeSettings(null), defaultSettings());
  const s = sanitizeSettings({ volume: 7, animations: 'no', speed: 'warp', sound: false });
  assert.equal(s.volume, 1);
  assert.equal(s.animations, true);
  assert.equal(s.speed, 'normal');
  assert.equal(s.sound, false);
});

// ── Whole campaigns ──────────────────────────────────────────────────────────
test('whole campaigns keep every invariant, and some runs reach the end', () => {
  let outcomes = { won: 0, lost: 0 };
  for (let i = 0; i < 25; i++) {
    const shopper = run => {
      let r = run;
      const k = r.shop.symbols.findIndex(o => !o.sold && shop.priceOf(r, o.base) <= r.money / 4);
      if (k >= 0) r = S.buySymbol(r, k).run;
      return r;
    };
    const { run, trail } = playRun(`CAMPAIGN-${i}`, r => (r.deadline + i) % 4 === 3 ? null : i % r.delivery.options.length, shopper);
    for (const r of trail) checkInvariants(r);
    assert.ok(['won', 'lost'].includes(run.phase));
    outcomes[run.phase]++;
    assert.ok(run.result);
    assert.equal(run.ledger.filter(e => e.paid).length, run.phase === 'won' ? DEADLINES.length : run.deadline);
  }
  assert.ok(outcomes.lost > 0, 'careless play gets evicted');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../last-call/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const dates = await load('dates.js');
const { ISSUERS } = await load('issuers.js');
const { RULES, rulesAt, sameName } = await load('rules.js');
const { evaluate, judge, explain } = await load('validation.js');
const { PROFILES, PROFILE_BY_ID } = await load('customers.js');
const { prepareShift, makeId, FLAWS, FLAWS_BY_RULE, FLAW_ORDER } = await load('generator.js');
const { SHIFTS, CAMPAIGN, shiftIdAt } = await load('shifts.js');
const { VENUES } = await load('venues.js');
const engine = await load('shiftEngine.js');
const { computePaycheck, applyShiftResult } = await load('finances.js');
const { SHOP, buy, canBuy, shiftModifiers } = await load('upgrades.js');
const story = await load('story.js');
const campaign = await load('campaign.js');
const save = await load('save.js');
const { INCIDENTS } = await load('incidents.js');
const { testCondition } = await load('conditions.js');
const { seededRandom } = await load('rng.js');
const { portraitSvg } = await load('portrait.js');
const { compareResult } = await load('ui/inspect.js').catch(() => ({}));
const { PAY, CAREER, STARTING_MONEY } = await load('config.js');

const DATE = '2031-03-07';
const clone = o => structuredClone(o);
const ctx = (rules, extra = {}) => ({ date: DATE, clockMin: 240, inside: 0, rules, ...extra });

// A plain, valid guest for the given rules.
function guest(over = {}) {
  const rng = seededRandom('guest');
  const c = { uid: 'g1', name: 'Ada Abara', age: 30, heightCm: 175, face: clone(PROFILE_BY_ID.priya.face), outfit: ['collared-shirt', 'trousers', 'loafers'], personality: 'calm', intoxicated: false, docs: {}, lines: { greet: '', admit: '', reject: '' }, tipBase: 4 };
  c.docs.id = makeId(c, DATE, rng, { issuer: 'calder', bday: -50 });
  c.docs.id.photo = clone(c.face);
  return Object.assign(c, over);
}

test('every last-call module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(dir.pathname);
  assert.ok(files.length >= 25);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('date maths: ages, birthdays, leap days, clocks', () => {
  assert.equal(dates.ageOn('2010-03-07', '2031-03-07'), 21);
  assert.equal(dates.ageOn('2010-03-08', '2031-03-07'), 20);
  assert.equal(dates.ageOn('2012-02-29', '2031-02-28'), 18);
  assert.equal(dates.ageOn('2012-02-29', '2031-03-01'), 19);
  for (const off of [-300, -1, 0, 1, 200]) for (const age of [17, 21, 45]) {
    const dob = dates.dobFor(DATE, age, off);
    assert.equal(dates.ageOn(dob, DATE), age, `age ${age} offset ${off}`);
    assert.ok(!dob.endsWith('-02-29'));
  }
  assert.equal(dates.daysBetween('2031-03-07', '2031-03-08'), 1);
  assert.equal(dates.toClock(dates.fromClock('23:45')), '23:45');
  assert.equal(dates.toClock(dates.fromClock('01:30')), '01:30');
  assert.ok(dates.fromClock('01:00') > dates.fromClock('23:00'));
  assert.equal(dates.fmtDoc('2031-03-07'), '07 MAR 2031');
});

test('at least 40 original customer profiles with complete structured data', () => {
  assert.ok(PROFILES.length >= 40);
  const ids = new Set();
  for (const p of PROFILES) {
    assert.ok(!ids.has(p.id), p.id); ids.add(p.id);
    for (const k of ['name', 'age', 'height', 'face', 'outfit', 'personality', 'reason', 'desc', 'lines', 'issuer']) assert.ok(p[k] != null, `${p.id}.${k}`);
    for (const k of ['greet', 'admit', 'reject']) assert.ok(p.lines[k], `${p.id}.lines.${k}`);
    assert.ok(ISSUERS[p.issuer]);
  }
  const types = new Set(PROFILES.map(p => p.type));
  for (const t of ['ordinary', 'regular', 'confused', 'suspicious', 'vip', 'story']) assert.ok(types.has(t), t);
});

test('valid IDs pass every ID rule; each flaw fails exactly its own rule', () => {
  const rules = rulesAt({ rules: [{ id: 'age', params: { min: 21 } }, { id: 'expiry' }, { id: 'identity' }, { id: 'forgery' }] }, 0);
  const g = guest();
  assert.equal(evaluate(g, ctx(rules)).admit, true);
  const expect = { underage: 'age', expired: 'expiry', photo: 'identity', height: 'identity', eyes: 'identity', header: 'forgery', number: 'forgery', hologram: 'forgery', nohologram: 'forgery', color: 'forgery', dates: 'forgery' };
  for (const [flaw, rule] of Object.entries(expect)) {
    for (let seed = 0; seed < 20; seed++) {
      const c = guest(); c.docs.id = clone(c.docs.id);
      FLAWS[flaw](c, { date: DATE, rules, def: {} }, seededRandom(`${flaw}${seed}`));
      const ev = evaluate(c, ctx(rules));
      assert.deepEqual(ev.violations, [rule], `${flaw} seed ${seed}: ${JSON.stringify(ev.checks.filter(x => !x.pass))}`);
    }
  }
  const noId = guest(); noId.docs.id = null;
  assert.deepEqual(evaluate(noId, ctx(rules)).violations, ['age']);
});

test('edge cases: birthday today admits, birthday tomorrow refuses, expiry today is valid', () => {
  const rules = rulesAt({ rules: [{ id: 'age', params: { min: 21 } }, { id: 'expiry' }] }, 0);
  const today = guest(); today.docs.id.dob = dates.dobFor(DATE, 21, 0);
  assert.equal(evaluate(today, ctx(rules)).admit, true);
  assert.match(evaluate(today, ctx(rules)).checks[0].detail, /birthday today/);
  const tomorrow = guest(); tomorrow.docs.id.dob = dates.dobFor(DATE, 20, 1);
  assert.equal(evaluate(tomorrow, ctx(rules)).admit, false);
  const exp = guest(); exp.docs.id.expires = DATE;
  assert.equal(evaluate(exp, ctx(rules)).admit, true);
  exp.docs.id.expires = dates.addDays(DATE, -1);
  assert.deepEqual(evaluate(exp, ctx(rules)).violations, ['expiry']);
});

test('hair, beard and glasses changes on the photo are not identity failures', () => {
  const rules = rulesAt({ rules: [{ id: 'age', params: { min: 21 } }, { id: 'identity' }] }, 0);
  const g = guest();
  g.docs.id.photo = { ...g.face, hair: 'long', hairColor: 'blonde', facial: 'beard', glasses: !g.face.glasses };
  assert.equal(evaluate(g, ctx(rules)).admit, true);
});

test('tickets, wristbands and guest lists', () => {
  const def = { rules: [{ id: 'age', params: { min: 18 } }, { id: 'pass', params: { accept: ['ticket', 'wristband'], event: 'MOTH & STATIC', codePrefix: 'MS-', wristband: { color: 'green', pattern: 'triangles' } } }],
    changes: [{ at: 100, rules: { pass: { accept: ['ticket', 'guestlist'], guests: ['Ada Abara'] } } }] };
  const early = rulesAt(def, 0); const late = rulesAt(def, 150);
  const g = guest();
  g.docs.ticket = { event: 'MOTH & STATIC', date: DATE, code: 'MS-12345', holder: 'Ada Abara' };
  assert.equal(evaluate(g, ctx(early)).admit, true);
  for (const [k, v] of [['date', dates.addDays(DATE, 7)], ['event', 'VELVET RIOT'], ['code', 'MZ-12345'], ['holder', 'Ada Abra']]) {
    const c = guest(); c.docs.ticket = { ...g.docs.ticket, [k]: v };
    assert.deepEqual(evaluate(c, ctx(early)).violations, ['pass'], k);
  }
  const band = guest(); band.wristband = { color: 'green', pattern: 'triangles' };
  assert.equal(evaluate(band, ctx(early)).admit, true);
  band.wristband = { color: 'green', pattern: 'stripes' };
  assert.equal(evaluate(band, ctx(early)).admit, false);
  // After the change: wristbands no longer count, the guest list does.
  const band2 = guest(); band2.wristband = { color: 'green', pattern: 'triangles' }; band2.name = 'X'; band2.docs.id.name = 'Someone Else';
  assert.equal(evaluate(band2, ctx(late)).admit, false);
  const listed = guest();
  assert.equal(evaluate(listed, ctx(late)).admit, true);
  assert.equal(evaluate(listed, ctx(early)).admit, false);
});

test('reservations use the clock; VIPs skip bookings but not other rules', () => {
  const p = { before: 60, after: 90, reservations: [{ name: 'Ada Abara', time: '23:00' }], vip: ['Vee Ipp'] };
  const rules = rulesAt({ rules: [{ id: 'age', params: { min: 23 } }, { id: 'expiry' }, { id: 'booking', params: p }] }, 0);
  const g = guest();
  const at = t => ({ ...ctx(rules), clockMin: dates.fromClock(t) });
  assert.equal(evaluate(g, at('22:00')).admit, true);
  assert.equal(evaluate(g, at('21:59')).admit, false);
  assert.equal(evaluate(g, at('00:30')).admit, true);
  assert.equal(evaluate(g, at('00:31')).admit, false);
  const vip = guest(); vip.docs.id.name = 'Vee Ipp';
  assert.equal(evaluate(vip, at('21:00')).admit, true);
  vip.docs.id.expires = dates.addDays(DATE, -2);
  assert.deepEqual(evaluate(vip, at('21:00')).violations, ['expiry']);
});

test('capacity, membership, dress code, sobriety and banned faces', () => {
  const g = guest();
  const cap = rulesAt({ rules: [{ id: 'capacity', params: { max: 10, exempt: ['Vee Ipp'] } }] }, 0);
  assert.equal(evaluate(g, ctx(cap, { inside: 9 })).admit, true);
  assert.equal(evaluate(g, ctx(cap, { inside: 10 })).admit, false);
  const mem = rulesAt({ rules: [{ id: 'membership', params: { sponsored: ['Guest Person'], suspended: ['OR-2210'] } }] }, 0);
  g.docs.member = { number: 'OR-1234', name: 'Ada Abara', validThru: dates.addDays(DATE, 30) };
  assert.equal(evaluate(g, ctx(mem)).admit, true);
  for (const m of [{ number: 'OR-12345' }, { name: 'Ada Abra' }, { validThru: dates.addDays(DATE, -1) }, { number: 'OR-2210' }]) {
    const c = guest(); c.docs.member = { ...g.docs.member, ...m };
    assert.equal(evaluate(c, ctx(mem)).admit, false, JSON.stringify(m));
  }
  const dress = rulesAt({ rules: [{ id: 'dress', params: { banned: ['sneakers', 'hat'] } }] }, 0);
  assert.equal(evaluate(guest(), ctx(dress)).admit, true);
  assert.equal(evaluate(guest({ outfit: ['suit', 'tailored', 'sneakers-designer'] }), ctx(dress)).admit, false);
  assert.equal(evaluate(guest({ outfit: ['cap', 'suit', 'tailored', 'oxfords'] }), ctx(dress)).admit, false);
  const sober = rulesAt({ rules: [{ id: 'sober' }] }, 0);
  assert.equal(evaluate(guest({ intoxicated: true, intoxCues: 'swaying' }), ctx(sober)).admit, false);
  const b = guest();
  const banned = rulesAt({ rules: [{ id: 'banned', params: { entries: [{ name: 'Totally Different', faceKey: ['skin', 'faceShape', 'nose', 'brows', 'eyes'].map(k => b.face[k]).join('|'), reason: 'fighting' }] } }] }, 0);
  assert.equal(evaluate(b, ctx(banned)).admit, false, 'banned by face even under another name');
  assert.equal(evaluate(guest({ face: { ...b.face, nose: b.face.nose === 'broad' ? 'button' : 'broad' } }), ctx(banned)).admit, true);
});

test('judge and explanations: citations and slip text', () => {
  const rules = rulesAt({ rules: [{ id: 'age', params: { min: 21 } }, { id: 'expiry' }] }, 0);
  const c = guest(); c.docs.id.expires = dates.addDays(DATE, -3);
  const right = judge(c, ctx(rules), 'refuse', 'expiry');
  assert.ok(right.correct && right.citationCorrect);
  const wrongCite = judge(c, ctx(rules), 'refuse', 'age');
  assert.ok(wrongCite.correct && !wrongCite.citationCorrect);
  const miss = judge(c, ctx(rules), 'admit');
  assert.equal(miss.correct, false);
  assert.match(explain(miss, 'Ada').headline, /Mistake/);
  assert.ok(explain(miss, 'Ada').lines.some(l => /Expired/.test(l)));
  assert.match(explain(judge(guest(), ctx(rules), 'refuse'), 'Ada').headline, /should have been admitted/);
});

test('every shift generates a queue the judge agrees with, across many seeds', () => {
  let n = 0;
  for (const id of Object.keys(SHIFTS)) {
    for (let seed = 0; seed < 25; seed++) {
      const { def, customers } = prepareShift(SHIFTS[id], { victor_deal: true, juno_ally: true, nadia_help: true }, `t${seed}`);
      assert.equal(customers.length, SHIFTS[id].fillers + SHIFTS[id].roster.length);
      for (const c of customers) {
        const t = c.expectAt === 'change' ? def.changes[0].at + 1 : c.arriveAt;
        const ev = evaluate(c, { date: def.date, clockMin: c.arriveClock, inside: 0, rules: rulesAt(def, t) });
        const expect = c.expect ?? (c.flaws.length ? 'refuse' : 'admit');
        assert.equal(ev.admit ? 'admit' : 'refuse', expect, `${id} seed ${seed} ${c.name} ${c.flaws} ${JSON.stringify(ev.checks.filter(x => !x.pass))}`);
        n++;
      }
    }
  }
  assert.ok(n > 4000);
});

test('generation is deterministic for the same seed', () => {
  const a = prepareShift(SHIFTS['sump-2'], {}, 'x');
  const b = prepareShift(SHIFTS['sump-2'], {}, 'x');
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  const c = prepareShift(SHIFTS['sump-2'], {}, 'y');
  assert.notDeepEqual(a.customers.map(x => x.name), c.customers.map(x => x.name));
});

test('flaws only use rules that are active when the guest arrives', () => {
  for (const id of Object.keys(SHIFTS)) {
    const { def, customers } = prepareShift(SHIFTS[id], {}, 'only');
    for (const c of customers.filter(x => !x.expect)) {
      const active = new Set(rulesAt(def, c.arriveAt).map(r => r.id));
      for (const f of c.flaws) assert.ok(Object.entries(FLAWS_BY_RULE).some(([r, fl]) => active.has(r) && fl.includes(f)), `${id}: ${f}`);
    }
  }
});

test('rules are introduced one at a time in the first shifts', () => {
  const order = Array.from({ length: CAMPAIGN.length }, (_, i) => SHIFTS[shiftIdAt(i, {})]);
  for (let i = 1; i < 6; i++) {
    const prev = new Set(order[i - 1].rules.map(r => r.id));
    const added = order[i].rules.map(r => r.id).filter(r => !prev.has(r));
    assert.ok(added.length <= 1, `${order[i].id} adds ${added}`);
  }
  assert.ok(Object.keys(SHIFTS).length >= 10);
  assert.ok(new Set(Object.values(SHIFTS).map(s => s.venue)).size >= 5);
});

function simulate(id, decideFn, flags = {}, mods = {}) {
  const s = engine.createShift(prepareShift(SHIFTS[id], flags, 'sim'), mods);
  let think = 0;
  while (!s.ended) {
    engine.tick(s, 0.25);
    if (s.incident) engine.resolveIncident(s, s.incident.choices.findIndex(c => !c.requires), { owned: [], flags: {} });
    if (s.current && (think += 0.25) >= 6) { think = 0; decideFn(s); }
  }
  return s;
}
const perfect = s => { const ev = evaluate(s.current, engine.ctxNow(s)); engine.decide(s, ev.admit ? 'admit' : 'refuse', ev.violations[0] ?? null); };

test('shift engine: perfect play clears the line and passes', () => {
  const s = simulate('lantern-2', perfect);
  const r = engine.summarize(s);
  assert.equal(s.endReason, 'clear');
  assert.equal(r.wrong, 0);
  assert.equal(r.correct, r.total);
  assert.ok(r.passed && r.rating >= 95);
  assert.ok(r.tips > 0);
  assert.ok(r.citations > 0);
});

test('shift engine: the timer ends a shift and idle queues walk out', () => {
  const s = engine.createShift(prepareShift(SHIFTS['voltage-1'], {}, 'idle'), {});
  while (!s.ended) { engine.tick(s, 0.5); if (s.incident) engine.resolveIncident(s, 0, { owned: [], flags: {} }); }
  assert.equal(s.endReason, 'time');
  assert.ok(s.t >= s.def.duration);
  assert.ok(s.walkouts.length > 0);
  const r = engine.summarize(s);
  assert.equal(r.decided, 0);
  assert.equal(r.passed, false);
});

test('shift engine: too many mistakes sends you home; fines follow the mistake type', () => {
  const s = simulate('lantern-1', st => { const ev = evaluate(st.current, engine.ctxNow(st)); engine.decide(st, ev.admit ? 'refuse' : 'admit'); });
  assert.equal(s.endReason, 'sent-home');
  assert.equal(s.strikes, s.maxStrikes + 1);
  const r = engine.summarize(s);
  for (const rec of r.records) {
    if (rec.verdict === 'admit') assert.equal(rec.fine, rec.judgement.violations.includes('age') ? PAY.fineUnderage : PAY.fineWrongAdmit);
    else assert.equal(rec.fine, PAY.fineWrongRefuse);
  }
  const studio = engine.createShift(prepareShift(SHIFTS['lantern-1'], {}, 'x'), shiftModifiers({ owned: ['studio'], housing: 'studio', transport: 'bus' }));
  assert.equal(studio.maxStrikes, SHIFTS['lantern-1'].strikes + 1);
});

test('shift engine: mid-shift rule changes are announced and judged at decision time', () => {
  const s = engine.createShift(prepareShift(SHIFTS['voltage-2'], {}, 'chg'), { earpiece: true });
  const seen = [];
  while (!s.ended && s.t < s.def.changes[0].at + 1) { engine.tick(s, 0.5); seen.push(...s.events.map(e => e.type)); s.events.length = 0; if (s.incident) engine.resolveIncident(s, s.incident.choices.findIndex(c => !c.requires), { owned: [], flags: {} }); }
  assert.ok(seen.includes('heads-up'));
  assert.ok(seen.includes('rule-change'));
  assert.deepEqual(engine.rulesNow(s).find(r => r.id === 'pass').params.accept, ['ticket']);
});

test('shift engine: capacity counts people in and out', () => {
  const s = engine.createShift(prepareShift(SHIFTS['lantern-finale'], {}, 'cap'), {});
  const start = s.inside;
  engine.tick(s, 0.5);
  const before = s.inside;
  perfect(s);
  assert.ok(s.inside === before || s.inside === before + 1);
  for (let i = 0; i < 200 && !s.ended; i++) { engine.tick(s, 1); if (s.incident) engine.resolveIncident(s, s.incident.choices.findIndex(c => !c.requires), { owned: [], flags: {} }); if (s.current) engine.decide(s, 'refuse'); }
  assert.ok(s.inside < start + 2, 'outflow lets people leave');
});

test('shift engine: refused angry guests rattle the queue unless trained', () => {
  const run = mods => {
    const s = engine.createShift(prepareShift(SHIFTS['halcyon-1'], {}, 'angry'), mods);
    while (s.queue.length < 3 || !s.current) { engine.tick(s, 0.5); if (s.incident) engine.resolveIncident(s, 0, { owned: [], flags: {} }); }
    s.current.personality = 'grumpy';
    const before = s.queue.map(q => q.waitLeft);
    engine.decide(s, 'refuse');
    return s.queue.slice(0, before.length - 1).map((q, i) => before[i + 1] - q.waitLeft);
  };
  assert.ok(run({}).every(d => d >= 7.9));
  assert.ok(run({ deescalation: true }).every(d => d < 1));
});

test('incidents: choices apply their effects; locked choices need the upgrade', () => {
  const s = engine.createShift(prepareShift(SHIFTS['sump-2'], {}, 'inc'), {});
  while (!s.incident) engine.tick(s, 0.5);
  assert.equal(s.incident.id, 'fight');
  const t0 = s.t;
  assert.equal(engine.resolveIncident(s, 0, { owned: [], flags: {} }), null, 'talk-down needs de-escalation training');
  assert.ok(engine.resolveIncident(s, 2, { owned: [], flags: {} }));
  assert.equal(s.t, t0 + 25);
  assert.equal(s.flagInc.kwame_trust, 1);
  for (const inc of Object.values(INCIDENTS)) assert.ok(inc.choices.length >= 1 && inc.choices.some(c => !c.requires));
});

test('incidents and roster guests respect story conditions', () => {
  const without = prepareShift(SHIFTS['halcyon-2'], {}, 'a').def.incidents.map(i => i.id);
  const withDeal = prepareShift(SHIFTS['halcyon-2'], { victor_deal: true }, 'a').def.incidents.map(i => i.id);
  assert.ok(!without.includes('victor-call'));
  assert.ok(withDeal.includes('victor-call'));
});

test('paycheck: itemised wages, tips, fines and living costs add up', () => {
  const p = campaign.newPlayer('Pay');
  const s = simulate('lantern-1', perfect);
  const r = engine.summarize(s);
  const pay = computePaycheck(r, p, SHIFTS['lantern-1']);
  const sum = pay.lines.reduce((a, l) => a + l.amount, 0);
  assert.equal(pay.net, sum);
  assert.equal(pay.after, STARTING_MONEY + sum);
  assert.ok(pay.lines.some(l => l.kind === 'wage' && l.amount === VENUES.lantern.wage));
  assert.ok(pay.lines.some(l => l.label === 'Rent' && l.amount === -18));
  assert.ok(pay.lines.some(l => l.label === 'Food' && l.amount === -PAY.food));
  assert.ok(pay.lines.some(l => l.label === 'Line cleared early'));
  const sent = { ...r, sentHome: true, passed: false };
  const halved = computePaycheck(sent, p, SHIFTS['lantern-1']);
  assert.equal(halved.lines[0].amount, VENUES.lantern.wage * PAY.sentHomeWageFactor);
  const licensed = { ...p, owned: [...p.owned, 'licence'] };
  assert.equal(computePaycheck(r, licensed, SHIFTS['lantern-1']).lines[0].amount, VENUES.lantern.wage + 20);
  const strike = computePaycheck(r, p, SHIFTS['halcyon-2']);
  assert.ok(strike.lines.some(l => /bus strike/.test(l.label)));
});

test('career standing: missed targets warn, three warnings fire, debt evicts', () => {
  const p = campaign.newPlayer('Career');
  const bad = { correct: 0, wrong: 3, walkouts: 0, tips: 0, fakesCaught: 0, underageStopped: 0, bestStreak: 0, outcomes: {}, flagInc: {}, flagSet: {}, bribeCount: 0, passed: false, rating: 10, target: 50, seriousMisses: 0 };
  for (let i = 0; i < 3; i++) applyShiftResult(p, bad, { lines: [], net: 0, after: p.money }, SHIFTS['lantern-1']);
  assert.equal(p.warnings, 3);
  assert.equal(p.gameOver, 'fired');
  const q = campaign.newPlayer('Debt');
  applyShiftResult(q, { ...bad, passed: true }, { lines: [], net: -500, after: -440 }, SHIFTS['lantern-1']);
  assert.equal(q.gameOver, 'evicted');
});

test('shop: purchases validate first, never go negative, and switch slots', () => {
  const p = campaign.newPlayer('Shop');
  p.money = 50;
  assert.equal(canBuy(p, 'uv-torch').ok, false);
  assert.equal(buy(p, 'uv-torch').ok, false);
  assert.equal(p.money, 50);
  assert.ok(buy(p, 'loupe').ok);
  assert.equal(p.money, 5);
  assert.equal(buy(p, 'loupe').ok, false, 'no double purchase');
  p.money = 1000;
  assert.ok(buy(p, 'bike').ok); assert.equal(p.transport, 'bike');
  assert.ok(buy(p, 'bus').ok); assert.equal(p.transport, 'bus'); assert.equal(p.money, 860, 'switching back is free');
  assert.ok(buy(p, 'stanchions').ok);
  assert.ok(shiftModifiers(p).patienceMult > 1);
  assert.ok(SHOP.some(i => i.cat === 'decor') && SHOP.some(i => i.cat === 'training') && SHOP.some(i => i.cat === 'career'));
});

test('story: scenes are well-formed and every branch resolves', () => {
  const p = campaign.newPlayer('Story');
  for (const scene of story.SCENES) {
    assert.ok(scene.nodes.start, scene.id);
    for (const [id, n] of Object.entries(scene.nodes)) {
      for (const c of n.choices ?? []) if (c.next) assert.ok(scene.nodes[c.next], `${scene.id}.${id} -> ${c.next}`);
      if (n.next) assert.ok(scene.nodes[n.next], `${scene.id}.${id}.next`);
      for (const b of n.branch ?? []) assert.ok(scene.nodes[b.next], `${scene.id}.${id} branch ${b.next}`);
      for (const l of n.lines ?? []) assert.ok(l[0] === null || story.CHARACTERS[l[0]], `${scene.id} speaker ${l[0]}`);
    }
    assert.ok(story.resolveNode(scene, 'start', p));
  }
  for (const e of Object.values(story.ENDINGS)) for (const l of e.lines) assert.ok(l[0] === null || story.CHARACTERS[l[0]]);
});

test('story branches: choices change flags, later scenes and the career shift', () => {
  const p = campaign.newPlayer('Branch');
  const victor = story.SCENES.find(s => s.id === 'victor-deal');
  story.applyEffects(p, victor.nodes.offer.choices[0]);
  assert.equal(p.flags.victor_deal, true);
  assert.ok(prepareShift(SHIFTS['halcyon-2'], p.flags, 'b').def.incidents.some(i => i.id === 'victor-call'));
  assert.equal(shiftIdAt(7, { career: 'kwame' }), 'voltage-1');
  assert.equal(shiftIdAt(7, { career: 'victor' }), 'halcyon-3');
  p.flags.career = 'victor';
  assert.deepEqual(story.pendingScenes(p, 7).map(s => s.id), ['victor-envelope']);
  p.flags.career = 'kwame';
  assert.deepEqual(story.pendingScenes(p, 7).map(s => s.id), ['kwame-proud']);
  // Branch nodes read shift outcomes.
  const varga = story.SCENES.find(s => s.id === 'varga');
  p.flags.outcomes = { decoy: { verdict: 'refuse', correct: true } };
  assert.equal(story.resolveNode(varga, 'branch', p).id, 'caught');
  p.flags.outcomes = { decoy: { verdict: 'admit', correct: false } };
  assert.equal(story.resolveNode(varga, 'branch', p).id, 'missed');
  story.applyEffects(p, varga.nodes.missed.choices[0]);
  assert.equal(p.warnings, 1);
  // Endings.
  const e = flags => story.chooseEnding({ flags: { outcomes: {}, ...flags }, stats: { fakesCaught: 0 } });
  assert.equal(e({ bribes_taken: 2, finale_passed: true }), 'busted');
  assert.equal(e({ finale_passed: false }), 'lights-out');
  assert.equal(e({ finale_passed: true, outcomes: { printer: { correct: true } } }), 'keeper');
  assert.equal(e({ finale_passed: true }), 'last-call');
});

test('campaign flow: scenes, briefing, career, next shift, ending', () => {
  const p = campaign.newPlayer('Flow');
  assert.deepEqual(campaign.nextStep(p), { type: 'scene', id: 'intro' });
  campaign.markSceneSeen(p, 'intro');
  assert.deepEqual(campaign.nextStep(p), { type: 'briefing', shiftId: 'lantern-1' });
  p.phase = 'career';
  assert.equal(campaign.nextStep(p).type, 'career');
  campaign.finishCareer(p);
  assert.deepEqual(campaign.nextStep(p), { type: 'scene', id: 'rent' });
  p.index = CAMPAIGN.length; p.phase = 'scene'; p.seenScenes = story.SCENES.map(s => s.id);
  assert.equal(campaign.nextStep(p).type, 'finish');
});

test('save: round-trips the campaign and repairs broken data', () => {
  const st = save.memoryStorage();
  const p = campaign.newPlayer('Saver');
  p.money = 321; p.index = 4; p.phase = 'career'; p.flags = { outcomes: { gus: { verdict: 'refuse', correct: true } }, juno_ally: true, career: 'kwame' };
  p.owned.push('uv-torch', 'studio'); p.housing = 'studio'; p.warnings = 1; p.seenScenes = ['intro', 'rent']; p.stats.correct = 40;
  save.savePlayer(st, p);
  const back = save.loadPlayer(st);
  for (const k of ['money', 'index', 'phase', 'flags', 'owned', 'housing', 'warnings', 'seenScenes', 'name']) assert.deepEqual(back[k], p[k], k);
  assert.equal(back.stats.correct, 40);
  st.setItem('lastcall.save', JSON.stringify({ money: 'lots', index: 99, owned: ['hacked', 'loupe'], housing: 'castle', phase: 'nope', seenScenes: ['fake', 'intro'], gameOver: 'yes' }));
  const fixed = save.loadPlayer(st);
  assert.equal(fixed.money, STARTING_MONEY);
  assert.equal(fixed.index, CAMPAIGN.length);
  assert.deepEqual(fixed.owned.sort(), ['bus', 'couch', 'loupe']);
  assert.equal(fixed.housing, 'couch');
  assert.equal(fixed.phase, 'scene');
  assert.deepEqual(fixed.seenScenes, ['intro']);
  assert.equal(fixed.gameOver, null);
  st.setItem('lastcall.save', '{not json');
  assert.equal(save.loadPlayer(st), null);
  save.saveCheckpoint(st, p);
  assert.equal(save.loadCheckpoint(st).money, 321);
  save.clearSave(st);
  assert.equal(save.loadPlayer(st), null);
});

test('settings persist separately and are validated', () => {
  const st = save.memoryStorage();
  save.saveSettings(st, { ...save.defaultSettings(), master: 0.3, timer: 'relaxed', reduceMotion: true });
  const s = save.loadSettings(st);
  assert.equal(s.master, 0.3); assert.equal(s.timer, 'relaxed'); assert.equal(s.reduceMotion, true);
  st.setItem('lastcall.settings', JSON.stringify({ master: 7, timer: 'warp', hints: 'yes' }));
  const bad = save.loadSettings(st);
  assert.equal(bad.master, 1); assert.equal(bad.timer, 'standard'); assert.equal(bad.hints, true);
});

test('conditions', () => {
  const f = { a: true, n: 2, career: 'kwame', outcomes: { decoy: { verdict: 'refuse', correct: true } } };
  assert.ok(testCondition(undefined, f));
  assert.ok(testCondition({ flag: 'a' }, f));
  assert.ok(testCondition({ flag: 'career', eq: 'kwame' }, f));
  assert.ok(testCondition({ flag: 'n', gte: 2 }, f));
  assert.ok(!testCondition({ flag: 'n', gte: 3 }, f));
  assert.ok(testCondition({ outcome: 'decoy', correct: true }, f));
  assert.ok(testCondition({ all: [{ flag: 'a' }, { not: { flag: 'b' } }] }, f));
  assert.ok(testCondition({ any: [{ flag: 'b' }, { flag: 'a' }] }, f));
  assert.ok(testCondition({ upgrade: 'loupe' }, f, { owned: ['loupe'], money: 0 }));
});

test('portraits render every profile and mood as SVG', () => {
  for (const p of PROFILES) for (const mood of ['neutral', 'happy', 'angry', 'sad', 'nervous', 'smirk', 'surprised', 'stern']) {
    const svg = portraitSvg(p.face, { top: p.outfit[0], mood, drunk: mood === 'happy' });
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'));
    assert.ok(!svg.includes('undefined') && !svg.includes('NaN'), `${p.id} ${mood}`);
  }
});

test('compare tool verdicts', () => {
  if (!compareResult) return;
  assert.equal(compareResult({ kind: 'name', label: 'a', value: 'Ada Abara' }, { kind: 'name', label: 'b', value: 'ada abara' }).tone, 'good');
  assert.equal(compareResult({ kind: 'name', label: 'a', value: 'Ada Abara' }, { kind: 'name', label: 'b', value: 'Ada Abra' }).tone, 'bad');
  assert.match(compareResult({ kind: 'date', label: 'Expiry', value: '2031-03-01' }, { kind: 'date', label: 'Tonight', value: '2031-03-07' }).text, /6 days before/);
  assert.equal(compareResult({ kind: 'height', label: 'a', value: 170 }, { kind: 'height', label: 'b', value: 186 }).tone, 'bad');
  assert.match(compareResult({ kind: 'height', label: 'a', value: 170 }, { kind: 'eyes', label: 'b', value: 'blue' }).text, /different things/);
});

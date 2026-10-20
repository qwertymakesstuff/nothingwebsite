import test from 'node:test';
import assert from 'node:assert/strict';
const B = await import(new URL('../../gta/js/pedBrain.js', import.meta.url));
const { S, Brain, makePersonality, TYPE_NAMES, TYPES, TRANSITIONS, MAX_TIME, nearMissSeverity, crashSeverity, reactToNearMiss, wantsToConfront, wantsToFight, fightOrFlight, reportChance, pickLine, LINES } = B;
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

test('personalities: every type produces valid, varied values and the mix is mostly ordinary people', () => {
  const rng = seeded(7), counts = {}, vals = [];
  for (let i = 0; i < 3000; i++) { const p = makePersonality(rng); counts[p.type] = (counts[p.type] || 0) + 1; for (const k of ['aggression', 'courage', 'fear', 'lawfulness', 'curiosity', 'helpfulness']) { assert.ok(p[k] >= .02 && p[k] <= .98, k); } vals.push(p.aggression); }
  for (const t of TYPE_NAMES) assert.ok(counts[t] > 40, t + ' appears');
  assert.ok(counts.aggressive < counts.indifferent, 'aggressive people are rarer than indifferent ones');
  assert.ok(new Set(vals.map(v => v.toFixed(6))).size > 2500, 'no two pedestrians are the same');
  for (const t of TYPE_NAMES) { const a = makePersonality(seeded(3), t), b = makePersonality(seeded(3), t); assert.deepEqual(a, b, 'same seed, same person'); }
  const mean = (t, k) => { const r = seeded(9); let s = 0; for (let i = 0; i < 400; i++) s += makePersonality(r, t)[k]; return s / 400; };
  assert.ok(mean('aggressive', 'aggression') > mean('timid', 'aggression') + .5); assert.ok(mean('timid', 'fear') > mean('confident', 'fear') + .5); assert.ok(mean('lawAbiding', 'lawfulness') > mean('opportunistic', 'lawfulness') + .5);
});
test('state machine: only legal moves, minimum times stop flapping, danger overrides, and timeouts always end a state', () => {
  const b = new Brain(); assert.equal(b.state, S.WALKING);
  assert.equal(b.go(S.RETURNING_TO_ROUTINE, 0), false, 'cannot return to a routine you never left'); assert.equal(b.go(S.FIGHTING, 0), true, 'walking can go anywhere');
  const c = new Brain(); assert.equal(c.go(S.STARTLED, 0), true); assert.equal(c.go(S.FIGHTING, 0), false, 'startled people do not jump straight into a fight');
  c.tick(.1, 0.1); assert.equal(c.go(S.OBSERVING_EVENT, .1), false, 'too soon (minimum dwell)'); assert.equal(c.go(S.FLEEING, .1), true, 'but real danger always wins');
  const d = new Brain(); d.go(S.FLEEING, 0); d.tick(.5, .5); assert.equal(d.go(S.RETURNING_TO_ROUTINE, .5), false, 'a fleeing person does not stop after half a second'); d.tick(2, 2.5); assert.equal(d.go(S.RETURNING_TO_ROUTINE, 2.5), true);
  for (const st of Object.keys(MAX_TIME)) { const x = new Brain(); x.state = st; let forced = null; for (let i = 0; i < 4000 && !forced; i++) forced = x.tick(.05, i * .05); assert.ok(forced, st + ' ends by itself'); assert.ok([S.WALKING, S.RETURNING_TO_ROUTINE].includes(forced)); }
  const r = new Brain(); r.state = S.RETURNING_TO_ROUTINE; for (let i = 0; i < 400; i++) r.tick(.05, i * .05); assert.equal(r.state, S.WALKING, 'everyone eventually goes back to normal');
  for (const [from, list] of Object.entries(TRANSITIONS)) for (const to of list) assert.ok(S[to], from + ' -> ' + to + ' exists');
  // the example chains from the brief are all legal
  const chain = (...s) => { const q = new Brain(); for (const to of s) { q.t = 99; assert.ok(q.go(to, 0), q.state + ' -> ' + to); } };
  chain(S.STARTLED, S.FLEEING, S.RETURNING_TO_ROUTINE, S.WALKING); chain(S.ANGRY, S.CONFRONTING_PLAYER, S.FIGHTING, S.RETURNING_TO_ROUTINE); chain(S.OBSERVING_EVENT, S.CALLING_POLICE, S.FLEEING);
  chain(S.ANGRY, S.CONFRONTING_PLAYER, S.ARGUING, S.FIGHTING, S.FLEEING, S.RETURNING_TO_ROUTINE);
});
test('memory and cooldowns: short, per purpose, and they expire', () => {
  const b = new Brain(); b.remember('car:7', 10, 8); assert.ok(b.recalls('car:7', 12)); assert.ok(!b.recalls('car:7', 19)); assert.ok(!b.recalls('car:8', 12));
  assert.ok(b.ready('speech', 0, 3)); assert.ok(!b.ready('speech', 1, 3)); assert.ok(b.ready('speech', 3.1, 3)); assert.ok(b.ready('report', 1, 20), 'other cooldowns are independent');
  for (let i = 0; i < 40; i++) b.remember('k' + i, 0, 1); b.remember('late', 100, 5); assert.ok(b.memory.size <= 14, 'memory stays tiny');
  const f = new Brain(), p = makePersonality(seeded(1), 'nervous'); f.addFear(p, .5); assert.ok(f.fear > .5); f.tick(10, 10); assert.ok(f.fear < .5, 'fear fades');
});
test('near-miss severity: a safe pass is nothing, a close fast pass is a close call, and slow or receding cars do not count', () => {
  assert.equal(nearMissSeverity(12, 6, true), 0, 'far enough'); assert.equal(nearMissSeverity(3, .5, true), 0, 'too slow to matter'); assert.equal(nearMissSeverity(15, .4, false), 0, 'car is moving away');
  assert.equal(nearMissSeverity(16, .5, true), 3); assert.equal(nearMissSeverity(10, .3, true), 3); assert.equal(nearMissSeverity(9, 1.0, true), 2);
  assert.equal(nearMissSeverity(6, 1.2, true), 1); assert.ok(nearMissSeverity(14, 2.0, true) >= 2);
  let last = 99; for (let c = .2; c < 4; c += .2) { const s = nearMissSeverity(14, c, true); assert.ok(s <= last, 'the farther the pass, the lower the severity'); last = s; }
  assert.deepEqual([2, 5, 10, 20].map(crashSeverity), [0, 1, 2, 3]);
});
test('reactions: timid people run, aggressive people shout, indifferent people mostly ignore a minor scare, nobody reacts to nothing', () => {
  const tally = (type, sev, n = 800) => { const rng = seeded(11), out = { ignore: 0, startle: 0, flee: 0, angry: 0 }; for (let i = 0; i < n; i++) out[reactToNearMiss(makePersonality(rng, type), sev, rng).act]++; return out; };
  const t = tally('timid', 3), a = tally('aggressive', 3), i1 = tally('indifferent', 1);
  assert.ok(t.flee + t.startle > t.angry * 3, 'timid: ' + JSON.stringify(t)); assert.ok(a.angry > a.flee, 'aggressive: ' + JSON.stringify(a)); assert.ok(i1.ignore > 400, 'indifferent: ' + JSON.stringify(i1));
  assert.equal(reactToNearMiss(makePersonality(seeded(1)), 0, seeded(2)).act, 'ignore');
  const armed = reactToNearMiss(makePersonality(seeded(4), 'aggressive'), 3, () => .9, { armed: true }); assert.equal(armed.act, 'flee', 'nobody picks a fight with someone holding a gun');
});
test('confrontation: needs real provocation, is rare, and does not happen against an armed or fleeing driver', () => {
  const rate = (type, ctx, n = 1000) => { const rng = seeded(21); let k = 0; for (let i = 0; i < n; i++) if (wantsToConfront(makePersonality(rng, type), ctx, rng)) k++; return k / n; };
  assert.ok(rate('aggressive', { severity: 1 }) < .3, 'a minor scare rarely starts anything'); assert.ok(rate('aggressive', { severity: 3, hit: true }) > .6, 'serious provocation does');
  assert.ok(rate('timid', { severity: 3, hit: true }) < .08); assert.ok(rate('aggressive', { severity: 3, armed: true }) < .05); assert.ok(rate('aggressive', { severity: 3, fleeing: true }) < rate('aggressive', { severity: 3 }) / 2);
  const fight = (type, ctx) => { const rng = seeded(5); let k = 0; for (let i = 0; i < 1000; i++) if (wantsToFight(makePersonality(rng, type), ctx, rng)) k++; return k / 1000; };
  assert.equal(fight('aggressive', { severity: 3, playerOnFoot: false }), 0, 'nobody fights a car'); assert.equal(fight('aggressive', { severity: 3, playerOnFoot: true, armed: true }), 0);
  assert.ok(fight('aggressive', { severity: 3, playerOnFoot: true }) > fight('timid', { severity: 3, playerOnFoot: true }) + .2); assert.ok(fight('indifferent', { severity: 1, playerOnFoot: true }) < .1);
  assert.equal(fightOrFlight(makePersonality(seeded(1), 'aggressive'), { armed: true, hpFraction: 1 }, () => .9), 'flee'); assert.equal(fightOrFlight(makePersonality(seeded(1), 'confident'), { hpFraction: .2 }, () => .9), 'flee');
});
test('reporting chance: serious crimes are reported more, law-abiding people more, frightened people less, and nobody is certain', () => {
  const law = makePersonality(seeded(2), 'lawAbiding'), opp = makePersonality(seeded(2), 'opportunistic');
  assert.ok(reportChance(law, 3, 10, 0) > reportChance(law, 1, 10, 0)); assert.ok(reportChance(law, 2, 10, 0) > reportChance(opp, 2, 10, 0)); assert.ok(reportChance(law, 2, 10, .1) > reportChance(law, 2, 10, 1));
  assert.ok(reportChance(law, 2, 40, 0) < reportChance(law, 2, 10, 0)); assert.ok(reportChance(law, 2, 10, 0, { threatNear: true }) < reportChance(law, 2, 10, 0));
  for (const t of TYPE_NAMES) for (const sev of [1, 2, 3, 4]) { const c = reportChance(makePersonality(seeded(8), t), sev, 12, .2); assert.ok(c >= 0 && c <= .97); }
});
test('speech: short lines, never the same twice in a row', () => {
  for (const [k, list] of Object.entries(LINES)) for (const l of list) assert.ok(l.length < 48 && l.length > 1, k + ': ' + l);
  let last = ''; const rng = seeded(3); for (let i = 0; i < 200; i++) { const l = pickLine('nearmiss', rng, last); assert.notEqual(l, last); last = l; }
  assert.equal(pickLine('nothing'), '');
});

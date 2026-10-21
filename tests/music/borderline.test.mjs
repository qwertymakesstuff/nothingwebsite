import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../../borderline/', import.meta.url);
const { createGame, dispatch, currentVisitor, decisionFor, buildEntrants, daySeed } = await import(new URL('js/gameState.js', root));
const { generateVisitor, FLAWS, misspell, requirements } = await import(new URL('js/visitorGenerator.js', root));
const { documentFields } = await import(new URL('js/documentFactory.js', root));
const { createRng } = await import(new URL('js/rng.js', root));
const { compare } = await import(new URL('js/inspectionEngine.js', root));
const { evaluate, nationalityOf } = await import(new URL('js/rulesEngine.js', root));
const { REGULATIONS, activeRegulations, regulationChanges, archivedRegulations, activeTopic } = await import(new URL('data/regulations.js', root));
const { briefingHTML } = await import(new URL('js/briefing.js', root));
const { renderRulebook } = await import(new URL('js/rulebook.js', root));
const { FLAWS_BY_ID } = await import(new URL('js/visitorGenerator.js', root));
const { assess, shiftReport } = await import(new URL('js/decisionSystem.js', root));
const { SCORING } = await import(new URL('data/scoring.js', root));
const { DOCUMENT_TYPES } = await import(new URL('data/documents.js', root));
const { renderDocument } = await import(new URL('js/documentRenderer.js', root));
const { formatDoc, formatLong, isValidDate } = await import(new URL('js/dates.js', root));
const { VISITORS } = await import(new URL('data/visitors.js', root));
const { DAYS, LAST_DAY } = await import(new URL('data/campaignDays.js', root));
const { NATIONS, SETTING, FORGED_SEALS } = await import(new URL('data/setting.js', root));
const { PORTRAITS, portraitPath } = await import(new URL('data/portraits.js', root));
const { portraitHTML } = await import(new URL('js/portrait.js', root));
const { ageOn } = await import(new URL('js/dates.js', root));
const SEED = 20240611;
const RULES = activeRegulations(1);
const CTX = { date: DAYS[0].date };
const DATE = DAYS[0].date;
// a day's generation context: its date, regulations and what they require of papers
const dayCtx = n => { const d = DAYS[n - 1], rules = activeRegulations(n); return { date: d.date, rules, need: requirements(rules), day: d }; };
const genOn = (n, seed, opts = {}) => { const c = dayCtx(n); return generateVisitor(createRng(seed), { id: `d${n}_${seed}`, date: c.date, rules: c.rules, nations: c.day.nations, purposes: c.day.purposes, ...opts }); };
const open = s => run(s, { type: 'openCheckpoint' });
// every generated entrant across many seeds, one per flaw plus clean ones
function sample(n = 400) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const rng = createRng(1000 + i);
    out.push(generateVisitor(rng, { id: `t${i}`, date: DATE, flaw: i % 3 ? 'random' : null }));
  }
  return out;
}

function run(state, ...actions) { return actions.reduce((s, a) => {
  const r = dispatch(s, a);
  assert.equal(r.error, null, `${a.type}: ${r.error}`);
  return r.state;
}, state); }

test('every borderline module has valid syntax', () => {
  for (const sub of ['js/', 'data/']) {
    const dir = new URL(sub, root);
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
      const r = spawnSync(process.execPath, ['--check', new URL(f, dir).pathname]);
      assert.equal(r.status, 0, `${sub}${f}: ${r.stderr}`);
    }
  }
});

test('data: days reference real entrants, documents are well formed', () => {
  for (const day of DAYS) {
    assert.ok(isValidDate(day.date), day.date);
    assert.ok(day.entrants.length > 0);
    const authored = day.entrants.filter(id => id !== 'gen');
    assert.equal(new Set(authored).size, authored.length, 'no authored entrant appears twice in one shift');
    for (const id of authored) assert.ok(VISITORS[id], `unknown entrant ${id}`);
  }
  for (const v of Object.values(VISITORS)) {
    const passports = v.documents.filter(d => d.type === 'passport');
    assert.equal(passports.length, 1, `${v.id} carries exactly one passport`);
    const p = passports[0];
    assert.ok(NATIONS[p.nationality], `${v.id} passport nation`);
    for (const d of v.documents) assert.ok(DOCUMENT_TYPES[d.type], `${v.id} document type ${d.type}`);
    assert.ok(isValidDate(p.dob) && isValidDate(p.expires), `${v.id} passport dates`);
    for (const d of v.documents.filter(d => d.type === 'declaration')) assert.ok(NATIONS[d.nationality], `${v.id} declaration nationality`);
    if (p.nationality === SETTING.country.code) assert.ok(v.documents.some(d => d.type === 'idCard'), `${v.id} citizen carries an identity card`);
    if (p.nationality !== SETTING.country.code) assert.ok(v.documents.some(d => d.type === 'declaration'), `${v.id} foreigner carries a declaration`);
  }
});

test('dates format for documents and the desk', () => {
  assert.equal(formatDoc('1982-03-12'), '12.03.1982');
  assert.equal(formatLong('1982-03-12'), '12 March 1982');
  assert.equal(formatDoc('nonsense'), '—');
  assert.ok(!isValidDate('1982-02-30') && isValidDate('1984-02-29'));
});

test('shift loop: call, decide, return, through to the end of the shift', () => {
  let s = createGame(1, SEED);
  const day = DAYS[0];
  assert.equal(s.money, SETTING.startingMoney);
  assert.equal(s.shift.phase, 'briefing');
  assert.ok(dispatch(s, { type: 'callNext' }).error, 'the barrier stays down during the briefing');
  s = open(s);
  assert.equal(s.shift.phase, 'waiting');
  assert.ok(dispatch(s, { type: 'openCheckpoint' }).error, 'opened once');
  day.entrants.forEach((id, i) => {
    s = run(s, { type: 'callNext' });
    assert.equal(currentVisitor(s).id, s.shift.queue[i]);
    if (id !== 'gen') assert.equal(currentVisitor(s).id, id);
    assert.equal(s.shift.phase, 'inspecting');
    s = run(s, { type: 'decide', decision: i % 2 ? 'reject' : 'accept' });
    assert.equal(decisionFor(s, s.shift.queue[i]).decision, i % 2 ? 'reject' : 'accept');
    s = run(s, { type: 'returnPapers' });
  });
  assert.equal(s.shift.phase, 'shiftEnd');
  assert.equal(s.shift.decisions.length, day.entrants.length);
  const correct = s.shift.decisions.filter(d => d.correct).length;
  assert.equal(s.shift.earned, SCORING.wage * correct);
  assert.equal(s.money, SETTING.startingMoney + s.shift.earned - s.shift.fines);
  assert.ok(dispatch(s, { type: 'callNext' }).error);
});

test('a visitor can only be processed once and actions are phase-checked', () => {
  const s0 = open(createGame(1, SEED));
  assert.ok(dispatch(s0, { type: 'decide', decision: 'accept' }).error, 'no decision with an empty booth');
  assert.ok(dispatch(s0, { type: 'returnPapers' }).error);
  const s1 = run(s0, { type: 'callNext' });
  assert.ok(dispatch(s1, { type: 'callNext' }).error, 'booth occupied');
  assert.ok(dispatch(s1, { type: 'decide', decision: 'maybe' }).error);
  const s2 = run(s1, { type: 'decide', decision: 'accept' });
  const again = dispatch(s2, { type: 'decide', decision: 'reject' });
  assert.ok(again.error, 'second stamp refused');
  assert.equal(again.state, s2, 'refused action leaves state untouched');
  const rec = s2.shift.decisions[0];
  assert.equal(s2.money, s0.money + rec.pay - rec.fine, 'paid or fined once');
  assert.equal(s2.shift.decisions.length, 1);
  assert.equal(s0.money, SETTING.startingMoney, 'dispatch never mutates its input');
  assert.equal(s0.shift.phase, 'waiting');
  assert.ok(dispatch(s0, { type: 'bogus' }).error);
  assert.ok(dispatch(s0, { type: 'nextDay' }).error, 'no new day before the shift ends');
});

const shownFields = html => Object.fromEntries([...html.matchAll(/data-field="(\w+)" data-kind="\w+"><span class="f-label">[^<]*<\/span><span class="f-value">([^<]*)<\/span>/g)].map(m => [m[1], m[2]]));
const unescape = t => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

test('documents display exactly their underlying data (authored and generated)', () => {
  const visitors = [...Object.values(VISITORS), ...sample(150)];
  for (const v of visitors) {
    for (const doc of v.documents) {
      const shown = shownFields(renderDocument(doc, v));
      const fields = documentFields(doc);
      assert.deepEqual(Object.keys(shown).sort(), fields.map(f => f.key).sort(), `${v.id} ${doc.type} shows every field once`);
      for (const f of fields) {
        const raw = doc[f.key];
        const expected = f.format === 'date' ? formatDoc(raw) : f.format === 'nation' ? NATIONS[raw].name : f.format === 'days' ? `${raw} day${raw === 1 ? '' : 's'}` : String(raw);
        assert.equal(unescape(shown[f.key]), expected, `${v.id} ${doc.type}.${f.key}`);
      }
      if (doc.type === 'passport') assert.ok(renderDocument(doc, v).includes(`data-seal="${doc.seal}"`), 'cover seal is the document seal');
    }
  }
  const p = VISITORS.v_ilse_marek.documents[0];
  assert.match(renderDocument(p, VISITORS.v_ilse_marek, { stamp: 'reject' }), /Entry denied/);
  assert.doesNotMatch(renderDocument(p, VISITORS.v_ilse_marek), /class="doc-stamp /);
  assert.throws(() => renderDocument({ type: 'unknown' }, VISITORS.v_ilse_marek));
});

test('generator: papers in order are complete and consistent', () => {
  for (let i = 0; i < 300; i++) {
    const v = generateVisitor(createRng(i + 1), { id: 'c', date: DATE });
    assert.equal(v.generated.flaw, null);
    const p = v.documents.find(d => d.type === 'passport');
    assert.ok(p && NATIONS[p.nationality].cities.includes(p.issuedIn) && p.seal === NATIONS[p.nationality].emblem);
    assert.ok(p.expires > DATE && isValidDate(p.dob));
    const citizen = p.nationality === SETTING.country.code;
    const decl = v.documents.find(d => d.type === 'declaration');
    assert.equal(Boolean(v.documents.find(d => d.type === 'idCard')), citizen);
    assert.equal(Boolean(decl), !citizen);
    if (decl) {
      assert.equal(Boolean(v.documents.find(d => d.type === 'workPermit')), decl.purpose === 'Work');
      assert.equal(Boolean(v.documents.find(d => d.type === 'transitPass')), decl.purpose === 'Transit');
    }
    for (const d of v.documents) {
      assert.equal(d.surname, p.surname); assert.equal(d.given, p.given);
      if ('passportNo' in d) assert.equal(d.passportNo, p.number);
      if ('dob' in d) assert.equal(d.dob, p.dob);
      if ('nationality' in d) assert.equal(d.nationality, p.nationality);
      for (const f of documentFields(d)) if (f.format === 'date') assert.ok(isValidDate(f.value), `${d.type}.${f.key} ${f.value}`);
    }
  }
});

test('generator: every flaw can be planted on some day and changes the papers', () => {
  for (const flaw of FLAWS) {
    let planted = 0;
    for (let n = 1; n <= LAST_DAY && planted < 5; n++) {
      if (!activeTopic(n, flaw.topic)) continue;
      for (let i = 0; i < 300 && planted < 5; i++) {
        const clean = genOn(n, i + 7);
        if (!flaw.applies(clean, dayCtx(n))) continue;
        const v = genOn(n, i + 7, { flaw: flaw.id });
        assert.equal(v.generated.flaw, flaw.id);
        assert.notDeepEqual(v.documents, clean.documents, `${flaw.id} changed something`);
        planted++;
      }
    }
    assert.ok(planted > 0, `${flaw.id} found a suitable entrant on some day`);
  }
  assert.deepEqual(new Set(FLAWS.map(f => f.category)), new Set(['expired', 'incomplete', 'contradictory', 'forged', 'exception', 'restricted', 'travel']));
  for (const seal of Object.values(FORGED_SEALS)) assert.ok(!Object.values(NATIONS).some(n => n.emblem === seal));
  const rng = createRng(5);
  for (const w of ['KAIN', 'ARNSEN', 'MIKEL', 'OSKARYEV', 'VIK']) for (let i = 0; i < 30; i++) assert.notEqual(misspell(rng, w), w);
});

test('generator: clean papers satisfy each day\'s requirements', () => {
  for (let n = 1; n <= LAST_DAY; n++) {
    const { need } = dayCtx(n);
    for (let i = 0; i < 200; i++) {
      const v = genOn(n, i);
      const p = v.documents.find(d => d.type === 'passport');
      const decl = v.documents.find(d => d.type === 'declaration');
      const has = t => v.documents.some(d => d.type === t);
      if (decl) assert.equal(has('entryPermit'), need.entryPermit, `day ${n} entry permit`);
      assert.equal(has('healthCert'), need.healthNations.includes(p.nationality), `day ${n} health certificate`);
      if (need.maxStay && decl && !need.maxStay.exceptPurposes.includes(decl.purpose)) assert.ok(decl.duration <= need.maxStay.days);
      const pass = v.documents.find(d => d.type === 'transitPass');
      if (need.routes && pass) assert.ok(need.routes.includes(pass.route));
      for (const r of need.restricted) if (r.nations.includes(p.nationality)) assert.ok(r.exceptPurposes.includes(decl.purpose), `day ${n} restricted nationals travel only for allowed purposes`);
    }
  }
});

test('a seed always produces the same shift', () => {
  assert.deepEqual(buildEntrants(DAYS[0], 99), buildEntrants(DAYS[0], 99));
  assert.notDeepEqual(buildEntrants(DAYS[0], 99), buildEntrants(DAYS[0], 100));
  const s = createGame(1, 99);
  assert.equal(s.shift.entrants.length, DAYS[0].entrants.length);
  assert.equal(new Set(s.shift.queue).size, s.shift.queue.length, 'entrant ids are unique');
});

test('rendered text is escaped', () => {
  const v = { look: {} };
  const html = renderDocument({ type: 'declaration', surname: '<script>', given: 'A&B', nationality: 'OSK', passportNo: '"x"', purpose: 'p', duration: 3, destination: 'z' }, v);
  assert.ok(!html.includes('<script>') && html.includes('&lt;script&gt;') && html.includes('A&amp;B'));
});

test('comparison tool reports agreement, discrepancies and validity', () => {
  const item = (kind, value, where = 'passport', extra = {}) => ({ kind, value, display: Array.isArray(value) ? '' : String(value), label: kind, where, ...extra });
  assert.equal(compare(item('surname', 'REYL'), item('surname', 'REYL', 'declaration')).status, 'match');
  const d = compare(item('given', 'MIKEL'), item('given', 'MIKKEL', 'declaration'));
  assert.equal(d.status, 'mismatch'); assert.match(d.message, /MIKEL.*MIKKEL/);
  assert.equal(compare(item('passportNo', 'CR-1'), item('passportNo', 'CR-2', 'work permit')).status, 'mismatch');
  const today = item('today', '1982-03-12', 'date plate');
  assert.equal(compare(item('expiry', '1981-12-01'), today).status, 'mismatch');
  assert.equal(compare(today, item('expiry', '1982-03-12')).status, 'match', 'valid on its last day');
  assert.match(compare(item('dob', '1913-04-08'), today).message, /68 years/);
  const cities = item('issuerList', ['Mirn', 'Tavrask'], 'rulebook', { label: 'Oskaria' });
  assert.equal(compare(item('issuer', 'Mirn'), cities).status, 'match');
  assert.equal(compare(cities, item('issuer', 'Nordmirn')).status, 'mismatch');
  const seal = item('sealRef', 'wheel', 'rulebook', { label: 'Oskaria' });
  assert.equal(compare(item('seal', 'wheel'), seal).status, 'match');
  assert.equal(compare(item('seal', 'wheel3'), seal).status, 'mismatch');
  assert.equal(compare(item('surname', 'A'), item('district', 'Brenna', 'identity card')).status, 'unrelated');
  assert.equal(compare(item('surname', 'A'), item('given', 'A')).status, 'unrelated', 'a surname is not a given name');
});

test('regulations: unique ids, known check kinds, active by day', () => {
  assert.equal(new Set(REGULATIONS.map(r => r.id)).size, REGULATIONS.length);
  const dummy = { documents: [] };
  for (const r of REGULATIONS) assert.doesNotThrow(() => evaluate(dummy, [r], CTX), r.id);
  assert.throws(() => evaluate(dummy, [{ id: 'x', kind: 'nope' }], CTX));
  assert.ok(RULES.length > 0 && RULES.every(r => r.from <= 1));
  for (const f of FLAWS) assert.ok(REGULATIONS.some(r => r.topic === f.topic), `${f.id} names a real regulation topic`);
  for (const r of REGULATIONS) {
    assert.ok(r.topic, `${r.id} has a topic`);
    assert.ok(DAYS.some(d => d.day === r.from), `${r.id} starts on a campaign day`);
    if (r.replaces) assert.equal(REGULATIONS.find(x => x.id === r.replaces).topic, r.topic, `${r.id} replaces a rule on its own topic`);
  }
  for (let n = 1; n <= LAST_DAY; n++) {
    const topics = activeRegulations(n).map(r => r.topic);
    assert.equal(new Set(topics).size, topics.length, `day ${n}: one version of each rule in force`);
  }
});

test('rules engine: authored entrants get the verdict their papers support', () => {
  const expected = { v_ilse_marek: 'accept', v_tomas_reyl: 'accept', v_anika_sorvald: 'reject', v_mikel_arnsen: 'reject', v_odessa_kain: 'accept', v_piotr_halden: 'accept' };
  for (const [id, verdict] of Object.entries(expected)) assert.equal(evaluate(VISITORS[id], RULES, CTX).verdict, verdict, id);
  const anika = evaluate(VISITORS.v_anika_sorvald, RULES, CTX);
  assert.deepEqual(anika.violations.map(v => v.rule), ['passport-valid']);
  assert.deepEqual(anika.violations[0].evidence, [{ doc: 0, field: 'expires' }]);
  const mikel = evaluate(VISITORS.v_mikel_arnsen, RULES, CTX);
  assert.deepEqual(mikel.violations.map(v => v.rule), ['documents-agree']);
  assert.match(mikel.violations[0].message, /MIKKEL.*MIKEL/);
  assert.equal(anika.checks.length, RULES.length, 'every active rule is reported');
});

test('rules engine agrees with every planted case on every day, and only the planted rule fails', () => {
  const byFlaw = {};
  for (let n = 1; n <= LAST_DAY; n++) {
    const { rules, date } = dayCtx(n);
    const topics = new Set(rules.map(r => r.topic));
    const allowedFlaws = FLAWS.filter(f => topics.has(f.topic)).map(f => f.id);
    for (let i = 0; i < 800; i++) {
      const v = genOn(n, i + 31, { flaw: i % 4 ? 'random' : null, allowedFlaws });
      const r = evaluate(v, rules, { date });
      const f = v.generated.flaw && FLAWS_BY_ID[v.generated.flaw];
      byFlaw[v.generated.flaw || 'clean'] = (byFlaw[v.generated.flaw || 'clean'] || 0) + 1;
      if (!f || f.legal) { assert.equal(r.verdict, 'accept', `day ${n} ${v.generated.flaw || 'clean'} ${JSON.stringify(r.violations)}`); continue; }
      assert.equal(r.verdict, 'reject', f.id);
      assert.deepEqual([...new Set(r.violations.map(x => x.topic))], [f.topic], `day ${n} ${f.id}: ${JSON.stringify(r.violations)}`);
      for (const x of r.violations) for (const e of x.evidence) assert.ok(v.documents[e.doc], `${f.id} evidence points at a real paper`);
    }
  }
  for (const f of FLAWS) assert.ok(byFlaw[f.id] > 0, `${f.id} occurs in random generation`);
});

test('rules engine: expiry boundaries and the elderly-citizen exception', () => {
  const rule2 = REGULATIONS.find(r => r.id === 'passport-valid-2');
  const ex = rule2.params.exception;
  const person = (nationality, age, expiresDaysAgo) => {
    const dob = `${1982 - age}-01-01`;
    const exp = new Date(Date.UTC(1982, 2, 12) - expiresDaysAgo * 86400000).toISOString().slice(0, 10);
    return { documents: [{ type: 'passport', nationality, seal: NATIONS[nationality].emblem, surname: 'A', given: 'B', dob, sex: 'F', issuedIn: NATIONS[nationality].cities[0], expires: exp, number: 'N' }] };
  };
  const only = [rule2];
  const before = [REGULATIONS.find(r => r.id === 'passport-valid')];
  assert.equal(evaluate(person('COR', 80, 10), before, CTX).verdict, 'reject', 'no exception before Day 4');
  assert.equal(evaluate(person('OSK', 30, 0), only, CTX).verdict, 'accept', 'valid on its expiry date');
  assert.equal(evaluate(person('OSK', 30, 1), only, CTX).verdict, 'reject');
  assert.equal(evaluate(person('COR', ex.minAge, ex.graceDays - 1), only, CTX).verdict, 'accept');
  assert.match(evaluate(person('COR', ex.minAge, 10), only, CTX).checks[0].note, /exception/);
  assert.equal(evaluate(person('COR', ex.minAge, ex.graceDays), only, CTX).verdict, 'reject', 'grace period is less than a year');
  assert.equal(evaluate(person('COR', ex.minAge - 1, 10), only, CTX).verdict, 'reject', 'too young for the exception');
  assert.equal(evaluate(person('OSK', 80, 10), only, CTX).verdict, 'reject', 'exception is for citizens only');
});

test('rules engine applies only the regulations it is given', () => {
  const worker = generateVisitor(createRng(3), { id: 'w', date: CTX.date });
  let v = null;
  for (let i = 0; i < 500 && !v; i++) {
    const c = generateVisitor(createRng(i), { id: 'w', date: CTX.date });
    if (c.documents.some(d => d.type === 'workPermit')) v = generateVisitor(createRng(i), { id: 'w', date: CTX.date, flaw: 'missingWorkPermit' });
  }
  assert.ok(v && worker);
  const day2 = activeRegulations(2);
  assert.equal(evaluate(v, day2, CTX).verdict, 'reject');
  assert.equal(evaluate(v, RULES, CTX).verdict, 'accept', 'the work-permit rule is not in force on Day 1');
  assert.equal(evaluate(v, day2.filter(r => r.id !== 'work-permit'), CTX).verdict, 'accept', 'a rule not in force is not applied');
  assert.equal(nationalityOf([{ type: 'idCard' }]), 'COR');
  assert.equal(nationalityOf([]), null);
  // shifts only contain flaws against regulations in force
  for (let n = 1; n <= LAST_DAY; n++) {
    const topics = new Set(activeRegulations(n).map(r => r.topic));
    for (const e of buildEntrants(DAYS[n - 1], 77 + n)) if (e.generated?.topic) assert.ok(topics.has(e.generated.topic), `day ${n} ${e.generated.flaw}`);
  }
});

test('rulebook shows exactly the active regulations and the reference data the engine uses', () => {
  const html = renderRulebook({ tab: 'rules', regulations: RULES, day: DAYS[0], date: CTX.date });
  for (const r of RULES) assert.ok(html.includes(`id="rule-${r.id}"`), r.id);
  assert.equal((html.match(/<li id="rule-/g) || []).length, RULES.length);
  const nations = renderRulebook({ tab: 'nations', regulations: RULES, day: DAYS[0], date: CTX.date });
  for (const n of Object.values(NATIONS)) {
    assert.ok(nations.includes(`data-value="${n.emblem}"`), `${n.name} seal`);
    assert.ok(nations.includes(n.cities.join(', ')), `${n.name} offices`);
  }
});

const ctx1 = { regulations: activeRegulations(LAST_DAY), date: DAYS[LAST_DAY - 1].date };
const planted = (flaw, start = 0) => {
  for (let i = start; i < start + 2000; i++) {
    const clean = genOn(LAST_DAY, i);
    if (!flaw || FLAWS_BY_ID[flaw].applies(clean, dayCtx(LAST_DAY))) return genOn(LAST_DAY, i, { flaw });
  }
  throw new Error(`no entrant for ${flaw}`);
};

test('scoring: correct decisions are paid, mistakes warned then fined', () => {
  const ok = planted(null), bad = planted('expiredPassport');
  assert.deepEqual([assess(ok, 'accept', ctx1).pay, assess(ok, 'accept', ctx1).fine], [SCORING.wage, 0]);
  const rightReject = assess(bad, 'reject', ctx1);
  assert.ok(rightReject.correct && rightReject.pay === SCORING.wage && !rightReject.citation);
  const history = [];
  const levels = [];
  for (let i = 0; i < SCORING.warningsPerShift + 2; i++) {
    const r = assess(i % 2 ? ok : bad, i % 2 ? 'reject' : 'accept', ctx1, history);
    assert.ok(!r.correct && r.pay === 0);
    history.push(r); levels.push(r.citation.level);
  }
  assert.deepEqual(levels, [...Array(SCORING.warningsPerShift).fill('warning'), 'fine', 'fine']);
  assert.deepEqual(history.map(r => r.fine), [...Array(SCORING.warningsPerShift).fill(0), SCORING.fine, SCORING.fine]);
  assert.match(history[1].citation.reason, /papers were in order/);
  assert.match(history[0].citation.reason, /expired/);
  assert.equal(history[0].citation.rules[0].id, 'passport-valid-2');
});

test('scoring: admitting forged papers is a serious breach, fined at once', () => {
  for (const flaw of ['unknownIssuer', 'forgedSeal']) {
    const r = assess(planted(flaw), 'accept', ctx1, []);
    assert.equal(r.citation.level, 'fine'); assert.ok(r.citation.serious);
    assert.equal(r.fine, SCORING.seriousFine);
    // and it does not use up a warning
    const next = assess(planted('expiredPassport'), 'accept', ctx1, [r]);
    assert.equal(next.citation.level, 'warning');
  }
  // refusing a forger is simply correct; wrongly refusing is never 'serious'
  assert.ok(assess(planted('forgedSeal'), 'reject', ctx1).correct);
  assert.ok(!assess(planted(null), 'reject', ctx1).citation.serious);
  // the exception case: refusing an elderly citizen in their grace year is a mistake, explained
  const elder = assess(planted('elderGrace'), 'reject', ctx1);
  assert.ok(!elder.correct); assert.match(elder.citation.reason, /exception/);
});

test('a whole campaign: each day judged by its own rules, money carried over, days filed', () => {
  for (let seed = 1; seed <= 8; seed++) {
    let s = createGame(1, seed);
    const rng = createRng(seed * 7);
    let money = SETTING.startingMoney;
    for (let n = 1; n <= LAST_DAY; n++) {
      assert.equal(s.day, n); assert.equal(s.date, DAYS[n - 1].date);
      assert.equal(s.shift.phase, 'briefing');
      s = open(s);
      const rules = activeRegulations(n);
      while (s.shift.phase !== 'shiftEnd') {
        s = run(s, { type: 'callNext' });
        const v = currentVisitor(s);
        const decision = rng.chance(0.5) ? 'accept' : 'reject';
        s = run(s, { type: 'decide', decision });
        assert.ok(dispatch(s, { type: 'decide', decision }).error, 'second stamp refused');
        const d = decisionFor(s, v.id);
        assert.equal(d.day, n);
        assert.equal(d.verdict, evaluate(v, rules, { date: s.date }).verdict, `day ${n} verdict from that day's rules`);
        assert.equal(d.correct, d.decision === d.verdict);
        s = run(s, { type: 'returnPapers' });
      }
      const r = shiftReport(s.shift.decisions);
      assert.equal(r.processed, DAYS[n - 1].entrants.length);
      assert.equal(r.wages, s.shift.earned); assert.equal(r.fines, s.shift.fines);
      assert.equal(r.wages, r.correct * SCORING.wage);
      assert.ok(r.warnings <= SCORING.warningsPerShift, 'warnings reset each shift');
      money += r.net;
      assert.equal(s.money, money, `day ${n} money`);
      if (n < LAST_DAY) {
        const before = s;
        s = run(s, { type: 'nextDay' });
        assert.equal(s.history.length, n);
        assert.deepEqual(s.history[n - 1].report, r);
        assert.equal(s.history[n - 1].decisions, before.shift.decisions, 'decisions are filed, not recomputed');
        assert.ok(dispatch(s, { type: 'nextDay' }).error, 'one day at a time');
      } else {
        assert.ok(dispatch(s, { type: 'nextDay' }).error, 'no day after the last');
      }
    }
  }
});

test('historical cases keep the verdict of their own day', () => {
  // a worker without a permit was fine on Day 1 and refused from Day 2
  let found = 0;
  for (let i = 0; i < 400 && found < 3; i++) {
    const c = genOn(1, i);
    if (!c.documents.some(d => d.type === 'workPermit')) continue;
    const v = genOn(1, i, { flaw: 'missingWorkPermit' });
    assert.equal(evaluate(v, activeRegulations(1), { date: DAYS[0].date }).verdict, 'accept');
    assert.equal(evaluate(v, activeRegulations(2), { date: DAYS[0].date }).verdict, 'reject');
    found++;
  }
  assert.ok(found > 0);
  // a Day 1 shift's records still agree with Day 1 rules, though later rules would judge differently
  let s = open(createGame(1, 5));
  while (s.shift.phase !== 'shiftEnd') s = run(s, { type: 'callNext' }, { type: 'decide', decision: 'accept' }, { type: 'returnPapers' });
  for (const d of s.shift.decisions) assert.equal(d.verdict, evaluate(s.shift.entrants.find(v => v.id === d.visitorId), activeRegulations(1), { date: DAYS[0].date }).verdict);
});

test('every day is different: date, rules, entrants and briefing', () => {
  const dates = DAYS.map(d => d.date);
  assert.deepEqual([...dates].sort(), dates); assert.equal(new Set(dates).size, dates.length);
  assert.deepEqual(DAYS.map(d => d.day), Array.from({ length: LAST_DAY }, (_, i) => i + 1));
  const ruleSets = DAYS.map(d => activeRegulations(d.day).map(r => r.id).join());
  assert.equal(new Set(ruleSets).size, LAST_DAY, 'no two days share a rulebook');
  for (let n = 2; n <= LAST_DAY; n++) {
    const ch = regulationChanges(n);
    assert.ok(ch.added.length + ch.changed.length + ch.withdrawn.length > 0, `day ${n} brings a change`);
    const html = briefingHTML(DAYS[n - 1]);
    for (const r of ch.added) assert.ok(html.includes(r.text.replace(/'/g, '&#39;')), `day ${n} briefing announces ${r.id}`);
    for (const c of ch.changed) assert.ok(html.includes('Changed') && html.includes('Before:'), `day ${n} briefing shows ${c.rule.id} changed`);
    assert.ok(html.includes(DAYS[n - 1].bulletin.title));
  }
  assert.deepEqual(regulationChanges(4).changed.map(c => [c.previous.id, c.rule.id]), [['passport-valid', 'passport-valid-2']]);
  assert.deepEqual(regulationChanges(9).withdrawn.map(r => r.id), ['oskaria-suspended']);
  const position = (n, topic) => activeRegulations(n).findIndex(r => r.topic === topic);
  assert.equal(position(4, 'passport-valid'), position(3, 'passport-valid'), 'a revised rule keeps its number');
  assert.equal(position(5, 'documents-agree'), position(4, 'documents-agree'));
  assert.notEqual(daySeed(1, 1), daySeed(1, 2));
  // different days draw different crowds
  const kalShare = n => { const e = buildEntrants(DAYS[n - 1], 11); return e.filter(v => v.documents.some(d => d.nationality === 'KAL')).length / e.length; };
  assert.ok(kalShare(9) > kalShare(2), 'Kaltrini travellers crowd Day 9');
});

test('rulebook marks new and changed rules and archives the old ones', () => {
  const day4 = renderRulebook({ tab: 'rules', regulations: activeRegulations(4), day: DAYS[3], date: DAYS[3].date });
  assert.match(day4, /rule-badge changed">Changed<\/span>The passport must not/);
  assert.match(day4, /rule-badge">New<\/span>Every other paper/);
  const archive1 = renderRulebook({ tab: 'archive', regulations: activeRegulations(1), day: DAYS[0], date: DAYS[0].date });
  assert.match(archive1, /No regulation has been withdrawn/);
  const archive10 = renderRulebook({ tab: 'archive', regulations: activeRegulations(10), day: DAYS[9], date: DAYS[9].date });
  for (const r of archivedRegulations(10)) assert.ok(archive10.includes(r.text.replace(/'/g, '&#39;')), r.id);
  assert.ok(archive10.includes(DAYS[8].bulletin.title.replace(/'/g, '&#39;')), 'earlier directives are kept');
  assert.deepEqual(archivedRegulations(10).map(r => r.id).sort(), ['documents-agree', 'oskaria-suspended', 'passport-valid']);
});

test('comparison tool: does a permit cover the stay?', () => {
  const stay = { kind: 'duration', value: 30, display: '30 days', label: 'Duration of stay', where: 'entry declaration' };
  const permit = v => ({ kind: 'expiry', value: v, display: v, label: 'Valid until', where: 'work permit' });
  const today = { today: '1982-03-19' };
  assert.equal(compare(stay, permit('1982-04-18'), today).status, 'match', 'ends exactly on the last valid day');
  assert.equal(compare(permit('1982-04-17'), stay, today).status, 'mismatch');
  assert.match(compare(stay, permit('1982-04-17'), today).message, /18\.04\.1982/);
  assert.equal(compare(stay, { kind: 'today', value: '1982-03-19', display: '', label: 'Today', where: 'date plate' }).status, 'info');
});

test('portraits: every listed image exists, and every face fits its passport', () => {
  for (const id of PORTRAITS) assert.ok(fs.existsSync(new URL(portraitPath(id), root)), `${id}.jpg exists`);
  const files = fs.readdirSync(new URL('assets/portraits/', root)).filter(f => f.endsWith('.jpg'));
  assert.equal(files.length, PORTRAITS.size, 'no unlisted images');
  for (const v of Object.values(VISITORS)) assert.ok(PORTRAITS.has(v.portrait), `${v.id} has a portrait`);
  for (let n = 1; n <= LAST_DAY; n++) {
    for (const v of buildEntrants(DAYS[n - 1], 300 + n)) {
      const p = v.documents.find(d => d.type === 'passport');
      if (!p || v.id.startsWith('v_')) continue;
      const age = ageOn(p.dob, DAYS[n - 1].date);
      const band = age <= 35 ? 'young' : age <= 59 ? 'middle' : 'older';
      assert.equal(v.portrait, `pool_${p.nationality.toLowerCase()}_${p.sex.toLowerCase()}_${band}`, `${v.id} portrait matches passport`);
    }
  }
  const ilse = VISITORS.v_ilse_marek;
  assert.match(portraitHTML(ilse), /<img class="portrait portrait-photo" src="assets\/portraits\/v_ilse_marek\.jpg"/);
  assert.match(renderDocument(ilse.documents[0], ilse), /v_ilse_marek\.jpg/, 'the passport photo is the same portrait');
  assert.match(portraitHTML({ look: {}, portrait: 'missing' }), /<svg/, 'unknown portraits fall back to the drawing');
});

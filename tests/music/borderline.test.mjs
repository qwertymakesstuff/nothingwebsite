import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../../borderline/', import.meta.url);
const { createGame, dispatch, currentVisitor, decisionFor } = await import(new URL('js/gameState.js', root));
const { renderDocument } = await import(new URL('js/documentRenderer.js', root));
const { formatDoc, formatLong, isValidDate } = await import(new URL('js/dates.js', root));
const { VISITORS } = await import(new URL('data/visitors.js', root));
const { DAYS } = await import(new URL('data/campaignDays.js', root));
const { NATIONS, SETTING } = await import(new URL('data/setting.js', root));

const run = (state, ...actions) => actions.reduce((s, a) => {
  const r = dispatch(s, a);
  assert.equal(r.error, null, `${a.type}: ${r.error}`);
  return r.state;
}, state);

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
    assert.equal(new Set(day.entrants).size, day.entrants.length, 'no entrant appears twice in one shift');
    for (const id of day.entrants) assert.ok(VISITORS[id], `unknown entrant ${id}`);
  }
  for (const v of Object.values(VISITORS)) {
    const passports = v.documents.filter(d => d.type === 'passport');
    assert.equal(passports.length, 1, `${v.id} carries exactly one passport`);
    const p = passports[0];
    assert.ok(NATIONS[p.nation], `${v.id} passport nation`);
    assert.ok(isValidDate(p.dob) && isValidDate(p.expires), `${v.id} passport dates`);
    for (const d of v.documents.filter(d => d.type === 'declaration')) assert.ok(NATIONS[d.nationality], `${v.id} declaration nationality`);
    if (p.nation !== SETTING.country.code) assert.ok(v.documents.some(d => d.type === 'declaration'), `${v.id} foreigner carries a declaration`);
  }
});

test('dates format for documents and the desk', () => {
  assert.equal(formatDoc('1982-03-12'), '12.03.1982');
  assert.equal(formatLong('1982-03-12'), '12 March 1982');
  assert.equal(formatDoc('nonsense'), '—');
  assert.ok(!isValidDate('1982-02-30') && isValidDate('1984-02-29'));
});

test('shift loop: call, decide, return, through to the end of the shift', () => {
  let s = createGame(1);
  const day = DAYS[0];
  assert.equal(s.money, SETTING.startingMoney);
  assert.equal(s.shift.phase, 'waiting');
  day.entrants.forEach((id, i) => {
    s = run(s, { type: 'callNext' });
    assert.equal(currentVisitor(s).id, id);
    assert.equal(s.shift.phase, 'inspecting');
    s = run(s, { type: 'decide', decision: i % 2 ? 'reject' : 'accept' });
    assert.equal(decisionFor(s, id).decision, i % 2 ? 'reject' : 'accept');
    s = run(s, { type: 'returnPapers' });
  });
  assert.equal(s.shift.phase, 'shiftEnd');
  assert.equal(s.shift.decisions.length, day.entrants.length);
  assert.equal(s.shift.earned, day.wagePerEntrant * day.entrants.length);
  assert.equal(s.money, SETTING.startingMoney + s.shift.earned);
  assert.ok(dispatch(s, { type: 'callNext' }).error);
});

test('a visitor can only be processed once and actions are phase-checked', () => {
  const s0 = createGame(1);
  assert.ok(dispatch(s0, { type: 'decide', decision: 'accept' }).error, 'no decision with an empty booth');
  assert.ok(dispatch(s0, { type: 'returnPapers' }).error);
  const s1 = run(s0, { type: 'callNext' });
  assert.ok(dispatch(s1, { type: 'callNext' }).error, 'booth occupied');
  assert.ok(dispatch(s1, { type: 'decide', decision: 'maybe' }).error);
  const s2 = run(s1, { type: 'decide', decision: 'accept' });
  const again = dispatch(s2, { type: 'decide', decision: 'reject' });
  assert.ok(again.error, 'second stamp refused');
  assert.equal(again.state, s2, 'refused action leaves state untouched');
  assert.equal(s2.money, s0.money + DAYS[0].wagePerEntrant, 'paid once');
  assert.equal(s0.money, SETTING.startingMoney, 'dispatch never mutates its input');
  assert.equal(s0.shift.phase, 'waiting');
  assert.ok(dispatch(s0, { type: 'bogus' }).error);
});

test('documents display exactly their underlying data', () => {
  for (const v of Object.values(VISITORS)) {
    for (const doc of v.documents) {
      const html = renderDocument(doc, v);
      const shown = Object.fromEntries([...html.matchAll(/data-field="(\w+)"><dt>[^<]*<\/dt><dd>([^<]*)<\/dd>/g)].map(m => [m[1], m[2]]));
      for (const [key, value] of Object.entries(shown)) {
        const raw = doc[key];
        const expected = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? formatDoc(raw) : key === 'nationality' ? NATIONS[raw].name : raw;
        assert.equal(value, expected, `${v.id} ${doc.type}.${key}`);
      }
      const fields = Object.keys(doc).filter(k => !['type', 'nation', 'number'].includes(k));
      for (const k of fields) assert.ok(k in shown, `${v.id} ${doc.type}.${k} is shown`);
      if (doc.type === 'passport') assert.ok(html.includes(doc.number) && html.includes(NATIONS[doc.nation].name));
    }
  }
  const p = VISITORS.v_ilse_marek.documents[0];
  assert.match(renderDocument(p, VISITORS.v_ilse_marek, { stamp: 'reject' }), /Entry denied/);
  assert.doesNotMatch(renderDocument(p, VISITORS.v_ilse_marek), /class="doc-stamp /);
  assert.throws(() => renderDocument({ type: 'unknown' }, VISITORS.v_ilse_marek));
});

test('rendered text is escaped', () => {
  const v = { look: {} };
  const html = renderDocument({ type: 'declaration', surname: '<script>', given: 'A&B', nationality: 'OSK', passportNo: '"x"', purpose: 'p', duration: 'd', destination: 'z' }, v);
  assert.ok(!html.includes('<script>') && html.includes('&lt;script&gt;') && html.includes('A&amp;B'));
});

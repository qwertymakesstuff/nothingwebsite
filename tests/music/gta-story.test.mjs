import test from 'node:test';
import assert from 'node:assert/strict';

// LAST EXIT story tests. The story modules are pure, so the whole campaign is played here headlessly by the same Story engine and
// SceneRunner the browser uses; only the world (player, cars, police) is replaced by a fake `env`.
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const dir = new URL('../../gta/js/story/', import.meta.url);
const imp = f => import(new URL(f, dir));
const { SCENES, LINES } = await imp('lines/index.js');
const { ID_RE, sceneLineIds, readSeconds } = await imp('dialogue.js');
const S = await imp('state.js');
const { CAST, SPEAKERS, RELATIONSHIPS } = await imp('cast.js');
const { MISSION_LIST, MISSIONS, HANGOUTS } = await imp('missions.js');
const { PLACES } = await imp('places.js');
const { Story } = await imp('engine.js');
const { SceneRunner, runScene } = await imp('sceneRunner.js');
const { VoiceQueue } = await imp('voiceQueue.js');
const { getPoi } = await import(new URL('../../gta/js/pois.js', import.meta.url));

/* ---------- the fake world ---------- */
function makeWorld(policy) {
  const w = { policy: policy || {}, money: 0, stars: 0, saves: 0, banners: [], objectives: [], scenes: [], cars: {}, ambush: {}, npcs: {}, p: { x: 0, z: 0, inCar: false, carTag: null, mode: 'playing' }, pending: [], worlds: [], missionsDone: [], choicesMade: [] };
  w.at = ref => { const t = w.env.resolve(ref); w.p.x = t.x; w.p.z = t.z; };
  w.env = {
    player: () => w.p, stars: () => w.stars, setStars: n => { w.stars = n; },
    resolve: ref => { if (ref === 'player') return { x: w.p.x, z: w.p.z, name: 'here' }; const k = String(ref).replace('place:', ''), pl = PLACES[k]; if (!pl) throw new Error('bad place ' + ref); const p = getPoi(pl.poi); return { x: p.x, z: p.z, name: pl.name }; },
    marker: m => { w.marker = m; }, objective: t => { w.objectives.push(t); w.objective = t; }, banner: t => w.banners.push(t), say: () => {},
    playScene: id => {
      const st = w.story.s; w.scenes.push(id);
      const r = new SceneRunner(st, id); let guard = 0;
      for (;;) { const e = r.next(); if (e.type === 'done') break; if (e.type === 'choice') { const want = w.policy[e.key], idx = want === undefined ? 0 : e.options.findIndex(o => o.value === want); r.choose(idx < 0 ? 0 : idx); w.choicesMade.push(e.key); } if (++guard > 3000) throw new Error('stuck ' + id); }
      let n = 0; return { done: () => ++n > 1 };
    },
    spawnCar: (tag, spec) => { w.cars[tag] = { alive: true, x: spec.at ? spec.at.x : 0, z: spec.at ? spec.at.z : 0, playerIn: false, kind: spec.kind }; },
    carInfo: tag => (w.cars[tag] ? Object.assign({}, w.cars[tag], { playerIn: w.p.carTag === tag }) : null), removeAllCars: () => { w.cars = {}; w.p.carTag = null; w.p.inCar = false; },
    spawnNpc: (id, spec) => { w.npcs[id] = spec; }, removeNpc: id => { delete w.npcs[id]; }, npcPos: id => w.npcs[id] && w.npcs[id].at,
    startAmbush: (id, spec) => { w.ambush[id] = { spec, t: 0 }; }, stopAmbush: id => { delete w.ambush[id]; },
    ambushInfo: id => { const a = w.ambush[id]; if (!a) return null; return { alive: a.t > 3 ? 0 : 2, total: 2, away: 0, npcHp: w.npcHp == null ? 100 : w.npcHp }; },
    addMoney: n => { w.money += n; }, save: () => { w.saves++; }, log: () => {}, world: n => w.worlds.push(n), spawnCruiser: () => {}, missionDone: m => w.missionsDone.push(m.id)
  };
  w.story = new Story(w.env, S.createState());
  return w;
}
/** advance one frame of the fake game: keep the player doing whatever the current step asks, as an obedient player would */
function stepWorld(w, dt) {
  const st = w.story, cur = st.cur; w.p.mode = 'playing';
  for (const a of Object.values(w.ambush)) a.t += dt;
  if (cur) {
    if (cur.car && w.cars[cur.car]) { w.p.carTag = cur.car; w.p.inCar = true; }
    if (['goto', 'drive', 'pickup'].includes(cur.t) && st.target) { w.p.x = st.target.x; w.p.z = st.target.z; }
    if (cur.t === 'getcar' && w.cars[cur.car]) { w.p.carTag = cur.car; w.p.inCar = true; }
    if (cur.t === 'chase' && w.ambush[st.amb()]) w.ambush[st.amb()].t = 99;
    if (cur.t === 'ambush' || cur.t === 'protect') { /* waits for the minimum time */ }
    if (w.stars > 0 && (cur.t === 'heat' || cur.t === 'ambush')) { if (cur.t === 'heat' || (w.ambush[st.amb()] && w.ambush[st.amb()].t > 3)) w.stars = Math.max(0, w.stars - 1); }
  }
  st.update(dt);
}
/** play the whole campaign. opts.sideChains: also play every optional mission that becomes available (before the next main mission) */
function playCampaign(w, opts) {
  opts = opts || {}; let guard = 0; const order = [];
  while (!w.story.s.done.M09 && guard++ < 200000) {
    if (!w.story.s.active) {
      stepWorld(w, .5);
      if (w.story.s.active) { order.push(w.story.s.active.id); continue; }
      const pts = w.story.startPoints().filter(p => p.main || (opts.side && (opts.side === true || opts.side.includes(p.chain))));
      const pt = opts.side ? (pts.find(p => !p.main) || pts[0]) : pts.find(p => p.main) || pts[0];
      if (!pt) { if (w.story.s.done.M00 || !w.story.s.started) { if (!w.story.s.started) { w.story.start('M00'); order.push('M00'); continue; } } throw new Error('nothing to play; done=' + Object.keys(w.story.s.done)); }
      w.at(pt.at); w.story.start(pt.id); order.push(pt.id);
    } else stepWorld(w, .5);
  }
  assert.ok(w.story.s.done.M09, 'campaign did not finish; active=' + JSON.stringify(w.story.s.active));
  return order;
}

/* ---------- dialogue database ---------- */
test('dialogue db: every line has a unique, well-formed ID, a speaker, a direction, text and an audio path', () => {
  const ids = Object.keys(LINES); assert.ok(ids.length > 600, 'expected the full script, got ' + ids.length);
  assert.ok(Object.keys(SCENES).length > 120);
  for (const id of ids) {
    const l = LINES[id]; assert.match(id, ID_RE, id); assert.equal(l.id, id);
    assert.ok(SPEAKERS.includes(l.char), id + ' unknown speaker ' + l.char);
    assert.ok(l.dir && l.dir.length > 3, id + ' has no performance direction');
    assert.ok(l.text.en && l.text.en.trim().length > 0, id + ' empty text');
    assert.equal(l.file, 'voice/' + l.char + '/' + id);
    assert.ok(id.startsWith(l.char + '_' + l.mission + '_'), id + ' not named for its character and mission');
    assert.ok([1, 2, 3, 4].includes(l.pri), id + ' priority');
  }
});
test('dialogue db: acting direction never leaks into the spoken text', () => {
  for (const l of Object.values(LINES)) {
    const t = l.text.en;
    assert.ok(!/\[[^\]]*\]|\([^)]*\)/.test(t) || /\(\d+\)/.test(t), l.id + ' has brackets in spoken text: ' + t);
    assert.notEqual(t, l.dir, l.id + ' text equals direction');
    assert.ok(!/\b(whispers|sighs|laughs|pauses)\b\s*[:.]/i.test(t), l.id + ' stage direction in text');
  }
});
test('dialogue db: every scene uses only known characters, is not empty, and each line belongs to one scene', () => {
  const seen = new Set();
  for (const sc of Object.values(SCENES)) {
    const ids = sceneLineIds(sc); assert.ok(ids.length > 0, sc.id + ' has no lines');
    assert.ok(['direct', 'phone', 'radio', 'car'].includes(sc.via), sc.id + ' via');
    for (const id of ids) { assert.ok(!seen.has(id), id + ' used twice'); seen.add(id); assert.equal(LINES[id].scene, sc.id); }
    for (const c of sc.cast || []) assert.ok(SPEAKERS.includes(c), sc.id + ' cast ' + c);
    if (sc.who) assert.ok(SPEAKERS.includes(sc.who), sc.id + ' who ' + sc.who);
  }
  for (const id of Object.keys(LINES)) assert.ok(seen.has(id), id + ' belongs to no scene');
});
test('dialogue db: every condition in dialogue and missions refers to something that exists', () => {
  const doneIds = new Set(MISSION_LIST.map(m => m.id)), rels = new Set(RELATIONSHIPS), levels = Object.keys(S.LEVELS);
  const check = (cond, where) => {
    for (const r of S.condRefs(cond)) {
      assert.ok(['flag', 'done', 'failed', 'choice', 'end', 'unlocked', 'rel'].includes(r.kind), where + ': unknown condition kind in "' + r.kind + ':' + r.rest + '"');
      if (r.kind === 'done' || r.kind === 'failed') assert.ok(doneIds.has(r.rest), where + ': no mission ' + r.rest);
      if (r.kind === 'end') assert.ok('ABC'.includes(r.rest), where + ': ending ' + r.rest);
      if (r.kind === 'rel') { const m = r.rest.match(/^([A-Z]+)(>=|<=|!=|>|<|=)([A-Z]+)$/); assert.ok(m && rels.has(m[1]) && levels.includes(m[3]), where + ': bad rel ' + r.rest); }
    }
  };
  const walk = (steps, where) => steps.forEach(s => {
    if (s.k === 'line') check(LINES[s.id].if, s.id);
    else if (s.k === 'if') { check(s.cond, where); walk(s.then, where); walk(s.else, where); }
    else if (s.k === 'choice') s.options.forEach(o => { check(o.if, where); walk(o.steps, where); });
  });
  for (const sc of Object.values(SCENES)) walk(sc.steps, sc.id);
  for (const m of MISSION_LIST) { check(m.req, m.id); check(m.expires, m.id); m.steps.forEach((st, i) => check(st.if, m.id + '#' + i)); }
  for (const h of HANGOUTS) { check(h.req, 'hangout ' + h.id); h.scenes.forEach(s => check(s.req, 'hangout ' + h.id)); }
});
test('dialogue db: a flag that is read somewhere is also set somewhere', () => {
  const setSet = new Set(), readSet = new Set();
  const addSet = fx => { if (fx && fx.set) Object.keys(fx.set).forEach(k => setSet.add(k)); };
  const walk = steps => steps.forEach(s => {
    if (s.k === 'fx') addSet(s); else if (s.k === 'if') { walk(s.then); walk(s.else); } else if (s.k === 'choice') s.options.forEach(o => { addSet(o); walk(o.steps); });
  });
  for (const sc of Object.values(SCENES)) walk(sc.steps);
  for (const m of MISSION_LIST) { addSet(m.onDone); m.steps.forEach(st => { addSet(st.done); if (st.flag) setSet.add(st.flag); if (st.t === 'pickup') setSet.add('has_' + (st.item || 'item')); if (st.t === 'protect') setSet.add(st.npcFlag || 'npc_alive'); }); }
  const reads = c => S.condRefs(c).filter(r => r.kind === 'flag').forEach(r => readSet.add(r.rest.split('=')[0]));
  const walkR = steps => steps.forEach(s => { if (s.k === 'line') reads(LINES[s.id].if); else if (s.k === 'if') { reads(s.cond); walkR(s.then); walkR(s.else); } else if (s.k === 'choice') s.options.forEach(o => { reads(o.if); walkR(o.steps); }); });
  for (const sc of Object.values(SCENES)) walkR(sc.steps);
  for (const m of MISSION_LIST) { reads(m.req); reads(m.expires); m.steps.forEach(st => reads(st.if)); }
  for (const h of HANGOUTS) { reads(h.req); h.scenes.forEach(s => reads(s.req)); }
  const external = new Set([]);
  for (const f of readSet) assert.ok(setSet.has(f) || external.has(f), 'flag "' + f + '" is read but never set');
});
test('subtitle timing: comfortable for short and long lines', () => {
  assert.equal(readSeconds('Hi.'), 2); assert.ok(readSeconds('x'.repeat(60)) > 3.5 && readSeconds('x'.repeat(60)) < 6);
  assert.equal(readSeconds('x'.repeat(1000)), 9);
});

/* ---------- missions data ---------- */
test('missions: ids and codes are unique, prerequisites exist, scenes and places resolve', () => {
  const ids = new Set(), codes = new Set();
  for (const m of MISSION_LIST) {
    assert.ok(!ids.has(m.id) && !codes.has(m.code), 'dup ' + m.id); ids.add(m.id); codes.add(m.code);
    assert.ok(m.steps.length > 0, m.id + ' has no steps');
    if (m.start) assert.ok(PLACES[m.start.at.replace('place:', '')], m.id + ' start place');
    if (m.announce) assert.ok(SCENES[m.announce], m.id + ' announce scene ' + m.announce);
    if (m.onDone && m.onDone.call) assert.ok(SCENES[m.onDone.call], m.id + ' onDone.call');
    if (m.onDone && m.onDone.next) assert.ok(MISSIONS[m.onDone.next]);
    m.steps.forEach((st, i) => {
      const w = m.id + '#' + i;
      if (st.at && st.at !== 'player') assert.ok(PLACES[st.at.replace('place:', '')], w + ' place ' + st.at);
      for (const sc of [].concat(st.scene || [], st.radio || [])) assert.ok(SCENES[sc], w + ' scene ' + sc);
      for (const n of st.npcs || []) assert.ok(CAST[n.id], w + ' npc ' + n.id);
      if (['getcar', 'drive'].includes(st.t) || st.car) assert.ok(st.car, w + ' needs a car tag');
    });
  }
  assert.deepEqual(MISSION_LIST.filter(m => m.main).map(m => m.id), ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09']);
  assert.deepEqual(['M01_A_NEW_START', 'M02_EASY_MONEY', 'M03_THE_WRONG_PACKAGE', 'M04_NO_LOOSE_ENDS', 'M05_DIRTY_BADGE', 'M06_THE_PEOPLE_WHO_PAY', 'M07_BURN_NOTICE', 'M08_THE_LAST_WITNESS', 'M09_PORT_ALDER_BURNING'], ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09'].map(i => MISSIONS[i].code));
});
test('places: every story place is a real point of interest in the city', () => {
  for (const [k, p] of Object.entries(PLACES)) { const poi = getPoi(p.poi); assert.ok(poi, k + ' -> ' + p.poi + ' missing'); assert.ok(Number.isFinite(poi.x) && Number.isFinite(poi.z)); }
});
test('cast: every character has a full profile and voice brief', () => {
  for (const id of SPEAKERS) {
    const c = CAST[id]; assert.ok(c, id);
    assert.ok(c.name && c.name.length >= 3, id + ' name');
    const major = ['ASH', ...RELATIONSHIPS, 'SLOANE'].includes(id);
    assert.ok(c.bio && c.bio.length > 8, id + ' bio');
    if (major) for (const k of ['motivation', 'fear', 'hides', 'arc']) assert.ok(c[k] && String(c[k]).length > 4, id + ' missing ' + k);
    for (const k of ['description', 'direction', 'accent', 'pace', 'range', 'recording']) assert.ok(c.voice && c.voice[k], id + ' voice.' + k);
  }
  for (const r of RELATIONSHIPS) assert.ok(CAST[r], r);
});

/* ---------- state ---------- */
test('state: relationship levels, clamping and condition language', () => {
  const s = S.createState();
  assert.equal(S.levelName(0), 'NEUTRAL'); assert.equal(S.levelName(2), 'TRUSTED'); assert.equal(S.levelName(-1), 'DISTRUSTED'); assert.equal(S.levelName(-3), 'HOSTILE');
  S.addRel(s, 'MARA', 99); assert.equal(s.rel.MARA, S.REL_MAX); S.addRel(s, 'MARA', -99); assert.equal(s.rel.MARA, S.REL_MIN);
  S.setFlag(s, 'a'); s.done.M01 = { n: 1 }; s.choices.evidence = 'keep'; s.ending = 'B'; s.rel.EDDIE = 2;
  const ok = c => S.evalCond(c, s);
  assert.ok(ok('') && ok(null) && ok('flag:a') && !ok('!flag:a') && ok('done:M01') && !ok('done:M02') && ok('choice:evidence=keep') && !ok('choice:evidence=darius'));
  assert.ok(ok('end:B') && !ok('end:A') && ok('rel:EDDIE>=TRUSTED') && ok('rel:MARA<=HOSTILE') && !ok('rel:EDDIE<NEUTRAL'));
  assert.ok(ok('flag:zzz || flag:a') && !ok('flag:zzz && flag:a') && ok('flag:a && done:M01 || flag:zzz'));
  assert.ok(ok(['flag:a', 'done:M01']) && !ok(['flag:a', 'done:M02']));
  s.flags.n = 3; assert.ok(ok('flag:n=3') && !ok('flag:n=4'));
  assert.equal(ok('what:ever'), false);
});
test('state: migrate keeps good saves and survives garbage, partial and newer saves', () => {
  const s = S.createState(); s.done.M01 = { n: 1 }; s.flags.x = true; s.rel.EDDIE = 3; s.active = { id: 'M02', step: 2, cp: 1, vars: {} }; s.choices.evidence = 'keep'; s.ending = 'A';
  const back = S.migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.done, s.done); assert.equal(back.flags.x, true); assert.equal(back.rel.EDDIE, 3); assert.equal(back.choices.evidence, 'keep'); assert.equal(back.ending, 'A');
  assert.equal(back.active.id, 'M02'); assert.equal(back.active.step, 2); assert.equal(back.active.cp, 1);
  assert.equal(S.migrate({ active: { id: 'M02', step: 2, cp: 9 } }).active.cp, 2, 'a checkpoint after the current step is nonsense: use the step');
  for (const bad of [null, undefined, 5, 'x', [], { v: 99, done: { M01: 1 } }, { done: 'no', rel: { A: 'x', B: 2 }, active: { id: 5, step: 'a' } }]) {
    const m = S.migrate(bad); assert.equal(m.v, S.VERSION); assert.ok(typeof m.done === 'object' && !Array.isArray(m.done)); assert.equal(m.active, null);
  }
  assert.deepEqual(S.migrate({ v: 99, done: { M01: 1 } }).done, {});
  assert.equal(S.migrate({ rel: { A: 'x', B: 2, C: 400 } }).rel.B, 2); assert.equal(S.migrate({ rel: { C: 400 } }).rel.C, S.REL_MAX); assert.ok(!('A' in S.migrate({ rel: { A: 'x' } }).rel));
});

/* ---------- scene runner ---------- */
test('scene runner: lines play in order, choices store their value and apply effects, conditions pick the variant', () => {
  const st = S.createState(); st.rel.MARA = 0;
  const said = runScene(st, 'M03_SAFE', (key, opts) => opts.findIndex(o => o.value === 'mara'));
  assert.deepEqual(said, [...said].sort((a, b) => 0)); // order is kept (not re-sorted)
  assert.equal(st.choices.evidence, 'mara'); assert.equal(st.flags.shared_manifest, true); assert.equal(st.rel.MARA, 2);
  const st2 = S.createState(); const said2 = runScene(st2, 'M03_SAFE', (k, o) => o.findIndex(x => x.value === 'darius'));
  assert.equal(st2.flags.gave_darius_manifest, true); assert.equal(st2.rel.DARIUS, 1); assert.equal(st2.rel.MARA, -1);
  assert.notDeepEqual(said, said2);
  // the same scene reads differently with different story state
  const a = S.createState(); a.choices.evidence = 'darius'; const b = S.createState(); b.choices.evidence = 'keep';
  assert.notDeepEqual(runScene(a, 'M03_AFTER'), runScene(b, 'M03_AFTER'));
  const r = new SceneRunner(S.createState(), 'M03_SAFE'); let e; do { e = r.next(); } while (e.type === 'line'); assert.equal(e.type, 'choice');
  assert.throws(() => r.next(), /pending choice/); assert.throws(() => new SceneRunner(S.createState(), 'NOPE'));
});
test('scene runner: every scene finishes under every choice (no dead ends)', () => {
  for (const id of Object.keys(SCENES)) {
    const opts = new Set(); const probe = new SceneRunner(S.createState(), id); let n = 0;
    for (;;) { const e = probe.next(); if (e.type === 'done') break; if (e.type === 'choice') { opts.add(e.options.length); probe.choose(0); } if (++n > 3000) assert.fail(id); }
    const max = Math.max(0, ...opts);
    for (let k = 0; k < max; k++) { const st = S.createState(), said = runScene(st, id, (key, o) => Math.min(k, o.length - 1)); assert.ok(Array.isArray(said)); }
  }
});

/* ---------- campaign ---------- */
test('campaign: a fresh game offers only the prologue; missions unlock strictly in order', () => {
  const st = new Story(makeWorld().env, S.createState());
  assert.deepEqual(st.available().map(m => m.id), ['M00']);
  const w = makeWorld(); const order = [];
  w.story.start('M00'); order.push('M00');
  let guard = 0; const seenAvail = [];
  while (!w.story.s.done.M09 && guard++ < 100000) {
    if (!w.story.s.active) {
      const main = w.story.available().filter(m => m.main); seenAvail.push(main.map(m => m.id));
      assert.equal(main.length, 1, 'exactly one main mission should be available: ' + main.map(m => m.id));
      const m = main[0]; assert.equal(Number(m.id.slice(1)), Object.keys(w.story.s.done).filter(i => /^M\d\d$/.test(i)).length, 'unlocked out of order: ' + m.id);
      w.at(m.start.at); w.story.start(m.id); order.push(m.id);
    } else stepWorld(w, .5);
  }
    assert.deepEqual(Object.keys(w.story.s.done), ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09']);
});
test('campaign: cannot start a locked mission or two at once', () => {
  const w = makeWorld(); assert.equal(w.story.start('M05'), false); w.story.start('M00'); assert.equal(w.story.start('M01'), false);
});
test('campaign: the prologue runs voicemail, reaction, radio and the first Eddie conversation, then offers the first job', () => {
  const w = makeWorld(); w.story.start('M00'); for (let i = 0; i < 60 && w.story.s.active && w.story.s.active.id === 'M00'; i++) stepWorld(w, .5);
  assert.ok(w.story.s.done.M00 && w.story.s.flags.prologue_done);
  const order = w.scenes; const idx = id => order.indexOf(id);
  assert.ok(idx('M00_VOICEMAIL') >= 0 && idx('M00_VOICEMAIL') < idx('M00_REACT') && idx('M00_REACT') < idx('M00_EDDIE'), order.join(','));
  assert.ok(order.includes('M00_RADIO'));
  assert.equal(w.story.s.active && w.story.s.active.id, 'M01');         // the small job is offered straight away
});
for (const [ending, picks] of [['A', { ending_choice: 'A' }], ['B', { ending_choice: 'B' }], ['C', { ending_choice: 'C' }]]) {
  test('campaign: the whole story is playable to ending ' + ending, () => {
    const w = makeWorld(picks); const order = playCampaign(w);
    assert.equal(w.story.s.ending, ending); assert.ok(w.story.s.done.M09 && w.story.s.flags.campaign_complete);
    assert.equal(w.story.s.active, null);
    assert.equal(Object.keys(w.story.s.done).join(), 'M00,M01,M02,M03,M04,M05,M06,M07,M08,M09'); assert.ok(order.length >= 9);
    const epi = w.scenes.filter(s => s.startsWith('M09_EPI_')); assert.ok(epi.length >= 3 && epi.every(s => s.startsWith('M09_EPI_' + ending)), epi.join());
    const pay = { A: 2000, B: 50000, C: 500 }[ending]; const base = [200, 800, 600, 700, 500, 1000, 300, 1200].reduce((a, b) => a + b, 0);
    assert.equal(w.money, base + pay, 'money should be exactly the rewards plus the ending payout');
  });
}
test('campaign: the three endings really differ (dialogue, payout, world effect)', () => {
  const r = {}; for (const e of 'ABC') { const w = makeWorld({ ending_choice: e }); playCampaign(w); r[e] = { scenes: w.scenes.filter(s => s.startsWith('M09_EPI')), money: w.money, worlds: w.worlds.slice() }; }
  assert.notDeepEqual(r.A.scenes, r.B.scenes); assert.notDeepEqual(r.B.scenes, r.C.scenes); assert.notDeepEqual(r.A.scenes, r.C.scenes);
  assert.ok(r.B.money > r.A.money && r.A.money > r.C.money);
  assert.ok(r.C.worlds.includes('burn') && !r.A.worlds.includes('burn'));
  // the actual words of the epilogue differ too
  const words = e => { const st = S.createState(); st.ending = e; return ['M09_EPI_' + e + '1', 'M09_EPI_' + e + '2', 'M09_EPI_' + e + '3'].flatMap(id => sceneLineIds(id).map(i => LINES[i].text.en)).join(' '); };
  assert.notEqual(words('A'), words('B')); assert.notEqual(words('B'), words('C'));
});
test('campaign: earlier choices change later dialogue and the cast', () => {
  const a = makeWorld({ evidence: 'darius', sloane_offer: 'accept', ending_choice: 'B' }); playCampaign(a);
  const b = makeWorld({ evidence: 'mara', sloane_offer: 'refuse', ending_choice: 'A' }); playCampaign(b);
  assert.equal(a.story.s.flags.gave_darius_manifest, true); assert.equal(b.story.s.flags.shared_manifest, true);
  assert.notEqual(a.story.s.rel.MARA, b.story.s.rel.MARA);
  assert.ok(a.story.s.flags.took_sloane_money && b.story.s.flags.refused_sloane);
  // hangouts react to relationship level
  const st = S.createState(); st.done.M02 = { n: 1 }; const mara = HANGOUTS.find(h => h.id === 'MARA');
  const pick = s => mara.scenes.find(x => S.evalCond(x.req, s)).s;
  const base = pick(st); st.rel.MARA = 3; const hi = pick(st); st.rel.MARA = -3; const lo = pick(st);
  assert.notEqual(hi, lo); assert.notEqual(base, lo);
});
test('campaign: optional chains can all be skipped, or all played, and the story still finishes', () => {
  const skip = makeWorld({ ending_choice: 'A' }); const o1 = playCampaign(skip); assert.ok(o1.every(i => /^M\d\d$/.test(i)), 'only main missions were played');
  const full = makeWorld({ ending_choice: 'A' }); const o2 = playCampaign(full, { side: true });
  const sides = o2.filter(i => !/^M\d\d$/.test(i)); assert.ok(sides.length >= 8, 'side missions played: ' + sides.join());
  assert.ok(full.story.s.done.M09 && full.story.s.ending === 'A');
  assert.ok(full.money > skip.money);
});
test('campaign: optional chains unlock in sequence and are removed when their window closes', () => {
  const st = S.createState(); const sty = new Story(makeWorld().env, st);
  assert.ok(!sty.available().some(m => m.id === 'E01'));
  st.done.M00 = st.done.M01 = st.done.M02 = st.done.M03 = st.done.M04 = st.done.M05 = { n: 1 };
  const ids = () => sty.available().map(m => m.id);
  assert.ok(ids().includes('E01') && ids().includes('D01') && ids().includes('R01') && ids().includes('O01') && !ids().includes('E02'));
  st.done.E01 = { n: 1 }; assert.ok(ids().includes('E02'));
  st.done.M06 = { n: 1 }; assert.ok(!ids().includes('D01'), 'Darius\'s crew chain closes once the story has turned on him');
});
test('campaign: failing sends the player back to a checkpoint, retrying resumes there, and rewards are never paid twice', () => {
  const w = makeWorld(); w.story.start('M00'); for (let i = 0; i < 50 && !w.story.s.done.M00; i++) stepWorld(w, .5);
  const s = w.story.s; assert.equal(s.active.id, 'M01');
  let guard = 0; while (!(w.story.cur && w.story.cur.t === 'drive') && guard++ < 200) stepWorld(w, .5);
  assert.equal(w.story.cur.t, 'drive'); const cp = s.active.cp; assert.ok(cp >= 2);
  w.cars.truck.alive = false; stepWorld(w, .5);
  assert.equal(s.active, null); assert.equal(s.failed.M01.step, cp); assert.equal(w.money, 0);
  const pt = w.story.startPoints().find(p => p.id === 'M01'); assert.ok(pt && /^RETRY/.test(pt.label), 'failed missions are marked RETRY');
  w.at(pt.at); assert.ok(w.story.start('M01')); assert.equal(s.active.step, cp, 'retry resumes at the checkpoint, not the start');
  guard = 0; while (!s.done.M01 && guard++ < 400) stepWorld(w, .5);
  assert.ok(s.done.M01); assert.equal(w.money, 200 + 0, 'paid exactly once'); assert.equal(s.paid.M01, true);
  assert.ok(!s.failed.M01);
  // a second run of the same mission can never pay again
  const before = w.money; s.done.M01 = { n: 1 }; w.story.s.active = { id: 'M01', step: 0, cp: 0, vars: {} }; w.story.enterStep(0); w.story.complete(); assert.equal(w.money, before);
});
test('campaign: dying or being arrested fails the mission; walking away from a mission car fails it', () => {
  for (const mode of ['wasted', 'busted']) {
    const w = makeWorld(); w.story.start('M00'); for (let i = 0; i < 50 && !w.story.s.done.M00; i++) stepWorld(w, .5);
    w.p.mode = mode; w.story.update(.5); assert.equal(w.story.s.active, null, mode); assert.ok(w.story.s.failed.M01);
  }
  const w = makeWorld(); w.story.start('M00'); for (let i = 0; i < 50 && !w.story.s.done.M00; i++) stepWorld(w, .5);
  let g = 0; while (!(w.story.cur && w.story.cur.t === 'drive') && g++ < 200) stepWorld(w, .5);
  w.p.carTag = null; w.p.inCar = false; w.p.x = w.cars.truck.x + 500; w.story.update(.5); assert.equal(w.story.s.active, null); assert.match(w.story.s.failed.M01.reason, /left/);
});
test('campaign: a save made mid-mission restores to its checkpoint, and flags and choices persist across a reload', () => {
  const w = makeWorld({ evidence: 'mara' }); w.story.start('M00'); let g = 0;
  while (!(w.story.s.active && w.story.s.active.id === 'M03' && w.story.cur && w.story.cur.t === 'goto' && w.story.s.active.step >= 4) && g++ < 5000) {
    if (!w.story.s.active) { const p = w.story.startPoints().find(x => x.main); if (!p) break; w.at(p.at); w.story.start(p.id); } else stepWorld(w, .5);
  }
  const json = JSON.stringify(w.story.s), s2 = S.migrate(JSON.parse(json));
  assert.equal(s2.choices.evidence, undefined === s2.choices.evidence ? undefined : s2.choices.evidence);
  const w2 = makeWorld({ evidence: 'mara' }); w2.story.setState(s2);
  assert.ok(s2.done.M02 && !s2.done.M03); assert.equal(s2.active.id, 'M03');
  assert.ok(w2.story.start('M03', { resume: true })); assert.ok(w2.story.s.active.step >= 0);
  g = 0; while (!w2.story.s.done.M03 && g++ < 400) stepWorld(w2, .5);
  assert.ok(w2.story.s.done.M03); assert.equal(w2.story.s.flags.shared_manifest, true); assert.equal(w2.money, 600, 'the reward on a resumed mission is paid once');
});
test('campaign: loading an old, broken or incomplete save never throws and gives a playable game', () => {
  for (const raw of [undefined, null, {}, { active: { id: 'M99', step: 3 } }, { active: { id: 'M03', step: 99 } }, { done: { M01: { n: 1 } }, active: { id: 'M01', step: 0 } }]) {
    const w = makeWorld(); const s = S.migrate(raw); w.story.setState(s);
    if (s.active) { const m = MISSIONS[s.active.id]; if (!m || s.done[s.active.id]) s.active = null; else if (s.active.step >= m.steps.length) s.active.step = m.steps.length - 1; }
    assert.doesNotThrow(() => { if (w.story.s.active) w.story.start(w.story.s.active.id, { resume: true }); w.story.update(.5); w.story.startPoints(); });
  }
});
test('campaign: nothing is left dangling between missions (markers, objective, cars)', () => {
  const w = makeWorld({ ending_choice: 'C' }); playCampaign(w);
  assert.equal(w.marker, null); assert.equal(w.objective, ''); assert.deepEqual(w.cars, {}); assert.deepEqual(w.ambush, {});
  assert.ok(w.saves > 20);
});
test('campaign: Walt\'s survival depends on the siege and changes the next scene', () => {
  const run = hp => { const w = makeWorld({ ending_choice: 'A' }); w.npcHp = hp; playCampaign(w); return w; };
  const live = run(100), dead = run(0);
  assert.equal(live.story.s.flags.walt_alive, true); assert.equal(dead.story.s.flags.walt_alive, false);
  assert.ok(live.scenes.includes('M08_LIVES') && !live.scenes.includes('M08_DEAD')); assert.ok(dead.scenes.includes('M08_DEAD') && !dead.scenes.includes('M08_LIVES'));
});

/* ---------- voice queue ---------- */
function vq() { const log = []; const q = new VoiceQueue({ start: i => log.push('start ' + i.id), end: (i, r) => log.push(r + ' ' + i.id) }); return { q, log }; }
const L = (id, pri, text) => ({ id, pri: pri || 2, text: { en: text || 'A short line of dialogue.' }, via: 'direct' });
test('voice queue: lines play in arrival order and subtitles last as long as the reading time (or the audio)', () => {
  const { q, log } = vq(); q.play(L('a')); q.play(L('b')); assert.deepEqual(log, ['start a']);
  for (let i = 0; i < 40; i++) q.update(.25); assert.deepEqual(log.slice(0, 3), ['start a', 'done a', 'start b']);
  const x = vq(); x.q.play(L('c'), { audioDuration: 6 }); for (let i = 0; i < 20; i++) x.q.update(.25); assert.deepEqual(x.log, ['start c'], '5 s in: a 6 s recording is still speaking');
  for (let i = 0; i < 20; i++) x.q.update(.25); assert.deepEqual(x.log, ['start c', 'done c']);
});
test('voice queue: higher priority interrupts; equal or lower waits; skip moves on', () => {
  const { q, log } = vq(); q.play(L('mid', 2)); q.play(L('low', 1)); q.play(L('same', 2)); assert.deepEqual(log, ['start mid'], 'lower and equal priority wait');
  q.play(L('hi', 4)); assert.deepEqual(log, ['start mid', 'interrupted mid', 'start hi']);
  q.skip(); assert.deepEqual(log.slice(3), ['skipped hi', 'start same'], 'waiting lines go in priority order');
});
test('voice queue: a trigger crossed again never restarts the same line, but a force play does', () => {
  const { q, log } = vq(); assert.ok(q.play(L('a'))); assert.ok(!q.play(L('a')), 'while speaking');
  for (let i = 0; i < 16; i++) q.update(.25); assert.deepEqual(log, ['start a', 'done a']);
  assert.ok(!q.play(L('a')), 'inside the cooldown');
  for (let i = 0; i < 40; i++) q.update(.25); assert.ok(q.play(L('a')), 'after the cooldown a line may speak again');
  assert.ok(q.play(L('a'), { force: true }), 'force restarts'); assert.equal(log.filter(l => l === 'start a').length, 3);
  const w = vq(); w.q.play(L('x', 3)); w.q.play(L('y', 2)); assert.ok(!w.q.play(L('y', 2)), 'already queued');
});
test('voice queue: clear by tag drops only that tag; the queue is bounded', () => {
  const { q, log } = vq(); q.play(L('a', 2), { tag: 'm1' }); q.play(L('b', 2), { tag: 'm2' }); q.play(L('c', 2), { tag: 'm1' });
  q.clear('m1'); assert.ok(log.includes('cleared a')); q.update(.1); assert.ok(q.has('b') && !q.has('c'));
  const big = vq(); for (let i = 0; i < 30; i++) big.q.play(L('n' + i, 2)); assert.ok(big.q.q.length <= 8);
  big.q.clear(); assert.ok(!big.q.busy);
});
test('voice queue: a line interrupted by a higher priority one is said again afterwards (hook may re-queue)', () => {
  const log = []; let q; q = new VoiceQueue({ start: i => log.push('start ' + i.id), end: (i, r) => { log.push(r + ' ' + i.id); if (r === 'interrupted') q.play(i.line, { force: true }); } });
  q.play(L('call', 2)); q.play(L('scene', 3)); assert.deepEqual(log, ['start call', 'interrupted call', 'start scene']);
  for (let i = 0; i < 40; i++) q.update(.25); assert.deepEqual(log.slice(3, 6), ['done scene', 'start call', 'done call'], log.join());
});
test('voice queue: a recording that never finishes cannot stall the game', () => {
  const log = []; const q = new VoiceQueue({ start: i => { i.audio = { done: () => false }; }, end: (i, r) => log.push(r) });
  q.play(L('a'), { audioDuration: 2 }); for (let i = 0; i < 200; i++) q.update(.25); assert.deepEqual(log, ['done']);
});

/* ---------- recordings ---------- */
test('no fake recordings are shipped: no audio files exist under gta/voice unless listed in the manifest', async () => {
  const fs = await import('node:fs'); const root = new URL('../../gta/voice/', import.meta.url);
  if (!fs.existsSync(root)) return;
  const files = fs.readdirSync(root, { recursive: true }).map(String).filter(f => /\.(ogg|mp3|wav|m4a)$/i.test(f));
  const man = fs.existsSync(new URL('manifest.json', root)) ? JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8')) : { lines: [] };
  const listed = new Set(man.lines.filter(l => l.exists).map(l => l.id));
  for (const f of files) { const id = f.split(/[\\/]/).pop().replace(/\.\w+$/, ''); assert.ok(listed.has(id), f + ' is not a recording that the manifest knows about'); }
});

test('voice tool: the master script and manifests are in sync with the dialogue database, and record nothing that does not exist', async () => {
  const { spawnSync } = await import('node:child_process'); const fs = await import('node:fs');
  const r = spawnSync(process.execPath, [new URL('../../gta/tools/voice.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'run: node gta/tools/voice.mjs  ' + r.stderr);
  const man = JSON.parse(fs.readFileSync(new URL('../../gta/voice/manifest.json', import.meta.url), 'utf8')), avail = JSON.parse(fs.readFileSync(new URL('../../gta/voice/available.json', import.meta.url), 'utf8'));
  assert.equal(man.total, Object.keys(LINES).length); assert.deepEqual(man.lines.map(l => l.id).sort(), Object.keys(LINES).sort());
  for (const l of man.lines) { assert.ok(l.missions.length > 0, l.id + ' is used by no mission'); assert.equal(l.exists, !!avail.files[l.id]); assert.ok(l.direction && l.text); }
  const script = fs.readFileSync(new URL('../../gta/VOICE_SCRIPT.md', import.meta.url), 'utf8');
  for (const id of Object.keys(LINES)) assert.ok(script.includes('`' + id + '`'), id + ' missing from the voice script');
  assert.equal(man.recorded, Object.keys(avail.files).length);
});
test('crew, conversation and runtime modules have valid syntax and reference only things that exist', async () => {
  const { spawnSync } = await import('node:child_process'); const fs = await import('node:fs');
  for (const f of fs.readdirSync(dir, { recursive: true }).map(String).filter(x => x.endsWith('.js'))) { const r = spawnSync(process.execPath, ['--check', new URL(f, dir).pathname]); assert.equal(r.status, 0, f + ': ' + r.stderr); }
});

test('import graph: every relative import in gta/js resolves to a file that really exports the names asked for', async () => {
  const fs = await import('node:fs'), path = await import('node:path');
  const root = new URL('../../gta/js/', import.meta.url).pathname, files = fs.readdirSync(root, { recursive: true }).map(String).filter(f => f.endsWith('.js'));
  const exportsOf = file => { const src = fs.readFileSync(file, 'utf8'), out = new Set(); let m;
    for (const re of [/export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z0-9_$]+)/g]) while ((m = re.exec(src))) out.add(m[1]);
    const decl = /export\s+(?:const|let|var)\s+([^;\n]*)/g; while ((m = decl.exec(src))) for (const d of m[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*=/g)) out.add(d[1]);   // export const A = 1, B = 2
    const lists = /export\s*\{([^}]*)\}/g; while ((m = lists.exec(src))) for (const part of m[1].split(',')) { const n = part.trim().split(/\s+as\s+/).pop().trim(); if (n) out.add(n); }
    if (/export\s+\*\s+from/.test(src)) out.add('*'); if (/export\s+default/.test(src)) out.add('default'); return out; };
  const cache = new Map(); let checked = 0;
  for (const f of files) {
    const file = path.join(root, f), src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /import\s+(?:([\w$*\s{},]+?)\s+from\s+)?['"](\.[^'"]+)['"]/g; let m;
    while ((m = re.exec(src))) {
      const target = path.resolve(path.dirname(file), m[2]); assert.ok(fs.existsSync(target), f + ' imports missing file ' + m[2]);
      const named = m[1] && /\{([^}]*)\}/.exec(m[1]); if (!named) continue;
      const ex = cache.get(target) || cache.set(target, exportsOf(target)).get(target);
      for (const part of named[1].split(',')) { const n = part.trim().split(/\s+as\s+/)[0].trim(); if (!n) continue; checked++; assert.ok(ex.has(n) || ex.has('*'), f + ': ' + m[2] + ' does not export ' + n); }
    }
  }
  assert.ok(checked > 300, 'checked ' + checked);
});

test('hangouts: whenever a person is in the world and eligible, they always have something to say', () => {
  const order = ['M00', 'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09'];
  for (let k = 0; k < order.length; k++) for (const rel of [-4, 0, 3]) for (const flags of [{}, { took_sloane_money: true, eddie_closure: true, mart_saved: true }]) {
    const st = S.createState(); order.slice(0, k + 1).forEach(m => { st.done[m] = { n: 1 }; }); for (const id of RELATIONSHIPS) st.rel[id] = rel; Object.assign(st.flags, flags); if (k === 9) st.ending = 'A';
    for (const h of HANGOUTS) {
      if (!S.evalCond(h.req, st)) continue;
      const ok = h.scenes.filter(x => SCENES[x.s] && S.evalCond(x.req, st) && (!SCENES[x.s].if || S.evalCond(SCENES[x.s].if, st)));
      assert.ok(ok.length > 0, h.id + ' has nothing to say after ' + order[k] + ' (rel ' + rel + ')');
    }
  }
});

test('cheat code: "kaidin" is recognised from a typed stream (and nothing else)', async () => {
  const { feed, CODES } = await imp('cheat.js'); assert.deepEqual(CODES, ['kaidin']);
  const type = text => { let buf = '', hit = []; for (const ch of text) { const r = feed(buf, ch); buf = r.buf; if (r.code) hit.push(r.code); } return hit; };
  assert.deepEqual(type('kaidin'), ['kaidin']); assert.deepEqual(type('xxKAIDINxx'), ['kaidin']); assert.deepEqual(type('kaidin kaidin'), ['kaidin', 'kaidin']);
  assert.deepEqual(type('kaidi'), []); assert.deepEqual(type('kaiXdin'), []); assert.deepEqual(type('wasd e shift'), []);
  assert.deepEqual(feed('', 'Shift').code, null);
});
test('the rigged model is never part of the story or the world unless typed in: no mission, hangout or scene places KAIDIN', () => {
  for (const m of MISSION_LIST) for (const st of m.steps) for (const n of st.npcs || []) assert.notEqual(n.id, 'KAIDIN');
  for (const h of HANGOUTS) assert.notEqual(h.id, 'KAIDIN');
  assert.ok(!SPEAKERS.includes('KAIDIN'));
});
test('the rigged model file is a valid glTF with the Walking and Running clips, and small enough to ship', async () => {
  const fs = await import('node:fs'); const f = fs.readFileSync(new URL('../../gta/models/kaidin.glb', import.meta.url));
  assert.equal(f.toString('latin1', 0, 4), 'glTF'); assert.equal(f.readUInt32LE(4), 2); assert.equal(f.readUInt32LE(8), f.length);
  const jl = f.readUInt32LE(12), j = JSON.parse(f.toString('utf8', 20, 20 + jl));
  assert.deepEqual(j.animations.map(a => a.name).sort(), ['Running', 'Walking']); assert.equal(j.skins.length, 1);
  assert.ok(f.length < 8e6, 'model is ' + f.length + ' bytes: keep the texture small'); assert.ok(!(j.extensionsRequired || []).length);
  assert.ok(fs.readFileSync(new URL('../../gta/lib/GLTFLoader.js', import.meta.url), 'utf8').includes('class GLTFLoader'));
});
test('story steps trigger only when you reach the mission point (not from down the road)', async () => {
  const w = makeWorld(); w.story.start('M00'); let g = 0;
  while (!(w.story.cur && w.story.cur.t === 'goto') && g++ < 200) stepWorld(w, .5);
  const t = w.story.target; w.p.x = t.x - 9; w.p.z = t.z; w.p.inCar = false; for (let i = 0; i < 6; i++) w.story.update(.5);
  assert.equal(w.story.s.active.id, 'M00'); assert.equal(w.story.s.active.step, 2, 'nine metres out: the scene has not started');
  w.p.x = t.x - 5; for (let i = 0; i < 6; i++) w.story.update(.5); assert.ok(w.story.s.done.M00 || w.story.s.active.id !== 'M00' || w.scenes.includes('M00_EDDIE'), 'five metres out: it starts');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../darko/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { ROOMS } = await load('game/rooms/index.js');
const { SCRIPTS } = await load('game/scripts/index.js');
const { CAST } = await load('game/cast.js');
const { NOTES } = await load('game/journal.js');
const { ITEMS } = await load('game/items.js');
const { TILE } = await load('game/tiles.js');
const { World, feetBox } = await load('game/world.js');
const { GameState, START, cond } = await load('game/state.js');
const { Runner } = await load('game/script.js');
const { formatDate, formatTime, phase, weekday, parseTime } = await load('game/calendar.js');
const TL = await load('game/timeline.js');
const ST = await load('engine/storage.js');
const { App } = await load('app.js');
const { PlayScene } = await load('scenes/play.js');
const { TitleScene } = await load('scenes/title.js');
const { EndScene } = await load('scenes/end.js');

const root = new URL('../../darko/', import.meta.url).pathname;
const jsFiles = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? jsFiles(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);

const silentAudio = { setVolumes() {}, sfx() {}, ambience() {}, unlock() {} };
const newApp = () => new App({ audio: silentAudio, store: new ST.Store(ST.memoryStorage()) });

const stateAt = (beat, flags = []) => {
  const s = new GameState();
  const b = TL.beatById(beat);
  Object.assign(s, { beat, day: b.day, time: parseTime(b.time) });
  flags.forEach(f => s.set(f));
  return s;
};

const freshWorld = (room, spawn, state = new GameState()) => {
  const w = new World(state);
  w.enter(room, spawn);
  return w;
};

// every flag the story sets, for exercising scripts in many states
const FLAGS = ['rose_asked', 'told_dad', 'told_liz', 'dinner_ready', 'dinner_done', 'rose_talk', 'took_pills', 'lamp_off', 'woke_oct2',
  'took_marker', 'frank_seen', 'countdown', 'engine_fell', 'golf_done', 'officer_ok', 'engine_seen', 'hotel_talk', 'bus_gone',
  'gretchen_sat', 'oct3_class', 'sparrow_led', 'sparrow_done', 'thurman1_done', 'flood_go', 'pipe_broken', 'cancelled',
  'walking_gretchen', 'gretchen_home', 'thurman2_done', 'oct7_english', 'tape_on'];

function* allSteps(steps, state, seen = new Set()) {
  for (const st of steps || []) {
    yield st;
    if (st[0] === 'if') { yield* allSteps(st[2], state, seen); yield* allSteps(st[3], state, seen); }
    if (st[0] === 'choice') for (const [, s] of st[1]) yield* allSteps(typeof s === 'string' ? resolveAll(s, state) : s, state, seen);
    if (st[0] === 'run' && !seen.has(st[1])) { seen.add(st[1]); yield* allSteps(resolveAll(st[1], state), state, seen); }
  }
}
const resolveAll = (id, state) => { const s = SCRIPTS[id]; return typeof s === 'function' ? s(state) : s; };

test('syntax: every module parses', () => {
  for (const f of jsFiles(path.join(root, 'js'))) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('page: /darko/ has a canvas at 320x180 and loads the module entry point', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<title>Donnie Darko<\/title>/);
  assert.match(html, /<canvas id="screen" width="320" height="180"/);
  assert.match(html, /type="module" src="js\/main.js"/);
  assert.match(fs.readFileSync(path.join(root, 'css/style.css'), 'utf8'), /image-rendering: pixelated/);
});

test('calendar: October 1, 1988 was a Saturday; times format in 12-hour clock', () => {
  assert.equal(weekday(1), 6);
  assert.equal(formatDate(1), 'SAT OCT 1 1988');
  assert.equal(formatDate(2), 'SUN OCT 2 1988');
  assert.equal(formatDate(30), 'SUN OCT 30 1988');
  assert.equal(formatTime(17 * 60 + 40), '5:40 PM');
  assert.equal(formatTime(0), '12:00 AM');
  assert.equal(phase(12 * 60), 'day');
  assert.equal(phase(18 * 60), 'dusk');
  assert.equal(phase(22 * 60), 'night');
});

test('timeline: the countdown reads 28:06:42:12 on the seventh hole and runs out on October 30', () => {
  assert.equal(TL.formatCountdown(TL.countdown(2, 90)), '28:06:42:12');
  const end = TL.countdown(30, 8 * 60 + 13);
  assert.equal(end.total, 0);
  assert.ok(TL.countdown(30, 8 * 60 + 12).total > 0);
  assert.equal(TL.countdown(29, 8 * 60 + 12).d, 1);
});

test('timeline: beats run forward in time, start with real scripts, and only the last has no successor', () => {
  let prev = -1;
  for (const b of TL.BEATS) {
    const at = TL.abs(b.day, parseTime(b.time));
    assert.ok(at > prev, `${b.id} starts before the beat before it`);
    prev = at;
    assert.ok(SCRIPTS[b.start], `${b.id}: missing start script ${b.start}`);
    if (b.until) assert.ok(parseTime(b.until) > parseTime(b.time), `${b.id}: until is before start`);
    if (b.sleep) assert.ok(ROOMS[b.sleep], `${b.id}: sleeps in missing room`);
    assert.equal(!!b.last, b === TL.BEATS[TL.BEATS.length - 1]);
  }
  assert.ok(TL.BEATS.every(b => b.day >= 1 && b.day <= 30));
});

test('state: conditions read flags, negations, lists, beats and functions', () => {
  const s = stateAt('oct4', ['a']);
  assert.ok(cond(s, 'a')); assert.ok(cond(s, '!b')); assert.ok(cond(s, ['a', '!b'])); assert.ok(!cond(s, ['a', 'b']));
  assert.ok(cond(s, st => st.has('a'))); assert.ok(cond(s, undefined));
  assert.ok(cond(s, 'beat:oct4')); assert.ok(cond(s, 'beat:oct3|oct4')); assert.ok(!cond(s, 'beat:oct3'));
  assert.ok(cond(s, 'from:flood')); assert.ok(!cond(s, 'from:oct5')); assert.ok(cond(s, 'before:oct5')); assert.ok(cond(s, '!beat:frank|flood'));
});

test('rooms: exits lead to real spawns, and there is always a way back', () => {
  for (const [id, r] of Object.entries(ROOMS)) {
    for (const ex of r.exits) {
      if (!ex.to) { assert.ok(SCRIPTS[ex.script], `${id}: exit with no script`); continue; }
      assert.ok(ROOMS[ex.to], `${id}: exit to missing room ${ex.to}`);
      assert.ok(ROOMS[ex.to].spawns[ex.spawn], `${id}: exit to missing spawn ${ex.to}.${ex.spawn}`);
      const back = ROOMS[ex.to].exits.some(b => b.to === id) || ROOMS[ex.to].props.some(p => p.script && TL.BEATS.some(b => (resolveAll(p.script, stateAt(b.id, ['oct7_english'])) || []).some(s => s[0] === 'go' && s[1] === id)));
      assert.ok(back, `${ex.to} has no way back to ${id}`);
    }
  }
  assert.ok(ROOMS[START.room].spawns[START.spawn]);
});

test('rooms: spawns stand on open ground, outside every exit', () => {
  for (const [id, r] of Object.entries(ROOMS)) for (const sp of Object.keys(r.spawns)) {
    const w = freshWorld(id, sp, stateAt('oct1', ['woke_oct2']));
    assert.ok(!w.blocked(feetBox(w.player.x, w.player.y), true), `${id}.${sp} is inside something solid`);
    const e = w.exitAt();
    assert.ok(!e || e.trigger, `${id}.${sp} is inside an exit`);
  }
});

test('rooms: every script, speaker, note and item named anywhere exists', () => {
  for (const [id, r] of Object.entries(ROOMS)) {
    for (const p of r.props) {
      if (p.script) assert.ok(SCRIPTS[p.script], `${id}.${p.id}: missing script ${p.script}`);
      if (p.again) assert.ok(SCRIPTS[p.again], `${id}.${p.id}: missing script ${p.again}`);
    }
    for (const n of r.npcs) { assert.ok(CAST[n.who], `${id}: unknown person ${n.who}`); if (n.script) assert.ok(SCRIPTS[n.script], `${id}.${n.id}: missing script ${n.script}`); }
    for (const e of r.onEnter) assert.ok(SCRIPTS[e.script], `${id}: missing onEnter ${e.script}`);
    for (const e of r.exits) if (e.script) assert.ok(SCRIPTS[e.script], `${id}: missing exit script ${e.script}`);
  }
  const states = [];
  for (const b of TL.BEATS) for (let i = 0; i <= FLAGS.length; i += 4) states.push(stateAt(b.id, FLAGS.slice(0, i)));
  for (const id of Object.keys(SCRIPTS)) for (const state of states) {
    for (const st of allSteps(resolveAll(id, state), state)) {
      if (st[0] === 'say' && st[1]) assert.ok(CAST[st[1]], `${id}: unknown speaker ${st[1]}`);
      if (st[0] === 'note') assert.ok(NOTES[st[1]], `${id}: unknown note ${st[1]}`);
      if (st[0] === 'give' || st[0] === 'take') assert.ok(ITEMS[st[1]], `${id}: unknown item ${st[1]}`);
      if (st[0] === 'run') assert.ok(SCRIPTS[st[1]], `${id}: runs missing ${st[1]}`);
      if (st[0] === 'go') assert.ok(ROOMS[st[1]]?.spawns[st[2]], `${id}: goes to missing ${st[1]}.${st[2]}`);
      if (st[0] === 'say') assert.ok(String(st[2]).length > 0, `${id}: empty line`);
      if (st[0] === 'time') assert.match(st[1], /^\d\d:\d\d$/);
    }
  }
});

// flood-fill where the player's feet can go (ignoring people), then check every live exit and
// every usable thing can be touched from somewhere in it, in every beat of the story
test('rooms: every exit and every usable thing can be reached on foot, in every beat', () => {
  const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  for (const b of TL.BEATS) {
    for (const [id, r] of Object.entries(ROOMS)) {
      const s = stateAt(b.id, ['rose_asked', 'rose_visit', 'woke_oct2', 'frank_seen', 'golf_woken', 'engine_seen', 'cancelled', 'sparrow_led']);
      const w = freshWorld(id, Object.keys(r.spawns)[0], s);
      const step = 2, seen = new Set(), q = [[Math.round(w.player.x), Math.round(w.player.y)]];
      const key = (x, y) => `${x},${y}`;
      seen.add(key(...q[0]));
      const spots = [];
      while (q.length) {
        const [x, y] = q.pop();
        spots.push([x, y]);
        for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
          const nx = x + dx, ny = y + dy, k = key(nx, ny);
          if (seen.has(k) || w.blocked(feetBox(nx, ny), true)) continue;
          seen.add(k); q.push([nx, ny]);
        }
      }
      const rect = e => ({ x: e.x * TILE, y: e.y * TILE, w: e.w * TILE, h: e.h * TILE });
      for (const e of r.exits) {
        if (e.when !== undefined && !cond(s, e.when)) continue;
        assert.ok(spots.some(([x, y]) => hits(feetBox(x, y), rect(e))), `${b.id}/${id}: exit to ${e.to || e.script} unreachable`);
      }
      for (const t of w.interactables()) {
        const rr = w.reachRect(t);
        const ok = spots.some(([x, y]) => ['up', 'down', 'left', 'right'].some(f => {
          Object.assign(w.player, { x, y, facing: f });
          return hits(w.probeBox(), rr);
        }));
        assert.ok(ok, `${b.id}/${id}: ${t.label} can't be reached`);
      }
    }
  }
});

test('storage: settings and saves are sanitised, and Continue finds the newest slot', () => {
  const store = new ST.Store(ST.memoryStorage());
  assert.deepEqual(store.loadSettings(), ST.DEFAULT_SETTINGS);
  store.storage.setItem(ST.KEYS.settings, '{"master": 4, "shake": "lots", "textSpeed": "fast", "scanlines": false}');
  const s = store.loadSettings();
  assert.equal(s.master, 1); assert.equal(s.shake, 'full'); assert.equal(s.textSpeed, 'fast'); assert.equal(s.scanlines, false);
  store.storage.setItem(ST.KEYS.slot('1'), '{not json');
  assert.equal(store.load('1'), null);
  assert.equal(store.latest(), null);
  const g = stateAt('oct4', ['rose_asked']); g.addNote('fridge'); g.give('greene');
  assert.ok(store.save('2', g.toSave()));
  const back = GameState.fromSave(store.load('2'));
  assert.ok(back.has('rose_asked') && back.hasNote('fridge') && back.hasItem('greene'));
  assert.equal(back.beat, 'oct4');
  assert.equal(back.day, 4);
  assert.equal(store.latest().slot, '2');
  assert.equal(ST.sanitizeSave({ v: 1, room: 'x', x: 1, y: 1, day: 2, time: 0 }), null, 'Stage 1 saves are retired');
});

test('runner: if, run and choice steps steer the scene', () => {
  const s = new GameState();
  const host = { state: s, exec(op, args, runner) {
    if (op === 'set') s.set(args[0]);
    if (op === 'choice') return { update: () => { runner.push(args[0][1][1]); return true; } };
    return null;
  } };
  const input = { consume() {} };
  const r = new Runner([['set', 'x'], ['if', 'x', [['set', 'yes']], [['set', 'no']]], ['choice', [['a', [['set', 'A']]], ['b', [['set', 'B']]]]], ['run', 'lamp']], host);
  r.update(0, input);
  assert.ok(r.done && s.has('yes') && !s.has('no') && s.has('B') && !s.has('A'));
});

test('world: walls and furniture block; the player slides along them; followers follow', () => {
  const w = freshWorld('donnie_room', 'start');
  const before = w.player.y;
  for (let i = 0; i < 200; i++) w.move(0, -2);
  assert.ok(w.player.y > 3 * TILE && w.player.y < before, 'stopped at the wall face');
  for (let i = 0; i < 200; i++) w.move(-2, -1);
  assert.ok(w.player.x > 3 * TILE - 1, 'the bed is solid');
  const s = stateAt('oct4', ['walking_gretchen']);
  const ws = freshWorld('street', 'bus_stop', s);
  const g = ws.npcs.find(n => n.id === 'gretchen_f');
  ws.player.x -= 100;
  for (let i = 0; i < 300; i++) ws.update(1 / 60);
  assert.ok(Math.hypot(g.x - ws.player.x, g.y - ws.player.y) < 20, 'Gretchen keeps up');
});

// ---- the whole story so far, driven like a player would: walk up to things and press Enter ----

let tick = 0;
function pump(app, frames = 1) {
  for (let i = 0; i < frames; i++) {
    if (tick++ % 2 === 0) app.input.keyDown('Enter'); else app.input.keyUp('Enter');
    app.update(1 / 60);
  }
}

const playOf = app => app.scenes.find(s => s instanceof PlayScene);

function finishScene(app, limit = 40000) {
  for (let i = 0; i < limit; i++) {
    const p = playOf(app);
    if (!p || (!p.busy && p.fade <= 0)) return;
    pump(app, 1);
  }
  throw new Error(`scene never finished (beat ${playOf(app)?.state.beat}, block ${playOf(app)?.runner?.block?.constructor.name})`);
}

function goTo(app, room) {
  const play = playOf(app), w = play.world;
  if (w.room.id !== room) { w.enter(room, Object.keys(ROOMS[room].spawns)[0]); play.checkOnEnter(); finishScene(app); }
}

function use(app, room, targetId) {
  goTo(app, room);
  const play = playOf(app);
  const t = play.world.interactables().find(x => x.ref.id === targetId);
  assert.ok(t, `${room}: nothing called ${targetId} (beat ${play.state.beat}; flags: ${[...play.state.flags].join(' ')})`);
  play.interact(t);
  finishScene(app);
}

// stand at a tile position and let a frame run, so exits and triggers fire
function stand(app, room, tx, ty) {
  goTo(app, room);
  const play = playOf(app);
  Object.assign(play.world.player, { x: tx * TILE, y: ty * TILE });
  app.update(1 / 60);
  finishScene(app);
}

function walkInto(app, room, tx, ty, key) {
  goTo(app, room);
  const play = playOf(app);
  Object.assign(play.world.player, { x: tx * TILE, y: ty * TILE });
  for (let i = 0; i < 40; i++) { app.input.keyDown(key); app.update(1 / 60); }
  app.input.keyUp(key);
  finishScene(app);
}

test('playthrough: October 1 through the "Controlling Fear" tape, in order', () => {
  const app = newApp();
  app.newGame();
  const play = app.top;
  finishScene(app);
  const s = play.state;
  assert.equal(s.beat, 'oct1');
  assert.equal(formatDate(s.day), 'SAT OCT 1 1988');
  assert.ok(s.hasNote('ridge'));
  assert.ok(app.store.load('auto'), 'the intro autosaves');

  // ---- prologue
  use(app, 'kitchen', 'table');
  assert.ok(!s.has('dinner_done'), 'no dinner before everyone is called');
  use(app, 'hall', 'door_liz');
  assert.ok(!s.has('told_liz'), "Elizabeth's door does nothing before Mom asks");
  use(app, 'kitchen', 'fridge');
  use(app, 'kitchen', 'rose');
  use(app, 'yard', 'eddie');
  use(app, 'hall', 'door_liz');
  assert.ok(s.has('dinner_ready'));
  use(app, 'kitchen', 'table');
  assert.ok(s.has('dinner_done') && s.hasNote('dinner'));
  walkInto(app, 'living', 10, 10.3, 'ArrowDown');
  assert.equal(play.world.room.id, 'living', 'the front door is shut after dinner');
  play.world.enter('donnie_room', 'from_hall'); play.checkOnEnter(); finishScene(app);
  assert.ok(s.has('rose_talk'));
  use(app, 'donnie_room', 'bed');
  assert.equal(s.beat, 'oct1', 'no sleeping before the pills');
  use(app, 'hall', 'door_bath');
  use(app, 'donnie_room', 'bed');

  // ---- October 2: Frank
  assert.equal(s.beat, 'frank');
  assert.equal(formatTime(s.time), '12:50 AM');
  assert.ok(s.has('woke_oct2'));
  walkInto(app, 'living', 10, 10.3, 'ArrowDown');
  assert.equal(play.world.room.id, 'living', "can't leave without the marker");
  use(app, 'kitchen', 'fridge');
  assert.ok(s.hasItem('marker'));
  stand(app, 'street', 42.8, 6);
  assert.equal(play.world.room.id, 'golf', 'the east end of the street leads to the golf course tonight');
  stand(app, 'golf', 14.3, 6);
  assert.ok(s.has('frank_seen') && s.hasNote('frank'));
  use(app, 'golf', 'frank');
  assert.ok(s.has('countdown'));

  // ---- the morning after
  assert.equal(s.beat, 'engine');
  assert.equal(play.world.room.id, 'golf');
  assert.ok(s.hasNote('arm'));
  assert.equal(TL.formatCountdown(TL.countdown(s.day, s.time)).slice(0, 5), '27:22', 'counting down from the seventh hole');
  stand(app, 'street', 17.9, 4.3);
  assert.equal(play.world.room.id, 'street', 'the officer stops him');
  use(app, 'street', 'officer');
  stand(app, 'street', 17.9, 4.3);
  assert.equal(play.world.room.id, 'yard');
  assert.ok(s.has('engine_seen') && s.hasNote('engine'));
  use(app, 'yard', 'eddie_e');
  assert.equal(play.world.room.id, 'hotel');
  use(app, 'hotel', 'samantha');
  use(app, 'hotel', 'bed1');

  // ---- October 3
  assert.equal(s.beat, 'oct3');
  assert.equal(play.world.room.id, 'school_front');
  use(app, 'school_front', 'doors');
  use(app, 'school_hall', 'door_english');
  use(app, 'english', 'my_desk');
  assert.ok(s.has('gretchen_sat') && s.hasNote('gretchen'));
  assert.equal(s.beat, 'oct3_eve');
  assert.equal(play.world.room.id, 'oldgun');
  use(app, 'oldgun', 'taurus');
  assert.ok(!s.has('thurman1_done'), "Dad won't drive on until she's safe");
  use(app, 'oldgun', 'sparrow');
  use(app, 'oldgun', 'sparrow_mail');
  assert.ok(s.hasNote('dies_alone'));
  use(app, 'oldgun', 'taurus');
  assert.ok(s.has('thurman1_done') && s.hasNote('thurman_frank'));
  use(app, 'living', 'couch');

  // ---- the flood
  assert.equal(s.beat, 'flood');
  assert.equal(formatTime(s.time), '2:00 AM');
  use(app, 'living', 'frank');
  assert.equal(play.world.room.id, 'school_hall');
  assert.ok(s.has('flashlight') && s.hasItem('axe'));
  use(app, 'school_hall', 'frank');
  stand(app, 'school_hall', 29.9, 6.7);
  assert.equal(play.world.room.id, 'basement');
  use(app, 'basement', 'valve');

  // ---- October 4
  assert.equal(s.beat, 'oct4');
  assert.ok(!s.has('flashlight') && !s.hasItem('axe'));
  assert.ok(s.hasNote('mongrel'));
  assert.equal(play.world.room.id, 'street');
  use(app, 'living', 'couch');
  assert.equal(s.beat, 'oct4', "can't sleep the day away before walking Gretchen home");
  use(app, 'street', 'gretchen');
  assert.ok(s.has('walking_gretchen'));
  stand(app, 'street', 32.2, 6); stand(app, 'street', 22.2, 6); stand(app, 'street', 12.2, 6); stand(app, 'street', 3.2, 6);
  assert.ok(s.has('gretchen_home') && s.hasNote('going_together') && s.hasNote('superhero'));
  use(app, 'living', 'couch');

  // ---- October 5 and 6
  assert.equal(s.beat, 'oct5');
  use(app, 'living', 'tv');
  assert.ok(s.hasNote('debate'));
  use(app, 'living', 'couch');
  assert.equal(s.beat, 'oct6');
  use(app, 'living', 'couch');
  assert.equal(s.beat, 'oct6', 'Dr. Thurman first');
  use(app, 'yard', 'car');
  assert.ok(s.has('thurman2_done') && s.hasNote('hypnosis'));
  use(app, 'living', 'couch');

  // ---- October 7
  assert.equal(s.beat, 'oct7');
  use(app, 'school_hall', 'door_health');
  assert.equal(play.world.room.id, 'school_hall', 'English first');
  use(app, 'school_hall', 'door_english');
  use(app, 'english', 'my_desk');
  assert.ok(s.hasNote('handwriting'));
  use(app, 'school_hall', 'door_health');
  assert.equal(play.world.room.id, 'health');
  const ends = () => app.top instanceof EndScene;
  const t = play.world.interactables().find(x => x.ref.id === 'my_desk');
  play.interact(t);
  for (let i = 0; i < 40000 && !ends(); i++) pump(app, 1);
  assert.ok(ends(), 'the build ends after the tape');
  assert.ok(s.hasNote('controlling_fear'));
  const saved = app.store.load('auto');
  assert.equal(saved.beat, 'build_end');

  // Continue comes back to the end of the build without breaking
  for (let i = 0; i < 300 && !(app.top instanceof TitleScene); i++) pump(app, 1);
  app.continueGame();
  assert.equal(app.top.state.beat, 'build_end');
});

test('playthrough: a save mid-day restores beat, place, time, flags and journal', () => {
  const app = newApp();
  app.newGame();
  finishScene(app);
  use(app, 'kitchen', 'rose');
  const play = app.top;
  play.world.enter('yard', 'from_house');
  play.world.move(10, 10);
  const { x, y } = play.world.player;
  assert.ok(app.store.save('1', play.state.toSave()));
  const app2 = new App({ audio: silentAudio, store: app.store });
  app2.loadGame(app2.store.load('1'));
  const p2 = app2.top;
  assert.equal(p2.state.room, 'yard');
  assert.equal(p2.state.beat, 'oct1');
  assert.ok(Math.abs(p2.world.player.x - x) < 0.2 && Math.abs(p2.world.player.y - y) < 0.2);
  assert.ok(p2.state.has('rose_asked'));
  assert.equal(p2.state.objective, 'Tell Dad and Elizabeth: dinner at six.');
  assert.ok(p2.world.npcs.some(n => n.id === 'eddie'));
});

test('clock: time creeps forward while exploring but stops at the beat\'s limit', () => {
  const app = newApp();
  app.newGame();
  finishScene(app);
  const s = app.top.state;
  const t0 = s.time;
  for (let i = 0; i < 60 * 30; i++) app.update(1 / 60);
  assert.ok(s.time > t0 + 9 && s.time < t0 + 11, `30 seconds is ten minutes (${s.time - t0})`);
  s.time = parseTime('23:29');
  for (let i = 0; i < 60 * 60; i++) app.update(1 / 60);
  assert.equal(s.time, parseTime('23:30'));
  assert.equal(s.beat, 'oct1', 'the clock alone never ends a beat');
});

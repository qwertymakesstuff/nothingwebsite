import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../darko/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { ROOMS } = await load('game/rooms.js');
const { SCRIPTS } = await load('game/scripts.js');
const { CAST } = await load('game/cast.js');
const { NOTES } = await load('game/journal.js');
const { ITEMS } = await load('game/items.js');
const { TILE, isSolidChar } = await load('game/tiles.js');
const { World, feetBox } = await load('game/world.js');
const { GameState, START, cond } = await load('game/state.js');
const { Runner } = await load('game/script.js');
const { formatDate, formatTime, phase, weekday } = await load('game/calendar.js');
const ST = await load('engine/storage.js');
const { App } = await load('app.js');
const { PlayScene } = await load('scenes/play.js');
const { TitleScene } = await load('scenes/title.js');
const { EndScene } = await load('scenes/end.js');

const root = new URL('../../darko/', import.meta.url).pathname;
const jsFiles = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? jsFiles(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);

const silentAudio = { setVolumes() {}, sfx() {}, ambience() {}, unlock() {} };
const newApp = () => new App({ audio: silentAudio, store: new ST.Store(ST.memoryStorage()) });

const freshWorld = (room, spawn) => {
  const w = new World(new GameState());
  w.enter(room, spawn);
  return w;
};

// every step list a script can produce, for any state we can reasonably be in
const STATES = (() => {
  const flags = ['rose_asked', 'told_dad', 'told_liz', 'dinner_ready', 'dinner_done', 'rose_talk', 'took_pills', 'stage1_end', 'lamp_off', 'seen:samantha'];
  const out = [];
  for (let i = 0; i <= flags.length; i++) {
    const s = new GameState();
    flags.slice(0, i).forEach(f => s.set(f));
    for (const t of [17 * 60 + 40, 21 * 60]) { const c = GameState.fromSave({ ...s.toSave(), time: t }); out.push(c); }
  }
  return out;
})();

function* allSteps(steps, state) {
  for (const st of steps) {
    yield st;
    if (st[0] === 'if') { yield* allSteps(st[2] || [], state); yield* allSteps(st[3] || [], state); }
    if (st[0] === 'choice') for (const [, s] of st[1]) yield* allSteps(typeof s === 'string' ? resolveAll(s, state) : s, state);
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

test('calendar: October 2, 1988 was a Sunday; times format in 12-hour clock', () => {
  assert.equal(weekday(2), 0);
  assert.equal(formatDate(2), 'SUN OCT 2 1988');
  assert.equal(formatDate(30), 'SUN OCT 30 1988');
  assert.equal(formatTime(17 * 60 + 40), '5:40 PM');
  assert.equal(formatTime(0), '12:00 AM');
  assert.equal(phase(12 * 60), 'day');
  assert.equal(phase(18 * 60), 'dusk');
  assert.equal(phase(22 * 60), 'night');
});

test('rooms: exits lead to real spawns, and there is always a way back', () => {
  for (const [id, r] of Object.entries(ROOMS)) {
    for (const ex of r.exits) {
      if (!ex.to) { assert.ok(SCRIPTS[ex.script], `${id}: blocking exit with no script`); continue; }
      assert.ok(ROOMS[ex.to], `${id}: exit to missing room ${ex.to}`);
      assert.ok(ROOMS[ex.to].spawns[ex.spawn], `${id}: exit to missing spawn ${ex.to}.${ex.spawn}`);
      const back = ROOMS[ex.to].exits.some(b => b.to === id) || ROOMS[ex.to].props.some(p => (SCRIPTS[p.script] || []).some?.(s => s[0] === 'go' && s[1] === id));
      assert.ok(back, `${ex.to} has no way back to ${id}`);
    }
  }
  assert.ok(ROOMS[START.room].spawns[START.spawn]);
});

test('rooms: spawns stand on open ground, outside every exit', () => {
  for (const [id, r] of Object.entries(ROOMS)) for (const sp of Object.keys(r.spawns)) {
    const w = freshWorld(id, sp);
    assert.ok(!w.blocked(feetBox(w.player.x, w.player.y), true), `${id}.${sp} is inside something solid`);
    assert.ok(!w.exitAt(), `${id}.${sp} is inside an exit`);
  }
});

test('rooms: every script, speaker, note and item a room or scene names exists', () => {
  for (const [id, r] of Object.entries(ROOMS)) {
    for (const p of r.props) {
      if (p.script) assert.ok(SCRIPTS[p.script], `${id}.${p.id}: missing script ${p.script}`);
      if (p.again) assert.ok(SCRIPTS[p.again], `${id}.${p.id}: missing script ${p.again}`);
    }
    for (const n of r.npcs) { assert.ok(CAST[n.who], `${id}: unknown person ${n.who}`); assert.ok(SCRIPTS[n.script], `${id}.${n.id}: missing script`); }
    for (const e of r.onEnter) assert.ok(SCRIPTS[e.script]);
  }
  for (const id of Object.keys(SCRIPTS)) {
    for (const state of STATES) {
      for (const st of allSteps(resolveAll(id, state), state)) {
        if (st[0] === 'say' && st[1]) assert.ok(CAST[st[1]], `${id}: unknown speaker ${st[1]}`);
        if (st[0] === 'note') assert.ok(NOTES[st[1]], `${id}: unknown note ${st[1]}`);
        if (st[0] === 'give') assert.ok(ITEMS[st[1]], `${id}: unknown item ${st[1]}`);
        if (st[0] === 'run') assert.ok(SCRIPTS[st[1]], `${id}: runs missing ${st[1]}`);
        if (st[0] === 'go') assert.ok(ROOMS[st[1]]?.spawns[st[2]], `${id}: goes to missing ${st[1]}.${st[2]}`);
        if (st[0] === 'say') assert.ok(String(st[2]).length > 0);
      }
    }
  }
});

// flood-fill where the player's feet can go (ignoring people), then check every exit and every
// usable thing can be touched from somewhere in it
test('rooms: every exit and every usable thing can be reached on foot', () => {
  for (const [id, r] of Object.entries(ROOMS)) {
    const firstSpawn = Object.keys(r.spawns)[0];
    const w = freshWorld(id, firstSpawn);
    const s = new GameState();
    ['rose_asked', 'rose_visit'].forEach(f => s.set(f)); // make the conditional people present
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
    const exitRect = e => ({ x: e.x * TILE, y: e.y * TILE, w: e.w * TILE, h: e.h * TILE });
    const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const e of r.exits) assert.ok(spots.some(([x, y]) => hits(feetBox(x, y), exitRect(e))), `${id}: exit to ${e.to || e.script} unreachable`);
    for (const t of w.interactables()) {
      const rr = w.reachRect(t);
      const ok = spots.some(([x, y]) => ['up', 'down', 'left', 'right'].some(f => {
        Object.assign(w.player, { x, y, facing: f });
        return hits(w.probeBox(), rr);
      }));
      assert.ok(ok, `${id}: ${t.label} can't be reached`);
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
  const g = new GameState(); g.set('rose_asked'); g.addNote('fridge'); g.give('greene');
  assert.ok(store.save('2', g.toSave()));
  const back = GameState.fromSave(store.load('2'));
  assert.ok(back.has('rose_asked') && back.hasNote('fridge') && back.hasItem('greene'));
  assert.equal(back.day, 2);
  assert.equal(store.latest().slot, '2');
  assert.equal(ST.sanitizeSave({ v: 99, room: 'x', x: 1, y: 1, day: 2, time: 0 }), null);
});

test('state: conditions read flags, negations, lists and functions', () => {
  const s = new GameState(); s.set('a');
  assert.ok(cond(s, 'a')); assert.ok(cond(s, '!b')); assert.ok(cond(s, ['a', '!b'])); assert.ok(!cond(s, ['a', 'b']));
  assert.ok(cond(s, st => st.has('a'))); assert.ok(cond(s, undefined));
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

test('world: walls and furniture block; the player slides along them', () => {
  const w = freshWorld('donnie_room', 'start');
  const before = w.player.y;
  for (let i = 0; i < 200; i++) w.move(0, -2);
  assert.ok(w.player.y > 3 * TILE && w.player.y < before, 'stopped at the wall face');
  for (let i = 0; i < 200; i++) w.move(-2, -1);
  assert.ok(w.player.x > 3 * TILE - 1, 'the bed is solid');
});

// ---- a whole playthrough, driven like a player would: walk up to things and press Enter ----

let tick = 0;
function pump(app, frames = 1) {
  for (let i = 0; i < frames; i++) {
    if (tick++ % 2 === 0) app.input.keyDown('Enter'); else app.input.keyUp('Enter');
    app.update(1 / 60);
  }
}

function finishScene(app, limit = 20000) {
  const play = () => app.scenes.find(s => s instanceof PlayScene);
  for (let i = 0; i < limit; i++) {
    const p = play();
    if (!p || (!p.busy && p.fade <= 0)) return;
    pump(app, 1);
  }
  throw new Error('scene never finished');
}

function use(app, room, targetId) {
  const play = app.top;
  const w = play.world;
  if (w.room.id !== room) { w.enter(room, Object.keys(ROOMS[room].spawns)[0]); play.checkOnEnter(); finishScene(app); }
  const t = w.interactables().find(x => x.ref.id === targetId);
  assert.ok(t, `${room}: nothing called ${targetId} (flags: ${[...play.state.flags].join(' ')})`);
  play.interact(t);
  finishScene(app);
}

test('playthrough: the evening of October 2 runs in order and ends the stage', () => {
  const app = newApp();
  app.newGame();
  const play = app.top;
  assert.ok(play instanceof PlayScene);
  finishScene(app);
  const s = play.state;
  assert.equal(s.room, 'donnie_room');
  assert.ok(s.hasNote('ridge'));
  assert.equal(s.objective, 'Head downstairs.');
  assert.ok(app.store.load('auto'), 'the intro autosaves');

  // the table does nothing until everyone has been called
  use(app, 'kitchen', 'table');
  assert.ok(!s.has('dinner_done'));
  // knocking on Elizabeth's door before Mom asks doesn't count
  use(app, 'hall', 'door_liz');
  assert.ok(!s.has('told_liz'));

  use(app, 'kitchen', 'fridge');
  assert.ok(s.hasNote('fridge'));
  use(app, 'kitchen', 'rose');
  assert.ok(s.has('rose_asked'));
  use(app, 'yard', 'eddie');
  assert.ok(s.has('told_dad') && !s.has('dinner_ready'));
  assert.ok(!play.world.npcs.some(n => n.id === 'eddie'), 'Dad has gone inside');
  use(app, 'hall', 'door_liz');
  assert.ok(s.has('told_liz') && s.has('dinner_ready'));

  use(app, 'kitchen', 'table');
  assert.ok(s.has('dinner_done') && s.hasNote('dinner'));
  assert.equal(formatTime(s.time), '7:20 PM');

  // the front door is shut for the night now
  play.world.enter('living', 'from_kitchen');
  Object.assign(play.world.player, { x: 10 * TILE, y: 10.3 * TILE, facing: 'down' });
  for (let i = 0; i < 30; i++) { app.input.keyDown('ArrowDown'); app.update(1 / 60); }
  app.input.keyUp('ArrowDown');
  finishScene(app);
  assert.equal(play.world.room.id, 'living', 'could not leave after dinner');

  // going up to his room triggers Mom's visit
  play.world.enter('donnie_room', 'from_hall');
  play.checkOnEnter();
  finishScene(app);
  assert.ok(s.has('rose_talk') && s.hasNote('mom') && s.has('lamp_off'));
  assert.equal(formatTime(s.time), '9:05 PM');

  use(app, 'donnie_room', 'bed');
  assert.ok(!s.has('stage1_end'), 'no sleeping before the pills');
  use(app, 'hall', 'door_bath');
  assert.ok(s.has('took_pills'));

  play.world.enter('donnie_room', 'from_hall');
  const bed = play.world.interactables().find(x => x.ref.id === 'bed');
  play.interact(bed);
  for (let i = 0; i < 20000 && !(app.top instanceof EndScene); i++) pump(app, 1);
  assert.ok(app.top instanceof EndScene, 'the stage ends after sleeping');
  const saved = app.store.load('auto');
  assert.ok(saved.flags.includes('stage1_end'));

  // Continue puts you back in the bedroom with everything intact
  for (let i = 0; i < 200 && !(app.top instanceof TitleScene); i++) pump(app, 1);
  assert.ok(app.top instanceof TitleScene);
  app.continueGame();
  assert.equal(app.top.state.room, 'donnie_room');
  assert.ok(app.top.state.has('took_pills'));
});

test('playthrough: a save mid-evening restores position, time, flags and journal', () => {
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
  assert.ok(Math.abs(p2.world.player.x - x) < 0.2 && Math.abs(p2.world.player.y - y) < 0.2);
  assert.ok(p2.state.has('rose_asked'));
  assert.equal(p2.state.objective, 'Tell Dad and Elizabeth: dinner at six.');
  assert.ok(p2.world.npcs.some(n => n.id === 'eddie'));
});

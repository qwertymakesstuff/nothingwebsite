import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../hollow-saint/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { PALETTE, SHADE, TRANSPARENT } = await load('engine/palette.js');
const { GLYPHS, GLYPH_W, wrap, normalize } = await load('engine/font.js');
const { Frame } = await load('engine/frame.js');
const { Input, DEFAULT_BINDINGS } = await load('engine/input.js');
const { moveBox, overlaps } = await load('engine/collision.js');
const ST = await load('engine/storage.js');
const { ROOMS, START } = await load('game/rooms/index.js');
const { TILES, isSolidChar, bakeRoom } = await load('game/tiles.js');
const { SPRITES, PLAYER } = await load('game/art.js');
const { World, playerBox, probeBox } = await load('game/world.js');
const { newRunState, stateFromSave, saveFromState } = await load('game/state.js');
const { runScript, pickVariant } = await load('game/script.js');
const { applyLighting } = await load('game/lighting.js');
const { paginate, TextBox } = await load('ui/textbox.js');
const { App } = await load('app.js');
const { BootScene } = await load('scenes/boot.js');
const { TitleScene } = await load('scenes/title.js');
const { PlayScene } = await load('scenes/play.js');
const { TILE } = await load('game/config.js');

const root = new URL('../../hollow-saint/', import.meta.url).pathname;
const jsFiles = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? jsFiles(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);

const freshWorld = (room = START.room, spawn = START.spawn) => {
  const s = newRunState();
  const w = new World(s);
  w.enter(room, spawn);
  return w;
};

const goTargets = room => (room.props || []).flatMap(p => (p.script || []).filter(v => v.go).map(v => v.go.to));
const neighbours = id => [...ROOMS[id].exits.map(e => e.to), ...goTargets(ROOMS[id])];

const scriptsOf = room => [
  ...(room.props || []).filter(p => p.script).map(p => [p.id, p.script]),
  ...(room.triggers || []).map(t => [t.id, t.script]),
];

test('syntax: every module parses', () => {
  for (const f of jsFiles(path.join(root, 'js'))) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('palette: sixteen colours, shading only ever gets darker', () => {
  assert.equal(PALETTE.length, 16);
  const lum = hex => { const n = parseInt(hex.slice(1), 16); return 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); };
  SHADE.forEach((to, from) => {
    assert.ok(to >= 0 && to < 16);
    assert.ok(lum(PALETTE[to]) <= lum(PALETTE[from]), `shade of ${from} is brighter`);
  });
  // repeated shading always reaches black
  for (let c = 0; c < 16; c++) { let x = c; for (let i = 0; i < 16; i++) x = SHADE[x]; assert.equal(x, 0); }
});

test('font: every glyph fits its cell; text normalises and wraps', () => {
  for (const [ch, g] of Object.entries(GLYPHS)) assert.equal(g.length, GLYPH_W * 8, ch);
  assert.equal(normalize('é…'), '?...');
  for (const line of wrap('the quick brown fox jumps over the lazy dog again and again', 12)) assert.ok(line.length <= 12);
  assert.deepEqual(wrap('a\nb', 10), ['a', 'b']);
});

test('art: sprites use only palette colours', () => {
  const all = [...Object.values(SPRITES).flat(), ...Object.values(PLAYER).flat()];
  for (const s of all) for (const c of s.px) assert.ok(c === TRANSPARENT || c < 16);
  for (const dir of ['up', 'down', 'right']) assert.equal(PLAYER[dir].length, 4);
});

test('rendering: framebuffer stays on-palette and clips at the edges', () => {
  const f = new Frame(32, 32);
  f.rect(-10, -10, 100, 100, 5);
  f.text('Hello?', -3, 28, 7);
  f.blit(SPRITES.shrine, 20, 20);
  f.line(-5, -5, 50, 40, 9);
  for (const c of f.px) assert.ok(c < 16);
  for (const r of Object.values(ROOMS)) for (const c of bakeRoom(r).px) assert.ok(c < 16);
});

test('rooms: maps are rectangular and use known tiles; every reference resolves', () => {
  for (const [id, r] of Object.entries(ROOMS)) {
    const w = r.map[0].length;
    assert.ok(r.map.every(row => row.length === w), `${id}: ragged map`);
    for (const row of r.map) for (const ch of row) assert.ok(TILES[ch], `${id}: unknown tile "${ch}"`);
    assert.ok(r.name && r.ambience, `${id}: needs a name and ambience`);
    for (const ex of r.exits) {
      assert.ok(ROOMS[ex.to], `${id}: exit to missing room ${ex.to}`);
      assert.ok(ROOMS[ex.to].spawns[ex.spawn], `${id}: exit to missing spawn ${ex.to}.${ex.spawn}`);
      // you can always come back the way you came
      assert.ok(neighbours(ex.to).includes(id), `${ex.to} has no way back to ${id}`);
    }
    for (const p of r.props) if (p.sprite) assert.ok(SPRITES[p.sprite], `${id}.${p.id}: missing sprite ${p.sprite}`);
    for (const p of r.props) for (const a of p.alt || []) if (a.sprite) assert.ok(SPRITES[a.sprite]);
  }
  assert.ok(ROOMS[START.room].spawns[START.spawn]);
});

test('rooms: spawns stand on open ground, outside every exit and trigger', () => {
  for (const [id, r] of Object.entries(ROOMS)) for (const sp of Object.keys(r.spawns)) {
    const w = freshWorld(id, sp);
    const box = playerBox(w.player.x, w.player.y);
    assert.ok(!w.blocked(box), `${id}.${sp} is inside a wall`);
    assert.ok(!w.exitAt(box), `${id}.${sp} is inside an exit`);
  }
});

test('scripts: every script ends in an unconditional fallback, so nothing ever goes silent', () => {
  for (const [rid, r] of Object.entries(ROOMS)) for (const [id, s] of scriptsOf(r)) {
    assert.ok(s.length && !s[s.length - 1].when, `${rid}.${id} has no fallback`);
    for (const v of s) assert.ok((v.say || []).length || v.talk || v.doc || v.tape || v.go || v.puzzle, `${rid}.${id}: a variant does nothing`);
  }
});

// flood-fill every position the player's feet can reach, then check that each exit,
// trigger and interactable in the room can be touched from somewhere in that set
function reach(w) {
  const props = w.props();
  const seen = new Set(), q = [[Math.round(w.player.x), Math.round(w.player.y)]];
  const key = (x, y) => x * 4096 + y;
  seen.add(key(...q[0]));
  const out = [];
  while (q.length) {
    const [x, y] = q.pop();
    out.push([x, y]);
    for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (seen.has(k) || w.blocked(playerBox(nx, ny), props)) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return out;
}

// every lock opened and every blocker gone: the geometry alone must let you reach everything
const OPENED = ['gate_open', 'lane_open', 'hatch_open', 'undercroft_open', 'vestry_open', 'cemetery_open', 'dead:kneeler', 'crypt_open', 'cal_aside', 'maze_solved', 'bells_solved'];
const progressedWorld = (room, spawn) => {
  const s = newRunState();
  OPENED.forEach(f => s.flags.add(f));
  const w = new World(s);
  w.enter(room, spawn);
  return w;
};

test('map: from every spawn, every exit, trigger and interactable can be reached', () => {
  for (const [id, r] of Object.entries(ROOMS)) for (const sp of Object.keys(r.spawns)) {
    const w = progressedWorld(id, sp);
    const pts = reach(w);
    for (const ex of w.exits()) assert.ok(pts.some(([x, y]) => overlaps(playerBox(x, y), ex)), `${id}.${sp}: can't reach exit to ${ex.to}`);
    for (const t of w.triggers()) assert.ok(pts.some(([x, y]) => overlaps(playerBox(x, y), t)), `${id}.${sp}: can't reach trigger ${t.id}`);
    for (const p of w.props().filter(p => p.script)) {
      assert.ok(pts.some(([x, y]) => ['up', 'down', 'left', 'right'].some(f => overlaps(probeBox(x, y, f), p.zoneRect))), `${id}.${sp}: can't reach ${p.id}`);
    }
  }
});

test('map: every room is reachable from the start', () => {
  const seen = new Set([START.room]), q = [START.room];
  while (q.length) for (const to of neighbours(q.pop())) if (!seen.has(to)) { seen.add(to); q.push(to); }
  assert.deepEqual([...seen].sort(), Object.keys(ROOMS).sort());
});

test('collision: walls stop movement, open ground does not', () => {
  const blocked = b => b.x < 0 || b.x + b.w > 40;
  const r = moveBox({ x: 30, y: 0, w: 6, h: 3 }, 20, 0, blocked);
  assert.ok(r.hit.x && r.x <= 34 && r.x > 33);
  const s = moveBox({ x: 10, y: 0, w: 6, h: 3 }, 3, 2, blocked);
  assert.ok(Math.abs(s.x - 13) < 1e-9 && Math.abs(s.y - 2) < 1e-9);
  // the player can't walk through the tree line
  const w = freshWorld();
  for (let i = 0; i < 400; i++) w.update({ dx: -1 });
  assert.ok(w.player.x > 8 * TILE, 'walked into the forest');
  assert.ok(!w.blocked(playerBox(w.player.x, w.player.y)));
});

// walk toward a point until there or stuck
function walkTo(w, tx, ty, max = 2000) {
  const events = [];
  for (let i = 0; i < max; i++) {
    const dx = Math.abs(tx - w.player.x) > 1 ? Math.sign(tx - w.player.x) : 0;
    const dy = Math.abs(ty - w.player.y) > 1 ? Math.sign(ty - w.player.y) : 0;
    if (!dx && !dy) break;
    events.push(...w.update({ dx, dy }));
    if (events.some(e => e.type === 'exit')) break;
  }
  return events;
}

test('world: walking into a door fires one exit; it re-arms only after you step off it', () => {
  const w = freshWorld('forest_path', 'house_door');
  const ev = walkTo(w, w.player.x, w.player.y - 10);
  const exits = ev.filter(e => e.type === 'exit');
  assert.equal(exits.length, 1);
  assert.equal(exits[0].exit.to, 'station_hall');
  // still standing in it: no more exits
  for (let i = 0; i < 30; i++) assert.ok(!w.update({}).some(e => e.type === 'exit'));
});

test('world: room transitions round-trip through every exit', () => {
  for (const [id, r] of Object.entries(ROOMS)) for (const ex of r.exits) {
    const w = freshWorld(ex.to, ex.spawn);
    assert.equal(w.state.room, ex.to);
    assert.ok(w.state.visited.has(ex.to));
  }
});

test('world: interaction picks the faced object and advances its script', () => {
  const w = freshWorld('forest_path', 'start');
  // face the gate from just below it
  w.player.x = 15 * TILE; w.player.y = 4.6 * TILE; w.player.facing = 'up';
  w.cooldown = 0;
  assert.equal(w.target()?.id, 'gate');
  const say = () => { w.cooldown = 0; return w.update({ interact: true }).find(e => e.type === 'interact'); };
  const a = say(), b = say(), c = say(), d = say();
  assert.match(a.lines[0], /road gate/);
  assert.match(b.lines[0], /^Locked\. The town/);
  assert.deepEqual(c.lines, ['Locked.']);
  assert.deepEqual(d.lines, ['Locked.']);
  assert.ok(w.state.flags.has('saw_gate') && w.state.flags.has('looked:gate'));
  assert.equal(w.state.counts.gate, 4);
  // walking off and turning away loses the target
  w.player.y = 8 * TILE; w.player.facing = 'down';
  assert.equal(w.target(), null);
});

test('world: lighting the shrine sets a flag, saves, and adds a light that stays', () => {
  const w = freshWorld('shrine', 'from_path');
  const candles = w.props().find(p => p.id === 'candles');
  w.player.x = candles.px + 7; w.player.y = candles.py + 16; w.player.facing = 'up';
  w.cooldown = 0;
  const lightsBefore = w.lights().length;
  const e = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.equal(e.id, 'candles');
  assert.ok(e.save && e.flash === 'red' && e.sfx === 'candle');
  assert.ok(w.state.flags.has('shrine_lit'));
  assert.equal(w.lights().length, lightsBefore + 1);
  assert.equal(w.props().find(p => p.id === 'candles').sprite, 'candles_lit');
  w.cooldown = 0;
  const again = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.match(again.lines[0], /without getting any shorter/);
  assert.ok(again.save);
});

test('world: the cot is warm, then cold after you leave and come back', () => {
  const w = freshWorld('store_room', 'from_hall');
  const cot = w.props().find(p => p.id === 'cot');
  const touch = () => {
    w.player.x = cot.px + 16; w.player.y = cot.py + 1; w.player.facing = 'down'; w.cooldown = 0;
    return w.update({ interact: true }).find(e => e.type === 'interact');
  };
  assert.match(touch().lines[1], /still warm/);
  assert.match(touch().lines[0], /Still warm/);
  w.enter('station_hall', 'from_store');
  w.enter('store_room', 'from_hall');
  assert.ok(w.state.flags.has('cot_cold'));
  assert.match(touch().lines[0], /cold now/);
  assert.deepEqual(touch().lines, ['Cold.']);
});

test('world: triggers fire on entry and re-arm only after you leave the zone', () => {
  const w = freshWorld('forest_path', 'start');
  const ev = walkTo(w, w.player.x, 55.5 * TILE);
  const says = ev.filter(e => e.type === 'say' && e.id === 'south_road');
  assert.equal(says.length, 1);
  assert.match(says[0].lines[0], /twelve miles/);
  walkTo(w, w.player.x, 52 * TILE);
  const again = walkTo(w, w.player.x, 55.5 * TILE).filter(e => e.id === 'south_road');
  assert.deepEqual(again[0].lines, ['Twelve miles.']);
});

test('world: footsteps report the surface underfoot', () => {
  const w = freshWorld('station_hall', 'from_outside');
  const steps = [];
  for (let i = 0; i < 60; i++) steps.push(...w.update({ dy: -1 }).filter(e => e.type === 'step'));
  assert.ok(steps.length >= 2);
  assert.ok(steps.every(s => s.surface === 'wood'));
});

test('scripts: conditions on flags and counts', () => {
  const s = newRunState();
  const script = [
    { when: { all: ['a'], none: ['b'] }, say: ['A'] },
    { when: { minTimes: 2 }, say: ['many'] },
    { say: ['default'], set: ['x'] },
  ];
  assert.deepEqual(runScript(script, s, 'k').lines, ['default']);
  assert.ok(s.flags.has('x'));
  s.flags.add('a');
  assert.deepEqual(runScript(script, s, 'k').lines, ['A']);
  s.flags.add('b');
  assert.deepEqual(runScript(script, s, 'k').lines, ['many']);
  assert.equal(pickVariant(null, s, 'k'), null);
});

test('lighting: darkness away from lights, colour near them', () => {
  const f = new Frame(64, 64);
  f.clear(7);
  applyLighting(f, [{ x: 10, y: 10, r: 20 }], 0);
  assert.equal(f.get(10, 10), 7);
  assert.equal(f.get(60, 60), 0);
  const g = new Frame(64, 64); g.clear(7);
  applyLighting(g, [], 1);
  assert.ok(g.px.every(c => c === 7));
});

test('textbox: long lines are paginated to fit the box', () => {
  const pages = paginate(['short', 'x '.repeat(200), '[ system ]']);
  assert.equal(pages[0].rows.length, 1);
  assert.ok(pages.every(p => p.rows.length <= 4 && p.rows.every(r => r.length <= 38)));
  assert.ok(pages[pages.length - 1].system);
});

test('input: actions, presses, remapping', () => {
  const i = new Input();
  i.keyDown('KeyW');
  assert.ok(i.pressed('up') && i.held('up'));
  i.endFrame();
  assert.ok(!i.pressed('up') && i.held('up'));
  assert.deepEqual(i.axis(), { dx: 0, dy: -1 });
  i.keyUp('KeyW');
  i.setBindings({ ...DEFAULT_BINDINGS, interact: ['KeyF'] });
  i.keyDown('KeyF');
  assert.ok(i.pressed('interact'));
  i.clearAll();
  assert.ok(!i.held('interact'));
});

test('storage: settings and saves are separate; corrupt data falls back safely', () => {
  const mem = ST.memoryStorage();
  const store = new ST.Store(mem);
  assert.deepEqual(store.loadSettings(), ST.DEFAULT_SETTINGS);
  store.saveSettings({ ...ST.DEFAULT_SETTINGS, music: 0.3, textSpeed: 'fast', master: 7 });
  const s = store.loadSettings();
  assert.equal(s.music, 0.3); assert.equal(s.textSpeed, 'fast'); assert.equal(s.master, 1);
  assert.equal(store.loadGame(), null);
  const st = newRunState(); st.flags.add('shrine_lit'); st.counts.gate = 2;
  assert.ok(store.saveGame(saveFromState(st, { x: 10, y: 20, facing: 'left' })));
  const back = stateFromSave(store.loadGame());
  assert.ok(back.flags.has('shrine_lit')); assert.equal(back.counts.gate, 2); assert.equal(back.pos.facing, 'left');
  store.clearGame();
  assert.equal(store.loadGame(), null);
  assert.equal(store.loadSettings().music, 0.3, 'clearing the save touched settings');
  mem.setItem(ST.KEYS.save, '{not json'); mem.setItem(ST.KEYS.settings, '[]');
  assert.equal(store.loadGame(), null);
  assert.deepEqual(store.loadSettings(), ST.DEFAULT_SETTINGS);
  mem.setItem(ST.KEYS.save, JSON.stringify({ v: 99, room: 'x', x: 1, y: 1 }));
  assert.equal(store.loadGame(), null, 'accepted a save from another version');
  // storage that throws (private mode) never crashes the game
  const broken = new ST.Store({ getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } });
  assert.equal(broken.loadGame(), null);
  assert.equal(broken.saveGame({ room: 'a', x: 1, y: 1 }), false);
  broken.clearGame();
});

// ---- whole-app flows, headless -----------------------------------------------------------

function harness(storage = ST.memoryStorage()) {
  const app = new App({ store: new ST.Store(storage) });
  app.push(new BootScene(app));
  const run = n => { for (let i = 0; i < n; i++) { app.update(); app.render(); } };
  const tap = (code, n = 70) => { app.input.keyDown(code); run(1); app.input.keyUp(code); run(n); };
  const hold = (code, n) => { app.input.keyDown(code); run(n); app.input.keyUp(code); run(1); };
  const stack = () => app.scenes.map(s => s.constructor.name).join('>');
  // close whatever message is on screen
  const dismiss = () => { for (let i = 0; i < 20 && app.top?.text?.active; i++) tap('KeyE', 6); };
  return { app, run, tap, hold, stack, storage, dismiss };
}

test('flow: boot, title, new game, intro, play; pause and resume keep the game intact', () => {
  const h = harness();
  h.run(30); h.tap('Space');
  assert.equal(h.stack(), 'TitleScene');
  const cont = h.app.top.menu.items[1];
  assert.equal(h.app.top.menu.enabled(cont), false, 'Continue enabled with no save');
  h.tap('Enter', 90);
  assert.equal(h.stack(), 'CalibrateScene', 'a new game should start by calibrating the dark');
  h.tap('ArrowRight', 2);
  assert.equal(h.app.settings.brightness, 0.6);
  h.tap('Enter', 90);
  assert.equal(h.stack(), 'IntroScene');
  assert.ok(h.app.settings.calibrated);
  h.tap('Escape', 90);
  assert.equal(h.stack(), 'PlayScene');
  const play = h.app.top;
  assert.ok(h.app.store.hasGame(), 'no checkpoint at the start');
  assert.ok(play.text.active, 'the opening hint should be showing');
  h.dismiss();
  h.hold('KeyW', 120);
  const pos = { ...play.world.player };
  h.tap('Escape', 5);
  assert.equal(h.stack(), 'PlayScene>PauseScene');
  h.run(200); // time passes while paused...
  assert.equal(play.world.player.y, pos.y);
  h.tap('Escape', 5);
  assert.equal(h.stack(), 'PlayScene');
  h.hold('KeyW', 30);
  assert.ok(play.world.player.y < pos.y, 'could not move after resuming');
});

test('flow: entering a building and coming back out, with autosave on each room', () => {
  const h = harness();
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Enter', 90); h.tap('Escape', 90); h.dismiss();
  const play = h.app.top, w = play.world;
  // teleport to the station door and walk in
  w.enter('forest_path', 'house_door');
  h.hold('KeyW', 30); h.run(80);
  assert.equal(w.state.room, 'station_hall');
  assert.equal(h.app.store.loadGame().room, 'station_hall');
  h.hold('KeyS', 40); h.run(80);
  assert.equal(w.state.room, 'forest_path');
});

test('flow: quit to title saves; continue restores room, position and flags; new game keeps settings', () => {
  const h = harness();
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Enter', 90); h.tap('Escape', 90);
  let play = h.app.top;
  play.world.enter('shrine', 'from_path');
  play.state.flags.add('shrine_lit');
  const at = { x: play.world.player.x, y: play.world.player.y };
  h.app.settings.music = 0.2; h.app.saveSettings();
  h.tap('Escape', 5);            // pause
  h.tap('ArrowDown', 2); h.tap('ArrowDown', 2); h.tap('Enter', 5); // Save & quit
  h.tap('ArrowDown', 2); h.tap('Enter', 90);                       // Yes
  assert.equal(h.stack(), 'TitleScene');
  assert.equal(h.app.top.menu.index, 1, 'Continue should be selected when a save exists');
  h.tap('Enter', 90);
  assert.equal(h.stack(), 'PlayScene');
  play = h.app.top;
  assert.equal(play.state.room, 'shrine');
  assert.deepEqual({ x: play.world.player.x, y: play.world.player.y }, at);
  assert.ok(play.state.flags.has('shrine_lit'));
  // back out and start over
  h.tap('Escape', 5); h.tap('ArrowDown', 2); h.tap('ArrowDown', 2); h.tap('Enter', 5); h.tap('ArrowDown', 2); h.tap('Enter', 90);
  h.tap('ArrowUp', 2); h.tap('Enter', 5);
  assert.equal(h.stack(), 'TitleScene>ConfirmScene');
  h.tap('ArrowDown', 2); h.tap('Enter', 90); h.tap('Enter', 90); h.tap('Escape', 90);
  assert.equal(h.stack(), 'PlayScene');
  assert.equal(h.app.top.state.room, 'forest_path');
  assert.ok(!h.app.top.state.flags.has('shrine_lit'), 'flags survived a new game');
  assert.equal(new ST.Store(h.storage).loadSettings().music, 0.2, 'new game reset settings');
});

test('flow: settings menu changes and persists values', () => {
  const h = harness();
  h.run(30); h.tap('Space');
  h.tap('ArrowDown', 2); h.tap('Enter', 5); // Continue is disabled and skipped
  assert.equal(h.stack(), 'TitleScene>SettingsScene');
  h.tap('ArrowLeft', 2); h.tap('ArrowLeft', 2);
  assert.equal(h.app.settings.master, 0.6);
  for (let i = 0; i < 5; i++) h.tap('ArrowDown', 2);
  h.tap('ArrowRight', 2);
  assert.equal(h.app.settings.reduceFlashing, true);
  h.tap('Escape', 5);
  assert.equal(h.stack(), 'TitleScene');
  const saved = new ST.Store(h.storage).loadSettings();
  assert.equal(saved.master, 0.6); assert.equal(saved.reduceFlashing, true);
});

test('flow: a remapped key moves the player', () => {
  const h = harness();
  h.app.settings.bindings.up = ['KeyI']; h.app.settings.bindings.inventory = ['Tab']; h.app.saveSettings();
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Enter', 90); h.tap('Escape', 90); h.dismiss();
  const p = h.app.top.world.player, y0 = p.y;
  h.hold('KeyI', 40);
  assert.ok(p.y < y0);
});

// ==== stages 2-5: relic, enemies, story, dialogue, documents, map ===========================

const { ITEMS } = await load('game/items.js');
const { DOCS, NOTES } = await load('game/docs.js');
const { TAPES, tapeLines } = await load('game/tapes.js');
const { DIALOGUES, entryNode, enterNode, choose } = await load('game/dialogue.js');
const { RELIC, TYPES, inCone, angleDiff } = await load('game/entities.js');
const { PORTRAITS, ICONS } = await load('game/art.js');
const { itemAction, mapLayout } = await load('scenes/inventory.js');
const { MAX_HP } = await load('game/state.js');

const allScripts = () => Object.entries(ROOMS).flatMap(([rid, r]) => [
  ...scriptsOf(r).map(([id, s]) => [rid + '.' + id, s]),
  ...(r.exits || []).filter(e => e.lock?.locked).map(e => [rid + '.lock', e.lock.locked]),
  ...(r.onEnter || []).map(e => [rid + '.onEnter', [e]]),
]);
const dialogueNodes = () => Object.entries(DIALOGUES).flatMap(([d, dl]) => Object.entries(dl.nodes).map(([n, node]) => [d, n, node]));

test('data: every item, document, note, tape, dialogue and sprite a script mentions exists', () => {
  const list = v => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
  const check = (where, v) => {
    for (const i of [...list(v.give), ...list(v.take), ...list(v.when?.has), ...list(v.when?.lacks)]) assert.ok(ITEMS[i], `${where}: no item ${i}`);
    for (const n of list(v.note)) assert.ok(NOTES[n], `${where}: no note ${n}`);
    if (v.doc) assert.ok(DOCS[v.doc], `${where}: no document ${v.doc}`);
    if (v.tape) assert.ok(TAPES[v.tape], `${where}: no tape ${v.tape}`);
    if (v.talk) assert.ok(DIALOGUES[v.talk], `${where}: no dialogue ${v.talk}`);
    if (v.go) assert.ok(ROOMS[v.go.to]?.spawns[v.go.spawn], `${where}: go to nowhere`);
  };
  for (const [where, s] of allScripts()) for (const v of s) check(where, v);
  for (const [d, n, node] of dialogueNodes()) { check(`${d}.${n}`, node); for (const c of node.choices || []) check(`${d}.${n}`, c); }
  for (const r of Object.values(ROOMS)) for (const e of r.exits) if (e.lock?.key) assert.ok(ITEMS[e.lock.key]);
  for (const it of Object.values(ITEMS)) {
    assert.ok(ICONS[it.icon], `${it.name}: no icon`);
    if (it.doc) assert.ok(DOCS[it.doc]);
    if (it.tape) assert.ok(TAPES[it.tape]);
  }
  for (const r of Object.values(ROOMS)) for (const e of r.entities || []) assert.ok(TYPES[e.type], `unknown entity ${e.type}`);
});

test('text fits: document lines, dialogue choices and speakers', () => {
  for (const [id, d] of Object.entries(DOCS)) for (const page of d.pages) {
    assert.ok(page.length <= 14, `${id}: page too long`);
    for (const l of page) assert.ok((typeof l === 'string' ? l : l.s).length <= 32, `${id}: "${typeof l === 'string' ? l : l.s}"`);
  }
  for (const [d, n, node] of dialogueNodes()) {
    for (const c of node.choices || []) assert.ok(c.text.length <= 32, `${d}.${n}: choice "${c.text}" too long`);
    for (const l of node.lines) assert.ok(l.who === null || l.who === 'Elias' || PORTRAITS[l.who], `${d}.${n}: no portrait for ${l.who}`);
  }
});

test('dialogue: every node is reachable, every link resolves, and every path ends', () => {
  for (const [id, d] of Object.entries(DIALOGUES)) {
    const seen = new Set();
    const q = d.entry.map(e => e.node);
    while (q.length) {
      const n = q.pop();
      if (seen.has(n)) continue;
      assert.ok(d.nodes[n], `${id}: missing node ${n}`);
      seen.add(n);
      const node = d.nodes[n];
      if (node.next) q.push(node.next);
      for (const c of node.choices || []) if (c.goto) q.push(c.goto);
      assert.ok(node.end || node.next || node.choices?.length, `${id}.${n} leads nowhere and isn't marked as an end`);
      assert.ok(!(node.end && node.choices), `${id}.${n}: an end with choices`);
    }
    assert.deepEqual([...seen].sort(), Object.keys(d.nodes).sort(), `${id}: unreachable nodes`);
  }
});

// walk a conversation, always taking choice `pick(choices)`; returns nodes visited
function converse(id, state, pick = cs => cs.length - 1, max = 40) {
  const path = [];
  let node = entryNode(id, state);
  while (node && path.length < max) {
    path.push(node);
    const view = enterNode(id, node, state);
    if (view.choices.length) node = choose(id, node, view.choices[pick(view.choices)].i, state);
    else node = view.next;
  }
  assert.ok(path.length < max, `${id} never ended`);
  return path;
}

test('dialogue: Ruth only hands over the keys once you have read Mara\'s page', () => {
  const s = newRunState();
  const keyChoice = cs => Math.max(0, cs.findIndex(c => /key/.test(c.text)));
  converse('ruth', s, cs => cs.length - 1);
  assert.ok(s.flags.has('met_ruth'));
  const menu = enterNode('ruth', 'menu', s);
  assert.ok(!menu.choices.some(c => /key/.test(c.text)), 'key offered before reading the notebook');
  s.flags.add('read:notebook');
  const path = converse('ruth', s, cs => (cs.some(c => /key/.test(c.text)) ? keyChoice(cs) : cs.length - 1));
  assert.ok(path.includes('keys'));
  assert.ok(s.items.includes('key_ring'));
  // asked once, the question is gone and the keys aren't handed over twice
  assert.ok(!enterNode('ruth', 'menu', s).choices.some(c => /key/.test(c.text)));
  assert.equal(s.items.filter(i => i === 'key_ring').length, 1);
  assert.equal(entryNode('ruth', s), 'again');
});

test('dialogue: discoveries open new questions, and accounts go in the journal', () => {
  const s = newRunState();
  const texts = () => enterNode('cal', 'menu', s).choices.map(c => c.text);
  assert.ok(!texts().some(t => /notebook/.test(t)));
  converse('cal', s, cs => (s.notes.includes('account_cal') ? cs.length - 1 : 0)); // ask about Mara once, then leave
  s.flags.add('read:notebook');
  assert.ok(texts().some(t => /notebook/.test(t)));
  assert.ok(s.notes.includes('account_cal'));
  const r = newRunState();
  converse('ruth', r, cs => (cs[0].text.startsWith("I'm looking") && !r.notes.includes('account_ruth') ? 0 : cs.length - 1));
  assert.ok(r.notes.includes('account_ruth'));
  // the photograph question only after looking at the photograph; asked once
  r.flags.add('looked:photo');
  const path = converse('ruth', r, cs => Math.max(0, cs.findIndex(c => /scratched/.test(c.text))));
  assert.ok(path.includes('photo'));
  assert.ok(!enterNode('ruth', 'menu', r).choices.some(c => /scratched/.test(c.text)));
});

test('dialogue: the phone call stops the ringing; Father Price leaves after one conversation', () => {
  const s = newRunState();
  s.flags.add('phone_ringing');
  converse('phone', s);
  assert.ok(s.flags.has('phone_answered') && !s.flags.has('phone_ringing'));
  for (const pick of [0, 1, 2]) {
    const p = newRunState();
    converse('price', p, cs => Math.min(pick, cs.length - 1));
    assert.ok(p.flags.has('met_price'), `choice ${pick} left him standing there`);
    const w = new World(p); w.enter('oran_lane', 'from_row');
    assert.ok(!w.props().some(pr => pr.id === 'price'));
    assert.ok(w.props().some(pr => pr.id === 'cigarette'));
  }
});

test('tapes: the recording changes on later plays and then settles', () => {
  const a = tapeLines('mara', 0), b = tapeLines('mara', 1), c = tapeLines('mara', 2), d = tapeLines('mara', 9);
  assert.equal(a.length, TAPES.mara.lines.length);
  assert.notDeepEqual(a, b);
  assert.notDeepEqual(b, c);
  assert.deepEqual(c, d);
  assert.ok(a.some(l => /Four\. One\. Seven\. Three\./.test(l.text)));
});

// ---- the relic and the things it touches --------------------------------------------------

function arena(type, { equip = true, dist = 30, room = 'woods', spawn = 'from_shrine' } = {}) {
  const s = newRunState();
  s.flags.add('dead:woods_hollow'); s.flags.add('dead:woods_watcher');
  if (equip) s.equipped = 'crucifix';
  const w = new World(s); w.enter(room, spawn);
  w.player.facing = 'up';
  const e = { id: 'test_' + type, type, x: w.player.x, y: w.player.y - dist, homeX: w.player.x, homeY: w.player.y - dist, hp: TYPES[type].hp || 1, state: 'idle', t: 0, stun: 0, hurtT: 0, side: 1, cueT: 0, anim: 0, alive: true };
  w.entities = [e];
  return { w, s, e };
}
const raise = (w, aim = -Math.PI / 2) => { w.player.relic.cool = 0; w.player.relic.active = 0; return w.update({ relic: true, aim }); };

test('relic: a cone with a direction and a limited reach', () => {
  assert.ok(inCone(0, 0, 0, 30, 5));
  assert.ok(!inCone(0, 0, 0, -30, 0), 'behind');
  assert.ok(!inCone(0, 0, 0, RELIC.range + 2, 0), 'too far');
  assert.ok(!inCone(0, 0, 0, 20, 20), 'too wide');
  assert.ok(Math.abs(angleDiff(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-9);
});

test('relic: has to be in hand, not usable everywhere, and has a cooldown', () => {
  const { w } = arena('hollow', { equip: false });
  const ev = w.update({ relic: true });
  assert.ok(ev.some(e => e.type === 'say' && /pockets/.test(e.lines[0])), 'no hint about equipping');
  assert.equal(w.player.relic.active, 0);
  const r = newRunState(); r.equipped = 'crucifix';
  const home = new World(r); home.enter('ruth_house', 'from_row');
  assert.ok(home.update({ relic: true }).some(e => e.type === 'say' && /Not in her house/.test(e.lines[0])));
  assert.equal(home.player.relic.active, 0);
  const { w: w2 } = arena('hollow');
  assert.ok(w2.update({ relic: true, aim: 0 }).some(e => e.type === 'relic'));
  assert.equal(w2.player.facing, 'right', 'raising it should turn you toward the aim');
  for (let i = 0; i < RELIC.active + 5; i++) assert.ok(!w2.update({ relic: true }).some(e => e.type === 'relic'), 'raised again during cooldown');
});

test('hollow: repelled by the relic, unmade on the third, and it stays gone', () => {
  const { w, s, e } = arena('hollow');
  const hits = [];
  for (let k = 0; k < 3; k++) {
    e.x = w.player.x; e.y = w.player.y - 30; e.state = 'stalk';
    hits.push(...raise(w).filter(ev => ev.type === 'hit'));
  }
  assert.deepEqual(hits.map(h => h.effect), ['repelled', 'repelled', 'unmade']);
  assert.ok(s.flags.has('dead:' + e.id));
  for (let i = 0; i < 80; i++) w.update({});
  assert.equal(w.entities.length, 0);
  assert.ok(s.remains[e.id] && s.remains[e.id].room === 'woods');
  assert.ok(w.props().some(p => p.sprite === 'ash'), 'nothing left where it fell');
});

test('hollow: missing it with the relic does nothing; it flees after a hit', () => {
  const { w, e } = arena('hollow');
  raise(w, Math.PI / 2); // facing the wrong way
  assert.equal(e.hp, 3);
  e.x = w.player.x; e.y = w.player.y - 30;
  raise(w);
  assert.equal(e.state, 'flee');
  const d0 = Math.hypot(e.x - w.player.x, e.y - w.player.y);
  for (let i = 0; i < 30; i++) w.update({});
  assert.ok(Math.hypot(e.x - w.player.x, e.y - w.player.y) > d0, 'did not back away');
});

test('hollow: comes straight at you, but circles when you face it with the cross in hand', () => {
  const chase = arena('hollow', { equip: false, dist: 60 });
  for (let i = 0; i < 40; i++) chase.w.update({});
  assert.ok(Math.hypot(chase.e.x - chase.w.player.x, chase.e.y - chase.w.player.y) < 60 - 10, 'it should close in');
  const faced = arena('hollow', { equip: true, dist: 50 });
  for (let i = 0; i < 40; i++) faced.w.update({ aim: -Math.PI / 2 });
  assert.equal(faced.e.state, 'circle');
  assert.ok(Math.hypot(faced.e.x - faced.w.player.x, faced.e.y - faced.w.player.y) > 38, 'it walked straight in');
});

test('hollow: touching it hurts; you get a moment of grace; enough of it kills you', () => {
  const { w, s, e } = arena('hollow', { equip: false, dist: 2 });
  const ev = w.update({});
  assert.ok(ev.some(x => x.type === 'hurt'));
  assert.equal(s.hp, MAX_HP - 1);
  e.x = w.player.x; e.y = w.player.y; e.state = 'stalk';
  w.update({});
  assert.equal(s.hp, MAX_HP - 1, 'hurt again while invulnerable');
  const deaths = [];
  for (let k = 0; k < 4 && !w.player.dead; k++) {
    w.player.inv = 0; e.x = w.player.x; e.y = w.player.y; e.state = 'stalk';
    deaths.push(...w.update({}).filter(x => x.type === 'death'));
  }
  assert.equal(s.hp, 0);
  assert.equal(deaths.length, 1);
  assert.ok(w.player.dead);
  assert.deepEqual(w.update({ dx: 1 }), [], 'the dead keep walking');
});

test('shade: only moves while you are not looking at it; the relic stuns it but never kills it', () => {
  const { w, e } = arena('shade', { equip: true, dist: 80 });
  const y0 = e.y;
  for (let i = 0; i < 60; i++) w.update({ aim: -Math.PI / 2 }); // looking straight at it
  assert.equal(e.y, y0, 'moved while watched');
  w.player.facing = 'down';
  for (let i = 0; i < 60; i++) w.update({});
  assert.ok(e.y > y0 + 10, 'did not come while your back was turned');
  e.y = w.player.y - 30; e.x = w.player.x; w.player.facing = 'up';
  const hit = raise(w).find(x => x.type === 'hit');
  assert.equal(hit.effect, 'stunned');
  w.player.facing = 'down';
  const y1 = e.y;
  for (let i = 0; i < 100; i++) w.update({});
  assert.equal(e.y, y1, 'moved while stunned');
  for (let k = 0; k < 5; k++) { e.stun = 0; e.x = w.player.x; e.y = w.player.y - 30; raise(w); }
  assert.ok(e.alive && !w.state.flags.has('dead:' + e.id));
});

test('shade: walks through walls', () => {
  const { w, e } = arena('shade', { equip: false, dist: 0 });
  e.x = w.player.x - 40; e.y = w.player.y - 6; // inside the tree line
  w.player.facing = 'right';
  const x0 = e.x;
  for (let i = 0; i < 30; i++) w.update({});
  assert.ok(e.x > x0 + 5);
});

test('penitent: blocks the alcove, ignores the relic, and rises when it hears the tape', () => {
  const s = newRunState(); s.equipped = 'crucifix'; s.flags.add('dead:pass_hollow');
  const w = new World(s); w.enter('passages', 'from_cellar');
  const pen = w.entities.find(e => e.type === 'penitent');
  assert.ok(pen);
  const page = w.props().find(p => p.id === 'page2');
  const pts = reach(w);
  assert.ok(!pts.some(([x, y]) => ['up', 'down', 'left', 'right'].some(f => overlaps(probeBox(x, y, f), page.zoneRect))), 'the page can be reached past the kneeler');
  w.player.x = pen.x; w.player.y = pen.y - 20; w.player.facing = 'down';
  const hit = raise(w, Math.PI / 2).find(e => e.type === 'hit');
  assert.equal(hit.effect, 'ignored');
  assert.equal(w.target()?.id, 'penitent', 'you can look at it');
  const heard = w.playedTape('mara');
  assert.ok(heard.length === 1 && pen.state === 'rising');
  let released = [];
  for (let i = 0; i < 100; i++) released.push(...w.update({}).filter(e => e.type === 'released'));
  assert.equal(released.length, 1);
  assert.ok(s.flags.has('dead:kneeler'));
  const after = reach(w);
  assert.ok(after.some(([x, y]) => ['up', 'down', 'left', 'right'].some(f => overlaps(probeBox(x, y, f), page.zoneRect))), 'still blocked after it left');
});

test('penitent: a tape played far away does nothing', () => {
  const s = newRunState();
  const w = new World(s); w.enter('passages', 'from_cellar');
  assert.equal(w.playedTape('mara').length, 0);
});

test('watcher: gone when you get close, leaving footprints behind', () => {
  const s = newRunState(); s.flags.add('dead:woods_hollow');
  const w = new World(s); w.enter('woods', 'from_row');
  assert.ok(w.entities.some(e => e.type === 'watcher'));
  assert.ok(!w.props().some(p => p.id === 'frost_prints'));
  const ev = [];
  for (let i = 0; i < 30; i++) ev.push(...w.update({ dx: 1 }));
  assert.ok(ev.some(e => e.type === 'vanished'));
  assert.ok(!w.entities.some(e => e.type === 'watcher'));
  assert.ok(w.props().some(p => p.id === 'frost_prints'));
  w.enter('woods', 'from_row');
  assert.ok(!w.entities.some(e => e.type === 'watcher'), 'came back');
});

// ---- locks, keys and the order of things -------------------------------------------------

test('locks: a locked exit stays shut without its key, and opens (once) with it', () => {
  const s = newRunState();
  const w = new World(s); w.enter('oran_lane', 'from_cemetery');
  const ex = w.exits().find(e => e.to === 'cemetery');
  const shut = w.tryExit(ex);
  assert.equal(shut[0].type, 'say');
  assert.ok(!shut[0].after);
  s.items.push('cemetery_key');
  const open = w.tryExit(ex);
  assert.equal(open[0].sfx, 'unlock');
  assert.equal(open[0].after.type, 'exit');
  assert.ok(s.flags.has('cemetery_open'));
  assert.equal(w.tryExit(ex)[0].type, 'exit');
  // a bolt with no key can only be drawn from its own side
  const nave = new World(newRunState()); nave.enter('passages', 'from_cellar');
  assert.ok(!nave.tryExit(nave.exits().find(e => e.to === 'chapel_nave'))[0].after);
});

test('overrides: unchaining the road gate opens the tiles and the way to town', () => {
  const s = newRunState();
  const w = new World(s); w.enter('forest_path', 'start');
  const gateBox = playerBox(15 * TILE, 3.5 * TILE);
  assert.ok(w.blocked(gateBox));
  w.player.x = 15 * TILE; w.player.y = 4.6 * TILE; w.player.facing = 'up'; w.cooldown = 0;
  let ev = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.ok(!s.flags.has('gate_open'));
  s.items.push('key_ring'); w.cooldown = 0;
  ev = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.match(ev.lines[0], /third one fits/);
  assert.ok(s.flags.has('gate_open'));
  assert.ok(!w.blocked(gateBox));
  const exits = walkTo(w, 15 * TILE, 0.5 * TILE).filter(e => e.type === 'exit');
  assert.equal(exits[0]?.exit.to, 'mill_row');
});

// interact with a prop from wherever the player can reach it
function use(w, id) {
  const pr = w.props().find(p => p.id === id);
  assert.ok(pr, `no ${id} in ${w.state.room}`);
  for (const [x, y] of reach(w)) for (const f of ['up', 'down', 'left', 'right']) {
    if (!overlaps(probeBox(x, y, f), pr.zoneRect)) continue;
    w.player.x = x; w.player.y = y; w.player.facing = f;
    if (w.target()?.id !== id) continue;
    w.cooldown = 0;
    return w.update({ interact: true }).find(e => e.type === 'interact');
  }
  assert.fail(`could not reach ${id} in ${w.state.room}`);
}

test('story: chapter one plays through from the car to the chapel and back underground', () => {
  const s = newRunState();
  const w = new World(s);
  const read = id => { s.flags.add('read:' + id); if (!s.notes.includes('doc:' + id)) s.notes.push('doc:' + id); };
  w.enter('forest_path', 'start');
  // the first major clue, under the cot at Halvorsen's
  w.enter('station_hall', 'from_outside'); w.enter('store_room', 'from_hall');
  const cot = use(w, 'cot');
  assert.equal(cot.doc, 'notebook');
  assert.ok(s.items.includes('notebook'));
  read('notebook');
  // the dead payphone rings once you've read it
  w.enter('station_hall', 'from_store');
  assert.ok(s.flags.has('phone_ringing'));
  assert.equal(use(w, 'payphone').talk, 'phone');
  converse('phone', s);
  // through the woods to Mill Row; Ruth gives Arne's keys
  w.enter('shrine', 'from_path'); w.enter('woods', 'from_shrine'); w.enter('mill_row', 'from_woods');
  w.enter('ruth_house', 'from_row');
  assert.equal(use(w, 'ruth').talk, 'ruth');
  converse('ruth', s, cs => Math.max(0, cs.findIndex(c => /key/.test(c.text))) || cs.length - 1);
  assert.ok(s.items.includes('key_ring'), 'no keys from Ruth');
  // the lane gate, and the road gate as a shortcut back to the car
  w.enter('mill_row', 'ruth_door');
  use(w, 'lane_gate'); assert.ok(s.flags.has('lane_open'));
  use(w, 'gate_north'); assert.ok(s.flags.has('gate_open'));
  assert.ok(!w.blocked(playerBox(20 * TILE, 2.5 * TILE)));
  // St. Oran's: the caretaker's stove, the burying ground, the urn
  w.enter('oran_lane', 'from_row');
  w.enter('caretaker_house', 'from_lane');
  assert.equal(use(w, 'desk').doc, 'maint_log');
  use(w, 'stove'); assert.ok(s.items.includes('cemetery_key'));
  w.enter('oran_lane', 'care_door');
  assert.equal(w.tryExit(w.exits().find(e => e.to === 'cemetery'))[0].after.type, 'exit');
  w.enter('cemetery', 'from_lane');
  use(w, 'urn'); assert.ok(s.items.includes('vestry_key'));
  w.enter('oran_lane', 'from_cemetery');
  assert.equal(w.tryExit(w.exits().find(e => e.to === 'chapel_nave'))[0].after.type, 'exit');
  // the chapel: evidence of the services, and the town changes behind you
  w.enter('chapel_nave', 'from_vestry');
  assert.ok(s.flags.has('nave_seen'));
  use(w, 'reel'); assert.ok(s.notes.includes('clue_below'));
  use(w, 'hymn_board'); assert.ok(s.notes.includes('clue_numbers'));
  use(w, 'bolt'); assert.ok(s.flags.has('undercroft_open'));
  // underground, the hatch to Halvorsen's makes a loop
  w.enter('passages', 'from_undercroft');
  const ladder = use(w, 'ladder');
  assert.ok(s.flags.has('hatch_open') && !ladder.go);
  assert.equal(use(w, 'ladder').go.to, 'store_room');
  w.enter('store_room', 'from_hatch');
  assert.equal(use(w, 'hatch').go.to, 'passages');
  // Ruth is gone now, and something is waiting on Mill Row
  w.enter('ruth_house', 'from_row');
  assert.ok(!w.props().some(p => p.id === 'ruth') && w.props().some(p => p.id === 'empty_chair'));
  w.enter('mill_row', 'ruth_door');
  assert.ok(w.entities.some(e => e.id === 'row_mimic' && e.looks === 'ruth'));
  assert.ok(!w.props().some(p => p.id === 'cal'));
  // every room has been seen
  for (const id of ['woods', 'mill_row', 'ruth_house', 'oran_lane', 'caretaker_house', 'cemetery', 'chapel_nave', 'passages', 'store_room']) assert.ok(s.visited.has(id), id);
});

test('story: no key item can be lost, and nothing on the main path is behind an optional step', () => {
  // keys are never taken back by any script
  const takes = allScripts().flatMap(([, s]) => s.flatMap(v => (Array.isArray(v.take) ? v.take : v.take ? [v.take] : [])));
  // the only things ever taken are laid on the altar at the very end
  assert.deepEqual([...new Set(takes)].sort(), ['holy_water', 'ribbon', 'votive']);
  // every locked exit's key is given somewhere
  const given = new Set([...allScripts().flatMap(([, s]) => s.flatMap(v => [].concat(v.give || []))), ...dialogueNodes().flatMap(([, , n]) => [].concat(n.give || []))]);
  for (const r of Object.values(ROOMS)) for (const e of r.exits) if (e.lock?.key) assert.ok(given.has(e.lock.key), `${e.lock.key} is never given`);
});

test('saves: items, the held relic, notes and remains survive a save', () => {
  const store = new ST.Store(ST.memoryStorage());
  const s = newRunState();
  s.items.push('key_ring'); s.equipped = 'crucifix'; s.notes.push('account_ruth'); s.remains.woods_hollow = { room: 'woods', x: 100, y: 200 }; s.hp = 1;
  store.saveGame(saveFromState(s, { x: 1, y: 2, facing: 'up' }));
  const back = stateFromSave(store.loadGame());
  assert.ok(back.items.includes('key_ring'));
  assert.equal(back.equipped, 'crucifix');
  assert.deepEqual(back.notes, ['account_ruth']);
  assert.deepEqual(back.remains.woods_hollow, { room: 'woods', x: 100, y: 200 });
  assert.equal(back.hp, MAX_HP, 'you wake up whole');
  // an old stage-1 save without items still loads, with the starting pockets
  const old = stateFromSave(ST.sanitizeSave({ v: 1, room: 'shrine', x: 20, y: 100, flags: ['shrine_lit'] }));
  assert.deepEqual(old.items, ['crucifix', 'mara_tape', 'lighter']);
});

test('pockets and map: actions per item; the map shows only where you have been', () => {
  const s = newRunState();
  assert.equal(itemAction(s, 'crucifix'), 'Hold');
  s.equipped = 'crucifix';
  assert.equal(itemAction(s, 'crucifix'), 'Put away');
  assert.equal(itemAction(s, 'mara_tape'), 'Play');
  assert.equal(itemAction(s, 'notebook'), 'Read');
  assert.equal(itemAction(s, 'lighter'), null);
  s.visited = new Set(['forest_path', 'shrine']);
  let m = mapLayout(s);
  assert.deepEqual(m.boxes.map(b => b.id).sort(), ['forest_path', 'shrine']);
  assert.equal(m.links.length, 1);
  s.visited.add('passages');
  m = mapLayout(s);
  assert.equal(m.links.length, 1, 'linked to a room you have not walked between');
  assert.ok(m.boxes.find(b => b.id === 'passages').under);
  // boxes never overlap
  s.visited = new Set(Object.keys(ROOMS));
  const all = [...mapLayout(s, 'above').boxes, ...mapLayout(s, 'deep').boxes].filter((b, i, arr) => arr.findIndex(o => o.id === b.id) === i);
  for (const layer of ['above', 'deep']) { const bs = mapLayout(s, layer).boxes; for (const a of bs) for (const b of bs) if (a !== b) assert.ok(!overlaps(a, b), `${a.id} overlaps ${b.id}`); }
  for (const b of all) assert.ok(b.x + b.w < 256 && b.y + b.h < 162 && b.y > 34);
});

test('textbox: choices appear after the last page and report the pick', () => {
  const app = { settings: { textSpeed: 'instant' }, sfx() {} };
  const tb = new TextBox(app);
  let picked = null;
  tb.open([{ who: 'Ruth', text: 'Well?' }], null, { choices: [{ text: 'A' }, { text: 'B' }], onChoice: i => { picked = i; } });
  const inp = new Input();
  const press = code => { inp.keyDown(code); tb.update(inp); inp.endFrame(); inp.keyUp(code); };
  tb.update(inp);
  assert.ok(tb.choosing);
  press('ArrowDown'); press('Enter');
  assert.equal(picked, 1);
  assert.ok(!tb.active);
  // a cut line moves on by itself
  let closed = false;
  tb.open([{ who: 'Ruth', text: 'There was never any-', cut: true }, 'after'], () => { closed = true; });
  for (let i = 0; i < 30; i++) { tb.update(inp); inp.endFrame(); }
  assert.equal(tb.page, 1);
  press('Enter');
  assert.ok(closed);
});

test('flow: pockets open with Tab, the crucifix can be held, and the map opens with M', () => {
  const h = harness();
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Enter', 90); h.tap('Escape', 90); h.dismiss();
  h.tap('Tab', 5);
  assert.equal(h.stack(), 'PlayScene>InventoryScene');
  h.tap('Enter', 5);
  assert.equal(h.app.scenes[0].state.equipped, 'crucifix');
  h.tap('ArrowRight', 3); h.tap('ArrowRight', 3);
  assert.equal(h.app.top.tab, 2);
  h.tap('Escape', 5);
  assert.equal(h.stack(), 'PlayScene');
  h.tap('KeyM', 5);
  assert.equal(h.app.top.tab, 2);
  h.tap('KeyM', 5);
  assert.equal(h.stack(), 'PlayScene');
  // raise it
  h.tap('Space', 2);
  assert.ok(h.app.top.world.player.relic.active > 0 || h.app.top.world.player.relic.cool > 0);
});

test('flow: playing the tape from the pockets, reading a page, talking with choices', () => {
  const h = harness();
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Enter', 90); h.tap('Escape', 90); h.dismiss();
  const play = h.app.top;
  h.tap('Tab', 5); h.tap('ArrowDown', 2); h.tap('Enter', 5);
  assert.equal(h.stack(), 'PlayScene>TapeScene');
  h.run(60 * 40);
  h.tap('KeyE', 5);
  assert.equal(h.stack(), 'PlayScene');
  assert.equal(play.state.counts['tape:mara'], 1);
  play.showDoc('notebook');
  assert.equal(h.stack(), 'PlayScene>DocumentScene');
  h.tap('KeyE', 3); h.tap('KeyE', 3);
  assert.equal(h.stack(), 'PlayScene');
  assert.ok(play.state.notes.includes('doc:notebook') && play.state.flags.has('read:notebook'));
  play.world.enter('ruth_house', 'from_row');
  play.talk('ruth');
  assert.ok(play.text.active);
  // walk through Ruth's greeting to her menu, ask for the key
  for (let i = 0; i < 12 && !play.text.choosing; i++) h.tap('KeyE', 3);
  assert.ok(play.text.choosing);
  const idx = play.text.choices.findIndex(c => /key/.test(c.text));
  assert.ok(idx >= 0);
  for (let i = 0; i < idx; i++) h.tap('ArrowDown', 2);
  h.tap('Enter', 3);
  for (let i = 0; i < 20 && !play.text.choosing; i++) h.tap('KeyE', 3);
  assert.ok(play.state.items.includes('key_ring'));
});

test('flow: dying shows the death screen; waking returns you to the last save', () => {
  const h = harness();
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Enter', 90); h.tap('Escape', 90); h.dismiss();
  const play = h.app.top;
  play.world.enter('woods', 'from_shrine'); play.checkpoint(false);
  play.state.hp = 1;
  const e = play.world.entities.find(x => x.type === 'hollow');
  e.x = play.world.player.x; e.y = play.world.player.y; e.state = 'stalk';
  h.run(120);
  assert.equal(h.stack(), 'GameOverScene');
  h.run(100); // the screen holds a moment before it takes input
  h.tap('Enter', 90);
  assert.equal(h.stack(), 'PlayScene');
  assert.equal(h.app.top.state.room, 'woods');
  assert.equal(h.app.top.state.hp, MAX_HP);
});

// ==== calibration and stages 6-10: horror events, puzzles, chapters, endings ================

const { palette32, gammaFor } = await load('engine/palette.js');
const { lightTuning } = await load('game/lighting.js');
const { BELL_ORDER, MAZE_PATH, solvePuzzle } = await load('game/puzzles.js');
const { ENDINGS, ENDING_IDS, endingsAvailable } = await load('game/endings.js');
const { CHAPTERS, chapterState, readMeta, reachChapter, recordEnding } = await load('game/chapters.js');

test('calibration: brightness lifts the dark colours, keeps black black, and widens the light', () => {
  const lum = w => (w & 255) + ((w >> 8) & 255) + ((w >> 16) & 255);
  const mid = palette32(PALETTE, gammaFor(0.5)), lo = palette32(PALETTE, gammaFor(0)), hi = palette32(PALETTE, gammaFor(1));
  assert.deepEqual([...mid], [...palette32()]);
  for (let c = 1; c < 16; c++) assert.ok(lum(hi[c]) >= lum(mid[c]) && lum(mid[c]) >= lum(lo[c]), `colour ${c}`);
  assert.equal(lum(hi[0]), 0, 'black lifted');
  assert.ok(lum(hi[1]) > lum(mid[1]) * 2, 'the darkest grey barely changes');
  assert.ok(lightTuning(1).radius > lightTuning(0).radius && lightTuning(1).ambient > lightTuning(0.5).ambient);
  assert.equal(lightTuning(0.5).ambient, 0);
  const s = ST.sanitizeSettings({ brightness: 4, calibrated: 'yes' });
  assert.equal(s.brightness, 1); assert.equal(s.calibrated, false);
});

// ---- horror events --------------------------------------------------------------------------

const tickN = (w, n, intent = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(...w.update(intent)); return out; };

test('events: they wait for the story, fire once, and come with their effects', () => {
  const s = newRunState();
  const w = new World(s);
  w.enter('station_hall', 'from_outside');
  assert.ok(!tickN(w, 80).some(e => e.type === 'horror'), 'fired before the chapel was seen');
  s.flags.add('nave_seen');
  w.enter('station_hall', 'from_outside');
  const ev = tickN(w, 80).filter(e => e.type === 'horror');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].id, 'station_slam');
  assert.equal(ev[0].sfx, 'door');
  assert.equal(ev[0].lights.mode, 'flicker');
  w.enter('station_hall', 'from_outside');
  assert.ok(!tickN(w, 80).some(e => e.type === 'horror'), 'fired twice');
  // and the cans have moved up onto the counter
  const cans = w.props().find(p => p.id === 'cans');
  assert.ok(cans.py < 4 * TILE);
});

test('events: something stands where the watcher stood, for a moment, when you come back', () => {
  const s = newRunState(); s.flags.add('dead:woods_watcher'); s.flags.add('dead:woods_hollow');
  const w = new World(s); w.enter('woods', 'from_shrine');
  const ev = tickN(w, 100).find(e => e.id === 'woods_return');
  assert.ok(ev && ev.figure.sprite === 'watcher' && ev.glitch > 0);
});

test('events: leaving and coming back changes rooms after a story beat', () => {
  const s = newRunState();
  const w = new World(s); w.enter('caretaker_cellar', 'from_house');
  assert.equal(w.props().find(p => p.id === 'chair_wall').sprite, 'chair_back');
  s.chapter = 2;
  w.enter('caretaker_cellar', 'from_house');
  assert.equal(w.props().find(p => p.id === 'chair_wall').sprite, 'chair_front');
  assert.ok(tickN(w, 20).some(e => e.id === 'chair_turned'));
});

test('mimic: wears a familiar shape, shows itself up close, rushes you; the relic sends it away', () => {
  const { w, s, e } = arena('mimic', { equip: false, dist: 70 });
  e.looks = 'ruth';
  tickN(w, 20);
  assert.equal(e.state, 'idle', 'it should stand still at a distance');
  e.y = w.player.y - 30;
  const ev = tickN(w, 2);
  assert.equal(e.state, 'reveal');
  assert.ok(ev.some(x => x.sfx === 'mimic_shriek'));
  let hurt = false;
  for (let i = 0; i < 120 && !hurt; i++) hurt = w.update({}).some(x => x.type === 'hurt');
  assert.ok(hurt, 'the rush never landed');
  const b = arena('mimic', { equip: true, dist: 30 });
  b.e.state = 'rush'; b.e.t = 100;
  const hit = raise(b.w).find(x => x.type === 'hit');
  assert.equal(hit.effect, 'unmasked');
  assert.ok(b.s.flags.has('dead:' + b.e.id));
});

test('edge figure: gone when you go near; the choir is slower than you and ignores the relic', () => {
  const ed = arena('edge', { dist: 30 });
  assert.ok(tickN(ed.w, 2).some(x => x.type === 'vanished'));
  const s = newRunState(); s.equipped = 'crucifix';
  const w = new World(s); w.enter('gallery', 'from_bells');
  assert.ok(w.update({ relic: true }).some(e => e.type === 'say' && /too many/.test(e.lines[0])));
  // walk into the pursuit and keep running
  const ev = [];
  for (let i = 0; i < 900 && s.room === 'gallery'; i++) {
    const out = w.update({ dx: 1 });
    ev.push(...out);
    if (out.some(e => e.type === 'exit')) break;
  }
  assert.ok(ev.some(e => e.id === 'pursuit'), 'no pursuit');
  assert.ok(ev.some(e => e.id === 'escape'), 'did not reach the far end');
  assert.ok(!ev.some(e => e.type === 'hurt'), 'caught while running flat out');
  assert.ok(s.flags.has('escaped'));
  // standing still is another matter
  const t = newRunState(); const w2 = new World(t); w2.enter('gallery', 'from_bells');
  for (let i = 0; i < 40; i++) w2.update({ dx: 1 });
  assert.ok(tickN(w2, 400).some(e => e.type === 'hurt'), 'the choir never reached a player who stopped');
});

// ---- puzzles ------------------------------------------------------------------------------

test('bells: the order is on the tape; a wrong bell resets the count and calls something up', () => {
  const tape = tapeLines('mara', 0).map(l => l.text).join(' ');
  const spoken = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
  const order = tape.match(/Four\. One\. Seven\. Three\./)[0].split('. ').map(w => spoken.indexOf(w.replace('.', '')) + 1);
  assert.deepEqual(order, BELL_ORDER);
  const s = newRunState();
  const w = new World(s); w.enter('bell_chamber', 'from_ossuary');
  const ring = n => use(w, 'bell_' + n);
  ring(4); ring(1);
  const bad = ring(2);
  assert.ok(/clangs/.test(bad.lines[0]));
  assert.equal(bad.spawn[0].type, 'hollow');
  assert.ok(w.entities.some(e => e.id === bad.spawn[0].id), 'nothing came');
  assert.equal(s.counts.bells_at, 0);
  w.entities = [];
  let last;
  for (const n of BELL_ORDER) last = ring(n);
  assert.ok(s.flags.has('bells_solved'));
  assert.equal(last.chapter, 3);
  assert.equal(s.chapter, 3);
  assert.ok(!w.blocked(playerBox(17 * TILE + 4, 7 * TILE)), 'the stair did not open');
  assert.ok(/done its work/.test(ring(2).lines[0]));
});

test('maze: Mara\'s page gives the way; a wrong arch puts you back at the start', () => {
  const text = DOCS.page3.pages[0].map(l => (typeof l === 'string' ? l : l.s)).join(' ');
  const dirs = text.match(/LEFT, then RIGHT, then RIGHT/)[0].match(/LEFT|RIGHT/g).map(d => d[0]);
  assert.deepEqual(dirs, MAZE_PATH);
  const s = newRunState();
  const w = new World(s); w.enter('ossuary', 'arrive'); w.entities = [];
  const go = id => { const r = use(w, id); w.enter(r.go.to, r.go.spawn); w.entities = []; return r; };
  go('arch_l'); go('arch_c');
  assert.equal(s.counts.maze_at, 0, 'a wrong arch should reset');
  assert.ok(!w.props().some(p => p.id === 'bone_stair'));
  go('arch_l'); go('arch_r'); go('arch_r');
  assert.ok(s.flags.has('maze_solved'));
  assert.ok(w.props().some(p => p.id === 'bone_stair'));
  assert.ok(!w.props().some(p => p.id === 'arch_l'));
  assert.equal(use(w, 'bone_stair').go.to, 'bell_chamber');
});

test('evidence: only the contradiction convinces Cal; two wrong answers and he locks the door', () => {
  const good = newRunState(); good.notes.push('account_notebook', 'account_ruth');
  const path = converse('cal_below', good, cs => Math.max(0, cs.findIndex(c => /October/.test(c.text))));
  assert.ok(path.includes('truth'));
  assert.ok(good.flags.has('cal_truth') && good.flags.has('cal_aside') && good.notes.includes('account_cal_truth'));
  const bad = newRunState(); bad.notes.push('account_ruth', 'account_price');
  converse('cal_below', bad, cs => Math.max(0, cs.findIndex(c => /Ruth|Price/.test(c.text))));
  assert.ok(bad.flags.has('cal_blocks') && !bad.flags.has('cal_truth'));
  // the door is shut for good, but the drain still goes round
  const w = new World(bad); w.enter('records', 'from_stair');
  assert.ok(!w.props().some(p => p.id === 'cal_below'));
  assert.ok(!w.tryExit(w.exits().find(e => e.to === 'ossuary'))[0].after);
  assert.match(w.tryExit(w.exits().find(e => e.to === 'ossuary'))[0].lines[0], /Cal took the key/);
  assert.equal(use(w, 'grate').go.to, 'drain');
  w.enter('drain', 'from_records');
  assert.ok(reach(w).some(([x, y]) => overlaps(playerBox(x, y), w.exits().find(e => e.to === 'ossuary'))));
  // with nothing to show him, you can walk away without a strike
  const none = newRunState();
  converse('cal_below', none);
  assert.ok(!none.flags.has('cal_strike') && !none.flags.has('cal_blocks'));
});

test('ceremony floor: the plaques to avoid are the crossed-out lines of the prayer card', () => {
  const card = DOCS.prayer_card.pages[0];
  const struck = card.filter(l => typeof l !== 'string' && l.strike).map(l => l.s.toUpperCase());
  const kept = card.filter(l => typeof l === 'string').map(l => l.toUpperCase());
  const room = ROOMS.sanctum;
  const plaques = room.props.filter(p => p.id.startsWith('plaque_'));
  const wrongIds = room.triggers.map(t => t.id.replace('step_', ''));
  for (const p of plaques) {
    const text = p.script[0].say[0].replace('Cut into the stone: ', '');
    const isWrong = wrongIds.includes(p.id.replace('plaque_', ''));
    if (isWrong) assert.ok(struck.some(l => l.includes(text) || text.includes(l)), `${text} should be crossed out on the card`);
    else assert.ok(kept.some(l => l.replace(/[,.]/g, '').includes(text.split(' ').slice(0, 3).join(' '))), `${text} should be on the card`);
  }
  assert.equal(wrongIds.length, 3);
});

test('ceremony floor: stepping on a wrong plaque hurts and sends you back; the right ones hold', () => {
  const s = newRunState();
  const w = new World(s); w.enter('sanctum', 'from_gallery');
  const ev = walkTo(w, 14 * TILE, 21 * TILE); // onto row one, right side: wrong
  const wrong = ev.find(e => e.id === 'step_1R');
  assert.ok(wrong && wrong.go.to === 'sanctum' && wrong.go.spawn === 'floor_start');
  assert.ok(ev.some(e => e.type === 'hurt'));
  w.enter('sanctum', 'floor_start');
  const ok = walkTo(w, 12 * TILE, 21 * TILE);
  assert.ok(ok.some(e => e.id === 'holds_1L') && !ok.some(e => e.id && e.id.startsWith('step_')));
});

test('ritual: the altar says what is missing, then takes the three things and opens the saint', () => {
  const s = newRunState();
  const w = new World(s); w.enter('sanctum', 'floor_start');
  w.player.x = 13 * TILE; w.player.y = 9.6 * TILE; w.player.facing = 'up'; w.cooldown = 0;
  let r = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.match(r.lines[1], /do not know/);
  s.flags.add('read:reading_order'); s.items.push('ribbon'); w.cooldown = 0;
  r = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.ok(r.lines.some(l => /a light from where she slept/.test(l)) && !r.lines.some(l => /something she wore/.test(l)));
  s.items.push('votive', 'holy_water'); w.cooldown = 0;
  r = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.equal(r.talk, 'last_prayer');
  assert.ok(s.flags.has('ritual_done'));
  assert.ok(!s.items.includes('ribbon') && !s.items.includes('votive'));
});

test('ritual items: each is found where the letter says, in chapter one places', () => {
  const s = newRunState();
  const w = new World(s);
  w.enter('shrine', 'from_path'); use(w, 'bowl'); use(w, 'bowl');
  assert.ok(s.items.includes('ribbon'));
  w.enter('station_hall', 'from_outside'); use(w, 'shelves'); use(w, 'shelves');
  assert.ok(s.items.includes('votive'));
  w.enter('chapel_nave', 'from_vestry'); use(w, 'stoup');
  assert.ok(s.items.includes('holy_water'));
});

// ---- endings ------------------------------------------------------------------------------

const truthState = () => {
  const s = newRunState();
  ['read:register', 'read:page2', 'cal_truth'].forEach(f => s.flags.add(f));
  s.notes.push('clue_below');
  return s;
};
const hiddenFlags = ['understood', 'found:ward_grave', 'found:names', 'found:haskell', 'found:watcher_prints', 'found:ruth_gone'];

test('endings: what opens each one is what you did and found', () => {
  assert.deepEqual(endingsAvailable(newRunState()), ['dawn', 'hollow']);
  const t = truthState();
  assert.deepEqual(endingsAvailable(t), ['dawn', 'hollow', 'names']);
  hiddenFlags.forEach(f => t.flags.add(f));
  assert.deepEqual(endingsAvailable(t), ENDING_IDS);
  // each missing piece closes the hidden ending again
  for (const f of hiddenFlags) { const u = truthState(); hiddenFlags.filter(x => x !== f).forEach(x => u.flags.add(x)); assert.ok(!endingsAvailable(u).includes('last_prayer'), f); }
  // and the final conversation offers exactly those
  for (const st of [newRunState(), truthState(), (() => { const x = truthState(); hiddenFlags.forEach(f => x.flags.add(f)); return x; })()]) {
    const view = enterNode('last_prayer', 'open', st);
    assert.equal(view.choices.length, endingsAvailable(st).length);
  }
  assert.equal(ENDING_IDS.length, 4);
  for (const id of ENDING_IDS) assert.ok(ENDINGS[id].lines.length >= 3);
});

test('endings: each one is reachable by choosing it at the saint', () => {
  const full = () => { const x = truthState(); hiddenFlags.forEach(f => x.flags.add(f)); return x; };
  for (const [i, id] of ENDING_IDS.entries()) {
    const s = full();
    const view = enterNode('last_prayer', 'open', s);
    const node = choose('last_prayer', 'open', view.choices[i].i, s);
    assert.equal(enterNode('last_prayer', node, s).ending, id);
  }
  // the hidden understanding comes from Price's question, and wrong answers can be retried
  const p = newRunState();
  converse('confession', p, cs => 0);
  assert.ok(!p.flags.has('understood'));
  converse('confession', p, cs => cs.findIndex(c => /forget/.test(c.text)));
  assert.ok(p.flags.has('understood') && p.notes.includes('understood'));
});

test('the last conversation remembers who you talked to', () => {
  const s = newRunState();
  assert.equal(enterNode('last_prayer', 'open', s).lines.filter(l => /Ruth|Cal/.test(l.text)).length, 0);
  s.flags.add('asked_photo'); s.flags.add('cal_truth');
  assert.equal(enterNode('last_prayer', 'open', s).lines.filter(l => /Ruth|Cal/.test(l.text)).length, 2);
  const w = new World(s); w.enter('sanctum', 'from_gallery');
  assert.ok(w.props().some(p => p.id === 'ruth_pew') && w.props().some(p => p.id === 'cal_back'));
});

// ---- chapters -----------------------------------------------------------------------------

test('chapters: the crypt opens once the recorder is understood, and that is chapter two', () => {
  const s = newRunState();
  const w = new World(s); w.enter('chapel_nave', 'from_vestry');
  let r = use(w, 'crypt');
  assert.ok(!r.chapter && !s.flags.has('crypt_open'));
  use(w, 'reel');
  r = use(w, 'crypt');
  assert.equal(r.chapter, 2);
  assert.ok(s.flags.has('crypt_open') && s.flags.has('ch2') && s.chapter === 2);
  assert.ok(w.exits().some(e => e.to === 'crypt_stair'));
  assert.ok(!w.blocked(playerBox(12 * TILE, 2 * TILE)));
  assert.ok(w.props().some(p => p.id === 'confessional'));
});

test('chapters: chapter select starts each chapter with what the earlier ones gave you', () => {
  for (const n of [1, 2, 3]) {
    const s = chapterState(n);
    assert.equal(s.chapter, n);
    assert.equal(s.room, CHAPTERS[n].start.room);
    const w = new World(s); w.enter(s.room, s.spawn);
    assert.ok(!w.blocked(playerBox(w.player.x, w.player.y)));
  }
  const two = chapterState(2);
  for (const i of ['key_ring', 'vestry_key', 'cemetery_key', 'notebook']) assert.ok(two.items.includes(i));
  assert.ok(two.flags.has('crypt_open'));
  const three = chapterState(3);
  for (const i of ['ribbon', 'votive', 'holy_water']) assert.ok(three.items.includes(i));
  assert.ok(three.flags.has('bells_solved') && three.flags.has('read:reading_order'));
});

test('meta: chapters reached and endings seen outlive any one run', () => {
  const store = new ST.Store(ST.memoryStorage());
  assert.deepEqual(readMeta(store), { chapters: [1], endings: [] });
  reachChapter(store, 2); reachChapter(store, 2); recordEnding(store, 'dawn'); recordEnding(store, 'nonsense');
  store.saveGame({ room: 'shrine', x: 1, y: 1 });
  store.clearGame();
  assert.deepEqual(readMeta(store), { chapters: [1, 2], endings: ['dawn'] });
  store.storage.setItem(ST.KEYS.meta, '{oops');
  assert.deepEqual(readMeta(store), { chapters: [1], endings: [] });
});

test('story: chapters two and three play through to an ending', () => {
  const s = chapterState(2);
  s.items = s.items.filter(i => !['ribbon', 'votive', 'holy_water'].includes(i));
  s.notes.push('account_ruth');
  const w = new World(s);
  w.enter('crypt_stair', 'from_nave');
  w.enter('records', 'from_stair');
  assert.equal(use(w, 'register').doc, 'register'); s.flags.add('read:register');
  assert.ok(s.items.includes('reading_letter'));
  use(w, 'ledgers'); assert.ok(s.items.includes('page3'));
  use(w, 'cabinet');
  assert.equal(use(w, 'cal_below').talk, 'cal_below');
  converse('cal_below', s, cs => Math.max(0, cs.findIndex(c => /October/.test(c.text))));
  assert.ok(s.flags.has('cal_aside'));
  assert.equal(w.tryExit(w.exits().find(e => e.to === 'ossuary'))[0].type, 'exit');
  w.enter('ossuary', 'from_records'); w.entities = [];
  for (const d of MAZE_PATH) { const id = { L: 'arch_l', R: 'arch_r', C: 'arch_c' }[d]; const r = use(w, id); w.enter(r.go.to, r.go.spawn); w.entities = []; }
  w.enter('bell_chamber', 'from_ossuary');
  for (const n of BELL_ORDER) use(w, 'bell_' + n);
  assert.equal(s.chapter, 3);
  w.enter('gallery', 'from_bells');
  w.enter('sanctum', 'from_gallery');
  // the three things, fetched from chapter one places
  s.flags.add('read:reading_order');
  for (const i of ['ribbon', 'votive', 'holy_water']) s.items.push(i);
  // cross the floor on the right plaques
  for (const [x, y] of [[12, 21], [12, 19], [14, 16], [14, 14], [12, 11], [12, 8.6]]) {
    const ev = walkTo(w, x * TILE, y * TILE);
    assert.ok(!ev.some(e => e.id && e.id.startsWith('step_')), `stepped wrong near ${x},${y}`);
  }
  w.player.facing = 'up'; w.cooldown = 0;
  const r = w.update({ interact: true }).find(e => e.type === 'interact');
  assert.equal(r.talk, 'last_prayer');
  const view = enterNode('last_prayer', 'open', s);
  assert.ok(view.choices.length >= 2);
  const node = choose('last_prayer', 'open', view.choices[0].i, s);
  assert.equal(enterNode('last_prayer', node, s).ending, 'dawn');
});

test('flow: an ending plays, the run save is cleared, and chapter select opens', () => {
  const h = harness();
  h.run(30); h.tap('Space', 90);
  const title = h.app.top;
  assert.ok(!title.menu.enabled(title.menu.items[2]), 'chapters open before any were reached');
  title.startChapter(3);
  h.run(90);
  assert.equal(h.stack(), 'PlayScene>ChapterScene');
  h.run(60); h.tap('KeyE', 90);
  assert.equal(h.stack(), 'PlayScene');
  const play = h.app.top;
  h.dismiss();
  play.world.enter('sanctum', 'floor_start');
  play.talk('last_prayer');
  for (let i = 0; i < 20 && !play.text.choosing; i++) h.tap('KeyE', 3);
  h.tap('Enter', 3);                         // "Run."
  for (let i = 0; i < 10 && play.text.active; i++) h.tap('KeyE', 3);
  h.run(90);
  assert.equal(h.stack(), 'EndingScene');
  assert.ok(!h.app.store.hasGame());
  assert.deepEqual(readMeta(h.app.store).endings, ['dawn']);
  h.run(60 * 12);
  h.tap('Enter', 90);
  assert.equal(h.stack(), 'TitleScene');
  const t2 = h.app.top;
  assert.ok(t2.menu.enabled(t2.menu.items[2]), 'chapter select still locked after reaching chapter three');
  assert.equal(h.app.settings.calibrated, false, 'chapter select should not have touched settings');
});

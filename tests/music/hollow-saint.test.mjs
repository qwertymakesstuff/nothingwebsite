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
const { ROOMS, START } = await load('game/rooms.js');
const { TILES, isSolidChar, bakeRoom } = await load('game/tiles.js');
const { SPRITES, PLAYER } = await load('game/art.js');
const { World, playerBox, probeBox } = await load('game/world.js');
const { newRunState, stateFromSave, saveFromState } = await load('game/state.js');
const { runScript, pickVariant } = await load('game/script.js');
const { applyLighting } = await load('game/lighting.js');
const { paginate } = await load('ui/textbox.js');
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
      assert.ok(ROOMS[ex.to].exits.some(b => b.to === id), `${ex.to} has no way back to ${id}`);
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
    for (const v of s) assert.ok((v.say || []).length, `${rid}.${id}: a variant says nothing`);
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

test('map: from every spawn, every exit, trigger and interactable can be reached', () => {
  for (const [id, r] of Object.entries(ROOMS)) for (const sp of Object.keys(r.spawns)) {
    const w = freshWorld(id, sp);
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
  while (q.length) for (const ex of ROOMS[q.pop()].exits) if (!seen.has(ex.to)) { seen.add(ex.to); q.push(ex.to); }
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
  return { app, run, tap, hold, stack, storage };
}

test('flow: boot, title, new game, intro, play; pause and resume keep the game intact', () => {
  const h = harness();
  h.run(30); h.tap('Space');
  assert.equal(h.stack(), 'TitleScene');
  const cont = h.app.top.menu.items[1];
  assert.equal(h.app.top.menu.enabled(cont), false, 'Continue enabled with no save');
  h.tap('Enter');
  assert.equal(h.stack(), 'IntroScene');
  h.tap('Escape', 90);
  assert.equal(h.stack(), 'PlayScene');
  const play = h.app.top;
  assert.ok(h.app.store.hasGame(), 'no checkpoint at the start');
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
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Escape', 90);
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
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Escape', 90);
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
  h.tap('ArrowDown', 2); h.tap('Enter', 90); h.tap('Escape', 90);
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
  for (let i = 0; i < 4; i++) h.tap('ArrowDown', 2);
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
  h.run(30); h.tap('Space'); h.tap('Enter'); h.tap('Escape', 90);
  const p = h.app.top.world.player, y0 = p.y;
  h.hold('KeyI', 40);
  assert.ok(p.y < y0);
});

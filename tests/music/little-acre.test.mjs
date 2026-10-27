import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../little-acre/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { TILE, CLOCK, PLAYER, CAN_CAPACITY, FRIENDSHIP } = await load('config.js');
const { MAPS } = await load('data/maps.js');
const { TILES } = await load('data/tiles.js');
const { NPCS } = await load('data/npcs.js');
const { CROPS, CROPS_BY_ID, seedId } = await load('data/crops.js');
const { ITEMS, ITEMS_BY_ID } = await load('data/items.js');
const { RECIPES } = await load('data/recipes.js');
const { QUESTS } = await load('data/quests.js');
const { FESTIVALS } = await load('data/events.js');
const { SHOPS } = await load('data/shops.js');
const { OBJECTS } = await load('data/objects.js');
const { FISH } = await load('data/fish.js');
const { TRACKS } = await load('data/music.js');
const { DIALOGUE } = await load('data/dialogue.js');
const W = await load('world.js');
const Inv = await load('inventory.js');
const farming = await load('farming.js');
const tools = await load('tools.js');
const { newGame } = await load('state.js');
const { endDay, rollWeather } = await load('day.js');
const eco = await load('economy.js');
const quests = await load('quests.js');
const npc = await load('npc.js');
const crafting = await load('crafting.js');
const fishing = await load('fishing.js');
const festival = await load('festival.js');
const { journal } = await load('journal.js');
const save = await load('save.js');
const cal = await load('calendar.js');
const { Game } = await load('game.js');
const { rngFor, mulberry32 } = await load('rng.js');

const fresh = (seed = 7) => newGame({ seed, name: 'Test' });
const rng = () => mulberry32(1);
// a tillable farm tile with nothing on it (and its neighbour below)
function openPlot(s) {
  for (let y = 18; y < 27; y++) for (let x = 15; x < 36; x++) {
    for (const k of [`${x},${y}`, `${x},${y + 1}`, `${x},${y + 2}`]) delete s.maps.farm.objects[k];
    if (W.tillable(s, 'farm', x, y)) return [x, y];
  }
  throw new Error('no plot');
}
const sleep = (s, n = 1) => { for (let i = 0; i < n; i++) endDay(s); };

test('every little-acre module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } };
  walk(dir.pathname);
  assert.ok(files.length >= 30);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('maps: rows line up, every tile is in the legend, warps and doors land on open ground', () => {
  const s = fresh();
  for (const [id, m] of Object.entries(MAPS)) {
    assert.ok(m.rows.every(r => r.length === m.w), `${id}: ragged rows`);
    for (const r of m.rows) for (const ch of r) assert.ok(TILES[ch], `${id}: unknown tile '${ch}'`);
    for (const w of m.warps) {
      assert.ok(MAPS[w.to], `${id}: warp to unknown map ${w.to}`);
      for (let i = 0; i < Math.max(w.w, w.h); i++) {
        const [tx, ty] = W.warpTarget(w, w.x + (w.w > 1 ? i : 0), w.y + (w.h > 1 ? i : 0));
        assert.ok(!W.blocked(s, w.to, tx, ty), `${id} -> ${w.to}: lands on a blocked tile ${tx},${ty}`);
        assert.equal(W.warpAt(w.to, tx, ty), null, `${id} -> ${w.to}: lands inside another warp`);
      }
    }
    for (const b of m.buildings) {
      assert.equal(m.rows[b.door.y][b.door.x], 'D', `${id}/${b.id}: door tile is not 'D'`);
      if (b.to) {
        assert.ok(!W.blocked(s, b.to.map, b.to.x, b.to.y), `${b.id}: inside spawn blocked`);
        // the way back out lands below the door
        const back = MAPS[b.to.map].warps.find(w => w.to === id);
        assert.ok(back && back.tx === b.door.x && back.ty === b.door.y + 1, `${b.id}: exit does not return to its door`);
        assert.ok(!W.blocked(s, id, back.tx, back.ty));
      } else assert.ok(b.locked, `${b.id}: door needs 'to' or 'locked'`);
    }
    for (const t of m.things) assert.ok(t.x >= 0 && t.y >= 0 && t.x + t.w <= m.w && t.y + t.h <= m.h, `${id}: thing out of bounds`);
  }
});

test('maps: every outdoor area is reachable on foot from the farmhouse door', () => {
  const s = fresh();
  for (const m of Object.values(s.maps)) m.objects = {}; // debris can be cleared, so ignore it
  const reach = (map, from, to) => W.findPath(s, map, from, to, null, 100000) !== null;
  assert.ok(reach('farm', [8, 7], [39, 14]), 'farm house -> east road');
  assert.ok(reach('town', [2, 15], [43, 15]), 'town west -> east');
  assert.ok(reach('town', [2, 15], [21, 0]), 'town -> forest exit');
  assert.ok(reach('town', [2, 15], [21, 31]), 'town -> lake exit');
  for (const b of MAPS.town.buildings) assert.ok(reach('town', [2, 15], [b.door.x, b.door.y + 1]), `town -> ${b.id}`);
  assert.ok(reach('forest', [21, 27], [8, 9]), 'forest -> Juni\'s cabin');
  assert.ok(reach('lake', [21, 2], [20, 20]), 'lake -> end of the pier');
  assert.ok(reach('store', [7, 8], [6, 5]), 'store door -> counter');
});

test('a new farm keeps its paths, doorstep and yard clear of debris', () => {
  for (const seed of [1, 2, 3, 99, 12345]) {
    const s = fresh(seed);
    for (const k of Object.keys(s.maps.farm.objects)) {
      const [x, y] = k.split(',').map(Number);
      assert.ok(['.', '"'].includes(MAPS.farm.rows[y][x]), `seed ${seed}: debris on '${MAPS.farm.rows[y][x]}' at ${k}`);
      assert.ok(!(x <= 13 && y <= 16), `seed ${seed}: debris in the yard at ${k}`);
    }
    assert.ok(W.findPath(s, 'farm', [8, 7], [39, 14]), `seed ${seed}: the road out is blocked`);
  }
});

test('villager schedules and festival spots stand on reachable, walkable tiles', () => {
  const s = fresh();
  for (const m of Object.values(s.maps)) m.objects = {};
  for (const n of NPCS) {
    for (const [key, list] of Object.entries(n.schedule)) {
      for (const [t, map, x, y] of list) {
        assert.ok(MAPS[map], `${n.id}/${key}: unknown map ${map}`);
        assert.ok(!W.blocked(s, map, x, y), `${n.id}/${key} ${t}: ${map} ${x},${y} is blocked`);
      }
      // consecutive entries on one map must be connected
      for (let i = 1; i < list.length; i++) if (list[i][1] === list[i - 1][1]) assert.ok(W.findPath(s, list[i][1], [list[i - 1][2], list[i - 1][3]], [list[i][2], list[i][3]], null, 100000), `${n.id}/${key}: no path ${i - 1}->${i}`);
    }
    assert.ok(DIALOGUE[n.id] && DIALOGUE[n.id].intro, `${n.id}: no dialogue`);
  }
  for (const f of FESTIVALS) for (const [id, [x, y]] of Object.entries(f.spots)) assert.ok(!W.blocked(s, f.map, x, y), `${f.id}: ${id} spot blocked`);
});

test('data: every referenced item, crop, recipe, quest and shop entry exists', () => {
  const ok = t => t.includes(':') || !!ITEMS_BY_ID[t];
  for (const r of RECIPES) { assert.ok(ITEMS_BY_ID[r.out], r.id); for (const t of Object.keys(r.in)) assert.ok(ok(t), `${r.id}: ${t}`); }
  for (const q of QUESTS) { for (const [id] of q.reward.items || []) assert.ok(ITEMS_BY_ID[id], `${q.id}: ${id}`); if (q.goal.what) assert.ok(ok(q.goal.what)); }
  for (const sh of Object.values(SHOPS)) for (const e of sh.stock) if (e.item) assert.ok(ITEMS_BY_ID[e.item], e.item);
  for (const o of Object.values(OBJECTS)) { for (const [id] of o.drops || []) assert.ok(ITEMS_BY_ID[id], id); if (o.item) assert.ok(ITEMS_BY_ID[o.item], o.item); }
  for (const n of NPCS) for (const t of [...n.loves, ...n.likes, ...n.dislikes, ...n.hates, ...(n.gifts || []).map(g => g.item)]) assert.ok(ok(t), `${n.id}: ${t}`);
  for (const c of CROPS) { assert.ok(ITEMS_BY_ID[c.id] && ITEMS_BY_ID[seedId(c.id)]); assert.ok(c.days > 0 && c.seasons.length); }
  for (const f of FISH) assert.ok(ITEMS_BY_ID[f.id]);
  for (const t of Object.values(TRACKS)) { assert.equal(t.a.length, 32); assert.equal(t.b.length, 32); assert.equal(t.chords.length, 4); }
  assert.equal(new Set(ITEMS.map(i => i.id)).size, ITEMS.length, 'duplicate item ids');
});

test('inventory: stacking, full bags, all-or-nothing removal, moving and sorting', () => {
  const s = fresh();
  assert.equal(Inv.count(s, 'seed_turnip'), 15);
  assert.equal(Inv.add(s, 'seed_turnip', 100), 0);
  assert.equal(Inv.count(s, 'seed_turnip'), 115);
  assert.equal(s.inventory.filter(x => x?.id === 'seed_turnip').every(x => x.n <= PLAYER.stack), true);
  // tools never stack
  assert.equal(Inv.add(s, 'hoe', 1), 0);
  assert.equal(s.inventory.filter(x => x?.id === 'hoe').length, 2);
  // fill the bag: only `backpack` slots are usable
  for (let i = 0; i < 40; i++) Inv.add(s, 'stone', 99);
  assert.equal(s.inventory.slice(0, s.player.backpack).every(Boolean), true);
  assert.equal(s.inventory.slice(s.player.backpack).every(x => !x), true);
  assert.equal(Inv.add(s, 'wood', 5), 5, 'a full bag returns what did not fit');
  assert.equal(Inv.canAdd(s, 'wood', 1), false);
  assert.equal(Inv.addAll(s, [['stone', 1], ['wood', 1]]), false, 'addAll refuses a partial fit');
  const before = JSON.stringify(s.inventory);
  assert.equal(Inv.remove(s, 'stone', 99999), false);
  assert.equal(JSON.stringify(s.inventory), before, 'failed removal changes nothing');
  assert.equal(Inv.removeAll(s, { stone: 10, wood: 1 }), null);
  assert.equal(JSON.stringify(s.inventory), before);
  assert.ok(Inv.removeAll(s, { stone: 150, 'cat:seed': 15 }));
  assert.equal(Inv.count(s, 'seed_turnip'), 100);

  const t = fresh();
  Inv.add(t, 'wood', 50);
  const a = t.inventory.findIndex(x => x?.id === 'wood');
  const b = t.inventory.findIndex(x => !x);
  Inv.add(t, 'wood', 0);
  t.inventory[b] = { id: 'wood', n: 70 };
  assert.ok(Inv.moveSlot(t, a, b));
  assert.equal(t.inventory[b].n, 99); assert.equal(t.inventory[a].n, 21);
  assert.ok(Inv.moveSlot(t, 0, b)); // swap different items
  assert.equal(t.inventory[0].id, 'wood'); assert.equal(t.inventory[b].id, 'hoe');
  t.inventory[20] = { id: 'turnip', n: 3 }; t.inventory[15] = { id: 'acorn', n: 2 }; t.inventory[18] = { id: 'turnip', n: 4 };
  Inv.sortBackpack(t);
  const rest = t.inventory.slice(PLAYER.hotbar, t.player.backpack).filter(Boolean);
  assert.equal(rest.filter(x => x.id === 'turnip').length, 1);
  assert.equal(rest.find(x => x.id === 'turnip').n, 7);
  assert.equal(Inv.count(t, 'wood'), 120);
});

test('crops: plant, water, wait, harvest; dry days do not grow; rain waters', () => {
  const s = fresh();
  s.weather.tomorrow = 'sun';
  const [x, y] = openPlot(s);
  assert.ok(farming.till(s, 'farm', x, y));
  assert.equal(farming.till(s, 'farm', x, y), false, 'cannot till twice');
  assert.ok(farming.plant(s, 'farm', x, y, 'seed_turnip'));
  assert.equal(farming.plant(s, 'farm', x, y, 'seed_turnip'), false);
  const soil = () => W.soilAt(s, 'farm', x, y);
  // one dry night: no growth
  sleep(s);
  s.weather.today = 'sun';
  assert.equal(soil().c.age, 0);
  for (let d = 0; d < 4; d++) { s.weather.tomorrow = 'sun'; farming.water(s, 'farm', x, y); assert.ok(soil().w); sleep(s); }
  assert.ok(farming.isRipe(soil().c));
  assert.equal(farming.cropStage(soil().c), 4);
  const r = tools.harvestAt(s, 'farm', x, y, rng());
  assert.ok(r.ok);
  assert.equal(Inv.count(s, 'turnip'), 1);
  assert.equal(soil().c, null, 'turnips do not regrow');
  // a rainy morning waters every plot
  farming.plant(s, 'farm', x, y, 'seed_turnip');
  s.weather.tomorrow = 'rain';
  sleep(s);
  assert.equal(s.weather.today, 'rain');
  assert.equal(soil().w, true);
});

test('crops: regrowing plants, fertilizer, wrong season and the season change', () => {
  const s = fresh();
  const [x, y] = openPlot(s);
  farming.till(s, 'farm', x, y);
  assert.match(farming.plantProblem(s, 'farm', x, y, 'seed_tomato'), /won't grow/);
  assert.ok(farming.fertilize(s, 'farm', x, y));
  farming.plant(s, 'farm', x, y, 'seed_snappea');
  const c = W.soilAt(s, 'farm', x, y).c;
  assert.equal(c.grow, Math.ceil(CROPS_BY_ID.snappea.days * 0.75));
  c.age = c.grow;
  assert.ok(farming.harvest(s, 'farm', x, y));
  assert.equal(c.age, c.grow - CROPS_BY_ID.snappea.regrow, 'regrows');
  // last night of spring: the spring crop withers
  s.date.day = 28;
  sleep(s);
  assert.equal(s.date.season, 1);
  assert.equal(W.soilAt(s, 'farm', x, y).c.dead, true);
  assert.equal(farming.isRipe(W.soilAt(s, 'farm', x, y).c), false);
  assert.ok(farming.clearDead(s, 'farm', x, y));
  // corn grows across summer and fall
  const corn = CROPS_BY_ID.corn;
  assert.deepEqual(corn.seasons, [1, 2]);
});

test('crops: a full bag refuses the harvest and keeps the crop', () => {
  const s = fresh();
  const [x, y] = openPlot(s);
  farming.till(s, 'farm', x, y);
  farming.plant(s, 'farm', x, y, 'seed_turnip');
  W.soilAt(s, 'farm', x, y).c.age = 99;
  for (let i = 0; i < s.player.backpack; i++) if (!s.inventory[i]) s.inventory[i] = { id: 'stone', n: 99 };
  const r = tools.harvestAt(s, 'farm', x, y, rng());
  assert.equal(r.ok, false);
  assert.ok(farming.isRipe(W.soilAt(s, 'farm', x, y).c));
});

test('collisions: water, trees, buildings, locked doors, objects and walls block; paths do not', () => {
  const s = fresh();
  assert.equal(W.blocked(s, 'farm', 0, 0), true, 'tree border');
  assert.equal(W.blocked(s, 'farm', 6, 22), true, 'pond');
  assert.equal(W.blocked(s, 'farm', 7, 4), true, 'farmhouse wall');
  assert.equal(W.blocked(s, 'farm', 8, 6), false, 'farmhouse door');
  assert.equal(W.blocked(s, 'town', 15, 7), true, 'locked door');
  assert.equal(W.blocked(s, 'farm', 20, 8), true, 'old north fence');
  s.unlocks.northfield = true;
  assert.equal(W.blocked(s, 'farm', 20, 8), false, 'fence gone after the expansion');
  assert.equal(W.blocked(s, 'farm', 10, 7), true, 'shipping bin');
  assert.equal(W.blocked(s, 'house', 0, 5), true, 'wall');
  s.maps.farm.objects['30,20'] = { t: 'stone' };
  assert.equal(W.blocked(s, 'farm', 30, 20), true, 'debris');
  s.maps.farm.objects['30,20'] = { t: 'wpath' };
  assert.equal(W.blocked(s, 'farm', 30, 20), false, 'paths are walkable');
  // a moving box: walking north from the farmhouse doorstep stops at the wall
  const [px, py] = W.centerOf(9, 7);
  let pos = [px, py];
  for (let i = 0; i < 40; i++) pos = W.moveWithCollision(s, 'farm', pos[0], pos[1], 0, -1);
  assert.ok(pos[1] >= 7 * TILE + W.FEET.h - 0.01, 'stopped by the house');
  assert.ok(W.canOccupy(s, 'farm', W.boxAt(...pos)));
  // the east road: a box never enters a tree tile
  pos = W.centerOf(37, 14);
  for (let i = 0; i < 60; i++) { pos = W.moveWithCollision(s, 'farm', pos[0], pos[1], 0, -1); assert.ok(W.canOccupy(s, 'farm', W.boxAt(...pos))); }
});

test('tools: debris breaks with the right tool and level, energy is spent, the can runs dry', () => {
  const s = fresh();
  const [x, y] = openPlot(s);
  s.maps.farm.objects[`${x},${y}`] = { t: 'stone', hp: null };
  const e0 = s.player.energy;
  assert.equal(tools.useTool(s, 'axe', 'farm', x, y, 'down', rng()).ok, false, 'axe does not break stone');
  const r = tools.useTool(s, 'pickaxe', 'farm', x, y, 'down', rng());
  assert.ok(r.ok); assert.ok(r.cleared);
  assert.equal(W.objectAt(s, 'farm', x, y), null);
  assert.ok(Inv.count(s, 'stone') >= 1);
  assert.ok(s.player.energy < e0);
  s.maps.farm.objects[`${x},${y}`] = { t: 'stump', hp: null };
  assert.match(tools.useTool(s, 'axe', 'farm', x, y, 'down', rng()).msg, /copper/);
  s.tools.axe = 1;
  let n = 0;
  while (W.objectAt(s, 'farm', x, y) && n++ < 10) tools.useTool(s, 'axe', 'farm', x, y, 'down', rng());
  assert.equal(n, 2, 'a copper axe fells a stump in two swings');
  assert.ok(Inv.count(s, 'hardwood') >= 2);
  // watering can
  farming.till(s, 'farm', x, y);
  s.player.water = 0;
  assert.equal(tools.useTool(s, 'can', 'farm', x, y, 'down', rng()).ok, false);
  assert.ok(tools.useTool(s, 'can', 'farm', 6, 20, 'down', rng()).ok, 'refill at the pond');
  assert.equal(s.player.water, CAN_CAPACITY[0]);
  // too tired
  s.player.energy = 0;
  assert.match(tools.useTool(s, 'hoe', 'farm', x + 1, y, 'down', rng()).msg, /tired/);
  // iron hoe tills five in a row
  s.player.energy = 100; s.tools.hoe = 2;
  for (let i = 0; i < 6; i++) delete s.maps.farm.objects[`${x + 3},${y + i}`];
  const t5 = tools.useTool(s, 'hoe', 'farm', x + 3, y, 'down', rng());
  assert.ok(t5.tilled >= 3);
});

test('placing and picking up objects; sprinklers water; full bags drop items on the ground', () => {
  const s = fresh();
  const [x, y] = openPlot(s);
  Inv.add(s, 'sprinkler', 1);
  farming.till(s, 'farm', x, y + 1);
  assert.ok(tools.place(s, 'sprinkler', 'farm', x, y).ok);
  assert.equal(W.soilAt(s, 'farm', x, y + 1).w, true, 'placing a sprinkler waters next to it');
  s.weather.tomorrow = 'sun';
  sleep(s);
  assert.equal(W.soilAt(s, 'farm', x, y + 1)?.w ?? true, true, 'and again every morning');
  assert.equal(tools.place(s, 'chest', 'town', 20, 20).ok, false, 'chests need to be in your bag');
  Inv.add(s, 'bench', 1);
  assert.match(tools.place(s, 'bench', 'town', 3, 3).msg, /farm/);
  assert.ok(tools.useTool(s, 'pickaxe', 'farm', x, y, 'down', rng()).ok);
  assert.equal(Inv.count(s, 'sprinkler'), 1);
  const got = tools.giveOrDrop(s, 'farm', x, y, [['wood', 99 * 40]]);
  assert.ok(got.length);
  assert.equal(W.objectAt(s, 'farm', x, y).t, 'drop');
});

test('day transitions: shipping pays out, the calendar rolls over, weather is seeded, you wake at 6am', () => {
  const s = fresh();
  Inv.add(s, 'turnip', 10);
  const slot = s.inventory.findIndex(x => x?.id === 'turnip');
  assert.ok(eco.ship(s, slot, 10));
  assert.equal(eco.shippingValue(s), 350);
  s.player.energy = 3;
  s.player.map = 'town';
  const m0 = s.player.money;
  const sum = endDay(s);
  assert.equal(sum.total, 350);
  assert.equal(s.player.money, m0 + 350);
  assert.equal(s.stats.shippedTotal, 10);
  assert.deepEqual([s.date.day, s.date.season, s.date.year, s.date.minutes], [2, 0, 1, CLOCK.dayStart]);
  assert.equal(s.player.energy, s.player.maxEnergy);
  assert.equal(s.player.map, 'house');
  assert.equal(s.shipping.length, 0);
  assert.ok(s.board.request, 'a bulletin request is posted');
  // season and year rollover
  s.date.day = 28; s.date.season = 3;
  endDay(s);
  assert.deepEqual([s.date.day, s.date.season, s.date.year], [1, 0, 2]);
  // weather is the same for the same seed and date
  assert.equal(rollWeather(fresh(99), { day: 5, season: 1, year: 1 }), rollWeather(fresh(99), { day: 5, season: 1, year: 1 }));
  assert.equal(rollWeather(s, { day: 1, season: 0, year: 1 }), 'sun', 'the first morning is always sunny');
  // passing out costs money and half your energy
  const t = fresh();
  t.player.money = 1000;
  const p = endDay(t, { passedOut: true });
  assert.equal(p.penalty, 100);
  assert.equal(t.player.money, 900);
  assert.equal(t.player.energy, Math.ceil(t.player.maxEnergy / 2));
});

test('day transitions: the world refills overnight and requests expire', () => {
  const s = fresh();
  s.maps.quarry.objects = {};
  s.maps.forest.objects = {};
  endDay(s);
  assert.ok(Object.values(s.maps.quarry.objects).length > 0, 'quarry rocks respawn');
  assert.ok(Object.values(s.maps.forest.objects).some(o => o.t === 'forage'), 'forage respawns');
  quests.acceptRequest(s);
  assert.equal(s.requests.length, 1);
  endDay(s); endDay(s); endDay(s);
  assert.equal(s.requests.length, 0, 'requests expire after their deadline');
  // saplings grow into trees
  s.maps.farm.objects['30,25'] = { t: 'sapling', age: 0 };
  for (let i = 0; i < 7; i++) endDay(s);
  assert.equal(s.maps.farm.objects['30,25'].t, 'tree');
});

test('saving: a full round trip keeps date, crops, inventory, money, friendships and farm layout', () => {
  const s = fresh(1234);
  const [x, y] = openPlot(s);
  farming.till(s, 'farm', x, y);
  farming.plant(s, 'farm', x, y, 'seed_potato');
  farming.water(s, 'farm', x, y);
  endDay(s); endDay(s);
  Inv.add(s, 'chest', 1);
  tools.place(s, 'chest', 'farm', x + 1, y);
  W.objectAt(s, 'farm', x + 1, y).items[3] = { id: 'wood', n: 42 };
  s.player.money = 4321;
  s.npcs.pip.points = 345; s.npcs.pip.met = true;
  s.unlocks.northfield = true;
  s.quests.done.push('fresh-start');
  const back = save.deserialize(save.serialize(s));
  assert.deepEqual(back.date, s.date);
  assert.deepEqual(back.maps.farm.soil, s.maps.farm.soil);
  assert.deepEqual(back.maps.farm.objects, s.maps.farm.objects);
  assert.deepEqual(back.inventory, s.inventory);
  assert.equal(back.player.money, 4321);
  assert.equal(back.npcs.pip.points, 345);
  assert.equal(back.unlocks.northfield, true);
  assert.deepEqual(back.quests, s.quests);
  assert.deepEqual(back.stats, s.stats);
  assert.equal(back.seed, s.seed);
  assert.equal(JSON.stringify(back), JSON.stringify(save.sanitize(JSON.parse(JSON.stringify(back)))), 'sanitizing a clean save changes nothing');
});

test('saving: broken or hostile data is repaired, never trusted', () => {
  const s = fresh(5);
  const data = JSON.parse(save.serialize(s));
  data.inventory[0] = { id: 'not_an_item', n: 5 };
  data.inventory[1] = { id: 'wood', n: 1e9 };
  data.player.money = -50;
  data.player.map = 'nowhere';
  data.date = { day: 99, season: 'x', year: 1, minutes: 12 };
  data.maps.farm.soil['1,1'] = { w: true, c: { id: 'banana', age: 3 } };
  data.maps.farm.soil['bad key'] = { w: true };
  data.maps.farm.objects['2,2'] = { t: 'dragon' };
  data.npcs.pip = 'hello';
  data.quests.active['made-up'] = { n: 1 };
  const r = save.sanitize(data);
  assert.equal(r.inventory[0], null);
  assert.equal(r.inventory[1].n, PLAYER.stack);
  assert.equal(r.player.money, 0);
  assert.equal(r.player.map, 'house');
  assert.equal(r.date.day, 28); assert.equal(r.date.season, 0); assert.equal(r.date.minutes, CLOCK.dayStart);
  assert.equal(r.maps.farm.soil['1,1'].c, null);
  assert.equal(r.maps.farm.soil['bad key'], undefined);
  assert.equal(r.maps.farm.objects['2,2'], undefined);
  assert.equal(r.npcs.pip.points, 0);
  assert.equal(r.quests.active['made-up'], undefined);
  assert.equal(save.sanitize(null).version, 1);
  assert.equal(save.migrate({ version: 1 }).version, 1);
  assert.throws(() => save.deserialize('{not json'));
});

test('saving: localStorage round trip, and unreadable saves are backed up', () => {
  const store = {};
  globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  try {
    const s = fresh(77);
    s.player.money = 777;
    assert.ok(save.saveGame(s));
    assert.ok(save.hasSave());
    assert.equal(save.loadGame().player.money, 777);
    store['little-acre-save'] = '{oops';
    assert.equal(save.loadGame(), null);
    assert.ok(Object.keys(store).some(k => k.startsWith('little-acre-save-broken-')));
    assert.equal(save.hasSave(), false);
  } finally { delete globalThis.localStorage; }
});

test('quests: story quests start, count events, deliver and pay rewards', () => {
  const s = fresh();
  quests.refreshQuests(s);
  assert.ok(s.quests.active['fresh-start'] && s.quests.active['neighbours']);
  const m0 = s.player.money;
  for (let i = 0; i < 14; i++) quests.questEvent(s, 'clear');
  assert.ok(s.quests.active['fresh-start']);
  const done = quests.questEvent(s, 'clear');
  assert.equal(done[0].id, 'fresh-start');
  assert.equal(s.player.money, m0 + 200);
  quests.refreshQuests(s);
  assert.ok(s.quests.active.crafty, 'finishing a quest starts the next');
  // talk quest needs everyone
  for (const n of NPCS.slice(0, 5)) quests.questEvent(s, 'talk', { npc: n.id });
  assert.ok(s.quests.active.neighbours);
  quests.questEvent(s, 'talk', { npc: 'odessa' });
  assert.ok(s.quests.done.includes('neighbours'));
  // delivery
  s.npcs.bram.met = true;
  quests.refreshQuests(s);
  assert.equal(quests.deliverables(s, 'bram').length, 0);
  Inv.add(s, 'copper_ore', 10);
  const d = quests.deliverables(s, 'bram')[0];
  assert.equal(d.id, 'bram-ore');
  quests.deliver(s, d);
  assert.equal(Inv.count(s, 'copper_ore'), 0);
  assert.ok(s.quests.done.includes('bram-ore'));
  assert.ok(crafting.knownRecipes(s).some(r => r.id === 'furnace'), 'the quest unlocks the furnace recipe');
  // rewards that do not fit wait in `pending`
  for (let i = 0; i < s.player.backpack; i++) s.inventory[i] = { id: 'stone', n: 99 };
  quests.payReward(s, { items: [['bread', 3]] });
  assert.deepEqual(s.pending, [['bread', 3]]);
  s.inventory[5] = null;
  assert.deepEqual(quests.flushPending(s), [['bread', 3]]);
  assert.equal(s.pending.length, 0);
});

test('bulletin board: requests are seeded per day, accepted, delivered for gold and friendship', () => {
  const a = fresh(3), b = fresh(3);
  assert.deepEqual(quests.postRequest(a), quests.postRequest(b));
  const r = a.board.request;
  assert.ok(ITEMS_BY_ID[r.item] && r.n > 0 && r.reward >= 60);
  quests.acceptRequest(a);
  assert.equal(a.board.request, null);
  Inv.add(a, r.item, r.n);
  const d = quests.deliverables(a, r.npc).find(x => x.kind === 'request');
  const m0 = a.player.money, f0 = a.npcs[r.npc].points;
  quests.deliver(a, d);
  assert.equal(a.player.money, m0 + r.reward);
  assert.equal(a.npcs[r.npc].points, f0 + FRIENDSHIP.requestReward);
  assert.equal(a.requests.length, 0);
});

test('villagers: schedules by weekday and weather, talking and gifts build friendship', () => {
  const s = fresh();
  const sched = npc.scheduleFor(s, 'pip');
  assert.equal(npc.entryAt(sched, 7 * 60).hidden, true);
  assert.equal(npc.entryAt(sched, 10 * 60).map, 'store');
  s.date.day = 3; // Wednesday: the shop is shut and Pip goes walking
  assert.equal(cal.weekday(s.date), 'Wed');
  assert.equal(npc.entryAt(npc.scheduleFor(s, 'pip'), 10 * 60).map, 'forest');
  s.date.day = 1;
  s.weather.today = 'rain';
  assert.equal(npc.entryAt(npc.scheduleFor(s, 'juni'), 13 * 60).x, 10);
  // talking: once a day counts
  const t1 = npc.talk(s, 'bram');
  assert.ok(t1.first); assert.equal(t1.gained, FRIENDSHIP.talk);
  assert.equal(npc.talk(s, 'bram').gained, 0);
  // gift tastes
  assert.equal(npc.giftTaste('bram', 'iron_bar'), 'loved');
  assert.equal(npc.giftTaste('bram', 'berrytart'), 'hated');
  assert.equal(npc.giftTaste('bram', 'quartz'), 'liked');
  assert.equal(npc.giftTaste('juni', 'wildgarlic'), 'liked');
  assert.equal(npc.giftTaste('juni', 'bread'), 'neutral');
  assert.equal(npc.canGift(s, 'bram', 'iron_bar'), true);
  assert.equal(npc.canGift(s, 'bram', 'hoe'), false, 'no gifting tools');
  npc.giveGift(s, 'bram', 'iron_bar');
  assert.equal(npc.canGift(s, 'bram', 'coal'), false, 'one gift a day');
  // birthdays triple it
  s.date = { ...s.date, season: 0, day: 9 };
  const g = npc.giveGift(s, 'pip', 'strawberry');
  assert.equal(g.gained, FRIENDSHIP.gift.loved * FRIENDSHIP.birthdayMultiplier);
  // friendship caps at 10 hearts and unlocks gifts and recipes
  npc.addPoints(s, 'juni', 99999);
  assert.equal(npc.hearts(s, 'juni'), 10);
  s.npcs.juni.met = true;
  const t = npc.talk(s, 'juni');
  assert.ok(t.gifts.some(([id]) => id === 'acorn'));
  assert.ok(crafting.knownRecipes(s).some(r => r.id === 'trailmix'));
  // the fisherman hands over his rod the first time you meet
  assert.ok(npc.talk(s, 'teodor').gifts.some(([id]) => id === 'rod'));
});

test('shops: hours, stock tiers, purchases validate, tool and farm upgrades apply', () => {
  const s = fresh();
  s.date.minutes = 8 * 60;
  assert.equal(eco.shopStatus(s, 'pip').open, false);
  s.date.minutes = 10 * 60;
  assert.equal(eco.shopStatus(s, 'pip').open, true);
  s.date.day = 3;
  assert.equal(eco.shopStatus(s, 'pip').open, false, 'closed Wednesdays');
  s.date.day = 13;
  assert.match(eco.shopStatus(s, 'pip').why, /Seedling Fair/);
  s.date.day = 1;
  const stock = eco.shopStock(s, 'pip');
  const turnip = stock.find(e => e.item === 'seed_turnip');
  assert.equal(stock.find(e => e.item === 'seed_cauliflower').kind, 'locked');
  assert.equal(stock.find(e => e.item === 'seed_tomato'), undefined, 'out of season');
  s.stats.shippedTotal = 50;
  assert.equal(eco.shopStock(s, 'pip').find(e => e.item === 'seed_cauliflower').kind, 'item');
  s.player.money = 30;
  assert.equal(eco.buy(s, turnip, 2), false);
  assert.equal(s.player.money, 30);
  assert.ok(eco.buy(s, turnip, 1));
  assert.equal(s.player.money, 10);
  // tool upgrade needs gold and bars
  s.player.money = 5000;
  const up = eco.shopStock(s, 'bram').find(e => e.kind === 'tool' && e.tool === 'axe');
  assert.match(eco.buyProblem(s, up), /materials/);
  Inv.add(s, 'copper_bar', 5);
  assert.ok(eco.buy(s, up));
  assert.equal(s.tools.axe, 1); assert.equal(Inv.count(s, 'copper_bar'), 0); assert.equal(s.player.money, 4000);
  // the north field expansion
  const nf = eco.shopStock(s, 'mabel').find(e => e.upgrade === 'northfield');
  Inv.add(s, 'wood', 150); Inv.add(s, 'stone', 50);
  s.player.money = 2500;
  assert.equal(W.tillable(s, 'farm', 20, 4), false);
  assert.ok(eco.buy(s, nf));
  assert.equal(s.unlocks.northfield, true);
  assert.equal(eco.shopStock(s, 'mabel').some(e => e.upgrade === 'northfield'), false);
  assert.ok(Object.keys(s.maps.farm.objects).some(k => +k.split(',')[1] < 8), 'the new field has its own debris');
  // selling at a shop
  Inv.add(s, 'turnip', 2);
  const slot = s.inventory.findIndex(x => x?.id === 'turnip');
  assert.equal(eco.sellToShop(s, 'bram', slot, 2), 0, 'the smith does not buy turnips');
  assert.equal(eco.sellToShop(s, 'pip', slot, 2), 70);
});

test('crafting and machines: recipes consume ingredients, the furnace and jar take time', () => {
  const s = fresh();
  const chest = RECIPES.find(r => r.id === 'chest');
  assert.ok(crafting.craftProblem(s, chest));
  Inv.add(s, 'wood', 50);
  assert.ok(crafting.craft(s, chest));
  assert.equal(Inv.count(s, 'wood'), 0); assert.equal(Inv.count(s, 'chest'), 1);
  assert.equal(crafting.craft(s, RECIPES.find(r => r.id === 'veggiesoup')), false, 'cooking needs the kitchen');
  // furnace: 5 ore + 1 coal -> a bar in an hour
  const furnace = { t: 'furnace' };
  Inv.add(s, 'copper_ore', 5);
  assert.match(crafting.loadMachine(s, furnace, 'copper_ore').error, /coal/i);
  Inv.add(s, 'coal', 1);
  assert.equal(crafting.loadMachine(s, furnace, 'copper_ore').out, 'copper_bar');
  assert.equal(Inv.count(s, 'copper_ore'), 0);
  assert.equal(crafting.machineReady(s, furnace), false);
  s.date.minutes += 60;
  assert.equal(crafting.machineReady(s, furnace), true);
  assert.equal(crafting.collectMachine(s, furnace).out, 'copper_bar');
  assert.equal(furnace.job, null);
  // jar: ready the next morning
  const jar = { t: 'jar' };
  Inv.add(s, 'strawberry', 1);
  assert.equal(crafting.loadMachine(s, jar, 'strawberry').out, 'jam_strawberry');
  s.date.minutes = 23 * 60;
  assert.equal(crafting.machineReady(s, jar), false);
  endDay(s);
  assert.equal(crafting.machineReady(s, jar), true);
  assert.ok(ITEMS_BY_ID.jam_strawberry.price > ITEMS_BY_ID.strawberry.price);
});

test('fishing: the right fish bite in the right place and the minigame can be won and lost', () => {
  const s = fresh();
  s.date.minutes = 10 * 60;
  const lake = fishing.fishHere(s, 'lake').map(f => f.id);
  assert.ok(lake.includes('perch') && !lake.includes('trout') && !lake.includes('eel'));
  s.weather.today = 'rain'; s.date.minutes = 20 * 60;
  assert.ok(fishing.fishHere(s, 'lake').some(f => f.id === 'eel'), 'eels on rainy evenings');
  assert.ok(fishing.fishHere(s, 'forest').every(f => f.where.includes('forest')));
  const easy = FISH.find(f => f.id === 'bream');
  const g = fishing.createMinigame(easy, 0, mulberry32(4));
  while (!g.done) { const c = g.bar + g.barSize / 2; fishing.stepMinigame(g, 1 / 30, g.pos > c); }
  assert.equal(g.done, 'caught');
  const h = fishing.createMinigame(easy, 0, mulberry32(4));
  fishing.stepMinigame(h, 30, false); // never holding: the bar sits at the bottom, the fish swims off
  assert.equal(h.done, 'lost');
  // deterministic: same seed, same result
  const a = fishing.createMinigame(FISH[3], 1, mulberry32(9)), b = fishing.createMinigame(FISH[3], 1, mulberry32(9));
  fishing.stepMinigame(a, 2, true); fishing.stepMinigame(b, 2, true);
  assert.equal(a.pos, b.pos);
});

test('festivals: villagers gather, shops close, the show is judged and the day moves on', () => {
  const s = fresh();
  s.date = { day: 16, season: 2, year: 1, minutes: 10 * 60 };
  s.player.map = 'town';
  const f = festival.festivalNow(s);
  assert.equal(f.id, 'harvest');
  assert.equal(npc.entryAt(npc.scheduleFor(s, 'teodor'), 10 * 60).map, 'town');
  Inv.add(s, 'pumpkinpie', 1);
  const r = festival.judgeEntry(s, f, 'pumpkinpie');
  assert.equal(r.place, 1);
  assert.equal(Inv.count(s, 'ribbon'), 1);
  festival.endFestival(s, f);
  assert.equal(festival.festivalNow(s, 'town'), null);
  assert.equal(s.date.minutes, f.endsAt);
  assert.equal(s.player.map, 'farm');
  // the fair swap hands seeds out once per villager
  const t = fresh();
  t.date = { day: 13, season: 0, year: 1, minutes: 10 * 60 };
  const fair = festival.todaysFestival(t);
  assert.ok(festival.seedSwap(t, fair, 'juni'));
  assert.equal(festival.seedSwap(t, fair, 'juni'), null);
});

test('journal: tracks what you have found', () => {
  const s = fresh();
  const j0 = journal(s);
  assert.equal(j0.found, 0);
  s.stats.harvested.turnip = 3; s.stats.caught.perch = 1; s.seen.quartz = true;
  const j = journal(s);
  assert.equal(j.found, 3);
  assert.ok(j.percent > 0);
});

test('the game controller runs the whole loop: walk out, till, plant, water, sleep, harvest, ship, get paid', () => {
  const s = fresh(11);
  const g = new Game(s, { autosave: false });
  // walk south out of the house
  for (let i = 0; i < 400 && s.player.map === 'house'; i++) g.update(1 / 60, { dx: 0, dy: 1 });
  assert.equal(s.player.map, 'farm', 'walked out of the front door');
  // the clock moves while you play
  const m0 = s.date.minutes;
  for (let i = 0; i < 60 * 8; i++) g.update(1 / 60, { dx: 0, dy: 0 });
  assert.ok(s.date.minutes > m0);
  const [x, y] = openPlot(s);
  g.changeMap('farm', x, y - 1, 'down');
  const hoe = s.inventory.findIndex(i => i?.id === 'hoe');
  g.selectSlot(hoe); g.useAction(); g.swing = null;
  assert.ok(W.soilAt(s, 'farm', x, y));
  g.selectSlot(s.inventory.findIndex(i => i?.id === 'seed_turnip')); g.useAction();
  assert.equal(W.soilAt(s, 'farm', x, y).c.id, 'turnip');
  for (let d = 0; d < 4; d++) {
    s.weather.tomorrow = 'sun';
    g.changeMap('farm', x, y - 1, 'down');
    g.selectSlot(s.inventory.findIndex(i => i?.id === 'can')); g.useAction(); g.swing = null;
    g.finishDay(false);
    g.paused = false;
  }
  g.changeMap('farm', x, y - 1, 'down');
  assert.equal(g.interaction(x, y).label, 'Harvest Turnip');
  g.interact();
  assert.equal(Inv.count(s, 'turnip'), 1);
  // ship it from in front of the bin
  g.changeMap('farm', 10, 8, 'up');
  g.selectSlot(s.inventory.findIndex(i => i?.id === 'turnip'));
  assert.match(g.interaction(10, 7).label, /Ship 1/);
  g.interact();
  assert.equal(s.shipping.length, 1);
  const money = s.player.money;
  const sum = g.finishDay(false);
  assert.equal(sum.total, 35);
  assert.equal(s.player.money, money + 35);
  assert.ok(s.quests.done.includes('first-crop'));
});

test('the game controller: villagers walk their routes and block the player; passing out at 2am', () => {
  const s = fresh(12);
  const g = new Game(s, { autosave: false });
  s.date.minutes = 8 * 60 + 59;
  g.placeNpcs(true);
  g.changeMap('town', 20, 14, 'up');
  assert.equal(g.npcs.odessa.hidden, true);
  for (let i = 0; i < 60 * 30 && (g.npcs.odessa.hidden || g.npcs.odessa.path); i++) g.update(1 / 60, { dx: 0, dy: 0 });
  const [ox, oy] = W.tileOf(g.npcs.odessa.x, g.npcs.odessa.y);
  assert.deepEqual([ox, oy], [20, 11], 'Odessa walked to the square');
  // she blocks the player
  g.changeMap('town', 20, 13, 'up');
  for (let i = 0; i < 120; i++) g.update(1 / 60, { dx: 0, dy: -1 });
  assert.equal(W.tileOf(s.player.x, s.player.y)[1], 12);
  // stay up too late
  let ended = null;
  g.ui = new Proxy({}, { get: (_, k) => (k === 'dayEnd' ? (sum, cont) => { ended = sum; cont(); } : () => {}) });
  s.date.minutes = 26 * 60 - 1;
  s.player.money = 2000;
  g.clockMs = 0;
  for (let i = 0; i < 20 && !ended; i++) g.update(0.1, { dx: 0, dy: 0 });
  assert.ok(ended && ended.penalty === 200);
  assert.equal(s.player.map, 'house');
  assert.equal(s.date.day, 2);
});

test('play site lists Little Acre with a banner', () => {
  const games = JSON.parse(fs.readFileSync(new URL('../../play/public/games.json', import.meta.url)));
  const g = games.find(x => x.name === 'Little Acre');
  assert.ok(g, 'listed on the arcade homepage');
  assert.equal(g.url, 'https://missing.website/little-acre/');
  assert.ok(fs.existsSync(new URL('../../play/public' + g.image, import.meta.url)));
  assert.ok(fs.existsSync(new URL('../../little-acre/index.html', import.meta.url)));
});


// Floor generation: turns a floor template into a concrete floor — a small map of rooms with
// searchable objects, loot, hidden lost property, clues, encounters, a lock and maybe a task.
import { makeRng } from './rng.js';
import { LOST, ITEMS } from './data/items.js';
import { CLUES } from './data/clues.js';
import { makePuzzle } from './puzzles.js';

const NOTHING = ['Dust, a paperclip, and a feeling of having been here before.', 'Nothing. Someone has been here before you, tidily.', 'An old receipt for a lift ride: "1 FLOOR — PAID".', 'Empty, apart from a very small spider who looks busy.', 'A note: "back in 5 minutes". The ink is decades old.', 'Nothing useful. A button, though not the kind you need.', 'Only a faint smell of somebody\'s perfume.', 'A pencil stub and a crossword clue: "where lost things go (5,8)".', 'Nothing but a mint, which you leave out of respect.'];
const HURTS = [['A mousetrap snaps on your finger.', 6], ['Static shock. Your hair stands up.', 4], ['Something skitters away over your hand.', 5], ['You bang your head on the way out.', 4], ['A pile of things falls on you, softly but at length.', 5], ['You find a photo of yourself, taken tonight, from behind.', 8]];
const ITEM_POOL = [['candy', 6], ['coffee', 5], ['sandwich', 4], ['tuna', 3], ['flare', 3], ['tea', 2], ['lucky_coin', 1], ['skeleton_key', 0.8], ['stopwatch', 0.5]];

const matchSrc = (src, f) => src.includes(f.id) || src.includes(f.cat);

export function generateFloor(def, opts) {
  const { seed, layoutSeed = seed, S, gilded = false, changed = false, pickEnc, nameOverride, tierBoost = 0 } = opts;
  if (def.id === 'thirteen') return generateThirteen(def, opts);
  const L = makeRng(layoutSeed), R = makeRng(seed);
  const tier = Math.min(4, (def.tier || 1) + tierBoost);
  const small = def.kind === 'anomaly' || def.kind === 'secret';
  const N = small ? L.int(4, 5) : L.int(5, 8) + (gilded ? 1 : 0);
  const W = N > 7 ? 5 : 4, H = 3;

  // layout: grow a tree of cells from the lift lobby, then add a few loops
  const cells = [], at = {};
  const add = (x, y) => { const id = cells.length; cells.push({ id, x, y, adj: [] }); at[x + ',' + y] = id; return id; };
  const link = (a, b) => { if (!cells[a].adj.includes(b)) { cells[a].adj.push(b); cells[b].adj.push(a); } };
  add(0, L.int(0, H - 1));
  let guard = 0;
  while (cells.length < N && guard++ < 500) {
    const c = L.pick(cells);
    const [dx, dy] = L.pick([[1, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]);
    const nx = c.x + dx, ny = c.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || at[nx + ',' + ny] !== undefined) continue;
    link(c.id, add(nx, ny));
  }
  for (const c of cells) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const o = at[(c.x + dx) + ',' + (c.y + dy)];
    if (o !== undefined && L.chance(0.22)) link(c.id, o);
  }

  // rooms
  const pool = R.shuffle(def.rooms);
  const used = {};
  const rooms = cells.map((c, i) => {
    let name, desc;
    if (i === 0) { name = 'Lift Lobby'; desc = 'The lift waits behind you, doors open, light spilling out.'; }
    else {
      const [n, d] = pool[(i - 1) % pool.length].split('|');
      used[n] = (used[n] || 0) + 1;
      name = used[n] > 1 ? `${n} (${['', '', 'II', 'III', 'IV'][used[n]] || used[n]})` : n;
      desc = d;
    }
    const objCount = i === 0 ? R.int(0, 1) : R.int(1, 3);
    const objs = R.shuffle(def.objects).slice(0, objCount).map(n => ({ n, done: false, loot: rollLoot(R, def, tier, gilded) }));
    return { id: i, x: c.x, y: c.y, adj: c.adj.slice(), name, desc, objs, enc: null, lock: null, visited: i === 0, seen: i === 0 };
  });
  for (const id of rooms[0].adj) rooms[id].seen = true;

  const floor = {
    type: def.id, name: nameOverride || (gilded ? 'Gilded ' : '') + (def.variants.length ? R.pick(def.variants) : def.name),
    seed, layoutSeed, gilded, changed, tier, dark: false, lit: false, revealed: false, rooms, w: W, h: H,
    task: null, notes: [], visits: 0, arrivedEnc: false,
  };
  const anyObj = (filter = () => true) => {
    const list = [];
    rooms.forEach(r => r.objs.forEach((o, oi) => { if (filter(r, o)) list.push([r, oi]); }));
    return list.length ? R.pick(list) : null;
  };
  const ensureObj = (room) => { if (!room.objs.length) room.objs.push({ n: R.pick(def.objects), done: false, loot: rollLoot(R, def, tier, gilded) }); return room.objs.length - 1; };
  const place = (loot, filter) => {
    let spot = anyObj((r, o) => r.id !== 0 && !r.lock && !o.loot.special && filter?.(r, o) !== false);
    if (!spot) { const r = rooms.find(x => x.id !== 0 && !x.lock) || rooms[rooms.length - 1]; spot = [r, ensureObj(r)]; }
    const [r, oi] = spot; r.objs[oi].loot = { ...loot, special: true };
    return r;
  };

  // darkness
  if (def.darkChance && R.chance(def.darkChance)) floor.dark = true;

  // lock fixed by template (override key, thirteenth button)
  if (def.lockFixed) {
    const lf = def.lockFixed;
    const owned = lf.reward.t === 'item' && (S.items[lf.reward.id] || 0) > 0;
    const host = rooms.filter(r => r.id !== 0).sort((a, b) => a.adj.length - b.adj.length)[0] || rooms[0];
    const free = [[1, 0], [0, 1], [0, -1], [-1, 0]].map(([dx, dy]) => [host.x + dx, host.y + dy]).find(([x, y]) => x >= 0 && y >= 0 && x < W + 1 && y < H && !rooms.some(r => r.x === x && r.y === y));
    const [x, y] = free || [W, host.y];
    if (x >= floor.w) floor.w = x + 1;
    const [n, d] = lf.room.split('|');
    const room = { id: rooms.length, x, y, adj: [host.id], name: n, desc: d, objs: [{ n: 'cabinet', done: false, loot: owned ? { t: 'cash', n: R.int(20, 40) } : { ...lf.reward, special: true } }], enc: null, lock: owned ? null : { kind: 'puzzle', puzzle: makePuzzle(lf.puzzle, R, tier) }, visited: false, seen: false, fixedLock: true };
    host.adj.push(room.id); rooms.push(room);
  }

  // random lock
  if (!small && !def.lockFixed && R.chance(0.55)) {
    const cands = rooms.filter(r => r.id !== 0);
    const leaf = cands.filter(r => r.adj.length === 1);
    const room = R.pick(leaf.length ? leaf : cands);
    if (room && rooms.length > 2) {
      const kind = R.weighted(['keypad', 'fuses', 'valves', 'cipher', 'chime', 'crowbar', 'lockpicks', 'keycard_blue'], k => ({ keypad: 30, fuses: 16, valves: 12, cipher: 12, chime: 8, crowbar: 9, lockpicks: 8, keycard_blue: 5 })[k]);
      if (ITEMS[kind]) room.lock = { kind: 'item', item: kind };
      else room.lock = { kind: 'puzzle', puzzle: makePuzzle(kind, R, tier) };
      ensureObj(room);
      room.objs.forEach(o => { if (!o.loot.special) o.loot = rollLoot(R, def, tier + 1, gilded, true); });
      room.objs[0].loot = R.chance(0.5) ? { t: 'token', n: 1 } : { t: 'cash', n: R.int(25, 45) * tier };
      if (kind === 'keypad') {
        const code = room.lock.puzzle.code;
        place({ t: 'code', code, text: R.pick([`A sticky note: "door code ${code} — don't tell facilities"`, `Scratched into the wood: ${code}`, `A post-it in neat handwriting: ${code.split('').join(' ')}`, `On the back of a business card: "${code}. Obviously."`]) }, r => r.id !== room.id);
      }
    }
  }

  // template-fixed loot (keycards, keys, blueprints, story clues)
  for (const fx of def.fixed || []) {
    if (fx.t === 'item' && S.items[fx.id]) continue;
    if (fx.t === 'bp' && S.blueprints[fx.id]) continue;
    if (fx.t === 'clue' && S.clues[fx.id]) continue;
    place({ t: fx.t, id: fx.id, need: fx.need });
  }

  // lost property
  const eye = S.upgrades.eye || 0;
  const cats = [def.id, def.cat]; if (floor.dark) cats.push('dark');
  const lostChance = 0.42 + eye * 0.1 + (S.flags.catAdopted ? 0.06 : 0) + (gilded ? 0.35 : 0) + (def.kind === 'anomaly' ? 0.3 : 0);
  const lostPool = LOST.filter(l => !S.lost[l.id] && l.cats.some(c => cats.includes(c)));
  if (lostPool.length && R.chance(lostChance)) {
    const l = R.pick(lostPool);
    place({ t: 'lost', id: l.id, need: l.need });
  }
  // clue documents
  const nClues = Object.keys(S.clues).length;
  const clueChance = 0.36 + (def.cat === 'culture' ? 0.2 : 0) + (nClues < 8 && S.night > 4 ? 0.15 : 0);
  const cluePool = CLUES.filter(c => !S.clues[c.id] && c.src.length && matchSrc(c.src, def));
  if (cluePool.length && R.chance(clueChance)) place({ t: 'clue', id: R.pick(cluePool).id });

  // encounters
  const encN = small ? 1 : R.int(1, 2) + (rooms.length >= 7 ? 1 : 0);
  const encIds = pickEnc ? pickEnc(R, encN, def) : [];
  const encRooms = R.shuffle(rooms.filter(r => r.id !== 0 && !r.lock));
  encIds.forEach((id, i) => { const r = encRooms[i % Math.max(1, encRooms.length)]; if (r && !r.enc) r.enc = { id, done: false, local: {} }; });

  // floor task
  if (!small && R.chance(0.5)) {
    const lockRoom = rooms.find(r => r.lock);
    const kind = R.weighted(['find', 'searchAll', 'unlock'], k => k === 'unlock' ? (lockRoom ? 2 : 0) : k === 'find' ? 3 : 2);
    const reward = { cash: R.int(18, 34) * tier, token: R.chance(0.25) ? 1 : 0 };
    if (kind === 'find' && def.quest.length) {
      const thing = R.pick(def.quest);
      place({ t: 'quest', text: thing });
      floor.task = { kind, text: `Find ${thing}.`, done: false, reward };
    } else if (kind === 'unlock' && lockRoom) {
      floor.task = { kind, text: `Get into the ${lockRoom.name}.`, room: lockRoom.id, done: false, reward };
    } else {
      floor.task = { kind: 'searchAll', text: 'Search everything on this floor.', done: false, reward };
    }
  }
  return floor;
}

export function rollLoot(R, def, tier, gilded, rich = false) {
  const k = R.weighted(['none', 'cash', 'item', 'hurt', 'tickets', 'token'], t => ({ none: rich ? 8 : 30, cash: rich ? 50 : 36, item: rich ? 22 : 13, hurt: rich ? 2 : 6, tickets: def.cat === 'arcade' ? 12 : 0, token: rich ? 6 : 1.4 })[t]);
  if (k === 'cash') return { t: 'cash', n: Math.round(R.int(3, 10) * (1 + (tier - 1) * 0.6) * (gilded ? 2 : 1)) };
  if (k === 'item') return { t: 'item', id: R.weighted(ITEM_POOL, x => x[1])[0] };
  if (k === 'hurt') { const [text, n] = R.pick(HURTS); return { t: 'hurt', text, n }; }
  if (k === 'tickets') return { t: 'tickets', n: R.int(3, 12) };
  if (k === 'token') return { t: 'token', n: 1 };
  return { t: 'none', text: R.pick(NOTHING) };
}

// Floor 13 is handmade: the long shelves of lost things, the directory, and the office.
function generateThirteen(def, opts) {
  const { seed, S } = opts;
  const R = makeRng(seed);
  const lostLeft = LOST.filter(l => !S.lost[l.id] && !l.need);
  const pickLost = () => { const l = lostLeft.splice(R.int(0, Math.max(0, lostLeft.length - 1)), 1)[0]; return l ? { t: 'lost', id: l.id, special: true } : { t: 'cash', n: R.int(30, 60) }; };
  const rooms = [
    { id: 0, x: 0, y: 1, adj: [1], name: 'Landing 13', desc: 'The lift waits behind you. A brass plate on the wall: 13. It looks like it has been polished every day for ninety years.', objs: [], enc: null, lock: null, visited: true, seen: true },
    { id: 1, x: 1, y: 1, adj: [0, 2, 3], name: 'The Long Shelves', desc: 'Shelves of lost things going up out of sight, each with a little brown label. Umbrellas. Gloves. Letters. A whole shelf of keys.', objs: [{ n: 'umbrella shelf', done: false, loot: pickLost() }, { n: 'glove drawer', done: false, loot: pickLost() }, { n: 'letter rack', done: false, loot: S.clues.c_lost_umbrellas ? { t: 'cash', n: 40 } : { t: 'clue', id: 'c_lost_umbrellas', special: true } }], enc: null, lock: null, visited: false, seen: true },
    { id: 2, x: 1, y: 0, adj: [1], name: 'The Directory', desc: 'A great board listing every floor of the building, the ordinary ones and the others, in white letters. Some are names you know. Some you have never seen.', objs: [{ n: 'directory board', done: false, loot: { t: 'none', text: 'At the very bottom, in small letters: "13 — LOST PROPERTY. ALL WELCOME."' } }], enc: null, lock: null, visited: false, seen: false },
    { id: 3, x: 2, y: 1, adj: [1], name: 'The Office of the Building', desc: 'A quiet office with a window. A desk, a lamp, a chair, and an old cap on a hook. Through the window, the city at night. One window across the street is lit, high up, and someone in it is drawing.', objs: [], enc: { id: 'office13', done: false, local: {} }, lock: { kind: 'puzzle', puzzle: { type: 'keypad', code: '1931', tries: 0 }, hint: 'A brass plate under the keypad: "THE YEAR THE STONE WAS LAID".' }, visited: false, seen: true },
  ];
  return { type: 'thirteen', name: 'Floor 13', seed, layoutSeed: seed, gilded: false, changed: false, tier: 4, dark: false, lit: false, revealed: true, rooms, w: 3, h: 2, task: null, notes: [], visits: 0, arrivedEnc: true };
}

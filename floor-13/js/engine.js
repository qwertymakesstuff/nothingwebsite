// Game engine: nights, rides, floors, searching, locks, encounters, progression and
// achievements. No DOM here — the UI calls these methods and renders the save object.
import { makeRng, randomSeed, hashStr } from './rng.js';
import { loadSave, writeSave, clearSave, freshSave } from './state.js';
import { FLOORS, FLOOR_BY_ID, NORMAL_FLOORS, ANOMALY_FLOORS } from './data/floors.js';
import { ITEMS, LOST, LOST_BY_ID, BLUEPRINTS } from './data/items.js';
import { CLUES, CLUE_BY_ID, CLUES_FOR_13 } from './data/clues.js';
import { ENCOUNTERS, ENC_BY_ID, NPCS } from './data/encounters.js';
import { ACHIEVEMENTS, ACH_BY_ID } from './data/achievements.js';
import { UPGRADES, UPGRADE_BY_ID } from './data/upgrades.js';
import { ENDINGS } from './data/endings.js';
import { generateFloor } from './gen.js';
import { PUZZLE_NAMES } from './puzzles.js';

export const NIGHT_START = 21 * 60; // 9:00 PM
export const BASE_END = 9 * 60;     // 6:00 AM, in minutes after 9 PM
export const HOUR_313 = [360, 386]; // 3:00–3:26 AM
export const BUTTONS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const EXCLUSIVE_CLUE_SRC = ['halffloor', 'b3', 'studio'];

export function fmtClock(m) {
  const t = (NIGHT_START + Math.round(m)) % 1440;
  let h = Math.floor(t / 60); const mm = t % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${h}:${String(mm).padStart(2, '0')} ${ap}`;
}

export class Game {
  constructor(storage) {
    this.storage = storage;
    this.S = loadSave(storage);
    this.listeners = {};
    this.enc = null; // active encounter (closures, not saved)
  }
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, data) { for (const fn of this.listeners[ev] || []) fn(data); }
  save() { writeSave(this.S, this.storage); }
  reset() { clearSave(this.storage); const settings = this.S.settings; this.S = freshSave(); this.S.settings = settings; this.enc = null; this.save(); }

  // ───────── derived numbers ─────────
  get R() { return this.S.run; }
  up(id) { return this.S.upgrades[id] || 0; }
  has(id) { return (this.S.items[id] || 0) > 0; }
  maxComp() { return 100 + 20 * this.up('nerves') + (this.S.flags.clockStopped ? 10 : 0); }
  rideTime() { return [15, 10, 6][this.up('express')] - (this.S.flags.inspected ? 2 : 0); }
  moveTime() { return [5, 4, 3][this.up('shoes')]; }
  endTime() { return BASE_END + 45 * this.up('night') + (this.S.flags.clockWound ? 20 : 0); }
  price(n) { return Math.max(1, Math.round(n * (this.up('haggle') ? 0.8 : 1))); }
  cashMult() { return (1 + 0.15 * this.up('eye')) * (this.S.flags.wellGranted ? 1.1 : 1) * (this.S.flags.catAdopted ? 1.05 : 1); }
  clueCount() { return Object.keys(this.S.clues).length; }
  floor() { return this.R && this.R.cur ? this.R.floors[this.R.cur] : null; }
  floorDef() { const f = this.floor(); return f ? FLOOR_BY_ID[f.type] : null; }
  room() { const f = this.floor(); return f ? f.rooms[this.R.room] : null; }
  isHour() { return !!this.R && this.R.clock >= HOUR_313[0] && this.R.clock <= HOUR_313[1]; }
  wiredButtons() { return BUTTONS.slice(0, 4 + 4 * this.up('buttons')); }

  // secret buttons on the panel: shown when you have what they need
  secretButtons() {
    const S = this.S, out = [];
    if (this.up('hatch')) out.push({ key: '6½', floor: 'halffloor', ok: this.has('override_key'), why: 'The keyhole needs the Elevator Override Key.' });
    if (this.has('lounge_key')) out.push({ key: 'L', floor: 'lounge', ok: true });
    if (this.has('brass_key')) out.push({ key: '★', floor: 'studio', ok: true });
    if (this.has('bolt_cutters')) out.push({ key: 'B3', floor: 'b3', ok: true });
    if (this.has('thirteenth_button')) out.push({ key: '13', floor: 'thirteen', ok: this.clueCount() >= CLUES_FOR_13, why: `The button is there, but it won't press. You don't understand enough yet (${this.clueCount()}/${CLUES_FOR_13} clues).` });
    return out;
  }
  buttonLabel(key) {
    const R = this.R; if (!R) return null;
    const id = R.assign[key]; if (!id) return null;
    if (this.up('directory') || R.floors['n' + key]) return R.floors['n' + key]?.name || FLOOR_BY_ID[id].name;
    return null;
  }

  // ───────── nights ─────────
  newNight() {
    const S = this.S;
    if (S.run) return;
    S.night++; S.stats.nightsStarted++;
    const seed = randomSeed();
    const rng = makeRng(seed);
    // twelve floor types for tonight; low buttons favour easy, open floors
    const chosen = rng.shuffle(NORMAL_FLOORS).slice(0, 12)
      .map(f => ({ f, k: (f.req ? 3 : 0) + f.tier + rng() * 2.2 }))
      .sort((a, b) => a.k - b.k).map(x => x.f.id);
    const assign = {}; BUTTONS.forEach((b, i) => { assign[b] = chosen[i]; });
    const hum = this.up('speaker') ? rng.shuffle(this.wiredButtons()).slice(0, 2) : [];
    S.run = { seed, clock: 0, comp: this.maxComp(), pocket: 0, assign, floors: {}, cur: null, room: 0, rides: 0, floorsVisited: 0, rooms: 0,
      minCompPct: 100, flags: {}, log: [], encCount: {}, hum, counter: 0, lastNormal: null, display: 'L', found: [], newClues: [], bellUsed: false, lastKey: null };
    if (this.up('thermos')) this.give('tea');
    this.log(`Night ${S.night}. The lift hums awake. It is ${fmtClock(0)}.`);
    this.save(); this.checkAch();
  }

  log(text) { if (this.R) { this.R.log.push(text); if (this.R.log.length > 40) this.R.log.shift(); } }

  // ───────── riding ─────────
  canRide(key) {
    const R = this.R; if (!R) return { ok: false, why: 'Begin the night first.' };
    if (R.cur) return { ok: false, why: 'You need to be in the lift.' };
    if (key === 'R') return { ok: true };
    if (BUTTONS.includes(key)) return this.wiredButtons().includes(key) ? { ok: true } : { ok: false, why: 'That button isn\'t wired up. (Upgrade: Floor Buttons)' };
    const sb = this.secretButtons().find(b => b.key === key);
    if (!sb) return { ok: false, why: 'There is no such button.' };
    return sb.ok ? { ok: true } : { ok: false, why: sb.why };
  }

  ride(key) {
    const chk = this.canRide(key); if (!chk.ok) return { ok: false, text: chk.why };
    const S = this.S, R = this.R;
    const rng = makeRng(randomSeed());
    const events = [];
    let def, fkey, isRandom = key === 'R';
    const anomalyP = 0.05 + (this.up('mirror') ? 0.05 : 0) + (S.flags.deed ? 0.03 : 0) + Math.min(0.03, S.night * 0.002);
    if (isRandom || (BUTTONS.includes(key) && rng.chance(0.012 + (S.flags.deed ? 0.01 : 0)))) {
      if (!isRandom) events.push('The indicator spins past the number you pressed. The car keeps going somewhere else.');
      if (rng.chance(isRandom ? anomalyP : 1)) def = this.pickAnomaly(rng);
      if (!def) {
        const pool = NORMAL_FLOORS;
        def = rng.weighted(pool, f => (S.floorsSeen[f.id] ? 1 : 2.2));
      }
      fkey = (def.kind === 'anomaly' ? 'a' : 'r') + (++R.counter);
    } else if (BUTTONS.includes(key)) { def = FLOOR_BY_ID[R.assign[key]]; fkey = 'n' + key; }
    else { const sb = this.secretButtons().find(b => b.key === key); def = FLOOR_BY_ID[sb.floor]; fkey = sb.floor; }

    // the ride itself
    R.rides++;
    this.time(this.rideTime());
    if (this.up('lantern')) this.comp(6);
    if (R.clock > 180) this.comp(-3); // past midnight, every ride wears on you a little
    if (rng.chance(0.06)) { this.time(8); events.push(rng.pick(['The car stops between floors. The lights dim. Eight long minutes later it shudders and carries on.', 'Someone else\'s floor button lights up, then goes out. The car pauses, thinking, and moves on.', 'The lift music changes to a song you haven\'t heard since you were small.'])); }

    // existing floor? maybe it changed while you were away
    let floor = R.floors[fkey];
    let changed = false;
    if (floor && def.kind === 'normal' && floor.visits > 0 && rng.chance(0.12)) {
      floor = this.buildFloor(def, fkey, { layoutSeed: floor.layoutSeed, changed: true });
      changed = true;
    }
    if (!floor) floor = this.buildFloor(def, fkey, { isRandom });
    R.cur = fkey; R.room = 0; R.lastKey = key;
    floor.visits++;
    R.floorsVisited++; S.stats.floors++;
    S.floorsSeen[floor.type] = (S.floorsSeen[floor.type] || 0) + 1;
    if (def.kind === 'normal') R.lastNormal = { type: def.id, layoutSeed: floor.layoutSeed, name: floor.name };
    if (def.kind === 'anomaly' || changed) { S.stats.anomalies++; this.comp(-6); }
    if (changed) { S.stats.changed++; events.push('Something is different. The rooms are where they were, but… not quite what they were.'); }
    if (floor.gilded && floor.visits === 1) S.stats.gilded++;
    if (def.id === 'thirteen' && !S.stats.first13Night) S.stats.first13Night = S.night;
    if (R.clock >= 373 && R.clock <= 375) this.unlock('witching');
    R.display = key === 'R' ? (def.button || '?') : key;
    this.log(`${fmtClock(R.clock)} — ${floor.name}.`);
    // arrival events (phone, power cut) on first visit
    let arrive = null;
    if (!floor.arrivedEnc) {
      floor.arrivedEnc = true;
      if (def.kind === 'normal' && rng.chance(0.24)) arrive = this.pickEncounters(rng, 1, def, true)[0] || null;
    }
    if (def.req && !this.has(def.req)) floor.blocked = true; else floor.blocked = false;
    this.save(); this.checkAch();
    return { ok: true, floor, def, events, arrive, changed };
  }

  pickAnomaly(rng) {
    const S = this.S, R = this.R;
    const ultraMul = S.flags.deed ? 2 : 1;
    const pool = ANOMALY_FLOORS.filter(f => f.id !== 'samefloor' || R.lastNormal);
    return rng.weighted(pool, f => f.w * (f.ultra ? ultraMul : 1) * (S.floorsSeen[f.id] ? 1 : 1.5));
  }

  buildFloor(def, fkey, { layoutSeed, changed = false, isRandom = false } = {}) {
    const S = this.S, R = this.R;
    const seed = randomSeed();
    let srcDef = def, nameOverride, ls = layoutSeed;
    if (def.dynamic && R.lastNormal) { // "A Familiar Floor": last ordinary floor, rearranged
      srcDef = { ...FLOOR_BY_ID[R.lastNormal.type], id: def.id, cat: 'anomaly', kind: 'anomaly', pal: def.pal, pattern: FLOOR_BY_ID[R.lastNormal.type].pattern };
      ls = R.lastNormal.layoutSeed; nameOverride = R.lastNormal.name + ' (?)';
    }
    const gilded = def.kind === 'normal' && !changed && makeRng(seed ^ 0x5bd1e995).chance(0.03);
    const hum = fkey[0] === 'n' && R.hum.includes(fkey.slice(1));
    const floor = generateFloor(srcDef, {
      seed, layoutSeed: ls ?? seed, S, gilded, changed, nameOverride,
      pickEnc: (rng, n, d) => this.pickEncounters(rng, n, d, false, hum),
    });
    floor.type = def.id; floor.key = fkey;
    if (changed) floor.name = floor.name + ' (changed)';
    if (S.upgrades && this.has('map')) { floor.revealed = true; floor.rooms.forEach(r => { r.seen = true; }); }
    R.floors[fkey] = floor;
    return floor;
  }

  // weighted encounters for a floor; trigger=true picks arrival events instead
  pickEncounters(rng, n, def, trigger = false, forceRare = false) {
    const S = this.S, R = this.R;
    const g = this.ctx(null);
    const matches = e => e.where.some(w => w === def.id || w === def.cat || (w === 'any' && (def.kind === 'normal' || def.kind === 'secret')) || (w === 'anomaly' && def.kind === 'anomaly'));
    const eligible = ENCOUNTERS.filter(e => e.w > 0 && !!e.trigger === trigger && matches(e)
      && (e.minNight || 0) <= S.night
      && !(e.once && S.flags['enc_' + e.id])
      && (R.encCount[e.id] || 0) < (e.perRun || (e.once ? 1 : 99))
      && (!e.cond || safe(() => e.cond(g))));
    const out = [];
    let pool = eligible.slice();
    if (forceRare) { const rare = pool.filter(e => e.rare); if (rare.length) { const e = rng.weighted(rare, x => x.w); out.push(e.id); pool = pool.filter(x => x !== e); } }
    while (out.length < n && pool.length) {
      const e = rng.weighted(pool, x => x.w); if (!e) break;
      out.push(e.id); pool = pool.filter(x => x !== e);
    }
    for (const id of out) R.encCount[id] = (R.encCount[id] || 0) + 1;
    return out;
  }

  // ───────── time & composure ─────────
  time(min) {
    const R = this.R; if (!R) return;
    R.clock = Math.max(0, R.clock + min);
  }
  comp(n) {
    const R = this.R; if (!R) return;
    R.comp = Math.max(0, Math.min(this.maxComp(), R.comp + n));
    R.minCompPct = Math.min(R.minCompPct, Math.round(100 * R.comp / this.maxComp()));
  }
  // call after every action: ends the night at dawn or on a blackout
  settle() {
    const R = this.R; if (!R) return null;
    if (R.comp <= 0) return this.endNight('blackout');
    if (R.clock >= this.endTime()) return this.endNight('dawn');
    return null;
  }

  // ───────── moving around a floor ─────────
  move(roomId) {
    const f = this.floor(), here = this.room(); if (!f || !here) return { ok: false };
    const to = f.rooms[roomId];
    if (!to || !here.adj.includes(roomId)) return { ok: false, text: 'You can\'t get there from here.' };
    if (f.blocked && roomId !== 0) return { ok: false, text: `The doors off the lobby won't open. You need: ${ITEMS[FLOOR_BY_ID[f.type].req].name}.` };
    if (to.lock) return { ok: false, locked: true, room: to };
    this.time(this.moveTime());
    if (f.dark && !f.lit && !this.has('flashlight')) this.comp(-2);
    this.R.room = roomId;
    let first = false;
    if (!to.visited) { to.visited = true; first = true; this.S.stats.rooms++; this.R.rooms++; }
    to.seen = true; for (const a of to.adj) f.rooms[a].seen = true;
    const def = this.floorDef();
    let ambient = null;
    if (def.ambient.length && Math.random() < 0.28) ambient = def.ambient[Math.floor(Math.random() * def.ambient.length)];
    this.save(); this.checkAch();
    return { ok: true, first, ambient, enc: first && to.enc && !to.enc.done ? to.enc : null };
  }

  // walk back to the lift lobby along the shortest path
  pathTo(target) {
    const f = this.floor(); const start = this.R.room;
    const prev = { [start]: -1 }, q = [start];
    while (q.length) { const c = q.shift(); if (c === target) break; for (const a of f.rooms[c].adj) if (prev[a] === undefined && !f.rooms[a].lock) { prev[a] = c; q.push(a); } }
    if (prev[target] === undefined) return null;
    const path = []; for (let c = target; c !== start; c = prev[c]) path.unshift(c);
    return path;
  }
  returnToLift() {
    const R = this.R, f = this.floor(); if (!f) return { ok: false };
    const path = this.pathTo(0) || [];
    this.time(path.length * this.moveTime());
    R.room = 0; R.cur = null;
    this.log(`${fmtClock(R.clock)} — back in the lift.`);
    this.save();
    return { ok: true, steps: path.length };
  }

  // ───────── searching ─────────
  search(objIndex) {
    const R = this.R, f = this.floor(), room = this.room(); if (!room) return { ok: false };
    const o = room.objs[objIndex]; if (!o || o.done) return { ok: false };
    let loot = o.loot;
    this.time(4);
    const dark = f.dark && !f.lit && !this.has('flashlight');
    if (loot.need && !this.has(loot.need)) {
      o.hint = ITEMS[loot.need].name;
      const why = { flashlight: 'Something glints deep at the back, but it\'s too dark to reach it safely.', crowbar: 'Something is wedged in tight behind a panel. You\'d need to lever it out.', uv_lamp: 'There are faint marks here, like writing that isn\'t there. You\'d need some way to see it.', multimeter: 'A live-looking wire guards whatever is in here.' }[loot.need] || 'You need the right tool for this.';
      this.save();
      return { ok: true, text: `${why} (Needs: ${ITEMS[loot.need].name})`, kind: 'need' };
    }
    if (dark && Math.random() < 0.45 && loot.t !== 'lost') {
      this.save();
      return { ok: true, text: 'You fumble in the dark and find only edges and dust. Maybe try again.', kind: 'dark' };
    }
    if (R.flags.lucky && (loot.t === 'none' || loot.t === 'hurt')) { R.flags.lucky = false; loot = { t: 'cash', n: 25 + 10 * f.tier }; }
    else if (R.flags.lucky && loot.t !== 'none') R.flags.lucky = false;
    o.done = true; this.S.stats.searches++;
    const out = this.applyLoot(loot, f);
    if (dark && loot.t !== 'none' && loot.t !== 'hurt') this.unlock('lights_out');
    this.checkTask();
    this.save(); this.checkAch();
    return { ok: true, ...out };
  }

  applyLoot(loot, f) {
    const S = this.S, R = this.R;
    switch (loot.t) {
      case 'cash': { const n = Math.max(1, Math.round(loot.n * this.cashMult())); this.addCash(n); return { text: `$${n}.`, kind: 'cash' }; }
      case 'item': this.give(loot.id); return { text: `${ITEMS[loot.id].name}.`, kind: 'item', id: loot.id };
      case 'token': S.tokens += loot.n; return { text: `A brass elevator token${loot.n > 1 ? 's' : ''}. (+${loot.n})`, kind: 'token' };
      case 'tickets': this.give('tickets', loot.n); return { text: `${loot.n} arcade tickets.`, kind: 'item' };
      case 'clue': { const c = CLUE_BY_ID[loot.id]; this.addClue(loot.id); return { text: `A document: “${c.title}”. (Added to your journal.)`, kind: 'clue', id: loot.id }; }
      case 'lost': { const l = LOST_BY_ID[loot.id]; this.addLost(loot.id); return { text: `Lost property: ${l.name}. ${l.desc}`, kind: 'lost', id: loot.id }; }
      case 'bp': { S.blueprints[loot.id] = Date.now(); R.found.push(BLUEPRINTS[loot.id].name); return { text: `${BLUEPRINTS[loot.id].name}. ${BLUEPRINTS[loot.id].desc}`, kind: 'bp', id: loot.id }; }
      case 'code': f.notes.push(loot.text); return { text: `${loot.text} You note it down.`, kind: 'code' };
      case 'quest': if (f.task && f.task.kind === 'find' && !f.task.done) this.completeTask(f); return { text: `You found ${loot.text}!`, kind: 'quest' };
      case 'hurt': this.comp(-loot.n); return { text: `${loot.text} (−${loot.n} composure)`, kind: 'hurt' };
      default: return { text: loot.text || 'Nothing.', kind: 'none' };
    }
  }

  checkTask() {
    const f = this.floor(); if (!f || !f.task || f.task.done) return;
    if (f.task.kind === 'searchAll' && f.rooms.every(r => r.lock || r.objs.every(o => o.done))) this.completeTask(f);
  }
  completeTask(f) {
    f.task.done = true;
    const { cash, token } = f.task.reward;
    this.addCash(cash); if (token) this.S.tokens += token;
    this.S.stats.tasks = (this.S.stats.tasks || 0) + 1;
    this.emit('toast', { kind: 'task', title: 'Floor task complete', text: `${f.task.text} +$${cash}${token ? ' +1 token' : ''}` });
  }

  // ───────── locks & puzzles ─────────
  unlockWith(roomId, how) {
    const f = this.floor(), room = f?.rooms[roomId]; if (!room || !room.lock) return { ok: false };
    if (how === 'skeleton' && this.has('skeleton_key')) { this.take('skeleton_key'); return this.openRoom(room, 'The skeleton key turns once and crumbles to rust. The door swings open.'); }
    if (room.lock.kind === 'item' && this.has(room.lock.item)) {
      this.time(3);
      if (room.lock.item === 'lockpicks') this.S.stats.locksPicked = (this.S.stats.locksPicked || 0) + 1;
      return this.openRoom(room, { crowbar: 'You lever the stuck door. It gives with a groan.', lockpicks: 'Click, click… click. Open.', keycard_blue: 'The reader beeps green.' }[room.lock.item] || 'Open.');
    }
    return { ok: false, text: 'You don\'t have what this lock needs.' };
  }
  openRoom(room, text) {
    room.lock = null;
    const f = this.floor();
    if (f.task && f.task.kind === 'unlock' && f.task.room === room.id && !f.task.done) this.completeTask(f);
    this.save(); this.checkAch();
    return { ok: true, text };
  }
  // record a puzzle result (from a lock or an encounter)
  puzzleSolved(p, { first = true } = {}) {
    const st = this.S.stats;
    st.puzzles++; st.puzzleTypes[p.type] = (st.puzzleTypes[p.type] || 0) + 1;
    if (p.type === 'keypad' && first) st.keypadClean = (st.keypadClean || 0) + 1;
    if (p.type === 'fuses' && p.moves <= p.min) this.unlock('efficient');
  }
  solveLock(roomId) {
    const f = this.floor(), room = f?.rooms[roomId]; if (!room || !room.lock || room.lock.kind !== 'puzzle') return { ok: false };
    const p = room.lock.puzzle;
    this.puzzleSolved(p, { first: !p.tries });
    return this.openRoom(room, `${PUZZLE_NAMES[p.type]} solved. The door opens.`);
  }
  puzzleAttempt(min = 2) { this.time(min); }
  puzzleFail(p) { p.tries = (p.tries || 0) + 1; this.comp(-4); this.time(2); this.save(); }

  // ───────── items ─────────
  give(id, n = 1) { this.S.items[id] = (this.S.items[id] || 0) + n; if (ITEMS[id]?.kind !== 'use' && this.R) this.R.found.push(ITEMS[id].name); }
  take(id, n = 1) { this.S.items[id] = Math.max(0, (this.S.items[id] || 0) - n); if (!this.S.items[id]) delete this.S.items[id]; }
  count(id) { return this.S.items[id] || 0; }
  addCash(n) { if (this.R) this.R.pocket += n; else this.S.bank += n; }
  spend(n) { // pocket first, then (in the lift between floors) the bank
    const R = this.R;
    if (R && R.pocket >= n) { R.pocket -= n; this.S.stats.spent += n; return true; }
    return false;
  }
  addClue(id) { if (this.S.clues[id]) return false; this.S.clues[id] = Date.now(); if (this.R) this.R.newClues.push(id); this.emit('toast', { kind: 'clue', title: 'New journal entry', text: CLUE_BY_ID[id].title }); return true; }
  addLost(id) { if (this.S.lost[id]) return false; this.S.lost[id] = Date.now(); if (this.R) this.R.found.push(LOST_BY_ID[id].name); return true; }

  useItem(id) {
    const it = ITEMS[id]; if (!it || !this.has(id)) return { ok: false };
    const R = this.R;
    if (it.heal) { if (!R) return { ok: false, text: 'Save it for the night.' }; this.take(id); this.comp(it.heal); this.save(); return { ok: true, text: `You have the ${it.name.toLowerCase()}. (+${it.heal} composure)` }; }
    if (id === 'flare') { const f = this.floor(); if (!f || !f.dark || f.lit) return { ok: false, text: 'No need for a flare here.' }; this.take(id); f.lit = true; this.save(); return { ok: true, text: 'The flare hisses into red light. You can see.' }; }
    if (id === 'stopwatch') { if (!R) return { ok: false, text: 'Nothing to rewind yet.' }; this.take(id); this.time(-45); this.save(); return { ok: true, text: 'Click. The building forgets the last 45 minutes.' }; }
    if (id === 'lucky_coin') { if (!R) return { ok: false, text: 'Save it for the night.' }; if (R.flags.lucky) return { ok: false, text: 'You already feel lucky.' }; this.take(id); R.flags.lucky = true; this.save(); return { ok: true, text: 'You flip it. Heads. The next search will turn something up.' }; }
    if (id === 'tuna') return { ok: false, text: 'Not for you. Someone grey and furry might appreciate it.' };
    return { ok: false, text: it.desc };
  }

  // ───────── shop & upgrades (bank cash) ─────────
  upgradeCost(id) { const u = UPGRADE_BY_ID[id], lv = this.up(id); if (lv >= u.max) return null; return { cash: u.cost[lv], tokens: (u.tokens || [])[lv] || 0 }; }
  buyUpgrade(id) {
    const c = this.upgradeCost(id); if (!c) return { ok: false, text: 'Fully upgraded.' };
    if (this.S.bank < c.cash || this.S.tokens < c.tokens) return { ok: false, text: 'Not enough in the bank.' };
    this.S.bank -= c.cash; this.S.tokens -= c.tokens; this.S.stats.spent += c.cash;
    this.S.upgrades[id] = this.up(id) + 1;
    if (id === 'nerves' && this.R) this.comp(20);
    this.save(); this.checkAch();
    return { ok: true, text: `${UPGRADE_BY_ID[id].name} installed.` };
  }
  supplyPrice(id) { return this.price(ITEMS[id].price); }
  buySupply(id) {
    const it = ITEMS[id]; if (!it || !it.price) return { ok: false };
    if (it.kind === 'equip' && this.has(id)) return { ok: false, text: 'You already have one.' };
    const p = this.supplyPrice(id);
    if (this.S.bank < p) return { ok: false, text: 'Not enough in the bank.' };
    this.S.bank -= p; this.S.stats.spent += p; this.give(id);
    this.save(); this.checkAch();
    return { ok: true, text: `Bought: ${it.name}.` };
  }

  // ───────── encounters ─────────
  // Opens the encounter in the current room (or a free-floating one, e.g. the call bell).
  openEncounter(encId, room = null) {
    const e = ENC_BY_ID[encId]; if (!e) return null;
    const holder = room ? room.enc : { id: encId, done: false, local: {} };
    const g = this.ctx(holder.local);
    const text = e.text(g);
    const choices = typeof e.choices === 'function' ? e.choices(g) : e.choices;
    this.enc = { e, room, holder, g, choices };
    if (!holder.met) { holder.met = true; if (e.npc && e.npc !== 'attendant' && !this.S.people[e.npc]) this.S.people[e.npc] = 0; }
    this.save();
    return { name: e.name, npc: e.npc, text, choices: this.viewChoices(choices) };
  }
  viewChoices(choices) {
    const g = this.enc.g;
    return choices.filter(c => !c.if || safe(() => c.if(g))).map(c => {
      let why = null;
      const price = c.cost ? this.price(c.cost) : 0;
      if (price && (!this.R || this.R.pocket < price)) why = `Needs $${price} in your pocket`;
      if (c.tokens && this.S.tokens < c.tokens) why = `Needs ${c.tokens} token${c.tokens > 1 ? 's' : ''}`;
      if (c.tickets && this.count('tickets') < c.tickets) why = `Needs ${c.tickets} tickets`;
      if (c.needItem && !this.has(c.needItem)) why = `Needs: ${ITEMS[c.needItem].name}`;
      const tags = [price ? `$${price}` : '', c.tokens ? `${c.tokens} token${c.tokens > 1 ? 's' : ''}` : '', c.t ? `${c.t} min` : '', c.puzzle ? 'puzzle' : ''].filter(Boolean);
      return { label: c.label, why, tags, ref: c };
    });
  }
  // returns { text, choices?, done, puzzle? }
  chooseEncounter(ref) {
    const E = this.enc; if (!E) return null;
    const c = ref;
    const view = this.viewChoices([c])[0];
    if (!view || view.why) return { text: view?.why || 'You can\'t do that.', choices: this.viewChoices(E.choices) };
    if (c.cost) this.spend(this.price(c.cost));
    if (c.tokens) this.S.tokens -= c.tokens;
    if (c.tickets) this.take('tickets', c.tickets);
    if (c.t) this.time(c.t);
    if (c.puzzle) { E.pendingChoice = c; this.save(); return { puzzle: c.puzzle }; }
    return this.runChoice(c);
  }
  puzzleForEncounter(ok, p) {
    const E = this.enc; if (!E || !E.pendingChoice) return null;
    const c = E.pendingChoice; E.pendingChoice = null;
    if (!ok) { this.save(); return { text: 'You give up on it for now.', choices: this.viewChoices(E.choices) }; }
    this.puzzleSolved(p);
    return this.runChoice(c);
  }
  runChoice(c) {
    const E = this.enc;
    let res;
    try { res = c.go(E.g); } catch (err) { console.error(err); res = 'Something odd happens, and then nothing.'; }
    if (E.ended) { this.enc = null; return { text: '', done: true, ended: true }; }
    if (res && typeof res === 'object' && res.choices) { E.choices = res.choices; this.save(); this.checkAch(); return { text: res.text, choices: this.viewChoices(res.choices) }; }
    const text = typeof res === 'string' ? res : (res?.text || '');
    const final = !(res && res.end && E.e.repeat);
    this.finishEncounter(final && !E.e.repeat);
    return { text, done: true, repeat: !!E.e.repeat };
  }
  finishEncounter(markDone) {
    const E = this.enc; if (!E) return;
    const S = this.S;
    if (!E.counted) {
      E.counted = true;
      S.stats.encounters++;
      if (E.e.rare) S.stats.rareEncounters++;
      if (E.e.once) S.flags['enc_' + E.e.id] = 1;
    }
    if (markDone) E.holder.done = true;
    this.log(`${fmtClock(this.R?.clock || 0)} — ${E.e.name}.`);
    this.save(); this.checkAch();
  }
  reopenEncounter() { const E = this.enc; if (!E) return null; return this.openEncounter(E.e.id, E.room); }
  closeEncounter() { this.enc = null; }

  ringBell() {
    const R = this.R; if (!R || R.cur || !this.up('bell') || R.bellUsed) return null;
    R.bellUsed = true;
    this.time(5);
    return this.openEncounter('attendant', null);
  }

  // the context object encounters act through
  ctx(local) {
    const self = this, rng = makeRng(randomSeed());
    const S = this.S;
    const lostPick = (cats, filterNeed = true) => {
      const f = self.floorDef();
      const cs = cats || (f ? [f.id, f.cat] : []);
      let pool = LOST.filter(l => !S.lost[l.id] && (!filterNeed || !l.need || self.has(l.need)) && l.cats.some(c => cs.includes(c)));
      if (!pool.length) pool = LOST.filter(l => !S.lost[l.id] && (!l.need || self.has(l.need)) && !['home', 'blueprint', 'dark'].some(c => l.cats.includes(c)));
      return pool.length ? rng.pick(pool) : null;
    };
    return {
      get S() { return S; }, get R() { return self.R; }, get F() { return self.floor(); }, local: local || {},
      cash: n => { if (n >= 0) self.addCash(Math.round(n)); else self.spend(-n); return n; },
      comp: n => self.comp(n), time: n => self.time(n),
      give: (id, n) => self.give(id, n), take: (id, n) => self.take(id, n), has: id => self.has(id), count: id => self.count(id),
      token: n => { S.tokens += n; }, itemName: id => ITEMS[id].name,
      clue: id => self.addClue(id),
      anyClue: cats => {
        const f = self.floorDef();
        const ok = c => c.src.length && !c.src.every(s => EXCLUSIVE_CLUE_SRC.includes(s)) && !S.clues[c.id];
        let pool = cats.includes('any') ? CLUES.filter(ok) : CLUES.filter(c => ok(c) && c.src.some(s => cats.includes(s) || (f && (s === f.id))));
        if (!pool.length) pool = CLUES.filter(ok);
        if (!pool.length) return null;
        const c = rng.pick(pool); self.addClue(c.id); return c;
      },
      lost: cats => { const l = lostPick(cats); if (l) self.addLost(l.id); return l; },
      lostById: id => { if (S.lost[id]) return null; self.addLost(id); return LOST_BY_ID[id]; },
      lostCount: () => Object.keys(S.lost).length,
      meet: npc => { S.people[npc] = (S.people[npc] || 0) + 1; return S.people[npc]; },
      meets: npc => S.people[npc] || 0,
      flag: k => S.flags[k], setFlag: (k, v) => { S.flags[k] = v; return v; },
      rflag: k => self.R?.flags[k], setRflag: (k, v) => { if (self.R) self.R.flags[k] = v; return v; },
      rand: () => rng(), int: (a, b) => rng.int(a, b), pick: a => rng.pick(a), chance: p => rng.chance(p), shuffle: a => rng.shuffle(a),
      ach: id => self.unlock(id), stat: (k, n = 1) => { S.stats[k] = (S.stats[k] || 0) + n; },
      reveal: () => { const f = self.floor(); if (f) { f.revealed = true; f.rooms.forEach(r => { r.seen = true; }); } },
      sfx: name => self.emit('sfx', name),
      isHour: () => self.isHour(), blueprints: () => Object.keys(S.blueprints).length,
      ending: id => { if (self.enc) self.enc.ended = true; self.ending(id); return ''; },
    };
  }

  // ───────── endings & night end ─────────
  ending(id) {
    this.S.endings[id] = this.S.endings[id] || Date.now();
    this.endNight('ending', id);
  }
  clockOut() { if (!this.R || this.R.cur) return null; return this.endNight('clockout'); }

  endNight(reason, endingId = null) {
    const S = this.S, R = this.R; if (!R) return null;
    const keep = reason === 'blackout' ? (this.up('pockets') ? 0.75 : 0.5) : 1;
    const banked = Math.floor(R.pocket * keep);
    S.bank += banked; S.stats.banked += banked;
    S.stats.bestBank = Math.max(S.stats.bestBank, banked);
    S.stats.bestFloorsNight = Math.max(S.stats.bestFloorsNight, R.floorsVisited);
    if (reason === 'blackout') S.stats.blackouts++; else S.stats.nightsDone++;
    if (reason !== 'blackout' && R.floorsVisited >= 12 && R.minCompPct >= 50) this.unlock('unflappable');
    const summary = { night: S.night, reason, endingId, pocket: R.pocket, banked, lostCash: R.pocket - banked, floors: R.floorsVisited, rooms: R.rooms, found: R.found.slice(), clues: R.newClues.map(id => CLUE_BY_ID[id].title), clock: fmtClock(R.clock) };
    S.lastRun = summary;
    S.run = null; this.enc = null;
    this.save(); this.checkAch();
    this.emit('nightEnd', summary);
    return summary;
  }

  // ───────── achievements ─────────
  unlock(id) {
    if (this.S.achievements[id] || !ACH_BY_ID[id]) return false;
    this.S.achievements[id] = Date.now();
    this.emit('ach', ACH_BY_ID[id]);
    return true;
  }
  checkAch() {
    for (const a of ACHIEVEMENTS) if (a.check && !this.S.achievements[a.id] && safe(() => a.check(this.S))) this.unlock(a.id);
    this.save();
  }
}

function safe(fn) { try { return fn(); } catch { return false; } }

export { FLOORS, FLOOR_BY_ID, NORMAL_FLOORS, ANOMALY_FLOORS, ITEMS, LOST, BLUEPRINTS, CLUES, ENCOUNTERS, NPCS, ACHIEVEMENTS, UPGRADES, ENDINGS, hashStr };

// The game controller: owns the state, runs the clock, moves the player and villagers, and
// turns "use" / "interact" presses into actions. It never touches the DOM; it talks to the
// interface through `ui` (dialogs, menus, toasts) and `sfx`, both no-ops by default so the
// controller can be driven from tests.

import { CLOCK, PLAYER, TILE, TOOL_ENERGY, FRIENDSHIP, CAN_CAPACITY } from './config.js';
import { MAPS } from './data/maps.js';
import { NPCS, NPCS_BY_ID } from './data/npcs.js';
import { ITEMS_BY_ID } from './data/items.js';
import { OBJECTS } from './data/objects.js';
import { CROPS_BY_ID } from './data/crops.js';
import { dayIndex, formatClock, weekday, seasonTitle, absMinutes, nextDate } from './calendar.js';
import * as W from './world.js';
import * as Inv from './inventory.js';
import { useTool, useItem, harvestAt, giveOrDrop } from './tools.js';
import { isRipe } from './farming.js';
import { endDay, rollWeather } from './day.js';
import { scheduleFor, entryIndexAt, talk, giveGift, canGift, isBirthday, festKey } from './npc.js';
import { refreshQuests, questEvent, deliverables, deliver, postRequest, flushPending, payReward } from './quests.js';
import { ship, shippingValue, toolName } from './economy.js';
import { machineReady, loadMachine, collectMachine, machineInput } from './crafting.js';
import { rollCatch, biteDelay, waterBody, createMinigame } from './fishing.js';
import { festivalNow, seedSwap, feastGift, secretFriend, todaysFestival } from './festival.js';
import { mulberry32, hashSeed } from './rng.js';
import { saveGame } from './save.js';

const noop = () => {};
const NULL_UI = new Proxy({}, { get: () => noop });
const NPC_SPEED = 2.4 * TILE; // px per second

export class Game {
  constructor(state, { ui = NULL_UI, sfx = noop, autosave = true } = {}) {
    this.state = state;
    this.ui = ui;
    this.sfx = sfx;
    this.autosave = autosave;
    this.clockMs = 0;
    this.paused = false;
    this.walkT = 0;
    this.moving = false;
    this.swing = null;          // { tool, t }
    this.fishing = null;        // { phase, t, tx, ty, catch }
    this.effects = [];          // floating text / particles, consumed by the renderer
    this.rngCounter = 0;
    this.npcs = {};
    this.lastSave = 0;
    if (state.board.day !== dayIndex(state.date)) postRequest(state);
    if (state.weather.tomorrow === 'sun' && state.stats.days === 1 && state.date.day === 1) state.weather.tomorrow = rollWeather(state, nextDate(state.date));
    this.placeNpcs(true);
    refreshQuests(state);
  }

  // fresh randomness for one-off rolls (drops, bites); seeded per day so reloads stay fair
  rng() { return mulberry32(hashSeed(this.state.seed, dayIndex(this.state.date), this.state.date.minutes, ++this.rngCounter)); }

  get player() { return this.state.player; }
  get map() { return MAPS[this.player.map]; }

  // ------------------------------------------------------------------ villagers
  placeNpcs(snap = false) {
    for (const def of NPCS) {
      const sched = scheduleFor(this.state, def.id);
      const idx = entryIndexAt(sched, this.state.date.minutes);
      const e = sched[idx];
      const [x, y] = W.centerOf(e.x, e.y);
      const cur = this.npcs[def.id];
      if (snap || !cur) this.npcs[def.id] = { id: def.id, sched, idx, map: e.map, x, y, dir: e.dir, hidden: e.hidden, path: null, walkT: 0, moving: false };
      else Object.assign(cur, { sched, idx: -1 });
    }
  }

  // A villager standing close to the middle of a tile (they are often between tiles walking).
  npcNear(mapId, tx, ty) {
    const [cx, cy] = W.centerOf(tx, ty);
    for (const n of Object.values(this.npcs)) if (!n.hidden && n.map === mapId && Math.hypot(n.x - cx, n.y - cy) < 11) return n;
    return null;
  }

  npcAtTile(mapId, tx, ty) {
    for (const n of Object.values(this.npcs)) {
      if (n.hidden || n.map !== mapId) continue;
      const [nx, ny] = W.tileOf(n.x, n.y);
      if (nx === tx && ny === ty) return n;
    }
    return null;
  }

  updateNpcs(dt) {
    const m = this.state.date.minutes;
    for (const n of Object.values(this.npcs)) {
      const idx = entryIndexAt(n.sched, m);
      if (idx !== n.idx) {
        n.idx = idx;
        const e = n.sched[idx];
        const onScreen = n.map === this.player.map && e.map === n.map && !n.hidden;
        const [tx, ty] = W.centerOf(e.x, e.y);
        if (!onScreen) { Object.assign(n, { map: e.map, x: tx, y: ty, dir: e.dir, hidden: e.hidden, path: null }); continue; }
        const path = W.findPath(this.state, n.map, W.tileOf(n.x, n.y), [e.x, e.y]);
        if (!path) { Object.assign(n, { map: e.map, x: tx, y: ty, dir: e.dir, hidden: e.hidden, path: null }); continue; }
        n.path = path; n.goal = e; n.hidden = false;
      }
      n.moving = false;
      if (!n.path) continue;
      if (!n.path.length) { n.path = null; n.dir = n.goal.dir; n.hidden = n.goal.hidden; continue; }
      const [gx, gy] = W.centerOf(...n.path[0]);
      // wait politely if the player is standing in the way
      const [ptx, pty] = W.tileOf(this.player.x, this.player.y);
      if (this.player.map === n.map && ptx === n.path[0][0] && pty === n.path[0][1] && n.path.length > 1) { n.waitT = (n.waitT || 0) + dt; if (n.waitT < 2.5) continue; }
      n.waitT = 0;
      const dx = gx - n.x, dy = gy - n.y, d = Math.hypot(dx, dy);
      const step = NPC_SPEED * dt;
      if (d <= step) { n.x = gx; n.y = gy; n.path.shift(); }
      else { n.x += (dx / d) * step; n.y += (dy / d) * step; }
      n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      n.moving = true;
      n.walkT += dt;
    }
  }

  // ------------------------------------------------------------------ main loop
  update(dt, input = { dx: 0, dy: 0 }) {
    dt = Math.min(dt, 0.1);
    if (this.paused) return;
    this.tickClock(dt);
    if (this.paused) return;
    this.updateNpcs(dt);
    if (this.swing) { this.swing.t -= dt; if (this.swing.t <= 0) this.swing = null; }
    this.updateFishing(dt, input);
    this.movePlayer(dt, input);
    this.effects = this.effects.filter(e => (e.t -= dt) > 0);
    if (this.autosave && performance.now() - this.lastSave > 60000) this.save();
  }

  tickClock(dt) {
    this.clockMs += dt * 1000;
    while (this.clockMs >= CLOCK.realMsPerGameMinute) {
      this.clockMs -= CLOCK.realMsPerGameMinute;
      this.state.date.minutes += 1;
      if (this.state.date.minutes % 10 === 0) this.onTenMinutes();
      if (this.state.date.minutes >= CLOCK.passOut) { this.passOut(); return; }
    }
  }

  onTenMinutes() {
    const m = this.state.date.minutes;
    if (m === 24 * 60) this.ui.toast("It's midnight. You should get to bed.", 'warn');
    if (m === 25 * 60) this.ui.toast("It's 1 am. You're getting very sleepy...", 'warn');
    const got = flushPending(this.state);
    for (const [id, n] of got) this.ui.toast(`Received ${n}× ${ITEMS_BY_ID[id].name}`);
    this.checkFestival();
  }

  movePlayer(dt, { dx = 0, dy = 0 }) {
    const p = this.player;
    this.moving = false;
    if (this.fishing && (dx || dy)) this.cancelFishing('You reel the line back in.');
    if (this.fishing) return;
    if (!dx && !dy) { this.walkT = 0; return; }
    const len = Math.hypot(dx, dy);
    const speed = PLAYER.speed * TILE * (p.energy <= 0 ? 0.6 : 1);
    const mx = (dx / len) * speed * dt, my = (dy / len) * speed * dt;
    if (Math.abs(dx) > Math.abs(dy) + 0.01) p.dir = dx > 0 ? 'right' : 'left';
    else if (Math.abs(dy) > 0.01) p.dir = dy > 0 ? 'down' : 'up';
    const npcBlock = (tx, ty) => !!this.npcAtTile(p.map, tx, ty);
    const [nx, ny] = W.moveWithCollision(this.state, p.map, p.x, p.y, mx, my, npcBlock);
    this.moving = nx !== p.x || ny !== p.y;
    p.x = nx; p.y = ny;
    if (this.moving) this.walkT += dt;
    const [tx, ty] = W.tileOf(p.x, p.y);
    // edge warps and doors
    const w = W.warpAt(p.map, tx, ty);
    if (w) { const [ax, ay] = W.warpTarget(w, tx, ty); this.changeMap(w.to, ax, ay, w.dir); return; }
    const door = W.doorAt(p.map, tx, ty);
    if (door?.to) { this.changeMap(door.to.map, door.to.x, door.to.y, door.to.dir); return; }
    // walk over dropped items to pick them up
    const o = W.objectAt(this.state, p.map, tx, ty);
    if (o?.t === 'drop') {
      const left = Inv.add(this.state, o.item, o.n);
      if (left < o.n) { this.ui.toast(`+${o.n - left} ${ITEMS_BY_ID[o.item].name}`); this.sfx('pop'); }
      if (left) o.n = left; else delete this.state.maps[p.map].objects[W.key(tx, ty)];
    }
  }

  changeMap(mapId, tx, ty, dir) {
    const p = this.player;
    const [x, y] = W.centerOf(tx, ty);
    Object.assign(p, { map: mapId, x, y, dir: dir || p.dir });
    this.cancelFishing();
    this.sfx('door');
    this.ui.mapChanged?.(mapId);
    this.checkFestival();
    this.save();
  }

  checkFestival() {
    const f = festivalNow(this.state);
    if (f && this.inFestival !== festKey(this.state, f)) {
      this.inFestival = festKey(this.state, f);
      this.ui.festival(f);
    }
  }

  // ------------------------------------------------------------------ targeting
  // The tile the player acts on: the mouse tile if it is close enough, else the facing tile.
  targetTile(mouseTile = null) {
    const p = this.player;
    if (mouseTile) {
      const [cx, cy] = [(mouseTile[0] + 0.5) * TILE, (mouseTile[1] + 0.5) * TILE];
      if (Math.hypot(cx - p.x, cy - (p.y - 6)) <= PLAYER.reach * TILE) return mouseTile;
    }
    return W.facingTile(p.x, p.y, p.dir);
  }

  faceToward(tx, ty) {
    const p = this.player;
    const [px, py] = W.tileOf(p.x, p.y);
    const dx = tx - px, dy = ty - py;
    if (!dx && !dy) return;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  // What E would do on this tile, as { label, run } or null.
  interaction(tx, ty) {
    const s = this.state, p = this.player, mapId = p.map;
    const held = Inv.selected(s);
    const npc = this.npcAtTile(mapId, tx, ty) || this.npcNear(mapId, tx, ty);
    if (npc) {
      const def = NPCS_BY_ID[npc.id];
      const fest = festivalNow(s);
      const del = deliverables(s, npc.id);
      if (fest && fest.host === npc.id) return { label: `Talk to ${def.name.split(' ').pop()}`, run: () => this.festivalHost(fest) };
      if (del.length) return { label: `Give ${del[0].n} ${del[0].what.includes(':') ? del[0].what.split(':')[1] : ITEMS_BY_ID[del[0].what].name}`, run: () => this.deliverTo(npc.id, del[0]) };
      const talked = s.npcs[npc.id].talked === dayIndex(s.date);
      if (talked && held && canGift(s, npc.id, held.id)) return { label: `Give ${ITEMS_BY_ID[held.id].name}`, run: () => this.giftTo(npc.id) };
      return { label: `Talk to ${def.name.split(' ').slice(-2).join(' ').replace('Mayor ', '')}`, run: () => this.talkTo(npc.id) };
    }
    const thing = W.thingAt(mapId, tx, ty);
    if (thing) {
      switch (thing.type) {
        case 'bin': {
          if (held && ITEMS_BY_ID[held.id].price > 0 && !ITEMS_BY_ID[held.id].tool) return { label: `Ship ${held.n}× ${ITEMS_BY_ID[held.id].name}`, run: () => this.shipHeld() };
          return { label: 'Shipping bin', run: () => this.ui.toast(s.shipping.length ? `In the bin: ${s.shipping.reduce((t, r) => t + r.n, 0)} items worth ${shippingValue(s)}g. Paid overnight.` : 'Hold an item and press E to ship it. Everything is sold overnight.') };
        }
        case 'bed': return { label: 'Sleep', run: () => this.ui.confirm('Go to bed and end the day?', () => this.sleep()) };
        case 'board': return { label: 'Bulletin board', run: () => this.ui.openBoard() };
        case 'shop': return { label: 'Shop', run: () => this.ui.openShop(thing.shop) };
        case 'kitchen': return { label: s.unlocks.kitchen ? 'Cook' : 'Old stove', run: () => (s.unlocks.kitchen ? this.ui.openCrafting('kitchen') : this.ui.toast('The old stove barely lights. Mabel could renovate the kitchen.')) };
        case 'well': return { label: 'Refill watering can', run: () => this.refillCan() };
        case 'sign': return { label: 'Read', run: () => this.ui.say(null, [thing.text]) };
        default: break;
      }
    }
    const b = W.buildingAt(mapId, tx, ty);
    if (b && b.locked && b.door.x === tx && b.door.y === ty) return { label: 'Knock', run: () => this.ui.toast(b.locked) };
    const o = W.objectAt(s, mapId, tx, ty);
    if (o) {
      const def = OBJECTS[o.t];
      if (o.t === 'forage') return { label: `Pick up ${ITEMS_BY_ID[o.item].name}`, run: () => this.pickForage(tx, ty) };
      if (o.t === 'drop') return { label: `Pick up ${ITEMS_BY_ID[o.item].name}`, run: () => this.pickDrop(tx, ty) };
      if (def.storage) return { label: 'Open chest', run: () => this.ui.openChest(o) };
      if (def.machine) {
        if (machineReady(s, o)) return { label: `Collect ${ITEMS_BY_ID[o.job.out].name}`, run: () => this.collect(o) };
        if (o.job) return { label: `${def.name}: ${ITEMS_BY_ID[o.job.out].name} (${timeLeft(s, o.job.ready)})`, run: () => this.ui.toast(`Working on ${ITEMS_BY_ID[o.job.out].name}. Ready ${timeLeft(s, o.job.ready)}.`) };
        if (held && machineInput(s, o.t, held.id)) return { label: `Put ${ITEMS_BY_ID[held.id].name} in`, run: () => this.load(o, held.id) };
        return { label: def.name, run: () => this.ui.toast(def.machine === 'furnace' ? 'Hold copper or iron ore (5) with coal in your bag, then press E.' : 'Hold a crop and press E to make jam or pickles.') };
      }
    }
    const soil = W.soilAt(s, mapId, tx, ty);
    if (soil?.c) {
      const crop = CROPS_BY_ID[soil.c.id];
      if (isRipe(soil.c)) return { label: `Harvest ${crop.name}`, run: () => this.harvest(tx, ty) };
      if (soil.c.dead) return { label: `Withered ${crop.name}`, run: () => this.ui.toast('This crop withered. Clear it with the scythe or axe.') };
      return { label: `${crop.name}: ${soil.c.grow - soil.c.age} more watered day${soil.c.grow - soil.c.age === 1 ? '' : 's'}${soil.w ? '' : ' (needs water)'}`, run: () => this.ui.toast(`${crop.name} — ripe in ${soil.c.grow - soil.c.age} watered day(s). ${soil.w ? 'Watered today.' : 'Not watered yet today.'}`) };
    }
    return null;
  }

  // What Space / left click would do, as a short label (for the prompt) or null.
  useLabel(tx, ty) {
    const s = this.state, held = Inv.selected(s);
    if (!held) return null;
    const it = ITEMS_BY_ID[held.id], mapId = this.player.map;
    const o = W.objectAt(s, mapId, tx, ty), soil = W.soilAt(s, mapId, tx, ty);
    if (it.tool) {
      switch (held.id) {
        case 'hoe': return W.tillable(s, mapId, tx, ty) ? 'Till' : null;
        case 'can': return W.isWater(s, mapId, tx, ty) || W.thingAt(mapId, tx, ty)?.type === 'well' ? 'Refill' : soil && !soil.w ? `Water (${s.player.water} left)` : null;
        case 'axe': return o && ['twig', 'stump', 'tree', 'sapling', 'weed'].includes(o.t) ? `Chop ${OBJECTS[o.t].name}` : o && OBJECTS[o.t].item ? `Pick up ${OBJECTS[o.t].name}` : null;
        case 'pickaxe': return o && ['stone', 'boulder', 'rock', 'copper', 'iron', 'gemrock', 'weed'].includes(o.t) ? `Break ${OBJECTS[o.t].name}` : o && OBJECTS[o.t].item ? `Pick up ${OBJECTS[o.t].name}` : soil && !soil.c ? 'Remove soil' : null;
        case 'scythe': return o?.t === 'weed' ? 'Cut weeds' : soil?.c && (isRipe(soil.c) || soil.c.dead) ? (soil.c.dead ? 'Clear' : 'Harvest') : null;
        case 'rod': return this.fishingWater() ? 'Cast' : null;
      }
      return null;
    }
    if (it.cat === 'seed') return soil && !soil.c ? `Plant ${it.name.replace(' Seeds', '')}` : null;
    if (it.soil) return soil && !soil.f ? 'Fertilize' : null;
    if (it.place) return `Place ${it.name}`;
    if (it.energy) return `Eat ${it.name}`;
    return null;
  }

  // ------------------------------------------------------------------ actions
  interact(tile = null) {
    if (this.paused) return;
    if (this.fishing) { this.useAction(tile); return; }
    const [tx, ty] = tile || this.targetTile();
    if (tile) this.faceToward(tx, ty);
    const it = this.interaction(tx, ty);
    if (it) it.run();
  }

  useAction(tile = null) {
    if (this.paused) return;
    const s = this.state, p = this.player;
    if (this.fishing) { this.fishingPress(); return; }
    if (this.swing) return;
    const held = Inv.selected(s);
    if (!held) { this.interact(tile); return; }
    const [tx, ty] = tile || this.targetTile();
    if (tile) this.faceToward(tx, ty);
    const it = ITEMS_BY_ID[held.id];
    // a ripe crop is always harvested, whatever you are holding
    const soil = W.soilAt(s, p.map, tx, ty);
    if (soil && isRipe(soil.c) && !['hoe', 'can'].includes(held.id)) { this.harvest(tx, ty); return; }
    let res;
    if (it.tool) {
      if (held.id === 'rod') { this.startFishing(); return; }
      this.swing = { tool: held.id, t: 0.22 };
      res = useTool(s, held.id, p.map, tx, ty, p.dir, this.rng());
    } else if (it.cat === 'seed' || it.soil || it.place) {
      res = useItem(s, held.id, p.map, tx, ty);
    } else if (it.energy) {
      this.eat(p.slot); return;
    } else { this.interact(tile); return; }
    this.afterAction(res, tx, ty);
  }

  afterAction(res, tx, ty) {
    if (!res) return;
    if (res.sfx) this.sfx(res.sfx);
    if (res.msg) this.ui.toast(res.msg, res.ok ? '' : 'warn');
    if (res.shake) this.effects.push({ kind: 'shake', map: this.player.map, tx, ty, t: 0.2 });
    for (const [id, n] of res.got || []) this.effects.push({ kind: 'text', text: `+${n} ${ITEMS_BY_ID[id].name}`, map: this.player.map, tx, ty, t: 1.1 });
    if (res.cleared) this.quest('clear', { n: res.cleared });
    if (res.planted) this.quest('plant', { item: res.planted });
    if (res.harvested) this.quest('harvest', { item: res.harvested, n: res.n });
    if (res.broke && ['tree', 'stump'].includes(res.broke)) this.effects.push({ kind: 'leaves', map: this.player.map, tx, ty, t: 0.6 });
  }

  quest(type, data) {
    const done = questEvent(this.state, type, data);
    for (const q of done) {
      this.ui.toast(`Quest complete: ${q.title}${q.reward.money ? ` (+${q.reward.money}g)` : ''}`, 'good');
      this.sfx('quest');
    }
    for (const q of refreshQuests(this.state)) this.ui.toast(`New quest: ${q.title}`, 'quest');
  }

  harvest(tx, ty) {
    const res = harvestAt(this.state, this.player.map, tx, ty, this.rng());
    this.afterAction(res, tx, ty);
  }

  shipHeld() {
    const s = this.state, slot = s.player.slot, held = s.inventory[slot];
    if (!held) return;
    const { id, n } = held;
    if (ship(s, slot, n)) {
      this.sfx('ship');
      this.ui.toast(`Shipped ${n}× ${ITEMS_BY_ID[id].name} (${ITEMS_BY_ID[id].price * n}g, paid overnight)`);
      this.quest('ship', { item: id, n });
    }
  }

  refillCan() {
    const s = this.state;
    s.player.water = CAN_CAPACITY[s.tools.can];
    this.sfx('refill');
    this.ui.toast('Watering can filled.');
  }

  pickForage(tx, ty) {
    const s = this.state, mapId = this.player.map;
    const o = W.objectAt(s, mapId, tx, ty);
    if (!o || o.t !== 'forage') return;
    if (!Inv.canAdd(s, o.item, 1)) { this.ui.toast('No room in your bag.', 'warn'); return; }
    Inv.add(s, o.item, 1);
    s.seen[o.item] = true;
    s.stats.foraged[o.item] = (s.stats.foraged[o.item] || 0) + 1;
    delete s.maps[mapId].objects[W.key(tx, ty)];
    this.sfx('pop');
    this.effects.push({ kind: 'text', text: `+1 ${ITEMS_BY_ID[o.item].name}`, map: mapId, tx, ty, t: 1.1 });
  }

  pickDrop(tx, ty) {
    const s = this.state, mapId = this.player.map;
    const o = W.objectAt(s, mapId, tx, ty);
    if (!o || o.t !== 'drop') return;
    const left = Inv.add(s, o.item, o.n);
    if (left === o.n) { this.ui.toast('No room in your bag.', 'warn'); return; }
    if (left) o.n = left; else delete s.maps[mapId].objects[W.key(tx, ty)];
    this.sfx('pop');
  }

  eat(slot) {
    const s = this.state, item = s.inventory[slot];
    if (!item) return;
    const it = ITEMS_BY_ID[item.id];
    if (!it.energy) return;
    this.ui.confirm(`Eat ${it.name}? (+${it.energy} energy)`, () => {
      if (!Inv.removeAt(s, slot, 1)) return;
      s.player.energy = Math.min(s.player.maxEnergy, s.player.energy + it.energy);
      this.sfx('eat');
      this.ui.toast(`Ate ${it.name}. +${it.energy} energy`);
    });
  }

  load(obj, heldId) {
    const r = loadMachine(this.state, obj, heldId);
    if (r.error) { this.ui.toast(r.error, 'warn'); this.sfx('deny'); return; }
    this.sfx('place');
    this.ui.toast(`Making ${ITEMS_BY_ID[r.out].name}. Ready ${timeLeft(this.state, obj.job.ready)}.`);
  }

  collect(obj) {
    const r = collectMachine(this.state, obj);
    if (!r) return;
    if (r.error) { this.ui.toast(r.error, 'warn'); return; }
    this.sfx('pop');
    this.ui.toast(`+1 ${ITEMS_BY_ID[r.out].name}`);
    this.quest('craft', { item: r.out });
  }

  // ------------------------------------------------------------------ villagers
  talkTo(npcId) {
    const s = this.state;
    const fest = festivalNow(s);
    const r = talk(s, npcId);
    const lines = [...r.lines];
    if (isBirthday(s, npcId) && s.npcs[npcId].gifted !== dayIndex(s.date)) lines.push("(It's their birthday today. A gift would mean a lot.)");
    if (fest) {
      const swap = fest.kind === 'fair' && seedSwap(s, fest, npcId);
      if (swap) lines.push(`Here, for the seed swap! (+${swap[1]} ${ITEMS_BY_ID[swap[0]].name})`);
      if (fest.kind === 'feast' && npcId === secretFriend(s)) lines.push('(This is your secret friend for the Frostlight Feast! Give them a gift.)');
    }
    for (const g of r.gifts) { payReward(s, { items: [g] }); lines.push(`(Received ${g[1]}× ${ITEMS_BY_ID[g[0]].name})`); }
    this.sfx('talk');
    this.ui.say(npcId, lines);
    this.quest('talk', { npc: npcId });
  }

  giftTo(npcId) {
    const s = this.state, slot = s.player.slot, held = s.inventory[slot];
    if (!held || !canGift(s, npcId, held.id)) return;
    const name = ITEMS_BY_ID[held.id].name;
    this.ui.confirm(`Give ${name} to ${NPCS_BY_ID[npcId].name}?`, () => {
      if (!Inv.removeAt(s, slot, 1)) return;
      const fest = festivalNow(s);
      const r = giveGift(s, npcId, held.id);
      const lines = [r.line];
      if (fest?.kind === 'feast') {
        const fg = feastGift(s, npcId, held.id);
        if (fg) lines.push(`Happy Frostlight! I got you something too. (+${fg.back[1]} ${ITEMS_BY_ID[fg.back[0]].name})`);
      }
      this.sfx(r.taste === 'loved' || r.taste === 'liked' ? 'love' : 'talk');
      this.ui.say(npcId, lines, r.taste);
    });
  }

  deliverTo(npcId, d) {
    const r = deliver(this.state, d);
    if (!r) return;
    this.sfx('quest');
    if (r.quest) {
      this.ui.say(npcId, [`Thank you so much! That's exactly what I needed.`, `(Quest complete: ${r.quest.title}${r.quest.reward.money ? `, +${r.quest.reward.money}g` : ''})`]);
      for (const q of refreshQuests(this.state)) this.ui.toast(`New quest: ${q.title}`, 'quest');
    } else {
      this.ui.say(npcId, [`You brought it! Here's your reward.`, `(+${r.request.reward}g, +${FRIENDSHIP.requestReward} friendship)`]);
    }
  }

  festivalHost(fest) { this.ui.openFestival(fest); }

  // ------------------------------------------------------------------ fishing
  fishingWater() {
    const p = this.player;
    const [dx, dy] = W.DIRS[p.dir];
    const [tx, ty] = W.tileOf(p.x, p.y);
    for (let i = 1; i <= 3; i++) if (W.isWater(this.state, p.map, tx + dx * i, ty + dy * i)) return [tx + dx * i, ty + dy * i];
    return null;
  }

  startFishing() {
    const s = this.state;
    const water = this.fishingWater();
    if (!water || !waterBody(this.player.map)) { this.ui.toast('Face the water to cast your line.', 'warn'); return; }
    const cost = TOOL_ENERGY.rod[s.tools.rod];
    if (s.player.energy < cost) { this.ui.toast("You're too tired to fish.", 'warn'); return; }
    s.player.energy -= cost;
    const bait = Inv.remove(s, 'bait', 1);
    this.fishing = { phase: 'wait', t: biteDelay(this.rng(), bait, s.tools.rod), tx: water[0], ty: water[1], bait };
    this.sfx('cast');
  }

  updateFishing(dt) {
    const f = this.fishing;
    if (!f) return;
    f.t -= dt;
    if (f.phase === 'wait' && f.t <= 0) { f.phase = 'bite'; f.t = 0.9; this.sfx('bite'); }
    else if (f.phase === 'bite' && f.t <= 0) this.cancelFishing('It got away...');
  }

  fishingPress() {
    const f = this.fishing;
    if (!f) return;
    if (f.phase !== 'bite') { this.cancelFishing('You reel in too early.'); return; }
    const c = rollCatch(this.state, this.player.map, this.rng());
    if (!c.fish) {
      this.fishing = null;
      giveOrDrop(this.state, this.player.map, ...W.tileOf(this.player.x, this.player.y), [[c.id, 1]]);
      this.ui.toast(`You pulled up some ${ITEMS_BY_ID[c.id].name}.`);
      this.sfx('pop');
      return;
    }
    f.phase = 'reel';
    this.ui.openFishing(createMinigame(c.fish, this.state.tools.rod, this.rng()), result => this.finishFishing(c.fish, result));
  }

  finishFishing(fish, result) {
    this.fishing = null;
    if (result.done !== 'caught') { this.ui.toast(`The ${fish.name} got away!`, 'warn'); this.sfx('deny'); return; }
    const s = this.state;
    const size = Math.round((8 + this.rng()() * 20 + fish.difficulty / 4) * (result.perfect ? 1.2 : 1));
    giveOrDrop(s, this.player.map, ...W.tileOf(this.player.x, this.player.y), [[fish.id, 1]]);
    s.stats.caught[fish.id] = (s.stats.caught[fish.id] || 0) + 1;
    s.stats.fishBest[fish.id] = Math.max(s.stats.fishBest[fish.id] || 0, size);
    s.seen[fish.id] = true;
    this.sfx('catch');
    this.ui.toast(`Caught a ${fish.name}! (${size} cm${result.perfect ? ', perfect!' : ''})`, 'good');
    this.quest('catch', { item: fish.id });
  }

  cancelFishing(msg) {
    if (!this.fishing || this.fishing.phase === 'reel') return;
    this.fishing = null;
    if (msg) this.ui.toast(msg);
  }

  // ------------------------------------------------------------------ days
  sleep() { this.finishDay(false); }

  passOut() {
    this.paused = true;
    this.ui.toast('You passed out from exhaustion...', 'warn');
    this.finishDay(true);
  }

  finishDay(passedOut) {
    this.fishing = null;
    const summary = endDay(this.state, { passedOut });
    this.clockMs = 0;
    this.inFestival = null;
    this.placeNpcs(true);
    this.save();
    this.paused = true;
    this.ui.dayEnd(summary, () => { this.paused = false; this.startDay(); });
    return summary;
  }

  startDay() {
    const s = this.state;
    for (const q of refreshQuests(s)) this.ui.toast(`New quest: ${q.title}`, 'quest');
    const msgs = [];
    msgs.push(`${weekday(s.date)}, ${seasonTitle(s.date.season)} ${s.date.day}. ${s.weather.today === 'rain' ? 'Rain today: your crops are watered.' : s.weather.today === 'snow' ? 'Snowing today.' : 'Sunny today.'}`);
    const fest = todaysFestival(s);
    if (fest) msgs.push(`Today: ${fest.name} (${MAPS[fest.map].name}, ${formatClock(fest.from)}–${formatClock(fest.to)}).`);
    for (const n of NPCS) if (isBirthday(s, n.id)) msgs.push(`It's ${n.name}'s birthday!`);
    for (const m of msgs) this.ui.toast(m);
    this.save();
  }

  save() {
    if (!this.autosave) return;
    this.lastSave = typeof performance !== 'undefined' ? performance.now() : 0;
    saveGame(this.state);
    this.ui.saved?.();
  }

  // ------------------------------------------------------------------ menu helpers
  selectSlot(i) { if (i >= 0 && i < PLAYER.hotbar) this.player.slot = i; }
  cycleSlot(d) { this.player.slot = (this.player.slot + d + PLAYER.hotbar) % PLAYER.hotbar; }
  heldName() { const h = Inv.selected(this.state); return h ? (ITEMS_BY_ID[h.id].tool ? toolName(this.state, h.id) : ITEMS_BY_ID[h.id].name) : ''; }
}

function timeLeft(state, ready) {
  const left = ready - absMinutes(state.date);
  if (left <= 0) return 'now';
  if (left >= 600) return 'tomorrow morning';
  return left >= 60 ? `in ${Math.round(left / 60)}h` : `in ${Math.ceil(left / 10) * 10} min`;
}


// LAST EXIT: the campaign engine (pure logic). It runs mission definitions (missions.js) against the story state, and talks to the
// game only through an `env` adapter, so the whole campaign can be played headlessly in tests exactly as it plays in the browser.
//
// env (everything the engine needs from the world):
//   player() -> { x, z, inCar, carTag, mode: 'playing'|'wasted'|'busted'|'scene' }      stars() -> 0..5     setStars(n)
//   resolve(ref) -> { x, z, name } | null     marker(spec|null)     objective(text)     banner(text, color, secs)     say(text, secs)
//   playScene(sceneId) -> { done() }          blocking conversations are awaited by the engine; radio / phone scenes just play
//   spawnCar(tag, spec)   carInfo(tag) -> { alive, x, z, playerIn } | null   removeAllCars()
//   spawnNpc(id, spec)    removeNpc(id)       npcPos(id)
//   startAmbush(id, spec) ambushInfo(id) -> { alive, total, away, npcHp } | null   stopAmbush(id)
//   addMoney(n)   save()   log(msg)   world(name)   spawnCruiser(at)   missionDone(mission)
import { SCENES } from './dialogue.js';
import { evalCond, applyEffects, createState } from './state.js';
import { MISSIONS, MISSION_LIST } from './missions.js';

const STEP_RADIUS = 9;
export class Story {
  constructor(env, state) { this.env = env; this.s = state || createState(); this.block = null; this.cur = null; this.ctx = null; this.target = null; this.idle = 0; }
  get active() { return this.s.active ? MISSIONS[this.s.active.id] : null; }
  setState(s) { this.s = s; this.cur = null; this.ctx = null; this.block = null; }

  /* ---- what can be played ---- */
  isAvailable(m) {
    if (this.s.done[m.id] || (this.s.active && this.s.active.id === m.id)) return false;
    if (m.expires && evalCond(m.expires, this.s)) return false;
    return evalCond(m.req, this.s);
  }
  available() { return MISSION_LIST.filter(m => this.isAvailable(m)); }
  /** the start markers the game shows: one per available mission, with RETRY on ones that were failed */
  startPoints() { return this.s.active ? [] : this.available().filter(m => m.start).map(m => ({ id: m.id, title: m.title, at: m.start.at, label: (this.s.failed[m.id] ? 'RETRY: ' : '') + (m.start.label || m.title), main: !!m.main, chain: m.chain || null })); }
  /** is the player's current objective a story one (the HUD shows it instead of a job) */
  get busy() { return !!this.s.active; }

  /* ---- running a mission ---- */
  start(id, opts) {
    const m = MISSIONS[id]; if (!m) throw new Error('unknown mission ' + id); opts = opts || {};
    if (this.s.active && !opts.resume) return false;
    if (!opts.force && !opts.resume && !this.isAvailable(m)) return false;
    const from = opts.resume ? this.s.active.cp || this.s.active.step : (this.s.failed[id] ? this.s.failed[id].step : 0);
    this.s.started = true; this.s.active = { id, step: from, cp: from, vars: opts.resume ? this.s.active.vars : {} }; delete this.s.failed[id];
    this.cleanup(); this.env.removeAllCars(); this.env.cleanupScenes && this.env.cleanupScenes(); this.enterStep(from); this.env.save(); this.env.log('mission start ' + id + ' at step ' + from);
    if (m.title && from === 0) this.env.banner(m.title, '#ffd23f', 2.2);
    return true;
  }
  enterStep(i) {
    const m = this.active; if (!m) return;
    while (i < m.steps.length && m.steps[i].if && !evalCond(m.steps[i].if, this.s)) i++;           // skipped by story state
    if (i >= m.steps.length) return this.complete();
    this.s.active.step = i; const st = m.steps[i]; this.cur = st; this.ctx = { t: 0, handle: null, clear: 0, arrived: false };
    if (st.cp !== false) this.s.active.cp = i;
    this.block = null; this.target = st.at ? this.env.resolve(st.at) : null;
    for (const n of st.npcs || []) if (evalCond(n.if, this.s)) this.env.spawnNpc(n.id, { at: this.env.resolve(n.at), yaw: n.yaw || 0 });
    for (const [id, tag] of Object.entries(st.npcAtCar || {})) { const c = this.env.carInfo(tag); this.env.spawnNpc(id, { at: c ? { x: c.x + 3, z: c.z } : this.env.resolve('player'), yaw: 0 }); }
    if (st.car && st.t !== 'chase' && !this.env.carInfo(st.car)) { const g = m.steps.find(x => x.t === 'getcar' && x.car === st.car) || st; this.env.spawnCar(st.car, { type: g.type, color: g.color, at: g.at ? this.env.resolve(g.at) : this.target, kind: 'mission' }); }   // a retry from a checkpoint after the car was taken away
    else if (st.t === 'getcar') this.env.spawnCar(st.car, { type: st.type, color: st.color, at: this.target, kind: 'mission' });
    if (st.t === 'chase') { this.env.spawnCar(st.car, { type: st.type, color: st.color, at: this.target, kind: 'flee' }); this.env.startAmbush(this.amb(), { cars: 0, mode: 'flee', tag: st.car }); }
    if (st.t === 'ambush' || st.t === 'protect') { if (st.stars && this.env.stars() < st.stars) this.env.setStars(st.stars); this.env.startAmbush(this.amb(), { cars: st.cars || 2, mode: st.t === 'protect' ? 'siege' : 'hunt', npc: st.npc, at: this.target, from: st.from || 'behind', hp: st.npcHp }); }
    if (st.t === 'heat' && this.env.stars() < st.stars) this.env.setStars(st.stars);
    if (st.cruiser) this.env.spawnCruiser(this.env.resolve(st.cruiser));
    if (st.world) this.env.world && this.env.world(st.world);
    this.env.objective(st.text || ''); this.env.marker(this.target && st.t !== 'scene' && st.t !== 'call' ? { x: this.target.x, z: this.target.z, label: this.target.name || '' } : null);
    for (const r of [].concat(st.radio || [])) if (SCENES[r]) this.env.playScene(r);                   // phone / radio: plays while the player keeps going
    this.env.save();
  }
  amb() { return this.s.active.id + ':' + this.s.active.step; }
  advance() { this.exitStep(); this.enterStep(this.s.active.step + 1); }
  exitStep() { const st = this.cur; if (!st) return; if (st.t === 'ambush' || st.t === 'protect' || st.t === 'chase') this.env.stopAmbush(this.amb()); if (st.flag) this.s.flags[st.flag] = true; applyEffects(this.s, st.done); (st.npcs || []).forEach(n => { if (st.despawn) this.env.removeNpc(n.id); }); }
  cleanup() { this.env.marker(null); this.env.objective(''); this.block = null; }
  /** play one or several scenes in order; the mission waits until the last one has finished */
  playList(list) {
    const ids = [].concat(list).filter(id => SCENES[id]); if (!ids.length) return { done: () => true };
    let i = 0, h = this.env.playScene(ids[0]);
    return { done: () => { if (!h.done()) return false; if (++i >= ids.length) return true; h = this.env.playScene(ids[i]); return false; } };
  }

  complete() {
    const m = this.active; if (!m) return; const id = m.id;
    this.exitStep(); this.s.done[id] = { n: 1 };
    if (m.reward && !this.s.paid[id]) { this.s.paid[id] = true; this.env.addMoney(m.reward); this.env.banner('MISSION PASSED  $' + m.reward, '#7ae27a', 3); }
    else this.env.banner(m.main ? 'MISSION PASSED' : 'DONE', '#7ae27a', 3);
    applyEffects(this.s, m.onDone); this.s.active = null; this.cur = null; this.cleanup(); this.env.removeAllCars();
    const call = m.onDone && m.onDone.call; if (call && SCENES[call] && !this.s.calls[call]) { this.s.calls[call] = true; this.env.playScene(call); }
    this.env.save(); this.env.log('mission done ' + id); this.env.missionDone && this.env.missionDone(m);
    if (m.onDone && m.onDone.next) this.start(m.onDone.next);
  }
  fail(reason) {
    const m = this.active; if (!m) return; const id = m.id, cp = this.s.active.cp || 0;
    this.exitStep(); this.s.failed[id] = { step: cp, reason }; this.s.active = null; this.cur = null; this.cleanup(); this.env.removeAllCars(); this.env.cleanupScenes && this.env.cleanupScenes();
    this.env.banner('MISSION FAILED', '#d33', 3); this.env.say && this.env.say(reason, 3.5); this.env.save(); this.env.log('mission failed ' + id + ': ' + reason);
  }
  abandon() { if (this.s.active) this.fail('you walked away from the job'); }

  /* ---- per-frame ---- */
  update(dt) {
    const p = this.env.player();
    if (!this.active) return this.announce(p);
    const m = this.active;
    if (this.block) { if (this.block.done()) this.block = null; else return; }
    if (p.mode === 'wasted' || p.mode === 'busted') { if (!m.keepOnDeath) this.fail(p.mode === 'wasted' ? 'you died' : 'you were arrested'); return; }
    if (p.mode !== 'playing') return;
    for (const f of m.fail || []) {
      if (f.t === 'wrecked') { const c = this.env.carInfo(f.car); if (c && !c.alive) return this.fail(f.text || 'the vehicle was destroyed'); }
      if (f.t === 'abandon') { const c = this.env.carInfo(f.car); if (c && c.alive && !c.playerIn && Math.hypot(c.x - p.x, c.z - p.z) > f.dist) return this.fail(f.text || 'you left the vehicle behind'); }
    }
    const st = this.cur; if (!st) return; this.ctx.t += dt;
    if (this.ctx.handle) return this.advance();                                                         // a scene we started has finished
    const near = (r) => this.target && Math.hypot(this.target.x - p.x, this.target.z - p.z) < (r || STEP_RADIUS);
    const talk = (ids) => { this.ctx.handle = this.block = this.playList(ids); };
    switch (st.t) {
      case 'scene': case 'call': talk(st.scene); break;
      case 'wait': if (this.ctx.t >= st.sec) this.advance(); break;
      case 'goto': case 'pickup': case 'drive': {
        const car = st.car ? this.env.carInfo(st.car) : null, inRight = !st.car || p.carTag === st.car;
        if (st.car && car && !car.alive) break;
        this.env.objective(st.car && !inRight ? 'Get back in the ' + (st.carName || 'vehicle') : st.text || '');
        if (inRight && (st.t !== 'drive' || p.inCar) && near(st.radius)) { if (st.t === 'pickup') this.s.flags['has_' + (st.item || 'item')] = true; if (st.scene) talk(st.scene); else this.advance(); }
        break;
      }
      case 'getcar': { const c = this.env.carInfo(st.car); if (c && !c.alive) break; if (p.carTag === st.car) { if (st.scene) talk(st.scene); else this.advance(); } break; }
      case 'heat': { if (this.env.stars() === 0) { this.ctx.clear += dt; if (this.ctx.clear >= (st.hold == null ? 4 : st.hold)) this.advance(); } else this.ctx.clear = 0; break; }
      case 'ambush': case 'protect': {
        const a = this.env.ambushInfo(this.amb()); if (!a) break;
        const done = a.alive === 0 || a.away >= (st.lostSecs || 8);
        if (done && this.ctx.t >= (st.min || 6)) { if (st.t === 'protect') this.s.flags[st.npcFlag || 'npc_alive'] = a.npcHp == null || a.npcHp > 0; this.advance(); }
        break;
      }
      case 'chase': { const a = this.env.ambushInfo(this.amb()); if (a && a.alive === 0) { if (st.scene) talk(st.scene); else this.advance(); } break; }
      case 'pay': { const k = m.id + ':pay'; if (!this.s.paid[k]) { this.s.paid[k] = true; const n = (st.amounts || {})[this.s.ending] || 0; if (n) { this.env.addMoney(n); this.env.banner('$' + n.toLocaleString(), '#7ae27a', 3); } } this.advance(); break; }
      default: this.advance();
    }
  }
  /** phone calls that tell the player a new mission is waiting (each plays once) */
  announce(p) {
    if (this.block) { if (this.block.done()) this.block = null; else return; }
    if (p.mode !== 'playing' || this.env.stars() > 0) return;
    for (const m of this.available()) if (m.announce && SCENES[m.announce] && !this.s.calls[m.id + ':ann']) { this.s.calls[m.id + ':ann'] = true; this.env.playScene(m.announce); this.env.save(); return; }
  }
}
export { MISSIONS, MISSION_LIST };

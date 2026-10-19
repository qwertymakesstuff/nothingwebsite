// LAST EXIT: the conversation player. One module turns a dialogue scene (dialogue.js) into what the player sees and hears:
//   direct  - people standing together. The world pauses (G.mode 'scene'), the cast gathers round the player, the camera frames each
//             speaker over the listener's shoulder, letterbox bars come in, and the player can skip a line (E / click / Enter) or the scene (X).
//   phone / radio / car - heard while playing: the player keeps driving, the voice is filtered for phone and radio, nothing is paused.
// Both go through the same VoiceQueue, so priorities, interruption and "never restart the same line" work for everything.
// Nothing here depends on a recording existing: every line shows as a subtitle, timed by reading speed when there is no audio.
import { SCENES, LINES } from './dialogue.js';
import { SceneRunner } from './sceneRunner.js';
import { evalCond } from './state.js';
import { VoiceQueue } from './voiceQueue.js';
import * as voice from './voice.js';
import * as npcs from './npcs.js';
import { HAS_BODY } from './cast.js';
import { hooks } from './hooks.js';
import { cine, endCine } from '../camera.js';
import { G } from '../state.js';
import { player, leaveCar } from '../player.js';
import { setSiren } from '../audio.js';
import { pushOut } from '../city.js';
import { clearInput, lockPointer, hasLock, isTouch } from '../input.js';
import { interaction } from '../interaction.js';

const $ = id => document.getElementById(id);
const subsEl = $('subs'), subName = subsEl.querySelector('b'), subText = subsEl.querySelector('span');
const fadeEl = $('fade'), cineEl = $('cine'), choicesEl = $('choices'), choiceQ = $('choiceQ'), choiceList = $('choiceList');
let stateGetter = () => null, capItem = null;

export const queue = new VoiceQueue({
  start(item) { voice.startAudio(item, !!(item.o && item.o.test)); capItem = null; maybeCaption(item); },
  end(item, reason) {
    voice.stopAudio(item); if (capItem === item) { capItem = null; subsEl.classList.remove('on'); }
    const owner = item.o && item.o.owner; if (owner) owner.lineEnded(item, reason);
  }
});
/** show the subtitle: always when there is no recording to listen to, otherwise only if the player wants subtitles */
function maybeCaption(item) {
  if (capItem === item) return;
  if (item.audio && !voice.subtitlesOn()) return;
  const c = voice.captionOf(item); capItem = item;
  subName.textContent = c.name + (c.tag ? ' (' + c.tag + ')' : ''); subName.style.color = c.color; subText.textContent = c.text; subsEl.classList.add('on');
}

/* ---- one scene being played ---- */
class ScenePlayer {
  constructor(id, direct) {
    this.id = id; this.scene = SCENES[id]; this.direct = direct; this.tag = 'scene:' + id; this.run = new SceneRunner(stateGetter(), id);
    this.mode = 'next'; this.wait = 0; this.line = null; this.finished = false; this.fast = false; this.started = false; this.choice = null; this.choiceT = 0; this.lastShot = null;
    voice.preload(this.run.scene.steps.filter(s => s.k === 'line').map(s => s.id).slice(0, 4));
  }
  lineEnded(item, reason) {
    if (this.finished || item.line !== this.line) return;
    if (reason === 'interrupted') { this.play(this.line); return; }                         // something more important spoke first: say it again afterwards
    if (reason === 'cleared') { if (this.suspended) { this.resumeLine = this.line; this.line = null; this.mode = 'held'; } else this.finish(); return; }   // (a cutscene silenced this call: it carries on afterwards)
    this.line = null; this.mode = 'gap'; this.wait = this.fast ? 0 : this.direct ? .2 : .5;
  }
  play(line) {
    this.line = line; this.mode = 'line'; if (this.direct) this.frame(line);
    queue.play(line, { force: true, tag: this.tag, owner: this, pri: this.scene.pri != null ? this.scene.pri : line.pri, unfiltered: this.scene.unfiltered, as: this.scene.as });
  }
  step() {
    for (let guard = 0; guard < 400; guard++) {
      const e = this.run.next();
      if (e.type === 'done') return this.finish();
      if (e.type === 'line') { if (this.fast) continue; return this.play(e.line); }
      if (e.type === 'pause') { if (this.fast) continue; this.mode = 'pause'; this.wait = e.sec; return; }
      if (e.type === 'choice') return this.ask(e);
    }
    this.finish();
  }
  ask(e) {
    this.mode = 'choice'; this.choice = e; this.choiceT = 0; this.sel = 0;
    choiceQ.textContent = e.prompt || ''; choiceList.textContent = '';
    e.options.forEach((o, n) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt choice'; b.textContent = (n + 1) + '.  ' + o.label; b.addEventListener('click', () => this.pick(n)); choiceList.appendChild(b); });
    choicesEl.classList.toggle('bg', !this.direct); choicesEl.hidden = false; this.mark();
    if (this.direct && document.exitPointerLock && hasLock()) document.exitPointerLock();   // the cursor is needed to click an answer
    if (!this.direct) this.choiceLeft = 25;
  }
  mark() { [...choiceList.children].forEach((b, n) => b.classList.toggle('on', n === this.sel)); }
  pick(n) {
    if (this.mode !== 'choice' || !this.choice || n >= this.choice.options.length) return;
    if (this.choiceT < .45) return;                                                           // a mashed key must not answer for the player
    this.run.choose(n); this.choice = null; choicesEl.hidden = true; this.mode = 'next';
  }
  update(dt) {
    if (this.finished || this.suspended) return;
    if (!this.started) { this.started = true; this.mode = 'next'; }
    if (this.mode === 'choice') {
      this.choiceT += dt;
      if (!this.direct) { this.choiceLeft -= dt; if (this.choiceLeft <= 0) { this.choiceT = 1; this.pick(0); } }   // an unanswered call goes with its first answer
      return;
    }
    if (this.mode === 'line' && this.line && !queue.has(this.line.id)) { this.lost = (this.lost || 0) + dt; if (this.lost > 1.5) { this.lost = 0; this.line = null; this.mode = 'next'; } } else this.lost = 0;   // a line that vanished from the queue can never hold a scene
    if (this.mode === 'pause' || this.mode === 'gap') { this.wait -= dt; if (this.wait <= 0) this.mode = 'next'; }
    if (this.mode === 'next') this.step();
  }
  skipLine() { if (this.mode === 'line' && queue.cur && queue.cur.o && queue.cur.o.owner === this) queue.skip(); else if (this.mode === 'pause' || this.mode === 'gap') this.wait = 0; }
  skipScene() { if (!this.scene.skip && this.scene.skip !== undefined) return; this.fast = true; queue.clear(this.tag); if (this.mode === 'pause' || this.mode === 'gap' || this.mode === 'line') this.mode = 'next'; }
  finish() {
    if (this.finished) return; this.finished = true; queue.clear(this.tag);
    if (this.choice) { choicesEl.hidden = true; this.choice = null; }
  }
  /* camera: over the listener's shoulder, looking at whoever speaks */
  frame(line) {
    const sp = actor(line.char), cast = this.scene.cast || [];
    // the player's view: NPCs are seen over Ash's shoulder; Ash is seen over the shoulder of whoever stands nearest
    const others = cast.filter(c => c !== line.char && c !== 'ASH' && actor(c)).sort((a, b) => dist2(actor(a)) - dist2(actor(b)));
    const lis = line.char !== 'ASH' && cast.includes('ASH') ? actor('ASH') : others.length ? actor(others[0]) : null;
    if (!sp) { const p = actor('ASH'); cine.shot = { x: p.x + Math.sin(player.yaw) * 2.6, y: 1.7, z: p.z + Math.cos(player.yaw) * 2.6, tx: p.x, ty: 1.55, tz: p.z, fov: 46 }; return; }
    let ux = 0, uz = 1;
    if (lis) { const dx = sp.x - lis.x, dz = sp.z - lis.z, d = Math.hypot(dx, dz) || 1; ux = dx / d; uz = dz / d; } else { ux = Math.sin(sp.yaw); uz = Math.cos(sp.yaw); }
    const free = (x, z) => !pushOut(x, z, .35, true)[2];
    const base = lis || sp, tries = lis ? [[-2.3, .85], [-2.3, -.85], [-1.5, .9], [-1.5, -.9], [-3.2, 0]] : [[2.5, .5], [2.5, -.5], [1.6, 0], [3.4, 0]];
    let cam = null;
    for (const [back, side] of tries) { const x = base.x + ux * back - uz * side, z = base.z + uz * back + ux * side; if (free(x, z)) { cam = { x, z }; break; } }
    if (!cam) cam = { x: base.x - uz * .9, z: base.z + ux * .9 };
    cine.shot = { x: cam.x, y: lis ? 1.7 : 1.75, z: cam.z, tx: sp.x, ty: 1.38, tz: sp.z, fov: lis ? 42 : 46 };
  }
}
const dist2 = a => (a.x - player.x) ** 2 + (a.z - player.z) ** 2;
function actor(id) {
  if (id === 'ASH') return { x: player.x, z: player.z, yaw: player.car ? player.car.yaw : player.yaw };
  const n = npcs.get(id); return n ? { x: n.x, z: n.z, yaw: n.yaw } : null;
}

/* ---- gathering the cast round the player ---- */
function stage(sc) {
  const car = player.car, ids = (sc.cast || []).filter(c => c !== 'ASH' && HAS_BODY(c));
  const yaw = car ? car.yaw : G.camYaw, f = [Math.sin(yaw), Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)], dist = car ? 4.4 : 2.1;
  const free = (x, z) => !pushOut(x, z, .5, true)[2];
  ids.forEach((id, i) => {
    const off = (i - (ids.length - 1) / 2) * 1.7;
    const tries = [[dist, off], [dist, -off - 1.4], [dist * .6, off + 2.2], [-dist, off], [0, dist], [0, -dist], [dist * 1.6, 0]];
    let spot = null;
    for (const [fw, sd] of tries) { const x = player.x + f[0] * fw + r[0] * sd, z = player.z + f[1] * fw + r[1] * sd; if (free(x, z)) { spot = [x, z]; break; } }
    if (!spot) spot = [player.x + r[0] * 1.8, player.z + r[1] * 1.8];
    const yawTo = Math.atan2(player.x - spot[0], player.z - spot[1]);
    const n = npcs.get(id); if (n) npcs.moveTo(id, spot[0], spot[1], yawTo); else npcs.spawn(id, { x: spot[0], z: spot[1], yaw: yawTo });
  });
  const first = ids.length && npcs.get(ids[0]);
  if (first && !car) player.yaw = Math.atan2(first.x - player.x, first.z - player.z);
}

/* ---- the manager ---- */
const players = [], pendingDirect = [];
let direct = null, paused = false, watch = 0;
export const conv = {
  get busy() { return !!direct || players.length > 0 || pendingDirect.length > 0 || queue.busy; },
  get directActive() { return !!direct; },
  bind(getState) { stateGetter = getState; }
};

/** Start a scene. Returns a handle: done() is true once it has finished (or was cancelled or never applicable). */
export function play(id) {
  const sc = SCENES[id], st = stateGetter();
  const dead = { done: () => true, cancel() {} };
  if (!sc || !st) return dead;
  if (sc.if && !evalCond(sc.if, st)) return dead;
  const p = new ScenePlayer(id, sc.via === 'direct'), h = { done: () => p.finished, cancel: () => { p.finish(); if (direct === p) { teardown(p); trans = null; setFade(0); } } };
  if (p.direct) pendingDirect.push(p); else players.push(p);
  return h;
}
function ready() { return G.mode === 'playing' && !G.interior && !direct; }

/* ---- arriving at a cutscene: the world stops, the car goes quiet, the screen fades to black, Ash gets out, the scene fades in ---- */
const FADE = .5;
let trans = null;                                                                          // { phase: 'out' | 'hold' | 'in' | 'out2' | 'in2', t, dur }
const setFade = v => { fadeEl.style.opacity = String(Math.max(0, Math.min(1, v))); };
const isRadioShow = p => /^X0\d$/.test(p.scene.mission);
/** the car radio goes quiet (the station was changed, or Ash left the car) */
export function cancelRadio() { for (const p of players) if (isRadioShow(p)) { p.finish(); queue.clear(p.tag); } }
export const radioPlaying = () => players.some(isRadioShow);
/** phone calls and the radio fall silent for the cutscene; a call carries on afterwards, the ambient radio does not */
function silenceBackground() {
  for (const p of players) { if (isRadioShow(p)) { p.finish(); continue; } p.suspended = true; queue.clear(p.tag); }
  queue.clear(); capItem = null; subsEl.classList.remove('on');
}
function resumeBackground() {
  for (const p of players) { if (!p.suspended) continue; p.suspended = false; if (p.resumeLine) { const l = p.resumeLine; p.resumeLine = null; p.play(l); } else if (p.mode === 'held') p.mode = 'next'; }
}
function begin(p) {
  direct = p; G.mode = 'scene'; clearInput(); if (player.car) player.car.speed = 0;
  interaction.kind = null; interaction.text = ''; setSiren(false, 0);                    // the engine hum is silenced by the cinematic camera
  document.body.classList.add('cine'); silenceBackground(); cine.on = true; cine.shot = null; cine.pos = null;   // the camera holds still (and the hum stays off) while the screen fades
  trans = { phase: 'out', t: 0, dur: FADE };
}
function onBlack(p) {
  if (player.car) leaveCar(true);                                                          // Ash gets out of the car
  stage(p.scene);
  cineEl.hidden = false; cine.on = true; cine.shot = null; cine.pos = null; p.frame({ char: (p.scene.cast || ['ASH'])[0] }); cine.snap = true;
  $('skipScene').hidden = p.scene.skip === false; trans = { phase: 'hold', t: 0, dur: .25 };
}
function teardown(p) {
  if (direct !== p) return; direct = null; document.body.classList.remove('cine'); cineEl.hidden = true; choicesEl.hidden = true;
  endCine(); if (G.mode === 'scene') G.mode = 'playing'; clearInput(); if (!isTouch()) lockPointer(); resumeBackground();
}
function leave(p) { if (direct !== p || p.leaving) return; p.leaving = true; trans = { phase: 'out2', t: 0, dur: FADE * .8 }; }
function tickTrans(dt) {
  const T = trans; T.t += dt; const u = Math.min(1, T.t / T.dur);
  if (T.phase === 'out') { setFade(u); if (u >= 1) onBlack(direct); }
  else if (T.phase === 'hold') { setFade(1); if (u >= 1) trans = { phase: 'in', t: 0, dur: FADE }; }
  else if (T.phase === 'in') { setFade(1 - u); if (u >= 1) { trans = null; setFade(0); } }
  else if (T.phase === 'out2') { setFade(u); if (u >= 1) { teardown(direct); trans = { phase: 'in2', t: 0, dur: FADE * .8 }; } }
  else if (T.phase === 'in2') { setFade(1 - u); if (u >= 1) { trans = null; setFade(0); } }
}
export function update(dt) {
  if (paused) return;
  if (!direct && (!trans || trans.phase === 'in2') && pendingDirect.length && ready()) begin(pendingDirect.shift());
  queue.update(dt);
  if (queue.cur && capItem !== queue.cur) maybeCaption(queue.cur);                       // a recording that failed to load: now show the subtitle
  if (capItem && !queue.cur) { capItem = null; subsEl.classList.remove('on'); }
  if (trans) tickTrans(dt);
  if (direct && !direct.leaving && (!trans || trans.phase === 'in')) { direct.update(dt); if (direct.finished) leave(direct); }
  for (let i = players.length - 1; i >= 0; i--) { const p = players[i]; p.update(dt); if (p.finished) players.splice(i, 1); }
  watch = direct ? watch + dt : 0;
  if (watch > 600) { direct.finish(); teardown(direct); trans = null; setFade(0); }       // nothing may hold the game for ever
}
/** E / click / Enter / Space during a conversation: next line (or answer the highlighted choice) */
export function advance() {
  if (!direct) return false;
  if (direct.mode === 'choice') { direct.pick(direct.sel); return true; }
  direct.skipLine(); return true;
}
export function skipScene() { if (direct) direct.skipScene(); }
/** drop every scene and line that belongs to a mission that ended */
export function cancelAll() {
  const d = direct; pendingDirect.length = 0; players.forEach(p => p.finish()); players.length = 0; queue.clear(); if (d) { d.finish(); teardown(d); } trans = null; setFade(0);
  choicesEl.hidden = true; subsEl.classList.remove('on'); capItem = null;
}
export function setPaused(on) { paused = on; if (on) voice.suspendAudio(); else voice.resumeAudio(); }

/** developer tool: speak one line by ID, with its recording if it has one. Resolves to what happened. */
export async function testLine(id) {
  const line = LINES[id]; if (!line) return { id, ok: false, message: 'no such line ID' };
  await voice.loadManifest();
  const buf = await voice.loadRecording(id, true).catch(() => null);
  queue.play(line, { force: true, tag: 'test', test: true, pri: 4 });
  return { id, ok: true, recording: !!buf, seconds: buf ? +buf.duration.toFixed(2) : null, text: line.text.en, message: buf ? 'recording found (' + buf.duration.toFixed(1) + ' s)' : 'no recording: subtitle only' };
}

/* ---- input ---- */
window.addEventListener('keydown', e => {
  const p = direct || players.find(x => x.mode === 'choice'); if (!p) return;
  if (p.mode === 'choice') {
    const n = (e.code.match(/^(?:Digit|Numpad)([1-9])$/) || [])[1];
    if (n) { p.pick(+n - 1); e.preventDefault(); return; }
    if (p.direct && (e.code === 'ArrowDown' || e.code === 'ArrowUp')) { p.sel = (p.sel + (e.code === 'ArrowDown' ? 1 : -1) + p.choice.options.length) % p.choice.options.length; p.mark(); e.preventDefault(); return; }
    if (p.direct && (e.code === 'Enter' || e.code === 'Space')) { p.pick(p.sel); e.preventDefault(); return; }
  }
  if (!direct) return;
  if (e.code === 'Enter' || e.code === 'Space') { advance(); e.preventDefault(); }
  if (e.code === 'KeyX') skipScene();
});
cineEl.addEventListener('click', e => { if (e.target.closest('button') || e.target.closest('#choices')) return; advance(); });
$('skipScene').addEventListener('click', e => { e.stopPropagation(); skipScene(); });
hooks.advance = advance;
/** what is playing right now (tests and the developer console) */
export const debug = () => ({ direct: direct && direct.id, pending: pendingDirect.map(p => p.id), players: players.map(p => ({ id: p.id, mode: p.mode, line: p.line && p.line.id, wait: p.wait })), cur: queue.cur && queue.cur.id, queued: queue.q.map(i => i.id) });

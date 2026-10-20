// Keyboard, mouse (pointer lock) and touch controls. Everything is released when the window loses focus so nothing can stay "stuck".
import { G } from './state.js';
import { clamp } from './util.js';
import { canvas } from './render.js';
import { prefs, isKey, actionOf } from './prefs.js';

const $ = id => document.getElementById(id);
const keys = {}, touch = { moveId: null, lookId: null, ox: 0, oy: 0, mx: 0, my: 0, lx: 0, ly: 0, run: false, brake: false, fire: false };
let touchMode = false, mouseDown = false, actions = {};
const stickEl = $('stick');
export const isTouch = () => touchMode;
/** the pause menu and the map take the keyboard: only Esc and the pause / map keys do anything while it is blocked */
let blocked = false, capture = null;
export function setInputBlocked(b) { blocked = !!b; if (blocked) clearInput(true); }       // held keys survive a menu: holding W through a resume keeps you moving (keyup always clears them)
/** the next key press goes to cb(code) instead of the game (used by the key-binding screen); call with null to cancel */
export function captureKey(cb) { capture = cb || null; }
const down = id => { const a = actionOf(id); return !!(keys[prefs.binds[id]] || (a && a.alt && keys[a.alt])); };

export function bindActions(a) { actions = a; }
export function clearInput(keepKeys) {
  if (!keepKeys) for (const k in keys) keys[k] = false;
  mouseDown = false; touch.moveId = touch.lookId = null; touch.run = touch.brake = touch.fire = false;
  stickEl.style.display = 'none'; stickEl.firstElementChild.style.transform = '';
  document.querySelectorAll('.tbtn.on').forEach(b => b.classList.remove('on'));
}
export function lockPointer() { if (!touchMode && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the browser refused; click the game to retry */ } } }
export const hasLock = () => document.pointerLockElement === canvas;

window.addEventListener('keydown', e => {
  if (capture) { e.preventDefault(); e.stopPropagation(); const f = capture; capture = null; f(e.code); return; }
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;                  // typing in a menu field is not gameplay
  if (e.code === 'Escape') { if (!e.repeat) actions.escape && actions.escape(); return; }
  if (!blocked && ['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys[e.code] = true; return; }
  if (isKey('pause', e.code)) { actions.pause && actions.pause(); return; }
  if (isKey('map', e.code)) { actions.map && actions.map(); return; }
  keys[e.code] = true;                                                                              // held keys are tracked even while a menu is open, so holding W through a resume keeps you moving
  if (blocked) return;
  if (isKey('interact', e.code)) actions.interact && actions.interact();
  if (isKey('horn', e.code)) actions.horn && actions.horn();
  if (isKey('radio', e.code)) actions.radio && actions.radio();
  if (isKey('punch', e.code)) actions.punch && actions.punch();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { clearInput(); actions.blur && actions.blur(); });
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  if (G.mode === 'playing' && !hasLock() && !touchMode) { lockPointer(); return; }  // first click just captures the mouse
  if (G.mode === 'playing') { mouseDown = true; actions.shoot && actions.shoot(); }
});
window.addEventListener('mouseup', () => { mouseDown = false; });
document.addEventListener('mousemove', e => {
  if (G.mode !== 'playing' || !hasLock()) return;
  G.camYaw -= e.movementX * .0025 * prefs.mouse; G.camPitch = clamp(G.camPitch + e.movementY * .0025 * prefs.mouse * (prefs.invertY ? -1 : 1), -.1, 1.1); G.camDrag = 2;
});
document.addEventListener('pointerlockchange', () => { if (!touchMode && !hasLock()) { mouseDown = false; actions.lockLost && actions.lockLost(); } });

function enableTouch() {
  touchMode = true; document.body.classList.add('touch');
  $('help').innerHTML = '<b>left side</b><span>move / steer + gas</span><b>right side</b><span>look</span><b>buttons</b><span>car in/out, shoot, brake, run</span>';
  const hold = (id, key) => {
    const el = $(id);
    const on = e => { e.preventDefault(); e.stopPropagation(); if (G.mode !== 'playing') return; touch[key] = true; el.classList.add('on'); if (key === 'fire') actions.shoot && actions.shoot(); };
    const off = e => { e.preventDefault(); touch[key] = false; el.classList.remove('on'); };
    el.addEventListener('touchstart', on, { passive: false }); el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
  };
  hold('tBrake', 'brake'); hold('tRun', 'run'); hold('tFire', 'fire');
  $('tPunch').addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'playing') actions.punch && actions.punch(); }, { passive: false });
  $('tRadio').addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'playing') actions.radio && actions.radio(); }, { passive: false });
  $('tCar').addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (G.mode === 'playing') actions.interact && actions.interact(); }, { passive: false });
  window.addEventListener('touchstart', e => {
    if (G.mode !== 'playing') return;
    for (const tc of e.changedTouches) {
      if (tc.target.closest && tc.target.closest('.tbtn')) continue;
      if (tc.clientX < window.innerWidth / 2 && touch.moveId === null) { touch.moveId = tc.identifier; touch.ox = touch.mx = tc.clientX; touch.oy = touch.my = tc.clientY; stickEl.style.display = 'block'; stickEl.style.left = (tc.clientX - 50) + 'px'; stickEl.style.top = (tc.clientY - 50) + 'px'; }
      else if (touch.lookId === null) { touch.lookId = tc.identifier; touch.lx = tc.clientX; touch.ly = tc.clientY; }
    }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    for (const tc of e.changedTouches) {
      if (tc.identifier === touch.moveId) { touch.mx = tc.clientX; touch.my = tc.clientY; const dx = clamp(touch.mx - touch.ox, -40, 40), dy = clamp(touch.my - touch.oy, -40, 40); stickEl.firstElementChild.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
      else if (tc.identifier === touch.lookId) { G.camYaw -= (tc.clientX - touch.lx) * .006 * prefs.touchLook; G.camPitch = clamp(G.camPitch + (tc.clientY - touch.ly) * .004 * prefs.touchLook * (prefs.invertY ? -1 : 1), -.1, 1.1); G.camDrag = 2; touch.lx = tc.clientX; touch.ly = tc.clientY; }
    }
  }, { passive: true });
  const end = e => { for (const tc of e.changedTouches) { if (tc.identifier === touch.moveId) { touch.moveId = null; stickEl.style.display = 'none'; stickEl.firstElementChild.style.transform = ''; } if (tc.identifier === touch.lookId) touch.lookId = null; } };
  window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
}
if ('ontouchstart' in window && matchMedia('(pointer:coarse)').matches) enableTouch();

/** One snapshot of what the player is asking for this frame. */
export function readInput() {
  let fwd = 0, side = 0;
  if (down('forward')) fwd += 1; if (down('back')) fwd -= 1;
  if (down('right')) side += 1; if (down('left')) side -= 1;
  if (touch.moveId !== null) { side += clamp((touch.mx - touch.ox) / 40, -1, 1); fwd -= clamp((touch.my - touch.oy) / 40, -1, 1); }
  return { fwd: clamp(fwd, -1, 1), side: clamp(side, -1, 1), run: down('run') || touch.run, brake: down('brake') || touch.brake, fire: mouseDown || down('fire') || touch.fire };
}

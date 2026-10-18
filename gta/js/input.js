// Keyboard, mouse (pointer lock) and touch controls. Everything is released when the window loses focus so nothing can stay "stuck".
import { G } from './state.js';
import { clamp } from './util.js';
import { canvas } from './render.js';

const $ = id => document.getElementById(id);
const keys = {}, touch = { moveId: null, lookId: null, ox: 0, oy: 0, mx: 0, my: 0, lx: 0, ly: 0, run: false, brake: false, fire: false };
let touchMode = false, mouseDown = false, actions = {};
const stickEl = $('stick');
export const isTouch = () => touchMode;

export function bindActions(a) { actions = a; }
export function clearInput() {
  for (const k in keys) keys[k] = false;
  mouseDown = false; touch.moveId = touch.lookId = null; touch.run = touch.brake = touch.fire = false;
  stickEl.style.display = 'none'; stickEl.firstElementChild.style.transform = '';
  document.querySelectorAll('.tbtn.on').forEach(b => b.classList.remove('on'));
}
export function lockPointer() { if (!touchMode && canvas.requestPointerLock) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* the browser refused; click the game to retry */ } } }
export const hasLock = () => document.pointerLockElement === canvas;

window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  if (e.code === 'KeyE' || e.code === 'KeyF') actions.interact && actions.interact();
  if (e.code === 'KeyH') actions.horn && actions.horn();
  if (e.code === 'KeyP') actions.pause && actions.pause();
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
  G.camYaw -= e.movementX * .0025; G.camPitch = clamp(G.camPitch + e.movementY * .0025, -.1, 1.1); G.camDrag = 2;
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
      else if (tc.identifier === touch.lookId) { G.camYaw -= (tc.clientX - touch.lx) * .006; G.camPitch = clamp(G.camPitch + (tc.clientY - touch.ly) * .004, -.1, 1.1); G.camDrag = 2; touch.lx = tc.clientX; touch.ly = tc.clientY; }
    }
  }, { passive: true });
  const end = e => { for (const tc of e.changedTouches) { if (tc.identifier === touch.moveId) { touch.moveId = null; stickEl.style.display = 'none'; stickEl.firstElementChild.style.transform = ''; } if (tc.identifier === touch.lookId) touch.lookId = null; } };
  window.addEventListener('touchend', end); window.addEventListener('touchcancel', end);
}
if ('ontouchstart' in window && matchMedia('(pointer:coarse)').matches) enableTouch();

/** One snapshot of what the player is asking for this frame. */
export function readInput() {
  let fwd = 0, side = 0;
  if (keys.KeyW || keys.ArrowUp) fwd += 1; if (keys.KeyS || keys.ArrowDown) fwd -= 1;
  if (keys.KeyD || keys.ArrowRight) side += 1; if (keys.KeyA || keys.ArrowLeft) side -= 1;
  if (touch.moveId !== null) { side += clamp((touch.mx - touch.ox) / 40, -1, 1); fwd -= clamp((touch.my - touch.oy) / 40, -1, 1); }
  return { fwd: clamp(fwd, -1, 1), side: clamp(side, -1, 1), run: !!(keys.ShiftLeft || keys.ShiftRight || touch.run), brake: !!(keys.Space || touch.brake), fire: mouseDown || !!keys.KeyJ || touch.fire };
}

// Browser bootstrap: canvas, scaling, input events, audio unlock and the fixed-step loop.

import { App } from './app.js';
import { Audio } from './engine/audio.js';
import { W, H } from './engine/gfx.js';

const wrap = document.getElementById('wrap');
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });
canvas.width = W; canvas.height = H;

let display = { scaling: 'integer' };

function resize() {
  const iw = window.innerWidth, ih = window.innerHeight;
  let scale = Math.min(iw / W, ih / H);
  if (display.scaling === 'integer' && scale >= 1) scale = Math.floor(scale);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else wrap.requestFullscreen?.().catch(() => {});
}

const audio = new Audio();
const app = new App({
  ctx,
  audio,
  platform: {
    toggleFullscreen,
    isFullscreen: () => !!document.fullscreenElement,
    applyDisplay(s) {
      display = s;
      wrap.classList.toggle('scanlines', !!s.scanlines);
      resize();
    },
  },
});
window.__darko = app;

window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
resize();

// ---- input -------------------------------------------------------------------------------

const NEVER_BLOCK = new Set(['F5', 'F11', 'F12']);
function claims(code) {
  if (NEVER_BLOCK.has(code)) return false;
  if (['Tab', 'Space', 'Enter', 'Escape', 'Backspace', 'KeyF'].includes(code) || code.startsWith('Arrow')) return true;
  return Object.values(app.input.bindings).some(list => list.includes(code));
}

window.addEventListener('keydown', e => {
  audio.unlock();
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (claims(e.code)) e.preventDefault();
  if (e.code === 'KeyF' && !e.repeat) toggleFullscreen();
  app.input.keyDown(e.code);
});
window.addEventListener('keyup', e => app.input.keyUp(e.code));

function toLocal(e) {
  const r = canvas.getBoundingClientRect();
  return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)];
}
canvas.addEventListener('mousemove', e => app.input.mouseMove(...toLocal(e)));
canvas.addEventListener('mousedown', e => { audio.unlock(); canvas.focus(); app.input.mouseMove(...toLocal(e)); app.input.mouseDown(e.button); e.preventDefault(); });
window.addEventListener('mouseup', e => app.input.mouseUp(e.button));
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mouseleave', () => { app.input.mouse.inside = false; });

function lostFocus() {
  app.input.clearAll();
  app.top?.onBlur?.();
}
window.addEventListener('blur', lostFocus);
document.addEventListener('visibilitychange', () => { if (document.hidden) lostFocus(); });

// ---- loop --------------------------------------------------------------------------------

const STEP = 1 / 60;
let last = performance.now(), acc = 0;

function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) { app.update(STEP); acc -= STEP; }
  app.render();
  requestAnimationFrame(frame);
}

app.toTitle();
document.getElementById('boot')?.remove();
requestAnimationFrame(frame);

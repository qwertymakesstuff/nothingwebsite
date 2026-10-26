// Browser bootstrap: canvas, scaling, input events, audio unlock and the fixed-step loop.

import { App } from './app.js';
import { Audio } from './engine/audio.js';
import { palette32 } from './engine/palette.js';
import { W, H, TICK_HZ } from './game/config.js';
import { BootScene } from './scenes/boot.js';

const wrap = document.getElementById('wrap');
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d', { alpha: false });
canvas.width = W; canvas.height = H;
ctx.imageSmoothingEnabled = false;
const img = ctx.createImageData(W, H);
const out32 = new Uint32Array(img.data.buffer);
const pal = palette32();

let display = { scaling: 'integer' };

function resize() {
  const iw = window.innerWidth, ih = window.innerHeight;
  let scale = Math.min(iw / W, ih / H);
  if (display.scaling === 'integer') scale = Math.max(1, Math.floor(scale));
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}

const audio = new Audio();
const app = new App({
  audio,
  platform: {
    toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      else wrap.requestFullscreen?.().catch(() => {});
    },
    isFullscreen: () => !!document.fullscreenElement,
    applyDisplay(s) {
      display = s;
      wrap.classList.toggle('scanlines', !!s.scanlines);
      resize();
    },
  },
});
window.__hollow = app;

window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
resize();

// ---- input -------------------------------------------------------------------------------

const NEVER_BLOCK = new Set(['F5', 'F11', 'F12']);
function claims(code) {
  if (NEVER_BLOCK.has(code)) return false;
  if (['Tab', 'Space', 'Enter', 'Escape', 'Backspace'].includes(code) || code.startsWith('Arrow')) return true;
  return Object.values(app.settings.bindings).some(list => list.includes(code));
}

window.addEventListener('keydown', e => {
  audio.unlock();
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (claims(e.code)) e.preventDefault();
  app.input.keyDown(e.code);
});
window.addEventListener('keyup', e => app.input.keyUp(e.code));

function toLocal(e) {
  const r = canvas.getBoundingClientRect();
  return [Math.floor((e.clientX - r.left) / r.width * W), Math.floor((e.clientY - r.top) / r.height * H)];
}
canvas.addEventListener('mousemove', e => app.input.mouseMove(...toLocal(e)));
canvas.addEventListener('mousedown', e => { audio.unlock(); app.input.mouseMove(...toLocal(e)); app.input.mouseDown(e.button); e.preventDefault(); });
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

const STEP = 1000 / TICK_HZ;
let last = performance.now(), acc = 0;

function frame(now) {
  acc += Math.min(250, now - last);
  last = now;
  while (acc >= STEP) { app.update(); acc -= STEP; }
  const fb = app.render();
  fb.toRGBA(out32, pal);
  const [sx, sy] = app.shakeOffset();
  if (sx || sy) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  ctx.putImageData(img, sx, sy);
  requestAnimationFrame(frame);
}

app.push(new BootScene(app));
document.getElementById('boot')?.remove();
requestAnimationFrame(frame);

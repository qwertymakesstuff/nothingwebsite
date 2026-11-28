// Window manager: every application window is created here. Handles dragging, resizing (eight
// edges), minimise/maximise/restore, focus and stacking, edge snapping and taskbar events.
import { h, clamp } from '../lib/dom.js';
import { sound } from './sound.js';

const windows = new Map();
const listeners = new Set();
let zTop = 10, nextId = 1, layer = null, snapPreview = null;
const TASKBAR_H = 40;

export function initWM(root) {
  layer = root;
  snapPreview = h('div', { class: 'snap-preview' });
  layer.append(snapPreview);
  addEventListener('resize', () => {
    for (const w of windows.values()) {
      if (w.state === 'max') applyRect(w, area());
      else if (w.snap) applyRect(w, snapRect(w.snap));
      else keepOnScreen(w);
    }
  });
}
export const onWM = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (type, win) => listeners.forEach(fn => fn(type, win));
export const allWindows = () => [...windows.values()];
export const activeWindow = () => allWindows().find(w => w.focused) || null;
function area() { return { x: 0, y: 0, w: innerWidth, h: innerHeight - TASKBAR_H }; }
function snapRect(side) {
  const a = area();
  return side === 'left' ? { x: 0, y: 0, w: Math.floor(a.w / 2), h: a.h } : { x: Math.ceil(a.w / 2), y: 0, w: Math.floor(a.w / 2), h: a.h };
}

export function createWindow(opts) {
  const id = 'w' + nextId++;
  const a = area();
  const width = Math.min(opts.width || 720, a.w - 20), height = Math.min(opts.height || 480, a.h - 20);
  const cascade = (windows.size % 8) * 26;
  const rect = {
    x: opts.x ?? clamp(Math.round((a.w - width) / 2) - 120 + cascade, 4, a.w - width),
    y: opts.y ?? clamp(Math.round((a.h - height) / 2) - 70 + cascade, 4, a.h - height),
    w: width, h: height,
  };
  const btn = (cls, label, fn) => h('button', { class: 'wbtn ' + cls, type: 'button', 'aria-label': label, title: label, onpointerdown: e => e.stopPropagation(), onclick: e => { e.stopPropagation(); fn(); } });
  const icon = h('span', { class: 'win-icon', html: opts.icon || '' });
  const title = h('span', { class: 'win-title' }, opts.title || 'Window');
  const body = h('div', { class: 'win-body' });
  const bar = h('div', { class: 'win-titlebar' }, icon, title, h('div', { class: 'win-btns' },
    btn('min', 'Minimize', () => win.minimize()),
    opts.resizable === false ? null : btn('max', 'Maximize', () => win.toggleMax()),
    btn('close', 'Close', () => win.close())));
  const el = h('div', { class: 'win opening ' + (opts.className || ''), role: 'dialog', 'aria-label': opts.title || 'Window' }, bar, body);
  if (opts.resizable !== false) for (const d of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) el.append(h('div', { class: 'rz rz-' + d, dataset: { dir: d } }));
  setTimeout(() => el.classList.remove('opening'), 180);

  const win = {
    id, el, body, app: opts.app, rect, state: 'normal', snap: null, focused: false, minW: opts.minW || 320, minH: opts.minH || 200,
    title: opts.title, icon: opts.icon, data: opts.data || {},
    setTitle(t) { win.title = t; title.textContent = t; el.setAttribute('aria-label', t); emit('update', win); },
    setIcon(svg) { win.icon = svg; icon.innerHTML = svg; emit('update', win); },
    focus() {
      if (win.state === 'min') { win.state = win.prevState || 'normal'; el.classList.remove('minimized'); }
      for (const o of windows.values()) if (o !== win && o.focused) { o.focused = false; o.el.classList.remove('focused'); emit('blur', o); }
      if (!win.focused) { win.focused = true; el.classList.add('focused'); }
      el.style.zIndex = ++zTop;
      emit('focus', win);
      opts.onFocus?.(win);
    },
    minimize() {
      if (win.state === 'min') return;
      win.prevState = win.state; win.state = 'min';
      el.classList.add('minimized'); win.focused = false; el.classList.remove('focused');
      sound('minimize');
      emit('minimize', win);
      const next = allWindows().filter(o => o.state !== 'min').sort((p, q) => q.el.style.zIndex - p.el.style.zIndex)[0];
      if (next) next.focus();
    },
    maximize() { if (win.state === 'max') return; win.restoreRect = { ...(win.snap ? win.preSnap : win.rect) }; win.state = 'max'; win.snap = null; el.classList.add('maximized'); applyRect(win, area()); emit('update', win); },
    restore() {
      if (win.state === 'min') return win.focus();
      if (win.state === 'max') { win.state = 'normal'; el.classList.remove('maximized'); applyRect(win, win.restoreRect || rect); emit('update', win); }
    },
    toggleMax() { win.state === 'max' ? win.restore() : win.maximize(); },
    close(force) {
      if (!force && opts.beforeClose && opts.beforeClose(win) === false) return;
      el.classList.add('closing');
      sound('close');
      setTimeout(() => el.remove(), 140);
      windows.delete(id);
      opts.onClose?.(win);
      emit('close', win);
      const next = allWindows().filter(o => o.state !== 'min').sort((p, q) => q.el.style.zIndex - p.el.style.zIndex)[0];
      if (next) next.focus();
    },
  };
  windows.set(id, win);
  applyRect(win, rect);
  layer.append(el);

  el.addEventListener('pointerdown', () => { if (!win.focused) win.focus(); }, true);
  bar.addEventListener('dblclick', e => { if (opts.resizable !== false && !e.target.closest('.wbtn')) win.toggleMax(); });
  bar.addEventListener('pointerdown', e => startDrag(win, e));
  bar.addEventListener('contextmenu', e => { e.preventDefault(); opts.onTitleMenu?.(e, win); });
  el.querySelectorAll('.rz').forEach(z => z.addEventListener('pointerdown', e => startResize(win, e, z.dataset.dir)));

  emit('open', win);
  opts.mount?.(body, win);
  win.focus();
  if (opts.maximized) win.maximize();
  return win;
}

function applyRect(win, r) {
  const s = win.el.style;
  s.left = r.x + 'px'; s.top = r.y + 'px'; s.width = r.w + 'px'; s.height = r.h + 'px';
  if (win.state === 'normal' && !win.snap) Object.assign(win.rect, r);
  win.el.dispatchEvent(new CustomEvent('winresize'));
}
function keepOnScreen(win) {
  const a = area(), r = win.rect;
  r.x = clamp(r.x, -r.w + 120, a.w - 120); r.y = clamp(r.y, 0, a.h - 30);
  applyRect(win, r);
}

function startDrag(win, e) {
  if (e.button !== 0 || e.target.closest('.wbtn')) return;
  e.preventDefault();
  const sx = e.clientX, sy = e.clientY;
  let start = { ...win.rect }, moved = false, snap = null;
  const move = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    if (!moved) {
      moved = true; win.el.classList.add('dragging');
      if (win.state === 'max' || win.snap) {
        // pull the window out of maximised/snapped, keeping the cursor at the same relative spot
        const base = win.state === 'max' ? (win.restoreRect || win.rect) : win.preSnap;
        const fx = (sx - win.el.offsetLeft) / win.el.offsetWidth;
        win.state = 'normal'; win.snap = null; win.el.classList.remove('maximized');
        start = { x: sx - base.w * fx, y: 0, w: base.w, h: base.h };
        applyRect(win, { ...start });
        emit('update', win);
      }
    }
    const a = area();
    applyRect(win, { x: start.x + dx, y: clamp(start.y + dy, 0, a.h - 28), w: start.w, h: start.h });
    snap = ev.clientY <= 2 ? 'max' : ev.clientX <= 2 ? 'left' : ev.clientX >= innerWidth - 3 ? 'right' : null;
    if (snap) { const r = snap === 'max' ? area() : snapRect(snap); Object.assign(snapPreview.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' }); snapPreview.classList.add('on'); }
    else snapPreview.classList.remove('on');
  };
  const up = () => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    win.el.classList.remove('dragging'); snapPreview.classList.remove('on');
    if (snap === 'max') { win.restoreRect = { ...win.rect }; win.maximize(); }
    else if (snap) { win.preSnap = { ...win.rect }; win.snap = snap; applyRect(win, snapRect(snap)); }
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}

function startResize(win, e, dir) {
  if (win.state === 'max') return;
  e.preventDefault(); e.stopPropagation();
  const sx = e.clientX, sy = e.clientY, r0 = { ...(win.snap ? { x: win.el.offsetLeft, y: win.el.offsetTop, w: win.el.offsetWidth, h: win.el.offsetHeight } : win.rect) };
  win.snap = null;
  win.el.classList.add('dragging');
  const move = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy, r = { ...r0 };
    if (dir.includes('e')) r.w = Math.max(win.minW, r0.w + dx);
    if (dir.includes('s')) r.h = Math.max(win.minH, r0.h + dy);
    if (dir.includes('w')) { r.w = Math.max(win.minW, r0.w - dx); r.x = r0.x + r0.w - r.w; }
    if (dir.includes('n')) { r.h = Math.max(win.minH, r0.h - dy); r.y = Math.max(0, r0.y + r0.h - r.h); if (r.y === 0) r.h = r0.y + r0.h; }
    applyRect(win, r);
  };
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); win.el.classList.remove('dragging'); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}

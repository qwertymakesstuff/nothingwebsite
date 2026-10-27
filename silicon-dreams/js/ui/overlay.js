// Dialogs, confirmations, toasts and tooltips.

import { h, clear } from './dom.js';
import { play } from './sound.js';

let layer, toastBox, tipEl, settingsRef = () => ({ tooltips: true, confirm: true });

export function initOverlay(getSettings) {
  settingsRef = getSettings;
  layer = h('div.modal-layer', { 'aria-live': 'polite' });
  toastBox = h('div.toasts', { role: 'status', 'aria-live': 'polite' });
  tipEl = h('div.tooltip', { role: 'tooltip', hidden: true });
  document.body.append(layer, toastBox, tipEl);
  let current = null;
  const show = (target, x, y) => {
    const text = target.getAttribute('data-tip');
    if (!text || !settingsRef().tooltips) return;
    tipEl.textContent = text;
    tipEl.hidden = false;
    position(x, y);
  };
  const position = (x, y) => {
    const r = tipEl.getBoundingClientRect();
    let left = x + 14, top = y + 16;
    if (left + r.width > innerWidth - 8) left = x - r.width - 12;
    if (top + r.height > innerHeight - 8) top = y - r.height - 12;
    tipEl.style.left = `${Math.max(6, left)}px`;
    tipEl.style.top = `${Math.max(6, top)}px`;
  };
  document.addEventListener('pointerover', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t !== current) { current = t; if (t) show(t, e.clientX, e.clientY); else tipEl.hidden = true; }
  });
  document.addEventListener('pointermove', e => { if (current && !tipEl.hidden) position(e.clientX, e.clientY); });
  document.addEventListener('pointerdown', () => { tipEl.hidden = true; current = null; });
  document.addEventListener('focusin', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t) { const r = t.getBoundingClientRect(); current = t; show(t, r.left, r.bottom); } else tipEl.hidden = true;
  });
}

export function hideTip() { if (tipEl) tipEl.hidden = true; }

export function toast(text, level = 'info', ms = 3600) {
  const icon = { good: '✔', bad: '✖', warn: '⚠', info: 'ℹ' }[level] || 'ℹ';
  const el = h(`div.toast.${level}`, h('span.toast-icon', { 'aria-hidden': 'true' }, icon), h('span', text));
  toastBox.append(el);
  while (toastBox.children.length > 5) toastBox.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
}

// result helper: toast the reason of a failed action, play a sound
export function report(r, okText, sound = 'click') {
  if (!r) return r;
  if (!r.ok) { toast(r.reason || 'That didn\'t work.', 'bad', 5200); play('error'); }
  else { if (okText) toast(okText, 'good'); play(sound); }
  return r;
}

const stack = [];

export function modal({ title, body, actions = [], wide = false, onClose, cls = '' }) {
  const close = (v) => {
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
    wrap.remove();
    document.removeEventListener('keydown', key);
    if (prev && prev.focus) prev.focus();
    if (onClose) onClose(v);
  };
  const prev = document.activeElement;
  const btns = actions.map(a => h(`button.btn${a.cls ? '.' + a.cls : ''}`, { type: 'button', disabled: !!a.disabled, on: { click: () => { const keep = a.onClick ? a.onClick(close) : undefined; if (keep !== false && !a.manual) close(a.value); } } }, a.label));
  const box = h(`div.modal${wide ? '.wide' : ''}${cls ? '.' + cls : ''}`, { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div.modal-head', h('h2', title), h('button.icon-btn.modal-x', { type: 'button', 'aria-label': 'Close', on: { click: () => close(null) } }, '✕')),
    h('div.modal-body', body),
    btns.length ? h('div.modal-actions', btns) : null);
  const wrap = h('div.modal-wrap', { on: { pointerdown: e => { if (e.target === wrap) close(null); } } }, box);
  const key = e => { if (e.key === 'Escape' && stack[stack.length - 1] === entry) { e.preventDefault(); close(null); } };
  document.addEventListener('keydown', key);
  layer.append(wrap);
  const entry = { close, box };
  stack.push(entry);
  setTimeout(() => { const f = box.querySelector('.modal-actions .btn.primary') || box.querySelector('button, input, select'); if (f) f.focus(); }, 0);
  return entry;
}

export function confirmBox(title, text, { ok = 'Confirm', danger = false, force = false } = {}) {
  if (!force && !settingsRef().confirm) return Promise.resolve(true);
  return new Promise(res => {
    modal({ title, body: h('p', text), onClose: v => res(v === true), actions: [{ label: 'Cancel', value: false }, { label: ok, value: true, cls: danger ? 'danger' : 'primary' }] });
  });
}

export function alertBox(title, body) {
  return new Promise(res => modal({ title, body: typeof body === 'string' ? h('p', body) : body, onClose: () => res(), actions: [{ label: 'OK', cls: 'primary' }] }));
}

export const closeAll = () => { while (stack.length) stack[stack.length - 1].close(null); };
export { clear };

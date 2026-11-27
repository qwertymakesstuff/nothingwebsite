// Balloon notifications in the corner, plus a history the tray bell opens.
import { h } from '../lib/dom.js';
import { sound } from './sound.js';
import { worldNow } from './state.js';
import { clock } from '../lib/time.js';
const history = [];
const subs = new Set();
let tray = null;
export function initNotify(root) { tray = h('div', { class: 'toasts', 'aria-live': 'polite' }); root.append(tray); }
export function notify({ title, body, icon, onclick, quiet }) {
  const item = { title, body, icon, onclick, at: worldNow(), read: false };
  history.unshift(item); if (history.length > 40) history.pop();
  subs.forEach(fn => fn(history));
  if (!quiet) sound('notify');
  const t = h('div', { class: 'toast', role: 'status', onclick: () => { onclick?.(); dismiss(); } },
    icon ? h('div', { class: 'toast-icon', html: icon }) : null,
    h('div', { class: 'toast-copy' }, h('strong', null, title), body ? h('span', null, body) : null),
    h('button', { class: 'toast-x', type: 'button', 'aria-label': 'Dismiss', onclick: e => { e.stopPropagation(); dismiss(); } }, '×'));
  tray.append(t);
  const timer = setTimeout(dismiss, 6000);
  function dismiss() { clearTimeout(timer); t.classList.add('out'); setTimeout(() => t.remove(), 250); }
}
export const notifications = () => history;
export const onNotify = fn => { subs.add(fn); return () => subs.delete(fn); };
export function markAllRead() { history.forEach(n => n.read = true); subs.forEach(fn => fn(history)); }
export const timeOf = (n, h24) => clock(n.at, h24);

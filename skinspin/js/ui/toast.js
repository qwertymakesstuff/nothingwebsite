// Toast notifications.

import { esc } from './dom.js';

let host;

export function toast(message, { kind = 'info', html = false, timeout = 3800 } = {}) {
  host ||= document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = html ? message : esc(message);
  host.appendChild(el);
  while (host.children.length > 4) host.firstElementChild.remove();
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 300); }, timeout);
}

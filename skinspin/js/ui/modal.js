// Modal dialogs on top of <dialog>: focus trapping and Escape come from the browser.

import { ICONS } from './icons.js';
import { esc } from './dom.js';

let current = null;

// actions: [{ label, kind: 'primary'|'danger'|'ghost', onClick(close) => void|false, disabled }]
export function openModal({ title, body = '', actions = [], wide = false, onClose, className = '' }) {
  closeModal();
  const dlg = document.createElement('dialog');
  dlg.className = `modal ${wide ? 'modal-wide' : ''} ${className}`;
  dlg.innerHTML = `<div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${ICONS.close}</button></div>
<div class="modal-body">${body}</div>
${actions.length ? `<div class="modal-actions">${actions.map((a, i) => `<button class="btn btn-${a.kind || 'ghost'}" data-act="${i}" ${a.disabled ? 'disabled' : ''}>${esc(a.label)}</button>`).join('')}</div>` : ''}`;
  document.body.appendChild(dlg);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (dlg.open) dlg.close();
    dlg.remove();
    if (current && current.dlg === dlg) current = null;
    onClose?.();
  };
  dlg.addEventListener('close', close);
  dlg.addEventListener('click', e => {
    if (e.target === dlg) return close(); // backdrop
    if (e.target.closest('[data-close]')) return close();
    const btn = e.target.closest('[data-act]');
    if (btn && !btn.disabled) {
      const a = actions[+btn.dataset.act];
      if (a.onClick?.(close) !== false) close();
    }
  });
  dlg.showModal();
  current = { dlg, close };
  return { el: dlg, close };
}

export function closeModal() {
  if (current) current.close();
}

// Small DOM helpers shared by every screen.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const money = n => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
export const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

export function html(el, markup) { el.innerHTML = markup; return el; }

export function toast(text, tone = 'info', ms = 3200) {
  const root = document.getElementById('toasts');
  if (!root) return;
  const t = document.createElement('div');
  t.className = `toast toast-${tone}`;
  t.setAttribute('role', 'status');
  t.textContent = text;
  root.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, ms);
}

// A modal dialog. content: HTML string. Returns { el, close }.
export function modal(content, { className = '', onClose, dismissable = true, label = 'Dialog' } = {}) {
  const root = document.getElementById('modals');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal ${className}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${content}</div>`;
  root.append(wrap);
  const prevFocus = document.activeElement;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey, true); onClose?.(); prevFocus?.focus?.(); };
  const onKey = e => { if (e.key === 'Escape' && dismissable) { e.stopPropagation(); e.preventDefault(); close(); } };
  document.addEventListener('keydown', onKey, true);
  if (dismissable) wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  setTimeout(() => (wrap.querySelector('[autofocus]') ?? wrap.querySelector('button, [href], input, select'))?.focus(), 0);
  return { el: wrap.firstElementChild, close };
}

export function confirmBox(text, yes = 'Yes', no = 'Cancel') {
  return new Promise(resolve => {
    const m = modal(`<p class="confirm-text">${esc(text)}</p><div class="row end"><button class="btn ghost" data-no>${esc(no)}</button><button class="btn danger" data-yes autofocus>${esc(yes)}</button></div>`, { onClose: () => resolve(false), label: 'Confirm' });
    m.el.querySelector('[data-yes]').onclick = () => { resolve(true); m.close(); };
    m.el.querySelector('[data-no]').onclick = () => m.close();
  });
}

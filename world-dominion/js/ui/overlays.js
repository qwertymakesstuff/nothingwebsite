// Drawers, the event/confirm modal, toasts and the map tooltip — the only kinds of secondary UI the game uses.
import { h, clear } from './dom.js';
import { icon } from './icons.js';

// Escape closes the most recently opened thing that can be closed.
const stack = [];
export function pushLayer(layer) { remove(layer); stack.push(layer); }
export function remove(layer) { const i = stack.indexOf(layer); if (i >= 0) stack.splice(i, 1); }
export function closeTop() {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i].dismissible !== false) { stack[i].close(); return true; }
  return false;
}
export const modalOpen = () => stack.some((l) => l.isModal);

// ——— Drawer ———
export class Drawer {
  constructor(side, { onClose } = {}) {
    this.side = side; this.onClose = onClose; this.key = null;
    this.titleEl = h('div.wd-drawer-title');
    this.leadEl = h('div');
    this.closeBtn = h('button.wd-icon-btn', { type: 'button', 'aria-label': 'Close panel', title: 'Close (Esc)', on: { click: () => this.close() } }, icon('close'));
    this.body = h('div.wd-drawer-body');
    this.foot = h('div.wd-drawer-foot');
    this.el = h(`aside.wd-drawer.wd-surface.${side}`, { 'aria-hidden': 'true', role: 'dialog' },
      h('header.wd-drawer-head', this.leadEl, this.titleEl, this.closeBtn), this.body, this.foot);
    document.body.append(this.el);
  }
  get isOpen() { return this.el.classList.contains('open'); }
  // content: { key, lead?, title, subtitle?, body: Node[], foot?: Node[] }
  show(content) {
    this.key = content.key;
    clear(this.leadEl); if (content.lead) this.leadEl.append(content.lead);
    this.leadEl.hidden = !content.lead;
    clear(this.titleEl).append(h('h2', content.title), content.subtitle ? h('p', content.subtitle) : '');
    this.el.setAttribute('aria-label', content.title);
    clear(this.body).append(...content.body);
    clear(this.foot); if (content.foot?.length) this.foot.append(...content.foot);
    this.foot.hidden = !content.foot?.length;
    if (!content.keepScroll) this.body.scrollTop = 0;
    this.el.classList.add('open'); this.el.setAttribute('aria-hidden', 'false');
    pushLayer(this);
  }
  close() {
    if (!this.isOpen) return;
    this.el.classList.remove('open'); this.el.setAttribute('aria-hidden', 'true');
    const key = this.key; this.key = null;
    remove(this); this.onClose?.(key);
  }
}

// ——— Modal (events and confirmations) ———
// spec: { tone, icon, kicker: Node[], title, body, choices:[{label, effects:Node, onPick}], dismissible }
export function openModal(spec) {
  const prevFocus = document.activeElement;
  const layer = { isModal: true, dismissible: spec.dismissible !== false, close: () => done(null) };
  const choiceBtns = spec.choices.map((c, i) => h('button.wd-choice', { type: 'button', on: { click: () => done(i) } },
    h('span.wd-choice-t', c.label), c.effects || ''));
  const wrap = h('div.wd-modal-wrap', { on: { click: (e) => { if (e.target === wrap && layer.dismissible) done(null); } } },
    h('div.wd-modal', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'wdModalTitle' },
      h(`div.wd-modal-art.${spec.tone || 'warn'}`, icon(spec.icon || 'alert')),
      h('div.wd-modal-body',
        spec.kicker?.length ? h('div.wd-modal-kicker', spec.kicker) : '',
        h('h2#wdModalTitle', spec.title),
        h('p', spec.body),
        h('div.wd-choices', choiceBtns))));
  document.body.append(wrap);
  pushLayer(layer);
  setTimeout(() => choiceBtns[0]?.focus({ preventScroll: true }), 30);
  let finished = false;
  function done(i) {
    if (finished) return; finished = true;
    remove(layer); wrap.remove();
    prevFocus?.focus?.({ preventScroll: true });
    if (i == null) spec.onDismiss?.(); else spec.choices[i].onPick?.();
  }
  return layer;
}

// ——— Toasts ———
const toastHost = () => document.querySelector('.wd-toasts') || document.body.appendChild(h('div.wd-toasts', { 'aria-live': 'polite' }));
export function toast(message, { tone = 'info', icon: ic = 'info', ms = 4500 } = {}) {
  const host = toastHost();
  const el = h(`div.wd-toast.${tone}`, { role: 'status' },
    icon(ic), h('div.wd-toast-msg', { html: message }),
    h('button.wd-icon-btn', { type: 'button', 'aria-label': 'Dismiss', on: { click: () => out() } }, icon('close', 'sm')));
  host.prepend(el);
  while (host.children.length > 3) host.lastChild.remove();
  let timer = setTimeout(out, ms);
  el.addEventListener('pointerenter', () => clearTimeout(timer));
  el.addEventListener('pointerleave', () => { timer = setTimeout(out, 1800); });
  function out() { clearTimeout(timer); el.classList.add('out'); setTimeout(() => el.remove(), 260); }
  return el;
}

// ——— Map tooltip ———
export function tooltip() {
  const el = h('div.wd-tip', { hidden: true, 'aria-hidden': 'true' });
  document.body.append(el);
  return {
    show(content, x, y) { clear(el).append(...content); el.hidden = false; el.style.left = x + 'px'; el.style.top = y + 'px'; },
    hide() { el.hidden = true; },
  };
}

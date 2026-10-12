// One accessible modal used for menus, pickers and prompts: focus moves in, Tab stays inside, Esc and a
// click outside close it, and focus goes back to what opened it. The page behind is made inert.
// On phones it slides up from the bottom as a sheet (see components.css).

import { h } from '../utils/dom.js';
import { icon } from './icons.js';

let openCount = 0;
let uid = 0;
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function setBackgroundInert(on) {
  const app = document.querySelector('.app');
  if (!app) return;
  if (on) app.setAttribute('inert', ''); else app.removeAttribute('inert');
}

/**
 * @param {{ title: string, body: Node, actions?: { label: string, primary?: boolean, onClick?: () => (boolean|void|Promise<boolean|void>) }[],
 *           variant?: 'dialog' | 'menu', onClose?: () => void }} opts
 * Return false from an action's onClick to keep the dialog open (for example when validation fails).
 */
export function openDialog({ title, body, actions = [], variant = 'dialog', onClose = () => {} }) {
  const opener = document.activeElement;
  const titleId = `dlg-title-${++uid}`;
  let closed = false;

  const closeBtn = h('button', { class: 'icon-btn dlg__close', type: 'button', 'aria-label': 'Close', onclick: () => close() }, icon('close', 22));
  const buttons = actions.map((a) => {
    const b = h('button', { class: `btn ${a.primary ? 'btn--primary' : 'btn--ghost'}`, type: 'button' }, a.label);
    b.addEventListener('click', async () => {
      b.disabled = true;
      let keep = false;
      try { keep = (await a.onClick?.()) === false; } finally { if (!closed) b.disabled = false; }
      if (!keep) close();
    });
    return b;
  });
  const dialog = h('section', { class: 'dlg', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('div', { class: 'dlg__head' }, h('h2', { id: titleId }, title), closeBtn),
    h('div', { class: 'dlg__body' }, body),
    buttons.length ? h('div', { class: 'dlg__actions' }, buttons) : null);
  const el = h('div', { class: `dlg-backdrop dlg-backdrop--${variant}` }, dialog);

  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const nodes = [...dialog.querySelectorAll(FOCUSABLE)].filter((n) => !n.hidden && n.offsetParent !== null);
    if (!nodes.length) { e.preventDefault(); return; }
    const first = nodes[0], last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  function close() {
    if (closed) return;
    closed = true;
    el.remove();
    if (--openCount === 0) setBackgroundInert(false);
    try { opener?.isConnected && opener.focus?.(); } catch { /* ignore */ }
    onClose();
  }

  document.body.append(el);
  if (openCount++ === 0) setBackgroundInert(true);
  (dialog.querySelector('[data-autofocus]') || dialog.querySelector('.dlg__body button, .dlg__body input') || closeBtn).focus();

  return { el, dialog, close, get isOpen() { return !closed; } };
}

/** A list of actions (a "more" menu). Choosing one closes the menu first, then runs it. */
export function openMenu({ title, items }) {
  const list = h('ul', { class: 'menu', role: 'list' }, items.map((it) => h('li', null,
    h('button', {
      class: 'menu__item', type: 'button',
      onclick: () => { dlg.close(); it.onClick(); },
    }, icon(it.icon || 'note', 22), h('span', null, it.label)))));
  const dlg = openDialog({ title, body: list, variant: 'menu' });
  return dlg;
}

/** Ask for a name. Resolves to the trimmed text, or null if cancelled. */
export function promptName({ title, label = 'Name', initial = '', confirm = 'Save', description = '', max = 100 }) {
  return new Promise((resolve) => {
    let result = null;
    const input = h('input', { class: 'field', type: 'text', maxlength: String(max), value: initial, 'aria-label': label, placeholder: label, 'data-autofocus': '', autocomplete: 'off' });
    const error = h('p', { class: 'field-error', role: 'alert', hidden: true });
    const body = h('div', { class: 'stack' }, description ? h('p', { class: 'dlg__text' }, description) : null, input, error);
    let dlg;
    const submit = () => {
      const v = input.value.replace(/\s+/g, ' ').trim();
      if (!v) { error.textContent = 'Type a name first.'; error.hidden = false; input.focus(); return false; }
      result = v;
      return true;
    };
    dlg = openDialog({
      title, body, onClose: () => resolve(result),
      actions: [{ label: 'Cancel' }, { label: confirm, primary: true, onClick: submit }],
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (submit()) dlg.close(); } });
    input.select();
  });
}

import { h } from '../../utils/dom.js';
import { dismissToast } from '../uiStore.js';

export function Toaster({ ui }) {
  const el = h('div', { class: 'toaster', role: 'status', 'aria-live': 'polite' });
  const off = ui.subscribe((s) => s.toast, (toast) => {
    if (!toast) { el.replaceChildren(); return; }
    const action = toast.action;
    el.replaceChildren(h('div', { class: `toast toast--${toast.kind}${action ? ' toast--action' : ''}` },
      h('span', { class: 'toast__msg' }, toast.message),
      action ? h('button', {
        class: 'toast__btn', type: 'button',
        onclick: () => { dismissToast(ui); action.onClick(); },
      }, action.label) : null));
  });
  return { el, destroy: off };
}

import { h } from '../../utils/dom.js';

export function Toaster({ ui }) {
  const el = h('div', { class: 'toaster', role: 'status', 'aria-live': 'polite' });
  const off = ui.subscribe((s) => s.toast, (toast) => {
    el.replaceChildren(toast ? h('div', { class: `toast toast--${toast.kind}` }, toast.message) : '');
  });
  return { el, destroy: off };
}

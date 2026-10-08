import { h } from '../utils/dom.js';

/**
 * ?debug=1 overlay: shows what the player, lock screen controls and background handling are doing,
 * with a Copy button, so behaviour on a real phone can be reported without developer tools.
 */
export function DebugPanel({ debug }) {
  const pre = h('pre', { class: 'debug__log' });
  const body = h('div', { class: 'debug__body' }, pre);
  const copy = h('button', { class: 'debug__btn', type: 'button' }, 'Copy');
  const toggle = h('button', { class: 'debug__btn', type: 'button', 'aria-expanded': 'true' }, 'Hide');
  const el = h('aside', { class: 'debug', 'aria-label': 'Debug log' }, h('div', { class: 'debug__bar' }, h('strong', null, 'debug'), copy, toggle), body);

  const render = () => { pre.textContent = debug.dump(); pre.scrollTop = pre.scrollHeight; };
  render();
  debug.subscribe(render);

  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(debug.dump()); copy.textContent = 'Copied'; }
    catch { copy.textContent = 'Select & copy manually'; }
    setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
  });
  toggle.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.textContent = open ? 'Hide' : 'Show';
    toggle.setAttribute('aria-expanded', String(open));
  });
  return { el };
}

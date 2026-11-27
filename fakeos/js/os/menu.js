// Right-click / dropdown menus. items: [{ label, onclick, disabled, checked, shortcut, sub: [...] } | '-']
import { h } from '../lib/dom.js';
let open = null;
export function closeMenu() { if (open) { open.remove(); open = null; } }
export function showMenu(x, y, items, opts = {}) {
  closeMenu();
  const el = build(items);
  el.classList.add('root');
  if (opts.className) el.classList.add(opts.className);
  document.body.append(el);
  const r = el.getBoundingClientRect();
  el.style.left = Math.max(2, Math.min(x, innerWidth - r.width - 4)) + 'px';
  el.style.top = Math.max(2, Math.min(y, innerHeight - r.height - 4)) + 'px';
  open = el;
  return el;
}
function build(items) {
  const el = h('div', { class: 'ctx-menu', role: 'menu', oncontextmenu: e => e.preventDefault() });
  for (const it of items) {
    if (!it) continue;
    if (it === '-') { el.append(h('div', { class: 'ctx-sep' })); continue; }
    const row = h('div', { class: 'ctx-item' + (it.disabled ? ' disabled' : '') + (it.sub ? ' has-sub' : '') + (it.bold ? ' bold' : ''), role: 'menuitem' },
      h('span', { class: 'ctx-check' }, it.checked ? '✓' : it.radio ? '•' : ''),
      h('span', { class: 'ctx-label' }, it.label),
      h('span', { class: 'ctx-short' }, it.shortcut || (it.sub ? '▸' : '')));
    if (it.sub) {
      const sub = build(it.sub); sub.classList.add('sub'); row.append(sub);
      row.addEventListener('pointerenter', () => {
        const r = row.getBoundingClientRect(); sub.style.left = ''; sub.style.right = '';
        if (r.right + 200 > innerWidth) sub.classList.add('flip'); else sub.classList.remove('flip');
      });
    } else if (!it.disabled) row.addEventListener('click', e => { e.stopPropagation(); closeMenu(); it.onclick?.(); });
    el.append(row);
  }
  return el;
}
addEventListener('pointerdown', e => { if (open && !e.target.closest('.ctx-menu')) closeMenu(); }, true);
addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
addEventListener('blur', closeMenu);

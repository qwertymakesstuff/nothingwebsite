import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';

export const NAV_ITEMS = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'search', label: 'Search', icon: 'search' },
  { name: 'library', label: 'Library', icon: 'library' },
  { name: 'queue', label: 'Queue', icon: 'queue' },
];

function link(item, cls) {
  return h('a', { class: cls, href: `#/${item.name}`, 'data-route': item.name },
    icon(item.icon, cls === 'bottom-nav__item' ? 24 : 22), h('span', null, item.label));
}

function markActive(container, route) {
  for (const a of container.querySelectorAll('[data-route]')) {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

export function Sidebar() {
  const el = h('nav', { class: 'sidebar', 'aria-label': 'Primary' },
    h('a', { class: 'brand', href: '#/home' }, h('span', { class: 'brand__mark', 'aria-hidden': 'true' }, icon('note', 18)), h('span', null, 'missing music')),
    h('div', { class: 'sidebar__links' }, NAV_ITEMS.map((i) => link(i, 'sidebar__item'))));
  return { el, setRoute: (r) => markActive(el, r) };
}

export function BottomNav() {
  const el = h('nav', { class: 'bottom-nav', 'aria-label': 'Primary' }, NAV_ITEMS.map((i) => link(i, 'bottom-nav__item')));
  return { el, setRoute: (r) => markActive(el, r) };
}

import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { SearchBox } from '../components/searchBox.js';

export function SearchView({ router, params }) {
  const q = params.get('q') || '';
  const box = SearchBox({ router, initial: q, autofocus: !q, className: 'searchbox--view' });
  const body = q
    ? h('div', { class: 'empty' },
      h('div', { class: 'empty__icon' }, icon('search', 32)),
      h('h2', null, 'Search is not connected yet'),
      h('p', null, `You searched for "${q}". Results from YouTube arrive in the next phase.`))
    : h('div', { class: 'empty' },
      h('div', { class: 'empty__icon' }, icon('search', 32)),
      h('h2', null, 'Search for music'),
      h('p', null, 'Type a song, artist or album above.'));
  const el = h('section', { class: 'view-section view-section--search' },
    h('h1', { class: 'page-title' }, 'Search'),
    h('div', { class: 'search-mobile' }, box.el),
    body);
  return { el, destroy() {} };
}

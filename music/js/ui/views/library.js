import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';

export function LibraryView() {
  const el = h('section', { class: 'view-section' },
    h('h1', { class: 'page-title' }, 'Library'),
    h('div', { class: 'empty' },
      h('div', { class: 'empty__icon' }, icon('library', 32)),
      h('h2', null, 'Your library is empty'),
      h('p', null, 'Favorites and playlists will live here once they are built.')));
  return { el, destroy() {} };
}

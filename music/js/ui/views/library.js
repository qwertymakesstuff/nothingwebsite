import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from '../components/artwork.js';
import { promptName } from '../dialog.js';
import { openImportDialog } from '../components/importDialog.js';
import { showToast } from '../uiStore.js';
import { summary } from '../components/trackActions.js';
import { shallowEqual } from '../../core/store.js';

const countText = (n) => `${n} ${n === 1 ? 'song' : 'songs'}`;

/** Library: favorites, recently played and your playlists. */
export function LibraryView({ player, library, services, ui, router }) {
  const d = disposer();
  const el = h('section', { class: 'view-section library-view' });

  async function newPlaylist() {
    const name = await promptName({ title: 'New playlist', label: 'Playlist name', confirm: 'Create' });
    if (!name) return;
    const p = library.createPlaylist(name);
    if (p) router.navigate('playlist', { id: p.id });
  }

  function tile(href, iconName, label, count) {
    return h('a', { class: 'library-tile', href },
      h('span', { class: 'library-tile__icon', 'aria-hidden': 'true' }, icon(iconName, 26)),
      h('span', { class: 'library-tile__text' }, h('strong', null, label), h('small', null, countText(count))),
      h('span', { class: 'row__chev', 'aria-hidden': 'true' }, icon('chevron-right', 22)));
  }

  function card(p) {
    const art = Artwork('playlist-card__art');
    art.update(p.tracks[0] ?? null);
    return h('article', { class: 'playlist-card' },
      h('a', { class: 'playlist-card__link', href: `#/playlist?id=${encodeURIComponent(p.id)}`, 'aria-label': `${p.name}, ${countText(p.tracks.length)}` },
        art.el,
        h('span', { class: 'playlist-card__info' }, h('strong', null, p.name), h('small', null, summary(p.tracks)))),
      h('button', {
        class: 'icon-btn playlist-card__play', type: 'button', 'aria-label': `Play ${p.name}`, disabled: !p.tracks.length,
        onclick: () => player.playTracks(p.tracks, 0),
      }, icon('play', 24)));
  }

  function render({ favorites, recent, playlists }) {
    el.replaceChildren(
      h('div', { class: 'page-head' },
        h('h1', { class: 'page-title' }, 'Library'),
        h('div', { class: 'page-head__actions' },
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => openImportDialog({ services, library, ui, router }) }, icon('download', 20), 'Import'),
          h('button', { class: 'btn btn--primary', type: 'button', onclick: newPlaylist }, icon('plus', 20), 'New playlist'))),
      h('div', { class: 'library-tiles' },
        tile('#/favorites', 'heart', 'Favorites', favorites.length),
        tile('#/recent', 'clock', 'Recently played', recent.length)),
      h('div', { class: 'results-head' }, h('h2', null, 'Playlists')),
      playlists.length
        ? h('div', { class: 'playlist-grid' }, playlists.map(card))
        : h('div', { class: 'empty library-empty' },
          h('div', { class: 'empty__icon' }, icon('library', 32)),
          h('h2', null, 'No playlists yet'),
          h('p', null, 'Make one, or import a public playlist from YouTube. You can add any song to it from a search, the queue or the player.'),
          h('button', { class: 'btn btn--primary', type: 'button', onclick: newPlaylist }, 'Create a playlist')));
  }

  d.add(library.subscribe((s) => ({ favorites: s.favorites, recent: s.recent, playlists: s.playlists }), render, { equals: shallowEqual }));
  return { el, destroy: d.run };
}

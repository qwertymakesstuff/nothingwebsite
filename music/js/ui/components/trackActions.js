// What you can do with a song, shared by every list so they all behave the same:
// favorite it, add it to a playlist (with a picker), play it next, queue it.

import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { openDialog, openMenu } from '../dialog.js';
import { promptName } from '../dialog.js';
import { showToast } from '../uiStore.js';
import { formatDuration } from '../../utils/format.js';
import { totalSeconds } from '../../storage/library.js';

/** Toast for the result of adding songs to a playlist. */
export function reportAdd(ui, name, r) {
  if (!r) return showToast(ui, "That playlist doesn't exist any more", 'error');
  if (r.added && r.duplicates) showToast(ui, `Added ${r.added} to “${name}” (${r.duplicates} already there)`);
  else if (r.added) showToast(ui, r.added === 1 ? `Added to “${name}”` : `Added ${r.added} songs to “${name}”`);
  else if (r.skipped) showToast(ui, `“${name}” is full`, 'error');
  else showToast(ui, `Already in “${name}”`);
}

/** The "Add to playlist" picker: your playlists, plus a way to make a new one. */
export function openPlaylistPicker({ library, tracks, ui }) {
  const list = Array.isArray(tracks) ? tracks : [tracks];
  if (!list.length) return null;
  const body = h('div', { class: 'stack' });
  let dlg;

  function paint() {
    const playlists = library.getState().playlists;
    body.replaceChildren(
      h('button', { class: 'menu__item menu__item--new', type: 'button', 'data-autofocus': '', onclick: createNew }, icon('plus', 22), h('span', null, 'New playlist')),
      playlists.length
        ? h('ul', { class: 'menu', role: 'list' }, playlists.map((p) => {
          const have = new Set(p.tracks.map((t) => t.id));
          const all = list.every((t) => have.has(t.id));
          return h('li', null, h('button', {
            class: 'menu__item', type: 'button', 'aria-label': `${p.name}${all ? ' (already added)' : ''}`,
            onclick: () => { reportAdd(ui, p.name, library.addToPlaylist(p.id, list)); dlg.close(); },
          },
          icon(all ? 'check' : 'library', 22),
          h('span', { class: 'menu__label' }, p.name),
          h('span', { class: 'menu__meta' }, `${p.tracks.length} ${p.tracks.length === 1 ? 'song' : 'songs'}`)));
        }))
        : h('p', { class: 'dlg__text' }, 'You have no playlists yet. Make one to put this song in.'));
  }

  async function createNew() {
    const name = await promptName({ title: 'New playlist', label: 'Playlist name', confirm: 'Create' });
    if (!name) return;
    const p = library.createPlaylist(name, list);
    if (p) { showToast(ui, list.length === 1 ? `Added to “${p.name}”` : `Created “${p.name}” with ${list.length} songs`); dlg.close(); }
  }

  paint();
  dlg = openDialog({ title: list.length === 1 ? 'Add to playlist' : `Add ${list.length} songs to playlist`, body, variant: 'menu' });
  return dlg;
}

/**
 * The shared handlers for one track. `ctx` = { player, library, ui }.
 * Returns the pieces TrackRow needs.
 */
export function trackActions(track, { player, library, ui }, { playNext = true } = {}) {
  const addToQueue = () => { player.enqueue([track]); showToast(ui, 'Added to queue'); };
  const playNextFn = () => { player.playNext(track); showToast(ui, 'Playing next'); };
  const addToPlaylist = () => openPlaylistPicker({ library, tracks: [track], ui });
  const toggleLike = () => {
    const on = library.toggleFavorite(track);
    if (on === true) showToast(ui, 'Added to favorites');
    else if (on === false) showToast(ui, 'Removed from favorites', 'info', { label: 'Undo', onClick: () => library.toggleFavorite(track) });
  };
  return {
    like: { onToggle: toggleLike },
    toggleLike, addToQueue, playNext: playNextFn, addToPlaylist,
    items(extra = []) {
      const fav = library.isFavorite(track.id);
      return [
        ...(playNext ? [{ icon: 'play-next', label: 'Play next', onClick: playNextFn }] : []),
        { icon: 'queue-add', label: 'Add to queue', onClick: addToQueue },
        { icon: 'bookmark-add', label: 'Add to playlist…', onClick: addToPlaylist },
        { icon: fav ? 'heart' : 'heart-outline', label: fav ? 'Remove from favorites' : 'Add to favorites', onClick: toggleLike },
        ...extra,
      ];
    },
    menu(extra = []) { openMenu({ title: track.title, items: this.items(extra) }); },
  };
}

export const summary = (tracks) => {
  const n = tracks.length;
  const t = totalSeconds(tracks);
  return `${n} ${n === 1 ? 'song' : 'songs'}${t ? ` · ${formatDuration(t)}` : ''}`;
};

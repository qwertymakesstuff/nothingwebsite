import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from '../components/artwork.js';
import { TrackRow } from '../components/trackRow.js';
import { playAllButton, shuffleButton, addAllButton } from '../components/trackList.js';
import { trackActions, summary } from '../components/trackActions.js';
import { makeSortable } from '../sortable.js';
import { openMenu, promptName } from '../dialog.js';
import { showToast } from '../uiStore.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';

/** One playlist: play it, rename it, reorder / remove its songs (drag the grip, or Up / Down keys). */
export function PlaylistView({ params, player, store, ui, library, router }) {
  const d = disposer();
  const id = params.get('id') || '';
  const head = h('div', { class: 'playlist-head' });
  const body = h('div');
  const el = h('section', { class: 'view-section playlist-view' }, head, body);
  let rows = [];
  let focusIndex = null;
  let sortable = null;

  const get = () => library.getPlaylist(id);

  async function rename() {
    const p = get();
    if (!p) return;
    const name = await promptName({ title: 'Rename playlist', label: 'Playlist name', initial: p.name, confirm: 'Save' });
    if (name) library.renamePlaylist(id, name);
  }

  function remove() {
    const p = get();
    if (!p) return;
    const undo = library.deletePlaylist(id);
    showToast(ui, `Deleted “${p.name}”`, 'info', { label: 'Undo', onClick: () => { if (undo()) router.navigate('playlist', { id }); } });
    router.navigate('library');
  }

  function renderHead(p) {
    const art = Artwork('playlist-head__art');
    art.update(p.tracks[0] ?? null);
    const has = p.tracks.length > 0;
    head.replaceChildren(
      art.el,
      h('div', { class: 'playlist-head__text' },
        h('a', { class: 'back-link', href: '#/library' }, icon('chevron-down', 18), 'Library'),
        h('h1', { class: 'page-title' }, p.name),
        h('p', { class: 'page-sub' }, summary(p.tracks)),
        h('div', { class: 'page-head__actions' },
          has ? [
            playAllButton(() => player.playTracks(p.tracks, 0), 'Play'),
            shuffleButton(() => player.playShuffled(p.tracks)),
            addAllButton(() => { player.enqueue(p.tracks); showToast(ui, `Added ${p.tracks.length} songs to queue`); }),
          ] : null,
          h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: rename }, icon('edit', 18), 'Rename'),
          h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: remove }, icon('trash', 18), 'Delete'))));
  }

  function renderTracks(p) {
    sortable?.destroy();
    rows = [];
    if (!p.tracks.length) {
      body.replaceChildren(h('div', { class: 'empty' },
        h('div', { class: 'empty__icon' }, icon('library', 32)),
        h('h2', null, 'This playlist is empty'),
        h('p', null, 'Find a song and use the “Add to playlist” button (or the “…” menu) to put it here.'),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => router.navigate('search') }, 'Search for songs')));
      return;
    }
    const list = h('ol', { class: 'queue-list playlist-tracks', 'aria-label': `Songs in ${p.name}` });
    p.tracks.forEach((track, index) => {
      const acts = trackActions(track, { player, library, ui });
      const removeTrack = () => {
        const undo = library.removeFromPlaylist(id, index);
        showToast(ui, `Removed from “${p.name}”`, 'info', { label: 'Undo', onClick: undo });
      };
      const row = TrackRow({
        track,
        grip: { onNudge: (dir) => { const to = index + dir; if (to >= 0 && to < p.tracks.length) { focusIndex = to; library.moveInPlaylist(id, index, to); } } },
        onPlay: () => {
          const cur = selectCurrent(store.getState());
          if (cur && cur.id === track.id) player.togglePlay(); else player.playTracks(p.tracks, index);
        },
        like: acts.like,
        actions: [{ icon: 'trash', label: 'Remove from playlist', onClick: removeTrack, secondary: true }],
        menu: () => openMenu({ title: track.title, items: acts.items([{ icon: 'trash', label: 'Remove from playlist', onClick: removeTrack }]) }),
      });
      rows.push({ row, id: track.id });
      list.append(row.el);
    });
    body.replaceChildren(list);
    sortable = makeSortable(list, { onMove: (from, to) => library.moveInPlaylist(id, from, to), onEnd: () => { const q = get(); if (q) renderTracks(q); paint(); } });
    paint();
    if (focusIndex != null) { list.children[focusIndex]?.querySelector('.row__grip')?.focus(); focusIndex = null; }
  }

  function paint() {
    const s = store.getState();
    const cur = selectCurrent(s)?.id;
    const favs = new Set(library.getState().favorites.map((t) => t.id));
    rows.forEach((r) => r.row.setState({ current: r.id === cur, playing: s.status === 'playing', liked: favs.has(r.id) }));
  }

  function missing() {
    head.replaceChildren();
    body.replaceChildren(h('div', { class: 'empty' },
      h('div', { class: 'empty__icon' }, icon('library', 32)), h('h2', null, 'Playlist not found'),
      h('p', null, 'It may have been deleted.'),
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => router.navigate('library') }, 'Back to Library')));
  }

  d.add(library.subscribe((s) => s.playlists.find((p) => p.id === id) ?? null, (p) => {
    if (!p) { missing(); return; }
    renderHead(p);
    if (!sortable?.isDragging()) renderTracks(p);
  }));
  d.add(store.subscribe((s) => [selectCurrent(s)?.id, s.status === 'playing'], paint, { equals: shallowEqual, immediate: false }));
  d.add(library.subscribe((s) => s.favorites, paint, { immediate: false }));
  d.add(() => sortable?.destroy());
  return { el, destroy: d.run };
}

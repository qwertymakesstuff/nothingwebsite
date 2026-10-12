import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { TrackList, playAllButton, shuffleButton, addAllButton } from '../components/trackList.js';
import { showToast } from '../uiStore.js';
import { summary } from '../components/trackActions.js';

/**
 * A plain list of songs with Play / Shuffle / Add to queue: used for Favorites and Recently played.
 * `live` lists follow the library as it changes; the others are a snapshot taken when the page opens
 * (so Recently played does not jump around under your finger when you start a song from it).
 */
function SongsView({ title, emptyIcon, emptyTitle, emptyText, select, live, headExtra, player, store, ui, library, router }) {
  const d = disposer();
  const head = h('div', { class: 'page-head' });
  const body = h('div');
  const el = h('section', { class: 'view-section' }, head, body);
  let list = null;

  function build(tracks) {
    list?.destroy();
    list = null;
    head.replaceChildren(
      h('div', null, h('h1', { class: 'page-title' }, title), h('p', { class: 'page-sub' }, summary(tracks))),
      h('div', { class: 'page-head__actions' },
        tracks.length ? [
          playAllButton(() => player.playTracks(tracks, 0), 'Play'),
          shuffleButton(() => player.playShuffled(tracks)),
          addAllButton(() => { player.enqueue(tracks); showToast(ui, `Added ${tracks.length} songs to queue`); }),
        ] : null,
        tracks.length ? headExtra?.() : null));
    if (!tracks.length) {
      body.replaceChildren(h('div', { class: 'empty' },
        h('div', { class: 'empty__icon' }, icon(emptyIcon, 32)), h('h2', null, emptyTitle), h('p', null, emptyText),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => router.navigate('search') }, 'Find something to play')));
      return;
    }
    list = TrackList({ tracks, player, store, ui, library, label: title });
    body.replaceChildren(list.el);
  }

  let shown = select(library.getState());
  build(shown);
  if (live) {
    d.add(library.subscribe((s) => select(s), (tracks) => { if (tracks !== shown) { shown = tracks; build(tracks); } }, { immediate: false }));
  } else {
    // Snapshot, except that an empty page fills in when something finally lands in it, and clearing empties it.
    d.add(library.subscribe((s) => select(s), (tracks) => { if ((!shown.length && tracks.length) || !tracks.length) { shown = tracks; build(tracks); } }, { immediate: false }));
  }
  d.add(() => list?.destroy());
  return { el, destroy: d.run };
}

export function FavoritesView(ctx) {
  return SongsView({
    ...ctx, title: 'Favorites', emptyIcon: 'heart-outline', emptyTitle: 'No favorites yet',
    emptyText: 'Tap the heart on any song to keep it here.', select: (s) => s.favorites, live: true,
  });
}

export function RecentView(ctx) {
  const { library, ui } = ctx;
  return SongsView({
    ...ctx, title: 'Recently played', emptyIcon: 'clock', emptyTitle: 'Nothing played yet',
    emptyText: 'Songs you listen to show up here.', select: (s) => s.recent, live: false,
    headExtra: () => h('button', {
      class: 'btn btn--ghost btn--small', type: 'button',
      onclick: () => { const undo = library.clearRecent(); showToast(ui, 'History cleared', 'info', { label: 'Undo', onClick: undo }); },
    }, 'Clear'),
  });
}

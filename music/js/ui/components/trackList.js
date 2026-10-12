import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { TrackRow } from './trackRow.js';
import { trackActions } from './trackActions.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';
import { formatCount } from '../../utils/format.js';

/**
 * A list of songs (search results, channel pages, favorites, recently played). Tapping a row plays it with
 * `queueTracks` as the queue (defaults to this list; a page with several lists passes the combined list and
 * this list's `queueOffset` into it). Each row has "Play next", "Add to queue", "Add to playlist" and a heart;
 * on phones the first three move into a "more" menu.
 * `showViews` adds the view count to the artist line (used for "Popular").
 */
export function TrackList({ tracks, player, store, ui, library, label, queueTracks = tracks, queueOffset = 0, showViews = false }) {
  const d = disposer();
  const rows = tracks.map((track, i) => {
    const acts = trackActions(track, { player, library, ui });
    return TrackRow({
      track,
      subtitle: showViews && track.views ? `${track.artist || 'Unknown artist'} · ${formatCount(track.views)} views` : undefined,
      onPlay: () => {
        const cur = selectCurrent(store.getState());
        if (cur && cur.id === track.id) player.togglePlay(); else player.playTracks(queueTracks, queueOffset + i);
      },
      like: acts.like,
      actions: [
        { icon: 'play-next', label: 'Play next', onClick: acts.playNext, secondary: true },
        { icon: 'queue-add', label: 'Add to queue', onClick: acts.addToQueue, secondary: true },
        { icon: 'bookmark-add', label: 'Add to playlist', onClick: acts.addToPlaylist, secondary: true },
      ],
      menu: () => acts.menu(),
    });
  });
  const el = h('ol', { class: 'queue-list results-list', 'aria-label': label }, rows.map((r) => r.el));

  function paint() {
    const s = store.getState();
    const cur = selectCurrent(s);
    const favs = new Set(library.getState().favorites.map((t) => t.id));
    rows.forEach((r, i) => r.setState({ current: !!cur && tracks[i].id === cur.id, playing: s.status === 'playing', liked: favs.has(tracks[i].id) }));
  }
  d.add(store.subscribe((s) => [selectCurrent(s)?.id, s.status === 'playing'], paint, { equals: shallowEqual }));
  d.add(library.subscribe((s) => s.favorites, paint, { immediate: false }));

  return { el, destroy: d.run };
}

export const playAllButton = (onClick, text = 'Play all') =>
  h('button', { class: 'btn btn--primary btn--small', type: 'button', onclick: onClick }, icon('play', 18), text);

export const shuffleButton = (onClick, text = 'Shuffle') =>
  h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: onClick }, icon('shuffle', 18), text);

export const addAllButton = (onClick, text = 'Add to queue') =>
  h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: onClick }, icon('queue-add', 18), text);

import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { TrackRow } from './trackRow.js';
import { showToast } from '../uiStore.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';
import { formatCount } from '../../utils/format.js';

/**
 * A list of songs (search results, channel pages). Tapping a row plays it with `queueTracks`
 * as the queue (defaults to this list; a page with several lists passes the combined list and
 * this list's `queueOffset` into it). Each row also has "Play next" and "Add to queue".
 * `showViews` adds the view count to the artist line (used for "Popular").
 */
export function TrackList({ tracks, player, store, ui, label, queueTracks = tracks, queueOffset = 0, showViews = false }) {
  const d = disposer();
  const rows = tracks.map((track, i) => TrackRow({
    track,
    subtitle: showViews && track.views ? `${track.artist || 'Unknown artist'} · ${formatCount(track.views)} views` : undefined,
    onPlay: () => {
      const cur = selectCurrent(store.getState());
      if (cur && cur.id === track.id) player.togglePlay(); else player.playTracks(queueTracks, queueOffset + i);
    },
    actions: [
      { icon: 'play-next', label: 'Play next', onClick: () => { player.playNext(track); showToast(ui, 'Playing next'); } },
      { icon: 'queue-add', label: 'Add to queue', onClick: () => { player.enqueue([track]); showToast(ui, 'Added to queue'); } },
    ],
  }));
  const el = h('ol', { class: 'queue-list results-list', 'aria-label': label }, rows.map((r) => r.el));

  function paint() {
    const s = store.getState();
    const cur = selectCurrent(s);
    rows.forEach((r, i) => r.setState({ current: !!cur && tracks[i].id === cur.id, playing: s.status === 'playing' }));
  }
  d.add(store.subscribe((s) => [selectCurrent(s)?.id, s.status === 'playing'], paint, { equals: shallowEqual }));

  return { el, destroy: d.run };
}

export const playAllButton = (onClick, text = 'Play all') =>
  h('button', { class: 'btn btn--primary btn--small', type: 'button', onclick: onClick }, icon('play', 18), text);

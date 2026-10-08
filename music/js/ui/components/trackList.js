import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { TrackRow } from './trackRow.js';
import { showToast } from '../uiStore.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';

/**
 * A list of songs (search results, channel uploads). Tapping a row plays it with the whole
 * list as the queue; each row also has "Play next" and "Add to queue".
 */
export function TrackList({ tracks, player, store, ui, label }) {
  const d = disposer();
  const rows = tracks.map((track, i) => TrackRow({
    track,
    onPlay: () => {
      const cur = selectCurrent(store.getState());
      if (cur && cur.id === track.id) player.togglePlay(); else player.playTracks(tracks, i);
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

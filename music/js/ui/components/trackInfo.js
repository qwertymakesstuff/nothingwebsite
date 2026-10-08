import { h, disposer } from '../../utils/dom.js';
import { Artwork } from './artwork.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';

/** Title + artist lines bound to the current track (shows the error message on failure). */
export function TrackText({ store, className = '' }) {
  const title = h('div', { class: 'track-text__title' });
  const artist = h('div', { class: 'track-text__artist' });
  const el = h('div', { class: `track-text ${className}`.trim() }, title, artist);
  const off = store.subscribe(
    (s) => [selectCurrent(s), s.status, s.error],
    ([track, status, error]) => {
      title.textContent = track ? track.title : 'Nothing playing';
      const failed = status === 'error';
      artist.textContent = failed ? (error || 'Playback failed') : (track ? track.artist || 'Unknown artist' : 'Pick something to play');
      artist.classList.toggle('is-error', failed);
    },
    { equals: shallowEqual },
  );
  return { el, destroy: off };
}

/** Artwork + text, used in the desktop player bar and the mobile mini-player. */
export function TrackInfo({ store, className = '' }) {
  const d = disposer();
  const art = Artwork('track-info__art');
  const text = TrackText({ store });
  d.add(text.destroy);
  d.add(store.subscribe(selectCurrent, (t) => art.update(t)));
  return { el: h('div', { class: `track-info ${className}`.trim() }, art.el, text.el), destroy: d.run };
}

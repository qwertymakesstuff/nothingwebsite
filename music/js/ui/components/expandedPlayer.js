import { h, disposer } from '../../utils/dom.js';
import { Artwork } from './artwork.js';
import { TrackText } from './trackInfo.js';
import { QueueList } from './queueList.js';
import { MediaToggle } from './mediaToggle.js';
import { FavoriteButton, PlaylistAddButton } from './favoriteButton.js';
import { selectCurrent } from '../../player/player.js';
import { hueFrom } from '../../utils/format.js';

/**
 * Desktop expanded player: opened by clicking the album cover in the player bar. A big cover (or, if
 * the user chooses, the YouTube video) with the title, a Cover/Video switch, and Up next. It sits over
 * the page content; the sidebar and the player bar stay usable. The cover in the bar turns into an
 * arrow that closes it again.
 */
export function ExpandedPlayer({ player, store, ui, prefs, library }) {
  const d = disposer();
  const art = Artwork('expanded__art');
  const text = TrackText({ store, className: 'track-text--large' });
  const toggle = MediaToggle({ ui, prefs });
  const queue = QueueList({ player, store, ui, library });
  const fav = FavoriteButton({ store, player, library, ui });
  const addTo = PlaylistAddButton({ store, library, ui });
  [text, toggle, queue, fav, addTo].forEach((c) => d.add(c.destroy));

  const stage = h('div', { class: 'expanded__stage' }, art.el, h('div', { class: 'expanded__video-slot', 'aria-hidden': 'true' }));
  const el = h('section', { class: 'expanded', 'aria-label': 'Expanded player', hidden: true },
    h('div', { class: 'expanded__media' }, stage, h('div', { class: 'expanded__title-row' }, text.el, h('div', { class: 'np__quick' }, fav.el, addTo.el)), h('div', { class: 'expanded__toggle' }, toggle.el)),
    h('aside', { class: 'expanded__queue', 'aria-label': 'Up next' }, h('h2', null, 'Up next'), queue.el));

  d.add(store.subscribe(selectCurrent, (t) => {
    art.update(t);
    el.style.setProperty('--ex-hue', t && !t.artwork ? hueFrom(t.id) : 260);
  }));
  d.add(ui.subscribe((s) => s.expandedOpen, (open) => { el.hidden = !open; el.classList.toggle('is-open', open); }));
  d.add(ui.subscribe((s) => s.videoVisible, (on) => el.classList.toggle('show-video', on)));

  return { el, destroy: d.run };
}

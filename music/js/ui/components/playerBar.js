import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from './artwork.js';
import { TrackText } from './trackInfo.js';
import { TransportControls } from './transportControls.js';
import { SeekBar } from './seekBar.js';
import { VolumeControl } from './volumeControl.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';

/**
 * Desktop player bar: cover + title (left), transport + seek (center), volume + queue (right).
 * Clicking the cover opens the expanded player; while it is open the cover is replaced by an arrow
 * in the same spot that closes it.
 */
export function PlayerBar({ player, store, ui, router }) {
  const d = disposer();
  const art = Artwork('bar-art__img');
  const text = TrackText({ store });
  const transport = TransportControls({ player, store });
  const seek = SeekBar({ player, store });
  const volume = VolumeControl({ player, store });
  [text, transport, seek, volume].forEach((c) => d.add(c.destroy));

  const coverBtn = h('button', {
    class: 'bar-art', type: 'button', 'aria-label': 'Open larger cover', 'aria-expanded': 'false',
    onclick: () => ui.setState({ expandedOpen: !ui.getState().expandedOpen }),
  }, art.el, h('span', { class: 'bar-art__arrow', 'aria-hidden': 'true' }, icon('chevron-down', 30)));

  d.add(store.subscribe(selectCurrent, (t) => { art.update(t); coverBtn.disabled = !t; }));
  d.add(ui.subscribe((s) => s.expandedOpen, (open) => {
    coverBtn.classList.toggle('is-open', open);
    coverBtn.setAttribute('aria-expanded', String(open));
    coverBtn.setAttribute('aria-label', open ? 'Close larger cover' : 'Open larger cover');
  }));
  // Nothing playing any more: there is nothing to expand.
  d.add(store.subscribe((s) => !!selectCurrent(s), (has) => { if (!has) ui.setState({ expandedOpen: false }); }, { immediate: false }));

  const queueBtn = h('button', {
    class: 'icon-btn', type: 'button', 'aria-label': 'Toggle queue',
    onclick: () => {
      if (matchMedia('(min-width: 1200px)').matches) ui.setState({ queuePanelOpen: !ui.getState().queuePanelOpen });
      else router.navigate('queue');
    },
  }, icon('queue', 22));
  d.add(ui.subscribe((s) => [s.queuePanelOpen], ([open]) => queueBtn.classList.toggle('is-on', open), { equals: shallowEqual }));

  const el = h('footer', { class: 'player-bar', 'aria-label': 'Player' },
    h('div', { class: 'player-bar__left' }, h('div', { class: 'track-info' }, coverBtn, text.el)),
    h('div', { class: 'player-bar__center' }, transport.el, seek.el),
    h('div', { class: 'player-bar__right' }, volume.el, queueBtn));
  return { el, destroy: d.run };
}

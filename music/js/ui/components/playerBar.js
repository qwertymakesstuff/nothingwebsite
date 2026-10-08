import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { TrackInfo } from './trackInfo.js';
import { TransportControls } from './transportControls.js';
import { SeekBar } from './seekBar.js';
import { VolumeControl } from './volumeControl.js';

/** Desktop player bar: track info (left), transport + seek (center), volume + queue (right). */
export function PlayerBar({ player, store, ui, router }) {
  const d = disposer();
  const info = TrackInfo({ store });
  const transport = TransportControls({ player, store });
  const seek = SeekBar({ player, store });
  const volume = VolumeControl({ player, store });
  [info, transport, seek, volume].forEach((c) => d.add(c.destroy));

  const queueBtn = h('button', {
    class: 'icon-btn', type: 'button', 'aria-label': 'Toggle queue',
    onclick: () => {
      if (matchMedia('(min-width: 1200px)').matches) ui.setState({ queuePanelOpen: !ui.getState().queuePanelOpen });
      else router.navigate('queue');
    },
  }, icon('queue', 22));
  d.add(ui.subscribe((s) => s.queuePanelOpen, (open) => queueBtn.classList.toggle('is-on', open)));

  const el = h('footer', { class: 'player-bar', 'aria-label': 'Player' },
    h('div', { class: 'player-bar__left' }, info.el),
    h('div', { class: 'player-bar__center' }, transport.el, seek.el),
    h('div', { class: 'player-bar__right' }, volume.el, queueBtn));
  return { el, destroy: d.run };
}

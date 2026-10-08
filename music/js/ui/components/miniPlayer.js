import { h, disposer } from '../../utils/dom.js';
import { TrackInfo } from './trackInfo.js';
import { TransportControls } from './transportControls.js';
import { shallowEqual } from '../../core/store.js';

/** Mobile bottom mini-player. Tapping it opens the full-screen player. */
export function MiniPlayer({ player, store, ui }) {
  const d = disposer();
  const info = TrackInfo({ store });
  const transport = TransportControls({ player, store, variant: 'mini' });
  [info, transport].forEach((c) => d.add(c.destroy));

  const bar = h('i', { class: 'mini__progress-bar' });
  const open = h('button', {
    class: 'mini__open', type: 'button', 'aria-label': 'Open player',
    onclick: () => ui.setState({ nowPlayingOpen: true }),
  }, info.el);
  const el = h('div', { class: 'mini-player', role: 'region', 'aria-label': 'Mini player' },
    h('div', { class: 'mini__progress' }, bar), open, transport.el);

  d.add(store.subscribe((s) => [s.position, s.duration], ([pos, dur]) => {
    bar.style.width = dur > 0 ? `${Math.min(100, (pos / dur) * 100)}%` : '0%';
  }, { equals: shallowEqual }));
  return { el, destroy: d.run };
}

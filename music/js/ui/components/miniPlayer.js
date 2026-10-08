import { h, disposer } from '../../utils/dom.js';
import { TrackInfo } from './trackInfo.js';
import { TransportControls } from './transportControls.js';
import { trackSwipe } from '../../utils/gestures.js';
import { dragX, settle, slideIn } from '../swipeFx.js';
import { shallowEqual } from '../../core/store.js';

/**
 * Mobile bottom mini-player.
 *   tap the track     open the full-screen player
 *   swipe up          open the full-screen player
 *   swipe left/right  next / previous track
 */
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

  d.add(trackSwipe(el, {
    axes: 'xy',
    ignore: (t) => !!t.closest('.transport'),
    onMove: ({ axis, dx, dy }) => {
      if (axis === 'x') dragX(info.el, dx);
      else if (dy < 0) { el.style.transition = 'none'; el.style.transform = `translateY(${dy * 0.4}px)`; }
    },
    onEnd: ({ axis, dir }) => {
      el.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      if (axis === 'x') {
        if (dir === 'left') { player.next(); slideIn(info.el, 'left'); }
        else if (dir === 'right') { player.previous(); slideIn(info.el, 'right'); }
        else settle(info.el);
      } else if (dir === 'up') {
        ui.setState({ nowPlayingOpen: true });
      }
    },
  }));

  d.add(store.subscribe((s) => [s.position, s.duration], ([pos, dur]) => {
    bar.style.width = dur > 0 ? `${Math.min(100, (pos / dur) * 100)}%` : '0%';
  }, { equals: shallowEqual }));
  return { el, destroy: d.run };
}

import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from './artwork.js';
import { TrackText } from './trackInfo.js';
import { TransportControls } from './transportControls.js';
import { SeekBar } from './seekBar.js';
import { selectCurrent } from '../../player/player.js';

/**
 * Mobile full-screen player (a bottom sheet). Swipe down or press back to close.
 * Reuses the same text / seek / transport components as the desktop bar.
 */
export function NowPlaying({ player, store, ui, router }) {
  const d = disposer();
  const art = Artwork('np__art');
  const text = TrackText({ store, className: 'track-text--large' });
  const seek = SeekBar({ player, store });
  const transport = TransportControls({ player, store });
  d.add(text.destroy); d.add(seek.destroy); d.add(transport.destroy);
  d.add(store.subscribe(selectCurrent, (t) => art.update(t)));

  const close = () => ui.setState({ nowPlayingOpen: false });
  const header = h('div', { class: 'np__header' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close player', onclick: close }, icon('chevron-down', 28)),
    h('div', { class: 'np__label' }, 'Now playing'),
    h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': 'Open queue',
      onclick: () => {
        // Drop the sheet's history marker first so navigating doesn't fight history.back().
        if (history.state?.np) history.replaceState(null, '');
        close();
        router.navigate('queue');
      },
    }, icon('queue', 24)));

  const el = h('section', { class: 'nowplaying', 'aria-label': 'Now playing', 'aria-hidden': 'true' },
    header,
    h('div', { class: 'np__body' }, h('div', { class: 'np__art-wrap' }, art.el), text.el, seek.el, transport.el));

  // Swipe down on the sheet to dismiss.
  let startY = null;
  let dy = 0;
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || el.querySelector('.slider:active')) return;
    if (e.target.closest('.slider')) { startY = null; return; }
    startY = e.touches[0].clientY; dy = 0;
    el.style.transition = 'none';
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (startY == null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    el.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  const release = () => {
    if (startY == null) return;
    el.style.transition = '';
    el.style.transform = '';
    if (dy > 120) history.state?.np ? history.back() : close();
    startY = null; dy = 0;
  };
  el.addEventListener('touchend', release);
  el.addEventListener('touchcancel', release);

  // Open/close, with a history entry so the phone's back gesture closes the sheet first.
  d.add(ui.subscribe((s) => s.nowPlayingOpen, (open) => {
    el.classList.toggle('is-open', open);
    el.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('np-open', open);
    if (open && !history.state?.np) history.pushState({ np: true }, '');
    if (!open && history.state?.np) history.back();
  }, { immediate: false }));
  const onPop = () => { if (ui.getState().nowPlayingOpen && !history.state?.np) ui.setState({ nowPlayingOpen: false }); };
  window.addEventListener('popstate', onPop);
  d.add(() => window.removeEventListener('popstate', onPop));

  return { el, destroy: d.run };
}

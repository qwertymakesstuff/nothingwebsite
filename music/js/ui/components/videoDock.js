import { h, disposer } from '../../utils/dom.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';

/**
 * The visible YouTube player. YouTube's rules require its embedded player to stay visible while it
 * plays, so we never hide it - we just move it between places:
 *   - the full-screen player's video area (mobile, while that sheet is open)
 *   - the top of the queue panel (wide desktop)
 *   - a small floating "dock" in the corner (everywhere else)
 *
 * It is ONE fixed-position element that follows placeholder "slots" with getBoundingClientRect.
 * (Re-parenting an iframe would reload it and stop the music, so we never move it in the DOM.)
 * Touches pass through it so swipe gestures keep working, except when the browser demands a tap
 * on the video itself to start playback (needsTap).
 */
export function VideoDock({ store, ui }) {
  const d = disposer();
  const container = h('div', { class: 'video-host__player' });
  const el = h('div', { class: 'video-host is-empty is-dock', role: 'region', 'aria-label': 'YouTube player' }, container);
  const wide = window.matchMedia('(min-width: 1200px)');

  const rectOf = (selector) => {
    const slot = document.querySelector(selector);
    if (!slot) return null;
    const r = slot.getBoundingClientRect();
    return r.width > 40 && r.height > 20 ? r : null;
  };

  function pickTarget() {
    const s = ui.getState();
    if (s.nowPlayingOpen) return rectOf('.np__video-slot');
    if (wide.matches && s.queuePanelOpen) return rectOf('.panel__video-slot');
    return null;
  }

  function place() {
    const s = ui.getState();
    el.classList.toggle('on-sheet', s.nowPlayingOpen);
    const r = pickTarget();
    if (r) {
      el.classList.remove('is-dock');
      Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    } else {
      el.classList.add('is-dock');
      Object.assign(el.style, { left: '', top: '', width: '', height: '' });
    }
  }

  // While the sheet is open it slides and gets dragged, so follow it every frame.
  let raf = 0;
  const loop = () => { place(); raf = ui.getState().nowPlayingOpen ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); place(); requestAnimationFrame(place); };

  d.add(ui.subscribe((s) => [s.nowPlayingOpen, s.queuePanelOpen], kick, { equals: shallowEqual }));
  d.add(store.subscribe((s) => [!!selectCurrent(s), s.needsTap], ([has, tap]) => {
    el.classList.toggle('is-empty', !has);
    el.classList.toggle('needs-tap', tap);
    kick();
  }, { equals: shallowEqual }));
  window.addEventListener('resize', place);
  window.addEventListener('orientationchange', place);
  wide.addEventListener?.('change', kick);
  d.add(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', place);
    window.removeEventListener('orientationchange', place);
    wide.removeEventListener?.('change', kick);
  });

  return { el, container, place, destroy: d.run };
}

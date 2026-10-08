import { h, disposer } from '../../utils/dom.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';

/**
 * The YouTube player element.
 *
 * Normally it is NOT shown: you see the cover art. The user can choose "Video" in the expanded player
 * (desktop) or the full-screen player (mobile), and then it is shown in that spot.
 *
 * Note: YouTube's embedded-player rules ask for the player to stay visible. Hiding it by default is the
 * site owner's choice. It is always shown when it has to be: when the browser needs a tap on the video to
 * start playback (needsTap) and while an ad plays (adPlaying), so ads can be seen and skipped.
 *
 * It is ONE fixed-position element that follows placeholder "slots" with getBoundingClientRect.
 * (Re-parenting an iframe would reload it and stop the music, so we never move it in the DOM.)
 * When hidden it keeps its size but is transparent and behind everything, so playback is unaffected.
 * Touches pass through it so swipe gestures keep working, except when a tap on it is required.
 */
export function VideoDock({ store, ui }) {
  const d = disposer();
  const container = h('div', { class: 'video-host__player' });
  const el = h('div', { class: 'video-host is-empty is-dock', role: 'region', 'aria-label': 'YouTube player' }, container);
  const desktop = window.matchMedia('(min-width: 900px)');

  const rectOf = (selector) => {
    const slot = document.querySelector(selector);
    if (!slot) return null;
    const r = slot.getBoundingClientRect();
    return r.width > 40 && r.height > 20 ? r : null;
  };

  /** The on-screen slot the video should fill right now, or null. */
  function slotRect() {
    const s = ui.getState();
    if (s.nowPlayingOpen) return rectOf('.np__video-slot');
    if (s.expandedOpen && desktop.matches) return rectOf('.expanded__video-slot');
    return null;
  }

  function place() {
    const ui_ = ui.getState();
    const pl = store.getState();
    const forced = pl.needsTap || pl.adPlaying;
    const slot = slotRect();
    const inSlot = !!slot && ui_.videoVisible;
    el.classList.toggle('on-sheet', ui_.nowPlayingOpen);
    el.classList.toggle('is-hidden', !inSlot && !forced);
    if (inSlot) {
      el.classList.remove('is-dock');
      Object.assign(el.style, { left: `${slot.left}px`, top: `${slot.top}px`, width: `${slot.width}px`, height: `${slot.height}px` });
    } else {
      el.classList.add('is-dock'); // small corner box (also where it sits, invisible, while hidden)
      Object.assign(el.style, { left: '', top: '', width: '', height: '' });
    }
  }

  // While the sheet is open it slides and gets dragged, so follow it every frame.
  let raf = 0;
  const loop = () => { place(); raf = ui.getState().nowPlayingOpen || ui.getState().expandedOpen ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); place(); requestAnimationFrame(place); };

  d.add(ui.subscribe((s) => [s.nowPlayingOpen, s.expandedOpen, s.videoVisible], kick, { equals: shallowEqual }));
  d.add(store.subscribe((s) => [!!selectCurrent(s), s.needsTap, s.adPlaying], ([has, tap, ad]) => {
    el.classList.toggle('is-empty', !has);
    el.classList.toggle('needs-tap', tap);
    el.classList.toggle('is-ad', ad);
    kick();
  }, { equals: shallowEqual }));
  window.addEventListener('resize', place);
  window.addEventListener('orientationchange', place);
  desktop.addEventListener?.('change', kick);
  d.add(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', place);
    window.removeEventListener('orientationchange', place);
    desktop.removeEventListener?.('change', kick);
  });

  return { el, container, place, destroy: d.run };
}

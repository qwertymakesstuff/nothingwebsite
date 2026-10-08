import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from './artwork.js';
import { TrackText } from './trackInfo.js';
import { TransportControls } from './transportControls.js';
import { SeekBar } from './seekBar.js';
import { QueueList } from './queueList.js';
import { MediaToggleIcon } from './mediaToggle.js';
import { trackSwipe } from '../../utils/gestures.js';
import { dragX, settle, slideIn } from '../swipeFx.js';
import { selectCurrent } from '../../player/player.js';
import { hueFrom } from '../../utils/format.js';

const BEHIND = '.main-col, .bottom-nav, .mini-player'; // made inert while the sheet is open

/**
 * Mobile full-screen player (a bottom sheet) with two views: Now playing and Up next.
 *   drag down on the header or artwork   dismiss (follows the finger, flick to close)
 *   swipe the artwork left/right         next / previous
 *   back gesture / Esc / chevron         close
 * Reuses the same text / seek / transport / queue components as the desktop bar.
 */
export function NowPlaying({ player, store, ui, prefs }) {
  const d = disposer();
  const art = Artwork('np__art');
  const text = TrackText({ store, className: 'track-text--large' });
  const seek = SeekBar({ player, store });
  const transport = TransportControls({ player, store });
  const queue = QueueList({ player, store });
  const mediaToggle = MediaToggleIcon({ ui, prefs });
  [text, seek, transport, queue, mediaToggle].forEach((c) => d.add(c.destroy));

  const el = h('section', { class: 'nowplaying', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Player', 'aria-hidden': 'true' });
  const closeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close player', onclick: () => requestClose() }, icon('chevron-down', 28));

  // ---- views: player / queue ----
  const tabs = ['player', 'queue'].map((name) => h('button', {
    class: 'np__tab', type: 'button', role: 'tab', 'aria-selected': name === 'player' ? 'true' : 'false',
    onclick: () => setView(name),
  }, name === 'player' ? 'Now playing' : 'Up next'));
  const tablist = h('div', { class: 'np__tabs', role: 'tablist' }, tabs);

  // Cover art by default; the user can switch to the YouTube video (shown here, see videoDock.js).
  const artWrap = h('div', { class: 'np__art-wrap' }, art.el, h('div', { class: 'np__video-slot', 'aria-hidden': 'true' }));
  const playerView = h('div', { class: 'np__body', role: 'tabpanel' }, artWrap, text.el, seek.el, transport.el);
  const clearBtn = h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: () => player.clearQueue() }, 'Clear');
  const queueEmpty = h('div', { class: 'np__queue-empty' }, 'Your queue is empty');
  const queueView = h('div', { class: 'np__queue', role: 'tabpanel', hidden: true },
    h('div', { class: 'np__queue-head' }, h('h2', null, 'Up next'), clearBtn), queue.el, queueEmpty);

  const header = h('div', { class: 'np__header' }, closeBtn, tablist, h('span', { class: 'np__header-end' }, mediaToggle.el));
  el.append(header, playerView, queueView);

  function setView(name) {
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String((i === 0) === (name === 'player'))));
    playerView.hidden = name !== 'player';
    queueView.hidden = name !== 'queue';
    el.classList.toggle('is-queue', name === 'queue');
  }

  d.add(ui.subscribe((s) => s.videoVisible, (on) => el.classList.toggle('show-video', on)));
  d.add(store.subscribe(selectCurrent, (t) => {
    art.update(t);
    // Placeholder artwork is tinted from the track id, so match it; real artwork keeps the brand purple.
    el.style.setProperty('--np-hue', t && !t.artwork ? hueFrom(t.id) : 260);
  }));
  d.add(store.subscribe((s) => s.queue.items.length, (n) => { queueEmpty.hidden = n > 0; clearBtn.hidden = n === 0; queue.el.hidden = n === 0; }));

  // ---- gestures ----
  let dismissing = false;
  const sheetDrag = ({ dy }) => {
    if (dismissing) return;
    el.style.transition = 'none';
    el.style.transform = `translateY(${Math.max(0, dy)}px)`;
  };
  const sheetRelease = ({ dir }) => {
    if (dismissing) return;
    if (dir === 'down') {
      dismissing = true;
      el.style.transition = 'transform .22s cubic-bezier(.4,0,1,1)';
      el.style.transform = 'translateY(100%)';
      const done = () => { el.style.transition = ''; el.style.transform = ''; dismissing = false; requestClose(); };
      el.addEventListener('transitionend', done, { once: true });
      setTimeout(() => { if (dismissing) done(); }, 320); // in case transitionend never fires
    } else {
      el.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
    }
  };
  d.add(trackSwipe(header, { axes: 'y', onMove: sheetDrag, onEnd: sheetRelease }));
  d.add(trackSwipe(artWrap, {
    axes: 'xy',
    onMove: ({ axis, dx, dy }) => (axis === 'x' ? dragX(art.el, dx, { fade: 300 }) : sheetDrag({ dy })),
    onEnd: (e) => {
      if (e.axis === 'y') { sheetRelease(e); return; }
      if (e.dir === 'left') { player.next(); slideIn(art.el, 'left'); }
      else if (e.dir === 'right') { player.previous(); slideIn(art.el, 'right'); }
      else settle(art.el);
    },
  }));

  // ---- open / close ----
  // The sheet owns one history entry so the phone's back gesture closes it first.
  function requestClose() {
    if (ui.getState().nowPlayingOpen) ui.setState({ nowPlayingOpen: false });
  }
  let returnFocus = null;
  d.add(ui.subscribe((s) => s.nowPlayingOpen, (open) => {
    el.classList.toggle('is-open', open);
    el.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('np-open', open);
    document.querySelectorAll(BEHIND).forEach((n) => { if (open) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
    if (open) {
      // Opened by a swipe (nothing focused)? Return focus to the mini-player's open button later.
      const active = document.activeElement;
      returnFocus = active && active !== document.body ? active : document.querySelector('.mini__open');
      setView('player');
      if (!history.state?.np) history.pushState({ np: true }, '');
      setTimeout(() => closeBtn.focus({ preventScroll: true }), 50);
    } else {
      if (history.state?.np) history.back();
      returnFocus?.focus?.({ preventScroll: true });
      returnFocus = null;
    }
  }, { immediate: false }));

  const onPop = () => { if (ui.getState().nowPlayingOpen && !history.state?.np) ui.setState({ nowPlayingOpen: false }); };
  const onKey = (e) => { if (e.key === 'Escape' && ui.getState().nowPlayingOpen) requestClose(); };
  // Rotating a tablet (or resizing) into the desktop layout hides the sheet: close it cleanly.
  const wide = window.matchMedia('(min-width: 900px)');
  const onWide = () => { if (wide.matches) requestClose(); };
  window.addEventListener('popstate', onPop);
  window.addEventListener('keydown', onKey);
  wide.addEventListener?.('change', onWide);
  d.add(() => {
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('keydown', onKey);
    wide.removeEventListener?.('change', onWide);
  });

  return { el, destroy: d.run };
}

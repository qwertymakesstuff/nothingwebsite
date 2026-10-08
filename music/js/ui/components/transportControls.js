import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { selectCurrent } from '../../player/player.js';
import { shallowEqual } from '../../core/store.js';

/**
 * Shuffle / previous / play-pause / next / repeat.
 * variant 'full' shows everything; 'mini' shows only play-pause and next.
 * One component serves desktop bar, mini-player and the full-screen player.
 */
export function TransportControls({ player, store, variant = 'full' }) {
  const d = disposer();
  const btn = (cls, label, name, onClick) =>
    h('button', { class: `icon-btn ${cls}`, type: 'button', 'aria-label': label, onclick: onClick }, icon(name));

  const shuffle = btn('transport__shuffle', 'Shuffle', 'shuffle', () => player.toggleShuffle());
  const prev = btn('transport__prev', 'Previous', 'prev', () => player.previous());
  const play = h('button', { class: 'icon-btn play-btn', type: 'button', onclick: () => player.togglePlay() });
  const nextBtn = btn('transport__next', 'Next', 'next', () => player.next());
  const repeat = btn('transport__repeat', 'Repeat', 'repeat', () => player.cycleRepeat());

  const el = h('div', { class: `transport transport--${variant}` },
    variant === 'mini' ? [play, nextBtn] : [shuffle, prev, play, nextBtn, repeat]);

  d.add(store.subscribe(
    (s) => [s.status, s.shuffle, s.repeat, !!selectCurrent(s)],
    ([status, shuffleOn, repeatMode, hasTrack]) => {
      const busy = status === 'loading';
      const playing = status === 'playing';
      play.replaceChildren(busy ? h('span', { class: 'spinner', 'aria-hidden': 'true' }) : icon(playing ? 'pause' : 'play', variant === 'mini' ? 26 : 30));
      play.setAttribute('aria-label', playing || busy ? 'Pause' : 'Play');
      play.disabled = !hasTrack;
      prev.disabled = !hasTrack;
      nextBtn.disabled = !hasTrack;
      shuffle.setAttribute('aria-pressed', String(shuffleOn));
      shuffle.classList.toggle('is-on', shuffleOn);
      repeat.setAttribute('aria-pressed', String(repeatMode !== 'off'));
      repeat.setAttribute('aria-label', `Repeat: ${repeatMode}`);
      repeat.classList.toggle('is-on', repeatMode !== 'off');
      repeat.replaceChildren(icon(repeatMode === 'one' ? 'repeat-one' : 'repeat'));
    },
    { equals: shallowEqual },
  ));

  return { el, destroy: d.run };
}

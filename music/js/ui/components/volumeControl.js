import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { shallowEqual } from '../../core/store.js';

export function VolumeControl({ player, store }) {
  const d = disposer();
  const mute = h('button', { class: 'icon-btn', type: 'button', onclick: () => player.toggleMute() });
  const input = h('input', { class: 'slider', type: 'range', min: 0, max: 100, step: 1, value: 80, 'aria-label': 'Volume' });
  input.addEventListener('input', () => player.setVolume(Number(input.value) / 100));
  const el = h('div', { class: 'volume' }, mute, input);

  d.add(store.subscribe((s) => [s.volume, s.muted], ([volume, muted]) => {
    const level = muted ? 0 : volume;
    input.value = Math.round(level * 100);
    input.style.setProperty('--pct', `${Math.round(level * 100)}%`);
    mute.replaceChildren(icon(level === 0 ? 'volume-mute' : level < 0.5 ? 'volume-low' : 'volume', 22));
    mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }, { equals: shallowEqual }));

  return { el, destroy: d.run };
}

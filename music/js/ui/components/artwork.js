import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { hueFrom } from '../../utils/format.js';

/** Square artwork with a generated gradient placeholder for missing or broken images. */
export function Artwork(className = '') {
  const el = h('div', { class: `artwork ${className}`.trim() }, h('div', { class: 'artwork__fallback' }, icon('note', '42%')));
  let img = null;
  let currentSrc = null;

  function update(track) {
    el.style.setProperty('--hue', hueFrom(track?.id ?? track?.title ?? 'x'));
    el.classList.toggle('artwork--empty', !track);
    const src = track?.artwork || null;
    if (src === currentSrc) return;
    currentSrc = src;
    if (img) { img.remove(); img = null; }
    if (!src) return;
    const i = h('img', { alt: '', decoding: 'async', draggable: 'false' });
    i.addEventListener('load', () => { if (img === i) i.classList.add('is-loaded'); });
    i.addEventListener('error', () => { if (img === i) { i.remove(); img = null; } });
    i.src = src;
    img = i;
    el.append(i);
  }

  update(null);
  return { el, update };
}

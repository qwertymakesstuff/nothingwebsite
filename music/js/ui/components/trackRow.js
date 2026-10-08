import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from './artwork.js';
import { formatTime } from '../../utils/format.js';

/**
 * One track in a list (search results, queue). The row itself plays the track; extra
 * buttons come from `actions` ([{ icon, label, onClick }]). The parent calls
 * setState() to mark the row as the current / playing one without re-rendering the list.
 */
export function TrackRow({ track, onPlay, actions = [] }) {
  const art = Artwork('row__art');
  art.update(track);
  const eq = h('span', { class: 'eq', 'aria-hidden': 'true', hidden: true }, h('i'), h('i'), h('i'));

  const main = h('button', { class: 'row__main', type: 'button', 'aria-label': `Play ${track.title}`, onclick: onPlay },
    h('div', { class: 'row__art-wrap' }, art.el, eq),
    h('div', { class: 'row__text' },
      h('div', { class: 'row__title' }, track.title),
      h('div', { class: 'row__artist' }, track.artist || 'Unknown artist')),
    h('span', { class: 'row__time' }, track.duration ? formatTime(track.duration) : ''));

  const buttons = actions.map((a) => h('button', {
    class: 'icon-btn row__action', type: 'button', 'aria-label': `${a.label}: ${track.title}`, title: a.label,
    onclick: (e) => { e.stopPropagation(); a.onClick(); },
  }, icon(a.icon, 20)));

  const el = h('li', { class: 'row' }, main, buttons);

  function setState({ current = false, playing = false } = {}) {
    el.classList.toggle('is-current', current);
    eq.hidden = !current;
    eq.classList.toggle('is-playing', current && playing);
    if (current) main.setAttribute('aria-current', 'true'); else main.removeAttribute('aria-current');
  }

  return { el, setState };
}

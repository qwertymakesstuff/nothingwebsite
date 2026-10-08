import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from './artwork.js';
import { formatTime } from '../../utils/format.js';
import { shallowEqual } from '../../core/store.js';

/** The queue in play order. Click a row to play it; the trash button removes it. */
export function QueueList({ player, store }) {
  const d = disposer();
  const el = h('ol', { class: 'queue-list', 'aria-label': 'Play queue' });

  function row(track, orderPos, isCurrent, status) {
    const art = Artwork('row__art');
    art.update(track);
    const eq = h('span', { class: `eq${isCurrent && status === 'playing' ? ' is-playing' : ''}`, 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
    const play = h('button', {
      class: 'row__main', type: 'button',
      'aria-label': `Play ${track.title}`,
      'aria-current': isCurrent ? 'true' : null,
      onclick: () => (isCurrent ? player.togglePlay() : player.jumpTo(orderPos)),
    },
    h('div', { class: 'row__art-wrap' }, art.el, isCurrent ? eq : null),
    h('div', { class: 'row__text' },
      h('div', { class: 'row__title' }, track.title),
      h('div', { class: 'row__artist' }, track.artist || 'Unknown artist')),
    h('span', { class: 'row__time' }, track.duration ? formatTime(track.duration) : ''));
    const remove = h('button', {
      class: 'icon-btn row__remove', type: 'button', 'aria-label': `Remove ${track.title} from queue`,
      onclick: () => player.removeFromQueue(orderPos),
    }, icon('trash', 20));
    return h('li', { class: `row${isCurrent ? ' is-current' : ''}` }, play, remove);
  }

  d.add(store.subscribe(
    (s) => [s.queue, s.status === 'playing'],
    ([queue, playing]) => {
      const status = playing ? 'playing' : 'other';
      el.replaceChildren(...queue.order.map((idx, orderPos) => row(queue.items[idx], orderPos, orderPos === queue.pos, status)));
    },
    { equals: shallowEqual },
  ));

  return { el, destroy: d.run };
}

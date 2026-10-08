import { h, disposer } from '../../utils/dom.js';
import { TrackRow } from './trackRow.js';
import { shallowEqual } from '../../core/store.js';

/** The queue in play order. Click a row to play it; the trash button removes it. */
export function QueueList({ player, store }) {
  const d = disposer();
  const el = h('ol', { class: 'queue-list', 'aria-label': 'Play queue' });

  d.add(store.subscribe(
    (s) => [s.queue, s.status === 'playing'],
    ([queue, playing]) => {
      el.replaceChildren(...queue.order.map((idx, orderPos) => {
        const track = queue.items[idx];
        const isCurrent = orderPos === queue.pos;
        const row = TrackRow({
          track,
          onPlay: () => (isCurrent ? player.togglePlay() : player.jumpTo(orderPos)),
          actions: [{ icon: 'trash', label: 'Remove from queue', onClick: () => player.removeFromQueue(orderPos) }],
        });
        row.setState({ current: isCurrent, playing });
        return row.el;
      }));
    },
    { equals: shallowEqual },
  ));

  return { el, destroy: d.run };
}

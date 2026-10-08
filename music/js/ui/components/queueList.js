import { h, disposer } from '../../utils/dom.js';
import { TrackRow } from './trackRow.js';
import { makeSortable } from '../sortable.js';
import { showToast } from '../uiStore.js';
import { shallowEqual } from '../../core/store.js';

/**
 * The queue in play order. Click a row to play it. Each row has a grip (drag, or Up / Down keys, to
 * reorder), "Play next" and a remove button; removing offers Undo.
 */
export function QueueList({ player, store, ui }) {
  const d = disposer();
  const el = h('ol', { class: 'queue-list', 'aria-label': 'Play queue' });
  let focusPos = null; // after a keyboard move, put focus back on the moved song's grip

  function render() {
    const { queue, status } = store.getState();
    const playing = status === 'playing';
    el.replaceChildren(...queue.order.map((idx, orderPos) => {
      const track = queue.items[idx];
      const isCurrent = orderPos === queue.pos;
      const actions = [];
      if (queue.pos >= 0 && orderPos > queue.pos + 1) {
        actions.push({ icon: 'play-next', label: 'Play next', onClick: () => player.moveNext(orderPos) });
      }
      actions.push({
        icon: 'trash', label: 'Remove from queue',
        onClick: () => {
          const undo = player.removeFromQueue(orderPos);
          if (ui) showToast(ui, 'Removed from queue', 'info', { label: 'Undo', onClick: undo });
        },
      });
      const row = TrackRow({
        track,
        grip: { onNudge: (dir) => { const to = orderPos + dir; if (to >= 0 && to < queue.order.length) { focusPos = to; player.moveInQueue(orderPos, to); } } },
        onPlay: () => (isCurrent ? player.togglePlay() : player.jumpTo(orderPos)),
        actions,
      });
      row.setState({ current: isCurrent, playing });
      row.el.dataset.pos = String(orderPos);
      return row.el;
    }));
    if (focusPos != null) {
      el.children[focusPos]?.querySelector('.row__grip')?.focus();
      focusPos = null;
    }
  }

  const sortable = makeSortable(el, {
    onMove: (from, to) => player.moveInQueue(from, to),
    onEnd: render, // a drag may have been cancelled, or the queue changed underneath it
  });
  d.add(sortable.destroy);

  d.add(store.subscribe(
    (s) => [s.queue, s.status === 'playing'],
    () => { if (!sortable.isDragging()) render(); },
    { equals: shallowEqual },
  ));

  return { el, destroy: d.run };
}

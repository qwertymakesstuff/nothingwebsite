import { h, disposer } from '../../utils/dom.js';
import { TrackRow } from './trackRow.js';
import { makeSortable } from '../sortable.js';
import { showToast } from '../uiStore.js';
import { trackActions } from './trackActions.js';
import { openMenu } from '../dialog.js';
import { shallowEqual } from '../../core/store.js';

/**
 * The queue in play order. Click a row to play it. Each row has a grip (drag, or Up / Down keys, to
 * reorder), a heart, "Play next" and a remove button; removing offers Undo. On phones the extra actions
 * live in a "more" menu.
 */
export function QueueList({ player, store, ui, library }) {
  const d = disposer();
  const el = h('ol', { class: 'queue-list', 'aria-label': 'Play queue' });
  let focusPos = null; // after a keyboard move, put focus back on the moved song's grip
  let rows = [];

  function paintLiked() {
    const favs = new Set(library.getState().favorites.map((t) => t.id));
    rows.forEach((r) => r.row.setState({ current: r.current, playing: r.playing, liked: favs.has(r.id) }));
  }

  function render() {
    const { queue, status } = store.getState();
    const playing = status === 'playing';
    rows = [];
    el.replaceChildren(...queue.order.map((idx, orderPos) => {
      const track = queue.items[idx];
      const isCurrent = orderPos === queue.pos;
      const canPlayNext = queue.pos >= 0 && orderPos > queue.pos + 1;
      const acts = trackActions(track, { player, library, ui });
      const remove = () => {
        const undo = player.removeFromQueue(orderPos);
        showToast(ui, 'Removed from queue', 'info', { label: 'Undo', onClick: undo });
      };
      const actions = [];
      if (canPlayNext) actions.push({ icon: 'play-next', label: 'Play next', onClick: () => player.moveNext(orderPos), secondary: true });
      actions.push({ icon: 'trash', label: 'Remove from queue', onClick: remove, secondary: true });
      const row = TrackRow({
        track,
        grip: { onNudge: (dir) => { const to = orderPos + dir; if (to >= 0 && to < queue.order.length) { focusPos = to; player.moveInQueue(orderPos, to); } } },
        onPlay: () => (isCurrent ? player.togglePlay() : player.jumpTo(orderPos)),
        like: acts.like,
        actions,
        menu: () => {
          const fav = library.isFavorite(track.id);
          const items = [
            ...(canPlayNext ? [{ icon: 'play-next', label: 'Play next', onClick: () => player.moveNext(orderPos) }] : []),
            { icon: 'bookmark-add', label: 'Add to playlist…', onClick: acts.addToPlaylist },
            { icon: fav ? 'heart' : 'heart-outline', label: fav ? 'Remove from favorites' : 'Add to favorites', onClick: acts.toggleLike },
            { icon: 'trash', label: 'Remove from queue', onClick: remove },
          ];
          openMenu({ title: track.title, items });
        },
      });
      row.el.dataset.pos = String(orderPos);
      rows.push({ row, id: track.id, current: isCurrent, playing });
      return row.el;
    }));
    paintLiked();
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
  d.add(library.subscribe((s) => s.favorites, paintLiked, { immediate: false }));

  return { el, destroy: d.run };
}

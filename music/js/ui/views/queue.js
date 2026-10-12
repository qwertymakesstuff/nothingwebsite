import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { QueueList } from '../components/queueList.js';
import { showToast } from '../uiStore.js';
import { promptName } from '../dialog.js';
import { playOrderItems } from '../../player/queueManager.js';
import { formatDuration } from '../../utils/format.js';

export function QueueView({ player, store, router, ui, library }) {
  const d = disposer();
  const list = QueueList({ player, store, ui, library });
  d.add(list.destroy);
  const clear = h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => {
    const undo = player.clearQueue();
    showToast(ui, 'Queue cleared', 'info', { label: 'Undo', onClick: undo });
  } }, 'Clear queue');
  const save = h('button', { class: 'btn btn--ghost', type: 'button', onclick: async () => {
    const tracks = playOrderItems(store.getState().queue);
    if (!tracks.length) return;
    const name = await promptName({ title: 'Save queue as playlist', label: 'Playlist name', confirm: 'Save' });
    if (!name) return;
    const p = library.createPlaylist(name, tracks);
    if (p) showToast(ui, `Saved “${p.name}” (${p.tracks.length} songs)`);
  } }, 'Save as playlist');
  const empty = h('div', { class: 'empty' },
    h('div', { class: 'empty__icon' }, icon('queue', 32)),
    h('h2', null, 'Your queue is empty'),
    h('p', null, 'Songs you play will line up here.'),
    h('button', { class: 'btn btn--primary', type: 'button', onclick: () => router.navigate('home') }, 'Back to home'));
  const count = h('span', { class: 'page-count' });
  const el = h('section', { class: 'view-section' },
    h('div', { class: 'page-head' }, h('h1', { class: 'page-title' }, 'Queue ', count), h('div', { class: 'page-head__actions' }, save, clear)), list.el, empty);
  d.add(store.subscribe((s) => s.queue.items, (items) => {
    const n = items.length;
    const total = items.reduce((sum, t) => sum + (t.duration || 0), 0);
    count.textContent = n ? `(${n}${total ? ` · ${formatDuration(total)}` : ''})` : '';
    clear.hidden = n === 0;
    save.hidden = n === 0;
    list.el.hidden = n === 0;
    empty.hidden = n !== 0;
  }));
  return { el, destroy: d.run };
}

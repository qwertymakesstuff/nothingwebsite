import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { QueueList } from '../components/queueList.js';

export function QueueView({ player, store, router }) {
  const d = disposer();
  const list = QueueList({ player, store });
  d.add(list.destroy);
  const clear = h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => player.clearQueue() }, 'Clear queue');
  const empty = h('div', { class: 'empty' },
    h('div', { class: 'empty__icon' }, icon('queue', 32)),
    h('h2', null, 'Your queue is empty'),
    h('p', null, 'Songs you play will line up here.'),
    h('button', { class: 'btn btn--primary', type: 'button', onclick: () => router.navigate('home') }, 'Back to home'));
  const count = h('span', { class: 'page-count' });
  const el = h('section', { class: 'view-section' },
    h('div', { class: 'page-head' }, h('h1', { class: 'page-title' }, 'Queue ', count), clear), list.el, empty);
  d.add(store.subscribe((s) => s.queue.items.length, (n) => {
    count.textContent = n ? `(${n})` : '';
    clear.hidden = n === 0;
    list.el.hidden = n === 0;
    empty.hidden = n !== 0;
  }));
  return { el, destroy: d.run };
}

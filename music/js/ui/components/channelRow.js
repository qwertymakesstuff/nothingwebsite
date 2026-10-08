import { h } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from './artwork.js';
import { formatCount } from '../../utils/format.js';

/** An artist / channel in a list. The avatar is a circle so it never looks like a song. */
export function ChannelRow({ channel, onOpen }) {
  const art = Artwork('row__art', { icon: 'person', round: true });
  art.update(channel);
  const subs = channel.subscribers ? ` · ${formatCount(channel.subscribers)} subscribers` : '';
  const el = h('li', { class: 'row row--channel' },
    h('button', { class: 'row__main', type: 'button', 'aria-label': `Open channel ${channel.title}`, onclick: onOpen },
      h('div', { class: 'row__art-wrap' }, art.el),
      h('div', { class: 'row__text' },
        h('div', { class: 'row__title' }, channel.title),
        h('div', { class: 'row__artist' }, `Channel${subs}`)),
      h('span', { class: 'row__chev', 'aria-hidden': 'true' }, icon('chevron-right', 22))));
  return { el };
}

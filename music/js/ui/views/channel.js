import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from '../components/artwork.js';
import { TrackList, playAllButton } from '../components/trackList.js';
import { formatCount } from '../../utils/format.js';

const RETRYABLE = new Set(['network', 'timeout', 'upstream', 'unavailable']);

/** A channel / artist page: avatar, name, and their songs. Reached from search results. */
export function ChannelView({ router, params, player, store, ui, services }) {
  const id = params.get('id') || '';
  const d = disposer();
  const body = h('div', { class: 'channel-body', 'aria-live': 'polite' });
  const el = h('section', { class: 'view-section view-section--channel' },
    h('button', { class: 'back-link', type: 'button', onclick: () => history.back() }, icon('chevron-down', 20), 'Back'),
    body);

  let ctrl = null;
  let list = null;
  let destroyed = false;

  const show = (...nodes) => { list?.destroy(); list = null; body.replaceChildren(...nodes); body.removeAttribute('aria-busy'); };
  const stateBlock = (iconName, title, text, ...extra) => h('div', { class: 'empty' },
    h('div', { class: 'empty__icon' }, icon(iconName, 32)), h('h2', null, title), text ? h('p', null, text) : null, ...extra);

  function renderLoading() {
    body.setAttribute('aria-busy', 'true');
    list?.destroy(); list = null;
    body.replaceChildren(
      h('p', { class: 'sr-only' }, 'Loading channel…'),
      h('div', { class: 'skeleton-list', 'aria-hidden': 'true' },
        h('div', { class: 'channel-hero' }, h('i', { class: 'sk sk--hero sk--round' }), h('div', { class: 'sk-text' }, h('i', { class: 'sk sk--line' }), h('i', { class: 'sk sk--line sk--short' }))),
        Array.from({ length: 6 }, () => h('div', { class: 'skeleton-row' }, h('i', { class: 'sk sk--art' }),
          h('div', { class: 'sk-text' }, h('i', { class: 'sk sk--line' }), h('i', { class: 'sk sk--line sk--short' }))))));
  }

  function hero(channel, tracks) {
    const art = Artwork('channel-hero__art', { icon: 'person', round: true });
    art.update(channel);
    const subs = channel.subscribers ? `${formatCount(channel.subscribers)} subscribers` : 'Channel';
    return h('div', { class: 'channel-hero' }, art.el,
      h('div', { class: 'channel-hero__text' },
        h('h1', null, channel.title),
        h('div', { class: 'channel-hero__meta' }, subs),
        channel.description ? h('p', { class: 'channel-hero__desc' }, channel.description) : null,
        tracks.length ? h('div', { class: 'channel-hero__actions' }, playAllButton(() => player.playTracks(tracks, 0))) : null));
  }

  async function run() {
    ctrl?.abort();
    ctrl = new AbortController();
    renderLoading();
    const res = await services.youtube.channel(id, { signal: ctrl.signal });
    if (destroyed || res.error === 'aborted') return;
    if (!res.ok) {
      const retry = RETRYABLE.has(res.error)
        ? h('button', { class: 'btn', type: 'button', onclick: run }, icon('refresh', 20), 'Try again')
        : h('button', { class: 'btn', type: 'button', onclick: () => router.navigate('search') }, 'Back to search');
      show(stateBlock('alert', "Couldn't open this channel", res.message, retry));
      return;
    }
    const { channel, tracks } = res;
    document.title = `${channel.title} - missing music`;
    if (!tracks.length) {
      show(hero(channel, tracks), stateBlock('note', 'No songs found', 'This channel has no playable videos.'));
      return;
    }
    list = TrackList({ tracks, player, store, ui, label: `Songs by ${channel.title}` });
    show(hero(channel, tracks), h('div', { class: 'results-head' }, h('h2', null, 'Songs')), list.el,
      h('p', { class: 'notice' }, 'Playback is simulated for now — real audio arrives in the next phase.'));
  }

  run();
  return { el, destroy() { destroyed = true; ctrl?.abort(); list?.destroy(); d.run(); } };
}

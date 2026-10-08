import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { Artwork } from '../components/artwork.js';
import { TrackList, playAllButton, addAllButton } from '../components/trackList.js';
import { showToast } from '../uiStore.js';
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
  let lists = [];
  let destroyed = false;

  const clearLists = () => { lists.forEach((l) => l.destroy()); lists = []; };
  const show = (...nodes) => { clearLists(); body.replaceChildren(...nodes.filter(Boolean)); body.removeAttribute('aria-busy'); };
  const stateBlock = (iconName, title, text, ...extra) => h('div', { class: 'empty' },
    h('div', { class: 'empty__icon' }, icon(iconName, 32)), h('h2', null, title), text ? h('p', null, text) : null, ...extra);

  function renderLoading() {
    body.setAttribute('aria-busy', 'true');
    clearLists();
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
        tracks.length ? h('div', { class: 'channel-hero__actions' }, playAllButton(() => player.playTracks(tracks, 0)),
          addAllButton(() => { player.enqueue(tracks); showToast(ui, `Added ${tracks.length} songs to queue`); })) : null));
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
    const { channel, popular = [], tracks } = res;
    const all = [...popular, ...tracks];
    document.title = `${channel.title} - missing music`;
    if (!all.length) {
      show(hero(channel, all), stateBlock('note', 'No songs found', 'This channel has no playable videos.'));
      return;
    }
    const sections = [];
    if (popular.length) {
      const l = TrackList({ tracks: popular, queueTracks: all, queueOffset: 0, showViews: true, player, store, ui, label: `Popular songs by ${channel.title}` });
      lists.push(l);
      sections.push(h('section', { class: 'results-section' }, h('div', { class: 'results-head' }, h('h2', null, 'Popular')), l.el));
    }
    if (tracks.length) {
      const l = TrackList({ tracks, queueTracks: all, queueOffset: popular.length, player, store, ui, label: `Latest uploads by ${channel.title}` });
      lists.push(l);
      sections.push(h('section', { class: 'results-section' }, h('div', { class: 'results-head' }, h('h2', null, popular.length ? 'Latest uploads' : 'Songs')), l.el));
    }
    show(hero(channel, all), ...sections,
      services.simulated ? h('p', { class: 'notice' }, 'Simulated playback (?engine=sim): no real audio.') : null);
  }

  run();
  return { el, destroy() { destroyed = true; ctrl?.abort(); clearLists(); d.run(); } };
}

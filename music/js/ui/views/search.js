import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { SearchBox } from '../components/searchBox.js';
import { TrackList, playAllButton, addAllButton } from '../components/trackList.js';
import { ChannelRow } from '../components/channelRow.js';
import { showToast } from '../uiStore.js';
import { normalizeQuery } from '../../services/youtube.js';

const RETRYABLE = new Set(['network', 'timeout', 'upstream', 'unavailable']);

export function SearchView({ router, params, player, store, ui, services }) {
  const { youtube, recent } = services;
  const q = normalizeQuery(params.get('q') || '');
  const d = disposer();
  const box = SearchBox({ router, initial: q, autofocus: !q, className: 'searchbox--view' });
  const body = h('div', { class: 'search-body', 'aria-live': 'polite' });
  const el = h('section', { class: 'view-section view-section--search' },
    h('h1', { class: 'page-title' }, 'Search'),
    h('div', { class: 'search-mobile' }, box.el),
    body);

  let ctrl = null;
  let list = null;
  let destroyed = false;

  const show = (...nodes) => { list?.destroy(); list = null; body.replaceChildren(...nodes); body.removeAttribute('aria-busy'); };
  const stateBlock = (iconName, title, text, ...extra) => h('div', { class: 'empty' },
    h('div', { class: 'empty__icon' }, icon(iconName, 32)), h('h2', null, title), text ? h('p', null, text) : null, ...extra);

  function renderIdle() {
    const terms = recent.list();
    if (!terms.length) {
      show(stateBlock('search', 'Search for music', 'Type a song, artist, channel or album and press Enter.'));
      return;
    }
    const chips = h('div', { class: 'chips' }, terms.map((term) => h('span', { class: 'chip' },
      h('button', { class: 'chip__label', type: 'button', onclick: () => router.navigate('search', { q: term }) }, icon('clock', 16), term),
      h('button', { class: 'chip__remove', type: 'button', 'aria-label': `Remove ${term} from recent searches`, onclick: () => { recent.remove(term); renderIdle(); } }, icon('close', 14)))));
    show(h('div', { class: 'recent' },
      h('div', { class: 'recent__head' },
        h('h2', null, 'Recent searches'),
        h('button', { class: 'btn btn--ghost btn--small', type: 'button', onclick: () => { recent.clear(); renderIdle(); } }, 'Clear')),
      chips));
  }

  function renderLoading() {
    body.setAttribute('aria-busy', 'true');
    list?.destroy(); list = null;
    body.replaceChildren(
      h('p', { class: 'sr-only' }, 'Searching…'),
      h('div', { class: 'skeleton-list', 'aria-hidden': 'true' },
        Array.from({ length: 8 }, (_, i) => h('div', { class: 'skeleton-row' },
          h('i', { class: `sk sk--art${i < 2 ? ' sk--round' : ''}` }),
          h('div', { class: 'sk-text' }, h('i', { class: 'sk sk--line' }), h('i', { class: 'sk sk--line sk--short' }))))));
  }

  function renderError(res) {
    const retry = RETRYABLE.has(res.error)
      ? h('button', { class: 'btn', type: 'button', onclick: () => run(q) }, icon('refresh', 20), 'Try again')
      : null;
    show(stateBlock('alert', "Couldn't search", res.message, retry));
  }

  function renderResults({ tracks, channels }) {
    const sections = [];
    if (channels.length) {
      sections.push(h('section', { class: 'results-section' },
        h('div', { class: 'results-head' }, h('h2', null, 'Artists & channels')),
        h('ol', { class: 'queue-list', 'aria-label': `Channels matching ${q}` },
          channels.map((channel) => ChannelRow({ channel, onOpen: () => router.navigate('channel', { id: channel.id }) }).el))));
    }
    if (tracks.length) {
      list = TrackList({ tracks, player, store, ui, label: `Songs matching ${q}` });
      sections.push(h('section', { class: 'results-section' },
        h('div', { class: 'results-head' }, h('h2', null, 'Songs'), h('div', { class: 'results-head__actions' },
          playAllButton(() => player.playTracks(tracks, 0)),
          addAllButton(() => { player.enqueue(tracks); showToast(ui, `Added ${tracks.length} songs to queue`); }))),
        list.el));
    }
    body.replaceChildren(...sections, ...(services.simulated ? [h('p', { class: 'notice' }, 'Simulated playback (?engine=sim): no real audio.')] : []));
    body.removeAttribute('aria-busy');
  }

  async function run(query) {
    ctrl?.abort();
    ctrl = new AbortController();
    renderLoading();
    const res = await youtube.search(query, { signal: ctrl.signal });
    if (destroyed || res.error === 'aborted') return;
    if (!res.ok) { renderError(res); return; }
    if (!res.tracks.length && !res.channels.length) {
      show(stateBlock('search', `No results for “${query}”`, 'Check the spelling or try a different song, artist or channel.'));
      return;
    }
    recent.add(query);
    renderResults(res);
  }

  if (q) run(q); else renderIdle();

  return { el, destroy() { destroyed = true; ctrl?.abort(); list?.destroy(); d.run(); } };
}

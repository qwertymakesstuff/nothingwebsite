import { h, disposer } from '../../utils/dom.js';
import { icon } from '../icons.js';
import { SearchBox } from '../components/searchBox.js';
import { TrackRow } from '../components/trackRow.js';
import { showToast } from '../uiStore.js';
import { selectCurrent } from '../../player/player.js';
import { normalizeQuery } from '../../services/youtube.js';
import { shallowEqual } from '../../core/store.js';

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
  let rows = [];
  let tracks = [];
  let destroyed = false;

  const show = (...nodes) => { body.replaceChildren(...nodes); body.removeAttribute('aria-busy'); };
  const stateBlock = (iconName, title, text, ...extra) => h('div', { class: 'empty' },
    h('div', { class: 'empty__icon' }, icon(iconName, 32)), h('h2', null, title), text ? h('p', null, text) : null, ...extra);

  function renderIdle() {
    const list = recent.list();
    if (!list.length) {
      show(stateBlock('search', 'Search for music', 'Type a song, artist or album and press Enter.'));
      return;
    }
    const chips = h('div', { class: 'chips' }, list.map((term) => h('span', { class: 'chip' },
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
    body.replaceChildren(
      h('p', { class: 'sr-only' }, 'Searching…'),
      h('div', { class: 'skeleton-list', 'aria-hidden': 'true' },
        Array.from({ length: 8 }, () => h('div', { class: 'skeleton-row' }, h('i', { class: 'sk sk--art' }), h('div', { class: 'sk-text' }, h('i', { class: 'sk sk--line' }), h('i', { class: 'sk sk--line sk--short' }))))));
  }

  function renderError(res) {
    const retry = RETRYABLE.has(res.error)
      ? h('button', { class: 'btn', type: 'button', onclick: () => run(q) }, icon('refresh', 20), 'Try again')
      : null;
    show(stateBlock('alert', "Couldn't search", res.message, retry));
  }

  function renderResults() {
    rows = tracks.map((track, i) => TrackRow({
      track,
      onPlay: () => {
        const cur = selectCurrent(store.getState());
        if (cur && cur.id === track.id) player.togglePlay(); else player.playTracks(tracks, i);
      },
      actions: [
        { icon: 'play-next', label: 'Play next', onClick: () => { player.playNext(track); showToast(ui, 'Playing next'); } },
        { icon: 'queue-add', label: 'Add to queue', onClick: () => { player.enqueue([track]); showToast(ui, 'Added to queue'); } },
      ],
    }));
    show(
      h('div', { class: 'results-head' },
        h('h2', null, `Results for “${q}”`),
        h('button', { class: 'btn btn--primary btn--small', type: 'button', onclick: () => player.playTracks(tracks, 0) }, icon('play', 18), 'Play all')),
      h('ol', { class: 'queue-list results-list', 'aria-label': `Search results for ${q}` }, rows.map((r) => r.el)),
      h('p', { class: 'notice' }, 'Playback is simulated for now — real audio arrives in the next phase.'));
    paintCurrent();
  }

  function paintCurrent() {
    const s = store.getState();
    const cur = selectCurrent(s);
    rows.forEach((r, i) => r.setState({ current: !!cur && tracks[i].id === cur.id, playing: s.status === 'playing' }));
  }
  d.add(store.subscribe((s) => [selectCurrent(s)?.id, s.status === 'playing'], paintCurrent, { equals: shallowEqual, immediate: false }));

  async function run(query) {
    ctrl?.abort();
    ctrl = new AbortController();
    renderLoading();
    const res = await youtube.search(query, { signal: ctrl.signal });
    if (destroyed || res.error === 'aborted') return;
    if (!res.ok) { renderError(res); return; }
    tracks = res.tracks;
    if (!tracks.length) {
      show(stateBlock('search', `No results for “${query}”`, 'Check the spelling or try a different song or artist.'));
      return;
    }
    recent.add(query);
    renderResults();
  }

  if (q) run(q); else renderIdle();

  return { el, destroy() { destroyed = true; ctrl?.abort(); d.run(); } };
}

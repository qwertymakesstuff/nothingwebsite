// Builds the app layout and swaps views. Desktop and mobile chrome both exist in the DOM;
// CSS decides which is visible, and both are driven by the same player state.

import { h, disposer } from '../utils/dom.js';
import { icon } from './icons.js';
import { createRouter } from './router.js';
import { Sidebar, BottomNav } from './components/nav.js';
import { SearchBox } from './components/searchBox.js';
import { PlayerBar } from './components/playerBar.js';
import { MiniPlayer } from './components/miniPlayer.js';
import { NowPlaying } from './components/nowPlaying.js';
import { QueueList } from './components/queueList.js';
import { Toaster } from './components/toast.js';
import { HomeView } from './views/home.js';
import { SearchView } from './views/search.js';
import { LibraryView } from './views/library.js';
import { QueueView } from './views/queue.js';
import { ChannelView } from './views/channel.js';
import { selectCurrent } from '../player/player.js';

const VIEWS = { home: HomeView, search: SearchView, library: LibraryView, queue: QueueView, channel: ChannelView };
const TITLES = { home: 'Home', search: 'Search', library: 'Library', queue: 'Queue', channel: 'Channel' };

export function mountApp(root, { player, store, ui, services }) {
  const d = disposer();
  let router;
  const routerProxy = { navigate: (...a) => router.navigate(...a) };
  const ctx = { player, store, ui, services, router: routerProxy };

  const sidebar = Sidebar();
  const bottomNav = BottomNav();
  const topSearch = SearchBox({ router: routerProxy, className: 'searchbox--top' });
  const playerBar = PlayerBar(ctx);
  const mini = MiniPlayer(ctx);
  const nowPlaying = NowPlaying(ctx);
  const panelQueue = QueueList({ player, store });
  const toaster = Toaster({ ui });
  [playerBar, mini, nowPlaying, panelQueue, toaster].forEach((c) => d.add(c.destroy));

  const view = h('main', { class: 'view', id: 'view', tabindex: '-1' });
  const topbar = h('header', { class: 'topbar' },
    h('a', { class: 'topbar__brand', href: '#/home' }, h('span', { class: 'brand__mark', 'aria-hidden': 'true' }, icon('note', 18)), h('span', null, 'missing music')),
    topSearch.el,
    h('a', { class: 'icon-btn topbar__search-btn', href: '#/search', 'aria-label': 'Search' }, icon('search', 24)));

  const panel = h('aside', { class: 'queue-panel', 'aria-label': 'Queue' },
    h('div', { class: 'queue-panel__head' }, h('h2', null, 'Queue')),
    panelQueue.el);

  const app = h('div', { class: 'app' },
    sidebar.el,
    h('div', { class: 'main-col' }, topbar, view),
    panel, playerBar.el, mini.el, bottomNav.el, nowPlaying.el, toaster.el);
  root.replaceChildren(app);

  d.add(store.subscribe((s) => !!selectCurrent(s), (has) => app.classList.toggle('has-track', has)));
  d.add(ui.subscribe((s) => s.queuePanelOpen, (open) => app.classList.toggle('panel-closed', !open)));

  let current = null;
  router = createRouter(({ name, params }) => {
    current?.destroy();
    current = VIEWS[name]({ ...ctx, params });
    view.replaceChildren(current.el);
    view.scrollTop = 0;
    const navName = name === 'channel' ? 'search' : name; // channel pages belong to Search
    sidebar.setRoute(navName);
    bottomNav.setRoute(navName);
    topSearch.setValue(params.get('q') || '');
    document.title = `${TITLES[name]} - missing music`;
  });
  router.start();

  d.add(() => current?.destroy());
  return { destroy: d.run };
}

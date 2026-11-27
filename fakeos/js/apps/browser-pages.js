// Skylark's own pages: skylark://newtab, ://history, ://bookmarks and ://about.
import { h, clear } from '../lib/dom.js';
import { save, patch, worldNow } from '../os/state.js';
import { ICONS } from '../os/icons.js';
import { resolve } from '../net/router.js';
import { clock, longDate, toMs } from '../lib/time.js';
import { promptBox, confirmBox } from '../os/dialog.js';

const disp = u => u.startsWith('skylark://') ? u : 'http://' + u;
const fav = url => resolve(url).site?.favicon || ICONS.page;

export function internalPage(route, ctx) {
  const page = route.segs[0] || 'newtab';
  if (page === 'newtab') return newTab(ctx);
  if (page === 'history') return historyPage(ctx, route.query.get('q') || '');
  if (page === 'bookmarks') return bookmarksPage(ctx);
  if (page === 'about') return about();
  return { title: 'Not found', node: h('div', { class: 'sk-page' }, h('h1', null, 'Unknown Skylark page'), h('p', null, `skylark://${page} isn't a page Skylark knows about.`)), error: true };
}

function topSites() {
  const counts = new Map();
  for (const e of save.get().browser.history) {
    const host = e.url.split(/[/?]/)[0];
    const c = counts.get(host) || { host, n: 0, title: '' };
    c.n++; if (e.url === host) c.title = e.title; counts.set(host, c);
  }
  const list = [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 8);
  for (const d of ['findr.net', 'vidder.tv', 'threadit.com', 'blink.social']) if (list.length < 8 && !list.some(x => x.host === d)) list.push({ host: d, n: 0, title: '' });
  return list;
}

function newTab(ctx) {
  const q = h('input', { class: 'nt-search', placeholder: 'Search with Findr', 'aria-label': 'Search with Findr', onkeydown: e => { if (e.key === 'Enter' && q.value.trim()) ctx.go('findr.net/search?q=' + encodeURIComponent(q.value.trim())); } });
  const tiles = topSites().map(s => {
    const site = resolve(s.host).site;
    return h('a', { class: 'nt-tile', href: s.host }, h('div', { class: 'nt-thumb ' + (site ? 'site-' + site.id : '') }, h('span', { html: fav(s.host) })), h('span', { class: 'nt-name' }, site?.name || s.title || s.host));
  });
  const recent = save.get().browser.history.slice(0, 40).filter((e, i, arr) => arr.findIndex(x => x.url === e.url) === i).slice(0, 6);
  const node = h('div', { class: 'newtab' },
    h('div', { class: 'nt-logo', html: ICONS.browser }),
    h('div', { class: 'nt-searchwrap' }, q),
    h('div', { class: 'nt-grid' }, tiles),
    recent.length ? h('div', { class: 'nt-recent' }, h('h3', null, 'Recently visited'), recent.map(e => h('a', { href: e.url }, h('span', { html: fav(e.url) }), e.title || e.url))) : null,
    h('div', { class: 'nt-foot' }, h('a', { href: 'skylark://history' }, 'History'), ' · ', h('a', { href: 'skylark://bookmarks' }, 'Bookmarks')));
  return { title: 'New Tab', node, after: () => setTimeout(() => q.focus(), 30) };
}

function historyPage(ctx, query) {
  const node = h('div', { class: 'sk-page' });
  const draw = () => {
    clear(node);
    const all = save.get().browser.history;
    const ql = query.toLowerCase();
    const list = ql ? all.filter(e => e.url.includes(ql) || (e.title || '').toLowerCase().includes(ql)) : all;
    const search = h('input', { class: 'os-input', value: query, placeholder: 'Search history', onkeydown: e => { if (e.key === 'Enter') { query = search.value.trim(); draw(); } } });
    node.append(h('div', { class: 'sk-head' }, h('h1', null, 'History'), search,
      h('button', { class: 'os-btn', type: 'button', disabled: !all.length, onclick: async () => { if (await confirmBox('Clear all browsing history? This cannot be undone.', 'Clear History', 'Clear')) { patch('browser', () => ({ history: [] })); draw(); } } }, 'Clear browsing data')));
    if (!list.length) node.append(h('p', { class: 'sk-empty' }, ql ? 'No history entries match your search.' : 'Pages you visit will appear here.'));
    let day = '';
    list.slice(0, 400).forEach(e => {
      const d = longDate(e.t);
      if (d !== day) { day = d; node.append(h('h2', { class: 'sk-day' }, isToday(e.t) ? 'Today — ' + d : d)); }
      node.append(h('div', { class: 'sk-row' },
        h('span', { class: 'sk-time' }, clock(e.t, save.get().settings.clock24)),
        h('span', { class: 'sk-fav', html: fav(e.url) }),
        h('a', { href: e.url, class: 'sk-title' }, e.title || e.url), h('span', { class: 'sk-url' }, disp(e.url)),
        h('button', { class: 'sk-del', type: 'button', title: 'Remove from history', onclick: () => { patch('browser', b => ({ history: b.history.filter(x => x !== e) })); draw(); } }, '×')));
    });
  };
  draw();
  return { title: 'History', node };
}
const isToday = t => new Date(t).toISOString().slice(0, 10) === new Date(worldNow()).toISOString().slice(0, 10);

function bookmarksPage(ctx) {
  const node = h('div', { class: 'sk-page' });
  const draw = () => {
    clear(node);
    const bms = save.get().browser.bookmarks;
    node.append(h('div', { class: 'sk-head' }, h('h1', null, 'Bookmarks'), h('span', { class: 'sk-note' }, `${bms.length} bookmark${bms.length === 1 ? '' : 's'} · shown on the bookmarks bar`)));
    if (!bms.length) node.append(h('p', { class: 'sk-empty' }, 'No bookmarks yet. Press the star in the address bar to bookmark a page.'));
    const move = (i, d) => { const a = bms.slice(); const [x] = a.splice(i, 1); a.splice(i + d, 0, x); patch('browser', () => ({ bookmarks: a })); draw(); };
    bms.forEach((b, i) => node.append(h('div', { class: 'sk-row' },
      h('span', { class: 'sk-fav', html: fav(b.url) }), h('a', { href: b.url, class: 'sk-title' }, b.title), h('span', { class: 'sk-url' }, disp(b.url)),
      h('button', { class: 'sk-del', type: 'button', title: 'Move up', disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
      h('button', { class: 'sk-del', type: 'button', title: 'Move down', disabled: i === bms.length - 1, onclick: () => move(i, 1) }, '↓'),
      h('button', { class: 'sk-del', type: 'button', title: 'Rename', onclick: async () => { const n = await promptBox('Bookmark name:', b.title, 'Edit Bookmark'); if (n) { patch('browser', s => ({ bookmarks: s.bookmarks.map(x => x.id === b.id ? { ...x, title: n } : x) })); draw(); } } }, '✎'),
      h('button', { class: 'sk-del', type: 'button', title: 'Delete', onclick: () => { patch('browser', s => ({ bookmarks: s.bookmarks.filter(x => x.id !== b.id) })); draw(); } }, '×'))));
  };
  draw();
  return { title: 'Bookmarks', node };
}

function about() {
  return { title: 'About Skylark', node: h('div', { class: 'sk-page sk-about' }, h('div', { class: 'nt-logo', html: ICONS.browser }), h('h1', null, 'Skylark 4.2'),
    h('p', null, 'Version 4.2.1180 (Stable). Skylark is up to date.'),
    h('p', null, 'Skylark is made by Tidewater Software. Thank you for using Skylark, the browser that gets out of your way.'),
    h('p', { class: 'sk-note' }, 'Tip: Ctrl+T opens a tab, Ctrl+Shift+T brings back the last one you closed, and you can drag tabs to reorder them.')) };
}

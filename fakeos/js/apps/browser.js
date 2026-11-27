// Skylark, the web browser. Tabs (reorderable), back/forward per tab, an address bar with
// suggestions, bookmarks bar and manager, history, multiple windows and session restore.
import { h, clear } from '../lib/dom.js';
import { createWindow, onWM, activeWindow } from '../os/wm.js';
import { save, patch, worldNow } from '../os/state.js';
import { registerApp } from '../os/apps.js';
import { icon, ICONS } from '../os/icons.js';
import { showMenu } from '../os/menu.js';
import { promptBox } from '../os/dialog.js';
import { notify } from '../os/notify.js';
import { resolve, normalize, looksLikeUrl, resolveHref, parse } from '../net/router.js';
import { hash } from '../lib/rng.js';
import { ago, clock } from '../lib/time.js';
import { internalPage } from './browser-pages.js';

const instances = new Set();
let restoredThisBoot = false, closedTabs = [], tabSeq = 1, sessionTimer = null;
const HOME = 'skylark://newtab';
export const displayUrl = u => u.startsWith('skylark://') ? u : 'http://' + u.replace(/^([^/?]+)$/, '$1/');

registerApp({
  id: 'browser', name: 'Skylark Browser', icon: 'browser', hint: 'Browse the web',
  launch({ url, newWindow, background }) {
    const target = !newWindow && [...instances].sort((a, b) => (b.win.focused - a.win.focused) || (b.win.el.style.zIndex - a.win.el.style.zIndex))[0];
    if (target) {
      if (url) target.openTab(url, { background }); else target.openTab(HOME);
      target.win.focus();
      return target;
    }
    return new Browser(url ? [url] : [HOME]);
  },
});

addEventListener('keydown', e => {
  const w = activeWindow();
  const b = w && [...instances].find(i => i.win === w);
  if (b) b.onKey(e);
});

function persistSession() {
  clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    if (!instances.size) return;
    const lastSession = [...instances].map(b => ({ active: b.tabs.indexOf(b.active), tabs: b.tabs.map(t => ({ entries: t.entries.map(e => ({ url: e.url, title: e.title })), idx: t.idx })) }));
    patch('browser', () => ({ lastSession }));
  }, 300);
}

export function recordHistory(url, title) {
  if (url === HOME) return;
  patch('browser', b => {
    const history = [{ url, title, t: worldNow() }, ...b.history];
    if (history.length > 2000) history.length = 2000;
    return { history };
  });
}

class Browser {
  constructor(urls, sessionTabs) {
    this.tabs = []; this.active = null;
    this.tabStrip = h('div', { class: 'br-tabstrip', role: 'tablist' });
    this.newTabBtn = h('button', { class: 'br-newtab', type: 'button', title: 'New tab (Ctrl+T)', onclick: () => this.openTab(HOME) }, '+');
    this.tabsRow = h('div', { class: 'br-tabs', ondblclick: e => { if (e.target === this.tabsRow || e.target === this.tabStrip) this.openTab(HOME); } }, this.tabStrip, this.newTabBtn);
    const tb = (cls, label, svg, fn) => h('button', { class: 'br-tb ' + cls, type: 'button', title: label, 'aria-label': label, html: svg, onclick: fn });
    this.backBtn = tb('back', 'Back (Alt+Left)', '<svg viewBox="0 0 20 20"><path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', () => this.go(-1));
    this.fwdBtn = tb('fwd', 'Forward (Alt+Right)', '<svg viewBox="0 0 20 20"><path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>', () => this.go(1));
    this.reloadBtn = tb('reload', 'Reload (F5)', '', () => this.active?.loading ? this.stop() : this.reload());
    const homeBtn = tb('home', 'Home', '<svg viewBox="0 0 20 20"><path d="M3 10l7-6 7 6M5 9v7h4v-4h2v4h4V9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>', () => this.navigate(HOME));
    this.backBtn.addEventListener('contextmenu', e => this.historyMenu(e, -1));
    this.fwdBtn.addEventListener('contextmenu', e => this.historyMenu(e, 1));
    this.addrIcon = h('span', { class: 'br-addr-icon' });
    this.addr = h('input', { class: 'br-addr', spellcheck: false, autocomplete: 'off', 'aria-label': 'Address and search bar' });
    this.star = h('button', { class: 'br-star', type: 'button', title: 'Bookmark this page (Ctrl+D)', html: ICONS.star, onclick: () => this.toggleBookmark() });
    this.suggest = h('div', { class: 'br-suggest' });
    this.addrWrap = h('div', { class: 'br-addrwrap' }, this.addrIcon, this.addr, this.star, this.suggest);
    const menuBtn = tb('menu', 'Skylark menu', '<svg viewBox="0 0 20 20"><path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', e => this.mainMenu(e));
    this.toolbar = h('div', { class: 'br-toolbar' }, this.backBtn, this.fwdBtn, this.reloadBtn, homeBtn, this.addrWrap, menuBtn);
    this.bmBar = h('div', { class: 'br-bmbar' });
    this.infobar = h('div', { class: 'br-infobar', hidden: true });
    this.progress = h('div', { class: 'br-progress' });
    this.views = h('div', { class: 'br-views' });
    this.status = h('div', { class: 'br-status' });
    this.root = h('div', { class: 'browser' }, this.tabsRow, this.toolbar, this.bmBar, this.infobar, this.progress, this.views, this.status);

    this.win = createWindow({
      app: 'browser', title: 'Skylark', icon: icon('browser'), width: Math.min(1120, innerWidth - 60), height: Math.min(760, innerHeight - 90), minW: 420, minH: 300,
      mount: body => body.append(this.root),
      onClose: () => { this.tabs.forEach(t => t.cleanup?.()); instances.delete(this); },
    });
    instances.add(this);
    this.bindAddress();
    this.unsub = save.subscribe(s => { if (s.browser.bookmarks !== this._bm) { this._bm = s.browser.bookmarks; this.renderBookmarks(); this.updateStar(); } });
    this._bm = save.get().browser.bookmarks; this.renderBookmarks();
    if (sessionTabs) this.restoreTabs(sessionTabs);
    else for (const u of urls) this.openTab(u);
    const ls = save.get().browser.lastSession;
    if (!restoredThisBoot && !sessionTabs && ls && ls.some(w => w.tabs.some(t => t.entries.some(e => e.url !== HOME)))) this.offerRestore(ls);
    restoredThisBoot = true;
  }

  offerRestore(ls) {
    clear(this.infobar);
    const n = ls.reduce((a, w) => a + w.tabs.length, 0);
    this.infobar.append(h('span', { class: 'ib-icon' }, 'ⓘ'), h('span', null, `Skylark can restore your last browsing session (${n} tab${n > 1 ? 's' : ''}${ls.length > 1 ? `, ${ls.length} windows` : ''}).`),
      h('button', { class: 'os-btn small', type: 'button', onclick: () => { this.infobar.hidden = true; this.restoreSession(ls); } }, 'Restore session'),
      h('button', { class: 'ib-x', type: 'button', 'aria-label': 'Dismiss', onclick: () => { this.infobar.hidden = true; } }, '×'));
    this.infobar.hidden = false;
  }
  restoreSession(ls) {
    const [first, ...rest] = ls;
    const blank = this.tabs.filter(t => t.entries.length === 1 && t.entries[0].url === HOME);
    this.restoreTabs(first);
    blank.forEach(t => this.closeTab(t, true));
    for (const w of rest) new Browser([], w);
  }
  restoreTabs(w) {
    const made = w.tabs.map(t => this.openTab(null, { background: true, entries: t.entries, idx: t.idx }));
    this.select(made[Math.max(0, Math.min(made.length - 1, w.active))] || made[0]);
  }

  // --- tabs ----------------------------------------------------------------------------
  openTab(url, { background, entries, idx, after } = {}) {
    const tab = { id: 't' + tabSeq++, entries: entries ? entries.map(e => ({ ...e })) : [], idx: entries ? idx : -1, title: 'New Tab', favicon: '', loading: false, view: h('div', { class: 'br-view' }), loaded: false };
    tab.el = h('div', { class: 'br-tab', role: 'tab', title: 'New Tab' }, h('span', { class: 'bt-icon' }), h('span', { class: 'bt-title' }, 'New Tab'), h('button', { class: 'bt-close', type: 'button', 'aria-label': 'Close tab', onclick: e => { e.stopPropagation(); this.closeTab(tab); } }, '×'));
    tab.el.addEventListener('pointerdown', e => this.dragTab(e, tab));
    tab.el.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); this.closeTab(tab); } });
    tab.el.addEventListener('contextmenu', e => { e.preventDefault(); this.tabMenu(e, tab); });
    const pos = after ? this.tabs.indexOf(after) + 1 + this.tabs.filter(t => t.opener === after).length : this.tabs.length;
    if (after) tab.opener = after;
    this.tabs.splice(pos, 0, tab);
    this.tabStrip.insertBefore(tab.el, this.tabStrip.children[pos] || null);
    this.views.append(tab.view);
    this.bindView(tab);
    if (!background || !this.active) this.select(tab);
    if (url) this.navigate(url, { tab });
    else if (entries) { const u = entries[tab.idx]?.url || ''; tab.title = entries[tab.idx]?.title || u || 'New Tab'; tab.favicon = u.startsWith('skylark') ? ICONS.browser : resolve(u).site?.favicon || ''; this.paintTab(tab); if (tab === this.active) this.load(tab); }
    persistSession();
    return tab;
  }
  select(tab) {
    if (!tab) return;
    this.active = tab;
    for (const t of this.tabs) { t.el.classList.toggle('active', t === tab); t.view.classList.toggle('active', t === tab); t.el.setAttribute('aria-selected', String(t === tab)); }
    if (!tab.loaded && tab.idx >= 0 && !tab.loading) this.load(tab);
    this.syncChrome();
    persistSession();
  }
  closeTab(tab, quiet) {
    const i = this.tabs.indexOf(tab); if (i < 0) return;
    tab.cleanup?.();
    if (!quiet && tab.entries.length) { closedTabs.push({ entries: tab.entries, idx: tab.idx }); if (closedTabs.length > 20) closedTabs.shift(); }
    this.tabs.splice(i, 1); tab.el.remove(); tab.view.remove();
    if (!this.tabs.length) { if (!quiet) this.win.close(); return; }
    if (this.active === tab) this.select(tab.opener && this.tabs.includes(tab.opener) ? tab.opener : this.tabs[Math.min(i, this.tabs.length - 1)]);
    persistSession();
  }
  paintTab(tab) {
    tab.el.querySelector('.bt-title').textContent = tab.title;
    tab.el.title = tab.title;
    const ic = tab.el.querySelector('.bt-icon');
    ic.className = 'bt-icon' + (tab.loading ? ' spin' : '');
    ic.innerHTML = tab.loading ? '' : (tab.favicon || ICONS.page);
    if (tab === this.active) this.syncChrome();
  }
  dragTab(e, tab) {
    if (e.button !== 0 || e.target.closest('.bt-close')) return;
    this.select(tab);
    const sx = e.clientX; let moved = false;
    const move = ev => {
      if (!moved && Math.abs(ev.clientX - sx) < 6) return;
      moved = true; tab.el.classList.add('dragging');
      const over = this.tabs.find(t => { const r = t.el.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX < r.right; });
      if (!over || over === tab) return;
      const from = this.tabs.indexOf(tab), to = this.tabs.indexOf(over);
      this.tabs.splice(from, 1); this.tabs.splice(to, 0, tab);
      this.tabStrip.insertBefore(tab.el, to > from ? over.el.nextSibling : over.el);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); tab.el.classList.remove('dragging'); if (moved) persistSession(); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }
  tabMenu(e, tab) {
    showMenu(e.clientX, e.clientY, [
      { label: 'New tab', onclick: () => this.openTab(HOME, { after: tab }) },
      '-',
      { label: 'Reload', onclick: () => { this.select(tab); this.reload(); } },
      { label: 'Duplicate', onclick: () => this.openTab(null, { entries: tab.entries, idx: tab.idx, after: tab }) },
      { label: 'Move tab to new window', disabled: this.tabs.length < 2, onclick: () => { const ent = { entries: tab.entries, idx: tab.idx }; this.closeTab(tab, true); new Browser([], { active: 0, tabs: [ent] }); } },
      '-',
      { label: 'Close tab', shortcut: 'Ctrl+W', onclick: () => this.closeTab(tab) },
      { label: 'Close other tabs', disabled: this.tabs.length < 2, onclick: () => this.tabs.filter(t => t !== tab).forEach(t => this.closeTab(t)) },
      { label: 'Reopen closed tab', shortcut: 'Ctrl+Shift+T', disabled: !closedTabs.length, onclick: () => this.reopenClosed() },
    ]);
  }
  reopenClosed() { const t = closedTabs.pop(); if (t) this.openTab(null, t); }

  // --- navigation ----------------------------------------------------------------------
  navigate(input, { tab = this.active, replace } = {}) {
    let url = String(input || '').trim();
    if (!url) return;
    url = normalize(url);
    if (!tab) return;
    if (tab.entries[tab.idx]) tab.entries[tab.idx].scroll = tab.view.scrollTop;
    if (replace && tab.idx >= 0) tab.entries[tab.idx] = { url, title: url };
    else { tab.entries = tab.entries.slice(0, tab.idx + 1); tab.entries.push({ url, title: url }); tab.idx = tab.entries.length - 1; }
    this.load(tab, { fresh: true });
  }
  go(delta) {
    const tab = this.active; if (!tab) return;
    const n = tab.idx + delta; if (n < 0 || n >= tab.entries.length) return;
    tab.entries[tab.idx].scroll = tab.view.scrollTop;
    tab.idx = n; this.load(tab, { restoreScroll: true });
  }
  goTo(tab, n) { tab.entries[tab.idx].scroll = tab.view.scrollTop; tab.idx = n; this.load(tab, { restoreScroll: true }); }
  reload() { const t = this.active; if (t) { if (t.entries[t.idx]) t.entries[t.idx].scroll = t.view.scrollTop; this.load(t, { restoreScroll: true, reload: true }); } }
  stop() { const t = this.active; if (t && t.loading) { clearTimeout(t.timer); t.loading = false; t.loadToken = null; this.paintTab(t); this.progress.className = 'br-progress'; } }

  load(tab, { fresh, restoreScroll, reload } = {}) {
    const entry = tab.entries[tab.idx]; if (!entry) return;
    const url = entry.url;
    clearTimeout(tab.timer);
    tab.loading = true; tab.loaded = true;
    const token = tab.loadToken = {};
    this.paintTab(tab);
    if (tab === this.active) { this.progress.className = 'br-progress'; void this.progress.offsetWidth; this.progress.className = 'br-progress go'; }
    const internal = url.startsWith('skylark://');
    // pages "download" for a moment: longer the first time a host is visited, quicker from cache
    const seen = save.get().browser.history.some(h => h.url.split(/[/?]/)[0] === url.split(/[/?]/)[0]);
    const delay = internal ? 40 : 120 + (hash(url) % 260) + (seen ? 0 : 350) + (reload ? 80 : 0);
    tab.timer = setTimeout(async () => {
      let res;
      const leave = [];
      try { res = await this.renderPage(tab, url, leave); } catch (err) { console.error(err); res = errorPage('crash', parse(url), this, tab); }
      if (tab.loadToken !== token) { leave.forEach(fn => fn()); return; }
      // the old page goes away now: run its cleanup, then remember the new page's
      tab.cleanup?.();
      if (res.cleanup) leave.push(res.cleanup);
      tab.cleanup = leave.length ? () => leave.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } }) : null;
      clear(tab.view);
      tab.view.className = 'br-view' + (tab === this.active ? ' active' : '') + (res.siteClass ? ' ' + res.siteClass : '');
      tab.view.append(res.node);
      tab.loading = false;
      tab.title = res.title || url; tab.favicon = res.favicon || '';
      entry.title = tab.title;
      this.paintTab(tab);
      if (tab === this.active) { this.progress.className = 'br-progress done'; }
      tab.view.scrollTop = restoreScroll ? entry.scroll || 0 : 0;
      if (res.hash) { const t = tab.view.querySelector('#' + CSS.escape(res.hash)); if (t) t.scrollIntoView(); }
      if (fresh && !res.error) recordHistory(url, tab.title);
      res.after?.();
      persistSession();
    }, delay);
  }

  async renderPage(tab, url, leave) {
    const ctx = this.ctxFor(tab, url, leave);
    if (url.startsWith('skylark://')) return internalPage(parse(url), ctx);
    const r = resolve(url);
    if (r.error) return errorPage(r.error, r.route, this, tab);
    const out = await r.site.render(r.route, ctx);
    return { ...out, favicon: out.favicon || r.site.favicon, siteClass: 'site-' + r.site.id, title: out.title || r.site.name, hash: r.route.hash };
  }
  ctxFor(tab, url, leave = []) {
    const self = this;
    return {
      url, route: parse(url),
      go: u => self.navigate(u, { tab }),
      replace: u => self.navigate(u, { tab, replace: true }),
      open: (u, bg) => self.openTab(u, { background: bg, after: tab }),
      reload: () => { if (tab === self.active) self.reload(); },
      setTitle: t => { tab.title = t; if (tab.entries[tab.idx]) tab.entries[tab.idx].title = t; self.paintTab(tab); },
      onLeave: fn => leave.push(fn),
      isVisible: () => tab === self.active && self.win.state !== 'min',
      browser: self,
      restoreSession: ls => self.restoreSession(ls),
    };
  }

  bindView(tab) {
    const v = tab.view;
    const linkOf = e => e.target.closest?.('a[href]');
    v.addEventListener('click', e => {
      const a = linkOf(e); if (!a) return;
      const url = resolveHref(a.getAttribute('href'), tab.entries[tab.idx]?.url || '');
      if (!url) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || e.button === 1) this.openTab(url, { background: true, after: tab });
      else if (a.target === '_blank' || e.shiftKey) this.openTab(url, { after: tab });
      else this.navigate(url, { tab });
    });
    v.addEventListener('auxclick', e => {
      const a = linkOf(e); if (!a || e.button !== 1) return;
      const url = resolveHref(a.getAttribute('href'), tab.entries[tab.idx]?.url || ''); if (!url) return;
      e.preventDefault(); this.openTab(url, { background: true, after: tab });
    });
    v.addEventListener('mouseover', e => {
      const a = linkOf(e);
      const url = a && resolveHref(a.getAttribute('href'), tab.entries[tab.idx]?.url || '');
      this.status.textContent = url ? displayUrl(url) : '';
      this.status.classList.toggle('on', !!url);
    });
    v.addEventListener('mouseleave', () => this.status.classList.remove('on'));
    v.addEventListener('contextmenu', e => {
      if (e.target.closest('input, textarea')) return;
      e.preventDefault();
      const a = linkOf(e);
      const url = a && resolveHref(a.getAttribute('href'), tab.entries[tab.idx]?.url || '');
      if (url) return showMenu(e.clientX, e.clientY, [
        { label: 'Open link in new tab', onclick: () => this.openTab(url, { background: true, after: tab }) },
        { label: 'Open link in new window', onclick: () => new Browser([url]) },
        '-',
        { label: 'Bookmark this link', onclick: () => this.addBookmark(url, a.textContent.trim() || url) },
        { label: 'Copy link address', onclick: () => navigator.clipboard?.writeText(displayUrl(url)).catch(() => {}) },
      ]);
      const sel = String(getSelection()).trim();
      showMenu(e.clientX, e.clientY, [
        { label: 'Back', disabled: tab.idx <= 0, onclick: () => this.go(-1) },
        { label: 'Forward', disabled: tab.idx >= tab.entries.length - 1, onclick: () => this.go(1) },
        { label: 'Reload', onclick: () => this.reload() },
        '-',
        sel ? { label: `Search Findr for "${sel.length > 24 ? sel.slice(0, 24) + '…' : sel}"`, onclick: () => this.openTab('findr.net/search?q=' + encodeURIComponent(sel), { after: tab }) } : null,
        sel ? { label: 'Copy', onclick: () => navigator.clipboard?.writeText(sel).catch(() => {}) } : null,
        sel ? '-' : null,
        { label: 'Bookmark this page', onclick: () => this.toggleBookmark(true) },
        { label: 'View page info', onclick: () => this.pageInfo(tab) },
      ]);
    });
  }

  // --- chrome --------------------------------------------------------------------------
  syncChrome() {
    const t = this.active; if (!t) return;
    const url = t.entries[t.idx]?.url || '';
    if (document.activeElement !== this.addr) this.addr.value = url === HOME ? '' : displayUrl(url);
    this.addr.placeholder = 'Search Findr or type a web address';
    this.backBtn.disabled = t.idx <= 0;
    this.fwdBtn.disabled = t.idx >= t.entries.length - 1;
    this.reloadBtn.innerHTML = t.loading ? '<svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 20 20"><path d="M15.5 10a5.5 5.5 0 1 1-1.8-4.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14.5 2.5v4h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    this.reloadBtn.title = t.loading ? 'Stop' : 'Reload (F5)';
    this.addrIcon.innerHTML = url.startsWith('skylark://') ? ICONS.browser : (t.favicon || ICONS.page);
    this.updateStar();
    this.win.setTitle((t.title || 'New Tab') + ' - Skylark');
    if (!t.loading) this.progress.className = this.progress.className.includes('done') ? 'br-progress done' : 'br-progress';
  }
  updateStar() {
    const url = this.active?.entries[this.active.idx]?.url;
    const on = !!url && save.get().browser.bookmarks.some(b => b.url === url);
    this.star.classList.toggle('on', on);
    this.star.title = on ? 'Edit bookmark' : 'Bookmark this page (Ctrl+D)';
  }
  toggleBookmark(forceAdd) {
    const t = this.active; const url = t?.entries[t.idx]?.url; if (!url || url === HOME) return;
    const bms = save.get().browser.bookmarks;
    const existing = bms.find(b => b.url === url);
    if (existing && !forceAdd) {
      showMenu(this.star.getBoundingClientRect().left - 120, this.star.getBoundingClientRect().bottom + 4, [
        { label: 'Rename bookmark…', onclick: async () => { const n = await promptBox('Bookmark name:', existing.title, 'Edit Bookmark'); if (n) patch('browser', b => ({ bookmarks: b.bookmarks.map(x => x.id === existing.id ? { ...x, title: n } : x) })); } },
        { label: 'Remove bookmark', onclick: () => patch('browser', b => ({ bookmarks: b.bookmarks.filter(x => x.id !== existing.id) })) },
      ]);
    } else if (!existing) this.addBookmark(url, t.title);
  }
  addBookmark(url, title) {
    if (save.get().browser.bookmarks.some(b => b.url === url)) return;
    patch('browser', b => ({ bookmarks: [...b.bookmarks, { id: 'b' + Date.now().toString(36), title: title || url, url }] }));
    notify({ title: 'Bookmark added', body: title || url, icon: ICONS.browser, quiet: true });
  }
  renderBookmarks() {
    clear(this.bmBar);
    const bms = save.get().browser.bookmarks;
    if (!bms.length) this.bmBar.append(h('span', { class: 'bm-empty' }, 'Bookmark pages with the ★ in the address bar and they will appear here.'));
    for (const b of bms) {
      const r = resolve(b.url);
      const el = h('a', { class: 'bm', href: '#', title: b.title + '\n' + displayUrl(b.url) }, h('span', { class: 'bm-icon', html: r.site?.favicon || (b.url.startsWith('skylark') ? ICONS.browser : ICONS.page) }), h('span', null, b.title));
      el.addEventListener('click', e => { e.preventDefault(); if (e.ctrlKey || e.metaKey) this.openTab(b.url, { background: true }); else this.navigate(b.url); });
      el.addEventListener('auxclick', e => { if (e.button === 1) { e.preventDefault(); this.openTab(b.url, { background: true }); } });
      el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showMenu(e.clientX, e.clientY, [
        { label: 'Open', onclick: () => this.navigate(b.url) },
        { label: 'Open in new tab', onclick: () => this.openTab(b.url, { background: true }) },
        { label: 'Open in new window', onclick: () => new Browser([b.url]) },
        '-',
        { label: 'Rename…', onclick: async () => { const n = await promptBox('Bookmark name:', b.title, 'Edit Bookmark'); if (n) patch('browser', s => ({ bookmarks: s.bookmarks.map(x => x.id === b.id ? { ...x, title: n } : x) })); } },
        { label: 'Delete', onclick: () => patch('browser', s => ({ bookmarks: s.bookmarks.filter(x => x.id !== b.id) })) },
        '-',
        { label: 'Bookmark manager', onclick: () => this.openTab('skylark://bookmarks') },
      ]); });
      this.bmBar.append(el);
    }
  }
  mainMenu(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const ls = save.get().browser.lastSession;
    showMenu(r.right - 220, r.bottom + 2, [
      { label: 'New tab', shortcut: 'Ctrl+T', onclick: () => this.openTab(HOME) },
      { label: 'New window', shortcut: 'Ctrl+N', onclick: () => new Browser([HOME]) },
      '-',
      { label: 'History', shortcut: 'Ctrl+H', onclick: () => this.openTab('skylark://history') },
      { label: 'Bookmarks', shortcut: 'Ctrl+B', onclick: () => this.openTab('skylark://bookmarks') },
      { label: 'Reopen closed tab', shortcut: 'Ctrl+Shift+T', disabled: !closedTabs.length, onclick: () => this.reopenClosed() },
      { label: 'Restore previous session', disabled: !ls, onclick: () => this.restoreSession(ls) },
      '-',
      { label: 'Page info', onclick: () => this.pageInfo(this.active) },
      { label: 'About Skylark', onclick: () => this.openTab('skylark://about') },
      '-',
      { label: 'Close window', onclick: () => this.win.close() },
    ]);
  }
  historyMenu(e, dir) {
    e.preventDefault();
    const t = this.active; const items = [];
    for (let i = t.idx + dir; i >= 0 && i < t.entries.length && items.length < 12; i += dir) { const n = i; items.push({ label: t.entries[i].title || t.entries[i].url, onclick: () => this.goTo(t, n) }); }
    if (items.length) showMenu(e.clientX, e.clientY, items);
  }
  pageInfo(tab) {
    const url = tab.entries[tab.idx]?.url || '';
    const r = resolve(url);
    createWindow({ app: 'dialog', title: 'Page Info', icon: icon('browser'), width: 400, height: 230, resizable: false, mount: body => body.append(h('div', { class: 'pageinfo' },
      h('p', null, h('b', null, 'Title: '), tab.title), h('p', null, h('b', null, 'Address: '), displayUrl(url)),
      h('p', null, h('b', null, 'Type: '), url.startsWith('skylark') ? 'Skylark internal page' : 'text/html'),
      r.site ? h('p', null, h('b', null, 'Server: '), r.site.server || 'Apache/2.2.22') : null,
      h('p', null, h('b', null, 'Connection: '), url.startsWith('skylark') ? 'Local' : 'Not encrypted. Information you send to this site could be read by others on your network.'))) });
  }

  bindAddress() {
    let sel = -1, items = [];
    const close = () => { this.suggest.classList.remove('on'); sel = -1; };
    const fill = () => {
      const q = this.addr.value.trim().toLowerCase().replace(/^https?:\/\//, '');
      clear(this.suggest); items = [];
      if (!q) return close();
      const b = save.get().browser;
      const seen = new Set();
      const add = (url, title, kind) => { if (seen.has(url) || items.length >= 7) return; seen.add(url); items.push({ url, title, kind }); };
      for (const bm of b.bookmarks) if (bm.url.includes(q) || bm.title.toLowerCase().includes(q)) add(bm.url, bm.title, 'bookmark');
      const counts = new Map();
      for (const e of b.history) { if (e.url.includes(q) || (e.title || '').toLowerCase().includes(q)) { const c = counts.get(e.url); counts.set(e.url, { title: e.title, n: (c?.n || 0) + 1, starts: e.url.startsWith(q) }); } }
      [...counts].sort((x, y) => (y[1].starts - x[1].starts) || y[1].n - x[1].n).forEach(([url, v]) => add(url, v.title, 'history'));
      const raw = this.addr.value.trim();
      items.unshift({ search: raw, kind: looksLikeUrl(raw) ? 'go' : 'search' });
      items.forEach((it, i) => this.suggest.append(h('div', { class: 'sg-item' + (i === sel ? ' sel' : ''), onpointerdown: e => { e.preventDefault(); pick(it); } },
        h('span', { class: 'sg-kind ' + it.kind, html: it.kind === 'bookmark' ? ICONS.star : it.kind === 'search' ? ICONS.findr : ICONS.page }),
        it.search != null ? h('span', null, it.kind === 'go' ? displayUrl(normalize(it.search)) : h('span', null, it.search, h('em', null, ' — Search with Findr'))) : h('span', null, h('b', null, it.title || it.url), h('em', null, ' — ' + displayUrl(it.url))))));
      this.suggest.classList.add('on');
    };
    const pick = it => { close(); if (it.search != null) this.submit(it.search); else { this.navigate(it.url); this.addr.blur(); } };
    this.addr.addEventListener('focus', () => setTimeout(() => this.addr.select(), 0));
    this.addr.addEventListener('blur', () => { close(); this.syncChrome(); });
    this.addr.addEventListener('input', () => { sel = 0; fill(); });
    this.addr.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return; e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        [...this.suggest.children].forEach((c, i) => c.classList.toggle('sel', i === sel));
        const it = items[sel]; if (it.url) this.addr.value = displayUrl(it.url);
      } else if (e.key === 'Enter') { e.preventDefault(); const it = items[sel]; if (this.suggest.classList.contains('on') && it && it.url) pick(it); else { close(); this.submit(this.addr.value); } }
      else if (e.key === 'Escape') { close(); this.syncChrome(); this.addr.select(); }
    });
  }
  submit(text) {
    text = text.trim(); if (!text) return;
    this.addr.blur();
    if (looksLikeUrl(text)) { patch('browser', b => ({ typed: [normalize(text), ...b.typed.filter(x => x !== normalize(text))].slice(0, 50) })); this.navigate(text); }
    else this.navigate('findr.net/search?q=' + encodeURIComponent(text));
  }

  onKey(e) {
    const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey;
    const act = fn => { e.preventDefault(); e.stopPropagation(); fn(); };
    if (c && e.shiftKey && k === 't') return act(() => this.reopenClosed());
    if (c && k === 't') return act(() => this.openTab(HOME));
    if (c && k === 'n') return act(() => new Browser([HOME]));
    if (c && k === 'w') return act(() => this.closeTab(this.active));
    if (c && k === 'l') return act(() => { this.addr.focus(); this.addr.select(); });
    if ((c && k === 'r') || e.key === 'F5') return act(() => this.reload());
    if (c && k === 'd') return act(() => this.toggleBookmark(true));
    if (c && k === 'h') return act(() => this.openTab('skylark://history'));
    if (c && k === 'b' && !e.target.closest('input,textarea')) return act(() => this.openTab('skylark://bookmarks'));
    if (c && e.key === 'Tab') return act(() => { const i = this.tabs.indexOf(this.active); this.select(this.tabs[(i + (e.shiftKey ? -1 : 1) + this.tabs.length) % this.tabs.length]); });
    if (e.altKey && e.key === 'ArrowLeft') return act(() => this.go(-1));
    if (e.altKey && e.key === 'ArrowRight') return act(() => this.go(1));
    if (e.altKey && e.key === 'Home') return act(() => this.navigate(HOME));
    if (e.key === 'Backspace' && !e.target.closest('input,textarea,[contenteditable]')) return act(() => this.go(-1));
  }
}

export function errorPage(kind, route, browser, tab) {
  const host = route.host || '';
  const tryAgain = h('button', { class: 'os-btn', type: 'button', onclick: () => browser.reload() }, 'Try Again');
  let title, body;
  if (kind === 'dns') {
    title = 'Server not found';
    body = [h('h1', null, 'Server not found'), h('p', { class: 'ep-lead' }, `Skylark can't find the server at ${host}.`),
      h('ul', null, h('li', null, 'Check the address for typing errors such as ', h('b', null, 'ww.example.com'), ' instead of ', h('b', null, 'www.example.com'), '.'),
        h('li', null, 'If you are unable to load any pages, check your computer\'s network connection.'),
        h('li', null, 'The site may have moved, or it may no longer exist.')),
      h('div', { class: 'ep-btns' }, tryAgain, h('a', { class: 'os-btn', href: 'findr.net/search?q=' + encodeURIComponent(host.replace(/\.(com|net|org|tv|social|co\.uk)$/, '')) }, `Search Findr for "${host}"`))];
  } else if (kind === 'crash') {
    title = 'Problem loading page';
    body = [h('h1', null, 'Well, this is embarrassing.'), h('p', { class: 'ep-lead' }, 'Skylark had a problem displaying this page.'), h('div', { class: 'ep-btns' }, tryAgain)];
  } else {
    title = 'Problem loading page';
    body = [h('h1', null, 'Enter an address'), h('p', null, 'Type a web address like findr.net into the address bar.')];
  }
  return { title, error: true, node: h('div', { class: 'error-page' }, h('div', { class: 'ep-box' }, h('div', { class: 'ep-glyph', html: ICONS.browser }), ...body)) };
}

export const browserInstances = () => instances;
export { HOME, Browser };

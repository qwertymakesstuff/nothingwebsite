// Entry point: one store (the player), one opener, a hash router, the shell (sidebar + top bar).

import { createStore, createOpener } from './store.js';
import { SAVE_KEY } from './config.js';
import { levelInfo } from './playerState.js';
import { inventoryValue, refillEligible } from './economy.js';
import { ICONS, LOGO } from './ui/icons.js';
import { $, fmt } from './ui/dom.js';
import { toast } from './ui/toast.js';
import { closeModal } from './ui/modal.js';
import { setSoundEnabled } from './ui/sound.js';
import { coins } from './ui/components.js';
import homeView from './views/home.js';
import casesView from './views/cases.js';
import caseView from './views/case.js';
import inventoryView from './views/inventory.js';
import profileView from './views/profile.js';
import settingsView from './views/settings.js';
import { placeholderView } from './views/placeholder.js';

let storage;
try { storage = window.localStorage; } catch { storage = null; }
const store = createStore({ storage: storage || { getItem() { throw new Error('no storage'); }, setItem() { throw new Error('no storage'); } } });
const opener = createOpener(store);

const ROUTES = {
  home: homeView,
  cases: casesView,
  case: caseView,
  upgrade: placeholderView('upgrade'),
  battles: placeholderView('battles'),
  inventory: inventoryView,
  marketplace: placeholderView('marketplace'),
  contracts: placeholderView('contracts'),
  collections: placeholderView('collections'),
  missions: placeholderView('missions'),
  profile: profileView,
  settings: settingsView,
};

const NAV = [
  { group: 'Play', items: [['home', 'Home'], ['cases', 'Cases'], ['upgrade', 'Upgrade', true], ['battles', 'Case Battles', true]] },
  { group: 'Items', items: [['inventory', 'Inventory'], ['marketplace', 'Marketplace', true], ['contracts', 'Contracts', true], ['collections', 'Collections', true]] },
  { group: 'You', items: [['missions', 'Missions', true], ['profile', 'Profile'], ['settings', 'Settings']] },
];

const ICON_FOR = { home: 'home', cases: 'cases', upgrade: 'upgrade', battles: 'battles', inventory: 'inventory', marketplace: 'marketplace', contracts: 'contracts', collections: 'collections', missions: 'missions', profile: 'profile', settings: 'settings' };

function renderShell() {
  $('#brand').innerHTML = `${LOGO}<span class="brand-text">Skin<b>Spin</b></span>`;
  $('#nav').innerHTML = NAV.map(g => `<p class="nav-group">${g.group}</p>${g.items.map(([id, label, soon]) =>
    `<a class="nav-link" href="#/${id}" data-route="${id}">${ICONS[ICON_FOR[id]]}<span>${label}</span>${soon ? '<em class="soon">Soon</em>' : ''}</a>`).join('')}`).join('');
  $('#menuBtn').innerHTML = ICONS.menu;
  $('#menuBtn').addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $('#scrim').addEventListener('click', () => setMenu(false));
  $('#refillBtn').addEventListener('click', () => {
    const r = store.claimRefill();
    toast(r.ok ? `${fmt(r.amount)} free coins added. Good luck!` : r.message, { kind: r.ok ? 'success' : 'error' });
  });
}

function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  $('#menuBtn').setAttribute('aria-expanded', String(open));
}

let shown = { coins: null };
function animateBalance(to) {
  const el = $('#balancePill');
  const from = shown.coins;
  shown.coins = to;
  if (from == null || from === to || document.body.classList.contains('reduce-motion')) {
    el.innerHTML = coins(to);
    return;
  }
  el.classList.remove('pulse-up', 'pulse-down');
  void el.offsetWidth;
  el.classList.add(to > from ? 'pulse-up' : 'pulse-down');
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / 450);
    if (shown.coins !== to) return; // superseded
    el.innerHTML = coins(from + (to - from) * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderTopbar() {
  const p = store.player;
  animateBalance(p.coins);
  const lv = levelInfo(p.xp);
  $('#levelPill').innerHTML = `<span class="lvl-badge">${lv.level}</span><span class="lvl-meta"><span>Level ${lv.level}</span><span class="xp-bar"><span style="width:${(lv.progress * 100).toFixed(1)}%"></span></span></span>`;
  $('#levelPill').title = lv.needed ? `${fmt(lv.into)} / ${fmt(lv.needed)} XP to level ${lv.level + 1}` : 'Max level';
  $('#invPill').innerHTML = `${ICONS.inventory}<span><b>${p.inventory.length}</b> items · ${coins(inventoryValue(p))}</span>`;
  $('#refillBtn').hidden = !refillEligible(p);
  const warn = $('#saveWarning');
  warn.hidden = store.saveOk;
  if (!store.saveOk) warn.textContent = 'Your browser is blocking storage, so progress will not be saved after you leave this page.';
}

function applyPreferences() {
  const s = store.player.settings;
  const systemReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const reduced = s.motion === 'reduced' || (s.motion === 'system' && systemReduced);
  document.body.classList.toggle('reduce-motion', !!reduced);
  setSoundEnabled(s.sound);
}

// ---- router ----
// Each render gets a fresh root element, so listeners a view attached last time go with it.
function mount() {
  const host = $('#view');
  const root = document.createElement('div');
  root.className = `view view-${active.name}`;
  host.replaceChildren(root);
  ctx.root = root;
  active.view.render(ctx);
}

let active = null;
const ctx = { store, opener, root: null, params: [] };

function parseHash() {
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: ROUTES[name] ? name : 'home', params: params.map(decodeURIComponent), known: !name || !!ROUTES[name] };
}

function route() {
  const { name, params, known } = parseHash();
  if (!known) { location.replace('#/home'); return; }
  closeModal();
  setMenu(false);
  active?.view.destroy?.();
  const view = ROUTES[name];
  ctx.params = params;
  active = { name, view };
  mount();
  $('#pageTitle').textContent = typeof view.title === 'function' ? view.title(ctx) : view.title;
  document.title = `${$('#pageTitle').textContent} · SkinSpin`;
  for (const a of document.querySelectorAll('.nav-link')) a.classList.toggle('active', a.dataset.route === (name === 'case' ? 'cases' : name));
  window.scrollTo(0, 0);
  $('#view').focus({ preventScroll: true });
}

store.subscribe(event => {
  renderTopbar();
  if (event.type === 'settings' || event.type === 'reset' || event.type === 'external') applyPreferences();
  if (!active) return;
  if (active.view.onStore) active.view.onStore(event, ctx);
  else {
    const y = window.scrollY;
    active.view.destroy?.();
    mount();
    window.scrollTo(0, y);
  }
});

// Another tab saved: take its state unless this tab is mid-opening (its own save lands right after).
window.addEventListener('storage', e => {
  if (e.key !== SAVE_KEY || opener.busy) return;
  store.reloadFromStorage();
});

window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', applyPreferences);
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

renderShell();
applyPreferences();
renderTopbar();
if (!location.hash) history.replaceState(null, '', '#/home');
route();

const notices = {
  repaired: 'Some saved data was damaged and has been repaired.',
  corrupt: 'Your saved data could not be read, so a new profile was started. The old data was kept as a backup.',
  newer: 'This save was made by a newer version of SkinSpin. A backup was kept before loading it.',
};
if (notices[store.loadStatus]) toast(notices[store.loadStatus], { kind: 'error', timeout: 8000 });
if (store.loadStatus === 'new') toast(`Welcome to SkinSpin, ${store.player.name}! You start with 5,000 coins.`, { kind: 'success', timeout: 6000 });

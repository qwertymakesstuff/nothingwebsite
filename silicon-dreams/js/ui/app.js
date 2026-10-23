// The application shell: screen routing, the top bar, settings, and wiring game events to
// toasts and dialogs. Screens are modules exporting render(app, root).

import { h, clear, button } from './dom.js';
import { initOverlay, toast, modal, closeAll } from './overlay.js';
import { configureSound, play } from './sound.js';
import { Game } from '../core/game.js';
import { loadGame, loadSettings, saveSettings, hasSave } from '../core/save.js';
import { DAY_END, DAY_START } from '../core/config.js';
import { clock, money, plural } from '../core/util.js';
import { nextLevelXp } from '../core/business.js';
import { LEVELS } from '../core/config.js';

import * as menu from './screens/menu.js';
import * as newgame from './screens/newgame.js';
import * as workshop from './screens/workshop.js';
import * as assembly from './screens/assembly.js';
import * as testing from './screens/testing.js';
import * as store from './screens/store.js';
import * as jobs from './screens/jobs.js';
import * as business from './screens/business.js';
import * as settings from './screens/settings.js';

export const SCREENS = {
  menu: { mod: menu, title: 'Main menu', bare: true },
  newgame: { mod: newgame, title: 'New game', bare: true },
  workshop: { mod: workshop, title: 'Repair Workshop', nav: 'Workshop', icon: '🏠', key: '1' },
  assembly: { mod: assembly, title: 'Assembly Bench', nav: 'Assembly', icon: '🔧', key: '2' },
  testing: { mod: testing, title: 'Testing', nav: 'Testing', icon: '🖥', key: '3' },
  jobs: { mod: jobs, title: 'Customer Jobs', nav: 'Jobs', icon: '📋', key: '4' },
  store: { mod: store, title: 'Parts Store', nav: 'Store', icon: '🛒', key: '5' },
  business: { mod: business, title: 'Business Overview', nav: 'Business', icon: '📈', key: '6' },
  settings: { mod: settings, title: 'Settings', bare: false },
};

export class App {
  constructor(root, storage) {
    this.root = root;
    this.storage = storage;
    this.settings = loadSettings(storage);
    this.game = null;
    this.screen = 'menu';
    this.params = {};
    this.ui = { bench: 0, storeTab: 'parts', storeCat: 'cpu', jobsTab: 'offers', compare: [], plan: {} };
    this.cleanup = null;
    this.pending = false;
    initOverlay(() => this.settings);
    this.applySettings();
    this.top = h('header.topbar', { hidden: true });
    this.main = h('main.screen', { id: 'main', tabindex: '-1' });
    root.append(this.top, this.main);
    document.addEventListener('keydown', e => this.hotkey(e));
    window.addEventListener('pagehide', () => { if (this.game) this.game.save(); });
  }

  hasSave() { return hasSave(this.storage); }

  applySettings() {
    const st = this.settings;
    document.documentElement.style.fontSize = `${st.textSize}%`;
    document.body.classList.toggle('reduced-motion', st.reducedMotion);
    document.body.classList.toggle('high-contrast', st.highContrast);
    document.body.classList.toggle('colorblind', st.colorblind);
    configureSound(st.sound, st.volume);
  }

  setSetting(k, v) {
    this.settings[k] = v;
    saveSettings(this.storage, this.settings);
    this.applySettings();
    if (this.game) this.game.autosave = this.settings.autosave;
  }

  start(game) {
    if (this.unsub) this.unsub();
    this.game = game;
    game.storage = this.storage;
    game.autosave = this.settings.autosave;
    this.ui.bench = 0;
    this.unsub = game.on((type, data) => this.onGame(type, data));
    game.save();
    this.go('workshop');
  }

  continueGame() {
    const r = loadGame(this.storage);
    if (r.error) toast(r.error, 'bad', 7000);
    if (!r.state) return false;
    this.start(new Game(r.state));
    return true;
  }

  onGame(type, data) {
    if (type === 'change') this.schedule();
    if (type === 'levelup') { play('level'); toast(`Workshop level ${data}! New customers and upgrades unlocked.`, 'good', 6000); }
    if (type === 'milestone') { play('cash'); toast(`Milestone: ${data.label} — ${data.desc}`, 'good', 6000); }
    if (type === 'day') this.daySummary(data);
  }

  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this.render(true); });
  }

  go(screen, params = {}) {
    if (!SCREENS[screen]) screen = 'workshop';
    if (!SCREENS[screen].bare && !this.game) screen = 'menu';
    if (screen === 'settings') this.params = { back: this.screen, ...params };
    else this.params = params;
    this.screen = screen;
    closeAll();
    this.render(false);
    this.main.scrollTop = 0;
    window.scrollTo(0, 0);
    play('page');
  }

  render(refresh) {
    const sc = SCREENS[this.screen];
    const y = window.scrollY;
    const keep = refresh && sc.mod.keepScroll !== false;
    if (this.cleanup) { try { this.cleanup(); } catch { /* ignore */ } this.cleanup = null; }
    this.top.hidden = !!sc.bare;
    document.body.dataset.screen = this.screen;
    if (!sc.bare) this.renderTop();
    const scrollers = refresh ? [...this.main.querySelectorAll('[data-keep-scroll]')].map(el => [el.dataset.keepScroll, el.scrollTop]) : [];
    clear(this.main);
    try {
      this.cleanup = sc.mod.render(this, this.main, this.params, refresh) || null;
    } catch (err) {
      console.error(err);
      clear(this.main);
      this.main.append(h('div.panel.error-panel', h('h2', 'Something went wrong on this screen'), h('p', String(err && err.message || err)), button('Back to the workshop', () => this.go('workshop'), { cls: 'primary' })));
    }
    for (const [k, t] of scrollers) { const el = this.main.querySelector(`[data-keep-scroll="${k}"]`); if (el) el.scrollTop = t; }
    if (keep) window.scrollTo(0, y);
    document.title = `${sc.title} — Silicon Dreams`;
  }

  renderTop() {
    const g = this.game, s = g.state;
    clear(this.top);
    const left = DAY_END - s.minute;
    const pct = Math.round((s.minute - DAY_START) / (DAY_END - DAY_START) * 100);
    const lvlNext = nextLevelXp(s.level);
    const lvlPct = lvlNext ? Math.round((s.xp - LEVELS[s.level - 1]) / (lvlNext - LEVELS[s.level - 1]) * 100) : 100;
    const nav = h('nav.mainnav', { 'aria-label': 'Screens' }, Object.entries(SCREENS).filter(([, v]) => v.nav).map(([id, v]) =>
      h('button.navbtn', { type: 'button', class: id === this.screen ? 'active' : '', 'aria-current': id === this.screen ? 'page' : null, 'data-tip': `${v.title} (${v.key})`, on: { click: () => this.go(id) } }, h('span.navicon', { 'aria-hidden': 'true' }, v.icon), h('span.navlabel', v.nav), id === 'jobs' ? badge(Object.values(s.jobs).filter(j => j.status === 'offered').length) : null)));
    this.top.append(
      h('button.logo', { type: 'button', 'aria-label': 'Main menu', 'data-tip': 'Main menu', on: { click: () => this.go('menu') } }, h('span.logo-chip', { 'aria-hidden': 'true' }), h('span.logo-text', s.shopName)),
      nav,
      h('div.stats',
        h('div.stat.clock', { 'data-tip': `Day ${s.day}. The shop closes at ${clock(DAY_END)}; ${left} minutes of work left today.` }, h('span.stat-k', `Day ${s.day}`), h('span.stat-v', clock(s.minute)), h('span.timebar', h('span', { style: { width: `${pct}%` } }))),
        h('div.stat.money', { class: s.money < 0 ? 'neg' : '', 'data-tip': 'Cash balance' }, h('span.stat-k', 'Cash'), h('span.stat-v', money(s.money))),
        h('div.stat.rep', { 'data-tip': `Reputation ${Math.round(s.reputation)}/100. Good, fair, on-time work raises it; it unlocks better customers.` }, h('span.stat-k', 'Reputation'), h('span.stat-v', `★ ${Math.round(s.reputation)}`)),
        h('div.stat.level', { 'data-tip': lvlNext ? `Workshop level ${s.level}: ${s.xp} / ${lvlNext} XP` : `Workshop level ${s.level} (max)` }, h('span.stat-k', `Level ${s.level}`), h('span.xpbar', h('span', { style: { width: `${lvlPct}%` } })))),
      h('div.top-actions',
        button('End day', () => this.endDay(), { cls: 'end-day', tip: 'Close the shop for the night. Orders arrive, deadlines move, new customers come in.' }),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Settings', 'data-tip': 'Settings', on: { click: () => this.go('settings') } }, '⚙')));
  }

  async endDay() {
    const s = this.game.state;
    const due = Object.values(s.jobs).filter(j => j.status === 'active' && s.day >= j.deadline);
    if (due.length && this.settings.confirm) {
      const { confirmBox } = await import('./overlay.js');
      const ok = await confirmBox('End the day?', `${plural(due.length, 'job')} ${due.length === 1 ? 'is' : 'are'} due today or overdue: ${due.map(j => j.title).join(', ')}. ${due.some(j => s.day >= j.deadline + 1) ? 'Overdue jobs fail tonight.' : 'Tomorrow they will be late.'}`, { ok: 'End day' });
      if (!ok) return;
    }
    this.game.endDay();
  }

  daySummary(sum) {
    const s = this.game.state;
    play('page');
    modal({
      title: `End of day ${sum.day}`,
      body: h('div.day-summary',
        h('div.sum-row', h('div.sum-card', h('span', 'Earned today'), h('strong.pos', money(sum.income))), h('div.sum-card', h('span', 'Spent today'), h('strong.neg', money(sum.spent))), h('div.sum-card', h('span', 'Balance'), h('strong', money(s.money)))),
        h('h3', `Morning of day ${s.day}`),
        sum.events.length ? h('ul.events', sum.events.map(e => h(`li.${e.level}`, e.text))) : h('p.muted', 'A quiet night.')),
      actions: [{ label: 'Open the shop', cls: 'primary' }],
    });
  }

  hotkey(e) {
    if (e.target.closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('.modal-wrap') || document.body.classList.contains('dragging')) return;
    if (!this.game || SCREENS[this.screen].bare) return;
    const hit = Object.entries(SCREENS).find(([, v]) => v.key === e.key);
    if (hit) { e.preventDefault(); this.go(hit[0]); }
  }
}

const badge = n => (n ? h('span.badge', { 'aria-label': `${n} new` }, String(n)) : null);

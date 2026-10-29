// The application shell: owns the shared services (settings, statistics, audio, navigation),
// swaps screens with a transition and routes keyboard input to the topmost dialog or screen.

import { Store } from './core/storage.js';
import { Settings } from './core/settings.js';
import { Stats } from './core/stats.js';
import { Router } from './core/router.js';
import { UiAudio } from './core/audio.js';
import { Assets } from './core/assets.js';
import { topDialog, closeAllDialogs, confirmPrompt, openDialog } from './ui/components.js';
import * as menu from './screens/menu.js';
import * as library from './screens/library.js';
import * as game from './screens/game.js';
import * as stats from './screens/stats.js';
import * as settings from './screens/settings.js';
import * as rules from './screens/rules.js';
import * as workshop from './screens/workshop.js';

const SCREENS = { menu, library, game, stats, settings, rules, workshop };
const DURATIONS = { slow: 380, normal: 220, fast: 120 };

export class App {
  constructor({ root, store = new Store(), router = new Router(), assets = new Assets() }) {
    this.root = root;
    this.assets = assets;
    this.store = store;
    this.settings = new Settings(store);
    this.stats = new Stats(store);
    this.audio = new UiAudio(this.settings);
    this.router = router;
    this.view = root.querySelector('#view');
    this.current = null;

    this.applySettings();
    this.settings.on(() => this.applySettings());
    router.on(route => this.show(route));
    document.addEventListener('keydown', e => this.onKey(e));
    document.addEventListener('click', e => { if (e.target.closest('.btn, .game-card-open, .tab')) this.audio.play('click'); });
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
    this.show(router.current, { initial: true });
  }

  // ---- services offered to screens ----

  go(screen, param) { this.router.go(screen, param); }
  confirm(opts) { return confirmPrompt({ ...opts, audio: this.audio }); }
  dialogOpen() { return !!topDialog(); }
  dialog(opts) { return openDialog({ ...opts, audio: this.audio }); }
  get duration() { return this.settings.get('reduceMotion') ? 0 : DURATIONS[this.settings.get('animationSpeed')]; }

  applySettings() {
    const r = document.documentElement;
    r.style.setProperty('--dur', `${this.duration}ms`);
    r.dataset.reduceMotion = String(this.settings.get('reduceMotion'));
    r.dataset.felt = this.settings.get('tableFelt');
    const bg = this.assets.url('bg.library'), chessBg = this.assets.url('bg.chess'), divider = this.assets.url('ui.divider');
    if (bg) { r.style.setProperty('--bg-image', `url("${bg}")`); r.dataset.bg = ''; }
    if (chessBg) r.style.setProperty('--chess-bg', `url("${chessBg}")`);
    if (divider) r.style.setProperty('--divider', `url("${divider}")`);
  }

  // ---- screens ----

  show(route, { initial = false } = {}) {
    const mod = SCREENS[route.screen];
    closeAllDialogs();
    const old = this.current;
    if (old) old.destroy?.();
    const screen = mod.render(this, route.param);
    screen.route = route;
    this.current = screen;
    document.title = screen.title ? `${screen.title} · Checkmate Club` : 'Checkmate Club';
    screen.el.classList.add('screen', `screen-${route.screen}`);

    const dur = initial ? 0 : this.duration;
    if (old) {
      old.el.classList.add('screen-leave');
      old.el.setAttribute('aria-hidden', 'true');
      old.el.inert = true;
      if (dur) setTimeout(() => old.el.remove(), dur); else old.el.remove();
    }
    if (dur) {
      screen.el.classList.add('screen-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => screen.el.classList.remove('screen-enter')));
    }
    this.view.append(screen.el);
    window.scrollTo(0, 0);
    const focusTarget = screen.el.querySelector('[data-autofocus]') || screen.el.querySelector('h1');
    if (focusTarget) {
      if (!focusTarget.hasAttribute('tabindex') && focusTarget.tagName === 'H1') focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
    }
    screen.enter?.();
  }

  onKey(e) {
    const dlg = topDialog();
    if (dlg) { dlg.onKey(e); return; }
    if (this.current?.onKey?.(e)) return;
    if (e.key === 'Escape' && this.current?.route.screen !== 'menu') {
      e.preventDefault();
      this.current.el.querySelector('[data-back]')?.click();
    }
  }
}

// WORLD DOMINION — UI prototype entry point.
// Wires the map, the minimal HUD (top bar, 5-button dock, zoom), the drawers, toasts and the event window
// to a thin game state. The full simulation is a later checkpoint; see world-dominion/README.md.
import { h, $, clear } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { WorldMap } from './ui/map.js';
import { Drawer, openModal, toast, tooltip, closeTop, modalOpen } from './ui/overlays.js';
import { countryPanel, toolPanel, TOOLS, swatchColor } from './ui/panels.js';
import { COUNTRIES } from './data/world.js';
import { FEATURED } from './data/nations.js';
import { nation, playable, newGame, relation, budget, monthTick, applyEffects, serialize, deserialize, SAVE_KEY, opinion } from './core/state.js';
import { protestEvent, describeEffects, SAMPLE_EVENT_DAY } from './core/events.js';
import { money, people, troops, dateLabel, dateOf, clamp } from './core/format.js';

const SPEED_MS = { 1: 900, 2: 350, 3: 110 };          // real milliseconds per game day
const store = {
  get() { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(SAVE_KEY, v); return true; } catch { return false; } },
};

const g = {
  state: null, speed: 1, paused: true, lastSaved: null,
  canPlay: playable,
  drawerKeyIs: (side, key) => (side === 'left' ? left : right).isOpen && (side === 'left' ? left : right).key === key,
};
window.WD = g; // handy for testing in the console
const picker = { el: null }; // the start-screen panel while choosing a nation

// ——— Map ———
const tip = tooltip();
const map = new WorldMap($('#map'), {
  onSelect: (id) => g.select(id),
  onBackground: () => right.close(),
  onHover: (id, x, y) => {
    if (!id) return tip.hide();
    const n = nation(id);
    const extra = g.state ? relation(g.state, id).label : n.territory ? 'Territory' : people(n.pop) + ' people';
    tip.show([h('span.wd-swatch', { style: { background: swatchColor(g, id) } }), n.name, h('small', extra)], x, y);
  },
});

// ——— Drawers ———
const left = new Drawer('left', { onClose: () => { syncDock(); syncInsets(); } });
const right = new Drawer('right', { onClose: () => { map.setSelected(null); syncInsets(); } });
function syncInsets() {
  const small = innerWidth <= 820, edge = 12, w = 372 + edge * 2;
  document.body.classList.toggle('right-open', right.isOpen && !small);
  map.setInsets({
    left: small ? 0 : (document.body.classList.contains('picking') ? 392 + edge * 2 : left.isOpen ? w : 0),
    right: !small && right.isOpen ? w : 0,
    top: small ? (picker.el?.isConnected ? edge : 110) : 76,
    bottom: small ? (picker.el?.isConnected ? picker.el.offsetHeight + edge * 2 : left.isOpen || right.isOpen ? innerHeight * 0.62 + 84 : 84) : 88,
  });
}
addEventListener('resize', syncInsets);

g.select = (id, { fly = false } = {}) => {
  if (!nation(id)) return;
  map.setSelected(id);
  right.show(countryPanel(g, id));
  if (innerWidth <= 820) left.close();
  syncInsets();
  if (fly) map.flyTo(id);
};
g.openTool = (key) => {
  if (!g.state) return;
  if (left.isOpen && left.key === key) { left.close(); return; }
  left.show(toolPanel(g, key));
  if (innerWidth <= 820) right.close();
  syncDock(); syncInsets();
};
function refreshPanels() {
  if (!g.state) return;
  const sliding = document.activeElement?.type === 'range';
  if (left.isOpen && !sliding) left.show(toolPanel(g, left.key));
  if (right.isOpen && right.key?.startsWith('country:')) right.show(countryPanel(g, right.key.slice(8)));
}

// ——— HUD ———
const hud = {};
function buildHud() {
  hud.flagName = h('b'); hud.gov = h('small');
  hud.nation = h('button.tb-group.tb-nation.wd-surface', { type: 'button', title: 'Your nation (C)', on: { click: () => g.select(g.state.player, { fly: true }) } },
    h('span.tb-flag', icon('crown')), h('span.tb-name', hud.flagName, hud.gov));
  hud.playBtn = h('button.wd-icon-btn', { type: 'button', on: { click: () => g.togglePause() } });
  hud.date = h('span.tb-date');
  hud.seg = h('div.wd-seg', { role: 'group', 'aria-label': 'Game speed' },
    [1, 2, 3].map((s) => h('button', { type: 'button', title: `Speed ${s} (${s})`, 'aria-label': `Speed ${s}`, on: { click: () => g.setSpeed(s) } }, '›'.repeat(s))));
  const time = h('div.tb-group.tb-time.wd-surface', hud.playBtn, hud.date, hud.seg);
  const st = (ic, label, cls = '') => { const v = h('span.wd-stat-v', icon(ic), h('span')); const l = h('span.wd-stat-l', label);
    return [h(`div.wd-stat${cls}`, l, v), v.lastChild, l]; };
  let tre; [tre, hud.treasury, hud.treasuryL] = st('coins', 'Treasury');
  const [stab, stabV] = st('stability', 'Stability'); hud.stability = stabV;
  const [mil, milV] = st('military', 'Military', '.hide-sm'); hud.military = milV;
  hud.balance = h('span.wd-stat-d'); hud.treasuryL.append(hud.balance);
  const stats = h('div.tb-group.tb-stats.wd-surface', tre, stab, mil);
  const top = h('header.topbar', hud.nation, time, stats);

  hud.dock = h('nav.dock.wd-surface', { 'aria-label': 'Main actions' }, TOOLS.map((t) =>
    h('button.wd-dock-btn', { type: 'button', 'data-key': t.key, title: `${t.label} (${t.hotkey})`, on: { click: () => g.openTool(t.key) } }, icon(t.ic), t.label)));
  hud.pill = h('div.paused-pill', { hidden: true }, 'PAUSED');
  const zoom = h('div.zoom.wd-surface',
    h('button.wd-icon-btn', { type: 'button', title: 'Zoom in (+)', 'aria-label': 'Zoom in', on: { click: () => map.zoomBy(1.6) } }, icon('plus')),
    h('button.wd-icon-btn', { type: 'button', title: 'Zoom out (−)', 'aria-label': 'Zoom out', on: { click: () => map.zoomBy(1 / 1.6) } }, icon('minus')),
    h('button.wd-icon-btn', { type: 'button', title: 'Whole world (0)', 'aria-label': 'Show the whole world', on: { click: () => map.home() } }, icon('locate')));
  document.body.append(top, hud.pill, hud.dock, zoom);
}
function syncDock() { for (const b of hud.dock.children) b.classList.toggle('on', left.isOpen && left.key === b.dataset.key); }
function renderHud() {
  const s = g.state; if (!s) return;
  const n = nation(s.player), b = budget(s);
  hud.flagName.textContent = n.name; hud.gov.textContent = n.govLabel;
  hud.date.textContent = dateLabel(s.day); hud.date.classList.toggle('paused', g.paused);
  clear(hud.playBtn).append(icon(g.paused ? 'play' : 'pause'));
  hud.playBtn.setAttribute('aria-label', g.paused ? 'Resume time' : 'Pause time');
  hud.playBtn.title = (g.paused ? 'Resume' : 'Pause') + ' (Space)';
  hud.playBtn.classList.toggle('on', g.paused);
  [...hud.seg.children].forEach((btn, i) => btn.classList.toggle('on', !g.paused && g.speed === i + 1));
  hud.treasury.textContent = money(s.treasury);
  hud.balance.textContent = money(b.balance, { sign: true }) + '/mo';
  hud.balance.className = 'wd-stat-d ' + (b.balance >= 0 ? 'up' : 'down');
  hud.stability.textContent = Math.round(s.stability) + '%';
  hud.stability.parentElement.style.color = s.stability >= 60 ? '' : s.stability >= 35 ? 'var(--warn)' : 'var(--bad)';
  hud.military.textContent = troops(s.army);
  hud.pill.hidden = !g.paused || modalOpen();
}

// ——— Time ———
let acc = 0, last = performance.now();
function loop(now) {
  const dt = Math.min(250, now - last); last = now;
  if (g.state && !g.paused && !modalOpen()) {
    acc += dt;
    const per = SPEED_MS[g.speed];
    while (acc >= per && !g.paused && !modalOpen()) { acc -= per; advanceDay(); }
  }
  requestAnimationFrame(loop);
}
function advanceDay() {
  const s = g.state;
  s.day++;
  if (dateOf(s.day).getUTCDate() === 1) {
    const b = monthTick(s);
    toast(`Monthly budget: <b>${money(b.balance, { sign: true })}</b> · treasury ${money(s.treasury)}`, { tone: b.balance >= 0 ? 'good' : 'bad', icon: 'coins', ms: 2600 });
    g.save(false);
    refreshPanels();
  }
  if (s.day >= SAMPLE_EVENT_DAY && !s.flags['sample-protests']) { s.flags['sample-protests'] = true; fireEvent(protestEvent(s)); }
  renderHud();
}
g.togglePause = () => { g.paused = !g.paused; acc = 0; renderHud(); };
g.setSpeed = (n) => { g.speed = n; g.paused = false; renderHud(); };

// ——— Events ———
function fireEvent(ev) {
  if (ev.severity !== 'major') { toast(ev.title, { icon: ev.icon }); return; }
  const wasPaused = g.paused; g.paused = true; renderHud();
  openModal({
    tone: ev.tone, icon: ev.icon, dismissible: false,
    kicker: [h('span.wd-tag.warn', ev.kicker), h('span.wd-tag.plain', dateLabel(g.state.day))],
    title: ev.title, body: ev.body,
    choices: ev.choices.map((c) => ({
      label: c.label,
      effects: h('span.wd-effects', describeEffects(c.effects, money).map((e) => h(`span.wd-fx.${e.dir}`, e.text))),
      onPick: () => {
        applyEffects(g.state, c.effects);
        toast(c.outcome, { icon: 'check', tone: 'gold' });
        g.paused = wasPaused; renderHud(); refreshPanels(); g.save(false);
      },
    })),
  });
  renderHud();
}
g.triggerSampleEvent = () => { left.close(); fireEvent(protestEvent(g.state)); };

// ——— Actions ———
g.envoyCost = () => Math.max(0.05, Math.round(nation(g.state.player).gdp * 0.0008 * 100) / 100);
g.improveRelations = (id) => {
  const s = g.state, cost = g.envoyCost();
  if (s.treasury < cost) { toast('Not enough money in the treasury.', { tone: 'bad', icon: 'coins' }); return; }
  const before = opinion(s, id);
  if (before >= 100) { toast(`${nation(id).name} already adores you.`, { icon: 'handshake' }); return; }
  s.treasury = Math.round((s.treasury - cost) * 100) / 100;
  s.opinions[id] = clamp(before + 8, -100, 100);
  toast(`Envoy sent to <b>${nation(id).name}</b>. Opinion +8.`, { tone: 'good', icon: 'handshake' });
  renderHud(); refreshPanels();
};
g.setTax = (v, redraw) => { g.state.taxRate = v; renderHud(); if (redraw) refreshPanels(); };
g.confirmWar = (id) => {
  const n = nation(id);
  openModal({
    tone: 'bad', icon: 'swords', kicker: [h('span.wd-tag.bad', 'War')],
    title: `Declare war on ${n.name}?`,
    body: 'Armies, fronts and occupation arrive with the military checkpoint. For now this shows how the war confirmation will look.',
    choices: [
      { label: 'Not now', onPick: () => {} },
      { label: 'Declare war', effects: h('span.wd-effects', h('span.wd-fx.neutral', 'Preview only — nothing changes yet')), onPick: () => toast(`War with <b>${n.name}</b> isn’t simulated yet.`, { tone: 'bad', icon: 'swords' }) },
    ],
  });
};
g.savedLabel = () => (g.lastSaved != null ? `Last saved ${dateLabel(g.lastSaved)}` : 'Saves automatically every month');
g.save = (announce) => {
  if (!g.state) return;
  const ok = store.set(serialize(g.state));
  if (ok) g.lastSaved = g.state.day;
  if (announce) toast(ok ? 'Game saved.' : 'Couldn’t save — this browser is blocking storage.', { tone: ok ? 'good' : 'bad', icon: 'save' });
  if (announce && left.isOpen && left.key === 'more') refreshPanels();
};
g.confirmNewGame = () => openModal({
  tone: 'info', icon: 'refresh', title: 'Start a new game?', body: 'You’ll choose a nation again. Your current game will be replaced.',
  choices: [{ label: 'Keep playing', onPick: () => {} }, { label: 'Start a new game', onPick: () => { store.set(''); location.reload(); } }],
});
g.showHelp = () => openModal({
  tone: 'info', icon: 'book', title: 'How to play',
  body: h('span', 'Click any country to see it and act on it. The buttons at the bottom open your military, building, diplomacy and economy tools. Time runs on its own: pause with the button next to the date, or press Space. Important events stop the clock and ask you to decide. There is no single way to win — conquer, build, trade or simply rule.'),
  choices: [{ label: 'Got it', onPick: () => {} }],
});
g.showKeys = () => openModal({
  tone: 'info', icon: 'keyboard', title: 'Keyboard shortcuts', body: h('span', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', alignItems: 'center' } },
    [['Space', 'Pause / resume'], ['1 2 3', 'Game speed'], ['M B D E O', 'Military, Build, Diplomacy, Economy, More'], ['C', 'Go to your nation'], ['+ −', 'Zoom'], ['0', 'Whole world'], ['Esc', 'Close the top panel']]
      .flatMap(([k, v]) => [h('span', k.split(' ').map((x) => h('span.wd-kbd', { style: { marginRight: '3px' } }, x))), h('span', v)])),
  choices: [{ label: 'Close', onPick: () => {} }],
});

// ——— Start screen: pick a nation on the map ———
function showPicker(saved) {
  document.body.classList.add('picking');
  const list = h('div.picker-list');
  const all = COUNTRIES.filter((c) => playable(c.id)).map((c) => nation(c.id));
  const renderList = (q = '') => {
    q = q.trim().toLowerCase();
    clear(list).append(...all.filter((n) => !q || n.name.toLowerCase().includes(q)).slice(0, q ? 40 : 200)
      .map((n) => h('button', { type: 'button', on: { click: () => g.select(n.id, { fly: true }) } },
        h('span.wd-swatch', { style: { background: swatchColor(g, n.id) } }), n.name, h('small', people(n.pop)))));
    if (!list.children.length) list.append(h('p.wd-note', 'No country by that name.'));
  };
  renderList();
  const input = h('input', { type: 'search', placeholder: 'Search countries', 'aria-label': 'Search countries', on: { input: (e) => renderList(e.target.value) } });
  const savedState = saved && deserialize(saved);
  picker.el = h('section.picker.wd-surface', { 'aria-label': 'Choose your nation' },
    h('div.picker-head', h('h1.brand', 'WORLD', h('br'), h('span', 'DOMINION')),
      h('p', 'Choose a nation to lead. Click any country on the map, or pick one below.')),
    h('div.picker-body',
      savedState ? h('button.wd-btn.primary.lg.block', { type: 'button', on: { click: () => enterGame(savedState, true) } }, icon('play'), `Continue as ${nation(savedState.player).name}`) : '',
      h('section.wd-section', h('h3.wd-section-t', 'Popular starts'), h('div.wd-chips', FEATURED.map((id) =>
        h('button.wd-chip', { type: 'button', on: { click: () => g.select(id, { fly: true }) } }, h('span.wd-swatch', { style: { background: swatchColor(g, id) } }), nation(id).name)))),
      h('section.wd-section', h('h3.wd-section-t', 'All nations'), h('label.search', icon('search'), input), list)),
    h('div.picker-foot', h('a', { href: '../play/public/' }, '← back to the arcade')));
  document.body.append(picker.el);
  syncInsets();
  map.home(false);
}
g.start = (id) => enterGame(newGame(id), false);
function enterGame(state, resumed) {
  g.state = state; g.paused = true; g.speed = 1;
  g.lastSaved = resumed ? state.day : null;
  picker.el?.remove();
  document.body.classList.remove('picking');
  right.close(); left.close();
  if (!hud.dock) buildHud();
  const n = nation(state.player);
  map.setPlayer(state.player, COUNTRIES.filter((c) => nation(c.id)?.owner === state.player).map((c) => c.id));
  syncInsets();
  map.flyTo(state.player, { maxZoom: 4 });
  renderHud();
  if (!resumed) g.save(false);
  toast(resumed ? `Welcome back. <b>${n.name}</b> awaits.` : `You now lead <b>${n.name}</b>. Press <b>▶</b> or Space to start the clock.`, { tone: 'gold', icon: 'crown', ms: 6000 });
}

// ——— Keyboard ———
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select') && e.key !== 'Escape') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') { closeTop(); return; }
  if (e.key === '+' || e.key === '=') { map.zoomBy(1.6); return; }
  if (e.key === '-' || e.key === '_') { map.zoomBy(1 / 1.6); return; }
  if (e.key === '0') { map.home(); return; }
  if (!g.state || modalOpen()) return;
  const k = e.key.toLowerCase();
  if (e.key === ' ') { e.preventDefault(); g.togglePause(); }
  else if (['1', '2', '3'].includes(k)) g.setSpeed(+k);
  else if (k === 'c') g.select(g.state.player, { fly: true });
  else { const t = TOOLS.find((x) => x.hotkey.toLowerCase() === k); if (t) g.openTool(t.key); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && g.state && !g.paused) { g.paused = true; renderHud(); } });

// ——— Boot ———
showPicker(store.get());
requestAnimationFrame(loop);

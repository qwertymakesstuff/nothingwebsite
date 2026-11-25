// WORLD DOMINION — entry point.
// Wires the map (with overlays and regions), the minimal HUD (top bar, 5-button dock, zoom + layers), the
// drawers, toasts and the event window to the simulation. See README.md.
//
// Time: the world only moves through sim.tickMonth(). The real-time clock below merely decides WHEN to call it
// (one month every few seconds at 1×, faster at 2×/5×/10×, or one at a time with "Next month"), so results never
// depend on frame rate or how long a tab was open.
import { h, $, clear } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { WorldMap } from './ui/map.js';
import { Drawer, openModal, toast, tooltip, closeTop, modalOpen, pushLayer, remove as removeLayer } from './ui/overlays.js';
import { countryPanel, toolPanel, TOOLS, swatchColor } from './ui/panels.js';
import { FEATURED } from './data/nations.js';
import { playable, newGame, relation, serialize, deserialize, SAVE_KEY, opinion } from './core/state.js';
import * as sim from './core/sim.js';
import { country, ALL } from './core/db.js';
import { loadRegions } from './core/regions.js';
import { OVERLAYS, overlay as overlayById } from './core/overlays.js';
import { checkEvents, forceEvent, describeEffects } from './core/events.js';
import { money, people, troops, monthLabel, clamp, pct } from './core/format.js';

export const SPEEDS = [1, 2, 5, 10];
const MONTH_MS = 6000;                                  // real time per month at 1×
const store = {
  get() { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } },
  set(v) { try { localStorage.setItem(SAVE_KEY, v); return true; } catch { return false; } },
};

// The start screen shows a freshly initialised world, so its numbers are the same ones a new game starts with.
const preview = { seed: 'preview', month: 0, player: null, nations: sim.initNations(), owners: {}, regionOwners: {} };
const g = {
  state: null, speed: 1, paused: true, lastSaved: null, overlay: 'political',
  canPlay: playable,
  get world() { return g.state || preview; },
  view: (id) => sim.view(g.world, id),
  drawerKeyIs: (side, key) => (side === 'left' ? left : right).isOpen && (side === 'left' ? left : right).key === key,
};
window.WD = g; // handy for testing in the console
g.sim = sim;
const picker = { el: null }; // the start-screen panel while choosing a nation

// ——— Map ———
const tip = tooltip();
const map = new WorldMap($('#map'), {
  loadRegions,
  onSelect: (id, regionId) => g.select(id, { regionId }),
  onBackground: () => right.close(),
  onHover: (id, x, y, region) => {
    if (!id) return tip.hide();
    const c = country(id), ov = overlayById(g.overlay), ctx = { state: g.state, nations: g.world.nations };
    const extra = g.overlay !== 'political' ? ov.describe(c, ctx) : g.state ? relation(g.state, id).label : ov.describe(c, ctx);
    tip.show([h('span.wd-swatch', { style: { background: map.fills.get(id) || swatchColor(g, id) } }),
      region ? h('span', region.name, h('small', { style: { marginLeft: '6px' } }, c.name)) : c.name, h('small', extra)], x, y);
  },
});
window.WD.map = map;

// ——— Overlays (map modes) ———
// Recolours every country from the active overlay (only changed shapes touch the DOM). Runs every month.
g.applyOverlay = () => {
  const ov = overlayById(g.overlay), ctx = { state: g.state, nations: g.world.nations }, fills = new Map();
  for (const c of ALL) fills.set(c.id, ov.fill(c, ctx));
  map.setFills(fills);
  renderLegend(ov.legend(ctx));
};
g.setOverlay = (id) => { g.overlay = overlayById(id).id; g.applyOverlay(); if (layersPop.el) openLayers(); };
const legendEl = h('div.legend.wd-surface', { hidden: true, 'aria-live': 'polite' });
document.body.append(legendEl);
function renderLegend(lg) {
  legendEl.hidden = !lg;
  if (!lg) return;
  clear(legendEl).append(h('div.legend-t', lg.title, lg.note ? h('small', lg.note) : ''),
    h('div.legend-steps', lg.steps.map((s) => h('span', h('i', { style: { background: s.color } }), s.label))));
}
const layersPop = { el: null, layer: null };
function closeLayers() { layersPop.el?.remove(); layersPop.el = null; if (layersPop.layer) removeLayer(layersPop.layer); layersBtn.classList.remove('on'); }
function openLayers() {
  layersPop.el?.remove();
  layersPop.el = h('div.layers-pop.wd-surface', { role: 'dialog', 'aria-label': 'Map mode' },
    h('h3.wd-section-t', 'Map mode'),
    OVERLAYS.map((o) => h('button.layer-opt' + (o.id === g.overlay ? '.on' : ''), { type: 'button', 'aria-pressed': String(o.id === g.overlay), on: { click: () => { g.setOverlay(o.id); closeLayers(); } } },
      h('span.wd-row-ic', icon(o.icon)), h('span.wd-row-main', h('span.wd-row-t', o.label), h('span.wd-row-s', o.hint)), o.id === g.overlay ? icon('check', 'check') : '')));
  document.body.append(layersPop.el);
  layersPop.layer = { close: closeLayers };
  pushLayer(layersPop.layer);
  layersBtn.classList.add('on');
}
const layersBtn = h('button.wd-icon-btn', { type: 'button', title: 'Map mode (L)', 'aria-label': 'Map mode', on: { click: () => (layersPop.el ? closeLayers() : openLayers()) } }, icon('layers'));
document.addEventListener('pointerdown', (e) => { if (layersPop.el && !layersPop.el.contains(e.target) && !layersBtn.contains(e.target)) closeLayers(); });
document.body.append(h('div.zoom.wd-surface',
  layersBtn,
  h('button.wd-icon-btn.zb', { type: 'button', title: 'Zoom in (+)', 'aria-label': 'Zoom in', on: { click: () => map.zoomBy(1.6) } }, icon('plus')),
  h('button.wd-icon-btn.zb', { type: 'button', title: 'Zoom out (−)', 'aria-label': 'Zoom out', on: { click: () => map.zoomBy(1 / 1.6) } }, icon('minus')),
  h('button.wd-icon-btn.zb', { type: 'button', title: 'Whole world (0)', 'aria-label': 'Show the whole world', on: { click: () => map.home() } }, icon('locate'))));

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

g.select = (id, { fly = false, regionId = null } = {}) => {
  if (!country(id)) return;
  map.setSelected(id);
  right.show(countryPanel(g, id, { region: regionId ? map.regionById(id, regionId) : null }));
  if (innerWidth <= 820) left.close();
  syncInsets();
  if (fly) map.flyTo(id);
};
// Zoom to a region chosen from the country panel and flash it once its shapes are on screen.
g.focusRegion = async (countryId, regionId) => {
  const data = await loadRegions(countryId);
  const r = data?.regions.find((x) => x.id === regionId); if (!r) return;
  map.frame(r.box, { maxZoom: 24, minZoom: 3, fill: 0.45 });
  setTimeout(() => map.flashRegion(regionId), 900);
};
g.openTool = (key) => {
  if (!g.state) return;
  if (left.isOpen && left.key === key) { left.close(); return; }
  left.show(toolPanel(g, key));
  if (innerWidth <= 820) right.close();
  syncDock(); syncInsets();
};
// Live figures in open panels and the HUD (cheap; no rebuild, sliders keep working).
function refreshLive() { renderHud(); left.update?.(); right.update?.(); }
// Full rebuild of open panels (for structural changes, e.g. after an event).
function rebuildPanels() {
  if (!g.state) return;
  if (left.isOpen) left.show(toolPanel(g, left.key));
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
  hud.progress = h('i');
  hud.next = h('button.wd-icon-btn', { type: 'button', title: 'Next month (N)', 'aria-label': 'Advance one month', on: { click: () => g.step() } }, icon('next'));
  hud.seg = h('div.wd-seg', { role: 'group', 'aria-label': 'Game speed' },
    SPEEDS.map((s, i) => h('button', { type: 'button', title: `Speed ${s}× (${i + 1})`, 'aria-label': `Speed ${s} times`, on: { click: () => g.setSpeed(s) } }, s + '×')));
  const time = h('div.tb-group.tb-time.wd-surface', hud.playBtn, h('span.tb-datewrap', hud.date, h('span.tb-progress', hud.progress)), hud.next, hud.seg);
  const st = (ic, label, cls = '') => { const v = h('span.wd-stat-v', icon(ic), h('span')); const l = h('span.wd-stat-l', label);
    return [h(`div.wd-stat${cls}`, l, v), v.lastChild, l]; };
  let tre; [tre, hud.treasury, hud.treasuryL] = st('coins', 'Treasury');
  const [stab, stabV] = st('stability', 'Stability'); hud.stability = stabV;
  const [mil, milV] = st('military', 'Military', '.hide-sm'); hud.military = milV;
  hud.balance = h('span.wd-stat-d'); hud.treasuryL.append(hud.balance);
  hud.tre = tre; hud.stab = stab; hud.mil = mil;
  tre.addEventListener('click', () => g.openTool('economy')); stab.addEventListener('click', () => g.select(g.state.player, { fly: true })); mil.addEventListener('click', () => g.openTool('military'));
  const stats = h('div.tb-group.tb-stats.wd-surface', tre, stab, mil);
  const top = h('header.topbar', hud.nation, time, stats);

  hud.dock = h('nav.dock.wd-surface', { 'aria-label': 'Main actions' }, TOOLS.map((t) =>
    h('button.wd-dock-btn', { type: 'button', 'data-key': t.key, title: `${t.label} (${t.hotkey})`, on: { click: () => g.openTool(t.key) } }, icon(t.ic), t.label)));
  hud.pill = h('div.paused-pill', { hidden: true }, 'PAUSED');
  document.body.append(top, hud.pill, hud.dock);
}
function syncDock() { for (const b of hud.dock.children) b.classList.toggle('on', left.isOpen && left.key === b.dataset.key); }
function renderHud() {
  const s = g.state; if (!s || !hud.dock) return;
  const c = country(s.player), v = g.view(s.player), b = v.budget;
  hud.flagName.textContent = c.name; hud.gov.textContent = c.government.label;
  hud.date.textContent = monthLabel(s.month); hud.date.classList.toggle('paused', g.paused);
  clear(hud.playBtn).append(icon(g.paused ? 'play' : 'pause'));
  hud.playBtn.setAttribute('aria-label', g.paused ? 'Resume time' : 'Pause time');
  hud.playBtn.title = (g.paused ? 'Resume' : 'Pause') + ' (Space)';
  hud.playBtn.classList.toggle('on', g.paused);
  [...hud.seg.children].forEach((btn, i) => btn.classList.toggle('on', !g.paused && g.speed === SPEEDS[i]));
  hud.treasury.textContent = v.treasury >= 0 ? money(v.treasury) : money(v.treasury);
  hud.treasury.style.color = v.treasury < 0 ? 'var(--bad)' : '';
  hud.balance.textContent = money(b.monthly, { sign: true }) + '/mo';
  hud.balance.className = 'wd-stat-d ' + (b.monthly >= 0 ? 'up' : 'down');
  hud.stability.textContent = Math.round(v.stability) + '%';
  hud.stability.parentElement.style.color = v.stability >= 60 ? '' : v.stability >= 35 ? 'var(--warn)' : 'var(--bad)';
  hud.military.textContent = troops(v.military.troops);
  // tooltips carry the detail, so the bar itself stays small
  hud.tre.title = `Income ${money(b.incomeTotal / 12)}/mo · expenses ${money(b.expenseTotal / 12)}/mo · GDP ${money(v.gdp)} (${pct(v.growth, { sign: true })}). Click for the economy.`;
  hud.stab.title = `Heading for ${Math.round(v.stabilityTarget)}%. ` + v.stabilityFactors.slice(0, 4).map((f) => `${f.label} ${f.value > 0 ? '+' : ''}${f.value}`).join(' · ');
  hud.mil.title = `Strength ${v.military.strength} (${v.military.tier}) · ${troops(v.military.reserves)} reserves · readiness ${Math.round(v.military.readiness * 100)}%. Click for the military.`;
  hud.pill.hidden = !g.paused || modalOpen();
}

// ——— Time ———
let acc = 0, last = performance.now();
function loop(now) {
  const dt = Math.min(250, now - last); last = now;
  if (g.state && !g.paused && !modalOpen()) {
    acc += dt * g.speed;
    if (acc >= MONTH_MS) { acc = 0; g.advance(); }      // at most one month per frame: no catch-up bursts
  }
  if (hud.progress) hud.progress.style.width = (g.paused ? 0 : Math.min(100, (acc / MONTH_MS) * 100)) + '%';
  requestAnimationFrame(loop);
}
// One month of simulation, then everything that reacts to it.
g.advance = () => {
  const s = g.state;
  const change = sim.tickMonth(s);
  const events = checkEvents(s, change);
  if (g.speed <= 2 || g.paused) {
    const d = change.after.treasury - change.before.treasury;
    toast(`${monthLabel(s.month - 1)}: <b>${money(d, { sign: true })}</b> · GDP ${pct(change.after.growth, { sign: true })} · stability ${Math.round(change.after.stability)}%`, { tone: d >= 0 ? 'good' : 'bad', icon: 'coins', ms: 2600 });
  }
  for (const ev of events) ev.severity === 'major' ? fireEvent(ev) : toast(ev.message, { tone: ev.tone, icon: ev.icon, ms: 5000 });
  g.applyOverlay();
  refreshLive();
  g.save(false);
  return events;
};
g.step = () => { g.paused = true; acc = 0; g.advance(); renderHud(); };
g.togglePause = () => { g.paused = !g.paused; acc = 0; renderHud(); };
g.setSpeed = (n) => { g.speed = n; g.paused = false; renderHud(); };

// ——— Events ———
function fireEvent(ev) {
  if (ev.severity !== 'major') { toast(ev.message || ev.title, { icon: ev.icon }); return; }
  const wasPaused = g.paused; g.paused = true; renderHud();
  openModal({
    tone: ev.tone, icon: ev.icon, dismissible: false,
    kicker: [h('span.wd-tag.' + (ev.tone || 'warn'), ev.kicker), h('span.wd-tag.plain', monthLabel(g.state.month))],
    title: ev.title, body: ev.body,
    choices: ev.choices.map((c) => ({
      label: c.label,
      effects: h('span.wd-effects', describeEffects(c.effects).map((e) => h(`span.wd-fx.${e.dir}`, e.text))),
      onPick: () => {
        sim.applyEffects(g.state, g.state.player, c.effects);
        toast(c.outcome, { icon: 'check', tone: 'gold' });
        g.paused = wasPaused; rebuildPanels(); refreshLive(); g.save(false);
      },
    })),
  });
  renderHud();
}
g.triggerSampleEvent = () => { left.close(); fireEvent(forceEvent(g.state, 'protests')); };

// ——— Actions (all go through the simulation) ———
g.setPolicy = (key, v) => { sim.setPolicy(g.state, g.state.player, key, v); refreshLive(); };
g.envoyCost = () => Math.max(0.05, Math.round(g.state.nations[g.state.player].gdp * 0.0008 * 100) / 100);
g.improveRelations = (id) => {
  const s = g.state, n = s.nations[s.player], cost = g.envoyCost();
  if (n.treasury < cost) { toast('Not enough money in the treasury.', { tone: 'bad', icon: 'coins' }); return; }
  const before = opinion(s, id);
  if (before >= 100) { toast(`${country(id).name} already adores you.`, { icon: 'handshake' }); return; }
  n.treasury -= cost;
  s.opinions[id] = clamp(before + 8, -100, 100);
  toast(`Envoy sent to <b>${country(id).name}</b>. Opinion +8.`, { tone: 'good', icon: 'handshake' });
  rebuildPanels(); renderHud();
};
g.confirmWar = (id) => {
  const n = country(id);
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
g.savedLabel = () => (g.lastSaved != null ? `Last saved ${monthLabel(g.lastSaved)}` : 'Saves automatically every month');
g.save = (announce) => {
  if (!g.state) return;
  const ok = store.set(serialize(g.state));
  if (ok) g.lastSaved = g.state.month;
  if (announce) toast(ok ? 'Game saved.' : 'Couldn’t save — this browser is blocking storage.', { tone: ok ? 'good' : 'bad', icon: 'save' });
  if (announce && left.isOpen && left.key === 'more') rebuildPanels();
};
g.confirmNewGame = () => openModal({
  tone: 'info', icon: 'refresh', title: 'Start a new game?', body: 'You’ll choose a nation again. Your current game will be replaced.',
  choices: [{ label: 'Keep playing', onPick: () => {} }, { label: 'Start a new game', onPick: () => { store.set(''); location.reload(); } }],
});
g.showHelp = () => openModal({
  tone: 'info', icon: 'book', title: 'How to play',
  body: h('span', 'Click any country to see it and act on it. Time moves a month at a time: press play, pick a speed, or step one month with the next-month button. Every country grows, taxes, spends and recruits by the same rules. Set your taxes and development in Economy, and your army’s budget and recruitment in Military. Watch stability: debt, high taxes and a weak economy erode it, and protests follow. There is no single way to win.'),
  choices: [{ label: 'Got it', onPick: () => {} }],
});
g.showKeys = () => openModal({
  tone: 'info', icon: 'keyboard', title: 'Keyboard shortcuts', body: h('span', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 14px', alignItems: 'center' } },
    [['Space', 'Pause / resume'], ['N', 'Next month'], ['1 2 3 4', 'Speed 1×, 2×, 5×, 10×'], ['L', 'Map mode'], ['M B D E O', 'Military, Build, Diplomacy, Economy, More'], ['C', 'Go to your nation'], ['+ −', 'Zoom'], ['0', 'Whole world'], ['Esc', 'Close the top panel']]
      .flatMap(([k, v]) => [h('span', k.split(' ').map((x) => h('span.wd-kbd', { style: { marginRight: '3px' } }, x))), h('span', v)])),
  choices: [{ label: 'Close', onPick: () => {} }],
});

// ——— Start screen: pick a nation on the map ———
function showPicker(saved) {
  document.body.classList.add('picking');
  const list = h('div.picker-list');
  const all = ALL.filter((c) => playable(c.id));
  const renderList = (q = '') => {
    q = q.trim().toLowerCase();
    clear(list).append(...all.filter((n) => !q || n.name.toLowerCase().includes(q)).slice(0, q ? 40 : 200)
      .map((n) => h('button', { type: 'button', on: { click: () => g.select(n.id, { fly: true }) } },
        h('span.wd-swatch', { style: { background: swatchColor(g, n.id) } }), n.name, h('small', people(n.population)))));
    if (!list.children.length) list.append(h('p.wd-note', 'No country by that name.'));
  };
  renderList();
  const input = h('input', { type: 'search', placeholder: 'Search countries', 'aria-label': 'Search countries', on: { input: (e) => renderList(e.target.value) } });
  const savedState = saved && deserialize(saved);
  picker.el = h('section.picker.wd-surface', { 'aria-label': 'Choose your nation' },
    h('div.picker-head', h('h1.brand', 'WORLD', h('br'), h('span', 'DOMINION')),
      h('p', 'Choose a nation to lead. Click any country on the map, or pick one below.')),
    h('div.picker-body',
      savedState ? h('button.wd-btn.primary.lg.block', { type: 'button', on: { click: () => enterGame(savedState, true) } }, icon('play'), `Continue as ${country(savedState.player).name} · ${monthLabel(savedState.month)}`) : '',
      h('section.wd-section', h('h3.wd-section-t', 'Popular starts'), h('div.wd-chips', FEATURED.map((id) =>
        h('button.wd-chip', { type: 'button', on: { click: () => g.select(id, { fly: true }) } }, h('span.wd-swatch', { style: { background: swatchColor(g, id) } }), country(id).name)))),
      h('section.wd-section', h('h3.wd-section-t', 'All nations'), h('label.search', icon('search'), input), list)),
    h('div.picker-foot', h('a', { href: '../play/public/' }, '← back to the arcade')));
  document.body.append(picker.el);
  syncInsets();
  g.applyOverlay();
  map.home(false);
}
g.start = (id) => enterGame(newGame(id), false);
function enterGame(state, resumed) {
  g.state = state; g.paused = true; g.speed = 1; acc = 0;
  g.lastSaved = resumed ? state.month : null;
  picker.el?.remove();
  document.body.classList.remove('picking');
  right.close(); left.close();
  if (!hud.dock) buildHud();
  const n = country(state.player);
  map.setPlayer(state.player);
  g.applyOverlay();
  syncInsets();
  map.flyTo(state.player, { maxZoom: 4 });
  renderHud();
  if (!resumed) g.save(false);
  toast(resumed ? `Welcome back. <b>${n.name}</b> awaits.` : `You now lead <b>${n.name}</b>. Press <b>▶</b> to let time run, or step one month at a time.`, { tone: 'gold', icon: 'crown', ms: 6000 });
}

// ——— Keyboard ———
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select') && e.key !== 'Escape') return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'Escape') { closeTop(); return; }
  if (e.key === '+' || e.key === '=') { map.zoomBy(1.6); return; }
  if (e.key === '-' || e.key === '_') { map.zoomBy(1 / 1.6); return; }
  if (e.key === '0') { map.home(); return; }
  if (e.key.toLowerCase() === 'l' && !modalOpen()) { layersPop.el ? closeLayers() : openLayers(); return; }
  if (!g.state || modalOpen()) return;
  const k = e.key.toLowerCase();
  if (e.key === ' ') { e.preventDefault(); g.togglePause(); }
  else if (k === 'n') g.step();
  else if (['1', '2', '3', '4'].includes(k)) g.setSpeed(SPEEDS[+k - 1]);
  else if (k === 'c') g.select(g.state.player, { fly: true });
  else { const t = TOOLS.find((x) => x.hotkey.toLowerCase() === k); if (t) g.openTool(t.key); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && g.state && !g.paused) { g.paused = true; renderHud(); } });

// ——— Boot ———
showPicker(store.get());
requestAnimationFrame(loop);

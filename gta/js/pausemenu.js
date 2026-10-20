// The pause menu: Resume, Map, Missions, Player stats, Settings, Controls, Save game, Main menu. It only draws and edits things
// that live elsewhere (prefs.js, the story runtime, the markers); the pause itself (freezing the world, the pointer lock) is main.js.
import { G } from './state.js';
import { data, persist } from './save.js';
import { prefs, setPref, ACTIONS, codeOf, keyName, setBind, resetBinds, resetPrefs, canPersist } from './prefs.js';
import { quality, setQuality } from './settings.js';
import { captureKey, isTouch } from './input.js';
import * as voice from './story/voice.js';
import { story, runtime, missionRows, abandonStory, journal, cycleRadio, station, STATIONS, progress } from './story/runtime.js';
import { testLine } from './story/conversation.js';
import { LINES } from './story/dialogue.js';
import { MISSION_LIST } from './story/missions.js';
import { setWaypoint, clearWaypoint } from './nav.js';
import { getMarker } from './markers.js';
import { storyHud, cancelMission } from './missions.js';
import { POIS } from './pois.js';
import { DISTRICTS, districtAt } from './layout.js';
import { env } from './environment.js';
import { player } from './player.js';
import { say } from './ui.js';

const $ = id => document.getElementById(id);
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const btn = (text, fn, cls) => { const b = h('button', 'opt' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.addEventListener('click', fn); return b; };
let cb = { resume() {}, map() {}, mainMenu() {} }, tab = null, savedAt = null, askYes = null, selMission = null;

/* ---- the panels ---- */
const PANELS = { missions: missionsPanel, stats: statsPanel, settings: settingsPanel, controls: controlsPanel, save: savePanel, menu: menuPanel };

function waypointButton(dest, label) {
  const wp = getMarker('waypoint'), here = dest && wp && Math.hypot(wp.x - dest.x, wp.z - dest.z) < 3;
  if (!dest) return h('p', 'small', 'This place is not on the map yet.');
  return btn(here ? 'remove waypoint' : 'set waypoint' + (label ? ': ' + label : ''), () => { if (here) { clearWaypoint(); say('waypoint removed', 1.4); } else { const r = setWaypoint(dest.x, dest.z); say(r.message, 1.6); } render(); });
}

function missionsPanel(p) {
  p.appendChild(h('h3', null, 'missions'));
  const items = []; // { key, title, status, group, detail(box) }
  if (G.mission) { // a free-roam job (yellow beam) that is running
    const m = G.mission, t = m.pts[m.idx];
    items.push({ key: 'job:running', title: m.title.toLowerCase(), status: 'active', group: 'Active', detail(box) {
      box.appendChild(h('p', null, m.type === 'race' ? 'Race through every checkpoint before time runs out.' : m.idx === 0 ? m.text + ' at ' + t.name + '.' : 'Deliver to ' + t.name + '.'));
      box.appendChild(h('p', 'small', Math.max(0, Math.ceil(m.left)) + ' s left · reward $' + m.reward));
      box.appendChild(waypointButton({ x: t.x, z: t.z }, 'objective')); box.appendChild(btn('abandon job', () => ask('Abandon this job?', 'abandon', () => { cancelMission(); say('job abandoned', 1.6); render(); }), 'pm-danger')); } });
  }
  const rows = runtime.enabled ? missionRows() : [], later = rows.filter(r => r.hidden).length;
  for (const r of rows.filter(r => !r.hidden)) {
    const group = r.status === 'active' ? 'Active' : r.status === 'open' || r.status === 'retry' ? 'Available' : r.status === 'done' ? 'Completed' : 'Locked';
    items.push({ key: r.id, title: r.title.toLowerCase(), status: r.status, group, detail(box) {
      if (r.chain) box.appendChild(h('p', 'small', r.chain + ' story'));
      if (r.desc) box.appendChild(h('p', null, r.desc));
      if (r.status === 'locked' || r.status === 'missed') {
        box.appendChild(h('p', 'small', r.status === 'missed' ? 'You can no longer take this one.' : 'Locked.'));
        if (r.reqs.length) { box.appendChild(h('h4', null, 'to unlock')); const ul = h('ul', 'pm-obj'); r.reqs.forEach(t => ul.appendChild(h('li', null, 'Finish ' + t.toLowerCase()))); box.appendChild(ul); }
        return;
      }
      if (r.objectives.length) { box.appendChild(h('h4', null, r.status === 'done' ? 'what you did' : 'objectives')); const ul = h('ul', 'pm-obj'); r.objectives.forEach(o => ul.appendChild(h('li', o.done ? 'd' : o.current ? 'c' : '', o.text))); box.appendChild(ul); }
      if (r.status === 'active' && storyHud.text) box.appendChild(h('p', 'jcur', 'Now: ' + storyHud.text));
      if (r.reward) box.appendChild(h('p', 'small', 'reward $' + r.reward.toLocaleString()));
      if (r.status !== 'done') box.appendChild(waypointButton(r.dest, r.status === 'active' ? 'objective' : r.startLabel ? r.startLabel.toLowerCase() : 'start'));
      if (r.status === 'active') box.appendChild(btn('abandon mission', () => ask('Abandon this mission? You can retry it from its marker.', 'abandon', () => { abandonStory(); render(); }), 'pm-danger'));
    } });
  }
  for (const poi of POIS.filter(x => x.category === 'mission')) items.push({ key: 'poi:' + poi.id, title: poi.name.toLowerCase(), status: 'job', group: 'City jobs', detail(box) {
    box.appendChild(h('p', null, 'A paid job. Step into the yellow beam to start it. Each one is a different delivery or race.'));
    box.appendChild(h('p', 'small', DISTRICTS[districtAt(poi.x, poi.z)].name)); box.appendChild(waypointButton({ x: poi.x, z: poi.z }, 'beam')); } });
  if (!items.length) { p.appendChild(h('p', null, 'No missions right now.')); return; }
  if (!items.some(i => i.key === selMission)) selMission = (items.find(i => i.status === 'active') || items.find(i => i.status === 'open' || i.status === 'retry') || items[0]).key;
  const wrap = h('div', 'pm-ms'), list = h('ul', 'pm-list'), box = h('div', 'pm-detail');
  let last = null;
  for (const it of items) {
    if (it.group !== last) { last = it.group; const hd = h('li', null); hd.appendChild(h('h4', null, it.group)); list.appendChild(hd); }
    const li = h('li'), b = h('button', 'pm-mi s-' + it.status + (it.key === selMission ? ' on' : '')); b.type = 'button';
    b.append(h('span', null, it.title), h('i', null, it.status === 'done' ? 'done' : it.status === 'retry' ? 'retry' : it.status === 'locked' ? 'locked' : it.status === 'missed' ? 'missed' : ''));
    b.addEventListener('click', () => { selMission = it.key; render(); }); li.appendChild(b); list.appendChild(li);
    if (it.key === selMission) { box.appendChild(h('h3', null, it.title)); it.detail(box); }
  }
  if (later) { const li = h('li'); li.appendChild(h('p', 'small', '+ ' + later + ' more missions appear as the story goes on')); list.appendChild(li); }
  wrap.append(list, box); p.appendChild(wrap);
}

function statsPanel(p) {
  p.appendChild(h('h3', null, 'player stats'));
  const s = data.stats, done = runtime.enabled ? MISSION_LIST.filter(m => story.s.done[m.id] && m.id !== 'M00').length : 0, total = MISSION_LIST.filter(m => m.id !== 'M00').length;
  const hr = Math.floor(env.hour), mn = Math.floor((env.hour % 1) * 60);
  const cards = [
    ['money', '$' + data.money.toLocaleString()], ['wanted', G.stars ? '★'.repeat(G.stars) : 'none'], ['health', Math.max(0, Math.round(player.hp)) + '%'],
    ['jobs completed', s.jobs], ['story missions', runtime.enabled ? done + ' / ' + total : 'free roam'], ['people hurt', s.kills], ['officers down', s.copsKilled],
    ['times wasted', s.deaths], ['times busted', s.busts], ['best race', data.bestRace ? data.bestRace.toFixed(1) + ' s' : '–'],
    ['where', DISTRICTS[districtAt(player.x, player.z)].name], ['time', String(hr).padStart(2, '0') + ':' + String(mn).padStart(2, '0')]
  ];
  const grid = h('div', 'pm-grid'); for (const [k, v] of cards) { const c = h('div', 'pm-card'); c.append(h('b', null, String(v)), h('span', null, k)); grid.appendChild(c); } p.appendChild(grid);
  if (runtime.enabled) { const j = journal(); p.appendChild(h('h4', null, 'people')); const rel = h('p', 'jrel'); j.rel.forEach(r => { const sp = h('span', null, r.name + ' '); sp.style.color = r.color; sp.appendChild(h('b', null, r.level.toLowerCase())); sp.style.marginRight = '14px'; rel.appendChild(sp); }); p.appendChild(rel); }
}

function slider(p, label, key, min, max, step, fmt, onSet) {
  const id = 'pm-' + key, row = h('div', 'pm-set'), lab = h('label', null, label), inp = h('input'), out = h('output');
  lab.htmlFor = id; inp.id = id; inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = prefs[key];
  const paint = () => { out.textContent = fmt(Number(inp.value)); }; paint();
  inp.addEventListener('input', () => { setPref(key, Number(inp.value)); if (onSet) onSet(); paint(); });
  row.append(lab, inp, out); p.appendChild(row);
}
function segmented(p, label, options, current, onPick, disabled) {
  const row = h('div', 'pm-set'), lab = h('label', null, label), seg = h('div', 'pm-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', label);
  for (const [value, text] of options) { const b = btn(text, () => onPick(value), value === current ? 'on' : ''); b.setAttribute('aria-pressed', String(value === current)); b.disabled = !!disabled; seg.appendChild(b); }
  row.append(lab, seg, h('span')); p.appendChild(row);
}
function settingsPanel(p) {
  p.appendChild(h('h3', null, 'settings'));
  p.appendChild(h('h4', null, 'audio'));
  const pc = v => Math.round(v * 100) + '%';
  slider(p, 'master volume', 'master', 0, 1, .05, pc); slider(p, 'sound effects', 'sfx', 0, 1, .05, pc); slider(p, 'voices and radio', 'voice', 0, 1, .05, pc, () => voice.applyVolume());
  p.appendChild(h('p', 'small', 'There is no music track yet; the car radio is dialogue only, so it follows the voices slider.'));
  p.appendChild(h('h4', null, 'look and camera'));
  slider(p, 'mouse sensitivity', 'mouse', .25, 3, .05, v => v.toFixed(2) + '×');
  slider(p, 'touch camera sensitivity', 'touchLook', .25, 3, .05, v => v.toFixed(2) + '×');
  segmented(p, 'invert vertical look', [[false, 'off'], [true, 'on']], prefs.invertY, v => { setPref('invertY', v); render(); });
  p.appendChild(h('h4', null, 'graphics'));
  segmented(p, 'graphics quality', [['low', 'low'], ['high', 'high']], quality, q => { if (q !== quality) ask('Changing the graphics quality reloads the game. Your progress up to the last checkpoint is kept.', 'reload', () => { setQuality(q); persist(); location.reload(); }); });
  segmented(p, 'shadows', [['off', 'off'], ['medium', 'medium'], ['high', 'high']], prefs.shadows, v => { setPref('shadows', v); render(); }, quality !== 'high');
  if (quality !== 'high') p.appendChild(h('p', 'small', 'Shadows are only drawn on high graphics quality.'));
  p.appendChild(h('h4', null, 'story'));
  const row = h('div', 'row');
  row.appendChild(btn('subtitles: ' + (voice.subtitlesOn() ? 'on' : 'off'), () => { voice.setSubtitles(!voice.subtitlesOn()); render(); }));
  row.appendChild(btn('car radio: ' + STATIONS[station()].name, () => { cycleRadio(); render(); })); p.appendChild(row);
  const reset = h('div', 'row'); reset.appendChild(btn('reset settings to defaults', () => { resetPrefs(); voice.applyVolume(); render(); say('settings reset', 1.4); })); p.appendChild(reset);
  const dev = h('details'); dev.id = 'vtest'; dev.appendChild(h('summary', null, 'test a line of dialogue'));
  const inp = h('input'); inp.placeholder = 'LINE_ID'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('aria-label', 'line ID'); const out = h('p', 'small');
  dev.append(h('p', 'small', 'Type a line ID (for example EDDIE_M01_GARAGE_001) to hear its recording, or see its subtitle if none exists.'), inp, document.createTextNode(' '), btn('play', async () => { const id = inp.value.trim().toUpperCase(); if (!LINES[id]) { out.textContent = 'no line with that ID'; return; } out.textContent = 'testing ' + id + ' ...'; const r = await testLine(id); out.textContent = r.id + ': ' + r.message; }), out);
  p.appendChild(dev);
}

let waiting = null;
function controlsPanel(p) {
  p.appendChild(h('h3', null, 'controls'));
  p.appendChild(h('p', 'small', isTouch() ? 'Touch: drag on the left to move, drag on the right to look, use the on-screen buttons for the rest.' : 'Click a key to change it, then press the new key. Esc cancels. If a key is already used, the two actions swap.'));
  const grid = h('div', 'pm-keys');
  for (const a of ACTIONS) {
    const b = h('button', 'opt' + (waiting === a.id ? ' wait' : ''), waiting === a.id ? 'press a key…' : keyName(codeOf(a.id))); b.type = 'button'; b.setAttribute('aria-label', a.label + ': ' + keyName(codeOf(a.id)) + ', change');
    b.addEventListener('click', () => {
      if (waiting === a.id) { waiting = null; captureKey(null); render(); return; }
      waiting = a.id; render();
      captureKey(code => { const id = waiting; waiting = null; if (code !== 'Escape') { const r = setBind(id, code); if (!r.ok) say('that key cannot be used', 1.6); else if (r.swapped) say('swapped with: ' + ACTIONS.find(x => x.id === r.swapped).label, 2.2); } render(); });
    });
    const label = h('span', null, a.label + (a.alt ? ' (also ' + keyName(a.alt) + ')' : '')); grid.append(label, b);
  }
  p.appendChild(grid);
  p.appendChild(h('h4', null, 'fixed'));
  const fx = h('div', 'pm-keys'); for (const [l, k] of [['look around', 'mouse'], ['shoot', 'left mouse button'], ['pause menu / back', 'Esc'], ['talk and continue dialogue', 'E or click'], ['skip a cutscene', 'X'], ['map: move, zoom, centre, waypoint', 'drag, wheel, C, Enter']]) { fx.append(h('span', null, l)); const kb = h('kbd', null, k); fx.appendChild(kb); } p.appendChild(fx);
  p.appendChild(h('div', 'row')).appendChild(btn('reset keys to defaults', () => { resetBinds(); waiting = null; captureKey(null); render(); }));
}

function savePanel(p) {
  p.appendChild(h('h3', null, 'save game'));
  const ok = canPersist();
  p.appendChild(h('p', null, 'Your money, stats, story progress and settings are kept in this browser. The game also saves by itself at mission checkpoints and when you leave the page.'));
  if (!ok) p.appendChild(h('p', 'jcur', 'Saving is not available here (the browser is blocking storage, for example in a private window). Progress is lost when this tab closes.'));
  const b = btn('save now', () => { persist(); savedAt = new Date(); say('game saved', 1.6); render(); }); b.disabled = !ok; p.appendChild(b);
  p.appendChild(h('p', 'small', savedAt ? 'Saved at ' + savedAt.toLocaleTimeString() + '.' : 'Not saved yet this session.'));
}
function menuPanel(p) {
  p.appendChild(h('h3', null, 'main menu'));
  p.appendChild(h('p', null, 'Go back to the title screen. The game is saved first; anything since the last mission checkpoint is lost.'));
  p.appendChild(btn('return to main menu', () => ask('Return to the main menu? You will lose anything since the last mission checkpoint.', 'main menu', () => { persist(); cb.mainMenu(); }), 'pm-danger'));
}

/* ---- the menu itself ---- */
function render() {
  const p = $('pmPanel'); p.textContent = '';
  document.querySelectorAll('.pm-item').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (tab && PANELS[tab]) PANELS[tab](p);
}
function show(t) {
  if (waiting) { waiting = null; captureKey(null); }
  if (t === 'resume') { cb.resume(); return; }
  if (t === 'map') { cb.map(); return; }
  tab = t; render();
}
function ask(text, yes, fn) { $('pmConfirmText').textContent = text; $('pmConfirmYes').textContent = yes; askYes = fn; $('pmConfirm').hidden = false; $('pmConfirmNo').focus(); }
function closeAsk() { $('pmConfirm').hidden = true; askYes = null; }

/** Esc: close a confirmation if one is open; true when it did something */
export function handleEscape() { if (!$('pmConfirm').hidden) { closeAsk(); return true; } if (waiting) { waiting = null; captureKey(null); render(); return true; } return false; }
/** called whenever the pause menu opens or the story state changes */
export function refreshPause(opening) {
  if (opening) { closeAsk(); selMission = null; if (!tab || tab === 'resume') tab = runtime.enabled && progress() !== 'new' ? 'missions' : 'stats'; }
  $('pauseStat').textContent = '$' + data.money.toLocaleString() + (data.bestRace ? ' · best race ' + data.bestRace.toFixed(1) + 's' : '') + ' · jobs ' + data.stats.jobs;
  render(); if (opening) setTimeout(() => { const r = $('resume'); if (r && !$('pause').hidden) r.focus(); }, 30);
}
export function initPauseMenu(callbacks) {
  cb = Object.assign(cb, callbacks);
  $('pmNav').addEventListener('click', e => { const b = e.target.closest('.pm-item'); if (b) show(b.dataset.tab); });
  $('pmNav').addEventListener('keydown', e => { // arrow keys move through the list
    const items = [...document.querySelectorAll('.pm-item')], i = items.indexOf(document.activeElement);
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { e.preventDefault(); items[(i + (e.code === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); $('pmPanel').focus(); }
  });
  $('pmPanel').addEventListener('keydown', e => { if (e.code === 'ArrowLeft' && e.target === $('pmPanel')) { e.preventDefault(); (document.querySelector('.pm-item.on') || $('resume')).focus(); } });
  $('pmConfirmNo').addEventListener('click', closeAsk);
  $('pmConfirmYes').addEventListener('click', () => { const f = askYes; closeAsk(); if (f) f(); });
}
export const currentTab = () => tab;

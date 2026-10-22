// Elemental UI: inventory, drag-and-drop board, discoveries, hints and saving.
// Game rules live in engine.js, the board model in workspace.js, recipes in data/recipes.js.
import * as DATA from '../data/recipes.js';
import * as E from './engine.js';
import * as W from './workspace.js';
import * as S from './storage.js';
import { sound } from './sound.js';
import { closeModal, showBook, showStats, showMenu } from './views.js';

const $ = sel => document.querySelector(sel);
const index = E.buildIndex(DATA);
const el = id => index.elements.get(id);
const cat = id => index.categories.get(el(id).category);

// --- state -----------------------------------------------------------------------------------

function loadProgress() {
  const saved = S.read(S.KEYS.progress);
  if (saved) { try { return E.parseSave(saved, index); } catch { /* unreadable: start fresh */ } }
  return E.createProgress(index);
}
function loadSettings() {
  const def = { sound: true, sort: 'order', category: 'all' };
  try { return { ...def, ...JSON.parse(S.read(S.KEYS.settings) || '{}') }; } catch { return def; }
}

let progress = loadProgress();
let ws = W.parseWorkspace(S.read(S.KEYS.workspace), id => E.isDiscovered(progress, id));
const settings = loadSettings();
if (!E.SORTS[settings.sort]) settings.sort = 'order';
if (settings.category !== 'all' && !index.categories.has(settings.category)) settings.category = 'all';
sound.enabled = settings.sound;
const view = { query: '', fresh: new Set(), selected: null };

let saveFailed = false;
function saveProgress() {
  const ok = S.write(S.KEYS.progress, E.serialize(progress));
  if (!ok && !saveFailed) { saveFailed = true; toast('Progress could not be saved in this browser. Use Menu → Export to keep it.', 'bad', 5000); }
}
const saveWorkspace = () => S.write(S.KEYS.workspace, W.serializeWorkspace(ws));
const saveSettings = () => S.write(S.KEYS.settings, JSON.stringify(settings));

// --- small helpers ---------------------------------------------------------------------------

function tileNode(id, cls = 'tile') {
  const e = el(id);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls + (E.isFinal(index, id) ? ' final' : '');
  b.dataset.id = id;
  b.style.setProperty('--c', cat(id).color);
  b.title = E.isFinal(index, id) ? `${e.name} (final element: it does not combine any further)` : e.name;
  const icon = document.createElement('span');
  icon.className = 'icon';
  icon.textContent = e.icon;
  icon.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = e.name;
  b.append(icon, name);
  return b;
}

let lastToast = '';
function toast(text, kind = '', ms = 2200) {
  if (text === lastToast && document.querySelector('.toast:not(.out)')) return;
  lastToast = text;
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = text;
  const box = $('#toasts');
  box.append(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => { t.remove(); if (lastToast === text) lastToast = ''; }, 300); }, ms);
}

// --- header ----------------------------------------------------------------------------------

function renderHeader() {
  const n = E.discoveredCount(progress);
  $('#count').textContent = n;
  $('#total').textContent = index.list.length;
  $('#bar').style.width = `${(n / index.list.length) * 100}%`;
  $('#btn-undo').disabled = !W.canUndo(ws);
  $('#btn-clear').disabled = !ws.items.length;
}

// --- inventory -------------------------------------------------------------------------------

function hintedIds() {
  const h = progress.hint;
  if (!h || h.level < 1) return [];
  const r = index.byKey.get(h.key);
  if (!r) return [];
  return h.level >= 2 ? [r.a, r.b] : [r.a];
}

function renderChips() {
  const box = $('#chips');
  const counts = {};
  for (const id of E.discoveredIds(progress)) counts[el(id).category] = (counts[el(id).category] || 0) + 1;
  const chip = (id, label, color, n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.cat = id;
    if (color) b.style.setProperty('--c', color);
    b.setAttribute('aria-pressed', String(settings.category === id));
    b.textContent = label;
    const s = document.createElement('span');
    s.className = 'n';
    s.textContent = n;
    b.append(s);
    return b;
  };
  const chips = [chip('all', 'All', '', E.discoveredCount(progress))];
  for (const c of index.categories.values()) if (counts[c.id]) chips.push(chip(c.id, c.name, c.color, counts[c.id]));
  box.replaceChildren(...chips);
}

function renderInventory() {
  renderChips();
  let ids = E.discoveredIds(progress).filter(id => index.elements.has(id));
  if (settings.category !== 'all') ids = ids.filter(id => el(id).category === settings.category);
  ids = view.query ? E.searchIds(index, ids, view.query) : E.sortIds(index, progress, ids, settings.sort);
  const hinted = new Set(hintedIds());
  const grid = $('#inv-grid');
  const nodes = ids.map(id => {
    const n = tileNode(id);
    if (view.fresh.has(id)) n.classList.add('fresh');
    if (hinted.has(id)) n.classList.add('hinted');
    return n;
  });
  if (!nodes.length) {
    const p = document.createElement('p');
    p.className = 'inv-empty';
    p.textContent = view.query ? `Nothing you have found matches “${view.query}”.` : 'No elements in this category yet.';
    nodes.push(p);
  }
  grid.replaceChildren(...nodes);
  const total = E.discoveredCount(progress);
  $('#inv-info').textContent = view.query || settings.category !== 'all'
    ? `Showing ${ids.length} of ${total} elements`
    : `${total} elements · ★ marks final elements`;
}

// --- board -----------------------------------------------------------------------------------

const board = $('#board');
const itemNodes = new Map(); // uid -> node

function renderBoard() {
  const live = new Set(ws.items.map(i => i.uid));
  for (const [uid, node] of itemNodes) if (!live.has(uid)) { node.remove(); itemNodes.delete(uid); }
  const hinted = new Set(hintedIds());
  ws.items.forEach((it, z) => {
    let node = itemNodes.get(it.uid);
    if (!node) {
      node = tileNode(it.id, 'item');
      node.dataset.uid = it.uid;
      node.setAttribute('aria-label', `${el(it.id).name} on the workspace`);
      itemNodes.set(it.uid, node);
      board.append(node);
    }
    node.style.left = `${it.x * 100}%`;
    node.style.top = `${it.y * 100}%`;
    node.style.zIndex = String(1 + z);
    node.classList.toggle('selected', view.selected === it.uid);
    node.classList.toggle('hinted', hinted.has(it.id));
  });
  $('#board-empty').hidden = ws.items.length > 0;
  renderHeader();
}

// Board fraction for a point in the viewport, kept far enough from the edges for a tile to fit.
function toBoard(clientX, clientY, w = 120, h = 36) {
  const r = board.getBoundingClientRect();
  const mx = Math.min(r.width / 2, w / 2 + 6), my = Math.min(r.height / 2, h / 2 + 6);
  const x = Math.min(r.width - mx, Math.max(mx, clientX - r.left));
  const y = Math.min(r.height - my, Math.max(my, clientY - r.top));
  return { x: x / r.width, y: y / r.height };
}

// A free-looking spot near the middle of the board for click/tap placement.
function freeSpot() {
  const r = board.getBoundingClientRect();
  const pts = ws.items.map(i => [i.x * r.width, i.y * r.height]);
  let best = null, bestD = -1;
  for (let k = 0; k < 40; k++) {
    const x = r.width * (0.18 + Math.random() * 0.64), y = r.height * (0.15 + Math.random() * 0.6);
    const d = pts.length ? Math.min(...pts.map(([px, py]) => Math.hypot((px - x) / 1.6, py - y))) : 999;
    if (d > bestD) { bestD = d; best = { x, y }; }
    if (d > 90) break;
  }
  return toBoard(r.left + best.x, r.top + best.y);
}

function placeFromInventory(id, at) {
  const p = at || freeSpot();
  const item = W.addItem(ws, id, p.x, p.y);
  view.selected = null;
  renderBoard();
  itemNodes.get(item.uid)?.classList.add('pop');
  sound.play('place');
  saveWorkspace();
  if (view.fresh.delete(id)) renderInventory();
  return item;
}

function burstAt(node, color, big) {
  const br = board.getBoundingClientRect(), r = node.getBoundingClientRect();
  const x = r.left + r.width / 2 - br.left, y = r.top + r.height / 2 - br.top;
  const b = document.createElement('div');
  b.className = 'burst';
  b.style.left = `${x}px`; b.style.top = `${y}px`;
  b.style.setProperty('--c', color);
  const n = big ? 22 : 12;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.setProperty('--a', `${(360 / n) * i + Math.random() * 12}deg`);
    p.style.setProperty('--d', `${(big ? 70 : 44) + Math.random() * 40}px`);
    b.append(p);
  }
  const ring = document.createElement('div');
  ring.className = 'ring';
  ring.style.left = `${x}px`; ring.style.top = `${y}px`;
  ring.style.setProperty('--c', color);
  board.append(b, ring);
  setTimeout(() => { b.remove(); ring.remove(); }, 900);
}

// Try `draggedId` (from the board when draggedUid is set, else from the inventory) on a board item.
// Returns true when a recipe fired.
function tryCombine(draggedId, draggedUid, targetUid) {
  const target = ws.items.find(i => i.uid === targetUid);
  if (!target) return false;
  const res = E.combine(progress, index, draggedId, target.id);
  if (!res.ok) {
    saveProgress();
    const node = itemNodes.get(targetUid);
    if (node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }
    sound.play('fail');
    toast(`${el(draggedId).name} and ${el(target.id).name} don't combine.`, '', 1600);
    return false;
  }
  const item = W.combineItems(ws, draggedUid, targetUid, res.result);
  view.selected = null;
  renderBoard();
  const node = itemNodes.get(item.uid);
  node.classList.add('pop');
  burstAt(node, cat(res.result).color, res.isNew);
  saveProgress();
  saveWorkspace();
  const name = el(res.result).name;
  if (res.isNew) {
    view.fresh.add(res.result);
    sound.play('discover');
    renderInventory();
    celebrate(res);
  } else {
    sound.play('combine');
    toast(res.isNewRecipe ? `New recipe for ${name}! (already discovered)` : `${name}: already discovered.`, res.isNewRecipe ? 'good' : '');
  }
  if (!$('#hint-pop').hidden) renderHint();
  return true;
}

// --- discovery card --------------------------------------------------------------------------

const discoveryQueue = [];
let discoveryTimer = 0;
function celebrate(res) {
  discoveryQueue.push(res);
  if (discoveryQueue.length === 1) showDiscovery();
}
function showDiscovery() {
  const res = discoveryQueue[0];
  if (!res) return;
  const e = el(res.result), c = cat(res.result);
  const n = E.discoveredCount(progress);
  const box = $('#discovery');
  const card = document.createElement('div');
  card.className = 'discovery-card';
  card.style.setProperty('--c', c.color);
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-label', `New discovery: ${e.name}`);
  const confetti = document.createElement('div');
  confetti.className = 'confetti';
  const colors = ['#ffd166', '#06d6a0', '#4dabf7', '#ff7a59', '#c55bd6', c.color];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--t', `${1.2 + Math.random() * 1.2}s`);
    p.style.setProperty('--delay', `${Math.random() * 0.4}s`);
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    confetti.append(p);
  }
  const r = res.recipe;
  const add = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; x.textContent = text; card.append(x); return x; };
  card.append(confetti);
  add('div', 'kicker', 'New discovery!');
  add('div', 'big-icon', e.icon).setAttribute('aria-hidden', 'true');
  add('h2', '', e.name);
  add('div', 'cat', c.name);
  add('p', '', e.desc);
  add('p', 'recipe-line', `${el(r.a).name} ${r.ordered ? 'onto' : '+'} ${el(r.b).name}`);
  const milestone = n % 25 === 0 ? `${n} discoveries! ${Math.floor((n / index.list.length) * 100)}% of everything.` : E.isFinal(index, res.result) ? '★ Final element: it does not combine any further.' : '';
  if (milestone) add('p', 'milestone', milestone);
  add('p', 'muted', `${n} of ${index.list.length} discovered`);
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'btn primary';
  ok.textContent = discoveryQueue.length > 1 ? 'Next' : 'Nice!';
  ok.addEventListener('click', dismissDiscovery);
  card.append(ok);
  box.replaceChildren(card);
  box.hidden = false;
  ok.focus({ preventScroll: true });
  clearTimeout(discoveryTimer);
  discoveryTimer = setTimeout(dismissDiscovery, 4200);
}
function dismissDiscovery() {
  clearTimeout(discoveryTimer);
  discoveryQueue.shift();
  if (discoveryQueue.length) { showDiscovery(); return; }
  $('#discovery').hidden = true;
}
$('#discovery').addEventListener('click', e => { if (e.target.id === 'discovery') dismissDiscovery(); });

// --- dragging --------------------------------------------------------------------------------
// Mouse/pen can drag from the inventory and around the board. On touch screens the inventory
// scrolls, so touching a tile there places it (click), and dragging happens on the board.

let drag = null;
let suppressClick = false;

function onPointerDown(e) {
  if (e.button > 0) return;
  const node = e.target.closest('.tile, .item');
  if (!node) return;
  const fromBoard = node.classList.contains('item');
  if (!fromBoard && e.pointerType === 'touch') return;
  const r = node.getBoundingClientRect();
  drag = {
    node, fromBoard, id: node.dataset.id, uid: fromBoard ? Number(node.dataset.uid) : null,
    sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, w: r.width, h: r.height,
    started: false, ghost: null, target: null, pointerId: e.pointerId,
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', cancelDrag);
}

function startDrag() {
  drag.started = true;
  const g = drag.node.cloneNode(true);
  g.classList.remove('pop', 'shake', 'selected', 'target', 'fresh', 'hinted');
  g.classList.add('ghost');
  g.style.width = `${drag.w}px`;
  g.style.left = g.style.top = '0';
  g.removeAttribute('id');
  document.body.append(g);
  drag.ghost = g;
  if (drag.fromBoard) drag.node.classList.add('dragging');
  document.body.classList.add('is-dragging');
  view.selected = null;
  for (const n of itemNodes.values()) n.classList.remove('selected');
}

function zoneAt(x, y, dragged) {
  const els = document.elementsFromPoint(x, y);
  const item = els.find(n => n.classList?.contains('item') && n !== dragged);
  if (item) return { kind: 'item', node: item };
  if (els.some(n => n.id === 'inventory')) return { kind: 'inventory' };
  if (els.some(n => n === board)) return { kind: 'board' };
  return { kind: 'none' };
}

function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
    startDrag();
  }
  e.preventDefault();
  drag.ghost.style.transform = `translate(${e.clientX - drag.ox}px, ${e.clientY - drag.oy}px) rotate(-3deg) scale(1.06)`;
  const z = zoneAt(e.clientX, e.clientY, drag.node);
  const target = z.kind === 'item' ? z.node : null;
  if (target !== drag.target) {
    drag.target?.classList.remove('target');
    target?.classList.add('target');
    drag.target = target;
  }
  board.classList.toggle('drop-ok', z.kind === 'board' && !drag.fromBoard);
  $('#inventory').classList.toggle('drop-remove', z.kind === 'inventory' && drag.fromBoard);
}

function endListeners() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', cancelDrag);
  document.body.classList.remove('is-dragging');
  board.classList.remove('drop-ok');
  $('#inventory').classList.remove('drop-remove');
  drag?.target?.classList.remove('target');
}

// Fly the ghost back to where the drag began, then tidy up.
function returnGhost(d) {
  const g = d.ghost;
  let r = null;
  if (d.fromBoard) r = d.node.getBoundingClientRect();
  else { const tile = [...document.querySelectorAll('#inv-grid .tile')].find(t => t.dataset.id === d.id); if (tile) r = tile.getBoundingClientRect(); }
  g.classList.add('returning');
  if (r) g.style.transform = `translate(${r.left}px, ${r.top}px)`;
  else g.style.opacity = '0';
  setTimeout(() => { g.remove(); d.node.classList.remove('dragging'); }, 330);
}

function onPointerUp(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = drag;
  endListeners();
  drag = null;
  if (!d.started) return; // a plain click; the click handler deals with it
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  const z = zoneAt(e.clientX, e.clientY, d.node);
  if (z.kind === 'item') {
    if (tryCombine(d.id, d.uid, Number(z.node.dataset.uid))) { d.ghost.remove(); return; }
    returnGhost(d);
    return;
  }
  if (z.kind === 'board') {
    const p = toBoard(e.clientX - d.ox + d.w / 2, e.clientY - d.oy + d.h / 2, d.w, d.h);
    d.ghost.remove();
    if (d.fromBoard) { d.node.classList.remove('dragging'); W.moveItem(ws, d.uid, p.x, p.y); renderBoard(); saveWorkspace(); }
    else placeFromInventory(d.id, p);
    return;
  }
  if (z.kind === 'inventory' && d.fromBoard) {
    W.removeItem(ws, d.uid);
    d.ghost.classList.add('removing');
    d.ghost.style.transform += ' scale(0.3)';
    setTimeout(() => d.ghost.remove(), 260);
    renderBoard();
    saveWorkspace();
    sound.play('remove');
    return;
  }
  returnGhost(d);
}

function cancelDrag() {
  if (!drag) return;
  const d = drag;
  endListeners();
  drag = null;
  if (d.started) returnGhost(d);
}

document.addEventListener('pointerdown', onPointerDown);
document.addEventListener('dragstart', e => e.preventDefault());

// Click / tap / keyboard: inventory tile places on the board; two board items in a row combine.
$('#inv-grid').addEventListener('click', e => {
  if (suppressClick) return;
  const t = e.target.closest('.tile');
  if (t) placeFromInventory(t.dataset.id);
});
board.addEventListener('click', e => {
  if (suppressClick) return;
  const t = e.target.closest('.item');
  if (!t) { if (view.selected) { view.selected = null; renderBoard(); } return; }
  const uid = Number(t.dataset.uid);
  if (view.selected === null || !ws.items.some(i => i.uid === view.selected)) { view.selected = uid; renderBoard(); return; }
  if (view.selected === uid) { view.selected = null; renderBoard(); return; }
  const first = ws.items.find(i => i.uid === view.selected);
  if (!tryCombine(first.id, first.uid, uid)) { view.selected = null; renderBoard(); }
});
board.addEventListener('dblclick', e => {
  const t = e.target.closest('.item');
  if (!t) return;
  const it = ws.items.find(i => i.uid === Number(t.dataset.uid));
  if (!it) return;
  view.selected = null;
  const r = board.getBoundingClientRect();
  const item = W.addItem(ws, it.id, it.x + 40 / r.width, it.y + 30 / r.height);
  renderBoard();
  itemNodes.get(item.uid)?.classList.add('pop');
  saveWorkspace();
});
board.addEventListener('keydown', e => {
  const t = e.target.closest('.item');
  if (t && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault();
    W.removeItem(ws, Number(t.dataset.uid));
    if (view.selected === Number(t.dataset.uid)) view.selected = null;
    renderBoard();
    saveWorkspace();
  }
});

// --- board tools -----------------------------------------------------------------------------

function doUndo() {
  if (!W.undo(ws)) return;
  view.selected = null;
  renderBoard();
  saveWorkspace();
  sound.play('remove');
}
function doClear() {
  if (!W.clearWorkspace(ws)) return;
  view.selected = null;
  renderBoard();
  saveWorkspace();
  toast('Workspace cleared. Undo brings it back.');
}
$('#btn-undo').addEventListener('click', doUndo);
$('#btn-clear').addEventListener('click', doClear);

// --- search, sort, filters -------------------------------------------------------------------

const sortSel = $('#sort');
for (const [k, label] of Object.entries(E.SORTS)) sortSel.append(new Option(label, k));
sortSel.value = settings.sort;
sortSel.addEventListener('change', () => { settings.sort = sortSel.value; saveSettings(); renderInventory(); });
$('#search').addEventListener('input', e => { view.query = e.target.value; renderInventory(); });
$('#search').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const first = $('#inv-grid .tile'); if (first) placeFromInventory(first.dataset.id); }
  if (e.key === 'Escape') { e.target.value = ''; view.query = ''; renderInventory(); }
});
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  settings.category = c.dataset.cat;
  saveSettings();
  renderInventory();
});

// --- hints -----------------------------------------------------------------------------------

function renderHint() {
  const pop = $('#hint-pop');
  const h = E.currentHint(progress, index);
  pop.replaceChildren();
  const title = document.createElement('h3');
  pop.append(title);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'btn small';
  close.textContent = 'Close';
  close.addEventListener('click', hideHint);
  if (!h) {
    title.textContent = 'Nothing left to find!';
    const p = document.createElement('p');
    p.textContent = 'You have discovered every element and every recipe. Remarkable.';
    pop.append(p, close);
  } else {
    title.textContent = h.kind === 'discovery' ? '💡 Hint' : '💡 Hint: another recipe';
    const ol = document.createElement('ol');
    for (const line of E.hintText(index, h)) { const li = document.createElement('li'); li.textContent = line; ol.append(li); }
    const meta = document.createElement('p');
    meta.className = 'meta';
    const avail = E.availableDiscoveries(progress, index).length;
    meta.textContent = `${avail} new discover${avail === 1 ? 'y is' : 'ies are'} possible with what you have. Hints used: ${progress.stats.hintsUsed}.`;
    const row = document.createElement('div');
    row.className = 'row';
    if (h.level < E.maxHintLevel(h.kind)) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'btn small primary';
      more.textContent = h.level === 0 ? 'Show an ingredient' : h.level === 1 ? 'Show both ingredients' : 'Show the result';
      more.addEventListener('click', () => { E.revealHint(progress, index); saveProgress(); renderHint(); renderInventory(); renderBoard(); });
      row.append(more);
    }
    if (h.kind === 'discovery' && avail > 1) {
      const other = document.createElement('button');
      other.type = 'button';
      other.className = 'btn small';
      other.textContent = 'Different hint';
      other.addEventListener('click', () => { E.skipHint(progress, index); saveProgress(); renderHint(); renderInventory(); renderBoard(); });
      row.append(other);
    }
    row.append(close);
    pop.append(ol, meta, row);
  }
  saveProgress();
}
function showHint() { $('#hint-pop').hidden = false; renderHint(); $('#hint-pop button')?.focus(); }
function hideHint() { $('#hint-pop').hidden = true; }
$('#btn-hint').addEventListener('click', () => ($('#hint-pop').hidden ? showHint() : hideHint()));

// --- modals ----------------------------------------------------------------------------------

const ctx = {
  index,
  get progress() { return progress; },
  get settings() { return settings; },
  toast,
  spendHint() { progress.stats.hintsUsed++; saveProgress(); },
  setSound(on) { settings.sound = on; sound.enabled = on; saveSettings(); },
  // Replace progress with an imported (already validated) save.
  importProgress(next) {
    progress = next;
    ws = W.parseWorkspace(W.serializeWorkspace(ws), id => E.isDiscovered(progress, id));
    view.fresh.clear();
    view.selected = null;
    saveProgress(); saveWorkspace();
    renderInventory(); renderBoard();
  },
  resetProgress() {
    progress = E.createProgress(index);
    ws = W.createWorkspace();
    view.fresh.clear();
    view.selected = null;
    saveProgress(); saveWorkspace();
    renderInventory(); renderBoard();
  },
  clearWorkspace: doClear,
  placeOnBoard(id) { closeModal(); placeFromInventory(id); },
};
$('#btn-book').addEventListener('click', () => { hideHint(); showBook(ctx); });
$('#btn-stats').addEventListener('click', () => { hideHint(); showStats(ctx); });
$('#btn-menu').addEventListener('click', () => { hideHint(); showMenu(ctx); });

// --- keyboard shortcuts ----------------------------------------------------------------------

document.addEventListener('keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); doUndo(); return; }
  if (e.key === 'Escape') {
    if (!$('#discovery').hidden) dismissDiscovery();
    else if (!$('#hint-pop').hidden) hideHint();
    else if (view.selected !== null) { view.selected = null; renderBoard(); }
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || $('#modal').open) return;
  if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  else if (e.key.toLowerCase() === 'h') showHint();
});

window.addEventListener('resize', renderBoard);
// Another tab saved newer progress: pick it up so the two tabs never overwrite each other's finds.
window.addEventListener('storage', e => {
  if (e.key !== S.KEYS.progress || !e.newValue) return;
  try { progress = E.parseSave(e.newValue, index); renderInventory(); renderHeader(); } catch { /* ignore */ }
});

renderInventory();
renderBoard();
saveProgress();

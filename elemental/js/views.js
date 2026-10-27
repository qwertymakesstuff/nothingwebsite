// Modal screens: encyclopedia, statistics, and the save / settings / help menu.
import * as E from './engine.js';

const modal = document.getElementById('modal');
const inner = document.getElementById('modal-inner');

function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style') for (const [sk, sv] of Object.entries(v)) n.style.setProperty(sk, sv);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(2)) if (kid !== null && kid !== undefined && kid !== false) n.append(kid);
  return n;
}

// replaceChildren, but skipping empty values and flattening arrays the way h() does.
const fill = (node, ...kids) => node.replaceChildren(...kids.flat(2).filter(k => k !== null && k !== undefined && k !== false));

export function openModal(title, body, { narrow = false } = {}) {
  modal.classList.toggle('narrow', narrow);
  inner.replaceChildren(
    h('div', { class: 'modal-head' }, h('h2', {}, title), h('button', { type: 'button', class: 'modal-close', 'aria-label': 'Close', onclick: closeModal }, '×')),
    h('div', { class: 'modal-body' }, body),
  );
  if (!modal.open) modal.showModal();
}
export function closeModal() { if (modal.open) modal.close(); }
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

const fmtDate = t => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// --- encyclopedia ----------------------------------------------------------------------------

const revealed = new Set(); // element ids whose recipe the player paid a hint to see (this visit)

export function showBook(ctx) {
  const { index } = ctx;
  const el = id => index.elements.get(id);
  const catOf = id => index.categories.get(el(id).category);
  const known = id => E.isDiscovered(ctx.progress, id);
  const state = { query: '', filter: 'all', category: 'all', selected: null };

  const search = h('input', { class: 'field', type: 'search', placeholder: 'Search discovered elements…', 'aria-label': 'Search the encyclopedia' });
  const filter = h('select', { class: 'field', 'aria-label': 'Show' },
    h('option', { value: 'all' }, 'All elements'), h('option', { value: 'found' }, 'Discovered'), h('option', { value: 'missing' }, 'Undiscovered'), h('option', { value: 'final' }, 'Final elements'));
  const catSel = h('select', { class: 'field', 'aria-label': 'Category' }, h('option', { value: 'all' }, 'All categories'),
    [...index.categories.values()].map(c => h('option', { value: c.id }, c.name)));
  const grid = h('div', { class: 'book-grid' });
  const detail = h('div', { class: 'detail' });

  const recipeLabel = r => `${el(r.a).name} ${r.ordered ? 'dropped onto' : '+'} ${el(r.b).name}`;

  function renderDetail() {
    const id = state.selected;
    if (!id) {
      detail.style.setProperty('--c', 'var(--accent)');
      fill(detail, h('p', { class: 'muted' }, 'Pick an element to see its description and recipe history.'));
      return;
    }
    const e = el(id), c = catOf(id);
    detail.style.setProperty('--c', c.color);
    if (!known(id)) {
      const hint = E.elementHint(ctx.progress, index, id);
      const box = h('div', {});
      const showHint = () => {
        const r = hint.recipe;
        const name = x => (known(x) ? el(x).name : '???');
        fill(box, h('p', {}, h('b', {}, 'Recipe: '), r.ordered ? `${name(r.a)} dropped onto ${name(r.b)}` : `${name(r.a)} + ${name(r.b)}`),
          hint.have < 2 ? h('p', { class: 'muted' }, 'You still need to discover the ??? ingredient first.') : null);
      };
      if (!hint || hint.have === 0) box.append(h('p', { class: 'muted' }, 'You need to discover more elements before you can make this one.'));
      else if (revealed.has(id)) showHint();
      else box.append(
        h('p', { class: 'muted' }, hint.have === 2 ? 'You already have everything needed to make this.' : 'You have one of the ingredients for this.'),
        h('button', { type: 'button', class: 'btn small primary', onclick: () => { revealed.add(id); ctx.spendHint(); showHint(); } }, '💡 Reveal a recipe (uses a hint)'));
      fill(detail, 
        h('div', { class: 'd-icon', 'aria-hidden': 'true' }, '❓'),
        h('h3', {}, '???'),
        h('span', { class: 'cat' }, c.name),
        h('p', { class: 'desc' }, 'Not discovered yet.'),
        box);
      return;
    }
    const d = ctx.progress.discovered[id];
    const makes = index.byResult.get(id) || [];
    const uses = index.byInput.get(id) || [];
    const usesFound = uses.filter(r => ctx.progress.recipes[r.key]);
    const makesLeft = makes.filter(r => !ctx.progress.recipes[r.key]).length;
    const via = d.via && index.byKey.get(d.via);
    fill(detail, 
      h('div', { class: 'd-icon', 'aria-hidden': 'true' }, e.icon),
      h('h3', {}, e.name),
      h('span', { class: 'cat' }, c.name), E.isFinal(index, id) ? h('span', { class: 'tag' }, '  ★ final element') : null,
      h('p', { class: 'desc' }, e.desc),
      index.starting.includes(id)
        ? h('p', { class: 'tag' }, 'A starting element.')
        : h('p', { class: 'tag' }, `Discovery #${d.order + 1} · ${fmtDate(d.at)}`, via ? h('br') : null, via ? `First made from ${recipeLabel(via)}` : null),
      makes.length ? [h('h4', {}, `Made from (${makes.filter(r => ctx.progress.recipes[r.key]).length} of ${makes.length} recipes found)`),
        h('ul', {}, makes.filter(r => ctx.progress.recipes[r.key]).map(r => h('li', {}, recipeLabel(r))),
          makesLeft ? h('li', { class: 'unknown' }, `? + ? (${makesLeft} more way${makesLeft === 1 ? '' : 's'} to make it)`) : null)] : null,
      uses.length ? [h('h4', {}, `Used in (${usesFound.length} of ${uses.length} found)`),
        h('ul', {}, usesFound.slice(0, 40).map(r => h('li', {}, `${recipeLabel(r)} → ${el(r.result).icon} ${el(r.result).name}`)),
          usesFound.length > 40 ? h('li', { class: 'unknown' }, `…and ${usesFound.length - 40} more you've found`) : null,
          usesFound.length < uses.length ? h('li', { class: 'unknown' }, `${uses.length - usesFound.length} more combination${uses.length - usesFound.length === 1 ? '' : 's'} to find`) : null)] : null,
      h('div', { class: 'row', style: { 'margin-top': '14px' } }, h('button', { type: 'button', class: 'btn small primary', onclick: () => ctx.placeOnBoard(id) }, 'Place on workspace')),
    );
  }

  function renderGrid() {
    let list = index.list.map(e => e.id);
    if (state.filter === 'found') list = list.filter(known);
    if (state.filter === 'missing') list = list.filter(id => !known(id));
    if (state.filter === 'final') list = list.filter(id => E.isFinal(index, id));
    if (state.category !== 'all') list = list.filter(id => el(id).category === state.category);
    if (state.query) list = E.searchIds(index, list.filter(known), state.query);
    const nodes = [];
    for (const c of index.categories.values()) {
      const ids = list.filter(id => el(id).category === c.id);
      if (!ids.length) continue;
      const all = index.list.filter(e => e.category === c.id);
      nodes.push(h('div', { class: 'book-section', style: { '--c': c.color } }, h('span', {}, c.name), h('span', { class: 'muted' }, `${all.filter(e => known(e.id)).length} / ${all.length}`)));
      for (const id of ids) {
        const k = known(id);
        nodes.push(h('button', {
          type: 'button', class: 'entry' + (k ? '' : ' unknown'), style: { '--c': c.color },
          'aria-current': state.selected === id ? 'true' : null,
          onclick: () => { state.selected = id; renderGrid(); renderDetail(); },
        }, h('span', { class: 'icon', 'aria-hidden': 'true' }, k ? el(id).icon : '❓'), k ? el(id).name : '???'));
      }
    }
    grid.replaceChildren(...(nodes.length ? nodes : [h('p', { class: 'muted' }, 'No elements match.')]));
  }

  search.addEventListener('input', () => { state.query = search.value; renderGrid(); });
  filter.addEventListener('change', () => { state.filter = filter.value; renderGrid(); });
  catSel.addEventListener('change', () => { state.category = catSel.value; renderGrid(); });
  renderGrid();
  renderDetail();
  const n = E.discoveredCount(ctx.progress);
  openModal(`Encyclopedia · ${n} / ${index.list.length}`, h('div', {},
    h('div', { class: 'book-controls' }, search, filter, catSel),
    h('div', { class: 'book' }, h('div', {}, grid), detail)));
}

// --- statistics ------------------------------------------------------------------------------

export function showStats(ctx) {
  const s = E.computeStats(ctx.progress, ctx.index);
  const stat = (value, label) => h('div', { class: 'stat' }, h('b', {}, String(value)), h('span', {}, label));
  openModal('Statistics', h('div', {},
    h('div', { class: 'stat-grid' },
      stat(`${s.discovered} / ${s.total}`, 'Elements discovered'),
      stat(`${s.percent}%`, 'Complete'),
      stat(`${s.recipesFound} / ${s.recipesTotal}`, 'Recipes found'),
      stat(`${s.finalsFound} / ${s.finalsTotal}`, 'Final elements'),
      stat(s.available, 'New discoveries possible now'),
      stat(s.attempts, 'Combinations tried'),
      stat(s.successes, 'Successful'),
      stat(s.failures, 'Did nothing'),
      stat(s.repeats, 'Repeat discoveries'),
      stat(`${s.accuracy}%`, 'Success rate'),
      stat(s.hintsUsed, 'Hints used'),
    ),
    h('h3', {}, 'By category'),
    h('div', { class: 'cat-bars' }, s.perCategory.map(c => h('div', { class: 'cat-bar', style: { '--c': c.color } },
      h('span', {}, c.name),
      h('span', { class: 'track' }, h('i', { style: { width: `${c.total ? (c.found / c.total) * 100 : 0}%` } })),
      h('span', { class: 'n' }, `${c.found} / ${c.total}`)))),
    h('p', { class: 'muted', style: { 'margin-top': '16px' } }, `Playing since ${fmtDate(s.startedAt)} · last played ${fmtDate(s.lastPlayed)}`),
  ), { narrow: true });
}

// --- save, settings and help -----------------------------------------------------------------

export function showMenu(ctx) {
  const msg = h('p', { class: 'msg', role: 'status' });
  const say = (text, ok) => { msg.textContent = text; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
  const code = h('textarea', { class: 'field', readonly: true, 'aria-label': 'Save data', rows: 4 });
  code.value = E.serialize(ctx.progress);

  const download = () => {
    const blob = new Blob([E.serialize(ctx.progress)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `elemental-save-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    say('Save file downloaded.', true);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(E.serialize(ctx.progress)); say('Save data copied to the clipboard.', true); } catch { code.select(); say('Copy blocked by the browser: the save data is selected, copy it manually.', false); }
  };

  const pasted = h('textarea', { class: 'field', placeholder: 'Paste save data here, or choose a file…', 'aria-label': 'Save data to import', rows: 4 });
  const file = h('input', { type: 'file', accept: '.json,application/json,text/plain', 'aria-label': 'Save file to import' });
  const load = text => {
    let next;
    try { next = E.parseSave(text, ctx.index); } catch (err) { say(err.message, false); return; }
    const n = E.discoveredCount(next), cur = E.discoveredCount(ctx.progress);
    if (!confirm(`Replace your current progress (${cur} elements) with this save (${n} elements)?`)) return;
    ctx.importProgress(next);
    code.value = E.serialize(ctx.progress);
    say(`Save loaded: ${n} elements discovered.`, true);
  };
  file.addEventListener('change', async () => { const f = file.files?.[0]; if (f) load(await f.text()); file.value = ''; });

  const soundBox = h('input', { type: 'checkbox', id: 'opt-sound', checked: ctx.settings.sound });
  soundBox.addEventListener('change', () => ctx.setSound(soundBox.checked));

  let armed = 0;
  const resetBtn = h('button', { type: 'button', class: 'btn small danger' }, 'Reset all progress');
  resetBtn.addEventListener('click', () => {
    if (Date.now() - armed > 4000) { armed = Date.now(); resetBtn.textContent = 'Click again to erase everything'; return; }
    ctx.resetProgress();
    armed = 0;
    resetBtn.textContent = 'Reset all progress';
    code.value = E.serialize(ctx.progress);
    say('Progress reset. Back to air, water, earth and fire.', true);
  });

  openModal('Menu', h('div', {},
    h('h3', {}, 'How to play'),
    h('ul', {},
      h('li', {}, 'Drag an element from your list onto the workspace (or click / tap it to place it).'),
      h('li', {}, 'Drop one element onto another to combine them. You can also click one, then the other.'),
      h('li', {}, 'New discoveries join your list for good. If nothing happens, both elements stay put.'),
      h('li', {}, 'Most recipes work either way round. A few say “dropped onto”: those only work in that direction.'),
      h('li', {}, 'Double-click an element on the workspace to copy it; drag it back to the list (or press Delete) to remove it.'),
      h('li', {}, '★ marks a final element: it does not combine into anything else.'),
      h('li', {}, 'Shortcuts: / search · H hint · Ctrl+Z undo · Esc deselect.'),
    ),
    h('h3', {}, 'Save data'),
    h('p', { class: 'muted' }, 'Progress saves automatically in this browser. Export it to keep a backup or move it to another device.'),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn small primary', onclick: download }, 'Download save file'), h('button', { type: 'button', class: 'btn small', onclick: copy }, 'Copy save data')),
    h('p', {}, code),
    h('h3', {}, 'Import'),
    h('p', {}, pasted),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn small primary', onclick: () => load(pasted.value) }, 'Load pasted save'), file),
    msg,
    h('h3', {}, 'Settings'),
    h('p', {}, h('label', { class: 'row' }, soundBox, 'Sound effects')),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn small', onclick: () => { ctx.clearWorkspace(); closeModal(); } }, 'Clear workspace'), resetBtn),
  ), { narrow: true });
}

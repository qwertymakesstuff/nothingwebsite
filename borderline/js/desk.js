// The desk surface: where the entrant's papers lie and how the player handles them.
//   drag a document (mouse anywhere on it, touch by its header), or click it and then click
//   an empty spot, or focus it and use the arrow keys; Enter or double-click magnifies it.
//   Compare mode turns every field, seal and reference into a button; picking two runs
//   inspectionEngine.compare on them.
// Positions and selection are presentation only; they never touch the game state.
import { renderDocument } from './documentRenderer.js';
import { compare } from './inspectionEngine.js';
import { DOCUMENT_TYPES } from '../data/documents.js';
import { fieldOf, displayValue } from './documentFactory.js';
import { esc } from './html.js';

const GAP = 14, STEP = 20, BIG_STEP = 60, MIN_HEIGHT = 420;

export function createDesk({ tray, toolbar, result, examine }) {
  let visitor = null, stamp = null, today = null;
  let positions = {};   // docIndex → { x, y }
  let order = [];       // docIndex list, back to front
  let selected = null;  // docIndex
  let comparing = false, picked = [], lastResult = null;
  let moved = false;    // the player has arranged this entrant's papers by hand
  const sizes = new ResizeObserver(() => { if (visitor) apply(); }); // keep the desk tall enough

  const docEls = () => [...tray.querySelectorAll(':scope > .doc')];
  const docEl = i => tray.querySelector(`:scope > .doc[data-doc="${i}"]`);
  const docName = i => DOCUMENT_TYPES[visitor.documents[i].type].label;

  // --- layout ---------------------------------------------------------------
  // side by side if the papers fit; overlapping in a cascade on a desk too narrow for that;
  // stacked when each paper is nearly as wide as the desk (phones)
  function tidy() {
    const width = tray.clientWidth, els = docEls();
    const widths = els.map(el => el.offsetWidth);
    const total = widths.reduce((a, w) => a + w + GAP, 8);
    let x = 8, y = 8;
    els.forEach((el, n) => {
      positions[el.dataset.doc] = { x, y };
      if (total <= width) x += widths[n] + GAP;
      else if (Math.max(...widths) > width * 0.6) y += el.offsetHeight + GAP;
      else { x = Math.min(x + Math.max(120, (width - widths[n] - 16) / Math.max(1, els.length - 1)), width - (widths[n + 1] || 0) - 8); y += 46; }
    });
    order = els.map(el => Number(el.dataset.doc));
    apply();
  }

  function clamp(el, p) {
    const maxX = Math.max(0, tray.clientWidth - el.offsetWidth);
    return { x: Math.min(Math.max(0, p.x), maxX), y: Math.max(0, p.y) };
  }

  function apply() {
    let bottom = MIN_HEIGHT;
    for (const el of docEls()) {
      const i = el.dataset.doc;
      const p = positions[i] = clamp(el, positions[i] || { x: 8, y: 8 });
      el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
      el.style.zIndex = String(1 + order.indexOf(Number(i)));
      el.classList.toggle('selected', Number(i) === selected);
      bottom = Math.max(bottom, p.y + el.offsetHeight + 16);
    }
    tray.style.height = visitor ? `${bottom}px` : '';
  }

  function toFront(i) {
    order = [...order.filter(n => n !== i), i];
    apply();
  }

  function select(i) {
    selected = i;
    if (i !== null) toFront(i); else apply();
    hint();
  }

  function moveTo(i, p) {
    positions[i] = p; moved = true;
    apply();
  }

  // --- toolbar and hints ---------------------------------------------------------
  function hint() {
    const msg = !visitor ? '' : comparing
      ? (picked.length === 1 ? 'Now pick a second item to compare it with.' : 'Compare mode: pick a field, seal or rulebook entry.')
      : selected !== null ? `${docName(selected)} selected. Click an empty spot to move it, use the arrow keys, or press Enter to magnify.`
      : 'Drag papers to arrange them, or click one to select it.';
    toolbar.querySelector('.desk-hint').textContent = msg;
    const cmp = toolbar.querySelector('[data-desk="compare"]');
    cmp.setAttribute('aria-pressed', String(comparing));
    cmp.textContent = comparing ? 'Stop comparing' : 'Compare fields';
    for (const b of toolbar.querySelectorAll('button')) b.disabled = !visitor;
    toolbar.querySelector('[data-desk="examine"]').disabled = !visitor || selected === null;
  }

  // --- compare mode ------------------------------------------------------------
  // everything the player can compare: document fields, passport seals and [data-ref] items
  function itemFrom(el) {
    if (el.matches('.doc-field')) {
      const i = Number(el.dataset.doc), doc = visitor.documents[i], f = fieldOf(doc, el.dataset.field);
      return { kind: f.kind, value: doc[f.key], display: displayValue(f, doc[f.key]), label: f.label, where: docName(i).toLowerCase() };
    }
    if (el.matches('.doc-seal')) {
      return { kind: 'seal', value: el.dataset.seal, display: 'seal', label: 'Seal', where: 'passport' };
    }
    const d = el.dataset;
    return { kind: d.kind, value: d.list ? JSON.parse(d.list) : d.value, display: d.display, label: d.label, where: d.where };
  }

  const comparables = () => [...document.querySelectorAll('.tray .doc-field, .tray .doc-seal, [data-ref]')];

  function markComparables() {
    for (const el of comparables()) {
      el.classList.toggle('cmp-field', comparing);
      if (comparing) { el.setAttribute('role', 'button'); el.tabIndex = 0; } else { el.removeAttribute('role'); el.removeAttribute('tabindex'); }
      el.classList.remove('cmp-picked', 'cmp-match', 'cmp-mismatch', 'cmp-info');
      el.removeAttribute('aria-pressed');
    }
    picked.forEach(el => { if (el.isConnected) { el.classList.add('cmp-picked'); el.setAttribute('aria-pressed', 'true'); } });
    if (lastResult && picked.length === 2) for (const el of picked) el.classList.add(`cmp-${lastResult.status === 'unrelated' ? 'info' : lastResult.status}`);
  }

  function pick(el) {
    if (picked.length === 2) { picked = []; lastResult = null; }
    if (picked[0] === el) { picked = []; markComparables(); hint(); return; }
    picked.push(el);
    const holder = el.closest('.tray > .doc');
    if (holder) toFront(Number(holder.dataset.doc)); // a field on a covered paper comes into view
    if (picked.length === 2) {
      lastResult = compare(itemFrom(picked[0]), itemFrom(picked[1]), { today });
      result.textContent = lastResult.message;
      result.dataset.status = lastResult.status;
    } else {
      result.textContent = `Comparing: ${itemFrom(el).label} (${itemFrom(el).where}).`;
      result.dataset.status = 'pending';
    }
    markComparables(); hint();
  }

  function setComparing(on) {
    comparing = on; picked = []; lastResult = null;
    if (!on) { result.textContent = ''; delete result.dataset.status; }
    markComparables(); hint();
  }

  // --- magnifier -------------------------------------------------------------------
  let examineReturn = null;
  function openExamine(i) {
    examineReturn = document.activeElement;
    const body = examine.querySelector('.examine-body');
    const target = Math.max(0, visitor.documents.findIndex(d => d.type === 'passport'));
    body.innerHTML = renderDocument(visitor.documents[i], visitor, { docIndex: i, stamp: i === target ? stamp : null });
    examine.querySelector('.examine-title').textContent = `Examining: ${docName(i)}`;
    examine.hidden = false;
    examine.querySelector('[data-desk="closeExamine"]').focus();
  }
  function closeExamine() {
    examine.hidden = true;
    examineReturn?.focus?.();
  }

  // --- input -----------------------------------------------------------------------
  let drag = null, suppressClick = false;
  tray.addEventListener('pointerdown', e => {
    const el = e.target.closest('.doc');
    if (!el || e.button > 0) return;
    if (comparing && e.target.closest('.cmp-field')) return;      // a pick, handled on click
    suppressClick = false;
    if (e.pointerType === 'touch' && !e.target.closest('.doc-head')) return; // let the page scroll
    const i = Number(el.dataset.doc);
    toFront(i);
    drag = { i, el, id: e.pointerId, sx: e.clientX, sy: e.clientY, start: { ...positions[i] }, moved: false };
    el.setPointerCapture(e.pointerId);
  });
  tray.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true; drag.el.classList.add('dragging');
    moveTo(drag.i, { x: drag.start.x + dx, y: drag.start.y + dy });
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.el.classList.remove('dragging');
    suppressClick = drag.moved;
    drag = null;
  };
  tray.addEventListener('pointerup', endDrag);
  tray.addEventListener('pointercancel', endDrag);

  // picks can come from the tray, the date plate or the rulebook
  document.addEventListener('click', e => {
    const field = comparing && e.target.closest('.cmp-field');
    if (field) pick(field);
  });
  tray.addEventListener('click', e => {
    if (suppressClick) { suppressClick = false; return; } // the click that ends a drag
    if (comparing && e.target.closest('.cmp-field')) return;
    const el = e.target.closest('.doc');
    if (el) { select(Number(el.dataset.doc)); return; }
    if (selected !== null && visitor) { // click-to-place
      const r = tray.getBoundingClientRect(), d = docEl(selected);
      moveTo(selected, { x: e.clientX - r.left - d.offsetWidth / 2, y: e.clientY - r.top - 20 });
    }
  });
  tray.addEventListener('dblclick', e => {
    const el = e.target.closest('.doc');
    if (el && !comparing) openExamine(Number(el.dataset.doc));
  });
  tray.addEventListener('focusin', e => {
    if (e.target.matches('.doc')) select(Number(e.target.dataset.doc));
  });

  document.addEventListener('keydown', e => {
    if (!examine.hidden) { if (e.key === 'Escape') { e.preventDefault(); closeExamine(); } return; }
    const cmp = e.target.closest?.('.cmp-field');
    if (cmp && comparing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(cmp); return; }
    if (e.key === 'Escape' && comparing) { setComparing(false); return; }
    if (!e.target.matches?.('.tray > .doc')) return;
    const i = Number(e.target.dataset.doc);
    const step = e.shiftKey ? BIG_STEP : STEP;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (delta) { e.preventDefault(); moveTo(i, { x: positions[i].x + delta[0], y: positions[i].y + delta[1] }); return; }
    if (e.key === 'Enter') { e.preventDefault(); openExamine(i); }
    if (e.key === 'Escape') select(null);
  });

  toolbar.addEventListener('click', e => {
    const b = e.target.closest('[data-desk]');
    if (!b || b.disabled) return;
    if (b.dataset.desk === 'tidy') tidy();
    if (b.dataset.desk === 'compare') setComparing(!comparing);
    if (b.dataset.desk === 'examine' && selected !== null) openExamine(selected);
  });
  examine.addEventListener('click', e => {
    if (e.target === examine || e.target.closest('[data-desk="closeExamine"]')) closeExamine();
  });
  window.addEventListener('resize', () => { if (visitor) apply(); });

  return {
    // draw `v`'s papers; positions survive re-renders of the same entrant
    show(v, { stamp: s = null, arriving = false, date = null } = {}) {
      const changed = (v?.id ?? null) !== (visitor?.id ?? null);
      visitor = v; stamp = s; today = date;
      if (changed) { moved = false; positions = {}; order = []; selected = null; picked = []; lastResult = null; result.textContent = ''; delete result.dataset.status; }
      const target = v ? Math.max(0, v.documents.findIndex(d => d.type === 'passport')) : -1;
      tray.innerHTML = v
        ? v.documents.map((doc, i) => renderDocument(doc, v, { docIndex: i, stamp: i === target ? s : null })).join('')
        : '<p class="tray-empty">No documents on the desk.</p>';
      for (const el of docEls()) { el.tabIndex = 0; el.setAttribute('aria-roledescription', 'document'); }
      tray.classList.toggle('fresh', arriving);
      if (!v) { tray.style.height = ''; if (!examine.hidden) closeExamine(); }
      else if (changed) { tidy(); document.fonts?.ready.then(() => { if (visitor === v && !moved) tidy(); }); }
      else apply();
      for (const el of docEls()) sizes.observe(el);
      picked = picked.map(old => (old.isConnected ? old : findSame(old))).filter(Boolean);
      markComparables(); hint();
    },
    refreshComparables() { markComparables(); },
    firstDocument: () => docEls()[0] || null,
    get comparing() { return comparing; },
  };

  // after a re-render, find the element that stands for the same item as `old`
  function findSame(old) {
    const sel = old.classList.contains('doc-field') ? `.tray .doc-field[data-doc="${old.dataset.doc}"][data-field="${old.dataset.field}"]`
      : old.classList.contains('doc-seal') ? '.tray .doc-seal' : null;
    return sel ? document.querySelector(sel) : old;
  }
}

export const deskToolbarHTML = today => `
  <div class="desk-tools">
    <button type="button" class="btn small" data-desk="compare" aria-pressed="false">Compare fields</button>
    <button type="button" class="btn small" data-desk="examine">Magnify</button>
    <button type="button" class="btn small" data-desk="tidy">Tidy desk</button>
    <span class="date-plate" data-ref data-kind="today" data-value="${esc(today.value)}" data-display="${esc(today.display)}" data-label="Today's date" data-where="date plate">Today <b>${esc(today.display)}</b></span>
  </div>
  <p class="desk-hint"></p>`;

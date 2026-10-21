// The case catalogue: search, category filter, price sort, featured.

import { CASES, CASE_CATEGORIES } from '../cases.js';
import { ITEMS_BY_ID } from '../items.js';
import { caseCard, emptyState } from '../ui/components.js';
import { $, $$, esc } from '../ui/dom.js';

const state = { q: '', category: 'all', sort: 'featured' };
let redraw = null;

const SORTS = {
  featured: (a, b) => (b.featured - a.featured) || (a.price - b.price),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name),
};

export function filterCases({ q = '', category = 'all', sort = 'featured' } = {}) {
  const needle = q.trim().toLowerCase();
  return CASES.filter(c => {
    if (category === 'featured' ? !c.featured : category !== 'all' && c.category !== category) return false;
    if (!needle) return true;
    // Search matches the case name, its tagline, or any item it can drop.
    return c.name.toLowerCase().includes(needle) || c.tagline.toLowerCase().includes(needle) ||
      c.pool.some(id => ITEMS_BY_ID[id].name.toLowerCase().includes(needle));
  }).sort(SORTS[sort] || SORTS.featured);
}

export default {
  title: 'Cases',
  render(ctx) {
    const { root } = ctx;
    const chips = [['all', 'All'], ['featured', 'Featured'], ...CASE_CATEGORIES.map(c => [c.id, c.name])];
    root.innerHTML = `
<div class="toolbar">
  <label class="search"><span class="sr-only">Search cases</span><input type="search" id="caseSearch" placeholder="Search cases or items…" value="${esc(state.q)}" autocomplete="off"></label>
  <div class="chips" role="group" aria-label="Category">${chips.map(([id, name]) => `<button class="chip" data-cat="${id}" aria-pressed="${state.category === id}">${esc(name)}</button>`).join('')}</div>
  <label class="select"><span>Sort</span><select id="caseSort">
    <option value="featured">Featured first</option><option value="price-asc">Price: low to high</option>
    <option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
</div>
<p class="result-count muted small" id="caseCount"></p>
<div id="caseList"></div>`;
    $('#caseSort', root).value = state.sort;
    const draw = () => {
      const list = filterCases(state);
      $('#caseCount', root).textContent = `${list.length} of ${CASES.length} cases`;
      $('#caseList', root).innerHTML = list.length
        ? `<div class="case-grid">${list.map(c => caseCard(c, { coinsAvailable: ctx.store.player.coins })).join('')}</div>`
        : emptyState({ icon: 'search', title: 'No cases match', text: 'Try a different search or category.', action: '<button class="btn btn-ghost" id="clearCaseFilters">Clear filters</button>' });
      for (const b of $$('.chip', root)) b.setAttribute('aria-pressed', String(b.dataset.cat === state.category));
    };
    $('#caseSearch', root).addEventListener('input', e => { state.q = e.target.value; draw(); });
    $('#caseSort', root).addEventListener('change', e => { state.sort = e.target.value; draw(); });
    root.addEventListener('click', e => {
      const chip = e.target.closest('[data-cat]');
      if (chip) { state.category = chip.dataset.cat; draw(); }
      if (e.target.closest('#clearCaseFilters')) {
        Object.assign(state, { q: '', category: 'all' });
        $('#caseSearch', root).value = '';
        draw();
      }
    });
    redraw = draw;
    draw();
  },
  // Balance changes only affect the affordability marks; redraw the list, keep the inputs.
  onStore() { redraw?.(); },
  destroy() { redraw = null; },
};

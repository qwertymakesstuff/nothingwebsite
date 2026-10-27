// The Parts Store: buy new components (with shipping times and express delivery), browse the
// second-hand bargain bin, buy tools and supplies, manage and sell inventory, track orders,
// compare specifications side by side and plan a build with the compatibility checker.

import { h, button, svgEl } from '../dom.js';
import { report, toast, modal, confirmBox } from '../overlay.js';
import { play } from '../sound.js';
import { PART, CATEGORIES, CATEGORY, partsIn, specRows } from '../../data/catalog.js';
import { TOOLS, SUPPLIES } from '../../data/tools.js';
import { CUSTOMER } from '../../data/customers.js';
import { money, plural, gbLabel } from '../../core/util.js';
import * as E from '../../core/economy.js';
import { capacity, shelfUsed, supplierTier, storeDiscount } from '../../core/business.js';
import { resaleValue, FAULT_LABEL } from '../../core/parts.js';
import { analyzeSpec, missingParts, fitsWith } from '../../core/compat.js';
import { powerBudget, specOf } from '../../core/sim.js';
import { icon, inspectDef, inspectPart, specTable, emptyState, statusIcon, conditionText } from '../widgets.js';

export const keepScroll = true;

const TABS = [['parts', 'Components'], ['bargain', 'Bargain bin'], ['tools', 'Tools & supplies'], ['inventory', 'Inventory'], ['orders', 'Orders'], ['planner', 'Build planner']];

export function render(app, root) {
  const st = app.game.state;
  const tab = app.ui.storeTab || 'parts';
  const used = shelfUsed(st), cap = capacity(st);
  root.append(h('div.store',
    h('div.store-head',
      h('div.tabs', { role: 'tablist' }, TABS.map(([id, label]) => h('button.tab', { type: 'button', role: 'tab', class: id === tab ? 'on' : '', 'aria-selected': String(id === tab), on: { click: () => { app.ui.storeTab = id; app.render(); } } }, label, id === 'orders' && st.orders.length ? h('span.count', String(st.orders.length)) : null))),
      h('div.shelf-meter', { 'data-tip': 'Shelf space used by parts on your shelves and parts on order. Cases take 4, boards / PSUs / GPUs 2, everything else 1.' }, h('span', `Shelves ${used}/${cap}`), h('span.meter', h('span', { style: { width: `${Math.min(100, used / cap * 100)}%` }, class: used / cap > 0.9 ? 'full' : '' })))),
    ({ parts: partsTab, bargain: bargainTab, tools: toolsTab, inventory: inventoryTab, orders: ordersTab, planner: plannerTab }[tab] || partsTab)(app)));
  if (app.ui.compare.length) root.append(compareDrawer(app));
}

export function keySpecs(d) {
  switch (d.cat) {
    case 'cpu': return `${d.socket} · ${d.cores}C/${d.threads}T · ${d.ghz} GHz · ${d.tdp} W${d.igpu ? ' · iGPU' : ''}`;
    case 'motherboard': return `${d.socket} · ${d.form} · ${d.mem} ×${d.ramSlots} · M.2 ×${d.m2} · SATA ×${d.sata}`;
    case 'gpu': return `${d.perf * 100} GPU Mark · ${d.vram} GB · ${d.tdp} W · ${d.length} mm · ${d.pins ? `${d.pins}× 8-pin` : 'slot power'}`;
    case 'ram': return `${d.mem} · ${d.gb} GB · ${d.mhz} MT/s`;
    case 'storage': return `${d.kind.toUpperCase()} · ${gbLabel(d.gb)} · ${d.read} MB/s · ${d.iface === 'm2' ? 'M.2' : `SATA ${d.bay}"`}`;
    case 'psu': return `${d.watts} W · ${d.form} · grade ${d.grade} · ${d.pcie}× PCIe · ${d.sataPower}× SATA`;
    case 'cooler': return `${d.type === 'aio' ? `AIO ${d.radiator} mm` : `Air ${d.height} mm`} · ${d.capacity} W · ${d.noise} dB`;
    case 'fan': return `${d.size} mm · ${d.airflow} CFM · ${d.noise} dB${d.rgb ? ' · RGB' : ''}`;
    case 'case': return `${d.forms.join('/')} · GPU ${d.gpuMax} mm · cooler ${d.coolerMax} mm · ${d.psuForm}`;
    case 'os': return `${d.minRam} GB RAM · ${d.minStorage} GB disk`;
  }
  return '';
}

function benchSpec(app) {
  const st = app.game.state;
  const u = st.benches[app.ui.bench] || st.benches.find(Boolean);
  return u ? { spec: specOf(st, st.pcs[u]), name: st.pcs[u].name } : null;
}

function partsTab(app) {
  const g = app.game, st = g.state;
  const cat = app.ui.storeCat || 'cpu';
  const express = !!app.ui.express;
  const bench = benchSpec(app);
  const tierMax = supplierTier(st);
  const rows = partsIn(cat).filter(d => !d.unsold).map(d => {
    const locked = d.tier > tierMax;
    const days = E.shipDays(st, d, express);
    const unit = E.unitPrice(st, d);
    const fit = bench && cat !== 'os' ? fitsWith(bench.spec, d) : null;
    const owned = st.inventory.filter(u => st.parts[u] && st.parts[u].id === d.id).length + (d.cat === 'os' ? (st.licenses[d.id] || 0) : 0);
    const inCmp = app.ui.compare.includes(d.id);
    return h('div.shop-row', { class: locked ? 'locked' : '' },
      h('div.sr-art', icon(d)),
      h('div.sr-main', h('strong', d.full), h('span.sr-specs', keySpecs(d)),
        h('span.sr-meta', locked ? h('span.lock', `🔒 Tier ${d.tier}: needs a better supplier account (Business → Upgrades)`) : h('span', days === 0 ? 'In stock — on your shelf now' : `Ships in ${plural(days, 'day')}`), owned ? h('span.owned', ` · you have ${owned}`) : null,
          fit ? (fit.length ? h('span.fit-bad', { 'data-tip': fit.map(f => f.msg).join(' ') }, ` · ✖ conflicts with ${bench.name}`) : h('span.fit-ok', ` · ✔ fits ${bench.name}`)) : null)),
      h('div.sr-price', h('strong', money(unit)), storeDiscount(st) ? h('s.muted', money(d.price)) : null),
      h('div.sr-actions',
        h('label.cmp', { 'data-tip': 'Compare up to 3 parts' }, h('input', { type: 'checkbox', checked: inCmp, on: { change: e => { toggleCompare(app, d.id, e.target.checked); } } }), 'Compare'),
        button('Specs', () => inspectDef(d)),
        locked ? null : button(d.cat === 'ram' ? 'Buy 1' : 'Buy', () => buy(app, d.id, 1, express), { cls: 'primary' }),
        !locked && d.cat === 'ram' ? button('Buy 2', () => buy(app, d.id, 2, express)) : null));
  });
  return h('div.parts-tab',
    h('div.store-tools',
      h('div.chips', CATEGORIES.map(c => h('button.chip', { type: 'button', class: c.id === cat ? 'on' : '', on: { click: () => { app.ui.storeCat = c.id; app.render(); } } }, c.label))),
      h('label.express', { 'data-tip': 'Express shipping: one day faster for a fee (min $8, 12% of the order).' }, h('input', { type: 'checkbox', checked: express, on: { change: e => { app.ui.express = e.target.checked; app.render(true); } } }), ' Express delivery'),
      bench ? h('span.muted.small', `Badges compare against ${bench.name}.`) : null),
    h('div.shop-list', rows));
}

async function buy(app, id, qty, express) {
  const g = app.game, st = g.state;
  const c = E.canBuy(st, id, qty, express);
  if (!c.ok) return report(c);
  const d = PART[id];
  if (c.cost > 300 && app.settings.confirm && !(await confirmBox('Confirm purchase', `Buy ${qty} × ${d.full} for ${money(c.cost)}${c.days ? `, arriving ${c.days === 1 ? 'tomorrow' : `in ${c.days} days`}` : ''}?`, { ok: 'Buy' }))) return;
  const r = g.buy(id, qty, express);
  if (r.ok) { play('cash'); toast(r.arrived ? (d.cat === 'os' ? `${d.name} licence added (install it from the Testing screen).` : `${d.full} is on your shelf.`) : `Ordered. Arrives on day ${st.day + r.days}.`, 'good'); }
  else report(r);
}

function toggleCompare(app, id, on) {
  const c = app.ui.compare.filter(x => x !== id);
  if (on) { if (c.length >= 3) { toast('You can compare up to 3 parts.', 'warn'); app.render(true); return; } c.push(id); }
  app.ui.compare = c;
  app.render(true);
}

function compareDrawer(app) {
  const defs = app.ui.compare.map(id => PART[id]);
  const cats = new Set(defs.map(d => d.cat));
  const keys = [];
  for (const d of defs) for (const [k] of specRows(d)) if (!keys.includes(k)) keys.push(k);
  return h('div.compare', h('div.cmp-head', h('strong', 'Compare'), cats.size > 1 ? h('span.muted.small', ' (different categories)') : null, button('Clear', () => { app.ui.compare = []; app.render(true); }, { cls: 'small' })),
    h('div.cmp-scroll', h('table.cmp', h('thead', h('tr', h('th', ''), defs.map(d => h('th', icon(d), h('div', d.full), button('✕', () => toggleCompare(app, d.id, false), { cls: 'small', aria: `Remove ${d.full}` }))))),
      h('tbody', h('tr', h('th', 'Price'), defs.map(d => h('td', money(d.price)))), keys.map(k => h('tr', h('th', k), defs.map(d => { const r = specRows(d).find(x => x[0] === k); return h('td', r ? String(r[1]) : '—'); })))))));
}

function bargainTab(app) {
  const g = app.game, st = g.state;
  return h('div.bargain',
    h('p.muted', 'Second-hand parts from trade-ins and clearances. Cheap, but sold as-is: some have hidden faults and they wear out sooner. Test before you trust. New stock every two days.'),
    st.bargains.length ? h('div.bargain-grid', st.bargains.map(b => {
      const d = PART[b.id];
      return h('div.bargain-card', icon(d), h('strong', d.full), h('span.sr-specs', keySpecs(d)), h('span.muted', `Condition ~${b.cond}% · sold as-is`),
        h('div.bc-price', h('strong', money(b.price)), h('s.muted', money(d.price))),
        h('div.row', button('Specs', () => inspectDef(d)), button('Buy', () => { const r = g.buyBargain(b.key); if (r.ok) { play('cash'); toast(`${d.full} is on your shelf.`, 'good'); } else report(r); }, { cls: 'primary' })));
    })) : emptyState('Sold out. Fresh stock arrives soon.'));
}

function toolsTab(app) {
  const g = app.game, st = g.state;
  return h('div.tools-tab',
    h('section', h('h2', 'Diagnostic tools'), h('div.tool-grid', TOOLS.map(t => {
      const owned = !!st.tools[t.id];
      const lock = !owned && st.level < (t.level || 1);
      return h('div.tool-card', { class: owned ? 'owned' : lock ? 'locked' : '' }, h('strong', t.name), h('p', t.desc),
        h('div.tc-foot', owned ? h('span.good', '✔ Owned') : lock ? h('span.lock', `🔒 Level ${t.level}`) : button(`Buy ${money(t.price)}`, () => { const r = g.buyTool(t.id); if (r.ok) play('cash'); report(r, r.ok ? `${t.name} added to your tool wall.` : null, 'cash'); }, { cls: 'primary', disabled: st.money < t.price })));
    }))),
    h('section', h('h2', 'Supplies'), h('div.tool-grid', SUPPLIES.map(s => h('div.tool-card', h('strong', s.name), h('p', `${s.desc} You have ${st.consumables[s.id] || 0}.`),
      h('div.tc-foot', button(`Buy ${money(s.price)}`, () => { const r = g.buySupply(s.id, 1); report(r, r.ok ? `Bought ${s.name}.` : null, 'cash'); }, { cls: 'primary' }), button(`×3 ${money(s.price * 3)}`, () => { const r = g.buySupply(s.id, 3); report(r, r.ok ? `Bought 3 × ${s.name}.` : null, 'cash'); })))))));
}

function inventoryTab(app) {
  const g = app.game, st = g.state;
  const inv = st.inventory.map(u => st.parts[u]).filter(Boolean);
  const lic = Object.entries(st.licenses).filter(([, n]) => n > 0);
  const groups = CATEGORIES.filter(c => inv.some(p => PART[p.id].cat === c.id));
  return h('div.inventory',
    lic.length ? h('p', 'OS licences: ', lic.map(([id, n]) => h('span.tag', `${PART[id].name} ×${n}`))) : null,
    h('p.muted', `Supplies: ${st.consumables.paste} paste · ${st.consumables.air} air · ${st.consumables.wipes} wipes.`),
    groups.length ? groups.map(c => h('section', h('h3', c.label), h('div.inv-list', inv.filter(p => PART[p.id].cat === c.id).map(p => {
      const d = PART[p.id];
      const cust = p.owner !== 'shop';
      const sellable = E.canSell(st, p.uid);
      return h('div.inv-row', { class: cust ? 'customer' : '' }, h('div.sr-art', icon(d)),
        h('div.sr-main', h('strong', d.full), h('span.sr-specs', keySpecs(d)), h('span.muted.small', cust ? `Belongs to ${CUSTOMER[st.jobs[p.owner]?.customer]?.name || 'a customer'} — goes back with their machine` : `${conditionText(p)}${p.cost === 0 && p.used ? ' · came free' : ` · paid ${money(p.cost)}`}`), p.data && p.data.files.length ? h('span.warn-text.small', `Holds files: ${p.data.files.map(f => f.label).join(', ')}`) : null),
        h('div.sr-price', cust ? null : h('span', { 'data-tip': 'What the shop pays you for it' }, `Sell ${money(resaleValue(st, p.uid))}`)),
        h('div.sr-actions', button('Inspect', () => inspectPart(app, p.uid)), cust ? null : button('Sell', async () => {
          if (!sellable.ok) return report(sellable);
          if (!(await confirmBox('Sell this part?', `Sell the ${d.full} for ${money(sellable.value)}? You paid ${money(p.cost)}.`, { ok: 'Sell' }))) return;
          const r = g.sell(p.uid); if (r.ok) play('cash'); else report(r);
        }, { disabled: !sellable.ok, tip: sellable.ok ? null : sellable.reason })));
    })))) : emptyState('Your shelves are empty.'));
}

function ordersTab(app) {
  const g = app.game, st = g.state;
  return h('div.orders', st.orders.length ? h('table.orders-table', h('thead', h('tr', h('th', 'Items'), h('th', 'Paid'), h('th', 'Arrives'), h('th', ''))), h('tbody', st.orders.map(o => h('tr',
    h('td', `${o.items.length} × ${PART[o.items[0]].full}`), h('td', money(o.unit * o.items.length)), h('td', `Day ${o.arrive}${o.express ? ' (express)' : ''}`),
    h('td', o.placed === st.day ? button('Cancel', async () => { if (await confirmBox('Cancel order?', 'You\'ll get the parts money back (shipping fees are not refunded).', { ok: 'Cancel order' })) report(g.cancelOrder(o.id), 'Order cancelled and refunded.'); }, { cls: 'small' }) : h('span.muted', 'shipped')))))) : emptyState('Nothing on order. Parts above tier 1 ship from the warehouse.'),
    h('h3', 'Recent purchases'), h('ul.ledger-mini', st.ledger.filter(l => ['parts', 'shipping', 'tools', 'licence', 'sale', 'refund'].includes(l.kind)).slice(-12).reverse().map(l => h('li', h('span.muted', `Day ${l.day}`), h('span', l.label), h('span', { class: l.amount < 0 ? 'neg' : 'pos' }, money(l.amount))))));
}

// ---- compatibility planner: pick a part per category, see every problem and the totals
function plannerTab(app) {
  const plan = app.ui.plan;
  const pick = cat => (plan[cat] ? PART[plan[cat]] : null);
  const spec = { case: pick('case'), motherboard: pick('motherboard'), cpu: pick('cpu'), cooler: pick('cooler'), gpu: pick('gpu'), psu: pick('psu'), os: pick('os'), ram: Array(plan.ramN || 0).fill(pick('ram')).filter(Boolean), storage: [pick('storage'), pick('storage2')].filter(Boolean), fans: Array(plan.fanN || 0).fill(pick('fan')).filter(Boolean) };
  const issues = analyzeSpec(spec);
  const miss = missingParts(spec);
  const price = ['case', 'motherboard', 'cpu', 'cooler', 'gpu', 'psu', 'os'].reduce((s, c) => s + (spec[c] ? spec[c].price : 0), 0) + spec.ram.reduce((s, d) => s + d.price, 0) + spec.storage.reduce((s, d) => s + d.price, 0) + spec.fans.reduce((s, d) => s + d.price, 0);
  const cpuMark = spec.cpu ? Math.round(spec.cpu.single * 35 + spec.cpu.multi * 5) : 0;
  const gpuMark = spec.gpu ? spec.gpu.perf * 100 : spec.cpu ? spec.cpu.igpu * 100 : 0;
  const sel = (cat, key = cat, list = partsIn(cat === 'storage2' ? 'storage' : cat)) => h('select', { 'aria-label': key, on: { change: e => { if (e.target.value) plan[key] = e.target.value; else delete plan[key]; app.render(true); } } },
    h('option', { value: '' }, '— none —'), list.filter(d => !d.unsold).map(d => {
      const f = fitsWith({ ...spec, [cat === 'storage2' ? 'storage' : cat]: cat === 'ram' || cat === 'fan' ? undefined : null, ram: cat === 'ram' ? [] : spec.ram, fans: cat === 'fan' ? [] : spec.fans, storage: cat.startsWith('storage') ? spec.storage.filter(x => x !== pick(key)) : spec.storage }, d);
      return h('option', { value: d.id, selected: plan[key] === d.id }, `${f.length ? '✖ ' : ''}${d.full} — ${money(d.price)}`);
    }));
  const count = (key, max) => h('select', { 'aria-label': `${key} count`, on: { change: e => { plan[key] = +e.target.value; app.render(true); } } }, Array.from({ length: max + 1 }, (_, i) => h('option', { value: i, selected: (plan[key] || 0) === i }, `×${i}`)));
  const row = (label, ...ctl) => h('div.plan-row', h('span.pl-label', label), ...ctl);
  const bench = benchSpec(app);
  return h('div.planner',
    h('p.muted', 'Plan a build before buying anything. Options marked ✖ conflict with what you\'ve picked so far.'),
    h('div.plan-grid',
      h('div.plan-form',
        row('Case', sel('case')), row('Motherboard', sel('motherboard')), row('CPU', sel('cpu')), row('CPU cooler', sel('cooler')),
        row('Memory', sel('ram'), count('ramN', 4)), row('Drive 1', sel('storage')), row('Drive 2', sel('storage2', 'storage2')), row('Power supply', sel('psu')),
        row('Graphics card', sel('gpu')), row('Case fans', sel('fan'), count('fanN', 6)), row('OS', sel('os')),
        h('div.row', button('Clear', () => { app.ui.plan = {}; app.render(true); }), bench ? button(`Load ${bench.name}`, () => { app.ui.plan = fromSpec(bench.spec); app.render(true); }) : null)),
      h('div.plan-result',
        h('div.plan-totals', fact('Parts total', money(price)), fact('Peak power', `${powerBudget(spec)} W`), fact('CPU Mark (est.)', cpuMark.toLocaleString('en-US')), fact('GPU Mark (est.)', gpuMark.toLocaleString('en-US'))),
        miss.length ? h('p.warn-text', `Still missing: ${miss.map(m => CATEGORY[m].one.toLowerCase()).join(', ')}.`) : null,
        issues.length ? h('ul.checks', issues.map(i => h(`li.${i.level === 'error' ? 'missing' : 'warnrow'}`, statusIcon(i.level === 'error' ? 'bad' : 'warn'), h('span', i.msg)))) : (miss.length ? null : h('p.good', '✔ Everything is compatible.')),
        h('div.row', button('Add everything to the cart…', () => buyPlan(app, spec), { cls: 'primary', disabled: !price })))));
}

const fact = (k, v) => h('div.fact', h('span', k), h('strong', v));

function fromSpec(sp) {
  const p = {};
  for (const c of ['case', 'motherboard', 'cpu', 'cooler', 'gpu', 'psu']) if (sp[c]) p[c] = sp[c].id;
  if (sp.ram.length) { p.ram = sp.ram[0].id; p.ramN = sp.ram.length; }
  if (sp.storage[0]) p.storage = sp.storage[0].id;
  if (sp.storage[1]) p.storage2 = sp.storage[1].id;
  if (sp.fans.length) { p.fan = sp.fans[0].id; p.fanN = sp.fans.length; }
  return p;
}

async function buyPlan(app, spec) {
  const g = app.game;
  const items = [];
  for (const c of ['case', 'motherboard', 'cpu', 'cooler', 'gpu', 'psu', 'os']) if (spec[c]) items.push([spec[c].id, 1]);
  if (spec.ram.length) items.push([spec.ram[0].id, spec.ram.length]);
  for (const d of spec.storage) items.push([d.id, 1]);
  if (spec.fans.length) items.push([spec.fans[0].id, spec.fans.length]);
  const total = items.reduce((s, [id, n]) => s + E.unitPrice(g.state, PART[id]) * n, 0);
  if (!(await confirmBox('Buy the whole plan?', `${items.length} line items for about ${money(total)}. Parts above tier 1 ship from the warehouse.`, { ok: 'Buy all', force: true }))) return;
  let bought = 0;
  for (const [id, n] of items) { const r = g.buy(id, n, !!app.ui.express); if (!r.ok) { report(r); break; } bought++; }
  if (bought) { play('cash'); toast(`Bought ${bought} of ${items.length} line items.`, bought === items.length ? 'good' : 'warn'); }
}

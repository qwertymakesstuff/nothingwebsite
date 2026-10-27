// Reusable interface pieces: part cards, spec tables, inspection dialogs, job cards, customer
// badges, requirement checklists and the evidence notebook.

import { h, svgEl, button } from './dom.js';
import { partIcon, portrait } from './art.js';
import { modal } from './overlay.js';
import { PART, CATEGORY, specRows } from '../data/catalog.js';
import { CUSTOMER, PERSONALITIES } from '../data/customers.js';
import { FAULT_LABEL, resaleValue } from '../core/parts.js';
import { KIND_LABEL } from '../core/jobs.js';
import { TEST_LABEL } from '../core/testing.js';
import { money, gbLabel } from '../core/util.js';
import { PASTE_LABEL } from '../core/pc.js';

export const icon = (d, opts) => svgEl(partIcon(d, opts));

export function statusIcon(level) {
  return h(`span.sicon.${level}`, { 'aria-hidden': 'true' }, { good: '✔', ok: '✔', bad: '✖', error: '✖', warn: '▲', info: '●' }[level] || '●');
}

export function specTable(d, extra = []) {
  return h('table.specs', h('tbody', [...extra, ...specRows(d)].map(([k, v]) => h('tr', h('th', k), h('td', String(v))))));
}

export function conditionText(p) {
  if (!p) return '';
  return `${p.used ? 'Used' : 'New'} · condition ${Math.round(p.cond)}%`;
}

// inspection dialog for a physical part (what the player can tell by looking at it)
export function inspectPart(app, uid, opts = {}) {
  const s = app.game.state, p = s.parts[uid];
  if (!p) return;
  const d = PART[p.id];
  const rows = [['Manufacturer', d.brand], ['Category', CATEGORY[d.cat].one], ['Condition', conditionText(p)], ['Retail price', money(d.price)], ['Resale value', p.owner === 'shop' ? money(resaleValue(s, uid)) : '— (customer\'s part)']];
  if (p.owner !== 'shop') rows.push(['Owner', CUSTOMER[s.jobs[p.owner]?.customer]?.name || 'Customer']);
  if (p.fault && opts.known) rows.push(['Known fault', FAULT_LABEL[p.fault] || p.fault]);
  if (p.data) {
    rows.push(['Contents', p.data.os ? `${PART[p.data.os].name}${p.data.osOk ? '' : ' (damaged)'}` : 'No OS']);
    if (p.data.files.length) rows.push(['Personal files', p.data.files.map(f => `${f.label} (${gbLabel(f.gb)}${f.pct < 100 ? `, ${f.pct}% intact` : ''})`).join(', ')]);
  }
  if (p.bios) rows.push(['BIOS', `Memory profile ${p.bios.xmp ? 'on' : 'off'}, fans ${p.bios.fan}`]);
  if (d.cat === 'cooler') rows.push(['Paste', p.pasteFresh ? 'Fresh pre-applied paste' : 'No pre-applied paste']);
  const body = h('div.inspect',
    h('div.inspect-art', icon(d, { rot: opts.rot })),
    h('div.inspect-info', h('p.lede', d.full), specTable(d, rows), opts.compat ? opts.compat : null, opts.extra || null));
  modal({ title: CATEGORY[d.cat].one, body, wide: true, actions: opts.actions || [{ label: 'Close', cls: 'primary' }] });
}

export function inspectDef(d, opts = {}) {
  modal({ title: d.full, wide: true, body: h('div.inspect', h('div.inspect-art', icon(d)), h('div.inspect-info', h('p.lede', `${CATEGORY[d.cat].one} by ${d.brand}`), specTable(d, [['Price', money(d.price)], ['Typical resale', money(Math.round(d.price * CATEGORY[d.cat].resale))]]), opts.extra || null)), actions: opts.actions || [{ label: 'Close', cls: 'primary' }] });
}

export function partCard(app, uid, opts = {}) {
  const s = app.game.state, p = s.parts[uid], d = PART[p.id];
  const card = h('div.part-card', { tabindex: 0, role: 'button', 'data-uid': uid, class: [opts.selected ? 'selected' : '', opts.disabled ? 'disabled' : '', p.owner !== 'shop' ? 'customer' : ''], 'aria-label': `${d.full}${p.owner !== 'shop' ? ' (customer part)' : ''}`, 'data-tip': opts.tip || null },
    h('div.pc-art', icon(d, { rot: opts.rot })),
    h('div.pc-text', h('span.pc-name', d.name), h('span.pc-sub', `${d.brand}${p.used ? ' · used' : ''}${p.owner !== 'shop' ? ' · customer\'s' : ''}`)),
    opts.badge || null);
  return card;
}

export function customerBadge(job, size = 48) {
  const c = CUSTOMER[job.customer];
  const pers = PERSONALITIES[c.trait];
  return h('div.cust', svgEl(portrait(c.name, size, !!c.org)), h('div.cust-text', h('strong', c.name), c.biz && !c.org ? h('span.muted', c.biz) : null, h('span.trait', { 'data-tip': pers.blurb }, pers.label)));
}

export function reqList(job) {
  const R = job.req, out = [];
  if (R.cpuMark) out.push(`CPU Mark ≥ ${R.cpuMark.toLocaleString('en-US')}`);
  if (R.gpuMark) out.push(`GPU Mark ≥ ${R.gpuMark.toLocaleString('en-US')}`);
  if (R.ramGB) out.push(`${R.ramGB} GB+ memory`);
  if (R.storageGB) out.push(`${gbLabel(R.storageGB)}+ boot drive`);
  if (R.ssd) out.push('Boots from an SSD');
  if (R.os) out.push({ lumen: 'Lumen OS', harbor: 'Harbor OS Workstation', fernix: 'Fernix Linux' }[R.os]);
  if (R.maxTemp) out.push(`CPU ≤ ${R.maxTemp}°C under load`);
  if (R.maxNoise) out.push(`≤ ${R.maxNoise} dB under load`);
  if (R.form) out.push(`${R.form} motherboard`);
  if (R.newOnly) out.push('New parts only');
  if (R.partsCap) out.push(`Parts must cost ≤ ${money(R.partsCap)}`);
  if (R.keep) out.push(`Keep the original ${R.keep.join(', ')}`);
  if (R.files) out.push(`Keep ${R.files === 100 ? 'all' : `${R.files}%+ of`} personal files`);
  if (R.healthy) out.push('Every fault fixed');
  if (R.identical) out.push('All machines identical');
  return out;
}

export function jobSummaryRows(job) {
  return h('div.job-facts',
    fact(job.kind === 'build' || job.kind === 'fleet' ? 'Pays' : 'Labour fee', job.kind === 'build' || job.kind === 'fleet' ? money(job.budget) : money(job.fee)),
    job.kind !== 'build' && job.kind !== 'fleet' ? fact('Budget limit', money(job.budget), 'The most the customer will pay, parts included.') : fact('Budget', 'All-in', 'The price covers parts and labour: whatever you don\'t spend on parts is profit.'),
    fact('Due', `Day ${job.deadline}`, 'Deliver by the end of this day. One day late is allowed with a penalty; after that the job fails.'),
    fact('Tier', ['', 'Neighbourhood', 'Small business', 'Enthusiast', 'Premium', 'Specialist'][job.tier]));
}
const fact = (k, v, tip) => h('div.fact', { 'data-tip': tip || null }, h('span', k), h('strong', v));

export function kindBadge(job) { return h(`span.kind.k-${job.kind}`, KIND_LABEL[job.kind]); }

export function testsList(job) { return h('ul.tests', job.tests.map(t => h('li', TEST_LABEL[t]))); }

export function checkRows(rows) {
  return h('ul.checks', rows.map(r => h(`li.${r.ok ? 'ok' : r.kind === 'bonus' ? 'optional' : 'missing'}`, statusIcon(r.ok ? 'good' : r.kind === 'bonus' ? 'info' : 'bad'), h('span.ck-label', r.kind === 'bonus' ? `Bonus: ${r.label}` : r.label), r.detail ? h('span.ck-detail', r.detail) : null)));
}

export function evidenceList(pc) {
  if (!pc.evidence.length) return h('p.muted', 'No findings yet. Inspect, power on and run tools to gather evidence.');
  return h('ul.evidence', [...pc.evidence].reverse().map(e => h(`li.${e.level}`, statusIcon(e.level), h('span', e.text), h('span.ev-day', `day ${e.day}`))));
}

export function pasteLabel(pc) { return PASTE_LABEL[pc.paste.state]; }

export function stars(n) { return h('span.stars', { 'aria-label': `${n} out of 5 stars` }, '★'.repeat(n), h('span.dim', '★'.repeat(5 - n))); }

export function emptyState(text, action) { return h('div.empty', h('p', text), action || null); }

export { button };

// Customer Jobs: the job board (offers), active jobs with their requirements and machines,
// delivery with an invoice the player sets, and the history of completed and failed jobs.

import { h, button, svgEl } from '../dom.js';
import { report, toast, modal, confirmBox } from '../overlay.js';
import { play } from '../sound.js';
import { PART } from '../../data/catalog.js';
import { CUSTOMER, PERSONALITIES } from '../../data/customers.js';
import { TIERS } from '../../data/jobs.js';
import { money, plural } from '../../core/util.js';
import { unlockedTiers, KIND_LABEL } from '../../core/jobs.js';
import { TEST_LABEL } from '../../core/testing.js';
import { customerBadge, reqList, jobSummaryRows, kindBadge, checkRows, stars, emptyState, statusIcon } from '../widgets.js';

export const keepScroll = true;

export function render(app, root) {
  const g = app.game, st = g.state;
  const all = Object.values(st.jobs);
  const groups = {
    offers: all.filter(j => j.status === 'offered'),
    active: all.filter(j => j.status === 'active'),
    completed: all.filter(j => j.status === 'completed'),
    failed: all.filter(j => ['failed', 'cancelled'].includes(j.status)),
  };
  if (app.ui.openJob && st.jobs[app.ui.openJob]) {
    const j = st.jobs[app.ui.openJob];
    app.ui.jobsTab = j.status === 'offered' ? 'offers' : j.status === 'active' ? 'active' : j.status === 'completed' ? 'completed' : 'failed';
  }
  const tab = app.ui.jobsTab || 'offers';
  const label = { offers: 'Offers', active: 'Active', completed: 'Completed', failed: 'Failed & cancelled' };
  const tiers = unlockedTiers(st);
  root.append(h('div.jobs',
    h('div.jobs-head',
      h('div.tabs', { role: 'tablist' }, Object.keys(groups).map(k => h('button.tab', { type: 'button', role: 'tab', class: k === tab ? 'on' : '', 'aria-selected': String(k === tab), on: { click: () => { app.ui.jobsTab = k; app.ui.openJob = null; app.render(); } } }, label[k], h('span.count', String(groups[k].length))))),
      h('div.tier-line', 'Customers: ', TIERS.map(t => h('span.tier', { class: tiers.includes(t.tier) ? 'on' : '', 'data-tip': tiers.includes(t.tier) ? 'Unlocked' : `Needs level ${t.level}, reputation ${t.rep}${t.needs ? ' and an upgrade (' + (t.needs === 'showroom' ? 'Showroom' : 'Specialist certification') + ')' : ''}` }, t.label)))),
    h('div.job-cards', groups[tab].length ? sortJobs(groups[tab], tab).map(j => jobCard(app, j)) : emptyState({ offers: 'No offers right now. New customers arrive every morning (end the day).', active: 'No active jobs. Accept an offer.', completed: 'Nothing completed yet.', failed: 'Nothing has failed. Keep it that way!' }[tab]))));
  if (app.ui.deliverPc && app.ui.openJob) {
    const j = st.jobs[app.ui.openJob], pcU = app.ui.deliverPc;
    app.ui.deliverPc = null;
    if (j && j.status === 'active' && st.pcs[pcU]) setTimeout(() => deliverFlow(app, j, pcU), 0);
  }
  if (app.ui.openJob) {
    const el = root.querySelector(`[data-job="${app.ui.openJob}"]`);
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center' }), 0);
    app.ui.openJob = null;
  }
}

function sortJobs(list, tab) {
  if (tab === 'offers' || tab === 'active') return list.sort((a, b) => a.deadline - b.deadline);
  return list.sort((a, b) => (b.closedDay || 0) - (a.closedDay || 0));
}

function jobCard(app, j) {
  const g = app.game, st = g.state;
  const late = j.status === 'active' && st.day > j.deadline;
  const due = j.status === 'active' && st.day === j.deadline;
  const card = h('article.job-card', { 'data-job': j.id, class: [late ? 'late' : '', due ? 'due' : '', `st-${j.status}`] },
    h('header.jc-head', customerBadge(j, 52), h('div.jc-title', kindBadge(j), h('h3', j.title))),
    h('p.story', `“${j.story}”`),
    jobSummaryRows(j),
    h('div.jc-cols',
      h('div', h('h4', 'Requirements'), h('ul.reqs', reqList(j).map(r => h('li', r)))),
      h('div', h('h4', 'Tests before delivery'), h('ul.reqs', j.tests.map(t => h('li', TEST_LABEL[t])))),
      j.bonus.length ? h('div', h('h4', 'Bonus objectives'), h('ul.reqs.bonus', j.bonus.map(b => h('li', `${b.label} (+${money(b.cash)})`)))) : null));
  if (j.kind === 'upgrade' && j.keepOld) card.append(h('p.muted.small', 'The customer says you can keep the parts you take out.'));
  if (j.status === 'offered') {
    const c = g.canAccept(j.id);
    card.append(h('footer.jc-foot',
      h('span.muted', `Offer expires end of day ${j.expires}. ${j.machines.length ? `Brings ${plural(j.machines.length, 'machine')} to your intake rack.` : 'You supply all the parts.'}`),
      button('Decline', () => { report(g.decline(j.id)); }),
      button('Accept', () => { const r = g.accept(j.id); if (r.ok) { app.ui.jobsTab = 'active'; app.ui.openJob = j.id; } report(r, r.ok ? (j.machines.length ? 'Accepted. The machine is on your intake rack.' : 'Accepted. Buy parts and start a build.') : null, 'good'); }, { cls: 'primary', disabled: !c.ok, tip: c.ok ? null : c.reason })));
  } else if (j.status === 'active') {
    card.append(machinesBox(app, j));
    card.append(h('footer.jc-foot',
      h('span', { class: late ? 'bad-text' : due ? 'warn-text' : 'muted' }, late ? `Late! Deliver today or the job fails tonight.` : due ? 'Due today.' : `Due in ${plural(j.deadline - st.day, 'day')}.`),
      button('Cancel job…', async () => {
        if (!(await confirmBox('Cancel this job?', `${CUSTOMER[j.customer].name} will collect ${j.machines.length ? 'their machine as it is' : 'nothing'}. Your parts come back to your shelf. Reputation −3.`, { ok: 'Cancel job', danger: true }))) return;
        report(g.cancel(j.id), 'Job cancelled.');
      }),
      button('Deliver…', () => deliverFlow(app, j), { cls: 'primary' })));
  } else {
    card.append(resultBox(j));
  }
  return card;
}

function machinesBox(app, j) {
  const g = app.game, st = g.state;
  if (j.kind === 'build' || j.kind === 'fleet') {
    const done = j.kind === 'fleet' ? `${j.delivered.length}/${j.count} delivered. ` : '';
    return h('p.muted.small', `${done}Build the machine on a bench, test it, then deliver it here.`);
  }
  return h('ul.jc-machines', j.machines.map(u => {
    const pc = st.pcs[u];
    if (!pc) return h('li', h('span.muted', 'Delivered'));
    return h('li', h('strong', pc.name), h('span.muted', ` — ${g.location(u)}`), g.benchOf(u) >= 0 ? button('Work on it', () => { app.ui.bench = g.benchOf(u); app.go('assembly'); }, { cls: 'small' }) : button('Put on a bench', () => {
      const free = st.benches.findIndex(b => !b);
      if (free < 0) return report({ ok: false, reason: 'All benches are busy. Move a machine to the rack first (Workshop).' });
      report(g.toBench(u, free));
    }, { cls: 'small' }));
  }));
}

function resultBox(j) {
  const r = j.result || {};
  if (j.status !== 'completed') return h('div.result.fail', h('p', statusIcon('bad'), ` ${r.message || 'Failed.'}`), r.rep ? h('p.muted', `Reputation ${r.rep}`) : null);
  return h('div.result',
    h('div.res-top', stars(r.stars || 0), h('span.muted', `Satisfaction ${r.sat}%`)),
    h('p.review', r.message),
    h('div.res-money', fin('Paid', r.paid), r.bonusCash ? fin('Bonuses', r.bonusCash) : null, r.tip ? fin('Tip', r.tip) : null, r.refund ? fin('Refund', -r.refund) : null, fin('Parts cost', -r.partsCost), fin('Profit', r.profit, true), h('span.fin', `Rep ${r.rep >= 0 ? '+' : ''}${r.rep}`), h('span.fin', `+${r.xp} XP`)),
    r.issues && r.issues.length ? h('p.bad-text', `Came back with: ${r.issues.join('; ')}.`) : null);
}
const fin = (k, v, strong) => h('span.fin', { class: [v < 0 ? 'neg' : '', strong ? 'strong' : ''] }, `${k} ${money(v)}`);

function candidates(app, j) {
  const st = app.game.state;
  if (j.kind === 'build' || j.kind === 'fleet') return Object.values(st.pcs).filter(p => p.owner === 'shop' && (st.benches.includes(p.uid) || st.intake.includes(p.uid)));
  return j.machines.map(u => st.pcs[u]).filter(Boolean);
}

function deliverFlow(app, j, pcU) {
  const g = app.game, st = g.state;
  const list = candidates(app, j);
  if (!list.length) return report({ ok: false, reason: j.kind === 'build' || j.kind === 'fleet' ? 'You have no finished shop build to deliver. Build one on a bench first.' : 'The customer\'s machine isn\'t here.' });
  let pick = pcU || (list.length === 1 ? list[0].uid : null);
  if (!pick) {
    const scored = list.map(p => ({ p, c: g.check(j.id, p.uid) })).sort((a, b) => b.c.canDeliver - a.c.canDeliver);
    modal({ title: 'Which machine?', wide: true, body: h('div.pick-machines', scored.map(({ p, c }) => h('div.pick', h('div.pick-head', h('strong', p.name), h('span.muted', g.location(p.uid)), button(c.canDeliver ? 'Deliver this one' : 'Show checklist', close => { deliverFlow(app, j, p.uid); }, { cls: c.canDeliver ? 'primary small' : 'small' })), checkRows(c.rows.filter(r => !r.ok || r.kind === 'bonus').slice(0, 6))))), actions: [{ label: 'Close' }] });
    return;
  }
  const chk = g.check(j.id, pick);
  if (!chk.canDeliver) {
    modal({ title: 'Not ready yet', wide: true, body: h('div', h('p', 'The customer won\'t accept it until every requirement and test passes on the machine as it is now:'), checkRows(chk.rows)), actions: [{ label: 'Go to testing', onClick: () => { app.ui.bench = Math.max(0, g.benchOf(pick)); app.go('testing'); } }, { label: 'OK', cls: 'primary' }] });
    return;
  }
  const q = g.quote(j.id, pick);
  const pers = PERSONALITIES[CUSTOMER[j.customer].trait];
  if (q.fixed) {
    const profit = q.price - q.partsCost;
    modal({
      title: `Deliver to ${CUSTOMER[j.customer].name}`, wide: true,
      body: h('div.invoice', checkRows(chk.rows), h('table.inv', h('tbody', h('tr', h('th', j.kind === 'fleet' ? 'Price per machine' : 'Agreed price'), h('td', money(q.price))), h('tr', h('th', 'Your parts cost'), h('td', money(-q.partsCost))), h('tr.total', h('th', 'Profit on parts'), h('td', { class: profit < 0 ? 'neg' : 'pos' }, money(profit)))))),
      actions: [{ label: 'Not yet' }, { label: 'Hand it over', cls: 'primary', onClick: () => finish(app, g.deliver(j.id, pick)) }],
    });
    return;
  }
  let labor = q.fee, markup = 0;
  const skip = new Set();
  const total = () => labor + Math.round(q.lines.filter(l => !skip.has(l.uid)).reduce((a, l) => a + l.price * (1 + markup), 0));
  const fair = q.fee + q.lines.reduce((a, l) => a + l.price, 0);
  const totalEl = h('strong'), warnEl = h('p.small');
  const update = () => {
    const t = total();
    totalEl.textContent = money(Math.min(t, q.budget));
    const ratio = t / fair;
    warnEl.className = 'small ' + (t > q.budget ? 'bad-text' : ratio > 1.15 ? 'warn-text' : 'muted');
    warnEl.textContent = t > q.budget ? `Over the customer's ${money(q.budget)} limit: they'll pay ${money(q.budget)} and be unhappy.` : ratio > 1.15 ? `${Math.round((ratio - 1) * 100)}% above a fair price. ${pers.label} customers ${pers.priceSens > 1 ? 'really' : ''} notice.` : ratio < 0.95 ? 'Below a fair price: the customer will appreciate it.' : 'A fair price.';
  };
  const laborIn = h('input', { type: 'range', min: Math.round(q.fee * 0.5), max: Math.round(q.fee * 1.6), step: 5, value: labor, 'aria-label': 'Labour charge' });
  const laborOut = h('output', money(labor));
  laborIn.addEventListener('input', () => { labor = +laborIn.value; laborOut.textContent = money(labor); update(); });
  const markSel = h('select', { 'aria-label': 'Parts markup', on: { change: e => { markup = +e.target.value; update(); } } }, [0, 0.1, 0.2, 0.3].map(m => h('option', { value: m }, m ? `+${m * 100}%` : 'At retail')));
  const lines = q.lines.map(l => h('tr', h('td', h('label', h('input', { type: 'checkbox', checked: true, on: { change: e => { if (e.target.checked) skip.delete(l.uid); else skip.add(l.uid); update(); } } }), ` ${l.label}`)), h('td', money(l.price)), h('td.muted', `cost you ${money(l.cost)}`)));
  update();
  modal({
    title: `Invoice for ${CUSTOMER[j.customer].name}`, wide: true,
    body: h('div.invoice',
      h('p.muted', `${pers.label}: ${pers.blurb} Their limit is ${money(q.budget)}.`),
      h('div.inv-row', h('label', 'Labour', laborIn), laborOut, h('span.muted.small', `suggested ${money(q.fee)}`)),
      q.lines.length ? h('div', h('h4', 'Replacement parts (untick to absorb the cost yourself)'), h('table.inv', h('tbody', lines)), h('label.inv-row', 'Parts pricing ', markSel)) : h('p.muted', 'No replacement parts were used.'),
      h('div.inv-total', 'Invoice total: ', totalEl), warnEl,
      h('p.muted.small', 'Charging for a part that wasn\'t actually broken upsets customers if they find out.')),
    actions: [{ label: 'Not yet' }, { label: 'Send invoice & hand over', cls: 'primary', onClick: () => finish(app, g.deliver(j.id, pick, { labor, markup, skip: [...skip] })) }],
  });
}

function finish(app, r) {
  if (!r.ok) return report(r);
  if (r.partial) { play('cash'); toast(`Delivered. Paid ${money(r.paid)} for this machine.`, 'good'); return; }
  const res = r.result;
  play(res.issues && res.issues.length ? 'error' : 'cash');
  modal({
    title: res.issues && res.issues.length ? 'The customer came back…' : 'Job complete',
    body: h('div.result-dialog', h('div.res-top', stars(res.stars), h('span.muted', `Satisfaction ${res.sat}%`)), h('p.review', res.message),
      h('table.inv', h('tbody',
        h('tr', h('th', 'Paid'), h('td', money(res.paid))),
        res.bonusCash ? h('tr', h('th', 'Bonus objectives'), h('td.pos', money(res.bonusCash))) : null,
        res.tip ? h('tr', h('th', 'Tip'), h('td.pos', money(res.tip))) : null,
        res.refund ? h('tr', h('th', 'Comeback refund'), h('td.neg', money(-res.refund))) : null,
        h('tr', h('th', 'Parts you supplied'), h('td.neg', money(-res.partsCost))),
        h('tr.total', h('th', 'Profit'), h('td', { class: res.profit < 0 ? 'neg' : 'pos' }, money(res.profit))),
        h('tr', h('th', 'Reputation'), h('td', `${res.rep >= 0 ? '+' : ''}${res.rep}`)),
        h('tr', h('th', 'Experience'), h('td', `+${res.xp} XP`)))),
      res.kept ? h('p.muted', `You kept ${plural(res.kept, 'old part')} — they're on your shelf to sell.`) : null),
    actions: [{ label: 'Great', cls: 'primary' }],
  });
}

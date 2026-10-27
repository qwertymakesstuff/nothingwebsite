// Business Overview: money breakdown, per-job profit, workshop level and reputation, upgrades,
// optional subscriptions, customer tiers and milestones.

import { h, button } from '../dom.js';
import { report, toast, confirmBox } from '../overlay.js';
import { play } from '../sound.js';
import { UPGRADES, SUBSCRIPTIONS } from '../../data/tools.js';
import { CUSTOMER } from '../../data/customers.js';
import { TIERS } from '../../data/jobs.js';
import { LEVELS, RENT_EVERY, DIFFICULTIES } from '../../core/config.js';
import { money, plural } from '../../core/util.js';
import { LEDGER_KIND } from '../../core/economy.js';
import { MILESTONES, canBuyUpgrade, benchCount, capacity, intakeCap, nextLevelXp } from '../../core/business.js';
import { unlockedTiers, KIND_LABEL } from '../../core/jobs.js';
import { stars, statusIcon } from '../widgets.js';

export const keepScroll = true;

export function render(app, root) {
  const g = app.game, st = g.state;
  const T = st.totals;
  const income = ['job', 'bonus', 'sale', 'reward'].reduce((s, k) => s + (T[k] || 0), 0) + Math.min(0, 0);
  const spend = Object.entries(T).filter(([k]) => !['job', 'bonus', 'sale', 'reward'].includes(k)).reduce((s, [, v]) => s + v, 0);
  const done = Object.values(st.jobs).filter(j => j.status === 'completed').sort((a, b) => (b.closedDay || 0) - (a.closedDay || 0));
  const avg = st.stats.recentSat.length ? Math.round(st.stats.recentSat.reduce((a, b) => a + b, 0) / st.stats.recentSat.length) : null;
  const next = nextLevelXp(st.level);
  const diff = DIFFICULTIES[st.difficulty];
  const rent = diff.rent + 15 * (st.level - 1) + 20 * (st.benches.length - 1);
  const nextRent = st.day + ((RENT_EVERY - ((st.day - 1) % RENT_EVERY)) % RENT_EVERY || RENT_EVERY);
  const maxAbs = Math.max(1, ...Object.values(T).map(Math.abs));
  root.append(h('div.business',
    h('div.kpis',
      kpi('Cash', money(st.money), st.money < 0 ? 'neg' : ''),
      kpi('Total profit from jobs', money(st.stats.profit), st.stats.profit < 0 ? 'neg' : 'pos'),
      kpi('Reputation', `★ ${Math.round(st.reputation)} / 100`),
      kpi(`Workshop level ${st.level}`, next ? `${st.xp} / ${next} XP` : `${st.xp} XP (max)`),
      kpi('Jobs done', `${st.stats.jobsDone} (${st.stats.failed} failed)`),
      kpi('Avg. satisfaction (last 10)', avg == null ? '—' : `${avg}%`)),
    h('div.biz-grid',
      h('section.panel', h('h2', 'Money breakdown (all time)'),
        h('table.breakdown', h('tbody',
          Object.keys(LEDGER_KIND).filter(k => T[k]).map(k => h('tr', h('th', LEDGER_KIND[k]), h('td.bar', h('span', { class: T[k] < 0 ? 'neg' : 'pos', style: { width: `${Math.abs(T[k]) / maxAbs * 100}%` } })), h('td', { class: T[k] < 0 ? 'neg' : 'pos' }, money(T[k])))),
          h('tr.total', h('th', 'Income'), h('td'), h('td.pos', money(income))),
          h('tr.total', h('th', 'Spending'), h('td'), h('td.neg', money(spend))),
          h('tr.total', h('th', 'Net cash change'), h('td'), h('td', { class: income + spend < 0 ? 'neg' : 'pos' }, money(income + spend))))),
        h('p.muted.small', `Parts bought but not yet used are still on your shelves (they count as spending until sold or delivered). Next rent: ${money(rent)} on day ${nextRent}.`)),
      h('section.panel', h('h2', 'Job profits'),
        done.length ? h('table.jobs-table', h('thead', h('tr', h('th', 'Job'), h('th', 'Paid'), h('th', 'Parts'), h('th', 'Profit'), h('th', 'Rating'))), h('tbody', done.slice(0, 12).map(j => h('tr',
          h('td', h('strong', j.title), h('div.muted.small', `${KIND_LABEL[j.kind]} · ${CUSTOMER[j.customer].name} · day ${j.closedDay}`)),
          h('td', money(j.result.paid + (j.result.bonusCash || 0) + (j.result.tip || 0) - (j.result.refund || 0))), h('td.neg', money(-j.result.partsCost)), h('td', { class: j.result.profit < 0 ? 'neg' : 'pos' }, money(j.result.profit)), h('td', stars(j.result.stars))))))
          : h('p.muted', 'Complete jobs to see their profit here.')),
      h('section.panel', h('h2', 'Recent transactions'), h('ul.ledger-mini', { 'data-keep-scroll': 'ledger' }, st.ledger.slice(-20).reverse().map(l => h('li', h('span.muted', `D${l.day}`), h('span', l.label), h('span', { class: l.amount < 0 ? 'neg' : 'pos' }, money(l.amount)))))),
      h('section.panel.wide', h('h2', 'Workshop upgrades'),
        h('p.muted', `${benchCount(st)} bench${benchCount(st) > 1 ? 'es' : ''} · ${capacity(st)} shelf space · ${intakeCap(st)} intake slots.`),
        h('div.upgrade-grid', UPGRADES.map(u => {
          const owned = !!st.upgrades[u.id];
          const c = canBuyUpgrade(st, u.id);
          return h('div.tool-card', { class: owned ? 'owned' : st.level < u.level ? 'locked' : '' }, h('strong', u.name), h('p', u.desc),
            h('div.tc-foot', owned ? h('span.good', '✔ Installed') : st.level < u.level ? h('span.lock', `🔒 Level ${u.level}`) : button(`Buy ${money(u.price)}`, async () => {
              if (!(await confirmBox('Buy upgrade?', `${u.name} for ${money(u.price)}?`, { ok: 'Buy' }))) return;
              const r = g.buyUpgrade(u.id); if (r.ok) { play('level'); toast(`${u.name} installed!`, 'good'); } else report(r);
            }, { cls: 'primary', disabled: !c.ok, tip: c.ok ? null : c.reason })));
        }))),
      h('section.panel', h('h2', 'Optional subscriptions'),
        h('p.muted.small', 'Recurring costs you can switch on and off at any time. They are charged each morning when due.'),
        SUBSCRIPTIONS.map(s => h('label.setting', h('input', { type: 'checkbox', checked: !!st.subs[s.id], on: { change: e => report(g.setSub(s.id, e.target.checked), `${s.name} ${e.target.checked ? 'started' : 'cancelled'}.`) } }), h('span.set-text', h('strong', s.name), h('small', s.desc))))),
      h('section.panel', h('h2', 'Customer tiers'),
        h('ul.tiers', TIERS.map(t => { const on = unlockedTiers(st).includes(t.tier); return h('li', { class: on ? 'ok' : '' }, statusIcon(on ? 'good' : 'info'), h('strong', t.label), h('span.muted', ` — level ${t.level}, reputation ${t.rep}${t.needs ? `, ${t.needs === 'showroom' ? 'Showroom front' : 'Specialist certification'}` : ''}`)); }))),
      h('section.panel.wide', h('h2', `Milestones (${Object.keys(st.milestones).length}/${MILESTONES.length})`),
        h('div.milestones', MILESTONES.map(m => { const got = st.milestones[m.id]; return h('div.milestone', { class: got ? 'got' : '' }, h('span.ms-icon', { 'aria-hidden': 'true' }, got ? '🏆' : '○'), h('div', h('strong', m.label), h('p.small', m.desc), h('span.muted.small', got ? `Reached on day ${got}` : `Reward: ${[m.reward.money ? money(m.reward.money) : null, m.reward.rep ? `+${m.reward.rep} reputation` : null].filter(Boolean).join(', ')}`))); }))))));
}

const kpi = (k, v, cls = '') => h('div.kpi', h('span', k), h('strong', { class: cls }, v));

// The statistics screen: a dialog from the top bar with an overview of totals and records,
// a production chart for this visit, a per-building breakdown, active bonuses and progress.
// Built once; refreshed while open (once a second, and when opened).
import { BUILDINGS } from './buildings.js';
import { formatNumber } from './numberFormatter.js';
import * as economy from './economy.js';
import { formatDuration } from './stats.js';
import { buildingBreakdown, activeBonuses, progressSummary, totalOwned, HISTORY_INTERVAL_MS, HISTORY_LENGTH } from './statistics.js';
import BigNum, { ZERO } from './bigNum.js';

const dateFormat = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;
const when = t => (dateFormat ? dateFormat.format(t) : new Date(t).toString());

// [label, value(state, now)] for the overview cards
const OVERVIEW = [
  ['Crowns in hand', s => formatNumber(s.currency.floor())],
  ['Per second', s => formatNumber(economy.productionPerSecond(s))],
  ['Per click', s => formatNumber(economy.clickValue(s))],
  ['Highest per second', s => formatNumber(s.stats.highestPps)],
  ['Best single click', s => formatNumber(s.stats.highestClick)],
  ['Crowns earned this empire', s => formatNumber(s.totalEarned.floor())],
  ['Crowns earned, all empires', s => formatNumber(s.legacy.lifetimeEarned.add(s.totalEarned).floor())],
  ['Earned by clicking', s => formatNumber(s.stats.clickEarned.floor())],
  ['Earned by buildings', s => formatNumber(Object.values(s.stats.producedBy).reduce((a, b) => a.add(b), ZERO).floor())],
  ['Crowns spent', s => formatNumber(s.stats.spent)],
  ['Mint clicks', s => formatNumber(s.totalClicks)],
  ['Best clicks in a second', s => formatNumber(s.stats.bestBurst)],
  ['Buildings owned', s => formatNumber(totalOwned(s))],
  ['Buildings bought', s => formatNumber(s.stats.buildingsBought)],
  ['Upgrade levels bought', s => formatNumber(s.stats.upgradesBought)],
  ['Mint clicks, all empires', s => formatNumber(s.legacy.lifetimeClicks + s.totalClicks)],
  ['Empires founded', s => formatNumber(s.legacy.prestiges + 1)],
  ['Best empire (crowns earned)', s => formatNumber(BigNum.max(s.legacy.bestRunEarned, s.totalEarned).floor())],
  ['This empire\'s age', (s, now) => formatDuration((now - s.runStartedAt) / 1000)],
  ['This visit', (s, now) => formatDuration((now - s.session.startedAt) / 1000)],
  ['Play time this empire', s => formatDuration(s.stats.playTime)],
  ['Play time, all empires', s => formatDuration(s.legacy.playTime + s.stats.playTime)],
];

const CHART_W = 600, CHART_H = 150, PAD_L = 4, PAD_B = 18;

// production over this visit; linear while values fit a double, log scale beyond
function chartSvg(history) {
  if (history.length < 2) return '';
  const nums = history.map(h => h.pps.toNumber());
  const useLog = nums.some(n => !Number.isFinite(n));
  const ys = useLog ? history.map(h => Math.max(0, h.pps.log10())) : nums;
  const max = Math.max(...ys) || 1;
  const n = HISTORY_LENGTH - 1;
  const offset = n - (history.length - 1); // newest point always at the right edge
  const x = i => PAD_L + ((i + offset) / n) * (CHART_W - PAD_L * 2);
  const y = v => 6 + (1 - v / (max * 1.08)) * (CHART_H - PAD_B - 6);
  const pts = ys.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const base = (CHART_H - PAD_B).toFixed(1);
  const peak = useLog ? `1e${Math.round(max)}` : formatNumber(max);
  return `<svg viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="Production per second over the last ${Math.round(HISTORY_LENGTH * HISTORY_INTERVAL_MS / 60000)} minutes">
    <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8b54a" stop-opacity=".35"/><stop offset="1" stop-color="#e8b54a" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${CHART_W}" y1="${y(max)}" y2="${y(max)}" class="chart-grid"/>
    <line x1="0" x2="${CHART_W}" y1="${base}" y2="${base}" class="chart-axis"/>
    <path d="M${x(0).toFixed(1)},${base}L${pts.join('L')}L${x(ys.length - 1).toFixed(1)},${base}Z" fill="url(#chartFill)"/>
    <polyline points="${pts.join(' ')}" class="chart-line"/>
    <circle cx="${x(ys.length - 1).toFixed(1)}" cy="${y(ys[ys.length - 1]).toFixed(1)}" r="3.5" class="chart-dot"/>
    <text x="4" y="${y(max) - 4}" class="chart-label">peak ${peak}/s${useLog ? ' (log scale)' : ''}</text>
    <text x="2" y="${CHART_H - 4}" class="chart-label">10 min ago</text>
    <text x="${CHART_W - 2}" y="${CHART_H - 4}" text-anchor="end" class="chart-label">now</text>
  </svg>`;
}

export function createStatsView(state) {
  const $ = id => document.getElementById(id);
  const dialog = $('statsDialog');
  const sub = $('statsSub'), overview = $('statsOverview'), chart = $('statsChart'), table = $('statsBuildings');
  const bonuses = $('statsBonuses'), progress = $('statsProgress');

  const cards = OVERVIEW.map(([label]) => {
    const el = document.createElement('div');
    el.className = 'stat-card';
    el.innerHTML = '<span></span><b></b>';
    el.querySelector('span').textContent = label;
    overview.appendChild(el);
    return el.querySelector('b');
  });

  const rows = new Map();
  for (const b of BUILDINGS) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th scope="row"><span class="stat-b"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${b.icon}</svg><span></span></span></th>
      <td class="num owned"></td><td class="num each"></td><td class="num total"></td>
      <td class="share"><span class="share-bar"><span></span></span><span class="share-pct"></span></td><td class="num made"></td>`;
    tr.querySelector('.stat-b span').textContent = b.name;
    table.appendChild(tr);
    rows.set(b.id, { tr, cells: ['owned', 'each', 'total', 'made'].reduce((o, k) => ({ ...o, [k]: tr.querySelector(`.${k}`) }), {}),
      bar: tr.querySelector('.share-bar span'), pct: tr.querySelector('.share-pct') });
  }

  function list(el, items) {
    el.replaceChildren(...items.map(({ label, value }) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><b></b>';
      li.querySelector('span').textContent = label;
      li.querySelector('b').textContent = value;
      return li;
    }));
  }

  function render(now = Date.now()) {
    if (!dialog.open) return;
    sub.textContent = `Empire founded ${when(state.startedAt)}`;
    OVERVIEW.forEach(([, value], i) => { cards[i].textContent = value(state, now); });

    const svg = chartSvg(state.session.history);
    chart.innerHTML = svg || '<p class="empty-note">Collecting data: the chart fills in as you play (one point every 5 seconds).</p>';

    const seen = new Set();
    for (const r of buildingBreakdown(state)) {
      const row = rows.get(r.def.id);
      seen.add(r.def.id);
      row.cells.owned.textContent = formatNumber(r.owned);
      row.cells.each.textContent = formatNumber(r.each);
      row.cells.total.textContent = formatNumber(r.total);
      row.cells.made.textContent = formatNumber(r.produced.floor());
      const pct = Math.max(0, Math.min(100, r.share * 100));
      row.bar.style.width = `${pct}%`;
      row.pct.textContent = pct >= 0.1 || pct === 0 ? `${pct.toFixed(pct < 10 ? 1 : 0)}%` : '<0.1%';
    }
    for (const [id, row] of rows) row.tr.hidden = !seen.has(id);

    list(bonuses, activeBonuses(state));
    list(progress, progressSummary(state));
  }

  $('statsBtn').addEventListener('click', () => { if (!dialog.open) dialog.showModal(); render(); });
  $('statsClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  return { render };
}

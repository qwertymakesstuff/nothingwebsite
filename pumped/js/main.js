// PUMPED: controller. Owns the run, the game loop and every panel on screen.

import { CATS, CAT_ORDER, ASSET_BY_T, MARKETS } from './assets.js';
import { NEWS_LEN, changePct, series, forceEvent, forcePump, forceCrash, forceRegime } from './market.js';
import { FEE, liqPrice, equityOf, unrealized } from './portfolio.js';
import { createRun, stepRun, trade, worthOf, priceFn, cashOut, timeLeft, MODES } from './game.js';
import { Store, addScore } from './save.js';
import * as PG from './progression.js';
import { REGIMES } from './regimes.js';
import { Fx } from './fx.js';
import { bindTips } from './tips.js';
import { createFeed, stepFeed, validFeed } from './social.js';
import { SocialView } from './social-ui.js';
import { Sfx } from './audio.js';
import { Chart, CHART_THEMES, sparkPath } from './chart.js';
import { randomSeed } from './rng.js';
import { h, $, $$, setText, setTone } from './dom.js';
import * as F from './format.js';
import { parseAmount } from './format.js';

const store = new Store();
let meta = store.loadMeta();
const sfx = new Sfx();
const fx = new Fx(document.getElementById('fx'));
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
// "simple." in front of the game (missing.website/simple.pumped/, or a simple. subdomain): easier to read UI
const SIMPLE = document.documentElement.classList.contains('simple');

let run = null;
let chart = null;
let loop = null;
let social = null;
const ui = {
  side: 'buy', range: 300, cat: 'all', search: '', ltab: 'all', htab: 'holdings', pct: null,
  view: 'terminal', paused: false, modal: null, rows: {}, newsEls: new Map(), lastNews: 0, lastPrice: null,
  holdKey: '', txKey: '', scans: [],
};

const S = () => meta.settings;
const saveMeta = () => store.saveMeta(meta);
const saveRun = () => { if (run && !run.over) store.saveRun(run); };
const price = t => run.market.assets[t].p;

// ── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  // first visit: follow the system's reduced-motion preference
  if (store.isFresh() && globalThis.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { meta.settings.reducedMotion = true; saveMeta(); }
  chart = new Chart($('#chart'));
  chart.simple = SIMPLE;
  if (SIMPLE) for (const el of $$('[data-simple]')) el.textContent = el.dataset.simple;
  social = new SocialView({
    run: () => run, meta: () => meta, worth: () => worthOf(run), timeLeft: () => timeLeft(run),
    onTicker: t => { switchView('terminal'); selectAsset(t); }, onBack: () => switchView('terminal'),
    toast: (t, k) => toast(t, k), saveMeta, sfx,
  });
  bindUI();
  bindTips($('#tip'), () => S().tooltips);
  applySettings();
  const saved = store.loadRun();
  $('#boot').remove();
  if (saved && !saved.over) { run = saved; mountRun(); }
  openMenu();
  if (DEBUG) exposeDebug();
}

function newRun(opts = {}) {
  const seed = (opts.seed || params.get('seed') || randomSeed()).toString().toUpperCase().slice(0, 24);
  const mode = MODES[opts.mode] ? opts.mode : (ui.mode || 'session');
  ui.mode = mode;
  const cash = PG.startCash(meta);
  run = createRun({ seed, mode, startCash: cash, markets: PG.markets(meta) });
  run.lev = 1;
  ui.scans = [];
  mountRun();
  saveRun();
  ui.modal = null;
  $('#modal').hidden = true;
  meta.lifetime.runs++;
  saveMeta();
  toast(`${MODES[mode].label} started · seed ${seed}. You have ${F.money(cash)}. Don't lose it.`, 'good');
}

function mountRun() {
  $('#app').hidden = false;
  if (!run.market.assets[run.selected]) run.selected = run.market.order[0];
  if (!validFeed(run.social)) run.social = createFeed();
  ui.newsEls.clear(); ui.lastNews = 0; ui.lastPrice = null; ui.holdKey = ui.txKey = ui.statsKey = ui.orderKey = '';
  $('#news').replaceChildren();
  buildChips();
  buildList();
  renderNews(true);
  renderScanner();
  ui.shownWorth = null;
  selectAsset(run.selected, true);
  setSide('buy');
  render();
  if (ui.view === 'social') social.show();
  restartLoop();
}

function restartLoop() {
  clearInterval(loop);
  loop = setInterval(gameTick, Math.round(1000 / S().speed));
}

const running = () => run && !run.over && !ui.paused && !ui.modal && !document.hidden;

function gameTick() {
  if (!running()) return;
  const notes = stepRun(run);
  handleNotes(notes);
  scan();
  progress();
  stepFeed(run.social, run, notes, Math.random, meta.profile);
  render();
  social.tick();
  if (run.market.tick % 5 === 0) saveRun();
  if (run.over) finishRun();
}

// achievements + milestones, checked after every tick and trade
function progress(tx = null) {
  const w = worthOf(run);
  const got = PG.checkAchievements(meta, { run, worth: w, tx, end: run.end });
  for (const a of got) {
    sfx.play('achievement');
    toast(`🏆 Achievement: ${a.icon} ${a.name} (+${a.clout} Clout)`, 'gold', 5000);
  }
  const s = run.stats;
  s.milestone = s.milestone || 0;
  while (s.milestone < PG.MILESTONES.length && w >= PG.MILESTONES[s.milestone] && PG.MILESTONES[s.milestone] > s.start) {
    const v = PG.MILESTONES[s.milestone];
    s.milestone++;
    if (PG.MILESTONES[s.milestone] && w >= PG.MILESTONES[s.milestone]) continue;  // skipped past it: only celebrate the biggest
    sfx.play('milestone');
    fx.banner(`${F.money(v, { compact: true }).replace('.00', '')}!`, v >= 1e6 ? 'MILLIONAIRE STATUS' : 'NEW NET WORTH MILESTONE', 'gold');
    fx.rain(12, 'up', ['+$', '💸', '📈', '+%']);
  }
  if (got.length) saveMeta();
}

// Alerts on observable moves: a pump is flagged once it has run for a few seconds, a crash after its
// first drop. Owned and selected assets are always watched; the Market Scanner watches everything
// and flags sooner.
function scan() {
  const delay = PG.scannerDelay(meta);
  const m = run.market;
  for (const t of m.order) {
    const a = m.assets[t];
    const mine = !!run.pf.positions[t] || t === run.selected;
    if (a.pump) {
      const d = mine ? Math.min(5, delay ?? 5) : delay;
      if (d != null && a.pump.ticks === d) alertMove(t, 'pump', mine);
    }
    if (a.crash) {
      const d = mine ? 1 : delay != null ? Math.max(1, delay - 1) : null;
      if (d != null && a.crash.ticks === d) alertMove(t, a.crash.cause === 'rug' ? 'rug' : 'crash', mine);
    }
  }
}

function alertMove(t, kind, mine) {
  const held = run.pf.positions[t];
  const pump = kind === 'pump';
  if (PG.scannerDelay(meta) != null) {
    ui.scans.unshift({ t, kind, tick: run.market.tick });
    ui.scans.length = Math.min(ui.scans.length, 6);
    renderScanner();
  }
  if (!mine) return;
  if (t === run.selected) chartAlert(pump ? '🚀 PUMPING' : kind === 'rug' ? '🧶 RUG PULL' : '⚠ CRASHING', pump ? 'pump' : 'crash');
  if (!held) return;
  const share = equityOf(held, price(t)) / Math.max(1, worthOf(run));
  if (pump) {
    sfx.play('pump');
    toast(`🚀 ${t} is pumping! You own ${F.money(equityOf(held, price(t)))} of it.`, 'good');
    if (share > 0.15) fx.rain(8, 'up', [`${t} 🚀`, '+$', '📈']);
  } else {
    sfx.play(kind === 'rug' ? 'rug' : 'crash');
    toast(`⚠ ${t} is ${kind === 'rug' ? 'getting RUG PULLED' : 'crashing'}! Sell now or hold on?`, 'bad', 4500);
    if (share > 0.15) { fx.flash('down'); fx.banner(kind === 'rug' ? '🧶 RUG PULL' : '⚠ CRASH ALERT', `${t} is collapsing`, 'bad'); }
  }
}

function renderScanner() {
  const box = $('#scanner');
  box.hidden = PG.scannerDelay(meta) == null;
  if (box.hidden) return;
  box.replaceChildren(h('h3', {}, h('span', { text: '📡 Scanner' }), h('span', { text: ui.scans.length ? '' : 'watching…' })),
    ...ui.scans.map(x => h('div', { class: `scan ${x.kind === 'pump' ? 'pump' : 'crash'}`, onclick: () => selectAsset(x.t) },
      h('span', {}, h('b', { text: x.t }), x.kind === 'pump' ? ' pump detected' : x.kind === 'rug' ? ' rug pull!' : ' crash detected'),
      h('span', { class: 'muted', text: 'T+' + F.clock(x.tick) }))));
}

// ── Notes from the market ────────────────────────────────────────────────────
function handleNotes(notes) {
  const held = t => !!run.pf.positions[t];
  for (const n of notes) {
    switch (n.type) {
      case 'liquidation':
        sfx.play('liquidated');
        fx.flash('down');
        fx.banner('💀 LIQUIDATED', `${n.tx.lev}× ${n.tx.t} · lost ${F.money(-n.tx.pnl)}`, 'bad');
        toast(`💀 LIQUIDATED: your ${n.tx.lev}× ${n.tx.t} position was force-closed. Lost ${F.money(-n.tx.pnl)}.`, 'bad', 6000);
        break;
      case 'headline':
        analyse(n.headline);
        if (n.headline.tickers.some(held) || n.headline.tickers.includes(run.selected)) sfx.play('news');
        break;
      case 'regime_start': {
        const r = REGIMES[n.id];
        const bad = r.tone < 0;
        fx.banner(r.name, r.headline.split(':')[0] === r.name.replace(/^\S+ /, '') ? '' : 'Market event', bad ? 'bad' : r.tone > 0 ? 'good' : 'gold');
        if (n.id === 'flash') { sfx.play('crash'); fx.flash('down'); } else sfx.play(bad ? 'sellLoss' : 'milestone');
        break;
      }
      case 'regime_end':
        toast(`${REGIMES[n.id].name} is over.`, '');
        break;
    }
  }
}

// News Analysis upgrade: tags each headline. It reads the hidden truth but is only right with the
// given accuracy, using its own random stream so the market itself stays deterministic.
function analyse(n) {
  const L = PG.lvl(meta, 'news');
  if (!L || n.analysis) return;
  const rnd = mulberry(n.id * 7919 + n.tick * 31 + run.seed.length);
  const a = { tone: n.tone };
  const acc = PG.newsAccuracy(meta);
  if (acc && n.pending) {
    const p = run.market.pending.find(x => x.parent === n.id);
    if (p) a.real = rnd() < acc ? p.truth : !p.truth;
  }
  if (L >= 3 && n.tickers.length === 1 && n.tone > 0) {
    const pump = run.market.assets[n.tickers[0]].pump;
    if (pump) a.rug = rnd() < acc ? pump.fate === 'rug' : pump.fate !== 'rug';
  }
  n.analysis = a;
}

function mulberry(seed) {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), t | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

function chartAlert(text, kind) {
  const el = $('#chartAlert');
  el.hidden = false;
  el.className = `chart-alert ${kind}`;
  el.textContent = text;
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(chartAlert.t);
  chartAlert.t = setTimeout(() => { el.hidden = true; }, 1700);
}

// ── Rendering ────────────────────────────────────────────────────────────────
function render() {
  if (!run) return;
  renderTop();
  if (ui.view === 'social') return;  // the terminal catches up when you switch back
  renderList();
  renderChart();
  renderTrade();
  renderNews();
  renderBottom();
  if (run.market.tick % 3 === 0 || !$('#tape').childElementCount) renderTape();
}

function renderTop() {
  const w = worthOf(run);
  if (Math.abs((ui.shownWorth ?? w) - w) > 0.005) fx.countTo($('#worth'), w, v => F.money(v));
  else if (ui.shownWorth == null) setText($('#worth'), F.money(w));
  ui.shownWorth = w;
  const chg = (w / run.stats.start - 1) * 100;
  setText($('#worthChg'), F.pct(chg));
  setTone($('#worthChg'), chg);
  setText($('#cash'), F.money(run.pf.cash));
  const u = unrealized(run.pf, priceFn(run));
  setText($('#unreal'), F.money(u, { sign: true })); setTone($('#unreal'), u);
  setText($('#real'), F.money(run.pf.realized, { sign: true })); setTone($('#real'), run.pf.realized);
  setText($('#totalPL'), F.money(w - run.stats.start, { sign: true })); setTone($('#totalPL'), w - run.stats.start);
  setText($('#modeLabel'), (MODES[run.mode] || MODES.endless).label);
  const left = timeLeft(run);
  setText($('#timer'), Number.isFinite(left) ? F.clock(left) : 'T+' + F.clock(run.market.tick));
  $('.stat-time').classList.toggle('hurry', Number.isFinite(left) && left <= 15 && !run.over);
  const s = run.market.sentiment;
  $('#sentimentNeedle').style.left = `calc(${s.toFixed(1)}% - 1px)`;
  setText($('#sentimentText'), `${sentimentLabel(s)} · ${Math.round(s)}`);
  const rg = $('#regime');
  const reg = run.market.regime && REGIMES[run.market.regime.id];
  rg.hidden = !reg;
  if (reg) {
    if (rg.dataset.id !== reg.id) { rg.dataset.id = reg.id; rg.style.color = reg.color; rg.replaceChildren(document.createTextNode(reg.name), h('span', { class: 'rleft' })); rg.title = reg.headline; }
    setText(rg.lastChild, `${run.market.regime.left}s`);
  } else rg.dataset.id = '';
  $('#pauseBtn').classList.toggle('on', ui.paused);
  $('#pauseBtn').textContent = ui.paused ? '▶' : '❚❚';
  document.body.classList.toggle('paused', ui.paused);
}

function sentimentLabel(v) {
  return v < 20 ? 'Extreme fear' : v < 40 ? 'Fear' : v < 60 ? 'Neutral' : v < 80 ? 'Greed' : 'Extreme greed';
}

function renderTape() {
  const parts = run.market.order.map(t => {
    const c = changePct(run.market, t);
    return `<span><b>${t}</b>${F.price(price(t))} <i class="${F.tone(c)}">${F.pct(c)}</i></span>`;
  }).join('');
  $('#tape').innerHTML = parts + parts;
}

// asset list
function buildChips() {
  const box = $('#catChips');
  box.replaceChildren(...['all', ...CAT_ORDER, 'held'].map(c => h('button', {
    type: 'button', class: ui.cat === c ? 'on' : '', dataset: { cat: c },
    text: c === 'all' ? 'All' : c === 'held' ? 'Owned' : `${CATS[c].icon} ${CATS[c].label}`,
    onclick: () => { ui.cat = c; $$('#catChips button').forEach(b => b.classList.toggle('on', b.dataset.cat === c)); renderList(); },
  })));
}

function buildList() {
  const box = $('#assetList');
  box.replaceChildren();
  ui.rows = {};
  for (const t of run.market.order) {
    const d = ASSET_BY_T[t];
    const star = h('button', { type: 'button', class: 'star', 'aria-label': `Watch ${t}`, text: '☆', onclick: e => { e.stopPropagation(); toggleWatch(t); } });
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 54 22'); svg.append(path);
    const flag = h('span', { class: 'flag' });
    const px = h('b'), chg = h('small');
    const own = h('i', { class: 'own', hidden: true });
    const row = h('div', { class: 'row', role: 'option', tabindex: '-1', dataset: { t }, onclick: () => selectAsset(t) },
      star, h('div', { class: 'nm' }, h('b', {}, t, flag), h('small', { text: d.name })), svg, h('div', { class: 'px' }, px, chg), own);
    ui.rows[t] = { row, star, path, flag, px, chg, own, last: null };
    box.append(row);
  }
  box.append(h('div', { class: 'list-empty', id: 'listEmpty', hidden: true, text: 'Nothing here.' }));
}

function listVisible(t) {
  const d = ASSET_BY_T[t];
  if (ui.ltab === 'watch' && !meta.watch.includes(t)) return false;
  if (ui.cat === 'held' ? !run.pf.positions[t] : ui.cat !== 'all' && d.cat !== ui.cat) return false;
  const q = ui.search.trim().toLowerCase();
  return !q || t.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
}

function renderList() {
  const m = run.market;
  const movers = ui.ltab === 'movers' ? [...m.order].sort((a, b) => Math.abs(changePct(m, b, 30)) - Math.abs(changePct(m, a, 30))).slice(0, 10) : null;
  const order = movers || m.order;
  const box = $('#assetList');
  if (ui.orderKey !== order.join()) {
    ui.orderKey = order.join();
    for (const t of order) box.append(ui.rows[t].row);
    box.append($('#listEmpty'));
  }
  let shown = 0;
  for (const t of m.order) {
    const r = ui.rows[t];
    const vis = (!movers || movers.includes(t)) && listVisible(t);
    r.row.hidden = !vis;
    if (!vis) { r.last = null; continue; }
    shown++;
    const a = m.assets[t];
    setText(r.px, F.price(a.p));
    const c = changePct(m, t);
    setText(r.chg, F.pct(c)); setTone(r.chg, c);
    const pts = a.hist.slice(-61);
    r.path.setAttribute('d', sparkPath(pts, 54, 22));
    r.path.setAttribute('stroke', pts[pts.length - 1] >= pts[0] ? 'var(--up)' : 'var(--down)');
    const c30 = changePct(m, t, 30);
    let flag = '';
    if (c30 > 6) flag = 'pump'; else if (c30 < -6) flag = 'dump'; else if (a.hype >= 75) flag = 'hot';
    r.flag.className = `flag ${flag}`;
    setText(r.flag, flag === 'pump' ? '🚀' : flag === 'dump' ? '📉' : flag === 'hot' ? '🔥' : '');
    r.row.classList.toggle('sel', t === run.selected);
    r.own.hidden = !run.pf.positions[t];
    const w = meta.watch.includes(t);
    r.star.classList.toggle('on', w); setText(r.star, w ? '★' : '☆');
    if (r.last != null && r.last !== a.p && !S().reducedMotion) {
      const step = a.p / r.last - 1;
      if (Math.abs(step) > 0.03) { r.row.classList.remove('flash-up', 'flash-down'); void r.row.offsetWidth; r.row.classList.add(step > 0 ? 'flash-up' : 'flash-down'); }
    }
    r.last = a.p;
  }
  $('#listEmpty').hidden = shown > 0;
  setText($('#watchCount'), `${meta.watch.length}`);
}

function toggleWatch(t) {
  const i = meta.watch.indexOf(t);
  if (i >= 0) meta.watch.splice(i, 1);
  else {
    const max = watchSlots();
    if (meta.watch.length >= max) { toast(`Watchlist full (${max} slots). Remove one first.`, 'bad'); return; }
    meta.watch.push(t);
  }
  saveMeta();
  renderList();
  renderChartHead();
}

const watchSlots = () => PG.watchSlots(meta);

function selectAsset(t, quiet = false) {
  if (!run.market.assets[t]) return;
  run.selected = t;
  ui.pct = null;
  ui.lastPrice = null;
  if (!quiet) $('#amount').value = '';
  renderChartHead();
  renderChart();
  renderTrade();
  renderList();
  const r = ui.rows[t];
  if (r && !quiet) r.row.scrollIntoView({ block: 'nearest' });
}

function renderChartHead() {
  const t = run.selected, d = ASSET_BY_T[t], c = CATS[d.cat];
  setText($('#cIcon'), c.icon);
  setText($('#cName'), d.name);
  setText($('#cTicker'), t);
  const cat = $('#cCat'); setText(cat, c.label); cat.className = `badge cat-${d.cat}`;
  setText($('#cMarket'), MARKETS[d.market].short);
  setText($('#cBio'), d.bio);
  const w = meta.watch.includes(t);
  setText($('#cStar'), w ? '★' : '☆'); $('#cStar').classList.toggle('on', w);
  $('#hypeBox').hidden = !c.hypeable || !!d.stable;
}

function renderChart() {
  const m = run.market, t = run.selected, a = m.assets[t];
  const { points, step } = series(m, t, ui.range);
  const pos = run.pf.positions[t];
  const markers = run.pf.txs.filter(x => x.t === t && x.side !== 'liquidation').slice(0, 40).map(x => ({ tick: x.tick, side: x.side }));
  chart.setData({ key: `${t}:${ui.range}:${run.seed}`, points, step, tick: m.tick, avg: pos ? pos.avg : 0, liq: pos ? liqPrice(pos) : 0, markers });

  const pe = $('#cPrice');
  setText(pe, F.price(a.p));
  if (ui.lastPrice != null && a.p !== ui.lastPrice) {
    pe.classList.remove('tick-up', 'tick-down');
    pe.classList.add(a.p > ui.lastPrice ? 'tick-up' : 'tick-down');
  }
  ui.lastPrice = a.p;
  const back = ui.range === 'all' ? null : Math.min(ui.range, m.tick);
  const chg = changePct(m, t, back);
  setText($('#cChg'), `${F.pct(chg)} ${ui.range === 'all' ? 'all time' : rangeName(ui.range)}`);
  setTone($('#cChg'), chg);
  setText($('#sOpen'), F.price(a.open));
  setText($('#sHigh'), F.price(a.high));
  setText($('#sLow'), F.price(a.low));
  const c1 = changePct(m, t, 60);
  setText($('#s1m'), F.pct(c1)); setTone($('#s1m'), c1);
  setText($('#sVol'), volLabel(t));
  const hype = Math.round(a.hype || 0);
  $('#hypeFill').style.width = `${hype}%`;
  setText($('#hypeVal'), String(hype));
  $('#hypeBox').classList.toggle('hot', hype >= 60 && hype < 80);
  $('#hypeBox').classList.toggle('overheated', hype >= 80);
}

const rangeName = r => ({ 60: '1m', 300: '5m', 900: '15m' }[r] || '');

function volLabel(t) {
  const d = ASSET_BY_T[t], s = CATS[d.cat].sigma * d.volMul;
  return s < 0.004 ? 'Low' : s < 0.009 ? 'Medium' : s < 0.018 ? 'High' : 'Extreme';
}

// trade panel
function setSide(side) {
  ui.side = side;
  ui.pct = null;
  $('#amount').value = '';
  $$('.ttab').forEach(b => b.classList.toggle('on', b.dataset.side === side));
  renderTrade();
}

function currentLev() {
  if (SIMPLE) return 1;
  const opts = PG.leverageOptions(meta);
  if (!opts.includes(run.lev)) run.lev = 1;
  return run.lev;
}

function renderLev() {
  $('#levBox').hidden = SIMPLE;
  if (SIMPLE) return;
  const box = $('#levOpts');
  const opts = PG.leverageOptions(meta);
  const key = opts.join() + ':' + run.lev + ':' + S().leverageAccepted;
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.replaceChildren(...opts.map(l => h('button', { type: 'button', class: `${run.lev === l ? 'on' : ''}${l >= 10 ? ' danger' : ''}`, text: `${l}×`,
    title: l === 1 ? 'No leverage' : `${l}× leverage: gains and losses are multiplied by ${l}`, onclick: () => setLev(l) })),
  PG.lvl(meta, 'margin') < 2 ? h('span', { class: 'lev-lock', text: '🔒 more in upgrades' }) : null);
}

function setLev(l) {
  if (l > 1 && !S().leverageAccepted) { leverageWarning(l); return; }
  run.lev = l;
  sfx.play('click');
  renderTrade();
}

function leverageWarning(l) {
  const box = h('input', { type: 'checkbox', id: 'levAgree' });
  const go = h('button', { type: 'button', class: 'btn danger', text: 'Enable leverage', disabled: true, onclick: () => { S().leverageAccepted = true; saveMeta(); ui.modal = null; $('#modal').hidden = true; setLev(l); } });
  box.addEventListener('change', () => { go.disabled = !box.checked; });
  showModal([
    h('h2', { text: '⚠ Leverage: read this first' }),
    h('div', { class: 'warn-box' },
      h('b', { text: 'Leverage lets you trade with borrowed money. It multiplies everything, including losses.' }),
      h('ul', {},
        h('li', { text: 'At 5×, a 10% price rise makes you +50%. A 10% drop costs you 50%.' }),
        h('li', { text: 'If the price falls far enough (about 90% ÷ leverage: 18% at 5×, 9% at 10×, under 2% at 50×) your position is LIQUIDATED: force-sold and your stake is gone.' }),
        h('li', { text: 'Fees are charged on the full leveraged size.' }),
        h('li', { text: 'The liquidation price is shown on the chart and in your holdings. Watch it.' }))),
    h('label', { class: 'check', for: 'levAgree' }, box, ' I understand I can lose my whole stake on a leveraged trade.'),
    h('div', { class: 'btn-row end' }, h('button', { type: 'button', class: 'btn', text: 'No thanks', onclick: () => { ui.modal = null; $('#modal').hidden = true; } }), go),
  ], 'leverage');
}

function renderTrade() {
  if (!run) return;
  const t = run.selected, p = price(t), pos = run.pf.positions[t];
  const buy = ui.side === 'buy';
  const go = $('#goBtn');
  go.className = `go ${ui.side}`;
  setText(go, `${buy ? 'BUY' : 'SELL'} ${t}`);
  $$('#pcts button').forEach(b => b.classList.toggle('on', Number(b.dataset.pct) === ui.pct));
  setText($('#amountLabel'), buy ? 'Spend (USD)' : 'Sell value (USD)');
  setText($('#amountHint'), buy ? `Cash available: ${F.money(run.pf.cash)}` : pos ? `Position worth: ${F.money(equityOf(pos, p))}` : `You don't own any ${t}`);
  renderLev();

  // preview
  const amt = parseAmount($('#amount').value);
  const pv = $('#preview');
  const rows = [];
  const line = (k, v, cls = '', tip = null) => rows.push(h('div', {}, h('span', { text: k, 'data-tip': tip }), h('b', { class: cls, text: v })));
  if (buy) {
    const lev = currentLev();
    if (amt > 0) {
      const margin = amt / (1 + lev * FEE), qty = margin * lev / p;
      line('You get ≈', `${F.qty(qty)} ${t}`);
      line('Price', F.price(p));
      line(`Fee (0.1%${lev > 1 ? ' × ' + lev : ''})`, F.money(amt - margin), '', 'fee');
      if (lev > 1) {
        line('Position size', F.money(margin * lev));
        const liq = (margin * (lev - 1) + 0.1 * margin) / qty;
        line('Liquidated below', F.price(liq), 'down', 'liq');
      }
      if (pos && pos.lev !== lev) rows.push(h('span', { class: 'err', text: `You hold ${t} at ${pos.lev}×. Switch leverage to ${pos.lev}× or sell first.` }));
      if (amt > run.pf.cash + 1e-9) rows.push(h('span', { class: 'err', text: `Not enough cash (${F.money(run.pf.cash)}).` }));
      else if (amt < 1) rows.push(h('span', { class: 'err', text: 'Minimum order is $1.' }));
    } else {
      line('Price', F.price(p));
      rows.push(h('span', { class: 'muted', text: 'Type an amount or pick a percentage.' }));
    }
    go.disabled = run.over || run.pf.cash < 1;
  } else if (pos) {
    const eq = equityOf(pos, p);
    const f = ui.pct != null ? ui.pct : amt > 0 && eq > 0 ? amt / eq : 0;
    if (f > 0) {
      const gross = pos.qty * f * p, fee = gross * FEE, proceeds = Math.max(0, gross - pos.debt * f - fee), pnl = proceeds - pos.cost * Math.min(f, 1);
      line('Selling', `${F.qty(pos.qty * Math.min(f, 1))} ${t}`);
      line('You receive ≈', F.money(proceeds));
      line('Profit / loss', `${F.money(pnl, { sign: true })} (${F.pct(pnl / (pos.cost * Math.min(f, 1)) * 100)})`, F.tone(pnl));
      if (f > 1.0001) rows.push(h('span', { class: 'err', text: `You only own ${F.money(eq)} of ${t}.` }));
    } else {
      line('Price', F.price(p));
      rows.push(h('span', { class: 'muted', text: 'Type an amount or pick a percentage.' }));
    }
    go.disabled = run.over;
  } else {
    line('Price', F.price(p));
    rows.push(h('span', { class: 'muted', text: `Buy some ${t} first.` }));
    go.disabled = true;
  }
  pv.replaceChildren(...rows);

  // position card
  const card = $('#position');
  if (!pos) {
    card.className = 'position';
    card.replaceChildren(h('h3', {}, 'Your position'), h('div', { class: 'empty', text: `You don't own any ${t}.` }));
  } else {
    const eq = equityOf(pos, p), pnl = eq - pos.cost, pc = pos.cost > 0 ? pnl / pos.cost * 100 : 0;
    card.className = `position ${pnl >= 0 ? 'win' : 'lose'}`;
    const kids = [h('h3', {}, h('span', { text: 'Your position' }), pos.lev > 1 ? h('span', { class: 'down', text: `${pos.lev}× LEVERAGE` }) : null),
      row2('Quantity', `${F.qty(pos.qty)} ${t}`), row2('Avg price', F.price(pos.avg), '', 'avg'), row2('Value', F.money(eq)),
      row2('P/L', `${F.money(pnl, { sign: true })} (${F.pct(pc)})`, F.tone(pnl))];
    if (pos.lev > 1) kids.push(row2('Liquidation at', F.price(liqPrice(pos)), 'down', 'liq'));
    kids.push(h('div', { class: 'quick' },
      h('button', { type: 'button', text: 'Sell half', onclick: () => quickSell(t, 0.5) }),
      h('button', { type: 'button', text: 'Sell all', onclick: () => quickSell(t, 1) })));
    card.replaceChildren(...kids.filter(k => k != null && k !== false));
  }
}

const row2 = (k, v, cls = '', tip = null) => h('div', {}, h('span', { text: k, 'data-tip': tip }), h('b', { class: cls, text: v }));

function pickPct(p) {
  if (!run) return;
  const t = run.selected;
  if (ui.side === 'buy') {
    const v = Math.floor(run.pf.cash * p * 100) / 100;
    $('#amount').value = v > 0 ? v.toFixed(2) : '';
  } else {
    const pos = run.pf.positions[t];
    if (!pos) { toast(`You don't own any ${t}.`, 'bad'); return; }
    $('#amount').value = (Math.floor(equityOf(pos, price(t)) * p * 100) / 100).toFixed(2);
  }
  ui.pct = p;
  sfx.play('click');
  renderTrade();
}

function doTrade() {
  if (!run || run.over) return;
  sfx.unlock();
  const t = run.selected;
  let res;
  if (ui.side === 'buy') {
    let amt = parseAmount($('#amount').value);
    if (ui.pct === 1) amt = run.pf.cash;
    res = trade(run, { side: 'buy', t, amount: amt, lev: currentLev() });
  } else {
    const amt = parseAmount($('#amount').value);
    res = ui.pct != null ? trade(run, { side: 'sell', t, fraction: ui.pct }) : trade(run, { side: 'sell', t, value: amt });
  }
  afterTrade(res);
}

function quickSell(t, f) {
  sfx.unlock();
  afterTrade(trade(run, { side: 'sell', t, fraction: f }));
}

function afterTrade(res) {
  if (!res.ok) {
    toast(res.error, 'bad');
    sfx.play('error');
    const go = $('#goBtn');
    go.classList.remove('shake'); void go.offsetWidth; go.classList.add('shake');
    return;
  }
  const x = res.tx;
  meta.lifetime.trades++;
  if (x.side === 'buy') {
    toast(`✅ Bought ${F.qty(x.qty)} ${x.t} at ${F.price(x.price)} for ${F.money(x.amount)}${x.lev > 1 ? ` (${x.lev}× leverage)` : ''}`, 'good');
    sfx.play('buy');
    fx.flyFrom($('#goBtn'), `-${F.money(x.amount)}`, 'down');
  } else {
    toast(`💰 Sold ${F.qty(x.qty)} ${x.t} at ${F.price(x.price)} for ${F.money(x.amount)}. P/L ${F.money(x.pnl, { sign: true })} (${F.pct(x.pct)})`, x.pnl >= 0 ? 'good' : 'bad');
    sfx.play(x.pnl >= 0 ? 'sellWin' : 'sellLoss');
    const big = x.pnl > 0 && (x.pnl >= 5000 || x.pct >= 100 || x.pnl >= 0.25 * worthOf(run));
    fx.flyFrom($('#goBtn'), F.money(x.pnl, { sign: true }), x.pnl >= 0 ? 'up' : 'down', big);
    if (big) {
      const r = $('#worth').getBoundingClientRect();
      fx.coins(r.left + r.width / 2, r.top + r.height, 18);
      fx.flash('up');
      fx.banner('💰 BIG WIN', `${F.money(x.pnl, { sign: true })} on ${x.t}`, 'good');
    }
  }
  ui.pct = null;
  $('#amount').value = '';
  progress(x);
  saveRun();
  saveMeta();
  render();
  if (run.over) finishRun();
}

function renderNews(rebuild = false) {
  const m = run.market, box = $('#news');
  const fresh = m.news.filter(n => n.id > ui.lastNews).reverse();
  for (const n of fresh) {
    const el = newsItem(n, !rebuild);
    ui.newsEls.set(n.id, el);
    box.prepend(el);
    ui.lastNews = Math.max(ui.lastNews, n.id);
  }
  while (box.childElementCount > NEWS_LEN) {
    const last = box.lastElementChild;
    ui.newsEls.forEach((v, k) => { if (v === last) ui.newsEls.delete(k); });
    last.remove();
  }
  for (const n of m.news) if (n.pending && n.resolved && !ui.newsEls.get(n.id)?.dataset.done) updateNewsTags(n);
}

function newsItem(n, animate) {
  const el = h('div', { class: `item tone-${n.tone}${n.regime ? ' regime' : ''}${animate && !S().reducedMotion ? ' new' : ''}` });
  el.append(h('time', { text: 'T+' + F.clock(n.tick) }), h('span', { class: 'tags' }), h('span', { class: 'hl', text: n.text }));
  const tks = h('div', {}, n.tickers.map(t => h('button', { type: 'button', class: 'tk', text: t, onclick: () => selectAsset(t) })));
  if (n.scope === 'group' && n.cats) tks.append(h('span', { class: 'tk', text: n.cats.map(c => CATS[c].label).join(' / ') }));
  if (n.scope === 'all') tks.append(h('span', { class: 'tk', text: 'WHOLE MARKET' }));
  el.append(tks);
  ui.newsEls.set(n.id, el);
  updateNewsTags(n, el);
  return el;
}

function updateNewsTags(n, el = ui.newsEls.get(n.id)) {
  if (!el) return;
  const tags = el.querySelector('.tags');
  const out = [];
  const a = n.analysis;
  if (a && !n.regime) {
    if (a.tone > 0) out.push(h('span', { class: 'tag bull', text: 'BULLISH' }));
    else if (a.tone < 0) out.push(h('span', { class: 'tag bear', text: 'BEARISH' }));
    else if (!n.followUp) out.push(h('span', { class: 'tag unk', text: 'NOISE?' }));
    if (a.real !== undefined && !n.resolved) out.push(h('span', { class: `tag ${a.real ? 'bull' : 'bear'}`, text: a.real ? '🧠 LIKELY TRUE' : '🧠 LIKELY FAKE' }));
    if (a.rug !== undefined) out.push(h('span', { class: `tag ${a.rug ? 'bear' : 'bull'}`, text: a.rug ? '🧠 RUG RISK: HIGH' : '🧠 RUG RISK: LOW' }));
  }
  if (n.pending && !n.resolved) out.push(h('span', { class: 'tag dev', text: '⏳ DEVELOPING' }));
  if (n.resolved) { out.push(h('span', { class: `tag res-${n.resolved}`, text: n.resolved === 'yes' ? '✔ PANNED OUT' : '✖ FIZZLED' })); el.dataset.done = '1'; }
  tags.replaceChildren(...out);
}

function renderBottom() {
  setText($('#holdCount'), String(Object.keys(run.pf.positions).length || ''));
  $('#sellAllBtn').disabled = !Object.keys(run.pf.positions).length || run.over;
  $$('.htab').forEach(b => b.classList.toggle('on', b.dataset.htab === ui.htab));
  const body = $('#holdBody');
  if (ui.htab === 'holdings') renderHoldings(body);
  else if (ui.htab === 'txs') renderTxs(body);
  else renderStats(body);
}

function renderHoldings(body) {
  const pf = run.pf;
  const list = Object.values(pf.positions).map(p => ({ p, price: price(p.t), eq: equityOf(p, price(p.t)) })).sort((a, b) => b.eq - a.eq);
  if (!list.length) { body.replaceChildren(h('p', { class: 'empty-note', text: 'No holdings yet. Pick an asset on the left and hit BUY.' })); ui.holdKey = ''; return; }
  const anyLev = list.some(x => x.p.lev > 1);
  const key = list.map(x => x.p.t).join() + anyLev;
  let tbody;
  if (ui.holdKey !== key) {
    ui.holdKey = key;
    tbody = h('tbody');
    const head = ['Asset', 'Qty', 'Avg price', 'Price', 'Value', 'P/L', 'P/L %', ...(anyLev ? ['Lev', 'Liq. price'] : []), ''];
    body.replaceChildren(h('table', { class: 'hold-table' }, h('thead', {}, h('tr', {}, head.map(x => h('th', { text: x })))), tbody, h('tfoot', {}, h('tr', { id: 'holdFoot' }))));
    for (const x of list) {
      const t = x.p.t;
      tbody.append(h('tr', { dataset: { t }, onclick: () => selectAsset(t) },
        h('td', {}, h('b', { text: t }), ' ', h('small', { class: 'muted', text: CATS[ASSET_BY_T[t].cat].icon })),
        ...Array.from({ length: anyLev ? 8 : 6 }, () => h('td')),
        h('td', {}, h('button', { type: 'button', class: 'mini', text: '½', title: 'Sell half', onclick: e => { e.stopPropagation(); quickSell(t, 0.5); } }),
          h('button', { type: 'button', class: 'mini', text: 'Sell', title: 'Sell all', onclick: e => { e.stopPropagation(); quickSell(t, 1); } }))));
    }
  } else tbody = body.querySelector('tbody');
  let tv = 0, tc = 0;
  [...tbody.children].forEach((tr, i) => {
    const { p, price: px, eq } = list[i];
    const pnl = eq - p.cost, pc = p.cost > 0 ? pnl / p.cost * 100 : 0;
    tv += eq; tc += p.cost;
    const tds = tr.children;
    const vals = [F.qty(p.qty), F.price(p.avg), F.price(px), F.money(eq), F.money(pnl, { sign: true }), F.pct(pc)];
    if (anyLev) vals.push(p.lev > 1 ? `${p.lev}×` : '1×', p.lev > 1 ? F.price(liqPrice(p)) : '—');
    vals.forEach((v, j) => setText(tds[j + 1], v));
    tds[5].className = tds[6].className = 'pl';
    tr.className = pnl >= 0 ? 'win' : 'lose';
    if (p.lev > 1 && px < liqPrice(p) * 1.05) tr.classList.add('danger');
    tr.classList.toggle('sel', p.t === run.selected);
  });
  const foot = $('#holdFoot');
  const tp = tv - tc;
  foot.replaceChildren(h('td', { text: 'Total' }), h('td'), h('td'), h('td'), h('td', { text: F.money(tv) }),
    h('td', { class: F.tone(tp), text: F.money(tp, { sign: true }) }), h('td', { class: F.tone(tp), text: F.pct(tc ? tp / tc * 100 : 0) }), ...(anyLev ? [h('td'), h('td')] : []), h('td'));
}

function renderTxs(body) {
  const txs = run.pf.txs;
  const key = `${run.pf.txId}`;
  if (ui.txKey === key && body.querySelector('table, .empty-note')) return;
  ui.txKey = key;
  if (!txs.length) { body.replaceChildren(h('p', { class: 'empty-note', text: 'No trades yet.' })); return; }
  body.replaceChildren(h('table', { class: 'tx-table' },
    h('thead', {}, h('tr', {}, ['Time', 'Type', 'Asset', 'Qty', 'Price', 'Cash', 'P/L'].map(x => h('th', { text: x })))),
    h('tbody', {}, txs.map(x => h('tr', { class: x.pnl > 0 ? 'win' : x.pnl < 0 ? 'lose' : '', onclick: () => selectAsset(x.t) },
      h('td', { text: 'T+' + F.clock(x.tick) }),
      h('td', { class: `side-${x.side}`, text: x.side === 'liquidation' ? '💀 LIQUIDATED' : x.side.toUpperCase() + (x.lev > 1 ? ` ${x.lev}×` : '') }),
      h('td', { text: x.t }), h('td', { text: F.qty(x.qty) }), h('td', { text: F.price(x.price) }),
      h('td', { text: x.side === 'buy' ? F.money(-x.amount) : F.money(x.amount, { sign: true }) }),
      h('td', { class: 'pl', text: x.side === 'buy' ? '' : `${F.money(x.pnl, { sign: true })} (${F.pct(x.pct)})` }))))));
}

function renderStats(body) {
  const s = run.stats, w = worthOf(run);
  const done = s.winners + s.losers;
  const items = [
    ['Seed', run.seed], ['Started with', F.money(s.start)], ['Net worth', F.money(w)], ['Peak', F.money(s.peak)], ['Lowest', F.money(s.low)],
    ['Trades', String(s.trades)], ['Win rate', done ? `${Math.round(s.winners / done * 100)}% (${s.winners}/${done})` : '—'],
    ['Best trade', s.bestTrade > 0 ? `${F.money(s.bestTrade, { sign: true })} ${s.bestTradeT}` : '—'], ['Worst trade', s.worstTrade < 0 ? F.money(s.worstTrade) : '—'],
    ['Fees paid', F.money(run.pf.fees)], ['Liquidations', String(s.liquidations)], ['Market time', F.clock(run.market.tick)],
  ];
  const key = items.map(i => i[1]).join('|');
  if (ui.statsKey === key) return;
  ui.statsKey = key;
  body.replaceChildren(h('div', { class: 'stats-grid' }, items.map(([k, v]) => h('div', {}, h('span', { text: k }), h('b', { text: v })))));
}

// ── End of run ───────────────────────────────────────────────────────────────
function finishRun() {
  if (!run || !run.end || run.endShown) return;
  run.endShown = true;
  store.clearRun();
  progress();
  const w = run.end.worth, s = run.stats;
  const clout = PG.cloutFor(run);
  meta.clout += clout;
  meta.lifetime.cloutEarned += clout;
  meta.lifetime.bestWorth = Math.max(meta.lifetime.bestWorth, s.peak);
  const rank = addScore(meta, run.mode, { worth: Math.round(w * 100) / 100, peak: Math.round(s.peak * 100) / 100, date: Date.now(), seed: run.seed, reason: run.end.reason });
  saveMeta();
  render();
  sfx.play(run.end.reason === 'bankrupt' ? 'liquidated' : 'end');
  if (w > s.start * 2) { fx.rain(16, 'up', ['+$', '💸', '📈']); }
  const title = { bankrupt: '💀 BANKRUPT', time: '🔔 TIME\'S UP', cashout: '🏦 CASHED OUT' }[run.end.reason] || '🏁 RUN OVER';
  const msg = run.end.reason === 'bankrupt' ? 'You ran out of money. The market thanks you for your liquidity.'
    : w >= s.start * 10 ? 'Absolutely pumped. Frame this one.' : w > s.start ? 'Green is green. Nicely done.' : 'Not every run is a winner. The market will be here tomorrow.';
  const done = s.winners + s.losers;
  const canvas = h('canvas', { class: 'worth-chart', width: '640', height: '120' });
  showModal([
    h('h2', { text: title }),
    h('div', { class: `result-big ${F.tone(w - s.start)}`, text: F.money(w) }),
    h('p', { text: `${msg} ${F.money(s.start)} → ${F.money(w)} (${F.pct((w / s.start - 1) * 100)}).` }),
    canvas,
    h('div', { class: 'result-grid' }, [
      ['Mode', MODES[run.mode].label], ['Peak net worth', F.money(s.peak)], ['Lowest', F.money(s.low)], ['Trades', String(s.trades)],
      ['Win rate', done ? `${Math.round(s.winners / done * 100)}%` : '—'], ['Best trade', s.bestTrade > 0 ? `${F.money(s.bestTrade, { sign: true })} ${s.bestTradeT}` : '—'],
      ['Liquidations', String(s.liquidations)], ['Seed', run.seed],
      ['High score', rank >= 0 ? `#${rank + 1} in ${MODES[run.mode].label}` : 'not this time'], ['Clout earned', `+${clout} ⚡`],
    ].map(([k, v]) => h('div', {}, h('span', { text: k }), h('b', { text: v })))),
    h('div', { class: 'btn-row' },
      h('button', { type: 'button', class: 'btn primary', text: '▶ Play again', onclick: () => { ui.modal = null; newRun({ mode: run.mode }); } }),
      h('button', { type: 'button', class: 'btn', text: '⚡ Upgrades', onclick: () => { ui.modal = null; openUpgrades(); } }),
      h('button', { type: 'button', class: 'btn', text: 'Menu', onclick: () => { ui.modal = null; openMenu(); } })),
  ], 'results');
  drawWorth(canvas, s.worth, s.start);
}

function drawWorth(c, pts, start) {
  const g = c.getContext('2d'), W = c.width, H = c.height;
  if (pts.length < 2) return;
  const lo = Math.min(...pts, start), hi = Math.max(...pts, start), r = hi - lo || 1;
  const y = v => H - 8 - ((v - lo) / r) * (H - 16);
  g.strokeStyle = 'rgba(255,255,255,0.25)'; g.setLineDash([4, 4]);
  g.beginPath(); g.moveTo(0, y(start)); g.lineTo(W, y(start)); g.stroke(); g.setLineDash([]);
  g.strokeStyle = pts[pts.length - 1] >= start ? '#2bff88' : '#ff3b5c'; g.lineWidth = 2;
  g.beginPath();
  pts.forEach((v, i) => { const x = (i / (pts.length - 1)) * W; i ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); });
  g.stroke();
}

// ── Modals ───────────────────────────────────────────────────────────────────
function showModal(kids, name, wide = false) {
  ui.modal = name;
  const card = $('#modalCard');
  card.className = `modal-card${wide ? ' wide' : ''}`;
  card.replaceChildren(...kids.filter(k => k != null && k !== false));
  $('#modal').hidden = false;
  card.scrollTop = 0;
  const f = card.querySelector('button.primary, button');
  if (f) f.focus({ preventScroll: true });
}

function closeModal() {
  if (ui.modal === 'results') return;
  ui.modal = null;
  $('#modal').hidden = true;
}

function openMenu() {
  const live = run && !run.over;
  ui.mode = ui.mode || (live ? run.mode : 'session');
  const best = m => meta.scores[m] && meta.scores[m][0] ? `Best: ${F.money(meta.scores[m][0].worth, { compact: true })}` : 'No score yet';
  const modes = h('div', { class: 'modes' }, Object.entries(MODES).map(([id, m]) => h('button', { type: 'button', class: `mode ${ui.mode === id ? 'on' : ''}`, dataset: { mode: id },
    onclick: e => { ui.mode = id; $$('.mode').forEach(b => b.classList.toggle('on', b === e.currentTarget)); } },
    h('b', { text: m.label }), h('small', { text: m.blurb }), h('span', { class: 'best', text: best(id) }))));
  const start = () => {
    sfx.unlock();
    if (live && !confirm('Abandon the current run and start a new one? It won\'t count for high scores.')) return;
    newRun({ seed: $('#seedIn').value.trim(), mode: ui.mode });
  };
  const kids = [
    h('div', { class: 'menu-top' }, h('div', {}, h('h1', { class: 'menu-logo', html: 'PUMP<span>ED</span>' }), h('p', { class: 'tagline', text: 'Buy high. Sell higher. Panic sell lowest.' })),
      h('span', { class: 'clout', title: 'Clout: earned at the end of every run and from achievements. Spend it on upgrades.', text: `⚡ ${meta.clout} Clout` })),
    h('p', { text: `You get ${F.money(PG.startCash(meta))} of play money and a market full of rocket stocks, meme coins and outright dumpster fires. Ride the pumps, dodge the crashes, get rich before you go broke.` }),
    live ? h('div', { class: 'continue' }, h('span', {}, h('b', { text: `${MODES[run.mode].label} in progress: ` }), `${F.money(worthOf(run))} · ${Number.isFinite(timeLeft(run)) ? F.clock(timeLeft(run)) + ' left' : 'T+' + F.clock(run.market.tick)}`),
      h('span', { class: 'btn-row', style: { margin: 0 } },
        run.mode === 'endless' ? h('button', { type: 'button', class: 'btn', text: '🏦 Cash out', title: 'Sell everything and end the run, banking your score and Clout', onclick: () => { if (confirm('Sell everything and end this run?')) { ui.modal = null; cashOut(run); finishRun(); } } }) : null,
        h('button', { type: 'button', class: 'btn primary', text: '▶ Continue', onclick: () => { ui.modal = null; $('#modal').hidden = true; sfx.unlock(); } }))) : null,
    h('h3', { text: 'New run' }),
    modes,
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: `btn ${live ? '' : 'primary'}`, text: live ? 'Start new run' : '▶ Start trading', onclick: start })),
    h('div', { class: 'seed-row' }, h('label', { for: 'seedIn', text: 'Market seed (optional):' }), h('input', { id: 'seedIn', type: 'text', maxlength: '24', placeholder: 'random', value: params.get('seed') || '' }), h('small', { text: 'Same seed, same market.' })),
    h('div', { class: 'menu-links' },
      h('button', { type: 'button', class: 'btn', text: '⚡ Upgrades', onclick: openUpgrades }),
      h('button', { type: 'button', class: 'btn', text: `🏆 Achievements ${Object.keys(meta.achievements).length}/${PG.ACHIEVEMENTS.length}`, onclick: openAchievements }),
      h('button', { type: 'button', class: 'btn', text: '📋 High scores', onclick: openScores }),
      h('button', { type: 'button', class: 'btn', text: '❓ How to play', onclick: openHelp }),
      h('button', { type: 'button', class: 'btn', text: '⚙ Settings', onclick: openSettings }),
      SIMPLE ? h('a', { class: 'btn', href: '/pumped/', text: '🖥 Full view' }) : h('a', { class: 'btn', href: '/simple.pumped/', title: 'Bigger text, plain words, fewer panels. Same save.', text: '🔍 Simple view' }),
      h('a', { class: 'btn', href: '/pages.html', text: '← missing.website' })),
    h('p', { class: 'disclaimer', text: 'A game. Every company, coin, person and headline is made up. No real money, no real trading, not financial advice.' }),
  ];
  showModal(kids, 'menu');
}

const backBtn = () => h('button', { type: 'button', class: 'btn', text: '← Back', onclick: openMenu });

function openUpgrades() {
  const card = u => {
    const l = PG.lvl(meta, u.id), cost = PG.upgradeCost(meta, u.id);
    return h('div', { class: `card ${l ? 'got' : ''}` },
      h('div', { class: 'ach-head' }, h('span', { class: 'ico', text: u.icon }), h('b', { text: u.name })),
      h('div', { class: 'lvl' }, Array.from({ length: u.max }, (_, i) => h('i', { class: i < l ? 'on' : '' }))),
      h('small', { text: u.desc[0] }),
      h('small', { text: l ? `Now: ${u.desc[l]}` : '' }),
      cost != null ? h('small', { text: `Next: ${u.desc[l + 1]}` }) : null,
      h('button', { type: 'button', class: 'btn primary', disabled: cost == null || meta.clout < cost, text: cost == null ? 'MAXED' : `Buy · ⚡${cost}`,
        onclick: () => { const r = PG.buyUpgrade(meta, u.id); if (r.ok) { sfx.play('achievement'); saveMeta(); toast(`${u.icon} ${u.name} upgraded!${['orbit', 'night', 'start'].includes(u.id) ? ' Applies from your next run.' : ''}`, 'gold'); renderScanner(); openUpgrades(); } else toast(r.error, 'bad'); } }));
  };
  const theme = ([id, th]) => {
    const owned = meta.themes.includes(id), on = S().chartTheme === id;
    return h('div', { class: `card ${on ? 'got' : ''}` },
      h('div', { style: { height: '34px', borderRadius: '4px', background: `linear-gradient(135deg, ${th.bg} 40%, ${th.up} 40% 55%, ${th.bg} 55% 70%, ${th.down} 70% 80%, ${th.bg} 80%)`, border: '1px solid var(--line2)' } }),
      h('b', { text: th.name }),
      h('button', { type: 'button', class: `btn ${owned ? '' : 'primary'}`, disabled: on || (!owned && meta.clout < PG.THEME_COST), text: on ? 'In use' : owned ? 'Use' : `Unlock · ⚡${PG.THEME_COST}`,
        onclick: () => { if (!owned) { const r = PG.buyTheme(meta, id); if (!r.ok) { toast(r.error, 'bad'); return; } sfx.play('achievement'); } S().chartTheme = id; saveMeta(); applySettings(); openUpgrades(); } }));
  };
  showModal([
    h('div', { class: 'menu-top' }, h('h2', { text: '⚡ Upgrades' }), h('span', { class: 'clout', text: `⚡ ${meta.clout} Clout` })),
    h('p', { text: 'Clout comes from finishing runs (more for richer runs) and from achievements. Upgrades show you more, they never trade for you: scanners don\'t know how a pump ends and analysts are sometimes wrong.' }),
    h('div', { class: 'cards' }, PG.UPGRADES.map(card)),
    h('h3', { text: '🎨 Chart themes' }),
    h('div', { class: 'cards' }, Object.entries(CHART_THEMES).map(theme)),
    h('div', { class: 'btn-row end' }, backBtn()),
  ], 'upgrades', true);
}

function openAchievements() {
  const got = Object.keys(meta.achievements).length;
  showModal([
    h('h2', { text: `🏆 Achievements · ${got}/${PG.ACHIEVEMENTS.length}` }),
    h('div', { class: 'cards' }, PG.ACHIEVEMENTS.map(a => {
      const on = !!meta.achievements[a.id];
      return h('div', { class: `card ${on ? 'got' : 'locked'}` },
        h('div', { class: 'ach-head' }, h('span', { class: 'ico', text: on || !a.secret ? a.icon : '❔' }), h('b', { text: on || !a.secret ? a.name : 'Secret' })),
        h('small', { text: on || !a.secret ? a.desc : 'Keep playing to find out.' }),
        h('small', { class: on ? 'up' : '', text: on ? `Unlocked · +${a.clout} ⚡` : `+${a.clout} ⚡` }));
    })),
    h('div', { class: 'btn-row end' }, backBtn()),
  ], 'achievements', true);
}

function openScores() {
  const table = mode => {
    const list = meta.scores[mode];
    if (!list.length) return h('p', { class: 'muted', text: 'No runs yet.' });
    return h('table', { class: 'scores' }, h('thead', {}, h('tr', {}, ['#', 'Net worth', 'Peak', 'Ended', 'Seed', 'Date'].map(x => h('th', { text: x })))),
      h('tbody', {}, list.map((x, i) => h('tr', {}, h('td', { text: String(i + 1) }), h('td', { class: F.tone(x.worth - 1000), text: F.money(x.worth) }), h('td', { text: F.money(x.peak) }),
        h('td', { text: { time: 'time', bankrupt: 'bankrupt', cashout: 'cashed out' }[x.reason] || x.reason }), h('td', { text: x.seed }), h('td', { text: x.date ? new Date(x.date).toLocaleDateString() : '' })))));
  };
  showModal([
    h('h2', { text: '📋 High scores' }),
    h('p', { class: 'muted', text: `Runs played: ${meta.lifetime.runs} · Trades made: ${meta.lifetime.trades} · Best net worth ever: ${F.money(meta.lifetime.bestWorth)} · Clout earned: ${meta.lifetime.cloutEarned}` }),
    ...Object.entries(MODES).flatMap(([id, m]) => [h('h3', { text: m.label }), table(id)]),
    h('div', { class: 'btn-row end' }, backBtn()),
  ], 'scores', true);
}

function openHelp() {
  showModal([
    h('h2', { text: '❓ How to play' }),
    h('p', { text: 'Pick an asset on the left, choose an amount, hit BUY. Sell later for more (hopefully). Your net worth is your cash plus everything you own, valued at the current price.' }),
    h('p', { text: '🚀 Pumps: assets sometimes surge. Some keep going, some fade, some collapse in seconds (a rug pull). 📉 Crashes: single assets or the whole market can drop. Some recover, some don\'t. Cash doesn\'t crash.' }),
    h('p', { text: '📰 News explains moves but doesn\'t promise anything. Developing stories resolve a few seconds later, one way or the other. 🔥 Hype makes pumps bigger, but overheated assets (80+) crash and get rugged more often.' }),
    h('p', { text: '🎲 Leverage multiplies gains and losses and can get you liquidated. ⚡ Clout from each run buys upgrades. Different assets behave very differently: safe funds crawl, degen coins go to the moon or to zero.' }),
    h('p', { text: '🦜 Squawker (top left, or press T) is the market\'s social site: celebrities, news and a few hundred bots reacting to every move. It\'s noisy and usually late, and the market keeps running while you scroll. Naming a coin in your own squawk ($GOB) gives it a little hype.' }),
    h('p', { text: '🔍 Hard to read? Put "simple." in front of the game: missing.website/simple.pumped/ is the same game and save with bigger text and fewer panels.' }),
    h('p', { text: 'Keys: T terminal / Squawker · B / S buy or sell · 1–4 pick 10/25/50/100% · Enter trade · ↑ ↓ change asset · / search · Space pause · Esc close.' }),
    h('div', { class: 'btn-row end' }, backBtn()),
  ], 'help');
}

function openSettings() {
  const s = S();
  const sw = (key, label, note) => h('div', { class: 'set-row' }, h('div', {}, h('b', { text: label }), note ? h('small', { text: note }) : null),
    h('button', { type: 'button', class: `switch ${s[key] ? 'on' : ''}`, role: 'switch', 'aria-checked': String(!!s[key]), 'aria-label': label, onclick: e => { s[key] = !s[key]; e.currentTarget.classList.toggle('on', s[key]); e.currentTarget.setAttribute('aria-checked', String(s[key])); saveMeta(); applySettings(); } }));
  const seg = (key, label, opts, note) => h('div', { class: 'set-row' }, h('div', {}, h('b', { text: label }), note ? h('small', { text: note }) : null), h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { type: 'button', class: s[key] === v ? 'on' : '', text: l, onclick: e => { s[key] = v; [...e.currentTarget.parentNode.children].forEach(b => b.classList.toggle('on', b === e.currentTarget)); saveMeta(); applySettings(); } }))));
  const live = run && !run.over;
  showModal([
    h('h2', { text: '⚙ Settings' }),
    sw('sound', 'Sound effects'),
    h('div', { class: 'set-row' }, h('b', { text: 'Volume' }), h('input', { type: 'range', min: '0', max: '1', step: '0.1', value: String(s.volume), 'aria-label': 'Volume', oninput: e => { s.volume = Number(e.target.value); saveMeta(); applySettings(); } })),
    sw('effects', 'Screen effects', 'Flying numbers, coin bursts, banners and red flashes.'),
    sw('reducedMotion', 'Reduced motion', 'No animations, scrolling ticker or chart easing. Effects become simple banners.'),
    sw('tooltips', 'Explain terms', 'Hover or tap underlined words for a short explanation.'),
    seg('speed', 'Market speed', [[0.5, 'Chill 0.5×'], [1, 'Normal'], [2, 'Turbo 2×']], 'How fast time passes. Timed runs still last the same number of market seconds.'),
    seg('chartTheme', 'Chart theme', Object.entries(CHART_THEMES).filter(([id]) => meta.themes.includes(id)).map(([id, t]) => [id, t.name]), 'Unlock more in Upgrades.'),
    h('h3', { text: 'Danger zone' }),
    h('div', { class: 'btn-row' },
      live ? h('button', { type: 'button', class: 'btn', text: 'Restart this run', onclick: () => { if (confirm('Throw away this run and start a fresh one in the same mode?')) newRun({ mode: run.mode }); } }) : null,
      h('button', { type: 'button', class: 'btn danger', text: 'Reset everything…', onclick: resetAll })),
    h('div', { class: 'btn-row end' }, h('button', { type: 'button', class: 'btn primary', text: 'Done', onclick: () => (live ? (ui.modal = null, $('#modal').hidden = true) : openMenu()) })),
  ], 'settings');
}

function resetAll() {
  if (!confirm('Delete your current run, high scores, upgrades, achievements and settings? This cannot be undone.')) return;
  store.resetAll();
  meta = store.loadMeta();
  run = null;
  $('#app').hidden = true;
  applySettings();
  openMenu();
}

function applySettings() {
  const s = S();
  sfx.set(s.sound, s.volume);
  setText($('#soundBtn'), s.sound && s.volume > 0 ? '🔊' : '🔇');
  const reduced = s.reducedMotion;
  fx.enabled = s.effects;
  fx.reduced = reduced;
  document.body.classList.toggle('reduce-motion', reduced);
  document.body.classList.toggle('no-tips', !s.tooltips);
  if (chart) { chart.reducedMotion = reduced; chart.setTheme(meta.themes.includes(s.chartTheme) ? s.chartTheme : 'terminal'); }
  if (run) { restartLoop(); renderScanner(); }
}

// ── Toasts ───────────────────────────────────────────────────────────────────
function toast(text, kind = '', ms = 3200) {
  const box = $('#toasts');
  const el = h('div', { class: `toast ${kind}`, text });
  box.append(el);
  while (box.childElementCount > 5) box.firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
}

// ── Input ────────────────────────────────────────────────────────────────────
function bindUI() {
  $$('.vtab').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  $('#search').addEventListener('input', e => { ui.search = e.target.value; renderList(); });
  $$('.ltab').forEach(b => b.addEventListener('click', () => { ui.ltab = b.dataset.ltab; $$('.ltab').forEach(x => x.classList.toggle('on', x === b)); renderList(); }));
  $$('#ranges button').forEach(b => b.addEventListener('click', () => {
    ui.range = b.dataset.range === 'all' ? 'all' : Number(b.dataset.range);
    $$('#ranges button').forEach(x => x.classList.toggle('on', x === b));
    renderChart();
  }));
  $$('.ttab').forEach(b => b.addEventListener('click', () => setSide(b.dataset.side)));
  $$('#pcts button').forEach(b => b.addEventListener('click', () => { b.blur(); pickPct(Number(b.dataset.pct)); }));
  $('#amount').addEventListener('input', () => { ui.pct = null; renderTrade(); });
  $('#amount').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doTrade(); } });
  $('#goBtn').addEventListener('click', doTrade);
  $('#cStar').addEventListener('click', () => toggleWatch(run.selected));
  $$('.htab').forEach(b => b.addEventListener('click', () => { ui.htab = b.dataset.htab; ui.txKey = ui.holdKey = ui.statsKey = ''; renderBottom(); }));
  $('#sellAllBtn').addEventListener('click', () => {
    if (!run || !Object.keys(run.pf.positions).length) return;
    sfx.unlock();
    let total = 0;
    for (const t of Object.keys(run.pf.positions)) { const r = trade(run, { side: 'sell', t, fraction: 1 }); if (r.ok) total += r.tx.pnl; }
    toast(`Sold everything. P/L ${F.money(total, { sign: true })}`, total >= 0 ? 'good' : 'bad');
    sfx.play(total >= 0 ? 'sellWin' : 'sellLoss');
    saveRun(); render();
  });
  $('#pauseBtn').addEventListener('click', togglePause);
  $('#soundBtn').addEventListener('click', () => { S().sound = !S().sound; if (S().sound) sfx.unlock(); saveMeta(); applySettings(); });
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#menuBtn').addEventListener('click', openMenu);
  $('#brand').addEventListener('click', e => { e.preventDefault(); openMenu(); });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && run && !run.over && ui.modal !== 'results') closeModal(); });

  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveRun(); });
  addEventListener('pagehide', saveRun);
}

function togglePause() {
  if (!run || run.over) return;
  ui.paused = !ui.paused;
  renderTop();
  toast(ui.paused ? '⏸ Paused. The market waits for no one… except you.' : '▶ Back to the market.');
}

// Terminal ↔ Squawker. The market keeps running on both.
function switchView(v) {
  if (!run || v === ui.view) return;
  ui.view = v;
  $('#terminalView').hidden = v !== 'terminal';
  $('#socialView').hidden = v !== 'social';
  $$('.vtab').forEach(b => { b.classList.toggle('on', b.dataset.view === v); b.setAttribute('aria-selected', String(b.dataset.view === v)); });
  document.body.classList.toggle('in-social', v === 'social');
  if (v === 'social') social.show(); else { social.hide(); ui.holdKey = ui.txKey = ui.statsKey = ''; render(); }
  social.tick();
  sfx.play('click');
  window.scrollTo(0, 0);
}

function onKey(e) {
  if (e.key === 'Escape') { if (ui.modal && run && !run.over && ui.modal !== 'results') closeModal(); return; }
  if (ui.modal || !run) return;
  const typing = e.target.matches('input, textarea, select');
  if (typing && e.target.id !== 'amount') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if (typing) {
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); moveSel(k === 'ArrowUp' ? -1 : 1); }
    return;
  }
  if (k === 't' || k === 'T') { switchView(ui.view === 'social' ? 'terminal' : 'social'); return; }
  if (k === ' ') { e.preventDefault(); togglePause(); return; }
  if (ui.view === 'social') return;
  if (k === 'b' || k === 'B') setSide('buy');
  else if (k === 's' || k === 'S') setSide('sell');
  else if (k === ' ') { e.preventDefault(); togglePause(); }
  else if (k === 'Enter') { e.preventDefault(); doTrade(); }
  else if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); moveSel(k === 'ArrowUp' ? -1 : 1); }
  else if (['1', '2', '3', '4'].includes(k)) pickPct([0.1, 0.25, 0.5, 1][Number(k) - 1]);
  else if (k === '/') { e.preventDefault(); $('#search').focus(); }
}

function moveSel(d) {
  const vis = [...$('#assetList').children].filter(r => r.dataset.t && !r.hidden).map(r => r.dataset.t);
  if (!vis.length) return;
  const i = vis.indexOf(run.selected);
  selectAsset(vis[(i + d + vis.length) % vis.length]);
}

// ── Debug / testing hooks (?debug=1) ─────────────────────────────────────────
function exposeDebug() {
  globalThis.pumped = {
    get run() { return run; }, get meta() { return meta; },
    step(n = 1) { for (let i = 0; i < n && run && !run.over; i++) { const notes = stepRun(run); handleNotes(notes); scan(); progress(); stepFeed(run.social, run, notes, Math.random, meta.profile); } render(); social.tick(); if (run.over) finishRun(); },
    view: switchView, get social() { return social; },
    event(id, t) { const r = forceEvent(run.market, id, t); handleNotes(r.notes); render(); return r.headline; },
    pump(t, opts) { handleNotes(forcePump(run.market, t, opts)); },
    crash(t, opts) { handleNotes(forceCrash(run.market, t, opts)); },
    regime(id) { handleNotes(forceRegime(run.market, id)); render(); },
    pause(v = true) { ui.paused = v; renderTop(); },
    trade(o) { const r = trade(run, o); afterTrade(r); return r; },
    newRun, cashOut: () => { cashOut(run); finishRun(); }, save: saveRun, scan, progress,
    give(c) { meta.clout += c; saveMeta(); },
  };
}

boot();

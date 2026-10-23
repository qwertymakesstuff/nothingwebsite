// The Repair Workshop: an illustrated view of the shop (shelves, tool wall, job board, benches,
// intake rack, test station) where everything is clickable, plus panels for machines on benches
// and the rack, active jobs, a getting-started checklist and the activity log.

import { h, button, svgEl, s } from '../dom.js';
import { report, toast } from '../overlay.js';
import { PART, CATEGORY } from '../../data/catalog.js';
import { CUSTOMER } from '../../data/customers.js';
import { TOOL } from '../../data/tools.js';
import { DAY_START, DAY_END } from '../../core/config.js';
import { clock, money, plural } from '../../core/util.js';
import { intakeCap, capacity, shelfUsed } from '../../core/business.js';
import { brandColor } from '../art.js';
import { customerBadge, statusIcon } from '../widgets.js';
import { KIND_LABEL } from '../../core/jobs.js';

export function render(app, root) {
  const g = app.game, st = g.state;
  root.append(h('div.workshop',
    scene(app),
    h('div.ws-grid',
      machinesPanel(app),
      jobsPanel(app),
      st.tutorial.done ? null : tutorialPanel(app),
      logPanel(app))));
}

function sky(minute) {
  const t = (minute - DAY_START) / (DAY_END - DAY_START);
  const stops = [[0, '#8fc7ef', '#d8ecf7'], [0.6, '#7fb2db', '#f3d9a4'], [0.85, '#e58c5a', '#f6c47a'], [1, '#2a2f5a', '#7a5c8a']];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) if (t >= stops[i][0] && t <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; }
  const k = (t - a[0]) / Math.max(0.001, b[0] - a[0]);
  const mix = (c1, c2) => { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(c1), B = p(c2); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  return [mix(a[1], b[1]), mix(a[2], b[2]), t];
}

function scene(app) {
  const g = app.game, st = g.state;
  const [skyTop, skyBot, t] = sky(st.minute);
  const W = 1200, H = 470;
  const inv = st.inventory.map(u => st.parts[u]).filter(Boolean);
  const offers = Object.values(st.jobs).filter(j => j.status === 'offered');
  const active = Object.values(st.jobs).filter(j => j.status === 'active');
  let shelf = '';
  inv.slice(0, 30).forEach((p, i) => {
    const d = PART[p.id];
    const row = Math.floor(i / 10), col = i % 10;
    const x = 52 + col * 25, y = 128 + row * 78;
    const size = CATEGORY[d.cat].size;
    const hgt = d.cat === 'case' ? 44 : size >= 2 ? 30 : 20;
    shelf += `<rect x="${x}" y="${y - hgt}" width="21" height="${hgt}" rx="2" fill="${brandColor(d)}" stroke="#0005"/><rect x="${x + 3}" y="${y - hgt + 4}" width="15" height="4" fill="#fff4"/>`;
  });
  const tools = Object.keys(st.tools).filter(k => TOOL[k]);
  let pegs = '';
  tools.forEach((id, i) => {
    const x = 352 + (i % 6) * 34, y = 70 + Math.floor(i / 6) * 40;
    const shape = { screwdriver: `<rect x="${x + 12}" y="${y}" width="5" height="20" fill="#e2c044"/><rect x="${x + 13.5}" y="${y + 20}" width="2" height="10" fill="#bbb"/>`, flashlight: `<rect x="${x + 8}" y="${y + 4}" width="14" height="22" rx="3" fill="#374151"/><circle cx="${x + 15}" cy="${y + 4}" r="6" fill="#fde68a"/>`, psutester: `<rect x="${x + 4}" y="${y + 3}" width="22" height="26" rx="3" fill="#c8a227"/><rect x="${x + 8}" y="${y + 7}" width="14" height="7" fill="#1f2937"/>`, thermalcam: `<rect x="${x + 4}" y="${y + 6}" width="24" height="18" rx="4" fill="#ea580c"/><circle cx="${x + 16}" cy="${y + 15}" r="5" fill="#111"/>` }[id];
    pegs += shape || `<rect x="${x + 6}" y="${y + 4}" width="18" height="24" rx="3" fill="#475569"/><rect x="${x + 9}" y="${y + 8}" width="12" height="6" fill="#93c5fd"/>`;
  });
  let notes = '';
  [...active, ...offers].slice(0, 9).forEach((j, i) => {
    const x = 838 + (i % 3) * 70, y = 64 + Math.floor(i / 3) * 56;
    const col = j.status === 'active' ? '#fef3c7' : '#e0f2fe';
    notes += `<g transform="rotate(${((i * 37) % 9) - 4} ${x + 28} ${y + 22})"><rect x="${x}" y="${y}" width="58" height="46" fill="${col}" stroke="#0002"/><circle cx="${x + 29}" cy="${y + 4}" r="3" fill="${j.status === 'active' ? '#dc2626' : '#2563eb'}"/><rect x="${x + 8}" y="${y + 14}" width="40" height="3" fill="#0003"/><rect x="${x + 8}" y="${y + 22}" width="32" height="3" fill="#0003"/><rect x="${x + 8}" y="${y + 30}" width="36" height="3" fill="#0003"/></g>`;
  });
  const benchSvg = st.benches.map((uid, i) => {
    const x = 330 + i * 190, y = 300;
    const pc = uid ? st.pcs[uid] : null;
    let tower = '';
    if (pc) {
      const cs = PART[st.parts[pc.caseUid].id];
      const c = brandColor(cs);
      tower = `<rect x="${x + 50}" y="${y - 120}" width="70" height="118" rx="6" fill="${c}" stroke="#0b0d10" stroke-width="2"/>${pc.closed ? `<rect x="${x + 56}" y="${y - 112}" width="58" height="90" rx="3" fill="#0004"/>` : `<rect x="${x + 56}" y="${y - 112}" width="58" height="90" rx="3" fill="#2c3440"/><rect x="${x + 62}" y="${y - 104}" width="36" height="44" fill="#2f6f5a"/><rect x="${x + 64}" y="${y - 54}" width="44" height="10" fill="#23272e"/>`}<circle cx="${x + 85}" cy="${y - 12}" r="3" fill="${g.powered && g.powered[uid] ? '#22c55e' : '#334155'}"/>`;
      if (pc.owner !== 'shop') tower += `<rect x="${x + 112}" y="${y - 90}" width="26" height="16" rx="2" fill="#fef3c7" transform="rotate(12 ${x + 125} ${y - 82})"/>`;
    }
    return `<g class="hot" data-go="assembly" data-bench="${i}" tabindex="0" role="button" aria-label="Bench ${i + 1}${pc ? ': ' + pc.name : ' (empty)'}"><title>Bench ${i + 1}${pc ? ': ' + pc.name : ' — empty'}</title>
      <rect x="${x}" y="${y}" width="170" height="16" rx="3" fill="#8b5e34"/><rect x="${x + 6}" y="${y + 16}" width="10" height="110" fill="#5b3b20"/><rect x="${x + 154}" y="${y + 16}" width="10" height="110" fill="#5b3b20"/>
      <rect x="${x + 10}" y="${y - 6}" width="150" height="6" rx="2" fill="#3f4a5a"/>${tower}
      <text x="${x + 85}" y="${y + 40}" text-anchor="middle" class="scene-label">BENCH ${i + 1}</text></g>`;
  }).join('');
  const rack = st.intake.map((uid, i) => {
    const pc = st.pcs[uid];
    const cs = PART[st.parts[pc.caseUid].id];
    const x = 52 + (i % 3) * 66, y = 412 - Math.floor(i / 3) * 86;
    return `<rect x="${x}" y="${y - 74}" width="50" height="74" rx="4" fill="${brandColor(cs)}" stroke="#0b0d10"/><rect x="${x + 30}" y="${y - 66}" width="20" height="12" fill="${pc.owner === 'shop' ? '#bbf7d0' : '#fef3c7'}"/>`;
  }).join('');
  const lamp = t > 0.75 ? 0.35 : 0.15;
  const svg = `<svg viewBox="0 0 ${W} ${H}" class="scene" role="group" aria-label="Your workshop. Click an area to go there.">
    <defs><linearGradient id="skyg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient>
    <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3b3430"/><stop offset="1" stop-color="#2a2522"/></linearGradient>
    <pattern id="brick" width="60" height="30" patternUnits="userSpaceOnUse"><rect width="60" height="30" fill="none"/><path d="M0 15 H60 M30 0 V15 M0 15 V30 M60 15 V30" stroke="#0000001a" stroke-width="2"/></pattern>
    <radialGradient id="glow" cx=".5" cy=".2" r=".8"><stop offset="0" stop-color="#ffe9b8" stop-opacity="${lamp}"/><stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/></radialGradient>
    <pattern id="cork" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#b8865a"/><circle cx="3" cy="3" r="1" fill="#9c6f47"/><circle cx="8" cy="7" r="1.2" fill="#c99a6e"/></pattern>
    <pattern id="peg" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#c9a77b"/><circle cx="8" cy="8" r="1.6" fill="#8a6b45"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="url(#wall)"/><rect width="${W}" height="${H - 90}" fill="url(#brick)"/>
    <rect y="${H - 90}" width="${W}" height="90" fill="#3d332c"/><rect y="${H - 92}" width="${W}" height="4" fill="#5a4a3e"/>
    <g aria-hidden="true"><rect x="600" y="40" width="200" height="140" rx="4" fill="url(#skyg)" stroke="#1c1917" stroke-width="8"/><path d="M700 40 V180 M600 110 H800" stroke="#1c1917" stroke-width="5"/>
      ${t > 0.9 ? '<circle cx="760" cy="70" r="10" fill="#fef9c3"/>' : `<circle cx="${620 + t * 160}" cy="${130 - Math.sin(t * Math.PI) * 70}" r="14" fill="#fde68a" opacity=".9"/>`}
      <path d="M600 170 Q650 140 700 165 Q760 135 800 160 V180 H600Z" fill="#0f172a55"/></g>
    <g class="hot" data-go="store" data-tab="inventory" tabindex="0" role="button" aria-label="Parts shelves: ${inv.length} items. Open inventory"><title>Parts shelves — ${inv.length} items</title>
      <rect x="40" y="40" width="270" height="250" fill="#00000022"/>${[128, 206, 284].map(y => `<rect x="40" y="${y}" width="270" height="9" fill="#7a5230"/><rect x="40" y="${y + 9}" width="270" height="3" fill="#0004"/>`).join('')}${shelf}
      <text x="175" y="34" text-anchor="middle" class="scene-label">SHELVES ${shelfUsed(st)}/${capacity(st)}</text></g>
    <g class="hot" data-go="store" data-tab="tools" tabindex="0" role="button" aria-label="Tool wall: ${tools.length} tools"><title>Tool wall</title><rect x="340" y="50" width="220" height="130" rx="4" fill="url(#peg)" stroke="#6b4f31" stroke-width="4"/>${pegs}<text x="450" y="200" text-anchor="middle" class="scene-label">TOOLS</text></g>
    <g class="hot" data-go="jobs" tabindex="0" role="button" aria-label="Job board: ${offers.length} offers, ${active.length} active"><title>Job board</title><rect x="826" y="44" width="230" height="190" rx="4" fill="url(#cork)" stroke="#6b4f31" stroke-width="6"/>${notes}
      <text x="941" y="252" text-anchor="middle" class="scene-label">JOB BOARD${offers.length ? ` · ${offers.length} NEW` : ''}</text></g>
    <g class="hot" data-go="business" tabindex="0" role="button" aria-label="Office desk: business overview"><title>Office desk — business overview</title><rect x="1080" y="300" width="100" height="12" fill="#6b4f31"/><rect x="1088" y="312" width="8" height="66" fill="#4a3522"/><rect x="1164" y="312" width="8" height="66" fill="#4a3522"/>
      <rect x="1098" y="270" width="50" height="30" rx="2" fill="#1f2937"/><rect x="1101" y="273" width="44" height="22" fill="#34d399" opacity=".5"/><path d="M1104 290 l8 -6 l7 3 l10 -9 l10 4" stroke="#065f46" fill="none" stroke-width="2"/><text x="1130" y="398" text-anchor="middle" class="scene-label">OFFICE</text></g>
    <g class="hot" data-go="testing" tabindex="0" role="button" aria-label="Test station"><title>Test station</title><rect x="${330 + st.benches.length * 190}" y="300" width="150" height="14" rx="3" fill="#475569"/><rect x="${336 + st.benches.length * 190}" y="314" width="8" height="64" fill="#334155"/><rect x="${466 + st.benches.length * 190}" y="314" width="8" height="64" fill="#334155"/>
      <rect x="${352 + st.benches.length * 190}" y="226" width="106" height="68" rx="4" fill="#0f172a" stroke="#64748b" stroke-width="3"/><rect x="${358 + st.benches.length * 190}" y="232" width="94" height="56" fill="#1e3a8a"/><text x="${405 + st.benches.length * 190}" y="266" text-anchor="middle" fill="#93c5fd" font-size="14" font-family="Chakra Petch,sans-serif">BLAZEMARK</text><rect x="${398 + st.benches.length * 190}" y="294" width="14" height="8" fill="#64748b"/>
      <text x="${405 + st.benches.length * 190}" y="398" text-anchor="middle" class="scene-label">TEST STATION</text></g>
    ${benchSvg}
    <g class="hot" data-go="intake" tabindex="0" role="button" aria-label="Intake rack: ${st.intake.length} machines"><title>Intake rack</title><rect x="40" y="320" width="220" height="10" fill="#64748b"/><rect x="40" y="412" width="220" height="8" fill="#64748b"/><rect x="40" y="320" width="6" height="140" fill="#475569"/><rect x="254" y="320" width="6" height="140" fill="#475569"/>${rack}
      <text x="150" y="455" text-anchor="middle" class="scene-label">INTAKE ${st.intake.length}/${intakeCap(st)}</text></g>
    <rect width="${W}" height="${H}" fill="url(#glow)" pointer-events="none"/>
  </svg>`;
  const el = svgEl(svg);
  const act = target => {
    const go = target.dataset.go;
    if (go === 'assembly') { app.ui.bench = +target.dataset.bench; app.go('assembly'); }
    else if (go === 'store') { if (target.dataset.tab) app.ui.storeTab = target.dataset.tab; app.go('store'); }
    else if (go === 'intake') document.getElementById('machines-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else app.go(go);
  };
  el.addEventListener('click', e => { const t = e.target.closest('.hot'); if (t) act(t); });
  el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.hot')) { e.preventDefault(); act(e.target.closest('.hot')); } });
  return h('div.scene-wrap', el, h('div.scene-hint', 'Click the shelves, tool wall, job board, a bench or the test station.'));
}

function machineRow(app, uid, where) {
  const g = app.game, st = g.state, pc = st.pcs[uid];
  const job = pc.job ? st.jobs[pc.job] : null;
  const cs = PART[st.parts[pc.caseUid].id];
  const benchBtns = st.benches.map((b, i) => (where === i ? null : button(`→ Bench ${i + 1}`, () => report(g.toBench(uid, i)), { disabled: !!b, tip: b ? `Bench ${i + 1} is occupied` : `Move to bench ${i + 1}` })));
  return h('li.machine',
    h('div.m-main', h('strong', pc.name), h('span.muted', `${cs.full}${pc.closed ? '' : ' · open'}`),
      job ? h('span.m-job', { class: st.day > job.deadline ? 'late' : st.day === job.deadline ? 'due' : '' }, `${KIND_LABEL[job.kind]} for ${CUSTOMER[job.customer].name} · due day ${job.deadline}`) : h('span.m-job.shop', 'Shop build')),
    h('div.m-actions',
      where !== 'rack' ? button('Assemble', () => { app.ui.bench = where; app.go('assembly'); }, { cls: 'primary' }) : null,
      where !== 'rack' ? button('Test', () => { app.ui.bench = where; app.go('testing'); }) : null,
      ...benchBtns,
      where !== 'rack' ? button('→ Rack', () => report(g.toRack(uid)), { tip: 'Move to the intake rack to free the bench' }) : null));
}

function machinesPanel(app) {
  const g = app.game, st = g.state;
  const list = h('ul.machines');
  st.benches.forEach((uid, i) => {
    if (uid) list.append(h('li.bench-tag', `Bench ${i + 1}`), machineRow(app, uid, i));
    else list.append(h('li.bench-tag', `Bench ${i + 1}`), h('li.machine.empty', h('span.muted', 'Empty bench.'), button('Start a build', () => { app.ui.bench = i; app.go('assembly'); })));
  });
  list.append(h('li.bench-tag', `Intake rack (${st.intake.length}/${intakeCap(st)})`));
  if (!st.intake.length) list.append(h('li.machine.empty', h('span.muted', 'No machines waiting. Accept repair jobs on the Jobs board.')));
  for (const uid of st.intake) list.append(machineRow(app, uid, 'rack'));
  return h('section.panel#machines-panel', h('h2', 'Machines'), list);
}

function jobsPanel(app) {
  const st = app.game.state;
  const act = Object.values(st.jobs).filter(j => j.status === 'active').sort((a, b) => a.deadline - b.deadline);
  return h('section.panel', h('div.panel-head', h('h2', 'Active jobs'), button('Job board', () => app.go('jobs'))),
    act.length ? h('ul.joblist', act.map(j => h('li', { class: st.day > j.deadline ? 'late' : st.day === j.deadline ? 'due' : '' },
      customerBadge(j, 36),
      h('div.jl-text', h('strong', j.title), h('span.muted', `${KIND_LABEL[j.kind]} · due day ${j.deadline}${st.day > j.deadline ? ' — LATE' : st.day === j.deadline ? ' — today' : ''}`)),
      button('Open', () => { app.ui.jobsTab = 'active'; app.ui.openJob = j.id; app.go('jobs'); }))))
      : h('p.muted', 'No active jobs. Check the job board for offers.'));
}

function tutorialPanel(app) {
  const g = app.game, st = g.state;
  const jobs = Object.values(st.jobs);
  const anyPc = Object.values(st.pcs).some(p => p.evidence.length);
  const steps = [
    ['Accept a job on the Jobs board', jobs.some(j => ['active', 'completed', 'failed', 'cancelled'].includes(j.status))],
    ['Put a customer machine on a bench (Machines panel below)', st.benches.some(u => u && st.pcs[u].owner !== 'shop') || st.stats.jobsDone > 0],
    ['Gather evidence: power on, open the case, inspect (Assembly / Testing)', anyPc || st.stats.jobsDone > 0],
    ['Fix the problem and run the required tests (Testing)', Object.values(st.pcs).some(p => p.tests.stability && p.tests.stability.ok) || st.stats.jobsDone > 0],
    ['Deliver it from the Jobs board', st.stats.jobsDone > 0],
    ['Start a custom build: buy a case and place it on a bench', Object.values(st.pcs).some(p => p.owner === 'shop') || st.stats.builds > 0],
    ['End the day (top right) when you run out of time', st.day > 1],
  ];
  const done = steps.filter(x => x[1]).length;
  return h('section.panel.tutorial', h('div.panel-head', h('h2', `Getting started (${done}/${steps.length})`), button('Hide', () => { st.tutorial.done = true; g.changed(); })),
    h('ol.steps', steps.map(([t, ok]) => h('li', { class: ok ? 'done' : '' }, statusIcon(ok ? 'good' : 'info'), h('span', t)))),
    done === steps.length ? h('p.good', 'You know the ropes. Good luck with the shop!') : h('p.muted', 'Tip: hover over almost anything for an explanation. Press 1–6 to switch screens.'));
}

function logPanel(app) {
  const st = app.game.state;
  const items = st.log.slice(-14).reverse();
  return h('section.panel.log', h('h2', 'Activity'), items.length ? h('ul.loglist', { 'data-keep-scroll': 'ws-log' }, items.map(l => h(`li.${l.level}`, h('span.log-t', `D${l.day} ${clock(l.t)}`), h('span', l.text)))) : h('p.muted', 'Nothing yet today.'));
}

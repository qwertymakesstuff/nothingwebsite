// Computer Testing: power the machine on, watch the debug LEDs, use the firmware (BIOS), boot the
// OS installer, run diagnostic and benchmark apps on a simulated monitor, and check the job's
// requirements. A test result only counts for the exact setup it ran on.

import { h, button, clear } from '../dom.js';
import { report, toast, modal, confirmBox } from '../overlay.js';
import { play } from '../sound.js';
import { PART } from '../../data/catalog.js';
import { CUSTOMER } from '../../data/customers.js';
import { TOOL } from '../../data/tools.js';
import { TIME } from '../../core/config.js';
import * as PC from '../../core/pc.js';
import { BIOS_OPTIONS } from '../../core/software.js';
import { TEST_LABEL } from '../../core/testing.js';
import { KIND_LABEL } from '../../core/jobs.js';
import { toolName } from '../../core/game.js';
import { snapshot, bootDrive } from '../../core/sim.js';
import { gbLabel } from '../../core/util.js';
import { checkRows, evidenceList, statusIcon, emptyState } from '../widgets.js';
import { powerOn } from './assembly.js';
import { powerOn as corePowerOn } from '../../core/boot.js';

export const keepScroll = true;

const APPS = [
  { id: 'temps', label: 'TempEye', icon: '🌡', tool: 'tempeye' },
  { id: 'cpuBench', label: 'Blazemark CPU', icon: '⚡', tool: 'blazemark' },
  { id: 'gpuBench', label: 'Blazemark GPU', icon: '🎮', tool: 'blazemark' },
  { id: 'stability', label: 'StressRack', icon: '🔥', tool: 'stressrack' },
  { id: 'malware', label: 'ClamShield', icon: '🛡', tool: 'clamshield' },
  { id: 'syscheck', label: 'SysCheck', icon: '🩺', tool: 'syscheck' },
  { id: 'storage', label: 'DiskDoctor', icon: '💽', tool: 'diskdoctor' },
  { id: '@drivers', label: 'Drivers', icon: '🧩' },
  { id: '@disks', label: 'Disk Manager', icon: '🗂' },
];

export function render(app, root) {
  const g = app.game, st = g.state;
  const benches = st.benches.map((u, i) => [u, i]).filter(([u]) => u);
  if (!benches.length) {
    root.append(h('div.testing', emptyState('The test station connects to machines on your benches. Put a machine on a bench first.', button('Go to the workshop', () => app.go('workshop'), { cls: 'primary' }))));
    return;
  }
  if (!st.benches[app.ui.bench]) app.ui.bench = benches[0][1];
  const pc = st.pcs[st.benches[app.ui.bench]];
  const fp = PC.fingerprint(st, pc);
  const pw = g.powered && g.powered[pc.uid] && g.powered[pc.uid].fp === fp ? g.powered[pc.uid].boot : null;
  app.ui.mon = app.ui.mon || {};
  const mon = app.ui.mon[pc.uid] && pw ? app.ui.mon[pc.uid] : { view: pw ? (pw.os ? 'desktop' : 'post') : 'off' };
  if (pw && mon.view === 'off') mon.view = pw.os ? 'desktop' : 'post';
  app.ui.mon[pc.uid] = mon;
  const tabs = h('div.bench-tabs', benches.map(([u, i]) => h('button.tab', { type: 'button', class: i === app.ui.bench ? 'on' : '', on: { click: () => { app.ui.bench = i; app.render(); } } }, `Bench ${i + 1}`, h('small', st.pcs[u].name))));
  root.append(h('div.testing', tabs, h('div.test-grid',
    hwPanel(app, pc, pw),
    h('section.monitor-wrap', monitor(app, pc, pw, mon), h('section.panel.notes', h('h2', 'Case notes'), h('div.notes-body', { 'data-keep-scroll': 'test-notes' }, evidenceList(pc)))),
    jobPanel(app, pc))));
}

function leds(pw) {
  const L = pw ? pw.leds : {};
  const item = (k, label, on, cls) => h('div.led-item', h('span.led-dot', { class: on ? `on ${cls}` : '' }), h('span', label));
  return h('div.led-row', { 'aria-label': 'Status lights' },
    item('pwr', 'PWR', pw && pw.stage !== 'off', 'green'), item('cpu', 'CPU', L.cpu, 'red'), item('dram', 'DRAM', L.dram, 'amber'), item('vga', 'VGA', L.vga, 'white'), item('boot', 'BOOT', pw && pw.stage === 'video', 'green'));
}

function hwPanel(app, pc, pw) {
  const g = app.game, st = g.state;
  const tool = (id, need, desc) => {
    const has = !need || st.tools[need];
    const spec = g.toolSpec(id);
    const mins = spec ? g.minutes(spec[0], spec[1]) : 0;
    return h('button.tool-row', { type: 'button', disabled: !has, 'data-tip': has ? `${desc} (${mins} min)` : `Requires ${TOOL[need].name} — buy it in the Store.`, on: { click: () => runApp(app, pc, id, true) } },
      h('span.tr-name', toolName(id)), h('span.tr-time', has ? `${mins} min` : '🔒'));
  };
  return h('aside.test-left',
    h('div.machine-info', h('h2', pc.name), h('p.muted', PART[st.parts[pc.caseUid].id].full), pc.closed ? null : h('p.warn-text', 'Side panel is off: airflow is worse and the job needs it closed.')),
    h('div.power-row',
      h('button.power-btn', { type: 'button', class: pw && pw.stage !== 'off' ? 'on' : '', 'aria-label': 'Power button', 'data-tip': `Power on / restart (${TIME.power} min)`, on: { click: () => { app.ui.mon[pc.uid] = null; powerOn(app, pc); } } }, '⏻'),
      h('div', h('strong', pw ? (pw.stage === 'off' ? 'No power' : pw.os ? 'Running' : 'Stuck') : 'Off'), h('small.muted', pw ? `${pw.fans === true ? 'Fans spinning' : pw.fans === 'blip' ? 'Fans twitch and stop' : 'Fans still'}` : 'Press to power on'))),
    leds(pw),
    pw && pw.problems.length ? h('div.power-result.fail', pw.problems.map(p => h('p', statusIcon('bad'), ` ${p.msg}`))) : null,
    h('h3', 'Hardware diagnostics'),
    h('div.tool-list',
      tool('psu', 'psutester', 'Reads every PSU voltage rail.'),
      tool('postcard', 'postcard', 'Shows where the boot stops, even with no picture.'),
      tool('thermalcam', 'thermalcam', 'See where the heat is.'),
      tool('memtest', 'memsweep', 'Boot MemSweep from USB and test every stick.'),
      tool('storage', 'diskdoctor', 'Read the drives\' health.')),
    h('h3', 'DataRescue dock'),
    (st.tools.datarescue || st.tools.datarescue_pro) ? button('Copy files between drives…', () => rescueDialog(app, pc), { tip: `Recover personal files from one drive to another (${g.minutes(TIME.recover, 'test')} min)` }) : h('p.muted.small', 'Buy the DataRescue dock (Store → Tools) to copy files off failing drives.'),
    h('p.muted.small', `Time left today: ${g.timeLeft()} min.`));
}

// --- the monitor
function monitor(app, pc, pw, mon) {
  const g = app.game, st = g.state;
  const screen = h('div.screen-inner');
  const wrap = h('div.monitor', h('div.bezel', screen), h('div.stand'));
  if (!pw || pw.stage === 'off') { screen.append(h('div.no-signal', pw ? 'No power' : 'Machine is off — press the power button')); return wrap; }
  if (!pw.display) { screen.append(h('div.no-signal', 'NO SIGNAL', h('small', 'The monitor gets no picture.'))); return wrap; }
  const back = () => { mon.view = pw.os ? 'desktop' : 'post'; app.render(true); };
  if (mon.view === 'bios') screen.append(biosScreen(app, pc, back));
  else if (mon.view === 'installer') screen.append(installer(app, pc, back));
  else if (mon.view === 'run') screen.append(runScreen(app, pc, mon, back));
  else if (mon.view === 'disks') screen.append(disksScreen(app, pc, back));
  else if (mon.view === 'desktop' && pw.os) screen.append(desktop(app, pc, pw));
  else {
    screen.append(h('div.post', h('pre', pw.screen.join('\n')),
      h('div.post-actions',
        button('Enter BIOS (Del)', () => { mon.view = 'bios'; app.render(true); }),
        button('Boot OS installer (USB)', () => { mon.view = 'installer'; app.render(true); }),
        button('Boot MemSweep (USB)', () => runApp(app, pc, 'memtest')),
        st.tools.diskdoctor ? button('Boot DiskDoctor (USB)', () => runApp(app, pc, 'storage')) : null,
        pw.os ? button('Continue to desktop', () => { mon.view = 'desktop'; app.render(true); }, { cls: 'primary' }) : null)));
  }
  return wrap;
}

function desktop(app, pc, pw) {
  const g = app.game, st = g.state;
  const drive = st.parts[pw.bootDrive];
  const os = PART[drive.data.os];
  const malware = drive.data.malware;
  const icons = APPS.map(a => {
    const locked = a.tool && !st.tools[a.tool];
    return h('button.app-icon', { type: 'button', disabled: locked, 'data-tip': locked ? `Requires ${TOOL[a.tool].name}` : appTip(g, a.id), on: { click: () => (a.id === '@drivers' ? drivers(app, pc) : a.id === '@disks' ? (app.ui.mon[pc.uid].view = 'disks', app.render(true)) : runApp(app, pc, a.id)) } }, h('span.ai', { 'aria-hidden': 'true' }, a.icon), h('span', a.label));
  });
  return h('div.desktop', { class: `os-${os.family}` },
    h('div.desk-bar', h('strong', os.name), h('span', drive.data.drivers ? '' : 'Generic display driver · 800×600'), h('span.desk-actions', button('Restart to BIOS', () => { app.ui.mon[pc.uid].view = 'bios'; app.render(true); }, { cls: 'small' }), button('Boot installer', () => { app.ui.mon[pc.uid].view = 'installer'; app.render(true); }, { cls: 'small' }))),
    h('div.icons', icons),
    malware ? h('div.popups', Array.from({ length: malware + 1 }, (_, i) => h('div.popup', { style: { left: `${18 + i * 17}%`, top: `${30 + (i % 2) * 22}%` } }, ['🎉 YOU WON A PRIZE!', 'SpeedBoostr: 1,284 problems found!', 'CouponPal: deals for you', 'Your files need cleaning!'][i % 4]))) : null);
}

// software changes restart the machine on their own: keep it powered on in the UI
function refreshPower(app, pc, view) {
  const g = app.game;
  g.powered = g.powered || {};
  const boot = corePowerOn(g.state, pc);
  g.powered[pc.uid] = { fp: PC.fingerprint(g.state, pc), boot };
  app.ui.mon[pc.uid] = { view: view || (boot.os ? 'desktop' : 'post') };
}

const appTip = (g, id) => { const s = g.toolSpec(id); return s ? `${toolName(id)} (${g.minutes(s[0], s[1])} min)` : ''; };

async function runApp(app, pc, id, fromHw) {
  const g = app.game;
  const r = g.runTool(pc.uid, id);
  if (!r.ok) return report(r);
  if (!r.lines) { r.lines = (r.evidence || []).map(e => e.text); }
  const bad = (r.evidence || []).some(e => e.level === 'bad');
  if (fromHw && ['psu', 'postcard', 'thermalcam'].includes(id)) {
    play(bad ? 'error' : 'good');
    modal({ title: toolName(id), body: h('div', h('pre.aw-out', r.lines.join('\n')), h('ul.evidence', (r.evidence || []).map(e => h(`li.${e.level}`, statusIcon(e.level), h('span', e.text))))), actions: [{ label: 'OK', cls: 'primary' }] });
    return;
  }
  // running a tool means the machine is on: keep the monitor in sync without spending more time
  g.powered = g.powered || {};
  const fp = PC.fingerprint(g.state, pc);
  if (!g.powered[pc.uid] || g.powered[pc.uid].fp !== fp) g.powered[pc.uid] = { fp, boot: corePowerOn(g.state, pc) };
  const mon = app.ui.mon[pc.uid] = app.ui.mon[pc.uid] || { view: 'post' };
  mon.view = 'run';
  mon.run = { id, lines: r.lines, evidence: r.evidence || [], record: r.record || null, started: Date.now(), minutes: r.minutes };
  play(bad ? 'error' : 'good');
  app.render(true);
}

function runScreen(app, pc, mon, back) {
  const run = mon.run;
  const reduced = app.settings.reducedMotion;
  const el = h('div.app-window', h('div.aw-title', h('strong', toolName(run.id)), h('span.muted', `${run.minutes} min`), button('Close', back, { cls: 'small' })));
  const prog = h('div.progress', h('span'));
  const out = h('pre.aw-out');
  el.append(prog, out);
  const finish = () => {
    prog.remove();
    out.textContent = run.lines.join('\n');
    if (run.record) el.append(h('p', { class: run.record.ok ? 'good' : 'bad-text' }, statusIcon(run.record.ok ? 'good' : 'bad'), ` ${TEST_LABEL[run.record.key] || 'Result'}: ${run.record.ok ? 'PASS' : 'FAIL'} — recorded for this setup.`));
  };
  if (reduced || Date.now() - run.started > 1500) finish();
  else {
    const bar = prog.firstChild;
    const t0 = run.started;
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / 1300);
      bar.style.width = `${Math.round(k * 100)}%`;
      out.textContent = run.lines.slice(0, Math.max(1, Math.round(k * run.lines.length))).join('\n') + (k < 1 ? '\n…' : '');
      if (k < 1 && el.isConnected) requestAnimationFrame(tick); else if (el.isConnected) finish();
    };
    requestAnimationFrame(tick);
  }
  return el;
}

function biosScreen(app, pc, back) {
  const g = app.game;
  const v = g.bios(pc.uid);
  if (!v.ok) return h('div.bios', h('p', v.reason), button('Back', back));
  const b = v.bios;
  const row = (key, label, value, opts) => h('div.bios-row', h('span.bk', label), h('span.bv', value), opts ? h('span.bo', opts) : null);
  const choose = (key, val) => { const r = g.setBios(pc.uid, key, val); if (r.ok) { play('click'); refreshPower(app, pc, 'bios'); if (r.notes.length) toast(r.notes.join(' '), 'warn'); app.render(true); } else report(r); };
  const sel = (key, values, show) => h('select', { 'aria-label': BIOS_OPTIONS[key] ? BIOS_OPTIONS[key].label : key, on: { change: e => choose(key, values.find(x => String(x) === e.target.value)) } }, values.map(x => h('option', { value: String(x), selected: x === b[key] }, show(x))));
  const snap = v.snap;
  const fanOptions = b.fan === 'off' ? ['off', 'silent', 'standard', 'performance'] : ['silent', 'standard', 'performance'];
  const voltOptions = b.volt === 'high' ? ['high', 'auto'] : ['auto'];
  return h('div.bios',
    h('div.bios-head', `${v.mb.brand} BootForge Setup Utility`, h('span', v.mb.full)),
    h('div.bios-body',
      h('div.bios-col',
        h('h4', 'System'),
        row('cpu', 'Processor', snap.cpu.full),
        row('mem', 'Memory', `${snap.ram.reduce((s, r) => s + r.d.gb, 0)} GB ${snap.ram[0].d.mem}`),
        row('drives', 'Drives', v.drives.length ? v.drives.map(d => d.label).join(', ') : 'None detected'),
        row('temp', 'CPU temperature', `${Math.round(24 + (snap.coolerOn ? 14 : 40))}°C`)),
      h('div.bios-col',
        h('h4', 'Settings'),
        row('xmp', 'Memory profile (XMP)', '', sel('xmp', [false, true], x => (x ? 'Enabled' : 'Disabled'))),
        row('fan', 'Fan curve', '', sel('fan', fanOptions, BIOS_OPTIONS.fan.show)),
        row('volt', 'CPU core voltage', '', sel('volt', voltOptions, BIOS_OPTIONS.volt.show)),
        row('boot', 'Boot device', '', h('select', { 'aria-label': 'Boot device', on: { change: e => choose('boot', e.target.value) } }, [h('option', { value: 'auto', selected: b.boot === 'auto' }, 'Auto (first drive with an OS)'), ...v.drives.map(d => h('option', { value: d.uid, selected: b.boot === d.uid }, d.label)), ...(b.boot !== 'auto' && !v.drives.some(d => d.uid === b.boot) ? [h('option', { value: b.boot, selected: true }, 'Missing drive (not found)')] : [])])))),
    h('div.bios-foot', button('Load optimized defaults', async () => { if (await confirmBox('Reset firmware?', 'Every setting returns to factory defaults. The memory profile will be off.', { ok: 'Reset' })) { const r = report(g.resetBios(pc.uid), 'Defaults loaded.'); if (r.ok) { refreshPower(app, pc, 'bios'); app.render(true); } } }), button('Save & exit', () => { refreshPower(app, pc); app.render(true); }, { cls: 'primary' }), h('small', 'Each change takes 3 min.')));
}

function installer(app, pc, back) {
  const g = app.game, st = g.state;
  const snap = snapshot(st, pc);
  const drives = snap.drives.filter(d => d.linked && d.alive);
  const oses = Object.values(PART).filter(d => d.cat === 'os' && !d.unsold && (d.price === 0 || st.licenses[d.id] > 0));
  const corrupt = drives.find(d => d.p.data.os && !d.p.data.osOk);
  let osSel = oses[0] ? oses[0].id : null, drvSel = drives[0] ? drives[0].p.uid : null;
  const go = async () => {
    const c = await import('../../core/software.js').then(m => m.canInstallOS(st, pc, osSel, drvSel));
    if (!c.ok) return report(c);
    const files = c.drive.p.data.files;
    if (c.wipes && !(await confirmBox('Erase this drive?', `Installing ${c.os.name} formats the ${c.drive.d.name}${files.length ? ` and erases: ${files.map(f => f.label).join(', ')}` : ''}${c.drive.p.data.os ? ` (it currently has ${PART[c.drive.p.data.os].name})` : ''}.`, { ok: 'Erase and install', danger: true, force: files.length > 0 }))) return;
    const r = g.installOS(pc.uid, osSel, drvSel);
    if (r.ok) { play('good'); toast(`${c.os.name} installed (${r.minutes} min). Now install drivers.`, 'good'); refreshPower(app, pc); app.render(true); } else report(r);
  };
  return h('div.installer',
    h('h3', 'OS installer (USB)'),
    corrupt ? h('div.inst-box', h('p', `A damaged ${PART[corrupt.p.data.os].name} installation was found on the ${corrupt.d.name}.`), button('Repair it (keeps files)', () => { const r = g.repairOS(pc.uid); if (r.ok) { play('good'); refreshPower(app, pc); app.render(true); } report(r, r.ok ? r.notes[0] : null); }, { cls: 'primary' })) : null,
    drives.length ? null : h('p.bad-text', 'No drive is detected. Install and connect one.'),
    oses.length ? h('div.inst-box',
      h('label', 'Operating system', h('select', { on: { change: e => { osSel = e.target.value; } } }, oses.map(o => h('option', { value: o.id }, `${o.name}${o.price ? ` (licence ×${st.licenses[o.id]})` : ' (free)'}`)))),
      h('label', 'Install to', h('select', { on: { change: e => { drvSel = e.target.value; } } }, drives.map(d => h('option', { value: d.p.uid }, `${d.d.full} — ${gbLabel(d.d.gb)}${d.p.data.files.length ? ' — has personal files!' : d.p.data.os ? ` — has ${PART[d.p.data.os].name}` : ''}`)))),
      h('div.row', button('Back', back), button(`Install (${g.minutes(TIME.osInstall, 'test')} min)`, go, { cls: 'primary', disabled: !drives.length }))) : h('div.inst-box', h('p', 'You have no OS licences. Buy one in the store, or use the free Fernix Linux.'), button('Back', back)));
}

function disksScreen(app, pc, back) {
  const g = app.game, st = g.state;
  const snap = snapshot(st, pc);
  const boot = bootDrive(snap);
  return h('div.app-window', h('div.aw-title', h('strong', 'Disk Manager'), button('Close', back, { cls: 'small' })),
    h('table.disks', h('tbody', snap.drives.filter(d => d.linked && d.alive).map(d => h('tr',
      h('td', h('strong', d.d.full), boot && boot.p.uid === d.p.uid ? h('span.tag', 'boot') : null),
      h('td', gbLabel(d.d.gb)),
      h('td', d.p.data.os ? PART[d.p.data.os].name : 'empty', d.p.data.files.length ? h('div.small', d.p.data.files.map(f => f.label).join(', ')) : null),
      h('td', button('Format', async () => {
        if (boot && boot.p.uid === d.p.uid) return report({ ok: false, reason: 'You can\'t format the drive the system is running from. Use the OS installer.' });
        if (!(await confirmBox('Format drive?', `Erase everything on the ${d.d.name}${d.p.data.files.length ? `, including ${d.p.data.files.map(f => f.label).join(', ')}` : ''}?`, { ok: 'Format', danger: true, force: d.p.data.files.length > 0 }))) return;
        const r = report(g.formatDrive(pc.uid, d.p.uid), 'Drive formatted.');
        if (r.ok) { refreshPower(app, pc, 'disks'); app.render(true); }
      }, { cls: 'small danger' })))))));
}

function drivers(app, pc) {
  const r = app.game.installDrivers(pc.uid);
  if (r.ok) { play('good'); toast(`Drivers installed (${r.minutes} min).`, 'good'); refreshPower(app, pc); app.render(true); }
  else report(r);
}

function rescueDialog(app, pc) {
  const g = app.game, st = g.state;
  const here = PC.storageZones(st, pc).map(z => pc.slots[z]);
  const shelf = st.inventory.filter(u => st.parts[u] && st.parts[u].data && (st.parts[u].owner === 'shop' || st.parts[u].owner === pc.job));
  const all = [...here.map(u => [u, 'in this machine']), ...shelf.map(u => [u, 'on the shelf'])];
  if (all.length < 2) return report({ ok: false, reason: 'You need two drives: the source and a healthy target (in this machine or on the shelf).' });
  const label = ([u, where]) => { const p = st.parts[u], d = PART[p.id]; return `${d.full} (${where})${p.data.files.length ? ` — ${p.data.files.map(f => f.label).join(', ')}` : ''}`; };
  const src = h('select', all.map(x => h('option', { value: x[0] }, label(x))));
  const dst = h('select', all.map(x => h('option', { value: x[0] }, label(x))));
  const withFiles = all.find(x => st.parts[x[0]].data.files.length);
  if (withFiles) src.value = withFiles[0];
  const other = all.find(x => x[0] !== src.value && !st.parts[x[0]].fault);
  if (other) dst.value = other[0];
  modal({
    title: 'DataRescue dock',
    body: h('div.form', h('p.muted', 'Copies every personal file from the source to the target. Reading a failing drive wears it further, so do it once, early.'), h('label', 'From', src), h('label', 'To', dst)),
    actions: [{ label: 'Cancel' }, { label: `Copy files (${g.minutes(TIME.recover, 'test')} min)`, cls: 'primary', onClick: () => { const r = g.recoverFiles(src.value, dst.value); report(r, r.ok ? r.notes.join(' ') : null, 'good'); if (r.ok && g.powered && g.powered[pc.uid]) { refreshPower(app, pc); app.render(true); } } }],
  });
}

// --- job checklist
function jobPanel(app, pc) {
  const g = app.game, st = g.state;
  let job = pc.job ? st.jobs[pc.job] : null;
  const builds = Object.values(st.jobs).filter(j => j.status === 'active' && (j.kind === 'build' || j.kind === 'fleet'));
  let picker = null;
  if (!job && pc.owner === 'shop') {
    if (!app.ui.checkJob || !builds.some(j => j.id === app.ui.checkJob)) app.ui.checkJob = builds[0] ? builds[0].id : null;
    job = app.ui.checkJob ? st.jobs[app.ui.checkJob] : null;
    picker = builds.length ? h('label.job-pick', 'Check against', h('select', { on: { change: e => { app.ui.checkJob = e.target.value; app.render(true); } } }, builds.map(j => h('option', { value: j.id, selected: job && j.id === job.id }, `${j.title} — ${CUSTOMER[j.customer].name}`)))) : h('p.muted', 'No active build jobs to check this machine against. Accept one on the Jobs board.');
  }
  const tests = Object.entries(pc.tests).map(([k, r]) => {
    const fresh = r.hash === PC.fingerprint(st, pc);
    return h('li', { class: fresh ? (r.ok ? 'ok' : 'missing') : 'stale' }, statusIcon(fresh ? (r.ok ? 'good' : 'bad') : 'info'), h('span.ck-label', TEST_LABEL[k] || k), h('span.ck-detail', `${fresh ? (r.ok ? 'pass' : 'fail') : 'out of date'}${r.score ? ` · ${r.score.toLocaleString('en-US')}` : ''}${r.cpu ? ` · ${r.cpu}°C` : ''}${r.noise ? ` · ${r.noise} dB` : ''}`));
  });
  let body = null;
  if (job) {
    const chk = g.check(job.id, pc.uid);
    body = h('div', h('p.job-tag', `${KIND_LABEL[job.kind]} · ${CUSTOMER[job.customer].name} · due day ${job.deadline}`), checkRows(chk.rows),
      button(chk.canDeliver ? 'Deliver to customer…' : 'Not ready to deliver', () => { app.ui.jobsTab = 'active'; app.ui.openJob = job.id; app.ui.deliverPc = pc.uid; app.go('jobs'); }, { cls: chk.canDeliver ? 'primary' : '', disabled: !chk.canDeliver }));
  }
  return h('aside.test-right',
    h('section.panel', h('h2', 'Job requirements'), picker, body || (pc.owner !== 'shop' ? h('p.muted', 'No job.') : null)),
    h('section.panel', h('h2', 'Test results'), tests.length ? h('ul.checks', tests) : h('p.muted', 'No tests run on this machine yet.'), h('p.muted.small', 'Results go out of date when you change hardware, cables, BIOS or software.')));
}

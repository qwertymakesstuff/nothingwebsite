// The Computer Assembly Bench: an open case with highlighted installation zones. Drag parts from
// the tray (or click a part, then a zone), rotate CPUs and memory to line them up, flip fans
// between intake and exhaust, apply thermal paste by hand, connect every cable, close the case
// and press the power button.

import { h, button, svgEl, clear } from '../dom.js';
import { report, toast, modal, confirmBox, alertBox, hideTip } from '../overlay.js';
import { play } from '../sound.js';
import { makeDraggable } from '../drag.js';
import { renderPC } from '../pcview.js';
import { partIcon } from '../art.js';
import { PART, CATEGORIES, CATEGORY } from '../../data/catalog.js';
import { CUSTOMER } from '../../data/customers.js';
import * as PC from '../../core/pc.js';
import { hashStr } from '../../core/rng.js';
import { KIND_LABEL } from '../../core/jobs.js';
import { partCard, inspectPart, evidenceList, statusIcon, emptyState } from '../widgets.js';

export const keepScroll = true;

// how a part comes out of its box: CPUs and memory need lining up
export function boxRotation(uid, cat) {
  const r = hashStr(uid);
  if (cat === 'cpu') return (r % 4) * 90;
  if (cat === 'ram') return (r % 2) * 180;
  return 0;
}

export function render(app, root) {
  const g = app.game, st = g.state;
  if (app.ui.bench >= st.benches.length) app.ui.bench = 0;
  const uid = st.benches[app.ui.bench];
  const pc = uid ? st.pcs[uid] : null;
  const tabs = h('div.bench-tabs', { role: 'tablist' }, st.benches.map((u, i) => h('button.tab', { type: 'button', role: 'tab', 'aria-selected': String(i === app.ui.bench), class: i === app.ui.bench ? 'on' : '', on: { click: () => { app.ui.bench = i; app.ui.sel = null; app.render(); } } }, `Bench ${i + 1}`, h('small', u ? st.pcs[u].name : 'empty'))));
  if (!pc) { root.append(h('div.assembly', tabs, emptyBench(app))); return; }
  const mode = app.ui.cableMode ? 'cables' : 'parts';
  const powered = g.powered && g.powered[pc.uid] && g.powered[pc.uid].fp === PC.fingerprint(st, pc) ? g.powered[pc.uid].boot : null;
  const view = renderPC(st, pc, { powered: powered && powered.stage !== 'off' && powered.fans === true, cableMode: mode === 'cables', leds: powered ? powered.leds : null, zoneState: z => zoneStateFor(app, pc, z), active: !!app.ui.sel, justInstalled: app.ui.justInstalled, knownLoose: knownLoose(pc) });
  app.ui.justInstalled = null;
  const viewWrap = h('div.view-wrap', { class: app.ui.sel ? 'selecting' : '' }, view.el);
  wireView(app, pc, view.el);
  root.append(h('div.assembly',
    tabs,
    h('div.asm-grid',
      leftPanel(app, pc, powered),
      h('section.asm-center',
        h('div.asm-toolbar',
          h('div.seg', { role: 'tablist', 'aria-label': 'Mode' },
            h('button', { type: 'button', role: 'tab', class: mode === 'parts' ? 'on' : '', 'aria-selected': String(mode === 'parts'), on: { click: () => { app.ui.cableMode = false; app.render(); } } }, 'Parts'),
            h('button', { type: 'button', role: 'tab', class: mode === 'cables' ? 'on' : '', 'aria-selected': String(mode === 'cables'), on: { click: () => { app.ui.cableMode = true; app.ui.sel = null; app.render(); } } }, `Cables ${cableCount(st, pc)}`)),
          button(pc.closed ? 'Open case' : 'Close case', () => { report(g.setClosed(pc.uid, !pc.closed), null, 'screw'); }, { cls: pc.closed ? '' : 'primary', tip: pc.closed ? 'Take the side panel off to work inside' : 'Put the side panel back on' }),
          h('span.hint', mode === 'parts' ? (app.ui.sel ? 'Click a highlighted zone to install · R rotates · Esc cancels' : 'Drag a part onto the case. R / right-click / wheel rotates while dragging.') : 'Drag a cable onto its glowing port, or use Connect. Click a cable to unplug it.')),
        viewWrap,
        h('section.panel.notes', h('h2', 'Case notes'), h('div.notes-body', { 'data-keep-scroll': 'asm-notes' }, evidenceList(pc)))),
      mode === 'parts' ? trayPanel(app, pc) : cablePanel(app, pc))));
  const keyHandler = e => {
    if (e.key === 'Escape' && app.ui.sel) { app.ui.sel = null; app.render(); }
    if ((e.key === 'r' || e.key === 'R') && app.ui.sel && !e.target.closest('input')) { const p = st.parts[app.ui.sel]; if (p) { app.ui.selRot = (app.ui.selRot + rotStep(PART[p.id].cat)) % 360; app.render(); } }
  };
  document.addEventListener('keydown', keyHandler);
  return () => document.removeEventListener('keydown', keyHandler);
}

// loose connectors look plugged in until an inspection notices them
const knownLoose = pc => new Set(pc.evidence.filter(e => e.tag.startsWith('cable:') && pc.cables[e.tag.slice(6)] === 'loose').map(e => e.tag.slice(6)));
const shownState = (pc, key, known) => (pc.cables[key] === 'loose' && !known.has(key) ? 'ok' : pc.cables[key]);

const rotStep = cat => (cat === 'cpu' ? 90 : 180);
const rotatable = cat => ['cpu', 'ram', 'fan'].includes(cat);

function cableCount(st, pc) {
  const list = PC.cableList(st, pc).filter(c => c.ok);
  const known = knownLoose(pc);
  const done = list.filter(c => shownState(pc, c.key, known) === 'ok').length;
  return `${done}/${list.length}`;
}

// what state a zone should show while a part is selected or dragged
function zoneStateFor(app, pc, zone) {
  const st = app.game.state;
  const drag = app.ui.dragging;
  const uid = drag ? drag.uid : app.ui.sel;
  if (zone.startsWith('port:')) {
    if (!drag || !drag.cable) return null;
    return zone === `port:${drag.cable}` ? { state: 'ok' } : null;
  }
  if (!uid) return null;
  if (uid === '@paste' || uid === '@wipe') return zone === 'cpu' && pc.slots.cpu ? (pc.slots.cooler ? { state: 'bad', reason: 'Remove the cooler first.' } : { state: 'ok' }) : null;
  if (uid === '@air' || uid === '@light') return zone === 'mb' || zone === 'psu' ? { state: 'ok' } : null;
  const p = st.parts[uid];
  if (!p) return null;
  const d = PART[p.id];
  if (PC.zoneCategory(zone) !== d.cat) return null;
  const rot = drag ? drag.rot : app.ui.selRot || 0;
  const r = PC.canInstall(st, pc, uid, zone, rot);
  return r.ok ? { state: 'ok' } : { state: 'bad', reason: r.reason };
}

function refreshZones(app, pc, svg) {
  for (const el of svg.querySelectorAll('[data-zone],[data-port]')) {
    const z = el.dataset.zone || `port:${el.dataset.port}`;
    const s = zoneStateFor(app, pc, z);
    el.classList.remove('z-ok', 'z-bad');
    if (s) el.classList.add(`z-${s.state}`);
    if (el.dataset.zone) el.style.pointerEvents = app.ui.dragging || app.ui.sel ? (s ? 'all' : 'none') : (el.classList.contains('filled') ? 'none' : 'all');
  }
}

function install(app, pc, uid, zone, rot) {
  const g = app.game;
  const d = PART[g.state.parts[uid].id];
  const r = g.install(pc.uid, uid, zone, rot);
  if (r.ok) {
    app.ui.sel = null;
    app.ui.justInstalled = zone;
    play(['cpu', 'ram', 'storage'].includes(d.cat) ? 'snap' : 'screw');
    if (r.notes && r.notes.length) toast(r.notes.join(' '), 'warn', 6000);
  } else report(r);
}

function wireView(app, pc, svg) {
  const g = app.game, st = g.state;
  svg.addEventListener('click', async e => {
    const zoneEl = e.target.closest('[data-zone]');
    const portEl = e.target.closest('[data-port]');
    const partEl = e.target.closest('[data-part]');
    const cableEl = e.target.closest('[data-cable]');
    if (app.ui.sel && zoneEl) {
      const zone = zoneEl.dataset.zone;
      if (app.ui.sel === '@paste') return pasteDialog(app, pc);
      if (app.ui.sel === '@wipe') { app.ui.sel = null; return report(g.cleanPaste(pc.uid), 'Old paste wiped off.'); }
      if (app.ui.sel === '@air') { app.ui.sel = null; return blow(app, pc); }
      if (app.ui.sel === '@light') { app.ui.sel = null; return inspectCase(app, pc); }
      return install(app, pc, app.ui.sel, zone, app.ui.selRot || 0);
    }
    if (portEl && app.ui.cableMode) { const r = g.connect(pc.uid, portEl.dataset.port); if (r.ok) play('cable'); else report(r); return; }
    if (cableEl && app.ui.cableMode) {
      const c = PC.cableList(st, pc).find(x => x.key === cableEl.dataset.cable);
      if (c && await confirmBox('Unplug cable?', `Disconnect the ${c.label.toLowerCase()}?`, { ok: 'Unplug' })) report(g.disconnect(pc.uid, c.key), null, 'cable');
      return;
    }
    if (cableEl && !app.ui.cableMode && knownLoose(pc).has(cableEl.dataset.cable)) { report(g.connect(pc.uid, cableEl.dataset.cable), 'Reseated the connector.', 'cable'); return; }
    if (partEl) return partMenu(app, pc, partEl.dataset.part);
  });
  svg.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

function partMenu(app, pc, zone) {
  const g = app.game, st = g.state;
  const uid = pc.slots[zone];
  if (!uid) return;
  const d = PART[st.parts[uid].id];
  const acts = [];
  const can = PC.canRemove(st, pc, zone);
  acts.push({ label: 'Remove', cls: can.ok ? 'primary' : '', disabled: !can.ok, onClick: () => { const r = g.remove(pc.uid, zone); if (r.ok) play('screw'); else report(r); } });
  if (zone === 'cpu' && !pc.slots.cooler) {
    acts.unshift({ label: 'Apply thermal paste', onClick: () => { setTimeout(() => pasteDialog(app, pc), 0); } });
    if (pc.paste.state !== 'none') acts.unshift({ label: 'Wipe paste off', onClick: () => report(g.cleanPaste(pc.uid), 'Paste wiped off.') });
  }
  if (PC.isFanZone(zone)) acts.unshift({ label: 'Flip direction', onClick: () => flipFan(app, pc, zone) });
  acts.push({ label: 'Close' });
  const extra = [];
  if (!can.ok) extra.push(h('p.warn-text', can.reason));
  if (PC.isFanZone(zone)) extra.push(h('p', `Mounted as ${pc.fanDir[zone] === 'in' ? 'intake (blowing in)' : 'exhaust (blowing out)'}.`));
  if (zone === 'cpu') extra.push(h('p', `Thermal paste: ${PC.PASTE_LABEL[pc.paste.state].toLowerCase()}${pc.slots.cooler ? ' (as last seen)' : ''}.`));
  inspectPart(app, uid, { actions: acts, extra: h('div', extra), known: false });
}

function flipFan(app, pc, zone) {
  const g = app.game;
  const uid = pc.slots[zone];
  const was = pc.fanDir[zone];
  const r = g.remove(pc.uid, zone);
  if (!r.ok) return report(r);
  const rot = (was === PC.defaultFanDir(zone)) ? 180 : 0;
  report(g.install(pc.uid, uid, zone, rot), `Fan now ${was === 'in' ? 'exhausts' : 'takes air in'}.`, 'screw');
}

function leftPanel(app, pc, powered) {
  const g = app.game, st = g.state;
  const job = pc.job ? st.jobs[pc.job] : null;
  const cs = PART[st.parts[pc.caseUid].id];
  const pre = g.preflight(pc.uid);
  const errors = pre.filter(x => x.level === 'error');
  const info = h('div.machine-info',
    h('h2', pc.name),
    h('p.muted', cs.full),
    job ? h('p.job-tag', `${KIND_LABEL[job.kind]} · ${CUSTOMER[job.customer].name} · due day ${job.deadline}`) : h('p.job-tag.shop', 'Shop build'),
    h('dl.mini',
      h('dt', 'Dust'), h('dd', { class: pc.dust >= 40 ? 'bad' : '' }, pc.closed ? '— (case closed)' : `${pc.dust}%`),
      h('dt', 'Paste'), h('dd', pc.slots.cooler ? 'under cooler' : PC.PASTE_LABEL[pc.paste.state]),
      h('dt', 'Panel'), h('dd', pc.closed ? 'closed' : 'open')));
  const check = h('div.preflight', h('h3', `Pre-boot check ${errors.length ? `(${errors.length} problem${errors.length > 1 ? 's' : ''})` : '✓'}`),
    pre.length ? h('ul.checks', pre.map(x => h(`li.${x.level === 'error' ? 'missing' : x.level === 'warn' ? 'warnrow' : 'optional'}`, statusIcon(x.level === 'error' ? 'bad' : x.level === 'warn' ? 'warn' : 'info'), h('span', x.msg)))) : h('p.good', 'Everything is installed, compatible and connected.'));
  const res = powered ? h('div.power-result', { class: powered.os ? 'ok' : 'fail' },
    h('h3', powered.os ? 'Boots to the desktop' : `Stopped at: ${stageName(powered.stage)}`),
    powered.problems.map(p => h('p', statusIcon('bad'), ` ${p.msg}`, p.hint ? h('small.hint', ` ${p.hint}`) : null)),
    powered.warnings.map(w => h('p', statusIcon('warn'), ` ${w.msg}`)),
    powered.beeps ? h('p.muted', `Beeps: ${powered.beeps}`) : null,
    powered.leds && Object.keys(powered.leds).length ? h('p.leds', 'Debug LEDs: ', Object.keys(powered.leds).map(k => h('span.ledtag', k.toUpperCase()))) : null) : null;
  return h('aside.asm-left',
    info,
    h('div.power-row',
      h('button.power-btn', { type: 'button', 'aria-label': 'Press the power button', 'data-tip': 'Press the power button (3 min)', on: { click: () => powerOn(app, pc) } }, '⏻'),
      h('div', h('strong', 'Power'), h('small.muted', 'Try to boot it')),
      button('Testing →', () => app.go('testing'), { tip: 'BIOS, OS install, diagnostics and benchmarks' })),
    res,
    check,
    toolsBox(app, pc),
    pc.owner === 'shop' && !Object.keys(pc.slots).length ? button('Put the empty case back on the shelf', () => report(g.scrapBuild(pc.uid))) : null);
}

const stageName = s => ({ off: 'no power', power: 'power on (no POST)', post: 'POST (no picture)', video: 'firmware screen', bootdev: 'boot device', os: 'desktop' }[s] || s);

export function powerOn(app, pc) {
  const g = app.game;
  const r = g.powerOn(pc.uid);
  if (!r.ok) return report(r);
  g.powered = g.powered || {};
  g.powered[pc.uid] = { fp: PC.fingerprint(g.state, pc), boot: r.boot };
  const b = r.boot;
  if (b.stage === 'off') play('click');
  else { play('power'); setTimeout(() => play('fan'), 150); }
  if (b.beeps) setTimeout(() => play('beeps', b.beeps.includes('×3') ? 'lll' : 'lss'), 700);
  else if (b.display) setTimeout(() => play('beep'), 700);
  app.render(true);
  return r;
}

function toolsBox(app, pc) {
  const g = app.game, st = g.state;
  const c = st.consumables;
  const tool = (id, label, count, tip, act) => {
    const el = h('div.tool-chip', { tabindex: 0, role: 'button', class: app.ui.sel === id ? 'selected' : '', 'data-tip': tip, on: { click: act, keydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } } } }, h('span.tool-ico', { 'aria-hidden': 'true' }, { '@paste': '🧴', '@wipe': '🧻', '@air': '💨', '@light': '🔦' }[id]), h('span', label), count != null ? h('span.count', String(count)) : null);
    if (id === '@paste') makeDraggable(el, { ghost: () => '<div class="ghost-tool">🧴 Thermal paste</div>', targets: '[data-zone="cpu"]', onStart: () => { app.ui.dragging = { uid: '@paste' }; refreshZones(app, pc, document.querySelector('.pcview')); }, onEnd: () => { app.ui.dragging = null; }, onDrop: () => pasteDialog(app, pc) });
    return el;
  };
  return h('div.toolbox', h('h3', 'Bench tools'),
    tool('@light', 'Inspect', null, 'Visual inspection with the flashlight (8 min). Needs the case open.', () => inspectCase(app, pc)),
    tool('@paste', 'Paste', c.paste, 'Thermal paste: drag onto the CPU, or click then click the CPU. Hold to squeeze.', () => { if (!pc.slots.cpu) return report({ ok: false, reason: 'Install a CPU first.' }); if (pc.slots.cooler) return report({ ok: false, reason: 'Remove the cooler first.' }); pasteDialog(app, pc); }),
    tool('@wipe', 'Wipe', c.wipes, 'Isopropyl wipe: clean old paste off the CPU (cooler removed).', () => report(g.cleanPaste(pc.uid), 'Old paste wiped off.')),
    tool('@air', 'Air', c.air, 'Compressed air: blow the dust out (15 min).', () => blow(app, pc)));
}

async function inspectCase(app, pc) {
  const r = app.game.runTool(pc.uid, 'visual');
  if (!r.ok) return report(r);
  play('click');
  modal({ title: 'Visual inspection', body: h('ul.evidence', r.evidence.map(e => h(`li.${e.level}`, statusIcon(e.level), h('span', e.text)))), actions: [{ label: 'OK', cls: 'primary' }] });
}

function blow(app, pc) {
  const r = app.game.blowDust(pc.uid);
  if (!r.ok) return report(r);
  play('air');
  document.body.classList.add('puff');
  setTimeout(() => document.body.classList.remove('puff'), 900);
  toast(`Dust blown out. Dust level now ${pc.dust}%.`, 'good');
}

// hold the mouse button to squeeze paste onto the CPU
function pasteDialog(app, pc) {
  const g = app.game;
  app.ui.sel = null;
  if (g.state.consumables.paste <= 0) return report({ ok: false, reason: 'You\'re out of thermal paste. Buy more in the Store (Supplies).' });
  if (pc.paste.state === 'used' || pc.paste.state === 'dried') return report({ ok: false, reason: 'Old paste is still on the CPU. Wipe it off first.' });
  const base = pc.paste.state === 'none' ? 0 : pc.paste.amount;
  let amount = 0, timer = null;
  const cpu = PART[g.state.parts[pc.slots.cpu].id];
  const svgWrap = h('div.paste-cpu', svgEl(partIcon(cpu)));
  const blob = h('div.paste-blob');
  const verdict = h('p.paste-verdict', { 'aria-live': 'polite' }, 'Press and hold on the CPU to squeeze the tube.');
  svgWrap.append(blob);
  const draw = () => {
    const total = base + amount;
    const size = 6 + total * 1.5;
    blob.style.width = blob.style.height = `${size}px`;
    blob.classList.toggle('spill', total > 68);
  };
  const say = () => {
    const t = base + amount;
    verdict.textContent = t === 0 ? 'Press and hold on the CPU to squeeze the tube.' : t < 22 ? 'That looks like a tiny dot — probably not enough to cover the chip.' : t <= 68 ? 'About the size of a pea. That should spread nicely.' : 'That\'s a big blob — it will squeeze out over the edges.';
  };
  const startSq = e => { e.preventDefault(); play('paste'); clearInterval(timer); timer = setInterval(() => { amount = Math.min(100 - base, amount + 2); draw(); }, 50); };
  const stopSq = () => { clearInterval(timer); timer = null; say(); };
  svgWrap.addEventListener('pointerdown', startSq);
  window.addEventListener('pointerup', stopSq);
  svgWrap.tabIndex = 0;
  svgWrap.setAttribute('role', 'button');
  svgWrap.setAttribute('aria-label', 'Hold Space or the mouse button to squeeze paste');
  svgWrap.addEventListener('keydown', e => { if (e.key === ' ' && !timer) startSq(e); });
  svgWrap.addEventListener('keyup', e => { if (e.key === ' ') stopSq(); });
  draw();
  modal({
    title: 'Apply thermal paste',
    body: h('div.paste', h('p.muted', base ? 'There\'s already some fresh paste on it. Add more only if it looks too thin.' : 'A small, centred pea-sized amount spreads into a thin even layer under the cooler. Too little leaves dry spots; too much oozes out.'), svgWrap, verdict, h('p.muted.small', `Uses one application (${g.state.consumables.paste} left).`)),
    onClose: () => { window.removeEventListener('pointerup', stopSq); clearInterval(timer); },
    actions: [
      { label: 'Cancel' },
      { label: 'Wipe and start over', onClick: () => { amount = 0; draw(); say(); return false; } },
      { label: 'Done', cls: 'primary', onClick: () => { if (!amount) return; const r = g.applyPaste(pc.uid, amount); report(r, r.ok ? { good: 'Nice even layer.', thin: 'Applied — but it looks thin.', excess: 'Applied — rather a lot.' }[r.state] : null, 'paste'); } },
    ],
  });
}

function trayPanel(app, pc) {
  const g = app.game, st = g.state;
  const filter = app.ui.trayCat || 'all';
  const inv = st.inventory.filter(u => st.parts[u] && (st.parts[u].owner === 'shop' || st.parts[u].owner === pc.job));
  const cats = CATEGORIES.filter(c => c.id !== 'os' && c.id !== 'case' && inv.some(u => PART[st.parts[u].id].cat === c.id));
  const list = inv.filter(u => { const c = PART[st.parts[u].id].cat; return c !== 'case' && c !== 'os' && (filter === 'all' || c === filter); });
  const zones = PC.zoneList(st, pc);
  const order = CATEGORIES.map(c => c.id);
  list.sort((a, b) => order.indexOf(PART[st.parts[a].id].cat) - order.indexOf(PART[st.parts[b].id].cat));
  const cards = list.map(u => {
    const p = st.parts[u], d = PART[p.id];
    const fits = zones.filter(z => PC.zoneCategory(z) === d.cat && !pc.slots[z]);
    const anyOk = fits.some(z => [0, 90, 180, 270].some(r => PC.canInstall(st, pc, u, z, r).ok));
    const why = !anyOk && fits.length ? PC.canInstall(st, pc, u, fits[0], 0).reason : !fits.length ? 'No free slot for this right now.' : null;
    const rot0 = app.ui.sel === u ? app.ui.selRot : boxRotation(u, d.cat);
    const card = partCard(app, u, { selected: app.ui.sel === u, rot: d.cat === 'cpu' ? rot0 : 0, badge: h('span.fit', { class: anyOk ? 'ok' : 'no', 'data-tip': anyOk ? 'Fits a free zone' : why, 'aria-label': anyOk ? 'fits' : 'does not fit' }, anyOk ? '●' : '○') });
    card.addEventListener('click', () => {
      if (app.ui.sel === u) { app.ui.sel = null; } else { app.ui.sel = u; app.ui.selRot = boxRotation(u, d.cat); }
      app.render(true);
    });
    card.addEventListener('dblclick', () => inspectPart(app, u));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); } if (e.key === 'i') inspectPart(app, u); });
    makeDraggable(card, {
      ghost: () => `<div class="ghost-art">${partIcon(d, { rot: 0 })}</div><div class="ghost-cap"></div>`,
      rotatable: rotatable(d.cat), rotStep: rotStep(d.cat), rot: boxRotation(u, d.cat),
      targets: '[data-zone]',
      onStart: () => { hideTip(); app.ui.dragging = { uid: u, rot: boxRotation(u, d.cat) }; refreshZones(app, pc, document.querySelector('.pcview')); },
      onRotate: (rot, ghost) => { if (app.ui.dragging) app.ui.dragging.rot = rot; refreshZones(app, pc, document.querySelector('.pcview')); caption(ghost, app, pc, u, app.ui.dragging && app.ui.dragging.zone); },
      onHover: (t, ghost) => { if (app.ui.dragging) app.ui.dragging.zone = t ? t.dataset.zone : null; caption(ghost, app, pc, u, t ? t.dataset.zone : null); },
      onEnd: () => { const rot = app.ui.dragging ? app.ui.dragging.rot : 0; app.ui.lastRot = rot; app.ui.dragging = null; refreshZones(app, pc, document.querySelector('.pcview')); },
      onDrop: t => install(app, pc, u, t.dataset.zone, app.ui.lastRot || 0),
    });
    return card;
  });
  const sel = app.ui.sel && st.parts[app.ui.sel] ? st.parts[app.ui.sel] : null;
  return h('aside.asm-right',
    h('div.panel-head', h('h2', 'Parts tray'), button('Store', () => { app.ui.storeTab = 'parts'; app.go('store'); }, { tip: 'Buy parts' })),
    h('div.chips', [h('button.chip', { type: 'button', class: filter === 'all' ? 'on' : '', on: { click: () => { app.ui.trayCat = 'all'; app.render(true); } } }, 'All'), ...cats.map(c => h('button.chip', { type: 'button', class: filter === c.id ? 'on' : '', on: { click: () => { app.ui.trayCat = c.id; app.render(true); } } }, c.label))]),
    sel ? h('div.sel-bar', h('span', `Selected: ${PART[sel.id].name}`), rotatable(PART[sel.id].cat) ? button(`Rotate (${app.ui.selRot || 0}°)`, () => { app.ui.selRot = ((app.ui.selRot || 0) + rotStep(PART[sel.id].cat)) % 360; app.render(true); }) : null, button('Inspect', () => inspectPart(app, app.ui.sel)), button('✕', () => { app.ui.sel = null; app.render(true); }, { aria: 'Cancel selection' })) : null,
    cards.length ? h('div.tray', { 'data-keep-scroll': 'tray' }, cards) : emptyState(inv.length ? 'Nothing in this category.' : 'Your shelves are empty. Buy parts in the store.', button('Go to the store', () => app.go('store'), { cls: 'primary' })),
    h('p.muted.small', 'Double-click a part (or press I) to inspect it. ● = fits a free zone now.'));
}

function caption(ghost, app, pc, uid, zone) {
  const cap = ghost.querySelector('.ghost-cap');
  if (!cap) return;
  const st = app.game.state;
  const d = PART[st.parts[uid].id];
  const rot = app.ui.dragging ? app.ui.dragging.rot : 0;
  if (!zone) { cap.textContent = rotatable(d.cat) ? `${d.name} · ${d.cat === 'fan' ? (rot === 180 ? 'flipped' : 'normal') : `${rot}°`}` : d.name; cap.className = 'ghost-cap'; return; }
  const r = PC.canInstall(st, pc, uid, zone, rot);
  let txt = r.ok ? `✔ ${PC.zoneLabel(zone)}` : `✖ ${r.reason}`;
  if (r.ok && d.cat === 'fan') { const dir = rot % 360 === 180 ? (PC.defaultFanDir(zone) === 'in' ? 'out' : 'in') : PC.defaultFanDir(zone); txt += ` · ${dir === 'in' ? 'intake' : 'exhaust'}`; }
  cap.textContent = txt;
  cap.className = `ghost-cap ${r.ok ? 'ok' : 'bad'}`;
}

function cablePanel(app, pc) {
  const g = app.game, st = g.state;
  const list = PC.cableList(st, pc);
  if (!list.length) return h('aside.asm-right', h('h2', 'Cables'), emptyState('Install a power supply and motherboard first — cables connect the parts.'));
  const known = knownLoose(pc);
  const rows = list.map(c => {
    const state = shownState(pc, c.key, known);
    const chip = h('div.cable-chip', { tabindex: 0, role: 'button', class: [state === 'ok' ? 'done' : '', !c.ok ? 'blocked' : ''], 'data-tip': c.ok ? (state === 'ok' ? 'Connected. Click the cable in the view to unplug.' : 'Drag onto its glowing port') : c.reason },
      statusIcon(state === 'ok' ? 'good' : !c.ok ? 'bad' : state === 'loose' ? 'warn' : 'info'),
      h('span.cc-label', c.label),
      state === 'ok' ? h('span.cc-state', 'connected') : c.ok ? button(state === 'loose' ? 'Reseat' : 'Connect', () => { const r = g.connect(pc.uid, c.key); if (r.ok) play('cable'); else report(r); }, { cls: 'small' }) : h('span.cc-state.bad', 'can\'t'));
    if (state !== 'ok' && c.ok) makeDraggable(chip, {
      ghost: () => `<div class="ghost-tool">🔌 ${c.label}</div>`,
      targets: '[data-port]',
      onStart: () => { hideTip(); app.ui.dragging = { cable: c.key }; refreshZones(app, pc, document.querySelector('.pcview')); },
      onEnd: () => { app.ui.dragging = null; refreshZones(app, pc, document.querySelector('.pcview')); },
      onDrop: t => { if (t.dataset.port !== c.key) return report({ ok: false, reason: 'That connector doesn\'t go there.' }); const r = g.connect(pc.uid, c.key); if (r.ok) play('cable'); else report(r); },
    });
    return chip;
  });
  const todo = list.filter(c => c.ok && shownState(pc, c.key, known) !== 'ok');
  return h('aside.asm-right',
    h('div.panel-head', h('h2', 'Cables'), todo.length ? button(`Connect all (${todo.length})`, async () => {
      for (const c of todo) { const r = g.connect(pc.uid, c.key); if (!r.ok) { report(r); break; } }
      play('cable');
    }, { tip: `Plug in everything that's missing (${todo.length * 2} min)` }) : null),
    h('div.cables', { 'data-keep-scroll': 'cables' }, rows),
    h('p.muted.small', 'Loose connectors look connected; visual inspection finds them. Click a loose cable in the view (or Reseat) to push it home.'));
}

function emptyBench(app) {
  const g = app.game, st = g.state;
  const cases = st.inventory.filter(u => st.parts[u] && PART[st.parts[u].id].cat === 'case' && st.parts[u].owner === 'shop');
  const rack = st.intake;
  return h('div.empty-bench',
    h('section.panel', h('h2', 'Start a new build'),
      cases.length ? h('div.case-pick', cases.map(u => {
        const d = PART[st.parts[u].id];
        return h('button.case-card', { type: 'button', on: { click: () => report(g.placeCase(app.ui.bench, u), null, 'screw') } }, svgEl(partIcon(d)), h('strong', d.full), h('small', `${d.forms.join(' / ')} · GPU ≤ ${d.gpuMax} mm · ${d.fans.front + d.fans.rear + d.fans.top} fan mounts`));
      })) : emptyState('You have no empty cases. Buy one in the Parts Store.', button('Buy a case', () => { app.ui.storeTab = 'parts'; app.ui.storeCat = 'case'; app.go('store'); }, { cls: 'primary' }))),
    h('section.panel', h('h2', 'Or bring a machine from the intake rack'),
      rack.length ? h('ul.machines', rack.map(u => h('li.machine', h('div.m-main', h('strong', st.pcs[u].name), h('span.muted', PART[st.parts[st.pcs[u].caseUid].id].full)), button('Put on this bench', () => report(g.toBench(u, app.ui.bench)), { cls: 'primary' })))) : h('p.muted', 'The rack is empty.')));
}

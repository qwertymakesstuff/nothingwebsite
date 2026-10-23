// The open-case workbench view: an SVG of the case interior with every installation zone,
// installed part, cable and port. Zones carry data-zone, ports data-port and installed parts
// data-part so the assembly screen can wire up drag-and-drop and inspection.

import { PART } from '../data/catalog.js';
import { s, svgEl } from './dom.js';
import { partArt, RGB_DEF } from './art.js';
import { zoneList, zoneLabel, cableList, radiatorSpot, blockedByRadiator, isFanZone, fanPos } from '../core/pc.js';

export const VIEW_W = 900, VIEW_H = 640;
const FORM_SIZE = { ATX: [300, 380], mATX: [300, 305], ITX: [215, 215] };

export function layout(state, pc) {
  const cs = PART[state.parts[pc.caseUid].id];
  const mbp = pc.slots.mb ? state.parts[pc.slots.mb] : null;
  const mb = mbp ? PART[mbp.id] : null;
  const form = mb ? mb.form : cs.forms[0];
  const [mw, mh] = FORM_SIZE[form];
  const mx = 170, my = 150;
  const L = { zones: {}, ports: {}, mb: { x: mx, y: my, w: mw, h: mh }, cs, mb: { x: mx, y: my, w: mw, h: mh, d: mb } };
  const z = (id, x, y, w, h) => { L.zones[id] = { x, y, w, h }; };
  z('mb', mx, my, mw, mh);
  const itx = form === 'ITX';
  const cpu = itx ? { x: mx + 70, y: my + 35, w: 62, h: 62 } : { x: mx + mw * 0.38, y: my + 55, w: 70, h: 70 };
  z('cpu', cpu.x, cpu.y, cpu.w, cpu.h);
  const cz = 136;
  z('cooler', cpu.x + cpu.w / 2 - cz / 2, cpu.y + cpu.h / 2 - cz / 2, cz, cz);
  const slots = mb ? mb.ramSlots : itx ? 2 : 4;
  for (let i = 0; i < slots; i++) z(`ram${i}`, mx + mw * (itx ? 0.7 : 0.72) + i * 16, my + 24, 11, itx ? 120 : 150);
  const pcieY = my + mh * (itx ? 0.82 : 0.62);
  const m2Y = [my + mh * (itx ? 0.6 : 0.5), my + mh * 0.75, my + mh * 0.86, my + mh * 0.94];
  for (let i = 0; i < (mb ? mb.m2 : 0); i++) z(`m2_${i}`, mx + 40, m2Y[i] - 7, 150, 14);
  const gpu = pc.slots.gpu ? PART[state.parts[pc.slots.gpu].id] : null;
  const glen = gpu ? Math.min(380, gpu.length * 0.95) : 250;
  z('gpu', mx + 8, pcieY - 52, glen, 56);
  L.pcieY = pcieY;
  const sfx = cs.psuForm === 'SFX';
  z('psu', 40, sfx ? 540 : 528, sfx ? 180 : 250, sfx ? 64 : 78);
  for (let i = 0; i < cs.bays35; i++) z(`bay35_${i}`, 742, 432 + i * 42, 118, 36);
  for (let i = 0; i < cs.bays25; i++) z(`bay25_${i}`, 575, 470 + i * 33, 140, 27);
  for (let i = 0; i < cs.fans.rear; i++) z(`fan:rear${i}`, 40, 160 + i * 115, 100, 100);
  for (let i = 0; i < cs.fans.top; i++) z(`fan:top${i}`, 200 + i * 118, 32, 100, 100);
  for (let i = 0; i < cs.fans.front; i++) z(`fan:front${i}`, 762, 40 + i * 122, 100, 100);
  // ports on the motherboard
  L.ports.mb24 = { x: mx + mw - 14, y: my + mh * 0.28, w: 12, h: 62 };
  L.ports.mbcpu = { x: mx + 14, y: my + 6, w: 36, h: 13 };
  L.ports.mbpanel = { x: mx + mw - 58, y: my + mh - 16, w: 40, h: 11 };
  L.ports.mbsata = { x: mx + mw - 14, y: my + mh * (itx ? 0.55 : 0.68), w: 12, h: 40 };
  L.ports.mbfan = { x: mx + mw * 0.58, y: my + 6, w: 18, h: 9 };
  L.ports.mbsys = { x: mx + 16, y: my + mh - 15, w: 60, h: 9 };
  L.psuOut = { x: L.zones.psu.x + L.zones.psu.w - 10, y: L.zones.psu.y + 8 };
  return L;
}

const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

// where each cable starts and ends, in view coordinates
function cableEnds(state, pc, L, c) {
  const P = L.ports, Z = L.zones;
  const psu = L.psuOut;
  switch (true) {
    case c.key === 'atx24': return [psu, center(P.mb24)];
    case c.key === 'cpu8': return [{ x: Z.psu.x + 12, y: Z.psu.y + 4 }, center(P.mbcpu)];
    case c.key.startsWith('pcie'): { const g = Z.gpu; const i = +c.key.slice(4); return [{ x: psu.x - 20 - i * 10, y: psu.y }, { x: g.x + g.w - 18 - i * 16, y: g.y + 4 }]; }
    case c.key.startsWith('sp:'): { const zz = Z[c.key.slice(3)]; return [{ x: psu.x - 4, y: psu.y + 20 }, { x: zz.x + 6, y: zz.y + zz.h / 2 + 4 }]; }
    case c.key.startsWith('sd:'): { const zz = Z[c.key.slice(3)]; return [center(P.mbsata), { x: zz.x + 6, y: zz.y + zz.h / 2 - 4 }]; }
    case c.key === 'panel': return [{ x: 860, y: 610 }, center(P.mbpanel)];
    case c.key === 'cpufan': { const cz = Z.cooler; return [{ x: cz.x + cz.w * 0.8, y: cz.y + 6 }, center(P.mbfan)]; }
    case c.key.startsWith('fan:'): { const zz = Z[c.key.slice(4)]; return [center(zz), center(P.mbsys)]; }
  }
  return [psu, psu];
}

export const portFor = (L, c) => {
  if (c.to === 'mb24') return L.ports.mb24;
  if (c.to === 'mbcpu') return L.ports.mbcpu;
  if (c.to === 'mbpanel') return L.ports.mbpanel;
  if (c.to === 'mbfan' && c.key === 'cpufan') return L.ports.mbfan;
  if (c.to === 'mbfan') return L.ports.mbsys;
  if (c.key.startsWith('pcie')) { const g = L.zones.gpu; const i = +c.key.slice(4); return { x: g.x + g.w - 26 - i * 16, y: g.y - 6, w: 14, h: 12 }; }
  if (c.key.startsWith('sp:') || c.key.startsWith('sd:')) { const z = L.zones[c.key.slice(3)]; return { x: z.x - 2, y: z.y + (c.key.startsWith('sp:') ? z.h / 2 : 0), w: 12, h: z.h / 2 }; }
  return { x: 0, y: 0, w: 10, h: 10 };
};

const CABLE_COLOR = k => (k === 'atx24' ? '#3c4250' : k === 'cpu8' ? '#2c313b' : k.startsWith('pcie') ? '#2c313b' : k.startsWith('sd:') ? '#c2410c' : k.startsWith('sp:') ? '#1f2329' : k === 'panel' ? '#6b7280' : '#111');
const CABLE_W = k => (k === 'atx24' ? 12 : k === 'cpu8' || k.startsWith('pcie') ? 8 : k.startsWith('sp:') || k.startsWith('sd:') ? 5 : 3);

function cablePath(a, b, key) {
  if (key === 'cpu8') return `M${a.x},${a.y} C${a.x - 12},${a.y - 200} ${a.x - 10},${b.y + 40} ${b.x - 40},${b.y} L${b.x},${b.y}`;
  const midY = Math.min(a.y, b.y) + Math.abs(a.y - b.y) * 0.4;
  return `M${a.x},${a.y} C${a.x + 30},${midY} ${b.x + (key === 'atx24' ? 50 : 10)},${b.y + 30} ${b.x},${b.y}`;
}

export function renderPC(state, pc, opts = {}) {
  const L = layout(state, pc);
  const cs = L.cs;
  const root = s('svg', { viewBox: `0 0 ${VIEW_W} ${VIEW_H}`, class: ['pcview', opts.powered ? 'powered' : '', opts.cableMode ? 'cable-mode' : '', pc.closed ? 'closed' : ''], role: 'img', 'aria-label': `Inside the ${cs.full}` });
  root.append(svgEl(`<svg><defs>${RGB_DEF}
    <pattern id="mesh" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#0006"/></pattern>
    <pattern id="dust" width="23" height="19" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="2.3" fill="#c8bfae"/><circle cx="14" cy="12" r="3" fill="#b8ae9b"/><circle cx="19" cy="3" r="1.4" fill="#d6cfc2"/><circle cx="8" cy="16" r="1.8" fill="#a89e8a"/></pattern>
    <linearGradient id="steel" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a4049"/><stop offset="1" stop-color="#262a31"/></linearGradient>
    <radialGradient id="lamp" cx=".5" cy="0" r="1"><stop offset="0" stop-color="#fff6e0" stop-opacity=".16"/><stop offset="1" stop-color="#fff6e0" stop-opacity="0"/></radialGradient>
  </defs></svg>`).firstElementChild);
  // case shell
  root.append(svgEl(`<svg><g class="shell"><rect x="12" y="12" width="876" height="616" rx="18" fill="#15181d" stroke="#0b0d10" stroke-width="4"/>
    <rect x="22" y="22" width="856" height="596" rx="12" fill="url(#steel)"/>
    <rect x="30" y="140" width="10" height="150" fill="#1b1e24"/>
    <rect x="22" y="512" width="${cs.psuForm === 'SFX' ? 220 : 300}" height="106" rx="6" fill="#1f2329" stroke="#0e1014"/>
    <text x="${cs.psuForm === 'SFX' ? 130 : 170}" y="508" text-anchor="middle" class="label">PSU ${cs.psuForm}</text>
    ${cs.bays35 ? '<rect x="732" y="420" width="140" height="190" rx="6" fill="#1f2329" stroke="#0e1014"/>' : ''}
    <text x="450" y="612" text-anchor="middle" class="brandmark">${cs.brand.toUpperCase()} · ${cs.name.toUpperCase()}</text>
    <rect x="22" y="22" width="856" height="596" rx="12" fill="url(#lamp)" pointer-events="none"/></g></svg>`).firstElementChild);
  const g = (cls, attrs = {}) => { const el = s('g', { class: cls, ...attrs }); root.append(el); return el; };
  const partsG = g('parts');
  const zonesG = g('zones');
  const cablesG = g('cables');
  const portsG = g('ports');
  const fx = g('fx');
  const zs = zoneList(state, pc);
  const zoneState = opts.zoneState || (() => null);
  // zones (outlines for empty ones)
  for (const id of zs) {
    const r = L.zones[id];
    if (!r) continue;
    if (id === 'cooler' && !pc.slots.cpu) continue;
    if (blockedByRadiator(state, pc, id)) continue;
    const st = zoneState(id);
    const filled = !!pc.slots[id];
    const el = s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 6, class: ['zone', filled ? 'filled' : 'empty', st ? `z-${st.state}` : ''], 'data-zone': id, 'data-tip': st && st.reason ? `${zoneLabel(id)}: ${st.reason}` : zoneLabel(id) });
    el.style.pointerEvents = opts.active ? (st ? 'all' : 'none') : (filled ? 'none' : 'all');
    zonesG.append(el);
    if (!filled && opts.showLabels !== false) {
      if (id === 'cpu') partsG.append(svgEl(`<svg><g pointer-events="none"><rect x="${r.x + 6}" y="${r.y + 6}" width="${r.w - 12}" height="${r.h - 12}" fill="#9aa1a9" opacity=".6"/><path d="M${r.x + 4},${r.y + 4} l14,0 l-14,14Z" fill="#f5c542"/></g></svg>`).firstElementChild);
      if (id.startsWith('ram')) partsG.append(s('rect', { x: r.x + 2, y: r.y, width: r.w - 4, height: r.h, fill: '#0b0d10', opacity: 0.8, 'pointer-events': 'none' }));
    }
  }
  // the motherboard first, then everything on it, cooler on top
  const order = ['mb', ...zs.filter(z => z.startsWith('m2_')), 'cpu', ...zs.filter(z => z.startsWith('ram')), 'gpu', 'cooler', 'psu', ...zs.filter(z => z.startsWith('bay')), ...zs.filter(isFanZone)];
  const spin = !!opts.powered;
  for (const id of order) {
    const uid = pc.slots[id];
    if (!uid) continue;
    const p = state.parts[uid], d = PART[p.id];
    let r = L.zones[id];
    let art;
    if (id === 'cooler' && d.type === 'aio') {
      const spot = radiatorSpot(cs, d);
      const n = Math.ceil(d.radiator / 120);
      const rad = spot === 'top' ? { x: 200, y: 32, w: n * 118 - 18, h: 100 } : { x: 762, y: 40, w: 100, h: n * 122 - 22 };
      const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      let fans = '';
      for (let i = 0; i < n; i++) {
        const fx_ = spot === 'top' ? rad.x + 50 + i * 118 : rad.x + 50, fy = spot === 'top' ? rad.y + 50 : rad.y + 50 + i * 122;
        fans += `<g transform="translate(${fx_ - 48},${fy - 48})">${partArt({ cat: 'fan', size: 120 }, 96, 96, { spin })}</g>`;
      }
      const tube = `<path d="M${c.x - 14},${c.y - 30} C${c.x - 20},${rad.y + rad.h + 60} ${rad.x + 30},${rad.y + rad.h + 40} ${rad.x + 30},${rad.y + rad.h - 6}" stroke="#111" stroke-width="9" fill="none"/><path d="M${c.x + 14},${c.y - 30} C${c.x + 20},${rad.y + rad.h + 80} ${rad.x + rad.w - 30},${rad.y + rad.h + 40} ${rad.x + rad.w - 30},${rad.y + rad.h - 6}" stroke="#111" stroke-width="9" fill="none"/>`;
      const radArt = `<rect x="${rad.x}" y="${rad.y}" width="${rad.w}" height="${rad.h}" rx="6" fill="#1b1f26" stroke="#0b0d10"/>${fans}`;
      partsG.append(svgEl(`<svg><g class="part" data-part="${id}" data-tip="${d.full} — click to inspect">${tube}${radArt}<g transform="translate(${c.x - 45},${c.y - 45})">${partArt(d, 90, 90)}</g></g></svg>`).firstElementChild);
      continue;
    }
    if (id === 'gpu') r = { ...r };
    const o = { spin: spin && !(p.fault && ['dead'].includes(p.fault)), dir: pc.fanDir[id], rot: 0 };
    if (id === 'mb') { const w = r.w, h = r.h; art = partArt(d, w, h); }
    else if (id.startsWith('ram')) art = partArt(d, r.w, r.h, { rot: 0 });
    else art = partArt(d, r.w, r.h, o);
    const grp = svgEl(`<svg><g class="part cat-${d.cat}${p.fault && opts.revealFaults ? ' faulty' : ''}" data-part="${id}" transform="translate(${r.x},${r.y})" data-tip="${d.full} — click to inspect">${art}</g></svg>`).firstElementChild;
    if (opts.justInstalled === id) grp.classList.add('just-installed');
    partsG.append(grp);
    if (id === 'cpu' && !pc.slots.cooler && pc.paste.state !== 'none') {
      const amt = pc.paste.amount, rr = 6 + amt * 0.22;
      const col = pc.paste.state === 'dried' || pc.paste.state === 'used' ? '#8d8a80' : '#d7d9dc';
      partsG.append(svgEl(`<svg><g pointer-events="none"><ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h / 2}" rx="${rr}" ry="${rr * 0.9}" fill="${col}" opacity=".95"/>${pc.paste.state === 'excess' ? `<ellipse cx="${r.x + r.w / 2 + rr * 0.6}" cy="${r.y + r.h - 4}" rx="9" ry="4" fill="${col}"/>` : ''}${pc.paste.state === 'used' || pc.paste.state === 'dried' ? `<path d="M${r.x + 20},${r.y + 25} l30,20 M${r.x + 22},${r.y + 45} l26,-18" stroke="#6b675d" stroke-width="2"/>` : ''}</g></svg>`).firstElementChild);
    }
  }
  // cables
  const cables = cableList(state, pc);
  for (const c of cables) {
    const st = pc.cables[c.key];
    if (!st) continue;
    const [a, b] = cableEnds(state, pc, L, c);
    const path = cablePath(a, b, c.key);
    cablesG.append(s('path', { d: path, class: ['cable', st === 'loose' && opts.knownLoose && opts.knownLoose.has(c.key) ? 'loose' : ''], stroke: CABLE_COLOR(c.key), 'stroke-width': CABLE_W(c.key), fill: 'none', 'stroke-linecap': 'round', 'data-cable': c.key, 'data-tip': `${c.label}${st === 'loose' && opts.knownLoose && opts.knownLoose.has(c.key) ? ' — not fully latched! Click to reseat.' : ''}${opts.cableMode ? ' (click to unplug)' : ''}` }));
    if (CABLE_W(c.key) >= 8) cablesG.append(s('path', { d: path, stroke: '#ffffff18', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '3 4', 'pointer-events': 'none' }));
  }
  // ports (always drawn on the board; highlighted in cable mode)
  if (pc.slots.mb) {
    for (const [k, r] of Object.entries(L.ports)) portsG.append(s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 2, class: `port-base port-${k}` }));
  }
  if (opts.cableMode) {
    for (const c of cables) {
      if (pc.cables[c.key] === 'ok' || (pc.cables[c.key] === 'loose' && !(opts.knownLoose && opts.knownLoose.has(c.key)))) continue;
      const r = portFor(L, c);
      const st = zoneState(`port:${c.key}`);
      portsG.append(s('rect', { x: r.x - 3, y: r.y - 3, width: r.w + 6, height: r.h + 6, rx: 4, class: ['port', c.ok ? 'avail' : 'blocked', st ? `z-${st.state}` : ''], 'data-port': c.key, 'data-tip': c.ok ? `${c.label}${pc.cables[c.key] === 'loose' ? ' (loose — reseat)' : ''}` : `${c.label}: ${c.reason}` }));
    }
  }
  // a little burst where something was just fitted
  if (opts.justInstalled && L.zones[opts.justInstalled]) {
    const r = L.zones[opts.justInstalled];
    fx.append(s('circle', { cx: r.x + r.w / 2, cy: r.y + r.h / 2, r: Math.min(60, Math.max(r.w, r.h) / 2), class: 'burst', 'pointer-events': 'none' }));
  }
  // dust
  if (pc.dust > 8) fx.append(s('rect', { x: 22, y: 22, width: 856, height: 596, rx: 12, fill: 'url(#dust)', opacity: Math.min(0.5, pc.dust / 160), 'pointer-events': 'none', class: 'dust' }));
  // status lights
  if (pc.slots.mb) {
    const m = L.mb;
    fx.append(s('circle', { cx: m.x + m.w - 30, cy: m.y + 18, r: 4, class: ['led', opts.powered ? 'on' : ''] }));
    if (opts.leds) {
      const names = ['cpu', 'dram', 'vga', 'boot'];
      names.forEach((n, i) => {
        fx.append(s('circle', { cx: m.x + m.w - 70 + i * 13, cy: m.y + m.h - 30, r: 3.5, class: ['dbg', opts.leds[n] ? 'lit' : ''] }));
      });
    }
  }
  if (pc.closed) fx.append(svgEl(`<svg><g class="side-panel" pointer-events="none"><rect x="22" y="22" width="856" height="596" rx="12" fill="#0f1216" opacity=".82"/><rect x="60" y="60" width="780" height="520" rx="10" fill="#7dd3fc0d" stroke="#ffffff1a"/><text x="450" y="330" text-anchor="middle" class="panel-text">Side panel on</text></g></svg>`).firstElementChild);
  return { el: root, layout: L };
}

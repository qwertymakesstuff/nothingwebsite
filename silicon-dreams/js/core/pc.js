// The physical computer on a workbench: which part sits in which installation zone, which cables
// are plugged in, the thermal paste, dust and whether the side panel is on. Everything here is
// plain data on state.pcs[uid]; these functions validate and apply hands-on changes and explain
// why something can't be done.

import { PART } from '../data/catalog.js';
import { makePart } from './parts.js';

export function newPC(state, caseUid, opts = {}) {
  const uid = `pc${state.nextUid++}`;
  const pc = {
    uid, name: opts.name || 'Custom build', owner: opts.owner || 'shop', caseUid,
    slots: {}, fanDir: {}, cables: {}, paste: { state: 'none', amount: 0 }, dust: opts.dust || 0, closed: false,
    tests: {}, evidence: [], created: state.day,
  };
  state.pcs[uid] = pc;
  return pc;
}

const defOf = (state, uid) => (uid && state.parts[uid] ? PART[state.parts[uid].id] : null);
export const caseDef = (state, pc) => defOf(state, pc.caseUid);
export const at = (state, pc, zone) => defOf(state, pc.slots[zone]);
export const mbDef = (state, pc) => at(state, pc, 'mb');

// zone helpers
export const RAM_ZONES = n => Array.from({ length: n }, (_, i) => `ram${i}`);
export const M2_ZONES = n => Array.from({ length: n }, (_, i) => `m2_${i}`);
export const isFanZone = z => z.startsWith('fan:');
export const fanPos = z => z.slice(4).replace(/\d+$/, '');

export function radiatorSpot(cs, cooler) {
  if (!cooler || cooler.type !== 'aio' || !cs) return null;
  if (cs.fans.top * 120 >= cooler.radiator) return 'top';
  if (cs.fans.front * 120 >= cooler.radiator) return 'front';
  return null;
}

// all installation zones this machine currently has, in install order
export function zoneList(state, pc) {
  const cs = caseDef(state, pc);
  if (!cs) return [];
  const mb = mbDef(state, pc);
  const z = ['mb'];
  if (mb) z.push('cpu', 'cooler', ...RAM_ZONES(mb.ramSlots), ...M2_ZONES(mb.m2));
  for (let i = 0; i < cs.bays35; i++) z.push(`bay35_${i}`);
  for (let i = 0; i < cs.bays25; i++) z.push(`bay25_${i}`);
  z.push('psu');
  if (mb) z.push('gpu');
  for (const pos of ['front', 'rear', 'top']) for (let i = 0; i < cs.fans[pos]; i++) z.push(`fan:${pos}${i}`);
  return z;
}

export function zoneCategory(zone) {
  if (zone === 'mb') return 'motherboard';
  if (zone.startsWith('ram')) return 'ram';
  if (zone.startsWith('m2_') || zone.startsWith('bay')) return 'storage';
  if (isFanZone(zone)) return 'fan';
  return zone; // cpu, cooler, gpu, psu
}

export function zoneLabel(zone) {
  if (zone === 'mb') return 'Motherboard tray';
  if (zone === 'cpu') return 'CPU socket';
  if (zone === 'cooler') return 'CPU cooler mount';
  if (zone === 'gpu') return 'PCIe x16 slot';
  if (zone === 'psu') return 'PSU bay';
  if (zone.startsWith('ram')) return `DIMM slot ${'ABCD'[+zone.slice(3)] || ''}`;
  if (zone.startsWith('m2_')) return `M.2 slot ${+zone.slice(3) + 1}`;
  if (zone.startsWith('bay35_')) return `3.5" drive bay ${+zone.slice(6) + 1}`;
  if (zone.startsWith('bay25_')) return `2.5" drive mount ${+zone.slice(6) + 1}`;
  if (isFanZone(zone)) return `${fanPos(zone)[0].toUpperCase()}${fanPos(zone).slice(1)} fan mount ${+zone.match(/\d+$/)[0] + 1}`;
  return zone;
}

export const defaultFanDir = zone => (fanPos(zone) === 'front' ? 'in' : 'out');

export function blockedByRadiator(state, pc, zone) {
  if (!isFanZone(zone)) return false;
  const spot = radiatorSpot(caseDef(state, pc), at(state, pc, 'cooler'));
  if (!spot || fanPos(zone) !== spot) return false;
  const n = Math.ceil(at(state, pc, 'cooler').radiator / 120);
  return +zone.match(/\d+$/)[0] < n;
}

export const installedUids = pc => Object.values(pc.slots).filter(Boolean);

// Can this part go in this zone right now? Returns { ok, reason } with a plain explanation.
export function canInstall(state, pc, uid, zone, rot = 0) {
  const p = state.parts[uid];
  if (!p) return { ok: false, reason: 'That part is missing.' };
  const d = PART[p.id];
  const cs = caseDef(state, pc);
  const mb = mbDef(state, pc);
  const want = zoneCategory(zone);
  if (d.cat === 'os') return { ok: false, reason: 'Operating systems are installed from the Testing screen, not by hand.' };
  if (d.cat !== want) return { ok: false, reason: `${d.full} is a ${d.cat === 'ram' ? 'memory stick' : d.cat}; this is the ${zoneLabel(zone).toLowerCase()}.` };
  if (pc.closed) return { ok: false, reason: 'The side panel is on. Open the case first.' };
  if (!zoneList(state, pc).includes(zone)) {
    if (!mb && ['cpu', 'cooler', 'gpu'].includes(zone)) return { ok: false, reason: 'Install a motherboard first.' };
    return { ok: false, reason: 'This machine has no such slot.' };
  }
  if (pc.slots[zone]) return { ok: false, reason: `${zoneLabel(zone)} already holds ${defOf(state, pc.slots[zone]).full}. Remove it first.` };
  switch (d.cat) {
    case 'motherboard':
      if (!cs.forms.includes(d.form)) return { ok: false, reason: `${d.form} boards don't fit the ${cs.full}; it takes ${cs.forms.join(' / ')}.` };
      break;
    case 'cpu':
      if (d.socket !== mb.socket) return { ok: false, reason: `Socket mismatch: the ${d.full} is ${d.socket}, the ${mb.full} is ${mb.socket}.` };
      if (rot % 360 !== 0) return { ok: false, reason: 'The gold triangle on the CPU must line up with the triangle on the socket corner. Forcing it in would bend pins — rotate it (R or right-click) and try again.' };
      break;
    case 'cooler': {
      const cpu = at(state, pc, 'cpu');
      if (!cpu) return { ok: false, reason: 'Install the CPU before the cooler.' };
      if (!d.sockets.includes(cpu.socket)) return { ok: false, reason: `The ${d.full} has no mounting bracket for ${cpu.socket}. It supports ${d.sockets.join(', ')}.` };
      if (d.type === 'air' && d.height > cs.coolerMax) return { ok: false, reason: `Too tall: the cooler is ${d.height} mm, the case allows ${cs.coolerMax} mm before the side panel.` };
      if (d.type === 'aio') {
        if (d.radiator > cs.radiator) return { ok: false, reason: cs.radiator ? `The ${d.radiator} mm radiator is too big; the case mounts up to ${cs.radiator} mm.` : 'This case has no radiator mount.' };
        const spot = radiatorSpot(cs, d);
        if (!spot) return { ok: false, reason: 'No fan mount row is long enough for this radiator.' };
        const n = Math.ceil(d.radiator / 120);
        for (let i = 0; i < n; i++) if (pc.slots[`fan:${spot}${i}`]) return { ok: false, reason: `The radiator mounts on the ${spot} fan positions. Remove the ${spot} fans first.` };
      }
      break;
    }
    case 'ram':
      if (d.mem !== mb.mem) return { ok: false, reason: `${d.mem} memory won't go in a ${mb.mem} slot: the notch is in a different place.` };
      if (rot % 360 !== 0) return { ok: false, reason: 'The notch on the stick doesn\'t line up with the key in the slot. Turn it around (R or right-click).' };
      if (ramTotal(state, pc) + d.gb > mb.maxRam) return { ok: false, reason: `The ${mb.full} supports at most ${mb.maxRam} GB of memory.` };
      break;
    case 'storage':
      if (zone.startsWith('m2_') && d.iface !== 'm2') return { ok: false, reason: `${d.full} is a SATA drive; M.2 slots only take M.2 drives. Use a drive bay.` };
      if (zone.startsWith('bay') && d.iface === 'm2') return { ok: false, reason: 'M.2 drives mount on the motherboard, not in a drive bay.' };
      if (zone.startsWith('bay25') && d.bay === '3.5') return { ok: false, reason: 'A 3.5" hard disk is too big for a 2.5" mount.' };
      if (zone.startsWith('bay') && sataDrives(state, pc).length >= (mb ? mb.sata : 99)) return { ok: false, reason: `All ${mb.sata} SATA ports on the motherboard are used.` };
      break;
    case 'psu':
      if (d.form !== cs.psuForm) return { ok: false, reason: `The case takes an ${cs.psuForm} power supply; the ${d.full} is ${d.form}.` };
      break;
    case 'gpu':
      if (d.length > cs.gpuMax) return { ok: false, reason: `Too long: the card is ${d.length} mm, the case fits ${cs.gpuMax} mm.` };
      break;
    case 'fan':
      if (blockedByRadiator(state, pc, zone)) return { ok: false, reason: 'The AIO radiator occupies this mount.' };
      if (d.size === 140 && cs.id === 'case-boxwell-mini') return { ok: false, reason: 'This small case only takes 120 mm fans.' };
      break;
  }
  return { ok: true };
}

export function install(state, pc, uid, zone, rot = 0) {
  const r = canInstall(state, pc, uid, zone, rot);
  if (!r.ok) return r;
  const p = state.parts[uid];
  const d = PART[p.id];
  pc.slots[zone] = uid;
  state.inventory = state.inventory.filter(u => u !== uid);
  const notes = [];
  if (d.cat === 'fan') pc.fanDir[zone] = (rot % 360 === 180) ? (defaultFanDir(zone) === 'in' ? 'out' : 'in') : defaultFanDir(zone);
  if (d.cat === 'cooler') {
    if (p.pasteFresh) {
      if (pc.paste.state === 'none') pc.paste = { state: 'good', amount: 45 };
      else if (pc.paste.state === 'good' || pc.paste.state === 'thin') { pc.paste = { state: 'excess', amount: 90 }; notes.push('The cooler already had paste on it — now there\'s too much.'); }
      p.pasteFresh = false;
    } else if (pc.paste.state === 'none') notes.push('No thermal paste between the CPU and cooler — it will run very hot.');
    else if (pc.paste.state === 'used') { pc.paste.state = 'dried'; notes.push('The old paste was reused; it won\'t conduct heat well.'); }
  }
  if (d.cat === 'cpu') pc.paste = { state: 'none', amount: 0 };
  return { ok: true, notes };
}

// parts that must come out before this one can
export function removalBlockers(state, pc, zone) {
  const b = [];
  if (zone === 'cpu' && pc.slots.cooler) b.push('cooler');
  if (zone === 'mb') for (const z of Object.keys(pc.slots)) if (z === 'cpu' || z === 'cooler' || z === 'gpu' || z.startsWith('ram') || z.startsWith('m2_')) if (pc.slots[z]) b.push(z);
  return b;
}

export function canRemove(state, pc, zone) {
  if (!pc.slots[zone]) return { ok: false, reason: 'Nothing is installed there.' };
  if (pc.closed) return { ok: false, reason: 'The side panel is on. Open the case first.' };
  const b = removalBlockers(state, pc, zone);
  if (b.length) return { ok: false, reason: `Remove the ${b.map(z => zoneLabel(z).toLowerCase()).join(', ')} first.` };
  return { ok: true };
}

export function remove(state, pc, zone) {
  const r = canRemove(state, pc, zone);
  if (!r.ok) return r;
  const uid = pc.slots[zone];
  delete pc.slots[zone];
  delete pc.fanDir[zone];
  if (zone === 'cooler' && pc.paste.state !== 'none') pc.paste = { state: 'used', amount: pc.paste.amount };
  if (zone === 'cpu') pc.paste = { state: 'none', amount: 0 };
  // unplug anything whose cable no longer has both ends
  const valid = new Set(cableList(state, pc).map(c => c.key));
  for (const k of Object.keys(pc.cables)) if (!valid.has(k)) delete pc.cables[k];
  state.inventory.push(uid);
  return { ok: true, uid };
}

export const ramTotal = (state, pc) => Object.keys(pc.slots).filter(z => z.startsWith('ram')).reduce((s, z) => s + at(state, pc, z).gb, 0);
export const sataDrives = (state, pc) => Object.keys(pc.slots).filter(z => z.startsWith('bay') && pc.slots[z]);
export const storageZones = (state, pc) => Object.keys(pc.slots).filter(z => (z.startsWith('bay') || z.startsWith('m2_')) && pc.slots[z]);
export const fanZones = (state, pc) => Object.keys(pc.slots).filter(z => isFanZone(z) && pc.slots[z]);

// Every cable this machine needs given what's installed. `ok:false` cables can't be connected
// at all (not enough connectors) and say why.
export function cableList(state, pc) {
  const out = [];
  const mb = mbDef(state, pc), psu = at(state, pc, 'psu'), gpu = at(state, pc, 'gpu'), cooler = at(state, pc, 'cooler');
  if (psu && mb) {
    out.push({ key: 'atx24', label: '24-pin motherboard power', from: 'psu', to: 'mb24', ok: true });
    out.push({ key: 'cpu8', label: '8-pin CPU power', from: 'psu', to: 'mbcpu', ok: true });
  }
  if (psu && gpu) for (let i = 0; i < gpu.pins; i++) out.push({ key: `pcie${i}`, label: `PCIe 8-pin #${i + 1} to graphics card`, from: 'psu', to: 'gpu', ok: i < psu.pcie, reason: `The ${psu.full} only has ${psu.pcie} PCIe cable${psu.pcie === 1 ? '' : 's'}.` });
  const sata = sataDrives(state, pc);
  sata.forEach((z, i) => {
    if (psu) out.push({ key: `sp:${z}`, label: `SATA power to ${at(state, pc, z).name}`, from: 'psu', to: z, ok: i < psu.sataPower, reason: `The ${psu.full} has only ${psu.sataPower} SATA power plugs.` });
    if (mb) out.push({ key: `sd:${z}`, label: `SATA data: ${at(state, pc, z).name} to motherboard`, from: 'mbsata', to: z, ok: i < mb.sata, reason: 'No free SATA ports.' });
  });
  if (mb) out.push({ key: 'panel', label: 'Front panel (power button, LEDs)', from: 'case', to: 'mbpanel', ok: true });
  if (mb && cooler) out.push({ key: 'cpufan', label: cooler.type === 'aio' ? 'AIO pump & fans to CPU_FAN' : 'Cooler fan to CPU_FAN header', from: 'cooler', to: 'mbfan', ok: true });
  if (mb) {
    let headers = mb.fanHeaders - (cooler ? 1 : 0);
    for (const z of fanZones(state, pc)) {
      out.push({ key: `fan:${z}`, label: `${zoneLabel(z)} fan to header`, from: z, to: 'mbfan', ok: headers > 0, reason: `The ${mb.full} has only ${mb.fanHeaders} fan headers.` });
      headers--;
    }
  }
  return out;
}

export function connect(state, pc, key) {
  const c = cableList(state, pc).find(x => x.key === key);
  if (!c) return { ok: false, reason: 'Both ends of that cable aren\'t installed yet.' };
  if (!c.ok) return { ok: false, reason: c.reason };
  if (pc.closed) return { ok: false, reason: 'Open the case first.' };
  pc.cables[key] = 'ok';
  return { ok: true };
}

export function disconnect(state, pc, key) {
  if (pc.closed) return { ok: false, reason: 'Open the case first.' };
  delete pc.cables[key];
  return { ok: true };
}

export const cableState = (pc, key) => pc.cables[key] || null;

// thermal paste
export function applyPaste(state, pc, amount) {
  if (pc.closed) return { ok: false, reason: 'Open the case first.' };
  if (!pc.slots.cpu) return { ok: false, reason: 'Install the CPU first — paste goes on the CPU\'s metal lid.' };
  if (pc.slots.cooler) return { ok: false, reason: 'The cooler is on top of the CPU. Remove it first.' };
  if (pc.paste.state === 'used' || pc.paste.state === 'dried') return { ok: false, reason: 'Old paste is still on the CPU. Wipe it off with a cleaning wipe first.' };
  if ((state.consumables.paste || 0) <= 0) return { ok: false, reason: 'You\'re out of thermal paste. Buy more in the Parts Store (Supplies).' };
  state.consumables.paste--;
  const a = Math.max(0, Math.min(100, Math.round((pc.paste.state === 'none' ? 0 : pc.paste.amount) + amount)));
  pc.paste = { state: pasteState(a), amount: a };
  return { ok: true, state: pc.paste.state };
}

export const pasteState = a => (a < 22 ? 'thin' : a <= 68 ? 'good' : 'excess');

export function cleanPaste(state, pc) {
  if (pc.closed) return { ok: false, reason: 'Open the case first.' };
  if (!pc.slots.cpu) return { ok: false, reason: 'There\'s no CPU to clean.' };
  if (pc.slots.cooler) return { ok: false, reason: 'Remove the cooler to reach the CPU.' };
  if (pc.paste.state === 'none') return { ok: false, reason: 'The CPU is already clean.' };
  if ((state.consumables.wipes || 0) <= 0) return { ok: false, reason: 'You\'re out of cleaning wipes.' };
  state.consumables.wipes--;
  pc.paste = { state: 'none', amount: 0 };
  return { ok: true };
}

export const PASTE_FACTOR = { good: 1, thin: 1.35, excess: 1.12, none: 2.3, used: 1.5, dried: 1.75 };
export const PASTE_LABEL = { good: 'Good, even layer', thin: 'Too little (dry spots)', excess: 'Too much (spilling over)', none: 'None', used: 'Old paste (disturbed)', dried: 'Dried out' };

export function blowDust(state, pc) {
  if (pc.closed) return { ok: false, reason: 'Open the case first.' };
  if (pc.dust <= 0) return { ok: false, reason: 'It\'s already spotless.' };
  if ((state.consumables.air || 0) <= 0) return { ok: false, reason: 'You\'re out of compressed air.' };
  state.consumables.air--;
  pc.dust = Math.max(0, pc.dust - 75);
  return { ok: true };
}

export function setClosed(state, pc, closed) {
  if (closed && !pc.caseUid) return { ok: false, reason: 'No case.' };
  pc.closed = closed;
  return { ok: true };
}

// a compact fingerprint of everything that affects how the machine runs; test results are only
// valid for the fingerprint they were recorded against
export function fingerprint(state, pc) {
  const slots = Object.keys(pc.slots).sort().map(z => {
    const p = state.parts[pc.slots[z]];
    let s = `${z}=${p.uid}:${p.fault || ''}`;
    if (p.bios) s += `:${p.bios.xmp}${p.bios.fan}${p.bios.boot}${p.bios.volt}`;
    if (p.data) s += `:${p.data.os}${p.data.osOk}${p.data.drivers}${p.data.malware}${p.data.files.length}`;
    if (pc.fanDir[z]) s += `:${pc.fanDir[z]}`;
    return s;
  }).join(',');
  const cables = Object.keys(pc.cables).sort().map(k => `${k}${pc.cables[k]}`).join(',');
  return `${slots}|${cables}|${pc.paste.state}|${Math.round(pc.dust / 10)}`;
}

// customer machines arrive pre-assembled: build one straight from a list of part ids
export function assemble(state, spec, opts = {}) {
  const owner = opts.owner || 'shop';
  const mk = (id, extra = {}) => makePart(state, id, { owner, used: owner !== 'shop', cond: opts.cond ?? 100, cost: owner === 'shop' ? undefined : 0, ...extra });
  const cs = mk(spec.case);
  const pc = newPC(state, cs.uid, { owner, name: opts.name, dust: opts.dust || 0 });
  const put = (zone, uid) => { pc.slots[zone] = uid; };
  const ex = id => (opts.parts && opts.parts[id]) || {};
  put('mb', mk(spec.motherboard, ex(spec.motherboard)).uid);
  put('cpu', mk(spec.cpu, ex(spec.cpu)).uid);
  put('cooler', mk(spec.cooler, { pasteFresh: false, ...ex(spec.cooler) }).uid);
  pc.paste = { state: 'good', amount: 45 };
  (spec.ram || []).forEach((id, i) => put(`ram${i}`, mk(id, ex(id)).uid));
  const csd = PART[spec.case];
  let b35 = 0, b25 = 0, m2 = 0;
  (spec.storage || []).forEach((id, i) => {
    const d = PART[id];
    const extra = i === 0 ? { data: opts.data, ...ex(id) } : ex(id);
    const u = mk(id, extra).uid;
    if (d.iface === 'm2') put(`m2_${m2++}`, u);
    else if (d.bay === '2.5' && b25 < csd.bays25) put(`bay25_${b25++}`, u);
    else put(`bay35_${b35++}`, u);
  });
  put('psu', mk(spec.psu, ex(spec.psu)).uid);
  if (spec.gpu) put('gpu', mk(spec.gpu, ex(spec.gpu)).uid);
  const order = [];
  for (const pos of ['front', 'rear', 'top']) for (let i = 0; i < csd.fans[pos]; i++) order.push(`fan:${pos}${i}`);
  const free = order.filter(z => !blockedByRadiator(state, pc, z));
  (spec.fans || []).forEach((id, i) => { if (free[i]) { put(free[i], mk(id, ex(id)).uid); pc.fanDir[free[i]] = defaultFanDir(free[i]); } });
  for (const c of cableList(state, pc)) if (c.ok) pc.cables[c.key] = 'ok';
  pc.closed = true;
  return pc;
}

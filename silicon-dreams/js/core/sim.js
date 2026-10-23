// The physical model: power draw, airflow, temperatures, noise and performance, computed from the
// machine as it actually is — parts that are installed, plugged in and not broken, the paste,
// the dust, BIOS settings and software state. Nothing here is random except a small,
// deterministic benchmark wobble.

import { PART } from '../data/catalog.js';
import { AMBIENT, CPU_THROTTLE, CPU_SHUTDOWN, GPU_THROTTLE } from './config.js';
import { at, mbDef, caseDef, fanZones, storageZones, PASTE_FACTOR, radiatorSpot } from './pc.js';
import { hashStr } from './rng.js';
import { clamp } from './util.js';

// spec-level peak draw (planner & compatibility)
export function powerBudget(s) {
  let w = 10;
  if (s.cpu) w += s.cpu.peak;
  if (s.gpu) w += s.gpu.tdp;
  if (s.motherboard) w += s.motherboard.watts;
  for (const r of s.ram || []) w += r.watts;
  for (const d of s.storage || []) w += d.watts;
  for (const f of s.fans || []) w += f.watts;
  if (s.cooler) w += s.cooler.watts;
  return Math.round(w);
}

// definitions of what's in a machine, for the spec-level checks
export function specOf(state, pc) {
  const zones = Object.keys(pc.slots);
  const d = z => at(state, pc, z);
  return {
    case: caseDef(state, pc), motherboard: d('mb'), cpu: d('cpu'), cooler: d('cooler'), gpu: d('gpu'), psu: d('psu'),
    ram: zones.filter(z => z.startsWith('ram')).map(d),
    storage: zones.filter(z => z.startsWith('m2_') || z.startsWith('bay')).map(d),
    fans: zones.filter(z => z.startsWith('fan:')).map(d),
    os: null,
  };
}

const P = (state, pc, z) => (pc.slots[z] ? state.parts[pc.slots[z]] : null);
const cab = (pc, k) => pc.cables[k] || null;

// Everything the model needs, resolved once.
export function snapshot(state, pc) {
  const mbp = P(state, pc, 'mb');
  const bios = mbp ? mbp.bios : null;
  const cooler = at(state, pc, 'cooler'), coolerP = P(state, pc, 'cooler');
  const fanMode = bios ? bios.fan : 'standard';
  const fans = fanZones(state, pc).map(z => {
    const p = P(state, pc, z), d = PART[p.id];
    const plugged = cab(pc, `fan:${z}`) === 'ok' || cab(pc, `fan:${z}`) === 'loose';
    return { z, d, p, dir: pc.fanDir[z], working: !p.fault && plugged && fanMode !== 'off' };
  });
  const drives = storageZones(state, pc).map(z => {
    const p = P(state, pc, z), d = PART[p.id];
    const linked = z.startsWith('m2_') || (cab(pc, `sp:${z}`) === 'ok' && cab(pc, `sd:${z}`) === 'ok');
    return { z, d, p, linked, alive: p.fault !== 'dead' };
  });
  const ram = Object.keys(pc.slots).filter(z => z.startsWith('ram')).sort().map(z => ({ z, d: at(state, pc, z), p: P(state, pc, z) }));
  return {
    cs: caseDef(state, pc), mb: mbDef(state, pc), mbp, bios, cpu: at(state, pc, 'cpu'), cpuP: P(state, pc, 'cpu'),
    cooler, coolerP, coolerOn: !!cooler && !coolerP.fault && !!cab(pc, 'cpufan') && fanMode !== 'off',
    gpu: at(state, pc, 'gpu'), gpuP: P(state, pc, 'gpu'), psu: at(state, pc, 'psu'), psuP: P(state, pc, 'psu'),
    fans, drives, ram, paste: pc.paste.state, dust: pc.dust, closed: pc.closed, fanMode, cables: pc.cables,
  };
}

export function power(snap) {
  let peak = 12;
  if (snap.cpu) peak += snap.cpu.peak * (snap.bios && snap.bios.volt === 'high' ? 1.25 : 1);
  if (snap.gpu) peak += snap.gpu.tdp;
  if (snap.mb) peak += snap.mb.watts;
  for (const r of snap.ram) peak += r.d.watts;
  for (const d of snap.drives) peak += d.d.watts;
  for (const f of snap.fans) peak += f.d.watts;
  if (snap.cooler) peak += snap.cooler.watts;
  peak = Math.round(peak);
  let capacity = 0;
  if (snap.psu && snap.psuP.fault !== 'dead') {
    capacity = snap.psu.watts * (snap.psuP.fault === 'unstable' ? 0.5 : 1) * (snap.psuP.cond < 50 ? 0.9 : 1);
  }
  return { peak, idle: Math.round(peak * 0.35), capacity: Math.round(capacity) };
}

const FAN_MODE = { silent: { flow: 0.75, db: -6 }, standard: { flow: 1, db: 0 }, performance: { flow: 1.15, db: 4 }, off: { flow: 0, db: -40 } };

export function airflow(snap) {
  if (!snap.cs) return { total: 0, intake: 0, exhaust: 0 };
  const mode = FAN_MODE[snap.fanMode] || FAN_MODE.standard;
  let intake = 0, exhaust = 0;
  for (const f of snap.fans) if (f.working) (f.dir === 'in' ? (intake += f.d.airflow) : (exhaust += f.d.airflow));
  if (snap.cooler && snap.cooler.type === 'aio' && snap.coolerOn) {
    const spot = radiatorSpot(snap.cs, snap.cooler);
    const flow = (snap.cooler.radiator / 120) * 40;
    if (spot === 'front') intake += flow * 0.7; else exhaust += flow * 0.7;
  }
  intake *= mode.flow; exhaust *= mode.flow;
  const balanced = Math.min(intake, exhaust), extra = Math.abs(intake - exhaust);
  let total = snap.cs.airflow + balanced * 1.0 + extra * 0.45;
  if (!snap.closed) total += 6;
  total *= 1 - snap.dust / 170;
  return { total: Math.round(total), intake: Math.round(intake), exhaust: Math.round(exhaust) };
}

// load: 0 = idle desktop, 1 = full stress test
export function thermals(snap, load = 1) {
  const air = airflow(snap);
  const out = { cpu: AMBIENT, gpu: AMBIENT, caseRise: 0, cpuThrottle: 1, gpuThrottle: 1, shutdown: null, airflow: air };
  if (!snap.cpu) return out;
  const volt = snap.bios && snap.bios.volt === 'high' ? 1.3 : 1;
  const cpuHeat = snap.cpu.tdp * (0.18 + 0.82 * load) * volt;
  const gpuHeat = snap.gpu ? snap.gpu.tdp * (0.12 + 0.88 * load) : snap.cpu.igpu * 2;
  const caseRise = clamp((cpuHeat + gpuHeat) * 3 / Math.max(8, air.total), 0, 45);
  let cap = 6; // bare CPU lid, no cooler
  if (snap.cooler) {
    const mode = FAN_MODE[snap.fanMode] || FAN_MODE.standard;
    cap = snap.coolerOn ? snap.cooler.capacity * (0.85 + 0.15 * mode.flow) : snap.cooler.capacity * (snap.cooler.type === 'aio' ? 0.15 : 0.3);
    cap *= 1 - snap.dust / 220;
  }
  const paste = snap.cooler ? (PASTE_FACTOR[snap.paste] || 1) : 1;
  let cpu = AMBIENT + caseRise + (cpuHeat / cap) * 42 * paste;
  if (cpu > CPU_SHUTDOWN) out.shutdown = 'cpu';
  if (cpu > CPU_THROTTLE) out.cpuThrottle = clamp(1 - (cpu - CPU_THROTTLE) * 0.035, 0.35, 1);
  out.cpuRaw = Math.round(cpu);
  out.cpu = Math.round(Math.min(cpu, out.shutdown ? cpu : 100));
  let gpu = AMBIENT + (snap.gpu ? 14 + 26 * load : 6 * load) + caseRise * 1.3 + snap.dust * 0.2;
  if (snap.gpu && gpu > GPU_THROTTLE) out.gpuThrottle = clamp(1 - (gpu - GPU_THROTTLE) * 0.03, 0.4, 1);
  if (snap.gpu && gpu > 105) out.shutdown = out.shutdown || 'gpu';
  out.gpu = Math.round(gpu);
  out.caseRise = Math.round(caseRise);
  return out;
}

const dbSum = list => (list.length ? 10 * Math.log10(list.reduce((s, n) => s + 10 ** (n / 10), 0)) : 0);

export function noise(snap, load = 1) {
  if (!snap.cs) return 0;
  const mode = FAN_MODE[snap.fanMode] || FAN_MODE.standard;
  const src = [];
  const loadDb = -9 + 9 * load;
  for (const f of snap.fans) if (f.working) src.push(f.d.noise + mode.db + loadDb);
  if (snap.cooler && snap.coolerOn) src.push(snap.cooler.noise + mode.db + loadDb);
  if (snap.psu && snap.psuP.fault !== 'dead') src.push(snap.psu.noise + (load > 0.5 ? 0 : -5));
  for (const d of snap.drives) if (d.d.noise && d.alive) src.push(d.d.noise + (d.p.fault === 'failing' ? 6 : 0));
  if (snap.gpu) src.push(load > 0.5 ? 30 + snap.gpu.tdp / 30 : 20);
  const raw = dbSum(src.filter(n => n > 0));
  return Math.max(10, Math.round(raw - snap.cs.damping + (snap.closed ? 0 : 3)));
}

export function memSpeed(snap) {
  if (!snap.ram.length) return 0;
  const slowest = Math.min(...snap.ram.map(r => (snap.bios && snap.bios.xmp && snap.mb && snap.mb.oc ? r.d.mhz : r.d.base)));
  return slowest;
}

function memFactor(snap) {
  if (!snap.ram.length) return 0;
  const speed = memSpeed(snap);
  const ref = snap.ram[0].d.mem === 'DDR5' ? 6000 : 3600;
  let f = 0.9 + 0.1 * clamp(speed / ref, 0.5, 1.1);
  if (!dualChannel(snap)) f *= 0.86;
  const gb = snap.ram.reduce((s, r) => s + r.d.gb, 0);
  if (gb < 8) f *= 0.78; else if (gb < 16) f *= 0.95;
  return f;
}

export const channelOf = (zone, slots) => (slots === 4 ? Math.floor(+zone.slice(3) / 2) : +zone.slice(3));
export function dualChannel(snap) {
  if (!snap.mb) return false;
  return new Set(snap.ram.map(r => channelOf(r.z, snap.mb.ramSlots))).size >= 2;
}

export const ramGB = snap => snap.ram.reduce((s, r) => s + r.d.gb, 0);

// the drive the machine boots from (BIOS boot setting, else the first working drive with an OS)
export function bootDrive(snap) {
  const usable = snap.drives.filter(d => d.linked && d.alive);
  if (snap.bios && snap.bios.boot !== 'auto') return usable.find(d => d.p.uid === snap.bios.boot) || null;
  return usable.find(d => d.p.data && d.p.data.os) || usable[0] || null;
}

// deterministic ±2% wobble so reruns look alive without changing the verdict
const wobble = (seed, label) => 1 + (((hashStr(`${seed}${label}`) % 1000) / 1000) - 0.5) * 0.04;

export function performance(snap, opts = {}) {
  const t = thermals(snap, 1);
  const out = { cpuMark: 0, gpuMark: 0, storage: 0, memMHz: memSpeed(snap), ramGB: ramGB(snap), thermals: t };
  if (!snap.cpu || !snap.ram.length) return out;
  const drive = bootDrive(snap);
  const data = drive && drive.p.data;
  const os = data && data.os ? PART[data.os] : null;
  const malware = data ? data.malware : 0;
  const osF = os ? 1 - os.overhead : 1;
  const malF = 1 - 0.18 * malware;
  const mf = memFactor(snap);
  out.cpuMark = Math.round((snap.cpu.single * 35 + snap.cpu.multi * 5) * mf * t.cpuThrottle * osF * malF * (opts.seed ? wobble(opts.seed, 'c') : 1));
  const drivers = data ? data.drivers : false;
  if (snap.gpu && snap.gpuP.fault !== 'dead') {
    const bottleneck = clamp(out.cpuMark / (snap.gpu.perf * 110), 0.5, 1) ** 0.35;
    const pcie = snap.mb && snap.mb.pcie < 4 && snap.gpu.perf > 60 ? 0.94 : 1;
    out.gpuMark = Math.round(snap.gpu.perf * 100 * (drivers ? 1 : 0.12) * t.gpuThrottle * bottleneck * pcie * malF * (opts.seed ? wobble(opts.seed, 'g') : 1));
  } else if (snap.cpu.igpu) {
    out.gpuMark = Math.round(snap.cpu.igpu * 100 * mf * (drivers ? 1 : 0.5) * malF);
  }
  if (drive) out.storage = Math.round(drive.d.read * (drive.p.fault === 'failing' ? 0.25 : 1));
  return out;
}

// what the parts *should* score with everything healthy and set up: used by benchmark reports
// to tell the player whether a score is low for the hardware
export function expectedMarks(snap) {
  if (!snap.cpu) return { cpuMark: 0, gpuMark: 0 };
  const cpuMark = Math.round((snap.cpu.single * 35 + snap.cpu.multi * 5) * 0.985);
  const gpuMark = snap.gpu ? Math.round(snap.gpu.perf * 100 * clamp(cpuMark / (snap.gpu.perf * 110), 0.5, 1) ** 0.35) : snap.cpu.igpu * 100;
  return { cpuMark, gpuMark };
}

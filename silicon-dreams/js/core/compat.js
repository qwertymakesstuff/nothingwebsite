// Spec-level compatibility: given a set of part definitions (one per category, lists for memory,
// drives and fans), list every rule that is broken. Used by the planner in the store, by part
// inspection ("works with what's on the bench?") and as part of the pre-boot check.

import { powerBudget } from './sim.js';

const err = (code, msg, cats) => ({ level: 'error', code, msg, cats });
const warn = (code, msg, cats) => ({ level: 'warn', code, msg, cats });

export function analyzeSpec(spec) {
  const s = { ram: [], storage: [], fans: [], ...spec };
  const issues = [];
  const { case: cs, motherboard: mb, cpu, cooler, gpu, psu, os } = s;

  if (cpu && mb && cpu.socket !== mb.socket) issues.push(err('socket', `CPU socket ${cpu.socket} doesn't match the motherboard socket ${mb.socket}.`, ['cpu', 'motherboard']));
  if (mb) {
    for (const r of s.ram) if (r.mem !== mb.mem) { issues.push(err('memtype', `${r.full} is ${r.mem}; the motherboard only takes ${mb.mem}.`, ['ram', 'motherboard'])); break; }
    if (s.ram.length > mb.ramSlots) issues.push(err('ramslots', `${s.ram.length} memory sticks but only ${mb.ramSlots} DIMM slots.`, ['ram', 'motherboard']));
    const gb = s.ram.reduce((a, r) => a + r.gb, 0);
    if (gb > mb.maxRam) issues.push(err('rammax', `${gb} GB of memory exceeds the board's ${mb.maxRam} GB maximum.`, ['ram', 'motherboard']));
    if (s.ram.length === 1) issues.push(warn('single', 'A single memory stick runs in single-channel mode (slower). Use pairs.', ['ram']));
  }
  if (cs && mb && !cs.forms.includes(mb.form)) issues.push(err('form', `${mb.form} motherboard doesn't fit the case (takes ${cs.forms.join(', ')}).`, ['case', 'motherboard']));
  if (cs && gpu && gpu.length > cs.gpuMax) issues.push(err('gpulen', `Graphics card is ${gpu.length} mm; the case fits ${cs.gpuMax} mm.`, ['case', 'gpu']));
  if (cooler) {
    if (cpu && !cooler.sockets.includes(cpu.socket)) issues.push(err('coolersocket', `${cooler.full} has no bracket for ${cpu.socket}.`, ['cooler', 'cpu']));
    if (cs && cooler.type === 'air' && cooler.height > cs.coolerMax) issues.push(err('coolerheight', `Cooler is ${cooler.height} mm tall; the case allows ${cs.coolerMax} mm.`, ['cooler', 'case']));
    if (cs && cooler.type === 'aio' && cooler.radiator > cs.radiator) issues.push(err('radiator', cs.radiator ? `${cooler.radiator} mm radiator; the case mounts up to ${cs.radiator} mm.` : 'The case has no radiator mount.', ['cooler', 'case']));
    if (cpu && cooler.capacity < cpu.tdp * 0.75) issues.push(err('cooling', `${cooler.full} moves ${cooler.capacity} W; the CPU puts out ${cpu.tdp} W. It will overheat.`, ['cooler', 'cpu']));
    else if (cpu && cooler.capacity < cpu.tdp * 1.05) issues.push(warn('coolingweak', `Cooling is marginal (${cooler.capacity} W for a ${cpu.tdp} W CPU): expect high temperatures and throttling.`, ['cooler', 'cpu']));
  }
  if (cs && psu && psu.form !== cs.psuForm) issues.push(err('psuform', `The case takes ${cs.psuForm} power supplies; this one is ${psu.form}.`, ['psu', 'case']));
  if (psu) {
    const draw = powerBudget(s);
    if (draw > psu.watts) issues.push(err('power', `Peak draw is about ${draw} W; the ${psu.watts} W supply will shut down under load.`, ['psu']));
    else if (draw > psu.watts * 0.85) issues.push(warn('powertight', `Peak draw ~${draw} W is close to the ${psu.watts} W limit. Leave ~20% headroom.`, ['psu']));
    if (gpu && gpu.pins > psu.pcie) issues.push(err('pcie', `Graphics card needs ${gpu.pins} PCIe 8-pin cable${gpu.pins > 1 ? 's' : ''}; the PSU has ${psu.pcie}.`, ['psu', 'gpu']));
    const sata = s.storage.filter(d => d.iface === 'sata').length;
    if (sata > psu.sataPower) issues.push(err('satapower', `${sata} SATA drives but only ${psu.sataPower} SATA power plugs.`, ['psu', 'storage']));
  }
  const m2 = s.storage.filter(d => d.iface === 'm2').length;
  const sata = s.storage.filter(d => d.iface === 'sata');
  if (mb && m2 > mb.m2) issues.push(err('m2', mb.m2 ? `${m2} M.2 drives but the board has ${mb.m2} M.2 slot${mb.m2 > 1 ? 's' : ''}.` : 'This motherboard has no M.2 slot.', ['storage', 'motherboard']));
  if (mb && sata.length > mb.sata) issues.push(err('sataports', `${sata.length} SATA drives but only ${mb.sata} SATA ports.`, ['storage', 'motherboard']));
  if (cs) {
    const h = sata.filter(d => d.bay === '3.5').length, ss = sata.length - h;
    if (h > cs.bays35) issues.push(err('bays35', `${h} 3.5" drives but the case has ${cs.bays35} 3.5" bays.`, ['storage', 'case']));
    else if (ss > cs.bays25 + (cs.bays35 - h)) issues.push(err('bays25', 'Not enough drive mounts for all the SATA drives.', ['storage', 'case']));
    const mounts = cs.fans.front + cs.fans.rear + cs.fans.top - (cooler && cooler.type === 'aio' && cooler.radiator <= cs.radiator ? Math.ceil(cooler.radiator / 120) : 0);
    if (s.fans.length > mounts) issues.push(err('fanmounts', `${s.fans.length} case fans but only ${mounts} free fan mounts.`, ['fan', 'case']));
    if (s.fans.some(f => f.size === 140) && cs.id === 'case-boxwell-mini') issues.push(err('fansize', 'This case only mounts 120 mm fans.', ['fan', 'case']));
  }
  if (mb && s.fans.length + (cooler ? 1 : 0) > mb.fanHeaders) issues.push(warn('headers', `${s.fans.length + (cooler ? 1 : 0)} fans (cooler included) but only ${mb.fanHeaders} fan headers: some can't be plugged in.`, ['fan', 'motherboard']));
  if (cpu && !cpu.igpu && !gpu) issues.push(err('video', `The ${cpu.full} has no integrated graphics: add a graphics card or there's no picture.`, ['cpu', 'gpu']));
  if (os) {
    const gb = s.ram.reduce((a, r) => a + r.gb, 0);
    if (s.ram.length && gb < os.minRam) issues.push(err('osram', `${os.name} needs ${os.minRam} GB of memory; there's ${gb} GB.`, ['os', 'ram']));
    const big = Math.max(0, ...s.storage.map(d => d.gb));
    if (!s.storage.length) issues.push(err('osdrive', 'No drive to install the operating system on.', ['os', 'storage']));
    else if (big < os.minStorage) issues.push(err('osstorage', `${os.name} needs a ${os.minStorage} GB drive.`, ['os', 'storage']));
  }
  if (cs && cs.fans && s.fans.length === 0 && (cpu || gpu) && cs.airflow < 20) issues.push(warn('nofans', 'No case fans: hot air will build up inside.', ['fan']));
  return issues;
}

export const REQUIRED_CATS = ['case', 'motherboard', 'cpu', 'cooler', 'ram', 'storage', 'psu'];

export function missingParts(spec) {
  const m = [];
  for (const c of REQUIRED_CATS) {
    const v = spec[c];
    if (!v || (Array.isArray(v) && !v.length)) m.push(c);
  }
  if (spec.cpu && !spec.cpu.igpu && !spec.gpu) m.push('gpu');
  return m;
}

// does this single part work with what's already in the spec? (for inspection / store badges)
export function fitsWith(spec, d) {
  const s = { ram: [], storage: [], fans: [], ...spec };
  const cat = d.cat;
  const trial = { ...s };
  if (cat === 'ram') trial.ram = [...s.ram, d];
  else if (cat === 'storage') trial.storage = [...s.storage, d];
  else if (cat === 'fan') trial.fans = [...s.fans, d];
  else trial[cat === 'motherboard' ? 'motherboard' : cat] = d;
  const before = new Set(analyzeSpec(s).filter(i => i.level === 'error').map(i => i.msg));
  return analyzeSpec(trial).filter(i => i.level === 'error' && !before.has(i.msg) && i.cats.includes(cat));
}

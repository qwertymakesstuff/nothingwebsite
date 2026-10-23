// Diagnostic tools. Each one looks at the real state of the machine but only reports what that
// tool could plausibly notice, so the player has to pick the right tools and put the clues
// together. Results: { ok, reason, lines, evidence: [{ tag, text, level }] }.

import { PART } from '../data/catalog.js';
import { DUST_PROBLEM } from './config.js';
import { cableList, zoneLabel, PASTE_LABEL, fanZones } from './pc.js';
import { snapshot, thermals, power, airflow } from './sim.js';
import { powerOn } from './boot.js';

const ev = (tag, text, level = 'info') => ({ tag, text, level });

export function visualInspection(state, pc) {
  if (pc.closed) return { ok: false, reason: 'Take the side panel off to look inside.' };
  const snap = snapshot(state, pc);
  const e = [];
  const d = pc.dust;
  if (d >= 70) e.push(ev('dust', 'Thick grey felt of dust on the fans, heatsink fins and filters. Airflow must be badly restricted.', 'bad'));
  else if (d >= DUST_PROBLEM) e.push(ev('dust', 'A noticeable layer of dust on the heatsink and fan blades.', 'warn'));
  else if (d >= 15) e.push(ev('dust', 'Light dust, nothing serious.', 'info'));
  else e.push(ev('dust', 'Inside is clean.', 'good'));
  for (const c of cableList(state, pc)) {
    const st = pc.cables[c.key];
    if (st === 'loose') e.push(ev(`cable:${c.key}`, `The ${c.label.toLowerCase()} connector isn't fully latched — it wiggles.`, 'bad'));
    else if (!st && c.ok) e.push(ev(`cable:${c.key}`, `${c.label} is not plugged in.`, c.key.startsWith('fan:') ? 'warn' : 'bad'));
  }
  for (const z of Object.keys(pc.slots)) {
    const p = state.parts[pc.slots[z]], dd = PART[p.id];
    if (!p.sign) continue;
    const msg = {
      psu: 'A faint burnt-electronics smell comes from the power supply\'s vents.',
      motherboard: 'Two capacitors near the CPU socket have domed, bulging tops.',
      gpu: 'Discoloured brown patches on the back of the graphics card near the power connectors.',
      fan: `The ${zoneLabel(z).toLowerCase()} fan's blades are stiff to turn by hand.`,
      cooler: 'The cooler\'s fan is stiff and gritty when turned by hand.',
      storage: `The ${dd.name} rattles faintly when tilted.`,
      ram: `One memory stick (${zoneLabel(z)}) has a scuffed, slightly burnt contact pin.`,
    }[dd.cat];
    if (msg) e.push(ev(`sign:${z}`, msg, 'bad'));
  }
  if (!pc.slots.cooler && pc.slots.cpu) e.push(ev('paste', `Thermal paste on the CPU: ${PASTE_LABEL[pc.paste.state].toLowerCase()}.`, pc.paste.state === 'good' ? 'good' : 'warn'));
  else if (pc.slots.cooler) e.push(ev('paste', 'The paste can\'t be seen with the cooler on. Remove the cooler to check it.', 'info'));
  const fz = fanZones(state, pc);
  if (fz.length) {
    const ins = fz.filter(z => pc.fanDir[z] === 'in').length, outs = fz.length - ins;
    if (!outs && ins >= 2) e.push(ev('airflow', 'Every case fan is mounted blowing inward: nothing pushes the hot air out.', 'warn'));
    else if (!ins && outs >= 2) e.push(ev('airflow', 'Every case fan blows outward: no fresh air is drawn in through the front.', 'warn'));
  } else if (snap.cs) e.push(ev('airflow', 'There are no case fans at all.', 'warn'));
  return { ok: true, evidence: e };
}

// with the machine powered, what can you see? (fans that don't spin)
export function poweredObservation(state, pc) {
  const r = powerOn(state, pc);
  const e = [];
  if (r.stage === 'off') return { ok: true, boot: r, evidence: e };
  const snap = r.snap;
  if (snap.cooler && !snap.coolerOn) e.push(ev('coolerfan', snap.coolerP.fault ? 'The CPU cooler\'s fan doesn\'t spin even though it\'s plugged in.' : snap.fanMode === 'off' ? 'No fans spin at all, even the CPU cooler.' : 'The CPU cooler\'s fan isn\'t spinning.', 'bad'));
  for (const f of snap.fans) if (!f.working) e.push(ev(`fan:${f.z}`, `The ${zoneLabel(f.z).toLowerCase()} fan isn't spinning.`, 'warn'));
  return { ok: true, boot: r, evidence: e };
}

export function psuTest(state, pc) {
  const uid = pc.slots.psu;
  if (!uid) return { ok: false, reason: 'There\'s no power supply installed to test.' };
  const p = state.parts[uid], d = PART[p.id];
  const lines = [`Voltaic PSU tester — ${d.full}`];
  const e = [];
  if (p.fault === 'dead') {
    lines.push('+12V  0.00 V  ✗', '+5V   0.00 V  ✗', '+3.3V 0.00 V  ✗', 'PG    — no power-good signal');
    e.push(ev('psu', `PSU tester: the ${d.full} produces no output at all. It's dead.`, 'bad'));
  } else if (p.fault === 'unstable') {
    lines.push('+12V 11.21 V  ✗ (spec 11.40 – 12.60)', '+5V   4.93 V  ✓', '+3.3V 3.31 V  ✓', 'PG    480 ms  ✗ (slow)', 'Ripple: high');
    e.push(ev('psu', `PSU tester: the 12 V rail sags below spec and the power-good signal is slow. The ${d.full} is failing.`, 'bad'));
  } else {
    lines.push('+12V 12.04 V  ✓', '+5V   5.02 V  ✓', '+3.3V 3.30 V  ✓', 'PG    260 ms  ✓');
    e.push(ev('psu', `PSU tester: every rail on the ${d.full} is within spec. (The tester can't check full-load capacity.)`, 'good'));
  }
  return { ok: true, lines, evidence: e };
}

export function memTest(state, pc) {
  const r = powerOn(state, pc);
  if (!r.display) return { ok: false, reason: 'MemSweep needs the machine to reach POST with a picture. ' + (r.problems[0] ? r.problems[0].msg : '') };
  const lines = ['MemSweep 6.1 — testing all installed memory'];
  const e = [];
  let bad = 0;
  for (const x of r.snap.ram) {
    if (x.p.fault === 'errors') { bad++; lines.push(`${zoneLabel(x.z)}: ${x.d.full} — 1,${200 + (x.p.uid.length * 37) % 700} ERRORS ✗`); e.push(ev(`ram:${x.z}`, `MemSweep: the stick in ${zoneLabel(x.z)} (${x.d.name}) throws memory errors.`, 'bad')); }
    else lines.push(`${zoneLabel(x.z)}: ${x.d.full} — pass ✓`);
  }
  if (!bad) e.push(ev('ram', 'MemSweep: every memory stick passed.', 'good'));
  return { ok: true, lines, evidence: e, record: { key: 'memtest', ok: !bad } };
}

export function postCard(state, pc) {
  const r = powerOn(state, pc);
  const code = { off: null }[r.stage];
  const map = { nocpu: 'C0', cpudead: 'C0', cpu8: 'C0', cpu8loose: 'C1', mbdead: '00', noram: 'D0', ramall: 'D5', pcie: 'A2', gpudead: 'A2', novideo: 'A2', nocooler: 'E7', bootorder: 'B4', nodrive: 'B4', noos: 'B7', oscorrupt: 'AA' };
  if (r.stage === 'off') return { ok: false, reason: 'The card shows nothing: the board isn\'t getting power.' };
  const p = r.problems[0];
  const c = p ? map[p.code] || 'FF' : 'A0';
  const meaning = { C0: 'CPU not initialised', C1: 'CPU power unstable', '00': 'Board stuck before CPU init — motherboard fault', D0: 'No memory detected', D5: 'Memory failed training', A2: 'No video device', E7: 'CPU over-temperature', B4: 'No boot device', B7: 'Boot device has no OS', AA: 'Handed over to OS (OS crashed)', A0: 'POST complete', FF: 'Unknown' }[c];
  return { ok: true, lines: [`POST code: ${c}`, meaning], evidence: [ev('post', `POST card: code ${c} — ${meaning}.`, c === 'A0' ? 'good' : 'warn')] };
}

export function thermalCamera(state, pc) {
  const r = powerOn(state, pc);
  if (r.stage === 'off') return { ok: false, reason: 'The machine has to be running to see heat.' };
  const snap = r.snap;
  const t = thermals(snap, 0.6);
  const e = [];
  const lines = [`CPU area: ~${t.cpu}°C`, `Graphics: ~${t.gpu}°C`, `Inside the case: +${t.caseRise}°C over room`];
  if (snap.cooler && ['none', 'thin', 'dried', 'used'].includes(snap.paste) && t.cpu > 55) e.push(ev('paste', 'Thermal camera: the CPU is hot but the cooler\'s heatsink stays cool — heat isn\'t getting across. Bad thermal paste contact.', 'bad'));
  else if (snap.cooler && !snap.coolerOn && t.cpu > 70) e.push(ev('coolerfan', 'Thermal camera: the heatsink is hot all over — the cooler\'s fan isn\'t moving air.', 'bad'));
  if (t.caseRise > 14) e.push(ev('airflow', `Thermal camera: hot air is pooling inside the case (+${t.caseRise}°C). Airflow is poor.`, 'warn'));
  if (snap.psuP && snap.psuP.fault === 'unstable') e.push(ev('psu', 'Thermal camera: the power supply is unusually hot for the load.', 'warn'));
  if (!e.length) e.push(ev('thermal', `Thermal camera: heat spreads normally (CPU ~${t.cpu}°C at moderate load).`, 'good'));
  return { ok: true, lines, evidence: e };
}

// SysCheck (needs the OS running)
export function osDiagnostics(state, pc) {
  const r = powerOn(state, pc);
  if (!r.os) return { ok: false, reason: 'SysCheck runs inside the operating system, and it isn\'t booting. ' + (r.problems[0] ? r.problems[0].msg : '') };
  const snap = r.snap;
  const drive = state.parts[r.bootDrive];
  const data = drive.data;
  const lines = [`SysCheck — ${PART[data.os].name}`];
  const e = [];
  if (data.malware) {
    lines.push(`Startup items: ${3 + data.malware * 3} (${data.malware * 2} unsigned)`, 'Background CPU use at idle: ' + (12 + data.malware * 15) + '%');
    e.push(ev('malware', `SysCheck: unknown unsigned programs launch at startup and use ${12 + data.malware * 15}% CPU while idle. Looks like malware.`, 'bad'));
  } else lines.push('Startup items: normal');
  if (!data.drivers) { lines.push('Drivers: generic display & chipset drivers in use'); e.push(ev('drivers', 'SysCheck: graphics and chipset drivers are not installed.', 'warn')); }
  else lines.push('Drivers: up to date');
  const pw = power(snap);
  const unstable = pw.capacity < pw.peak || ['cpu8', 'atx24', ...Array.from({ length: 3 }, (_, i) => `pcie${i}`)].some(k => pc.cables[k] === 'loose');
  if (unstable) { lines.push('Event log: 14 × "unexpected power loss" (Kernel-Power)'); e.push(ev('events:power', 'SysCheck event log: many unexpected power losses — the machine has been cutting out without shutting down.', 'bad')); }
  if (snap.ram.some(x => x.p.fault === 'errors')) { lines.push('Event log: 6 × "memory management" crash dumps'); e.push(ev('events:ram', 'SysCheck event log: several crashes blamed on memory management.', 'bad')); }
  if (snap.gpuP && snap.gpuP.fault === 'artifacts') { lines.push('Event log: 9 × "display driver stopped responding"'); e.push(ev('events:gpu', 'SysCheck event log: the display driver keeps crashing and recovering.', 'bad')); }
  if (snap.drives.some(d => d.p.fault === 'failing')) { lines.push('Event log: disk reports bad blocks'); e.push(ev('events:disk', 'SysCheck event log: the disk has reported bad blocks.', 'bad')); }
  const t = thermals(snap, 1);
  if (t.cpuThrottle < 1 || t.shutdown) { lines.push('Event log: CPU thermal throttling events'); e.push(ev('events:thermal', 'SysCheck event log: the CPU has repeatedly throttled because of heat.', 'warn')); }
  if (snap.bios.boot !== 'auto') lines.push('Firmware boot device: fixed entry');
  if (!e.length) e.push(ev('os', 'SysCheck: the system looks healthy.', 'good'));
  return { ok: true, lines, evidence: e };
}

export function storageHealth(state, pc) {
  const r = powerOn(state, pc);
  if (!r.display) return { ok: false, reason: 'DiskDoctor needs the machine to reach POST with a picture.' };
  const lines = ['DiskDoctor — S.M.A.R.T. report'];
  const e = [];
  for (const d of r.snap.drives) {
    if (!d.linked) { lines.push(`${d.d.full}: not detected (cables)`); continue; }
    if (!d.alive) { lines.push(`${d.d.full}: not responding`); e.push(ev(`disk:${d.z}`, `DiskDoctor: the ${d.d.name} doesn't respond at all.`, 'bad')); continue; }
    const h = d.p.health;
    lines.push(`${d.d.full}: health ${h}% — ${h < 50 ? 'FAILING' : h < 80 ? 'worn' : 'good'}${h < 50 ? `, ${(100 - h) * 41} reallocated sectors` : ''}`);
    if (h < 50) e.push(ev(`disk:${d.z}`, `DiskDoctor: the ${d.d.name} is failing (health ${h}%, thousands of reallocated sectors). Back up its data and replace it.`, 'bad'));
  }
  if (!e.length) e.push(ev('disk', 'DiskDoctor: all detected drives are healthy.', 'good'));
  return { ok: true, lines, evidence: e, record: { key: 'storage', ok: !r.snap.drives.some(d => d.linked && (d.p.health < 50 || !d.alive)) } };
}

export function airflowSummary(snap) { return airflow(snap); }

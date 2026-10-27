// The tests a job can require: boot, benchmarks, temperatures and the stability run. Each one
// returns a report and a record that game.js stamps with the machine's fingerprint, so a test
// only counts for the exact hardware/software state it ran on.

import { PART } from '../data/catalog.js';
import { CPU_THROTTLE } from './config.js';
import { powerOn } from './boot.js';
import { snapshot, power, thermals, noise, performance, expectedMarks } from './sim.js';
import { hashStr } from './rng.js';

export const TEST_LABEL = { boot: 'Boots to the OS', stability: 'Stability test', cpuBench: 'CPU benchmark', gpuBench: 'GPU benchmark', temps: 'Temperature check', malware: 'Malware scan', storage: 'Storage health', memtest: 'Memory test' };

const needOS = (state, pc) => {
  const r = powerOn(state, pc);
  return r.os ? { r } : { err: { ok: false, reason: 'The machine has to boot into an operating system first. ' + (r.problems[0] ? r.problems[0].msg : '') } };
};

export function bootTest(state, pc) {
  const r = powerOn(state, pc);
  return { ok: true, boot: r, record: { key: 'boot', ok: r.os } };
}

// what goes wrong under sustained full load, in the order it would happen
function loadFailure(state, pc, snap, which) {
  const pw = power(snap);
  const t = thermals(snap, 1);
  const c = k => pc.cables[k];
  const peak = which === 'cpu' ? pw.peak - (snap.gpu ? snap.gpu.tdp * 0.85 : 0) : pw.peak;
  if (pw.capacity < peak) return { cause: 'power', msg: `The machine switched off without warning a few minutes in (drawing ~${peak} W).` };
  if (c('cpu8') === 'loose' || c('atx24') === 'loose') return { cause: 'cable', msg: 'The screen went black and the machine rebooted under load.' };
  if (which !== 'cpu' && [0, 1, 2].some(i => c(`pcie${i}`) === 'loose')) return { cause: 'cable', msg: 'The screen went black during the graphics load and the GPU fans spun up to max.' };
  if (t.shutdown === 'cpu') return { cause: 'thermal', msg: `The CPU hit ${t.cpuRaw}°C and the machine shut down to protect itself.` };
  if (t.shutdown === 'gpu' && which !== 'cpu') return { cause: 'thermal', msg: `The graphics card hit ${t.gpu}°C and the machine shut down.` };
  if (snap.ram.some(x => x.p.fault === 'errors')) return { cause: 'ram', msg: 'Crash: "MEMORY_PAGE_FAULT" stop screen after nine minutes.' };
  if (which !== 'cpu' && snap.gpuP && snap.gpuP.fault === 'artifacts') return { cause: 'gpu', msg: 'Coloured flickering blocks filled the screen, then the display driver crashed.' };
  if (snap.bios.volt === 'high') return { cause: 'volt', msg: 'Crash: "WHEA uncorrectable hardware error". The CPU voltage looks wrong.' };
  return null;
}

export function stabilityTest(state, pc) {
  const n = needOS(state, pc);
  if (n.err) return n.err;
  const snap = n.r.snap;
  const t = thermals(snap, 1), db = noise(snap, 1), pw = power(snap);
  const fail = loadFailure(state, pc, snap, 'all');
  const lines = ['StressRack — 30 minutes, CPU + GPU + memory'];
  lines.push(`Peak power: ~${pw.peak} W of ${snap.psu.watts} W`, `CPU: ${fail && fail.cause === 'thermal' ? t.cpuRaw : t.cpu}°C${t.cpuThrottle < 1 ? ' (throttling)' : ''}`, `GPU: ${t.gpu}°C`, `Noise: ${db} dB`);
  if (fail) lines.push(`FAILED: ${fail.msg}`); else lines.push('PASSED — no errors in 30 minutes.');
  const ev = fail ? [{ tag: `stab:${fail.cause}`, text: `Stability test failed: ${fail.msg}`, level: 'bad' }] : [{ tag: 'stab', text: `Stability test passed (CPU ${t.cpu}°C, GPU ${t.gpu}°C, ${db} dB).`, level: t.cpuThrottle < 1 ? 'warn' : 'good' }];
  if (!fail && t.cpuThrottle < 1) ev.push({ tag: 'throttle', text: `The CPU reached ${t.cpu}°C and throttled to protect itself.`, level: 'warn' });
  return { ok: true, lines, evidence: ev, record: { key: 'stability', ok: !fail, cpu: t.cpu, gpu: t.gpu, noise: db, watts: pw.peak, cause: fail ? fail.cause : null } };
}

export function cpuBench(state, pc) {
  const n = needOS(state, pc);
  if (n.err) return n.err;
  const snap = n.r.snap;
  const fail = loadFailure(state, pc, snap, 'cpu');
  if (fail) return { ok: true, lines: ['Blazemark CPU', `Benchmark aborted: ${fail.msg}`], evidence: [{ tag: `bench:${fail.cause}`, text: `CPU benchmark crashed: ${fail.msg}`, level: 'bad' }], record: { key: 'cpuBench', ok: false, score: 0 } };
  const p = performance(snap, { seed: hashStr(pc.uid + state.day) });
  const exp = expectedMarks(snap);
  const pct = Math.round(p.cpuMark / exp.cpuMark * 100);
  const lines = ['Blazemark CPU', `Score: ${p.cpuMark.toLocaleString('en-US')} CPU Mark`, `Typical for a ${snap.cpu.name}: ~${exp.cpuMark.toLocaleString('en-US')} (${pct}%)`, `Memory: ${p.memMHz} MT/s, ${p.ramGB} GB`, `Peak temperature: ${p.thermals.cpu}°C`];
  const ev = [];
  if (pct < 90) ev.push({ tag: 'cpulow', text: `CPU score is only ${pct}% of normal for this chip${p.thermals.cpu >= CPU_THROTTLE ? ' — it was throttling from heat' : ''}.`, level: 'warn' });
  else ev.push({ tag: 'cpuok', text: `CPU benchmark: ${p.cpuMark.toLocaleString('en-US')} (${pct}% of typical).`, level: 'good' });
  return { ok: true, lines, evidence: ev, record: { key: 'cpuBench', ok: true, score: p.cpuMark, pct } };
}

export function gpuBench(state, pc) {
  const n = needOS(state, pc);
  if (n.err) return n.err;
  const snap = n.r.snap;
  const fail = loadFailure(state, pc, snap, 'gpu');
  if (fail) return { ok: true, lines: ['Blazemark GPU', `Benchmark aborted: ${fail.msg}`], evidence: [{ tag: `bench:${fail.cause}`, text: `GPU benchmark crashed: ${fail.msg}`, level: 'bad' }], record: { key: 'gpuBench', ok: false, score: 0 } };
  const p = performance(snap, { seed: hashStr(pc.uid + state.day) });
  const exp = expectedMarks(snap);
  const drive = state.parts[n.r.bootDrive];
  const pct = exp.gpuMark ? Math.round(p.gpuMark / exp.gpuMark * 100) : 0;
  const name = snap.gpu ? snap.gpu.full : `${snap.cpu.name} integrated graphics`;
  const lines = ['Blazemark GPU', `Device: ${name}`, `Score: ${p.gpuMark.toLocaleString('en-US')} GPU Mark`, `Typical: ~${exp.gpuMark.toLocaleString('en-US')} (${pct}%)`, `GPU temperature: ${p.thermals.gpu}°C`];
  const ev = [];
  if (!drive.data.drivers) ev.push({ tag: 'drivers', text: 'GPU benchmark ran on the generic display driver — install drivers.', level: 'warn' });
  else if (pct < 90) ev.push({ tag: 'gpulow', text: `GPU score is only ${pct}% of normal.`, level: 'warn' });
  else ev.push({ tag: 'gpuok', text: `GPU benchmark: ${p.gpuMark.toLocaleString('en-US')} (${pct}% of typical).`, level: 'good' });
  return { ok: true, lines, evidence: ev, record: { key: 'gpuBench', ok: true, score: p.gpuMark, pct } };
}

export function tempCheck(state, pc) {
  const n = needOS(state, pc);
  if (n.err) return n.err;
  const snap = n.r.snap;
  const idle = thermals(snap, 0.05), load = thermals(snap, 0.7);
  const lines = ['TempEye', `CPU: idle ${idle.cpu}°C, load ${load.cpu}°C`, `GPU: idle ${idle.gpu}°C, load ${load.gpu}°C`, `Airflow: ${load.airflow.intake} in / ${load.airflow.exhaust} out`];
  lines.push(`CPU fan: ${snap.coolerOn ? (snap.fanMode === 'silent' ? '780' : snap.fanMode === 'performance' ? '1,850' : '1,240') + ' RPM' : '0 RPM'}`);
  for (const f of snap.fans) lines.push(`${f.z.replace('fan:', 'Fan ')}: ${f.working ? '1,100 RPM' : '0 RPM'}`);
  const ev = [];
  if (!snap.coolerOn && snap.cooler) ev.push({ tag: 'coolerfan', text: 'TempEye: the CPU fan reads 0 RPM.', level: 'bad' });
  if (snap.fanMode === 'off') ev.push({ tag: 'bios:fan', text: 'TempEye: every fan reads 0 RPM — the fan curve looks switched off in firmware.', level: 'bad' });
  if (idle.cpu > 55) ev.push({ tag: 'idlehot', text: `TempEye: the CPU idles at ${idle.cpu}°C — far too hot for doing nothing.`, level: 'bad' });
  if (load.cpu > 85) ev.push({ tag: 'loadhot', text: `TempEye: CPU reaches ${load.cpu}°C under moderate load.`, level: load.cpu > 92 ? 'bad' : 'warn' });
  if (load.gpu > 85) ev.push({ tag: 'gpuhot', text: `TempEye: GPU reaches ${load.gpu}°C.`, level: 'warn' });
  if (!ev.length) ev.push({ tag: 'temps', text: `TempEye: temperatures are normal (CPU ${idle.cpu}/${load.cpu}°C).`, level: 'good' });
  return { ok: true, lines, evidence: ev, record: { key: 'temps', ok: load.cpu <= 85 && load.gpu <= 85, idle: idle.cpu, load: load.cpu, gpu: load.gpu } };
}

export function osName(state, uid) { const p = state.parts[uid]; return p && p.data && p.data.os ? PART[p.data.os].name : null; }
export { snapshot };

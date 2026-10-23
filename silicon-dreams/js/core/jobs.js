// Customer jobs: generating offers, accepting, checking requirements, delivering, failing and
// cancelling. A job never trusts the player's word: requirements are checked against test
// results recorded on the machine's current fingerprint, and repairs are judged against the
// machine's real condition after it leaves.

import { PART } from '../data/catalog.js';
import { CUSTOMERS, CUSTOMER, PERSONALITIES } from '../data/customers.js';
import { TIERS, BUILDS, MACHINES, FAULT_DEFS, FILE_SETS } from '../data/jobs.js';
import { DIFFICULTIES, DUST_PROBLEM } from './config.js';
import { rngFor, pick, randInt, shuffle, weighted } from './rng.js';
import { assemble, fingerprint, cableList } from './pc.js';
import { snapshot, thermals, bootDrive } from './sim.js';
import { emptyData } from './parts.js';
import { TEST_LABEL } from './testing.js';
import { clamp } from './util.js';

export const KIND_LABEL = { repair: 'Repair', build: 'Custom build', upgrade: 'Upgrade', recovery: 'Data recovery', malware: 'Malware removal', thermal: 'Cooling fix', fleet: 'Fleet contract', contract: 'Repair contract' };
const TIER_MULT = [0, 1, 1.35, 1.75, 2.3, 3];
const FAULT_FEE = { psu_dead: 60, psu_unstable: 85, ram_errors: 70, disk_failing: 90, gpu_artifacts: 80, gpu_dead: 80, bios_boot: 50, bios_fan: 55, bios_volt: 65, malware: 70, os_corrupt: 80, cable_loose: 55, fan_unplugged: 45, dust: 50, paste_dried: 60, cooler_dead: 60, mb_dead: 160 };
const FAULT_TESTS = { disk_failing: ['storage'], malware: ['malware'], dust: ['temps'], paste_dried: ['temps'], cooler_dead: ['temps'], bios_fan: ['temps'], fan_unplugged: ['temps'], ram_errors: ['memtest'] };

export function unlockedTiers(state) {
  return TIERS.filter(t => state.level >= t.level && state.reputation >= t.rep && (!t.needs || state.upgrades[t.needs])).map(t => t.tier);
}

const firstName = c => (CUSTOMER[c].org ? CUSTOMER[c].name : CUSTOMER[c].name.split(' ')[0].replace('Dr.', 'Dr. ' + CUSTOMER[c].name.split(' ')[2]));
const fill = (s, c) => s.replace(/\{name\}/g, firstName(c));
const round10 = v => Math.round(v / 10) * 10;

function baseJob(state, rng, kind, tier, extra = {}) {
  const pool = CUSTOMERS.filter(c => c.tier === tier && !Object.values(state.jobs).some(j => j.customer === c.id && (j.status === 'active' || j.status === 'offered')));
  const cust = pick(rng, pool.length ? pool : CUSTOMERS.filter(c => c.tier <= tier));
  const id = `j${state.nextUid++}`;
  return { id, kind, tier, customer: cust.id, status: 'offered', offeredDay: state.day, expires: state.day + 2, machines: [], delivered: [], tests: [], req: {}, bonus: [], notes: [], ...extra };
}

function deadline(state, rng, lo, hi) {
  return state.day + Math.max(1, randInt(rng, lo, hi) + (DIFFICULTIES[state.difficulty] || DIFFICULTIES.standard).deadline);
}

function machineFor(rng, tier, filter) {
  const eras = tier <= 1 ? ['old', 'mid'] : tier === 2 ? ['old', 'mid'] : tier === 3 ? ['mid', 'new'] : ['new', 'mid'];
  const list = MACHINES.filter(m => eras.includes(m.era) && (!filter || filter(m)));
  return pick(rng, list.length ? list : MACHINES);
}

const hasGpu = m => !!m.spec.gpu;
function faultOk(f, m, chosen) {
  const d = FAULT_DEFS[f];
  if (d.needs && d.needs.includes('gpu') && !hasGpu(m)) return false;
  if (chosen.includes(f)) return false;
  // keep combinations diagnosable: total-power faults and boot blockers stand alone or with dust
  const solo = ['psu_dead', 'mb_dead', 'gpu_dead'];
  if (solo.includes(f) && chosen.some(c => c !== 'dust')) return false;
  if (chosen.some(c => solo.includes(c)) && f !== 'dust') return false;
  if ((f === 'bios_fan' && chosen.includes('cooler_dead')) || (f === 'cooler_dead' && chosen.includes('bios_fan'))) return false;
  if (f.startsWith('bios_') && chosen.some(c => c.startsWith('bios_'))) return false;
  return true;
}

function customerMachine(state, rng, job, m, opts = {}) {
  const files = shuffle(rng, FILE_SETS).slice(0, randInt(rng, 1, 2)).map(([label, gb]) => ({ label, gb, owner: job.id, pct: 100 }));
  const data = { ...emptyData(), os: m.os, osOk: true, drivers: true, files };
  const pc = assemble(state, m.spec, { owner: job.id, name: `${CUSTOMER[job.customer].name.split(' ')[0]}'s ${m.label}`, data, dust: opts.dust ?? randInt(rng, 5, 30), cond: randInt(rng, 60, 90) });
  if (m.bios) Object.assign(state.parts[pc.slots.mb].bios, m.bios);
  pc.job = job.id;
  pc.fileLabels = files.map(f => f.label);
  return pc;
}

export function applyFault(state, pc, f, rng) {
  const P = z => state.parts[pc.slots[z]];
  const ramZ = Object.keys(pc.slots).filter(z => z.startsWith('ram'));
  const driveZ = Object.keys(pc.slots).filter(z => z.startsWith('m2_') || z.startsWith('bay')).sort();
  const boot = bootDrive(snapshot(state, pc));
  switch (f) {
    case 'psu_dead': Object.assign(P('psu'), { fault: 'dead', sign: rng() < 0.6 }); break;
    case 'psu_unstable': Object.assign(P('psu'), { fault: 'unstable', sign: rng() < 0.25 }); break;
    case 'ram_errors': Object.assign(P(pick(rng, ramZ)), { fault: 'errors', sign: rng() < 0.15 }); break;
    case 'disk_failing': { const d = boot ? boot.p : P(driveZ[0]); Object.assign(d, { fault: 'failing', health: randInt(rng, 18, 45), sign: PART[d.id].kind === 'hdd' && rng() < 0.4 }); break; }
    case 'gpu_artifacts': Object.assign(P('gpu'), { fault: 'artifacts', sign: rng() < 0.4 }); break;
    case 'gpu_dead': Object.assign(P('gpu'), { fault: 'dead', sign: rng() < 0.4 }); break;
    case 'bios_boot': P('mb').bios.boot = 'p-missing'; break;
    case 'bios_fan': P('mb').bios.fan = 'off'; break;
    case 'bios_volt': P('mb').bios.volt = 'high'; break;
    case 'malware': (boot ? boot.p : P(driveZ[0])).data.malware = randInt(rng, 1, pc.job && state.jobs[pc.job] && state.jobs[pc.job].tier >= 2 ? 3 : 2); break;
    case 'os_corrupt': (boot ? boot.p : P(driveZ[0])).data.osOk = false; break;
    case 'cable_loose': { const opts = ['cpu8', 'atx24', ...(pc.slots.gpu && PART[P('gpu').id].pins ? ['pcie0'] : [])]; pc.cables[pick(rng, opts)] = 'loose'; break; }
    case 'fan_unplugged': delete pc.cables.cpufan; break;
    case 'dust': pc.dust = randInt(rng, 75, 95); break;
    case 'paste_dried': pc.paste = { state: 'dried', amount: 40 }; break;
    case 'cooler_dead': Object.assign(P('cooler'), { fault: 'dead', sign: rng() < 0.5 }); break;
    case 'mb_dead': Object.assign(P('mb'), { fault: 'dead', sign: rng() < 0.5 }); break;
  }
}

function testsForFaults(faults) {
  const t = new Set(['boot', 'stability']);
  for (const f of faults) for (const x of FAULT_TESTS[f] || []) t.add(x);
  return [...t];
}

function makeRepair(state, rng, tier, kind = 'repair') {
  const job = baseJob(state, rng, kind, tier);
  let faults = [];
  let m;
  if (kind === 'recovery') { m = machineFor(rng, tier, x => x.spec.storage.length >= 1); faults = ['disk_failing']; if (rng() < 0.4) faults.push('os_corrupt'); }
  else if (kind === 'malware') { m = machineFor(rng, tier); faults = ['malware']; }
  else if (kind === 'thermal') { m = machineFor(rng, Math.max(2, tier), x => x.spec.cpu !== 'cpu-arc-k3-6100'); faults = ['dust', 'paste_dried']; if (rng() < 0.5) faults.push(pick(rng, ['bios_fan', 'cooler_dead', 'fan_unplugged'])); }
  else {
    m = machineFor(rng, tier);
    const n = tier <= 1 ? (rng() < 0.7 ? 1 : 2) : tier === 2 ? randInt(rng, 1, 2) : randInt(rng, 2, 3);
    const pool = Object.keys(FAULT_DEFS).filter(f => FAULT_DEFS[f].tier <= tier);
    for (let i = 0; i < 20 && faults.length < n; i++) { const f = pick(rng, pool); if (faultOk(f, m, faults)) faults.push(f); }
  }
  const pc = customerMachine(state, rng, job, m);
  for (const f of faults) applyFault(state, pc, f, rng);
  job.machines = [pc.uid];
  job.faults = faults;
  job.machine = m.id;
  const symptoms = faults.filter(f => f !== 'dust' || faults.length === 1).map(f => pick(rng, FAULT_DEFS[f].symptom));
  if (faults.includes('dust') && faults.length > 1 && rng() < 0.5) symptoms.push('It\'s also got a lot louder lately.');
  job.title = kind === 'recovery' ? 'Rescue files from a dying drive' : kind === 'malware' ? 'Remove malware, keep my files' : kind === 'thermal' ? 'Workstation overheating' : `Fix ${pick(rng, ['my', 'our', 'a broken'])} ${m.label}`;
  job.story = symptoms.join(' ');
  const files = Object.values(state.parts).find(p => p.data && p.data.files.length && p.owner === job.id);
  if (kind === 'recovery') { job.story += ` My ${files.data.files.map(f => f.label.toLowerCase()).join(' and ')} are on it and I have no backup. Please save them!`; job.req.files = 90; }
  else if (kind === 'malware') { job.story += ` Whatever you do, don't wipe it — my ${files.data.files.map(f => f.label.toLowerCase()).join(' and ')} are on there.`; job.req.files = 100; }
  else if (kind === 'thermal') { job.story += ' It needs to run flat out without passing 80°C.'; job.req.maxTemp = 80; }
  else if (faults.some(f => ['os_corrupt', 'disk_failing'].includes(f))) { job.req.files = 100; job.story += ' Please keep my files.'; }
  job.req.healthy = true;
  const fee = faults.reduce((s, f) => s + FAULT_FEE[f], 0) * TIER_MULT[tier] + (kind === 'recovery' ? 60 : 0);
  job.fee = round10(fee);
  job.partsEstimate = estimateParts(state, pc, faults);
  job.budget = round10(job.fee * 1.35 + job.partsEstimate * 1.3 + 20);
  job.deadline = deadline(state, rng, 2, 4);
  job.tests = testsForFaults(faults);
  if (job.req.maxTemp) job.tests.push('temps');
  job.tests = [...new Set(job.tests)];
  job.bonus = [{ id: 'early', label: 'Done at least a day early', cash: round10(job.fee * 0.15) }];
  if (!faults.includes('dust')) job.bonus.push({ id: 'clean', label: 'Clean out the dust while it\'s open', cash: 20 });
  if (tier >= 2 && !job.req.maxTemp) job.bonus.push({ id: 'cool', label: 'CPU under 75°C in the stability test', cash: 25, temp: 75 });
  return job;
}

function estimateParts(state, pc, faults) {
  let s = 0;
  const price = z => (pc.slots[z] ? PART[state.parts[pc.slots[z]].id].price : 0);
  for (const f of faults) {
    if (f.startsWith('psu')) s += price('psu');
    else if (f === 'ram_errors') s += PART[state.parts[pc.slots.ram0].id].price;
    else if (f === 'disk_failing') s += 60;
    else if (f.startsWith('gpu')) s += price('gpu');
    else if (f === 'cooler_dead') s += 35;
    else if (f === 'mb_dead') s += price('mb');
    else if (f === 'paste_dried' || f === 'dust') s += 5;
  }
  return s;
}

function makeBuild(state, rng, tier) {
  const opts = BUILDS.filter(b => b.tier <= tier);
  const top = opts.filter(b => b.tier === tier);
  const b = top.length && rng() < 0.6 ? pick(rng, top) : pick(rng, opts);
  const job = baseJob(state, rng, 'build', tier);
  job.profile = b.id;
  job.title = b.title;
  job.story = pick(rng, b.text);
  job.req = { ...b.req };
  job.budget = round10(randInt(rng, b.budget[0], b.budget[1]));
  if (b.req.partsCap) job.req.partsCap = job.budget - 80;
  job.deadline = deadline(state, rng, b.days[0], b.days[1]);
  job.tests = ['boot', 'stability', 'cpuBench'];
  if (b.req.gpuMark) job.tests.push('gpuBench');
  if (b.req.maxTemp) job.tests.push('temps');
  job.highEnd = !!b.highEnd;
  job.bonus = [{ id: 'early', label: 'Delivered at least a day early', cash: round10(job.budget * 0.04) }];
  if (b.req.gpuMark) job.bonus.push({ id: 'perf', label: 'GPU Mark 20% above the requirement', cash: round10(job.budget * 0.05) });
  else job.bonus.push({ id: 'perf', label: 'CPU Mark 20% above the requirement', cash: round10(job.budget * 0.05) });
  if (!b.req.maxNoise) job.bonus.push({ id: 'quiet', label: 'Quieter than 32 dB under load', cash: 30, db: 32 });
  if (tier >= 2 && rng() < 0.4) job.bonus.push({ id: 'rgb', label: 'RGB lighting (Storm RGB fans)', cash: 25 });
  return job;
}

function makeUpgrade(state, rng, tier) {
  const job = baseJob(state, rng, 'upgrade', tier);
  const m = machineFor(rng, Math.min(tier, 2), x => ['family', 'old-gamer', 'budget-gamer', 'apu-box'].includes(x.id));
  const pc = customerMachine(state, rng, job, m, { dust: randInt(rng, 20, 50) });
  job.machines = [pc.uid];
  job.machine = m.id;
  const snap = snapshot(state, pc);
  const curGpu = snap.gpu ? snap.gpu.perf * 100 : snap.cpu.igpu * 100;
  const target = Math.max(3500, round10(curGpu * (1.8 + rng() * 0.6) / 100) * 100);
  job.req = { gpuMark: target, ramGB: 16, ssd: true, keep: ['case', 'motherboard', 'cpu'], files: 100, healthy: true };
  job.title = `Upgrade my ${m.label}`;
  job.story = `I can't afford a whole new computer. Keep the case, motherboard and processor, but make it play newer games — ${target.toLocaleString('en-US')} GPU Mark at least — with 16 GB of memory and a fast SSD to boot from. And don't lose my files!`;
  job.fee = round10(90 * TIER_MULT[tier]);
  job.partsEstimate = round10(target / 100 * 6 + 120);
  job.budget = round10(job.fee + job.partsEstimate * 1.3);
  job.deadline = deadline(state, rng, 3, 5);
  job.tests = ['boot', 'stability', 'gpuBench'];
  job.keepOld = rng() < 0.5;
  job.bonus = [{ id: 'early', label: 'Done at least a day early', cash: 25 }, { id: 'clean', label: 'Clean out the dust', cash: 20 }];
  return job;
}

function makeFleet(state, rng) {
  const job = baseJob(state, rng, 'fleet', 5);
  const b = BUILDS.find(x => x.id === 'office');
  job.count = randInt(rng, 3, 4);
  job.req = { ...b.req, os: 'lumen', identical: true };
  job.profile = 'office';
  job.title = `${job.count} identical office PCs`;
  job.story = `Our ${pick(rng, ['admin office', 'front desk', 'staff room', 'records team'])} needs ${job.count} matching office computers with Lumen OS, delivered together or one by one before the deadline. Every one must pass your stability test.`;
  job.budget = round10(randInt(rng, 680, 760)) * job.count;
  job.deadline = deadline(state, rng, 6, 8);
  job.tests = ['boot', 'stability', 'cpuBench'];
  job.bonus = [{ id: 'early', label: 'All delivered at least a day early', cash: round10(job.budget * 0.05) }];
  return job;
}

function makeContract(state, rng) {
  const job = baseJob(state, rng, 'contract', 5);
  const n = randInt(rng, 2, 3);
  job.faults = [];
  for (let i = 0; i < n; i++) {
    const m = machineFor(rng, 3);
    const pc = customerMachine(state, rng, job, m);
    const pool = Object.keys(FAULT_DEFS);
    const fs = [];
    for (let k = 0; k < 20 && fs.length < 2; k++) { const f = pick(rng, pool); if (faultOk(f, m, fs)) fs.push(f); }
    for (const f of fs) applyFault(state, pc, f, rng);
    pc.name = `${CUSTOMER[job.customer].name} machine ${i + 1}`;
    job.machines.push(pc.uid);
    job.faults.push(...fs);
  }
  job.title = `Service contract: ${n} faulty machines`;
  job.story = `${n} of our machines are misbehaving: ${[...new Set(job.faults)].slice(0, 4).map(f => FAULT_DEFS[f].symptom[0].replace(/\.$/, '').toLowerCase()).join('; ')}. Our records must survive.`;
  job.req = { healthy: true, files: 100 };
  job.fee = round10(job.faults.reduce((s, f) => s + FAULT_FEE[f], 0) * TIER_MULT[5]);
  job.partsEstimate = 0;
  for (const u of job.machines) job.partsEstimate += 150;
  job.budget = round10(job.fee * 1.3 + job.partsEstimate * 1.3);
  job.deadline = deadline(state, rng, 5, 7);
  job.tests = testsForFaults(job.faults);
  job.bonus = [{ id: 'early', label: 'All machines back a day early', cash: round10(job.fee * 0.1) }];
  return job;
}

export function makeJob(state, rng, tier, kind) {
  if (kind === 'build') return makeBuild(state, rng, tier);
  if (kind === 'upgrade') return makeUpgrade(state, rng, tier);
  if (kind === 'fleet') return makeFleet(state, rng);
  if (kind === 'contract') return makeContract(state, rng);
  return makeRepair(state, rng, tier, kind);
}

export function generateOffers(state) {
  const rng = rngFor(state.seed, 'offers', state.day);
  const tiers = unlockedTiers(state);
  const open = Object.values(state.jobs).filter(j => j.status === 'offered').length;
  const n = clamp(2 + (state.subs.ads ? 1 : 0) + Math.floor((state.level - 1) / 2), 2, 6) - Math.floor(open / 2);
  const made = [];
  for (let i = 0; i < n; i++) {
    const top = Math.max(...tiers);
    const tier = weighted(rng, tiers.map(t => [t, t === top ? 3 + (state.subs.ads ? 1 : 0) : t === top - 1 ? 2 : 1]));
    let kind;
    if (tier === 5) kind = rng() < 0.5 ? 'fleet' : 'contract';
    else kind = weighted(rng, [['repair', 40], ['build', 32], ['upgrade', tier >= 1 ? 9 : 0], ['recovery', 7], ['malware', 6], ['thermal', tier >= 2 ? 6 : 0]]);
    const job = makeJob(state, rng, tier, kind);
    state.jobs[job.id] = job;
    made.push(job);
  }
  return made;
}

// the first morning's offers: gentle and teach the basics
export function tutorialOffers(state) {
  const rng = rngFor(state.seed, 'tutorial');
  const a = baseJob(state, rng, 'repair', 1, { customer: 'marta' });
  a.customer = 'marta';
  const m = MACHINES.find(x => x.id === 'family');
  const pc = customerMachine(state, rng, a, m, { dust: 82 });
  pc.cables.atx24 = 'loose';
  a.machines = [pc.uid]; a.faults = ['cable_loose', 'dust']; a.machine = m.id;
  a.title = 'Computer cuts out and is noisy';
  a.story = 'Since I moved my desk it sometimes won\'t start, and when it does it\'s ever so loud. The grandchildren call on Sunday!';
  a.req = { healthy: true }; a.fee = 90; a.partsEstimate = 0; a.budget = 140; a.deadline = state.day + 3; a.tests = ['boot', 'stability', 'temps'];
  a.bonus = [{ id: 'early', label: 'Done at least a day early', cash: 15 }];
  a.expires = state.day + 3;
  const b = makeBuild(state, rngFor(state.seed, 'tutorial-build'), 1);
  const office = BUILDS.find(x => x.id === 'office');
  Object.assign(b, { profile: 'office', title: office.title, story: office.text[0], req: { ...office.req }, budget: 680, deadline: state.day + 4, tests: ['boot', 'stability', 'cpuBench'], customer: 'priya', expires: state.day + 3 });
  b.bonus = [{ id: 'early', label: 'Delivered at least a day early', cash: 25 }, { id: 'quiet', label: 'Quieter than 32 dB under load', cash: 30, db: 32 }];
  const c = makeRepair(state, rngFor(state.seed, 'tutorial-mal'), 1, 'malware');
  c.customer = 'gus'; c.expires = state.day + 3;
  for (const j of [a, b, c]) state.jobs[j.id] = j;
}

export const jobMachines = (state, job) => job.machines.map(u => state.pcs[u]).filter(Boolean);
export const customerOf = job => CUSTOMER[job.customer];
export const personalityOf = job => PERSONALITIES[CUSTOMER[job.customer].trait];

// ------- condition of a machine (truth, used after delivery and for the workshop's own checks)

export function healthIssues(state, pc) {
  const out = [];
  const snap = snapshot(state, pc);
  for (const z of Object.keys(pc.slots)) { const p = state.parts[pc.slots[z]]; if (p.fault) out.push({ code: `fault:${PART[p.id].cat}`, msg: `${PART[p.id].full} is faulty` }); }
  for (const c of cableList(state, pc)) if (c.ok && pc.cables[c.key] !== 'ok') out.push({ code: `cable:${c.key}`, msg: `${c.label} ${pc.cables[c.key] === 'loose' ? 'is loose' : 'is unplugged'}` });
  if (pc.slots.cooler && !['good', 'excess'].includes(pc.paste.state)) out.push({ code: 'paste', msg: 'Thermal paste is bad' });
  if (pc.dust >= DUST_PROBLEM) out.push({ code: 'dust', msg: 'Still full of dust' });
  if (snap.bios) {
    if (snap.bios.fan === 'off') out.push({ code: 'bios:fan', msg: 'Fans are off in the BIOS' });
    if (snap.bios.volt === 'high') out.push({ code: 'bios:volt', msg: 'CPU voltage still wrong' });
    if (snap.bios.boot !== 'auto' && !snap.drives.some(d => d.p.uid === snap.bios.boot)) out.push({ code: 'bios:boot', msg: 'Boot device setting is wrong' });
  }
  const bd = bootDrive(snap);
  if (!bd || !bd.p.data.os) out.push({ code: 'os', msg: 'No working operating system' });
  else {
    if (!bd.p.data.osOk) out.push({ code: 'os', msg: 'Operating system is corrupted' });
    if (bd.p.data.malware) out.push({ code: 'malware', msg: 'Still infected with malware' });
    if (!bd.p.data.drivers) out.push({ code: 'drivers', msg: 'Drivers aren\'t installed' });
  }
  const t = thermals(snap, 1);
  if (t.shutdown || t.cpuThrottle < 1) out.push({ code: 'heat', msg: 'Overheats under load' });
  return out;
}

// ------- requirement checks for delivery

const rec = (state, pc, key) => { const r = pc.tests[key]; return r && r.hash === fingerprint(state, pc) ? r : null; };

export function filesPct(state, job, pc) {
  const labels = pc.fileLabels || [];
  if (!labels.length) return 100;
  const best = {};
  for (const z of Object.keys(pc.slots)) {
    const p = state.parts[pc.slots[z]];
    if (!p.data || p.fault === 'dead') continue;
    for (const f of p.data.files) if (f.owner === job.id) best[f.label] = Math.max(best[f.label] || 0, f.pct ?? 100);
  }
  return Math.round(labels.reduce((s, l) => s + (best[l] || 0), 0) / labels.length);
}

export function shopPartsCost(state, pc) {
  let s = pc.licenseCost || 0;
  for (const u of Object.values(pc.slots)) { const p = state.parts[u]; if (p.owner === 'shop') s += p.cost; }
  if (pc.caseUid && state.parts[pc.caseUid].owner === 'shop') s += state.parts[pc.caseUid].cost;
  return s;
}

export function checkJob(state, job, pc) {
  const rows = [];
  const add = (label, ok, detail, kind = 'req') => rows.push({ label, ok: !!ok, detail, kind });
  const snap = snapshot(state, pc);
  const isCustomer = job.machines.includes(pc.uid);
  if (!isCustomer && job.kind !== 'build' && job.kind !== 'fleet') return { rows: [{ label: 'This isn\'t the customer\'s machine', ok: false, kind: 'req' }], canDeliver: false };
  if ((job.kind === 'build' || job.kind === 'fleet') && pc.owner !== 'shop') return { rows: [{ label: 'That machine belongs to a customer', ok: false, kind: 'req' }], canDeliver: false };
  add('Side panel closed', pc.closed, pc.closed ? '' : 'Close the case before handing it over.');
  for (const t of job.tests) {
    const r = rec(state, pc, t);
    add(`Test: ${TEST_LABEL[t]}`, r && r.ok, r ? (r.ok ? 'Passed on the current setup' : 'Failed — fix it and run again') : 'Not run since the last change', 'test');
  }
  const R = job.req;
  const cpuB = rec(state, pc, 'cpuBench'), gpuB = rec(state, pc, 'gpuBench'), stab = rec(state, pc, 'stability'), temps = rec(state, pc, 'temps');
  if (R.cpuMark) add(`CPU Mark ≥ ${R.cpuMark.toLocaleString('en-US')}`, cpuB && cpuB.score >= R.cpuMark, cpuB ? `Measured ${cpuB.score.toLocaleString('en-US')}` : 'Run the CPU benchmark');
  if (R.gpuMark) add(`GPU Mark ≥ ${R.gpuMark.toLocaleString('en-US')}`, gpuB && gpuB.score >= R.gpuMark, gpuB ? `Measured ${gpuB.score.toLocaleString('en-US')}` : 'Run the GPU benchmark');
  if (R.ramGB) { const gb = snap.ram.reduce((s, r) => s + r.d.gb, 0); add(`Memory ≥ ${R.ramGB} GB`, gb >= R.ramGB, `${gb} GB installed`); }
  const bd = bootDrive(snap);
  if (R.storageGB) add(`Boot drive ≥ ${R.storageGB >= 1000 ? R.storageGB / 1000 + ' TB' : R.storageGB + ' GB'}`, bd && bd.d.gb >= R.storageGB, bd ? `${bd.d.full}` : 'No boot drive');
  if (R.ssd) add('Boots from an SSD', bd && bd.d.kind !== 'hdd', bd ? (bd.d.kind === 'hdd' ? 'Boots from a hard disk' : bd.d.kind.toUpperCase()) : 'No boot drive');
  if (R.os) { const os = bd && bd.p.data.os ? PART[bd.p.data.os] : null; add(`Operating system: ${{ lumen: 'Lumen OS', harbor: 'Harbor OS Workstation', fernix: 'Fernix Linux' }[R.os]}`, os && os.family === R.os && !os.legacy, os ? os.name : 'None installed'); }
  if (R.maxTemp) { const t = temps ? temps.load : stab ? stab.cpu : null; const t2 = stab ? stab.cpu : null; const v = Math.max(t ?? 0, t2 ?? 0); add(`CPU ≤ ${R.maxTemp}°C under load`, (temps || stab) && v <= R.maxTemp, (temps || stab) ? `Peak ${v}°C` : 'Run the temperature check or stability test'); }
  if (R.maxNoise) add(`Noise ≤ ${R.maxNoise} dB under load`, stab && stab.noise <= R.maxNoise, stab ? `${stab.noise} dB in the stability test` : 'Run the stability test');
  if (R.form) add(`${R.form} motherboard`, snap.mb && snap.mb.form === R.form, snap.mb ? snap.mb.form : 'None');
  if (R.newOnly) { const used = Object.values(pc.slots).some(u => state.parts[u].used) || state.parts[pc.caseUid].used; add('New parts only', !used, used ? 'Contains second-hand parts' : 'All new'); }
  if (R.partsCap) { const c = shopPartsCost(state, pc); add(`Parts cost ≤ $${R.partsCap}`, c <= R.partsCap, `Parts cost $${c}`); }
  if (R.keep) for (const cat of R.keep) {
    const zone = cat === 'case' ? null : cat === 'motherboard' ? 'mb' : cat;
    const p = cat === 'case' ? state.parts[pc.caseUid] : pc.slots[zone] ? state.parts[pc.slots[zone]] : null;
    add(`Keeps the original ${cat === 'motherboard' ? 'motherboard' : cat === 'cpu' ? 'CPU' : cat}`, p && p.owner === job.id, p ? (p.owner === job.id ? 'Original' : 'Replaced') : 'Missing');
  }
  if (R.files) { const pct = filesPct(state, job, pc); add(`Personal files kept (≥ ${R.files}%)`, pct >= R.files, `${pct}% on this machine's drives`); }
  if (R.identical && job.delivered.length) {
    const first = job.deliveredSpec;
    const mine = specKey(state, pc);
    add('Same parts as the first machine delivered', !first || first === mine, first === mine ? 'Matches' : 'Different parts');
  }
  for (const b of job.bonus) rows.push({ label: b.label, ok: bonusMet(state, job, pc, b, { cpuB, gpuB, stab }), detail: `+$${b.cash}`, kind: 'bonus' });
  return { rows, canDeliver: rows.filter(r => r.kind !== 'bonus').every(r => r.ok) };
}

export function specKey(state, pc) {
  return Object.keys(pc.slots).filter(z => !z.startsWith('fan:')).sort().map(z => state.parts[pc.slots[z]].id).join(',') + '|' + state.parts[pc.caseUid].id;
}

function bonusMet(state, job, pc, b, r) {
  switch (b.id) {
    case 'early': return state.day <= job.deadline - 1;
    case 'clean': return pc.dust < 15;
    case 'cool': return r.stab && r.stab.cpu <= b.temp;
    case 'quiet': return r.stab && r.stab.noise <= b.db;
    case 'perf': return job.req.gpuMark ? r.gpuB && r.gpuB.score >= job.req.gpuMark * 1.2 : r.cpuB && r.cpuB.score >= job.req.cpuMark * 1.2;
    case 'rgb': return Object.keys(pc.slots).some(z => z.startsWith('fan:') && PART[state.parts[pc.slots[z]].id].rgb);
  }
  return false;
}

// ------- invoices and outcomes

export const usedPrice = (d, p) => (p.used ? Math.round(d.price * 0.6) : d.price);

// replacement parts in a customer machine, and whether the part they replaced was actually bad
export function invoiceLines(state, job, pc) {
  const lines = [];
  for (const z of Object.keys(pc.slots)) {
    const p = state.parts[pc.slots[z]];
    if (p.owner !== 'shop') continue;
    const d = PART[p.id];
    lines.push({ uid: p.uid, label: d.full, price: usedPrice(d, p), cost: p.cost, cat: d.cat, zone: z });
  }
  if (pc.licenseCost) lines.push({ uid: 'licence', label: 'Operating system licence', price: pc.licenseCost, cost: pc.licenseCost, cat: 'os' });
  return lines;
}

// customer parts that were taken out and not put back, and whether they were healthy
export function removedOriginals(state, job) {
  const inside = new Set();
  for (const u of job.machines) { const pc = state.pcs[u]; if (pc) { for (const x of Object.values(pc.slots)) inside.add(x); inside.add(pc.caseUid); } }
  return Object.values(state.parts).filter(p => p.owner === job.id && !inside.has(p.uid));
}

export function satisfaction(state, job, ctx) {
  const pers = personalityOf(job);
  let s = 72;
  const notes = [];
  const late = state.day > job.deadline;
  if (late) { s -= 22 * pers.lateSens; notes.push('late'); }
  else if (state.day <= job.deadline - 1) { s += 8; notes.push('early'); }
  if (ctx.bonusMet) s += 5 * ctx.bonusMet;
  if (ctx.perfMargin > 0) s += Math.min(10, ctx.perfMargin * 40) * pers.perf;
  if (ctx.unneededBilled) { s -= 14 * ctx.unneededBilled; notes.push('unneeded'); }
  if (ctx.fair > 0) {
    const ratio = ctx.invoice / ctx.fair;
    if (ratio > 1.02) { s -= (ratio - 1) * 90 * pers.priceSens; notes.push('pricey'); }
    else if (ratio < 0.98) { s += Math.min(10, (1 - ratio) * 30); notes.push('cheap'); }
  }
  if (ctx.overBudget > 0) { s -= 20; notes.push('overbudget'); }
  if (ctx.issues && ctx.issues.length) { s -= 30 + 8 * ctx.issues.length; notes.push('comeback'); }
  return { score: Math.round(clamp(s, 0, 100)), notes };
}

export const stars = s => (s >= 90 ? 5 : s >= 75 ? 4 : s >= 55 ? 3 : s >= 35 ? 2 : 1);
export const repDelta = s => Math.round((s - 55) / 9);

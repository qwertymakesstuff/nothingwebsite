// The game controller: the only thing the interface talks to. Every player action goes through
// here, which checks the clock, spends workshop time, records evidence and test results, books
// money, writes the activity log and autosaves. Actions return { ok, reason, ... } and never throw
// for ordinary mistakes.

import { PART } from '../data/catalog.js';
import { TOOL, SUBSCRIPTION, SUBSCRIPTIONS } from '../data/tools.js';
import { CUSTOMER, PERSONALITIES } from '../data/customers.js';
import { DAY_START, DAY_END, TIME, RENT_EVERY, DIFFICULTIES } from './config.js';
import * as PC from './pc.js';
import * as D from './diag.js';
import * as SW from './software.js';
import * as T from './testing.js';
import * as J from './jobs.js';
import * as E from './economy.js';
import * as B from './business.js';
import { powerOn, preflight } from './boot.js';
import { newGame } from './state.js';
import { saveGame } from './save.js';
import { clock, money } from './util.js';

const fail = reason => ({ ok: false, reason });

export class Game {
  constructor(state, opts = {}) {
    this.state = state;
    this.storage = opts.storage || null;
    this.listeners = new Set();
    this.autosave = opts.autosave !== false;
  }

  static fresh(opts, gameOpts) { return new Game(newGame(opts), gameOpts); }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, data) { for (const fn of this.listeners) fn(type, data); }

  changed(kind = 'state') {
    if (this.autosave && this.storage) saveGame(this.storage, this.state);
    this.emit('change', kind);
  }
  save() { return this.storage ? saveGame(this.storage, this.state) : { ok: false }; }

  log(text, level = 'info') {
    const s = this.state;
    s.log.push({ day: s.day, t: s.minute, text, level });
    if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
    this.emit('log', { text, level });
  }

  // ---------- time
  timeLeft() { return DAY_END - this.state.minute; }
  minutes(base, kind) { return Math.max(1, Math.round(base * B.timeFactor(this.state, kind))); }
  canSpend(m) { return m <= this.timeLeft() ? { ok: true } : fail(`That takes ${m} min and the shop closes at ${clock(DAY_END)} (${this.timeLeft()} min left). End the day to carry on tomorrow.`); }
  spend(m) { this.state.minute = Math.min(DAY_END, this.state.minute + m); }

  // run a timed action: check time, run fn, spend time if it worked
  timed(m, fn) {
    const c = this.canSpend(m);
    if (!c.ok) return c;
    const r = fn();
    if (r && r.ok) { this.spend(m); r.minutes = m; }
    return r;
  }

  // ---------- lookups
  pc(uid) { return this.state.pcs[uid] || null; }
  jobOf(pc) { return pc && pc.job ? this.state.jobs[pc.job] : null; }
  benchOf(uid) { return this.state.benches.indexOf(uid); }
  location(uid) { const b = this.benchOf(uid); return b >= 0 ? `bench ${b + 1}` : this.state.intake.includes(uid) ? 'intake rack' : 'away'; }

  // ---------- benches & machines
  placeCase(bench, caseUid) {
    const s = this.state;
    if (bench < 0 || bench >= s.benches.length) return fail('No such bench.');
    if (s.benches[bench]) return fail('That bench is occupied.');
    const p = s.parts[caseUid];
    if (!p || PART[p.id].cat !== 'case' || !s.inventory.includes(caseUid)) return fail('Pick an empty case from your shelves.');
    if (p.owner !== 'shop') return fail('That case belongs to a customer.');
    return this.timed(this.minutes(TIME.install.case, 'install'), () => {
      s.inventory = s.inventory.filter(u => u !== caseUid);
      const pc = PC.newPC(s, caseUid, { name: `Build #${Object.keys(s.pcs).length + 1}` });
      s.benches[bench] = pc.uid;
      this.log(`Started a new build in a ${PART[p.id].full} on bench ${bench + 1}.`);
      this.changed('bench');
      return { ok: true, pc: pc.uid };
    });
  }

  toBench(pcUid, bench) {
    const s = this.state;
    if (!s.pcs[pcUid]) return fail('No such machine.');
    if (bench < 0 || bench >= s.benches.length) return fail('No such bench.');
    if (s.benches[bench] === pcUid) return { ok: true };
    if (s.benches[bench]) return fail(`Bench ${bench + 1} is occupied. Move that machine to the intake rack first.`);
    const was = s.benches.indexOf(pcUid);
    if (was >= 0) s.benches[was] = null;
    s.intake = s.intake.filter(u => u !== pcUid);
    s.benches[bench] = pcUid;
    this.changed('bench');
    return { ok: true };
  }

  toRack(pcUid) {
    const s = this.state;
    if (!s.pcs[pcUid]) return fail('No such machine.');
    if (s.intake.includes(pcUid)) return { ok: true };
    if (s.intake.length >= B.intakeCap(s)) return fail(`The intake rack is full (${B.intakeCap(s)} machines).`);
    const b = s.benches.indexOf(pcUid);
    if (b >= 0) s.benches[b] = null;
    s.intake.push(pcUid);
    this.changed('bench');
    return { ok: true };
  }

  // take an empty shop build apart: the case goes back on the shelf
  scrapBuild(pcUid) {
    const s = this.state, pc = s.pcs[pcUid];
    if (!pc) return fail('No such machine.');
    if (pc.owner !== 'shop') return fail('Customer machines go back to the customer, not on your shelf.');
    if (Object.keys(pc.slots).length) return fail('Remove every part first.');
    delete s.pcs[pcUid];
    s.benches = s.benches.map(u => (u === pcUid ? null : u));
    s.intake = s.intake.filter(u => u !== pcUid);
    s.inventory.push(pc.caseUid);
    this.log('Put the empty case back on the shelf.');
    this.changed('bench');
    return { ok: true };
  }

  renamePC(pcUid, name) { const pc = this.pc(pcUid); if (!pc || pc.owner !== 'shop') return fail('Can\'t rename that.'); pc.name = String(name).slice(0, 40) || pc.name; this.changed(); return { ok: true }; }

  // ---------- hands-on assembly
  install(pcUid, partUid, zone, rot = 0) {
    const s = this.state, pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    const p = s.parts[partUid];
    if (!p) return fail('That part is gone.');
    if (!s.inventory.includes(partUid)) return fail('That part isn\'t on your shelf.');
    if (p.owner !== 'shop' && p.owner !== pc.job) return fail('That part belongs to a different customer.');
    const check = PC.canInstall(s, pc, partUid, zone, rot);
    if (!check.ok) return check;
    const d = PART[p.id];
    return this.timed(this.minutes(TIME.install[d.cat] || 5, 'install'), () => {
      const r = PC.install(s, pc, partUid, zone, rot);
      if (r.ok) {
        this.log(`Installed ${d.full} in the ${PC.zoneLabel(zone).toLowerCase()}.`);
        for (const n of r.notes || []) this.log(n, 'warn');
        this.changed('pc');
      }
      return r;
    });
  }

  remove(pcUid, zone) {
    const s = this.state, pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    const c = PC.canRemove(s, pc, zone);
    if (!c.ok) return c;
    const d = PC.at(s, pc, zone);
    return this.timed(this.minutes((TIME.install[d.cat] || 5) * TIME.removeFactor, 'install'), () => {
      const r = PC.remove(s, pc, zone);
      if (r.ok) { this.log(`Removed ${d.full}.`); this.changed('pc'); }
      return r;
    });
  }

  connect(pcUid, key) {
    const s = this.state, pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    const was = pc.cables[key];
    if (was === 'ok') return fail('It\'s already firmly connected.');
    return this.timed(this.minutes(TIME.cable, 'install'), () => {
      const r = PC.connect(s, pc, key);
      if (r.ok) { this.log(was === 'loose' ? 'Reseated a loose connector until it clicked.' : `Connected: ${PC.cableList(s, pc).find(c => c.key === key).label}.`); this.changed('pc'); }
      return r;
    });
  }

  disconnect(pcUid, key) {
    const pc = this.pc(pcUid);
    if (!pc || !pc.cables[key]) return fail('Not connected.');
    return this.timed(1, () => { const r = PC.disconnect(this.state, pc, key); if (r.ok) this.changed('pc'); return r; });
  }

  applyPaste(pcUid, amount) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    return this.timed(this.minutes(TIME.paste, 'install'), () => {
      const r = PC.applyPaste(this.state, pc, amount);
      if (r.ok) { this.log(`Applied thermal paste: ${PC.PASTE_LABEL[r.state].toLowerCase()}.`, r.state === 'good' ? 'good' : 'warn'); this.changed('pc'); }
      return r;
    });
  }

  cleanPaste(pcUid) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    return this.timed(this.minutes(TIME.cleanPaste, 'install'), () => { const r = PC.cleanPaste(this.state, pc); if (r.ok) { this.log('Wiped the old thermal paste off the CPU.'); this.changed('pc'); } return r; });
  }

  blowDust(pcUid) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    return this.timed(this.minutes(TIME.dust, 'install'), () => { const r = PC.blowDust(this.state, pc); if (r.ok) { this.log(`Blew the dust out with compressed air (dust now ${pc.dust}%).`); this.changed('pc'); } return r; });
  }

  setClosed(pcUid, closed) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    if (pc.closed === closed) return { ok: true };
    return this.timed(TIME.caseToggle, () => { const r = PC.setClosed(this.state, pc, closed); if (r.ok) this.changed('pc'); return r; });
  }

  preflight(pcUid) { const pc = this.pc(pcUid); return pc ? preflight(this.state, pc) : []; }

  // ---------- power, diagnostics, tests
  addEvidence(pc, list) {
    for (const e of list || []) {
      pc.evidence = pc.evidence.filter(x => x.tag !== e.tag);
      pc.evidence.push({ ...e, day: this.state.day });
    }
    if (pc.evidence.length > 80) pc.evidence.splice(0, pc.evidence.length - 80);
  }

  record(pc, rec) {
    if (!rec) return;
    pc.tests[rec.key] = { ...rec, hash: PC.fingerprint(this.state, pc), day: this.state.day };
    delete pc.tests[rec.key].key;
  }

  powerOn(pcUid) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    return this.timed(TIME.power, () => {
      const o = D.poweredObservation(this.state, pc);
      const r = o.boot;
      const ev = [...o.evidence];
      if (r.problems[0]) ev.push({ tag: 'boot', text: `Power on: ${r.problems[0].msg}`, level: 'bad' });
      else ev.push({ tag: 'boot', text: 'Power on: boots to the desktop.', level: 'good' });
      for (const w of r.warnings) ev.push({ tag: `bootw:${w.code}`, text: `Power on: ${w.msg}`, level: 'warn' });
      this.addEvidence(pc, ev);
      this.record(pc, { key: 'boot', ok: r.os });
      this.state.stats.boots = (this.state.stats.boots || 0) + 1;
      this.changed('pc');
      return { ok: true, boot: r, evidence: ev };
    });
  }

  // tools: id → [minutes, kind, function, required tool]
  toolSpec(id) {
    const s = this.state;
    const map = {
      visual: [TIME.visual, 'visual', pc => D.visualInspection(s, pc), 'flashlight'],
      psu: [TIME.psuTest, 'install', pc => D.psuTest(s, pc), 'psutester'],
      memtest: [s.tools.memsweep_pro ? 15 : TIME.memtest, 'test', pc => D.memTest(s, pc), 'memsweep'],
      postcard: [TIME.postCard, 'test', pc => D.postCard(s, pc), 'postcard'],
      thermalcam: [TIME.thermalCam, 'test', pc => D.thermalCamera(s, pc), 'thermalcam'],
      syscheck: [TIME.osDiag, 'test', pc => D.osDiagnostics(s, pc), 'syscheck'],
      storage: [TIME.storageHealth, 'test', pc => D.storageHealth(s, pc), 'diskdoctor'],
      temps: [TIME.temps, 'test', pc => T.tempCheck(s, pc), 'tempeye'],
      cpuBench: [TIME.cpuBench, 'test', pc => T.cpuBench(s, pc), 'blazemark'],
      gpuBench: [TIME.gpuBench, 'test', pc => T.gpuBench(s, pc), 'blazemark'],
      stability: [TIME.stability, 'test', pc => T.stabilityTest(s, pc), 'stressrack'],
      malware: [TIME.malware, 'test', pc => SW.malwareScan(s, pc, !!s.tools.clampro), 'clamshield'],
    };
    return map[id] || null;
  }

  runTool(pcUid, id) {
    const s = this.state, pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    const spec = this.toolSpec(id);
    if (!spec) return fail('Unknown tool.');
    const [base, kind, fn, need] = spec;
    if (need && !s.tools[need]) return fail(`You need the ${TOOL[need].name}. Buy it in the Parts Store (Tools).`);
    if (id !== 'visual' && id !== 'psu' && !pc.closed && ['stability', 'cpuBench', 'gpuBench', 'temps'].includes(id)) {
      // allowed, but airflow is worse with the panel off
    }
    const m = this.minutes(base, kind);
    const c = this.canSpend(m);
    if (!c.ok) return c;
    const r = fn(pc);
    if (!r.ok) return r;
    this.spend(m);
    r.minutes = m;
    this.addEvidence(pc, r.evidence);
    this.record(pc, r.record);
    if (['temps', 'cpuBench', 'gpuBench', 'stability', 'malware', 'syscheck'].includes(id)) {
      // these only run inside a booted OS, so the machine demonstrably boots
      this.record(pc, { key: 'boot', ok: true });
      this.addEvidence(pc, [{ tag: 'boot', text: 'Power on: boots to the desktop.', level: 'good' }]);
    }
    this.log(`${toolName(id)} on ${pc.name}: ${(r.evidence && r.evidence[0] ? r.evidence[0].text : 'done')}`, r.evidence && r.evidence.some(e => e.level === 'bad') ? 'bad' : 'info');
    this.changed('pc');
    return r;
  }

  // firmware & software
  bios(pcUid) { const pc = this.pc(pcUid); return pc ? SW.biosView(this.state, pc) : fail('No machine.'); }
  setBios(pcUid, key, value) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    return this.timed(TIME.bios, () => { const r = SW.setBios(this.state, pc, key, value); if (r.ok) { this.log(`BIOS: ${key} set to ${value}.`); for (const n of r.notes) this.log(n, 'warn'); this.changed('pc'); } return r; });
  }
  resetBios(pcUid) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    return this.timed(TIME.bios, () => { const r = SW.resetBios(this.state, pc); if (r.ok) { this.log(r.notes[0]); this.changed('pc'); } return r; });
  }
  installOS(pcUid, osId, driveUid) {
    const pc = this.pc(pcUid);
    if (!pc) return fail('No machine.');
    const c = SW.canInstallOS(this.state, pc, osId, driveUid);
    if (!c.ok) return c;
    return this.timed(this.minutes(TIME.osInstall, 'test'), () => {
      const r = SW.installOS(this.state, pc, osId, driveUid);
      if (r.ok) { pc.licenseCost = (pc.licenseCost || 0) + PART[osId].price; for (const n of r.notes) this.log(n, /erased/.test(n) ? 'warn' : 'info'); this.changed('pc'); }
      return r;
    });
  }
  repairOS(pcUid) { const pc = this.pc(pcUid); if (!pc) return fail('No machine.'); return this.timed(this.minutes(TIME.osRepair, 'test'), () => { const r = SW.repairOS(this.state, pc); if (r.ok) { this.log(r.notes[0], 'good'); this.changed('pc'); } return r; }); }
  installDrivers(pcUid) { const pc = this.pc(pcUid); if (!pc) return fail('No machine.'); return this.timed(this.minutes(TIME.drivers, 'test'), () => { const r = SW.installDrivers(this.state, pc); if (r.ok) { this.log(r.notes[0]); this.changed('pc'); } return r; }); }
  formatDrive(pcUid, driveUid) { const pc = this.pc(pcUid); if (!pc) return fail('No machine.'); return this.timed(this.minutes(TIME.format, 'test'), () => { const r = SW.formatDrive(this.state, pc, driveUid); if (r.ok) { this.log(r.notes[0], r.lost.length ? 'warn' : 'info'); this.changed('pc'); } return r; }); }
  recoverFiles(fromUid, toUid) {
    if (!this.state.tools.datarescue && !this.state.tools.datarescue_pro) return fail('You need the DataRescue dock (Parts Store → Tools).');
    return this.timed(this.minutes(TIME.recover, 'test'), () => { const r = SW.recoverFiles(this.state, fromUid, toUid, !!this.state.tools.datarescue_pro); if (r.ok) { for (const n of r.notes) this.log(n, r.frac < 1 ? 'warn' : 'good'); this.changed('pc'); } return r; });
  }

  // ---------- store
  buy(id, qty = 1, express = false) {
    const r = E.buy(this.state, id, qty, express);
    if (r.ok) { this.log(r.arrived ? `Bought ${qty} × ${PART[id].full}.` : `Ordered ${qty} × ${PART[id].full}; arrives ${r.days === 1 ? 'tomorrow' : `in ${r.days} days`}.`); this.changed('money'); }
    return r;
  }
  cancelOrder(id) { const r = E.cancelOrder(this.state, id); if (r.ok) { this.log('Cancelled an order (refunded).'); this.changed('money'); } return r; }
  sell(uid) { const name = PART[this.state.parts[uid]?.id]?.full; const r = E.sell(this.state, uid); if (r.ok) { this.log(`Sold ${name} for ${money(r.value)}.`); this.changed('money'); } return r; }
  buyBargain(key) { const r = E.buyBargain(this.state, key); if (r.ok) { this.log(`Bought a second-hand ${PART[this.state.parts[r.uid].id].full}.`); this.changed('money'); } return r; }
  buyTool(id) { const r = E.buyTool(this.state, id); if (r.ok) { this.log(`Bought ${TOOL[id].name}.`, 'good'); this.changed('money'); } return r; }
  buySupply(id, qty) { const r = E.buySupply(this.state, id, qty); if (r.ok) this.changed('money'); return r; }
  buyUpgrade(id) { const r = E.buyUpgrade(this.state, id); if (r.ok) { this.log(`Workshop upgrade: ${id}.`, 'good'); this.changed('money'); } return r; }
  setSub(id, on) { if (!SUBSCRIPTION[id]) return fail('Unknown.'); if (on) this.state.subs[id] = true; else delete this.state.subs[id]; this.log(`${SUBSCRIPTION[id].name} ${on ? 'started' : 'cancelled'}.`); this.changed('money'); return { ok: true }; }

  // ---------- jobs
  canAccept(jobId) {
    const s = this.state, j = s.jobs[jobId];
    if (!j || j.status !== 'offered') return fail('That offer is no longer available.');
    const need = j.machines.length;
    if (need && s.intake.length + need > B.intakeCap(s)) return fail(`No room on the intake rack for ${need === 1 ? 'the machine' : `${need} machines`} (${B.intakeCap(s) - s.intake.length} free).`);
    const active = Object.values(s.jobs).filter(x => x.status === 'active').length;
    if (active >= 4 + s.level) return fail('You already have as many active jobs as you can handle.');
    return { ok: true };
  }
  accept(jobId) {
    const c = this.canAccept(jobId);
    if (!c.ok) return c;
    const s = this.state, j = s.jobs[jobId];
    j.status = 'active';
    j.acceptedDay = s.day;
    for (const u of j.machines) s.intake.push(u);
    this.log(`Accepted: ${j.title} for ${CUSTOMER[j.customer].name}.`, 'good');
    this.changed('jobs');
    return { ok: true };
  }
  decline(jobId) {
    const s = this.state, j = s.jobs[jobId];
    if (!j || j.status !== 'offered') return fail('Not an open offer.');
    j.status = 'declined';
    this.discardMachines(j);
    this.changed('jobs');
    return { ok: true };
  }

  // the customer takes their machine(s) back unfinished: your parts come out, theirs go home
  releaseMachines(job) {
    const s = this.state;
    for (const u of job.machines) {
      const pc = s.pcs[u];
      if (!pc) continue;
      for (const z of Object.keys(pc.slots)) { const p = s.parts[pc.slots[z]]; if (p.owner === 'shop') s.inventory.push(p.uid); else delete s.parts[p.uid]; }
      delete s.parts[pc.caseUid];
      delete s.pcs[u];
      s.benches = s.benches.map(b => (b === u ? null : b));
      s.intake = s.intake.filter(b => b !== u);
    }
    for (const p of Object.values(s.parts)) if (p.owner === job.id) { delete s.parts[p.uid]; s.inventory = s.inventory.filter(x => x !== p.uid); }
  }
  discardMachines(job) {
    const s = this.state;
    for (const u of job.machines) { const pc = s.pcs[u]; if (!pc) continue; for (const x of Object.values(pc.slots)) delete s.parts[x]; delete s.parts[pc.caseUid]; delete s.pcs[u]; }
  }

  cancel(jobId) {
    const s = this.state, j = s.jobs[jobId];
    if (!j || j.status !== 'active') return fail('Not an active job.');
    j.status = 'cancelled';
    j.closedDay = s.day;
    this.releaseMachines(j);
    const rep = -3;
    s.reputation = Math.max(0, s.reputation + rep);
    s.stats.cancelled++;
    j.result = { paid: 0, rep, message: 'Customer collected the job unfinished.' };
    this.log(`Cancelled ${j.title}. Reputation ${rep}.`, 'bad');
    this.changed('jobs');
    return { ok: true, rep };
  }

  check(jobId, pcUid) { const j = this.state.jobs[jobId], pc = this.pc(pcUid); return j && pc ? J.checkJob(this.state, j, pc) : { rows: [], canDeliver: false }; }

  // what an invoice for this delivery would look like before the player confirms
  quote(jobId, pcUid) {
    const s = this.state, j = s.jobs[jobId], pc = this.pc(pcUid);
    if (!j || !pc) return null;
    if (j.kind === 'build' || j.kind === 'fleet') return { fixed: true, price: j.kind === 'fleet' ? Math.round(j.budget / j.count) : j.budget, partsCost: J.shopPartsCost(s, pc) };
    return { fixed: false, fee: j.kind === 'contract' ? Math.round(j.fee / j.machines.length) : j.fee, lines: J.invoiceLines(s, j, pc), budget: j.kind === 'contract' ? Math.round(j.budget / j.machines.length) : j.budget, partsCost: J.shopPartsCost(s, pc) };
  }

  deliver(jobId, pcUid, invoice = {}) {
    const s = this.state, j = s.jobs[jobId], pc = this.pc(pcUid);
    if (!j || j.status !== 'active') return fail('That job isn\'t active.');
    if (!pc) return fail('No machine.');
    const chk = J.checkJob(s, j, pc);
    if (!chk.canDeliver) return fail('Not every requirement is met yet: ' + chk.rows.filter(r => !r.ok && r.kind !== 'bonus').map(r => r.label).join('; ') + '.');
    const q = this.quote(jobId, pcUid);
    const pers = J.personalityOf(j);
    const issues = J.healthIssues(s, pc);
    const partsCost = q.partsCost;
    let charge, fair, overBudget = 0, unneededBilled = 0;
    if (q.fixed) { charge = q.price; fair = q.price; }
    else {
      const labor = Math.max(0, Math.round(invoice.labor ?? q.fee));
      const markup = Math.max(0, Math.min(0.5, invoice.markup ?? 0));
      const billed = q.lines.filter(l => !invoice.skip || !invoice.skip.includes(l.uid));
      charge = labor + Math.round(billed.reduce((a, l) => a + l.price * (1 + markup), 0));
      fair = q.fee + q.lines.reduce((a, l) => a + l.price, 0);
      if (charge > q.budget) { overBudget = charge - q.budget; charge = q.budget; }
      if (j.kind !== 'upgrade') {
        const removed = J.removedOriginals(s, j);
        for (const l of billed) if (l.cat !== 'os' && removed.some(p => PART[p.id].cat === l.cat && !p.fault && l.cat !== 'storage')) unneededBilled++;
        s.stats.wrongParts += unneededBilled;
      }
    }
    const machineIssues = issues.filter(i => i.code !== 'drivers' || j.kind !== 'build');
    // per-machine settlement
    j.delivered.push(pcUid);
    if (j.req.identical && !j.deliveredSpec) j.deliveredSpec = J.specKey(s, pc);
    j.ledger = j.ledger || { paid: 0, partsCost: 0, bonus: 0, issues: [], unneeded: 0, overBudget: 0, invoice: 0, fair: 0, perf: [] };
    const L = j.ledger;
    L.paid += charge; L.partsCost += partsCost; L.issues.push(...machineIssues); L.unneeded += unneededBilled; L.overBudget += overBudget; L.invoice += charge + overBudget; L.fair += fair;
    const cpuB = pc.tests.cpuBench, gpuB = pc.tests.gpuBench;
    if (j.req.gpuMark && gpuB) L.perf.push(gpuB.score / j.req.gpuMark - 1); else if (j.req.cpuMark && cpuB) L.perf.push(cpuB.score / j.req.cpuMark - 1);
    const bonusMet = chk.rows.filter(r => r.kind === 'bonus' && r.ok).map(r => j.bonus.find(b => b.label === r.label)).filter(Boolean);
    L.bonusMet = (L.bonusMet || []).concat(bonusMet.map(b => b.id));
    E.book(s, 'job', charge, `${j.title} — ${CUSTOMER[j.customer].name}`, j.id);
    // the machine leaves with everything in it
    for (const u of Object.values(pc.slots)) delete s.parts[u];
    delete s.parts[pc.caseUid];
    delete s.pcs[pcUid];
    s.benches = s.benches.map(b => (b === pcUid ? null : b));
    s.intake = s.intake.filter(b => b !== pcUid);
    const total = j.kind === 'fleet' ? j.count : j.machines.length || 1;
    if (j.delivered.length < total) {
      this.log(`Delivered ${j.delivered.length} of ${total} for ${j.title}.`, 'good');
      this.changed('jobs');
      return { ok: true, partial: true, paid: charge };
    }
    return this.finishJob(j, pers);
  }

  finishJob(j, pers) {
    const s = this.state, L = j.ledger;
    // bonuses count once per job: only if every delivery met them
    const total = j.delivered.length;
    const counts = {};
    for (const id of L.bonusMet) counts[id] = (counts[id] || 0) + 1;
    const met = j.bonus.filter(b => counts[b.id] === total);
    const comeback = L.issues.length > 0;
    let bonusCash = 0;
    if (!comeback) for (const b of met) bonusCash += b.cash;
    const perfMargin = L.perf.length ? Math.min(...L.perf) : 0;
    const sat = J.satisfaction(s, j, { bonusMet: comeback ? 0 : met.length, perfMargin, unneededBilled: L.unneeded, invoice: L.invoice, fair: L.fair, overBudget: L.overBudget, issues: L.issues });
    const st = J.stars(sat.score);
    let refund = 0;
    if (comeback) { refund = Math.round(L.paid * 0.4); E.book(s, 'refund', -refund, `Comeback refund: ${j.title}`, j.id); s.stats.comebacks++; }
    if (bonusCash) E.book(s, 'bonus', bonusCash, `Bonus objectives: ${j.title}`, j.id);
    let tip = 0;
    if (!comeback && st >= 5 && pers.tip > 0) { tip = Math.round(L.paid * pers.tip); if (tip) E.book(s, 'bonus', tip, `Tip from ${CUSTOMER[j.customer].name}`, j.id); }
    const rep = J.repDelta(sat.score);
    s.reputation = Math.max(0, Math.min(100, s.reputation + rep));
    const xp = Math.round((40 + 30 * j.tier * j.tier) * (0.4 + sat.score / 100) * (j.kind === 'fleet' || j.kind === 'contract' ? 1.5 : 1));
    this.gainXp(xp);
    // what happens to the original parts the player took out
    const leftovers = J.removedOriginals(s, j);
    let kept = 0;
    for (const p of leftovers) {
      if (j.keepOld && !p.data) { p.owner = 'shop'; p.cost = 0; kept++; } else { delete s.parts[p.uid]; s.inventory = s.inventory.filter(x => x !== p.uid); }
    }
    const profit = L.paid + bonusCash + tip - refund - L.partsCost;
    j.status = 'completed';
    j.closedDay = s.day;
    j.result = { paid: L.paid, bonusCash, tip, refund, partsCost: L.partsCost, profit, sat: sat.score, stars: st, rep, xp, notes: sat.notes, issues: L.issues.map(i => i.msg), kept, message: review(j, sat, st, L) };
    const st_ = s.stats;
    st_.jobsDone++; st_.revenue += L.paid + bonusCash + tip - refund; st_.profit += profit;
    if (j.kind === 'build') st_.builds++; else if (j.kind === 'fleet') { st_.builds += total; st_.contracts++; } else if (j.kind === 'contract') { st_.repairs += total; st_.contracts++; } else st_.repairs++;
    if (j.kind === 'recovery') st_.recoveries++;
    if (j.highEnd) st_.highEnd++;
    if (st === 5) st_.fiveStars++;
    st_.recentSat.push(sat.score); if (st_.recentSat.length > 10) st_.recentSat.shift();
    this.log(`${j.title}: ${'★'.repeat(st)}${'☆'.repeat(5 - st)} — profit ${money(profit)}, reputation ${rep >= 0 ? '+' : ''}${rep}.`, comeback ? 'bad' : 'good');
    this.milestones();
    this.changed('jobs');
    return { ok: true, result: j.result };
  }

  gainXp(n) {
    const s = this.state;
    s.xp += n;
    const lvl = B.levelFor(s.xp);
    if (lvl > s.level) { s.level = lvl; this.log(`Workshop reached level ${lvl}!`, 'good'); this.emit('levelup', lvl); this.milestones(); }
  }

  milestones() {
    const got = B.checkMilestones(this.state);
    for (const m of got) {
      if (m.reward.money) E.book(this.state, 'reward', m.reward.money, `Milestone: ${m.label}`);
      if (m.reward.rep) this.state.reputation = Math.min(100, this.state.reputation + m.reward.rep);
      this.log(`Milestone reached: ${m.label}!`, 'good');
      this.emit('milestone', m);
    }
    return got;
  }

  // ---------- the end of the day
  endDay() {
    const s = this.state;
    const summary = { day: s.day, events: [] };
    const ev = (text, level = 'info') => summary.events.push({ text, level });
    const startMoney = s.money;
    const todays = s.ledger.filter(l => l.day === s.day);
    // jobs past their grace day fail
    for (const j of Object.values(s.jobs)) {
      if (j.status === 'active' && s.day >= j.deadline + 1) {
        j.status = 'failed';
        j.closedDay = s.day;
        const pers = PERSONALITIES[CUSTOMER[j.customer].trait];
        const rep = -Math.round(5 + 3 * pers.lateSens);
        s.reputation = Math.max(0, s.reputation + rep);
        s.stats.failed++;
        const pen = j.kind === 'build' || j.kind === 'fleet' ? 0 : 0;
        this.releaseMachines(j);
        j.result = { paid: j.ledger ? j.ledger.paid : 0, rep, penalty: pen, message: `${CUSTOMER[j.customer].name} gave up waiting${j.machines.length ? ' and collected their machine unfinished' : ''}.` };
        ev(`Failed: ${j.title} — the deadline passed. Reputation ${rep}.`, 'bad');
      } else if (j.status === 'active' && s.day === j.deadline) ev(`${j.title} is due today. Tomorrow it will be late.`, 'warn');
      if (j.status === 'offered' && s.day >= j.expires) { j.status = 'expired'; this.discardMachines(j); }
    }
    s.day++;
    s.minute = DAY_START;
    const arrived = E.deliverOrders(s);
    if (arrived.length) ev(`${arrived.length} ordered part${arrived.length > 1 ? 's' : ''} arrived.`, 'good');
    // costs
    const diff = DIFFICULTIES[s.difficulty] || DIFFICULTIES.standard;
    if ((s.day - 1) % RENT_EVERY === 0) {
      const rent = diff.rent + 15 * (s.level - 1) + 20 * (s.benches.length - 1);
      E.book(s, 'rent', -rent, `Workshop rent (week ${(s.day - 1) / RENT_EVERY})`);
      ev(`Paid weekly rent: ${money(rent)}.`, 'warn');
    }
    for (const sub of SUBSCRIPTIONS) if (s.subs[sub.id] && (sub.every === 1 || (s.day - 1) % sub.every === 0)) { E.book(s, 'subs', -sub.cost, sub.name); ev(`${sub.name}: ${money(sub.cost)}.`); }
    if (s.day - s.bargainDay >= 2) E.refreshBargains(s);
    const offers = J.generateOffers(s);
    if (offers.length) ev(`${offers.length} new job offer${offers.length > 1 ? 's' : ''} on the board.`, 'good');
    if (s.money < 0) ev('Your balance is negative. You can\'t buy anything until jobs pay out.', 'bad');
    summary.income = todays.filter(l => l.amount > 0).reduce((a, l) => a + l.amount, 0);
    summary.spent = todays.filter(l => l.amount < 0).reduce((a, l) => a + l.amount, 0);
    summary.overnight = s.money - startMoney;
    this.milestones();
    this.changed('day');
    this.emit('day', summary);
    return summary;
  }
}

export function toolName(id) {
  return { visual: 'Visual inspection', psu: 'PSU tester', memtest: 'MemSweep', postcard: 'POST card', thermalcam: 'Thermal camera', syscheck: 'SysCheck', storage: 'DiskDoctor', temps: 'TempEye', cpuBench: 'CPU benchmark', gpuBench: 'GPU benchmark', stability: 'Stability test', malware: 'ClamShield scan' }[id] || id;
}

function review(j, sat, st, L) {
  const name = CUSTOMER[j.customer].name.split(' ')[0];
  const n = new Set(sat.notes);
  if (n.has('comeback')) return `"I'm back already — it's still not right: ${L.issues.slice(0, 2).map(i => i.msg.toLowerCase()).join(', ')}." ${name} wants a partial refund.`;
  const bits = [];
  if (st >= 5) bits.push(pickLine(['Absolutely perfect. I\'m telling everyone about this shop!', 'Flawless work. Worth every cent.', 'Better than new. Thank you!']));
  else if (st >= 4) bits.push(pickLine(['Great job, thank you.', 'Works really well. Happy customer.', 'Solid work, I\'ll be back.']));
  else if (st >= 3) bits.push(pickLine(['It works. Fine.', 'Does the job, I suppose.']));
  else bits.push(pickLine(['Not impressed.', 'I expected better.']));
  if (n.has('early')) bits.push('And ahead of schedule!');
  if (n.has('late')) bits.push('It took longer than promised, though.');
  if (n.has('pricey')) bits.push('The bill was steep.');
  if (n.has('cheap')) bits.push('Very fair price.');
  if (n.has('unneeded')) bits.push('My friend says one of the parts you charged me for was fine.');
  if (n.has('overbudget')) bits.push('I told you my limit — I paid what I said I would.');
  return `"${bits.join(' ')}" — ${name}`;
}
let lineIdx = 0;
const pickLine = list => list[(lineIdx++) % list.length];

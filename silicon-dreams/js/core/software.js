// Firmware and software: BIOS settings, OS installation and repair, drivers, formatting, malware
// removal and file recovery. Data lives on the drive (part.data), so moving a drive moves its OS
// and files with it.

import { PART } from '../data/catalog.js';
import { powerOn } from './boot.js';
import { defaultBios, emptyData } from './parts.js';
import { ramGB } from './sim.js';

const needDisplay = (state, pc) => {
  const r = powerOn(state, pc);
  return r.display ? { r } : { err: { ok: false, reason: 'You need a picture on screen for that. ' + (r.problems[0] ? r.problems[0].msg : '') } };
};
const needOS = (state, pc) => {
  const r = powerOn(state, pc);
  return r.os ? { r, drive: state.parts[r.bootDrive] } : { err: { ok: false, reason: 'That runs inside the operating system, which isn\'t booting. ' + (r.problems[0] ? r.problems[0].msg : '') } };
};

export const BIOS_OPTIONS = {
  xmp: { label: 'Memory profile (XMP)', values: [false, true], show: v => (v ? 'Enabled' : 'Disabled') },
  fan: { label: 'Fan curve', values: ['silent', 'standard', 'performance'], show: v => ({ silent: 'Silent', standard: 'Standard', performance: 'Performance', off: 'Fans stopped (0%)' }[v]) },
  volt: { label: 'CPU core voltage', values: ['auto'], show: v => ({ auto: 'Auto', high: 'Manual 1.52 V' }[v]) },
};

export function biosView(state, pc) {
  const n = needDisplay(state, pc);
  if (n.err) return n.err;
  const mbp = state.parts[pc.slots.mb];
  const drives = n.r.snap.drives.filter(d => d.linked && d.alive).map(d => ({ uid: d.p.uid, label: d.d.full }));
  return { ok: true, bios: mbp.bios, mb: PART[mbp.id], drives, snap: n.r.snap };
}

export function setBios(state, pc, key, value) {
  const n = needDisplay(state, pc);
  if (n.err) return n.err;
  const mbp = state.parts[pc.slots.mb], mb = PART[mbp.id];
  if (key === 'boot') {
    if (value !== 'auto' && !n.r.snap.drives.some(d => d.p.uid === value && d.linked)) return { ok: false, reason: 'That drive isn\'t detected.' };
  } else if (!BIOS_OPTIONS[key] || !BIOS_OPTIONS[key].values.includes(value)) return { ok: false, reason: 'Not a valid setting.' };
  mbp.bios[key] = value;
  const notes = [];
  if (key === 'xmp' && value && !mb.oc) notes.push(`The ${mb.full} doesn't support memory profiles: memory stays at its default speed.`);
  return { ok: true, notes };
}

export function resetBios(state, pc) {
  if (!pc.slots.mb) return { ok: false, reason: 'No motherboard.' };
  const mbp = state.parts[pc.slots.mb];
  mbp.bios = defaultBios();
  return { ok: true, notes: ['Firmware settings reset to factory defaults (memory profile is off by default).'] };
}

export function canInstallOS(state, pc, osId, driveUid) {
  const n = needDisplay(state, pc);
  if (n.err) return n.err;
  const os = PART[osId];
  if (!os || os.cat !== 'os') return { ok: false, reason: 'Unknown operating system.' };
  if (os.price > 0 && !(state.licenses[osId] > 0)) return { ok: false, reason: `You don't have a ${os.name} licence. Buy one in the Parts Store.` };
  const drive = n.r.snap.drives.find(d => d.p.uid === driveUid);
  if (!drive || !drive.linked) return { ok: false, reason: 'That drive isn\'t detected.' };
  if (!drive.alive) return { ok: false, reason: 'That drive doesn\'t respond.' };
  if (drive.d.gb < os.minStorage) return { ok: false, reason: `${os.name} needs a ${os.minStorage} GB drive.` };
  if (ramGB(n.r.snap) < os.minRam) return { ok: false, reason: `${os.name} needs ${os.minRam} GB of memory.` };
  return { ok: true, drive, os, wipes: drive.p.data.files.length > 0 || !!drive.p.data.os };
}

export function installOS(state, pc, osId, driveUid) {
  const c = canInstallOS(state, pc, osId, driveUid);
  if (!c.ok) return c;
  if (c.os.price > 0) state.licenses[osId]--;
  const lost = c.drive.p.data.files.slice();
  c.drive.p.data = { ...emptyData(), os: osId };
  const notes = [`${c.os.name} installed on the ${c.drive.d.name}.`, 'Install drivers next.'];
  if (lost.length) notes.push(`The drive was formatted: ${lost.map(f => f.label).join(', ')} erased.`);
  if (c.drive.p.fault === 'failing') notes.push('The install was slow and the drive clicked the whole time.');
  return { ok: true, notes, lost };
}

export function repairOS(state, pc) {
  const n = needDisplay(state, pc);
  if (n.err) return n.err;
  const snap = n.r.snap;
  const d = snap.drives.find(x => x.linked && x.alive && x.p.data.os && !x.p.data.osOk);
  if (!d) return { ok: false, reason: 'No damaged OS installation was found.' };
  d.p.data.osOk = true;
  return { ok: true, notes: ['System files restored. Personal files were kept.'] };
}

export function installDrivers(state, pc) {
  const n = needOS(state, pc);
  if (n.err) return n.err;
  if (n.drive.data.drivers) return { ok: false, reason: 'Drivers are already installed.' };
  n.drive.data.drivers = true;
  return { ok: true, notes: ['Chipset, graphics and audio drivers installed.'] };
}

export function formatDrive(state, pc, driveUid) {
  const n = needDisplay(state, pc);
  if (n.err) return n.err;
  const d = n.r.snap.drives.find(x => x.p.uid === driveUid && x.linked && x.alive);
  if (!d) return { ok: false, reason: 'That drive isn\'t detected.' };
  const lost = d.p.data.files.slice();
  d.p.data = emptyData();
  return { ok: true, notes: [`${d.d.name} formatted.${lost.length ? ` Erased: ${lost.map(f => f.label).join(', ')}.` : ''}`], lost };
}

const THREATS = [null, ['Adware.CouponPal', 'PUP.SpeedBoostr'], ['Trojan.Keyhook', 'Miner.Quietcoin', 'Adware.CouponPal'], ['Rootkit.Shade', 'Trojan.Keyhook', 'Miner.Quietcoin']];

export function malwareScan(state, pc, pro) {
  const n = needOS(state, pc);
  if (n.err) return n.err;
  const data = n.drive.data;
  const lines = [`ClamShield ${pro ? 'Pro' : 'Free'} — full scan`];
  if (!data.malware) {
    lines.push('No threats found.');
    return { ok: true, lines, evidence: [{ tag: 'malware', text: 'ClamShield: no threats found.', level: 'good' }], record: { key: 'malware', ok: true } };
  }
  const found = THREATS[data.malware];
  lines.push(...found.map(t => `Found: ${t}`));
  if (data.malware >= 3 && !pro) {
    data.malware = 3;
    lines.push('Rootkit.Shade could not be removed (protected by a kernel driver).', 'Other threats keep coming back while it runs.');
    return { ok: true, lines, evidence: [{ tag: 'malware', text: 'ClamShield Free found a rootkit it can\'t remove. Needs ClamShield Pro — or back up the files and reinstall.', level: 'bad' }], record: { key: 'malware', ok: false } };
  }
  data.malware = 0;
  lines.push('All threats removed. Personal files untouched.');
  return { ok: true, lines, evidence: [{ tag: 'malware', text: `ClamShield removed ${found.length} threats. Personal files were kept.`, level: 'good' }], record: { key: 'malware', ok: true } };
}

// DataRescue: copy files from one drive to another. Source may be in this machine or loose on
// the shelf (in the dock); target must be a healthy drive in this machine or on the shelf.
export function recoverFiles(state, fromUid, toUid, pro) {
  const src = state.parts[fromUid], dst = state.parts[toUid];
  if (!src || !dst || !src.data || !dst.data) return { ok: false, reason: 'Pick two drives.' };
  if (fromUid === toUid) return { ok: false, reason: 'Pick a different target drive.' };
  if (dst.fault) return { ok: false, reason: 'The target drive is faulty. Use a healthy one.' };
  if (!src.data.files.length) return { ok: false, reason: 'There are no personal files on the source drive.' };
  const srcDef = PART[src.id], dstDef = PART[dst.id];
  const used = dst.data.files.reduce((s, f) => s + f.gb, 0) + (dst.data.os ? 30 : 0);
  const need = src.data.files.reduce((s, f) => s + f.gb, 0);
  if (used + need > dstDef.gb) return { ok: false, reason: `Not enough space: ${need} GB of files, ${dstDef.gb - used} GB free on the target.` };
  let frac = 1;
  if (src.fault === 'dead') frac = pro ? 0.85 : 0;
  else if (src.fault === 'failing') frac = src.health >= 25 ? 1 : src.health >= 10 ? (pro ? 1 : 0.6) : (pro ? 0.9 : 0.3);
  if (frac === 0) return { ok: false, reason: `The ${srcDef.name} doesn't respond. Only a clean-bench recovery (DataRescue Pro) can read it.` };
  const notes = [];
  for (const f of src.data.files) {
    const copy = { ...f, pct: Math.round((f.pct ?? 100) * frac) };
    const prev = dst.data.files.find(x => x.label === f.label && x.owner === f.owner);
    if (prev) prev.pct = Math.max(prev.pct ?? 100, copy.pct); else dst.data.files.push(copy);
  }
  notes.push(frac >= 1 ? `All files copied to the ${dstDef.name}.` : `Recovered about ${Math.round(frac * 100)}% of the files; the rest were unreadable.`);
  if (src.fault === 'failing') { src.health = Math.max(0, src.health - 12); notes.push(`Reading the failing drive wore it further (health ${src.health}%).`); if (src.health === 0) src.fault = 'dead'; }
  return { ok: true, notes, frac };
}

export const filesOf = (state, ownerId) => {
  const out = [];
  for (const p of Object.values(state.parts)) if (p.data) for (const f of p.data.files) if (f.owner === ownerId) out.push({ drive: p.uid, ...f });
  return out;
};

// Pressing the power button: walks the machine through power-on, POST, video, boot device and
// operating system, the way a real one would, and stops at the first thing that fails. The
// result says what the player sees and hears (fans, debug LEDs, beeps, screen text) plus a
// plain-language list of reasons for the assembly bench.

import { PART } from '../data/catalog.js';
import { snapshot, power, thermals, bootDrive, ramGB, dualChannel } from './sim.js';
import { cableList, zoneLabel } from './pc.js';
import { analyzeSpec, missingParts } from './compat.js';
import { specOf } from './sim.js';
import { CATEGORY } from '../data/catalog.js';

// stages, in order; `reached` is the last one that worked
export const STAGES = ['off', 'power', 'post', 'video', 'bootdev', 'os'];

export function powerOn(state, pc) {
  const snap = snapshot(state, pc);
  const r = { stage: 'off', fans: false, leds: {}, beeps: null, screen: [], problems: [], warnings: [], display: false, os: false, snap };
  const prob = (code, msg, hint) => r.problems.push({ code, msg, hint });
  const c = k => pc.cables[k] || null;
  if (!snap.cs) { prob('nocase', 'There is no case on the bench.'); return r; }
  if (!snap.psu) { prob('nopsu', 'No power supply is installed, so nothing happens.', 'Install a PSU in the PSU bay.'); return r; }
  if (!snap.mb) { prob('nomb', 'No motherboard is installed. The PSU has nothing to power.', 'Install a motherboard.'); return r; }
  if (c('panel') !== 'ok') { prob('panel', 'Pressing the power button does nothing: the front-panel cable isn\'t connected to the motherboard.', 'Connect the front panel cable.'); return r; }
  if (snap.psuP.fault === 'dead') { prob('psudead', 'Nothing at all happens — no lights, no fans.', 'Check the power supply.'); return r; }
  if (c('atx24') == null) { prob('atx24', 'Nothing happens: the 24-pin motherboard power cable isn\'t connected.', 'Connect the 24-pin cable.'); return r; }
  const pw = power(snap);
  if (pw.capacity < pw.idle) { prob('psuweak', `The fans twitch and stop: the power supply can't even deliver idle power (~${pw.idle} W).`, 'Test or replace the PSU.'); return r; }
  if (c('atx24') === 'loose') { prob('atx24loose', 'The machine powers on for a second, then cuts out. Something in the main power path is intermittent.', 'Check that the big power connectors are fully latched.'); r.fans = 'blip'; return r; }
  r.stage = 'power';
  r.fans = true;
  if (snap.cpuP && snap.cpuP.fault === 'dead' || !snap.cpu) { r.leds.cpu = true; prob(snap.cpu ? 'cpudead' : 'nocpu', snap.cpu ? 'Fans spin but the CPU debug LED stays lit. The board doesn\'t detect a working CPU.' : 'Fans spin, the CPU debug LED stays lit: there is no CPU in the socket.', snap.cpu ? 'Try a known-good CPU or check the board.' : 'Install a CPU.'); return r; }
  if (c('cpu8') !== 'ok') { r.leds.cpu = true; prob(c('cpu8') ? 'cpu8loose' : 'cpu8', c('cpu8') ? 'Fans spin and the CPU LED flickers on and off: the CPU power cable isn\'t making good contact.' : 'Fans spin but the CPU LED stays lit: the 8-pin CPU power cable isn\'t connected.', 'Connect the 8-pin CPU power cable firmly.'); return r; }
  if (snap.mbp.fault === 'dead') { r.leds.cpu = true; prob('mbdead', 'Fans spin, the CPU LED stays on and never moves on, even though the CPU and its power look fine.', 'A POST debug card could narrow it down. The board itself may be dead.'); return r; }
  if (!snap.ram.length) { r.leds.dram = true; r.beeps = 'long ×3'; prob('noram', 'Three long beeps and the DRAM LED: no memory is installed.', 'Install memory in the DIMM slots.'); return r; }
  if (snap.ram.every(x => x.p.fault === 'errors')) { r.leds.dram = true; r.beeps = 'long ×3'; prob('ramall', 'Three long beeps and the DRAM LED: the memory fails its power-on check.', 'Run a memory test or try known-good sticks.'); return r; }
  r.stage = 'post';
  // video
  const gpuPowered = snap.gpu ? Array.from({ length: snap.gpu.pins }, (_, i) => c(`pcie${i}`)).every(v => v === 'ok') : false;
  if (snap.gpu) {
    if (!gpuPowered) { r.leds.vga = true; r.beeps = 'long, short ×2'; prob('pcie', 'The VGA LED lights up and the screen stays black: the graphics card\'s PCIe power isn\'t (fully) connected.', 'Plug in every 8-pin PCIe power cable the card needs.'); return r; }
    if (snap.gpuP.fault === 'dead') { r.leds.vga = true; r.beeps = 'long, short ×2'; prob('gpudead', 'The VGA LED lights up, the card\'s fans spin, but there\'s no picture.', 'Test with another graphics card or the CPU\'s graphics.'); return r; }
  } else if (!snap.cpu.igpu) { r.leds.vga = true; r.beeps = 'long, short ×2'; prob('novideo', `No picture: the ${snap.cpu.full} has no integrated graphics and there's no graphics card.`, 'Install a graphics card.'); return r; }
  r.display = true;
  r.stage = 'video';
  const t = thermals(snap, 0.15);
  r.screen.push(`${snap.mb.brand} BootForge firmware v4.2`, `CPU: ${snap.cpu.full} @ ${snap.cpu.ghz.toFixed(1)} GHz`, `Memory: ${ramGB(snap)} GB ${snap.ram[0].d.mem} @ ${Math.min(...snap.ram.map(x => (snap.bios.xmp && snap.mb.oc ? x.d.mhz : x.d.base)))} MT/s`);
  const bad = snap.ram.filter(x => x.p.fault === 'errors');
  if (!snap.cooler) { prob('nocooler', 'The CPU heats up within seconds and the machine switches itself off: there\'s no CPU cooler.', 'Install a cooler (with thermal paste).'); r.screen.push('CPU OVER TEMPERATURE — SYSTEM HALTED'); r.stage = 'post'; r.display = true; return r; }
  if (c('cpufan') !== 'ok' && c('cpufan') !== 'loose') { r.warnings.push({ code: 'cpufan', msg: 'CPU fan error: the cooler isn\'t plugged into the CPU_FAN header.', hint: 'Connect the cooler cable.' }); r.screen.push('WARNING: CPU fan speed error detected. Press F1 to continue.'); }
  if (t.cpuRaw > 90) r.screen.push(`WARNING: CPU temperature ${t.cpuRaw}°C at idle`);
  if (bad.length) r.screen.push('Memory check… OK');
  // drives
  const drives = snap.drives;
  for (const d of drives) {
    if (!d.linked) r.warnings.push({ code: 'drivecable', msg: `${d.d.full} isn't detected: its SATA power or data cable is missing.`, hint: 'Connect both SATA cables.' });
    else if (d.alive) r.screen.push(`Drive: ${d.d.full}${d.p.fault === 'failing' ? '  — S.M.A.R.T. status BAD, backup and replace' : ''}`);
  }
  const boot = bootDrive(snap);
  if (!boot) {
    const pointed = snap.bios.boot !== 'auto';
    prob(pointed ? 'bootorder' : 'nodrive', pointed ? 'Reboot and select proper boot device: the firmware is set to boot from a drive that isn\'t there.' : (drives.length ? 'No bootable device: no drive is detected.' : 'No bootable device: there is no storage drive.'), pointed ? 'Set the boot device to Auto in the BIOS.' : 'Install and connect a drive.');
    r.screen.push('Reboot and select proper boot device', 'or insert boot media and press a key');
    return r;
  }
  r.stage = 'bootdev';
  const data = boot.p.data;
  if (!data.os) {
    prob('noos', 'The drive has no operating system on it.', 'Install an OS from the Testing screen.');
    r.screen.push('No operating system found.');
    return r;
  }
  if (!data.osOk) {
    prob('oscorrupt', `${PART[data.os].name} starts loading, then fails with a system-file error and restarts.`, 'Run an OS repair, or reinstall.');
    r.screen.push(`${PART[data.os].name}`, 'Your device ran into a problem: CRITICAL_SYSTEM_FILE_MISSING', 'Restarting…');
    return r;
  }
  r.stage = 'os';
  r.os = true;
  r.bootDrive = boot.p.uid;
  r.screen.push(`Starting ${PART[data.os].name}…`);
  if (boot.p.fault === 'failing') r.warnings.push({ code: 'slowboot', msg: 'It takes a long time to reach the desktop, and the drive clicks.', hint: 'Check storage health.' });
  if (data.malware) r.warnings.push({ code: 'popups', msg: 'Pop-ups appear on the desktop as soon as it loads.', hint: 'Scan for malware.' });
  if (!data.drivers) r.warnings.push({ code: 'drivers', msg: 'The screen runs at a low resolution: drivers aren\'t installed.', hint: 'Install drivers.' });
  return r;
}

// Pre-flight: everything missing, unplugged or incompatible on the bench, in one list.
export function preflight(state, pc) {
  const spec = specOf(state, pc);
  const out = [];
  const miss = missingParts(spec);
  for (const m of miss) out.push({ level: 'error', msg: `Missing: ${CATEGORY[m].one}.` });
  for (const i of analyzeSpec(spec)) out.push({ level: i.level, msg: i.msg });
  for (const cbl of cableList(state, pc)) {
    const st = pc.cables[cbl.key];
    if (!cbl.ok) out.push({ level: 'warn', msg: `${cbl.label}: ${cbl.reason}` });
    else if (!st) out.push({ level: cbl.key.startsWith('fan:') ? 'warn' : 'error', msg: `Not connected: ${cbl.label}.` });
  }
  if (pc.slots.cooler && pc.paste.state !== 'good') out.push({ level: pc.paste.state === 'none' ? 'error' : 'warn', msg: { none: 'No thermal paste under the cooler.', thin: 'Too little thermal paste.', excess: 'Too much thermal paste.', used: 'Cooler reseated on old paste.', dried: 'Thermal paste is old and dried.' }[pc.paste.state] });
  const snap = snapshot(state, pc);
  if (snap.ram.length >= 2 && !dualChannel(snap)) out.push({ level: 'warn', msg: 'All the memory is on one channel (slots A+B or C+D). Put pairs in B and D for dual-channel speed.' });
  if (!pc.closed) out.push({ level: 'info', msg: 'The side panel is off.' });
  return out;
}

export { zoneLabel };

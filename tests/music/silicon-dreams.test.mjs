import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../silicon-dreams/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { PART, PARTS, CATEGORIES, SOCKETS, MEM_TYPES, FORMS } = await load('data/catalog.js');
const { BUILDS, MACHINES, FAULT_DEFS, TIERS } = await load('data/jobs.js');
const { CUSTOMERS, PERSONALITIES } = await load('data/customers.js');
const { TOOLS, UPGRADES } = await load('data/tools.js');
const { Game } = await load('core/game.js');
const PC = await load('core/pc.js');
const SIM = await load('core/sim.js');
const { analyzeSpec, missingParts, fitsWith } = await load('core/compat.js');
const { powerOn, preflight } = await load('core/boot.js');
const J = await load('core/jobs.js');
const E = await load('core/economy.js');
const B = await load('core/business.js');
const SAVE = await load('core/save.js');
const { makePart } = await load('core/parts.js');
const { rngFor } = await load('core/rng.js');
const { DAY_END } = await load('core/config.js');

const fresh = (seed = 7) => { const storage = SAVE.memoryStorage(); const g = Game.fresh({ seed }, { storage }); g.storage = storage; return g; };
const rich = (g) => { const s = g.state; s.money = 1e6; s.level = 6; s.xp = 99999; s.upgrades.supplier = 1; s.upgrades.distributor = 1; for (const t of TOOLS) s.tools[t.id] = true; s.consumables = { paste: 50, air: 50, wipes: 50 }; return g; };
const morning = g => { g.state.minute = 9 * 60; };
const defs = spec => ({ case: PART[spec.case], motherboard: PART[spec.motherboard], cpu: PART[spec.cpu], cooler: PART[spec.cooler], gpu: spec.gpu ? PART[spec.gpu] : null, psu: PART[spec.psu], ram: (spec.ram || []).map(i => PART[i]), storage: (spec.storage || []).map(i => PART[i]), fans: (spec.fans || []).map(i => PART[i]), os: spec.os ? PART[spec.os] : null });
const shelf = (g, id) => { const p = makePart(g.state, id, { cost: PART[id].price }); g.state.inventory.push(p.uid); return p.uid; };
const errorsOf = spec => analyzeSpec(defs(spec)).filter(i => i.level === 'error').map(i => i.code);

// a machine built straight onto bench 0, with an OS and drivers, ready to test
function benchMachine(g, spec, { owner = 'shop', os = 'os-lumen-home', files = [] } = {}) {
  const s = g.state;
  const pc = PC.assemble(s, spec, { owner });
  if (owner !== 'shop') pc.job = owner;
  pc.fileLabels = files.map(f => f.label);
  const drive = s.parts[pc.slots[PC.storageZones(s, pc).sort()[0]]];
  drive.data = { os, osOk: true, drivers: true, malware: 0, files: files.map(f => ({ ...f, owner, pct: 100 })) };
  s.benches[0] = pc.uid;
  return pc;
}

const REFERENCE_BUILDS = {
  office: { case: 'case-boxwell-mini', motherboard: 'mb-ostrava-h61m', cpu: 'cpu-arc-k3-1210', cooler: 'cool-breeze-65', ram: ['ram-mw-8-2666', 'ram-mw-8-2666'], storage: ['sto-pebble-240'], psu: 'psu-volt-450', fans: ['fan-zp-quiet120'], os: 'os-lumen-home' },
  student: { case: 'case-boxwell-mini', motherboard: 'mb-pinewood-a52m', cpu: 'cpu-vx-h5-5600g', cooler: 'cool-breeze-65', ram: ['ram-qs-8-3200', 'ram-qs-8-3200'], storage: ['sto-dv-swift-500'], psu: 'psu-volt-450', fans: ['fan-zp-breeze120'], os: 'os-fernix' },
  budget: { case: 'case-boxwell-mini', motherboard: 'mb-pinewood-a52m', cpu: 'cpu-vx-h5-5600g', cooler: 'cool-breeze-65', ram: ['ram-mw-8-2666', 'ram-mw-8-2666'], storage: ['sto-pebble-240'], psu: 'psu-volt-350', fans: [], os: 'os-fernix' },
  esports: { case: 'case-boxwell-towerm', motherboard: 'mb-pinewood-a52m', cpu: 'cpu-vx-h5-3600', cooler: 'cool-fl-tower120', ram: ['ram-qs-8-3200', 'ram-qs-8-3200'], storage: ['sto-dv-swift-500'], psu: 'psu-volt-550', gpu: 'gpu-cf-6600', fans: ['fan-zp-breeze120', 'fan-zp-breeze120'], os: 'os-lumen-home' },
  gaming: { case: 'case-boxwell-towerm', motherboard: 'mb-ostrava-b66', cpu: 'cpu-arc-k5-1260', cooler: 'cool-fl-tower120', ram: ['ram-qs-8-3200', 'ram-qs-8-3200'], storage: ['sto-dv-swift-1t'], psu: 'psu-amp-650', gpu: 'gpu-cf-6700', fans: ['fan-zp-breeze120', 'fan-zp-breeze120', 'fan-zp-breeze120'], os: 'os-lumen-home' },
  quiet: { case: 'case-hush-studio', motherboard: 'mb-pinewood-a52m', cpu: 'cpu-vx-h5-5600g', cooler: 'cool-fl-tower120', ram: ['ram-qs-16-3600', 'ram-qs-16-3600'], storage: ['sto-dv-swift-1t'], psu: 'psu-amp-650', fans: ['fan-zp-quiet120', 'fan-zp-quiet120'], os: 'os-fernix' },
  render: { case: 'case-boxwell-towerm', motherboard: 'mb-pinewood-b65', cpu: 'cpu-vx-h5-7600', cooler: 'cool-fl-tower120', ram: ['ram-qs-16-6000', 'ram-qs-16-6000'], storage: ['sto-dv-swift-1t'], psu: 'psu-volt-550', fans: ['fan-zp-breeze120', 'fan-zp-breeze120'], os: 'os-fernix' },
  highend: { case: 'case-nw-airflow', motherboard: 'mb-ostrava-b66', cpu: 'cpu-arc-k7-1370', cooler: 'cool-fl-duo140', ram: ['ram-qs-16-3600', 'ram-qs-16-3600'], storage: ['sto-dv-swift-1t'], psu: 'psu-amp-750', gpu: 'gpu-nr-4070', fans: ['fan-zp-breeze120', 'fan-zp-breeze120', 'fan-zp-breeze120'], os: 'os-lumen-home' },
  sff: { case: 'case-pocket-cube', motherboard: 'mb-kiln-a62i', cpu: 'cpu-vx-h5-7600', cooler: 'cool-fl-slim47', ram: ['ram-qs-16-6000', 'ram-qs-16-6000'], storage: ['sto-dv-swift-1t'], psu: 'psu-volt-sfx600', gpu: 'gpu-cf-6700', fans: ['fan-zp-breeze120', 'fan-zp-breeze120'], os: 'os-fernix' },
  workstation: { case: 'case-nw-airflow', motherboard: 'mb-pinewood-b65', cpu: 'cpu-vx-h9-7950x', cooler: 'cool-gl-hydro360', ram: ['ram-qs-32-6400', 'ram-qs-32-6400'], storage: ['sto-dv-hyper-2t'], psu: 'psu-amp-750', gpu: 'gpu-cf-6700', fans: ['fan-zp-breeze120', 'fan-zp-breeze120'], os: 'os-harbor-ws' },
  flagship: { case: 'case-monolith', motherboard: 'mb-pinewood-x67', cpu: 'cpu-vx-h9-7950x', cooler: 'cool-gl-hydro360', ram: ['ram-qs-32-6400', 'ram-qs-32-6400'], storage: ['sto-dv-hyper-2t'], psu: 'psu-amp-1000', gpu: 'gpu-nr-4090', fans: ['fan-zp-silent140', 'fan-zp-silent140', 'fan-zp-silent140', 'fan-zp-silent140'], os: 'os-lumen-home' },
  studio: { case: 'case-hush-studio', motherboard: 'mb-ostrava-z79', cpu: 'cpu-arc-k7-1370', cooler: 'cool-gl-hydro240', ram: ['ram-qs-32-6400', 'ram-qs-32-6400'], storage: ['sto-dv-hyper-2t'], psu: 'psu-amp-650', fans: ['fan-zp-silent140', 'fan-zp-silent140'], os: 'os-fernix' },
};

// ---------------------------------------------------------------- structure

test('every silicon-dreams module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } };
  walk(dir.pathname);
  assert.ok(files.length >= 35, `found ${files.length} modules`);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('every screen module exports a render function', async () => {
  const screens = fs.readdirSync(new URL('ui/screens/', dir)).filter(f => f.endsWith('.js'));
  assert.deepEqual(screens.sort(), ['assembly.js', 'business.js', 'jobs.js', 'menu.js', 'newgame.js', 'settings.js', 'store.js', 'testing.js', 'workshop.js']);
  const src = fs.readFileSync(new URL('ui/app.js', dir), 'utf8');
  for (const f of screens) {
    assert.match(fs.readFileSync(new URL(`ui/screens/${f}`, dir), 'utf8'), /export function render\(/, f);
    assert.ok(src.includes(`./screens/${f}`), `app.js routes to ${f}`);
  }
});

// ---------------------------------------------------------------- component database

test('the component database is complete and consistent', () => {
  const ids = new Set();
  for (const d of PARTS) {
    assert.ok(!ids.has(d.id), `duplicate id ${d.id}`);
    ids.add(d.id);
    for (const k of ['id', 'name', 'brand', 'cat', 'tier']) assert.ok(d[k] != null, `${d.id} has ${k}`);
    assert.ok(Number.isFinite(d.price) && d.price >= 0, `${d.id} price`);
    if (d.cat !== 'os' && d.cat !== 'case') assert.ok(Number.isFinite(d.failRate), `${d.id} failRate`);
  }
  for (const c of CATEGORIES) assert.ok(c.list.length >= 4, `${c.id} has several parts`);
  for (const d of PARTS.filter(p => p.cat === 'motherboard')) { assert.ok(SOCKETS.includes(d.socket)); assert.ok(MEM_TYPES.includes(d.mem)); assert.ok(FORMS.includes(d.form)); }
  for (const d of PARTS.filter(p => p.cat === 'cooler')) for (const sk of d.sockets) assert.ok(SOCKETS.includes(sk), `${d.id} socket ${sk}`);
  for (const sk of SOCKETS) for (const mem of ['DDR4', 'DDR5']) void mem;
  // every CPU has at least one board and one cooler that fit it
  for (const cpu of PARTS.filter(p => p.cat === 'cpu')) {
    assert.ok(PARTS.some(p => p.cat === 'motherboard' && p.socket === cpu.socket), `${cpu.id} board`);
    assert.ok(PARTS.some(p => p.cat === 'cooler' && p.sockets.includes(cpu.socket) && p.capacity >= cpu.tdp), `${cpu.id} adequate cooler`);
  }
  for (const mb of PARTS.filter(p => p.cat === 'motherboard')) assert.ok(PARTS.some(p => p.cat === 'ram' && p.mem === mb.mem), `${mb.id} memory`);
  assert.ok(PARTS.filter(p => p.cat === 'os' && !p.unsold).some(o => o.price === 0), 'a free OS exists');
});

// ---------------------------------------------------------------- compatibility

test('compatibility rules catch invalid combinations', () => {
  const ok = REFERENCE_BUILDS.gaming;
  assert.deepEqual(errorsOf(ok), []);
  assert.ok(errorsOf({ ...ok, cpu: 'cpu-vx-h5-3600' }).includes('socket'));
  assert.ok(errorsOf({ ...ok, ram: ['ram-qs-16-6000', 'ram-qs-16-6000'] }).includes('memtype'));
  assert.ok(errorsOf({ ...ok, case: 'case-boxwell-mini' }).includes('form'), 'ATX board in an mATX case');
  assert.ok(errorsOf({ ...ok, case: 'case-pocket-cube', motherboard: 'mb-tessera-n76i', ram: ['ram-qs-16-6000', 'ram-qs-16-6000'], psu: 'psu-volt-sfx600', gpu: 'gpu-nr-4090' }).includes('gpulen'));
  assert.ok(errorsOf({ ...ok, psu: 'psu-volt-350' }).includes('power'));
  assert.ok(errorsOf({ ...ok, psu: 'psu-volt-350' }).includes('pcie'), 'GPU needs more PCIe cables');
  assert.ok(errorsOf({ ...ok, cooler: 'cool-breeze-65' }).includes('cooling'), '125 W CPU on a 70 W cooler');
  assert.ok(errorsOf({ ...ok, case: 'case-pocket-cube', motherboard: 'mb-tessera-n76i', ram: ['ram-qs-16-6000', 'ram-qs-16-6000'], psu: 'psu-volt-sfx600', gpu: 'gpu-cf-6600' }).includes('coolerheight'));
  assert.ok(errorsOf({ ...ok, psu: 'psu-volt-sfx600' }).includes('psuform'));
  assert.ok(errorsOf({ ...ok, cooler: 'cool-fl-classic92' }).includes('coolersocket'));
  assert.ok(errorsOf({ ...ok, case: 'case-boxwell-mini', motherboard: 'mb-ostrava-h61m', cooler: 'cool-gl-hydro240' }).includes('radiator'));
  assert.ok(errorsOf({ ...ok, gpu: null, cpu: 'cpu-vx-h5-3600', motherboard: 'mb-pinewood-b55' }).includes('video'));
  assert.ok(errorsOf({ ...ok, motherboard: 'mb-tessera-h11m', cpu: 'cpu-arc-k5-8400', storage: ['sto-dv-swift-500'] }).includes('m2'));
  assert.ok(errorsOf({ ...REFERENCE_BUILDS.office, ram: ['ram-mw-8-2666'], os: 'os-harbor-ws' }).includes('osram'), 'Harbor needs 16 GB+');
  assert.ok(errorsOf({ ...ok, ram: Array(5).fill('ram-qs-8-3200') }).includes('ramslots'));
  assert.ok(errorsOf({ ...ok, case: 'case-boxwell-mini', motherboard: 'mb-ostrava-h61m', fans: ['fan-zp-silent140'] }).includes('fansize'));
  // fitsWith answers "does this part work with what I have?"
  const spec = defs({ case: 'case-boxwell-mini', motherboard: 'mb-ostrava-h61m' });
  assert.equal(fitsWith(spec, PART['cpu-arc-k3-1210']).length, 0);
  assert.ok(fitsWith(spec, PART['cpu-vx-h5-3600']).length > 0);
  assert.ok(fitsWith(spec, PART['gpu-nr-4090']).length > 0);
});

test('missing components are listed', () => {
  assert.deepEqual(missingParts({}), ['case', 'motherboard', 'cpu', 'cooler', 'ram', 'storage', 'psu']);
  assert.deepEqual(missingParts(defs({ ...REFERENCE_BUILDS.esports, gpu: null })), ['gpu'], 'no iGPU and no graphics card');
  assert.deepEqual(missingParts(defs(REFERENCE_BUILDS.office)), []);
});

// ---------------------------------------------------------------- hands-on assembly

test('installation zones explain why a part cannot go in', () => {
  const g = rich(fresh()), s = g.state;
  const cs = shelf(g, 'case-boxwell-towerm');
  assert.ok(g.placeCase(0, cs).ok);
  const pc = g.pc(s.benches[0]);
  const cpu = shelf(g, 'cpu-arc-k3-1210');
  assert.match(g.install(pc.uid, cpu, 'cpu').reason, /motherboard first/);
  const mb = shelf(g, 'mb-ostrava-h61m');
  assert.match(g.install(pc.uid, mb, 'psu').reason, /motherboard/i, 'wrong zone for the category');
  assert.ok(g.install(pc.uid, mb, 'mb').ok);
  const wrongCpu = shelf(g, 'cpu-vx-h5-3600');
  assert.match(g.install(pc.uid, wrongCpu, 'cpu').reason, /Socket mismatch/);
  assert.match(g.install(pc.uid, cpu, 'cpu', 90).reason, /triangle/, 'rotated CPU refused');
  const cooler = shelf(g, 'cool-fl-tower120');
  assert.match(g.install(pc.uid, cooler, 'cooler').reason, /CPU before the cooler/);
  assert.ok(g.install(pc.uid, cpu, 'cpu', 0).ok);
  const ddr5 = shelf(g, 'ram-qs-16-6000');
  assert.match(g.install(pc.uid, ddr5, 'ram0').reason, /DDR5 memory won't go/);
  const ram = shelf(g, 'ram-qs-8-3200');
  assert.match(g.install(pc.uid, ram, 'ram0', 180).reason, /notch/);
  assert.ok(g.install(pc.uid, ram, 'ram0').ok);
  const hdd = shelf(g, 'sto-strata-500');
  assert.match(g.install(pc.uid, hdd, 'bay25_0').reason, /too big/);
  assert.match(g.install(pc.uid, hdd, 'm2_0').reason, /SATA drive/);
  const sfx = shelf(g, 'psu-volt-sfx600');
  assert.match(g.install(pc.uid, sfx, 'psu').reason, /ATX power supply/);
  // the GPU is too long for the small case on another bench
  s.benches.push(null);
  const mini = shelf(g, 'case-boxwell-mini');
  assert.ok(g.placeCase(1, mini).ok);
  const pc2 = g.pc(s.benches[1]);
  assert.ok(g.install(pc2.uid, shelf(g, 'mb-ostrava-h61m'), 'mb').ok);
  assert.match(g.install(pc2.uid, shelf(g, 'gpu-nr-4070'), 'gpu').reason, /Too long/);
  // removal order
  assert.ok(g.install(pc.uid, cooler, 'cooler').ok);
  assert.match(g.remove(pc.uid, 'cpu').reason, /cooler/);
  assert.match(g.remove(pc.uid, 'mb').reason, /Remove the/);
  // closing the case blocks hands-on work
  assert.ok(g.setClosed(pc.uid, true).ok);
  assert.match(g.remove(pc.uid, 'cooler').reason, /side panel/);
});

test('a complete PC can be assembled by hand, wired and booted', () => {
  const g = rich(fresh()), s = g.state;
  for (const id of ['case-boxwell-towerm', 'mb-ostrava-h61m', 'cpu-arc-k3-1210', 'cool-fl-tower120', 'ram-qs-8-3200', 'ram-qs-8-3200', 'sto-dv-swift-500', 'psu-volt-450', 'fan-zp-breeze120', 'fan-zp-breeze120']) assert.ok(g.buy(id).ok, id);
  assert.ok(g.buy('os-lumen-home').ok);
  const inv = id => s.inventory.find(u => s.parts[u].id === id && s.parts[u].cost === PART[id].price);
  assert.ok(g.placeCase(0, inv('case-boxwell-towerm')).ok);
  const pc = g.pc(s.benches[0]);
  const step = (id, zone, rot = 0) => { const r = g.install(pc.uid, inv(id), zone, rot); assert.ok(r.ok, `${id}: ${r.reason}`); return r; };
  step('mb-ostrava-h61m', 'mb');
  step('cpu-arc-k3-1210', 'cpu');
  assert.ok(g.applyPaste(pc.uid, 45).ok);
  assert.equal(pc.paste.state, 'good');
  step('cool-fl-tower120', 'cooler');
  step('ram-qs-8-3200', 'ram0');
  step('ram-qs-8-3200', 'ram1');
  step('sto-dv-swift-500', 'm2_0');
  step('psu-volt-450', 'psu');
  step('fan-zp-breeze120', 'fan:front0');
  step('fan-zp-breeze120', 'fan:rear0');
  assert.equal(pc.fanDir['fan:front0'], 'in');
  assert.equal(pc.fanDir['fan:rear0'], 'out');
  // nothing connected yet: the front panel is the first thing a real machine needs
  let r = powerOn(s, pc);
  assert.equal(r.stage, 'off');
  assert.equal(r.problems[0].code, 'panel');
  const order = [];
  for (const c of PC.cableList(s, pc)) { assert.ok(g.connect(pc.uid, c.key).ok, c.key); order.push(c.key); }
  assert.ok(order.includes('atx24') && order.includes('cpu8') && order.includes('cpufan') && order.includes('fan:fan:front0'));
  assert.ok(!preflight(s, pc).some(x => x.level === 'error'), JSON.stringify(preflight(s, pc)));
  assert.ok(g.setClosed(pc.uid, true).ok);
  r = g.powerOn(pc.uid).boot;
  assert.equal(r.stage, 'bootdev');
  assert.equal(r.problems[0].code, 'noos');
  const drive = pc.slots.m2_0;
  assert.ok(g.installOS(pc.uid, 'os-lumen-home', drive).ok);
  assert.equal(s.licenses['os-lumen-home'], 0, 'the licence is used up');
  assert.ok(g.installDrivers(pc.uid).ok);
  assert.ok(g.powerOn(pc.uid).boot.os);
  const stab = g.runTool(pc.uid, 'stability');
  assert.ok(stab.ok && stab.record.ok, stab.lines && stab.lines.join('\n'));
  // XMP is off by default and the board can't run memory profiles: setting it changes nothing
  assert.ok(g.setBios(pc.uid, 'xmp', true).ok);
  assert.equal(SIM.memSpeed(SIM.snapshot(s, pc)), 2133);
});

test('wiring mistakes produce the right boot failure, in order', () => {
  const g = rich(fresh()), s = g.state;
  const pc = benchMachine(g, REFERENCE_BUILDS.esports);
  const fails = [];
  const check = (prep, code) => { const keep = { ...pc.cables }, slots = { ...pc.slots }; prep(); const r = powerOn(s, pc); fails.push([code, r.problems[0] && r.problems[0].code]); pc.cables = keep; pc.slots = slots; };
  check(() => delete pc.cables.panel, 'panel');
  check(() => delete pc.cables.atx24, 'atx24');
  check(() => { pc.cables.atx24 = 'loose'; }, 'atx24loose');
  check(() => delete pc.cables.cpu8, 'cpu8');
  check(() => { pc.cables.cpu8 = 'loose'; }, 'cpu8loose');
  check(() => delete pc.cables.pcie0, 'pcie');
  for (const z of PC.storageZones(s, pc)) if (z.startsWith('m2_')) check(() => { delete pc.slots[z]; }, 'nodrive');
  for (const [want, got] of fails) assert.equal(got, want, JSON.stringify(fails));
  // unplugged cooler fan is only a warning at boot, but the CPU overheats
  delete pc.cables.cpufan;
  const r = powerOn(s, pc);
  assert.ok(r.os);
  assert.ok(r.warnings.some(w => w.code === 'cpufan'));
  assert.ok(SIM.thermals(SIM.snapshot(s, pc), 1).cpu > 90);
});

test('thermal paste and dust change temperatures', () => {
  const g = rich(fresh()), s = g.state;
  const pc = benchMachine(g, REFERENCE_BUILDS.gaming);
  const t = () => SIM.thermals(SIM.snapshot(s, pc), 1).cpuRaw;
  const good = t();
  pc.paste.state = 'dried';
  const dried = t();
  pc.paste.state = 'none';
  const none = t();
  pc.paste.state = 'good';
  pc.dust = 90;
  const dusty = t();
  assert.ok(good < dried && dried < none, `${good} < ${dried} < ${none}`);
  assert.ok(dusty > good + 5, `dust raises temps (${good} → ${dusty})`);
  assert.ok(none >= 108, 'no paste on a 125 W CPU means a thermal shutdown');
});

// ---------------------------------------------------------------- every reference build works

test('every build brief can be met within budget at its tier', () => {
  for (const b of BUILDS) {
    const spec = REFERENCE_BUILDS[b.id];
    assert.ok(spec, `reference build for ${b.id}`);
    assert.deepEqual(errorsOf(spec), [], b.id);
    const price = Object.entries(spec).filter(([k]) => k !== 'os' || true).flatMap(([, v]) => (Array.isArray(v) ? v : [v])).filter(Boolean).reduce((a, i) => a + PART[i].price, 0);
    assert.ok(price <= b.budget[0] - 100, `${b.id}: parts $${price} leave a profit under the $${b.budget[0]} minimum budget`);
    for (const id of Object.values(spec).flat().filter(Boolean)) assert.ok(PART[id].tier <= Math.max(2, b.tier + 1) || PART[id].tier <= 5, id);
    const g = rich(fresh(3)), s = g.state;
    const pc = benchMachine(g, spec, { os: spec.os });
    s.parts[pc.slots.mb].bios.xmp = true;
    for (const t of ['stability', 'cpuBench', 'gpuBench', 'temps']) { const r = g.runTool(pc.uid, t); assert.ok(r.ok && r.record.ok, `${b.id} ${t}: ${r.reason || r.lines.join(' / ')}`); }
    g.runTool(pc.uid, 'stability');
    const job = { id: 'jx', kind: 'build', tier: b.tier, customer: 'dev', req: { ...b.req, partsCap: b.req.partsCap ? b.budget[0] - 80 : undefined }, tests: ['boot', 'stability', 'cpuBench'], bonus: [], machines: [], delivered: [], status: 'active', deadline: 9 };
    s.jobs.jx = job;
    g.powerOn(pc.uid);
    pc.closed = true;
    const chk = J.checkJob(s, job, pc);
    assert.ok(chk.canDeliver, `${b.id}: ${chk.rows.filter(r => !r.ok).map(r => `${r.label} (${r.detail})`).join('; ')}`);
  }
});

test('every customer machine is valid and healthy before faults are added', () => {
  for (const m of MACHINES) {
    assert.deepEqual(errorsOf(m.spec), [], m.id);
    const g = rich(fresh()), s = g.state;
    const pc = benchMachine(g, m.spec, { owner: 'jx', os: m.os });
    if (m.bios) Object.assign(s.parts[pc.slots.mb].bios, m.bios);
    assert.deepEqual(J.healthIssues(s, pc).map(i => i.msg), [], m.id);
    const r = g.runTool(pc.uid, 'stability');
    assert.ok(r.record.ok, `${m.id}: ${r.lines.join(' / ')}`);
  }
});

// ---------------------------------------------------------------- diagnosis and repair of every fault

const FAULT_CHECK = {
  psu_dead: (g, pc) => g.powerOn(pc.uid).boot.problems[0].code === 'psudead' && g.runTool(pc.uid, 'psu').evidence[0].level === 'bad',
  psu_unstable: (g, pc) => g.runTool(pc.uid, 'stability').record.cause === 'power' && g.runTool(pc.uid, 'psu').evidence[0].level === 'bad',
  ram_errors: (g, pc) => g.runTool(pc.uid, 'memtest').evidence.some(e => e.level === 'bad'),
  disk_failing: (g, pc) => g.runTool(pc.uid, 'storage').evidence.some(e => e.level === 'bad'),
  gpu_artifacts: (g, pc) => ['gpu'].includes(g.runTool(pc.uid, 'stability').record.cause),
  gpu_dead: (g, pc) => g.powerOn(pc.uid).boot.problems[0].code === 'gpudead',
  bios_boot: (g, pc) => g.powerOn(pc.uid).boot.problems[0].code === 'bootorder',
  bios_fan: (g, pc) => g.runTool(pc.uid, 'temps').evidence.some(e => e.tag === 'bios:fan'),
  bios_volt: (g, pc) => !g.runTool(pc.uid, 'stability').record.ok,
  malware: (g, pc) => g.runTool(pc.uid, 'syscheck').evidence.some(e => e.tag === 'malware'),
  os_corrupt: (g, pc) => g.powerOn(pc.uid).boot.problems[0].code === 'oscorrupt',
  cable_loose: (g, pc) => { g.setClosed(pc.uid, false); return g.runTool(pc.uid, 'visual').evidence.some(e => e.tag.startsWith('cable:') && e.level === 'bad'); },
  fan_unplugged: (g, pc) => g.powerOn(pc.uid).boot.warnings.some(w => w.code === 'cpufan'),
  dust: (g, pc) => { g.setClosed(pc.uid, false); return g.runTool(pc.uid, 'visual').evidence.some(e => e.tag === 'dust' && e.level === 'bad'); },
  paste_dried: (g, pc) => g.runTool(pc.uid, 'thermalcam').evidence.some(e => e.tag === 'paste'),
  cooler_dead: (g, pc) => g.powerOn(pc.uid).evidence.some(e => e.tag === 'coolerfan'),
  mb_dead: (g, pc) => g.powerOn(pc.uid).boot.problems[0].code === 'mbdead' && g.runTool(pc.uid, 'postcard').lines[0].includes('00'),
};

function replace(g, pc, zone) {
  const s = g.state;
  const old = s.parts[pc.slots[zone]];
  if (zone === 'cooler') { assert.ok(g.remove(pc.uid, 'cooler').ok); assert.ok(g.cleanPaste(pc.uid).ok); assert.ok(g.applyPaste(pc.uid, 45).ok); }
  else assert.ok(g.remove(pc.uid, zone).ok, zone);
  const fresh = shelf(g, old.id);
  const r = g.install(pc.uid, fresh, zone, 0);
  assert.ok(r.ok, r.reason);
  for (const c of PC.cableList(s, pc)) if (c.ok && pc.cables[c.key] !== 'ok') assert.ok(g.connect(pc.uid, c.key).ok, c.key);
}

const FIXES = {
  psu_dead: (g, pc) => replace(g, pc, 'psu'),
  psu_unstable: (g, pc) => replace(g, pc, 'psu'),
  ram_errors: (g, pc) => { const z = Object.keys(pc.slots).find(z => z.startsWith('ram') && g.state.parts[pc.slots[z]].fault); replace(g, pc, z); },
  gpu_artifacts: (g, pc) => replace(g, pc, 'gpu'),
  gpu_dead: (g, pc) => replace(g, pc, 'gpu'),
  cooler_dead: (g, pc) => replace(g, pc, 'cooler'),
  mb_dead: null,
  bios_boot: (g, pc) => assert.ok(g.setBios(pc.uid, 'boot', 'auto').ok),
  bios_fan: (g, pc) => assert.ok(g.setBios(pc.uid, 'fan', 'standard').ok),
  bios_volt: (g, pc) => assert.ok(g.resetBios(pc.uid).ok),
  malware: (g, pc) => assert.ok(g.runTool(pc.uid, 'malware').record.ok),
  os_corrupt: (g, pc) => assert.ok(g.repairOS(pc.uid).ok),
  cable_loose: (g, pc) => { for (const k of Object.keys(pc.cables)) if (pc.cables[k] === 'loose') assert.ok(g.connect(pc.uid, k).ok); },
  fan_unplugged: (g, pc) => assert.ok(g.connect(pc.uid, 'cpufan').ok),
  dust: (g, pc) => { while (pc.dust >= 15) assert.ok(g.blowDust(pc.uid).ok); },
  paste_dried: (g, pc) => { const c = pc.slots.cooler; assert.ok(g.remove(pc.uid, 'cooler').ok); assert.ok(g.cleanPaste(pc.uid).ok); assert.ok(g.applyPaste(pc.uid, 45).ok); assert.ok(g.install(pc.uid, c, 'cooler').ok); assert.ok(g.connect(pc.uid, 'cpufan').ok); },
  disk_failing: (g, pc) => {
    // the natural repair: new drive, fresh OS on it, copy the files over, take the old one out
    const s = g.state;
    const oldZone = PC.storageZones(s, pc).find(z => s.parts[pc.slots[z]].fault === 'failing');
    const old = s.parts[pc.slots[oldZone]];
    const ssd = shelf(g, 'sto-pebble-1t');
    const free = PC.zoneList(s, pc).find(z => z.startsWith('bay') && !pc.slots[z] && PC.canInstall(s, pc, ssd, z).ok);
    assert.ok(free, 'a free bay');
    assert.ok(g.install(pc.uid, ssd, free).ok);
    for (const c of PC.cableList(s, pc)) if (c.ok && !pc.cables[c.key]) assert.ok(g.connect(pc.uid, c.key).ok);
    const os = g.installOS(pc.uid, 'os-fernix', ssd);
    assert.ok(os.ok, os.reason);
    const rec = g.recoverFiles(old.uid, ssd);
    assert.ok(rec.ok, rec.reason);
    assert.ok(g.remove(pc.uid, oldZone).ok);
    assert.ok(g.installDrivers(pc.uid).ok);
  },
};

test('every fault shows evidence with the right tool, and the right fix clears it', () => {
  for (const [fault, def] of Object.entries(FAULT_DEFS)) {
    const machine = MACHINES.find(m => (!def.needs || m.spec.gpu) && m.id !== 'creator' && (fault !== 'disk_failing' || m.spec.storage.length >= 1));
    const g = rich(fresh(11)), s = g.state;
    const pc = benchMachine(g, machine.spec, { owner: 'jx', os: machine.os, files: [{ label: 'Family photos', gb: 20 }] });
    if (machine.bios) Object.assign(s.parts[pc.slots.mb].bios, machine.bios);
    J.applyFault(s, pc, fault, rngFor(1, fault));
    if (fault === 'malware') s.parts[PC.storageZones(s, pc).map(z => pc.slots[z]).find(u => s.parts[u].data.os)].data.malware = 2;
    assert.ok(J.healthIssues(s, pc).length > 0, `${fault} leaves a visible problem`);
    morning(g);
    assert.ok(FAULT_CHECK[fault](g, pc), `${fault} is detectable`);
    if (!FIXES[fault]) continue;
    morning(g);
    g.setClosed(pc.uid, false);
    FIXES[fault](g, pc);
    morning(g);
    assert.deepEqual(J.healthIssues(s, pc).map(i => i.msg), [], `${fault} fixed`);
    const st = g.runTool(pc.uid, 'stability');
    assert.ok(st.ok && st.record.ok, `${fault}: stability after the fix: ${st.reason || st.lines.join(' / ')}`);
    const job = { id: 'jx', customer: 'marta' };
    assert.equal(J.filesPct(s, job, pc), 100, `${fault}: files kept`);
  }
});

test('a rootkit needs ClamShield Pro — or a backup and reinstall', () => {
  const g = rich(fresh()), s = g.state;
  delete s.tools.clampro;
  const m = MACHINES.find(x => x.id === 'family');
  const pc = benchMachine(g, m.spec, { owner: 'jx', os: m.os, files: [{ label: 'Thesis', gb: 3 }] });
  const drive = s.parts[pc.slots.bay25_0] || s.parts[pc.slots[PC.storageZones(s, pc)[0]]];
  drive.data.malware = 3;
  const r = g.runTool(pc.uid, 'malware');
  assert.equal(r.record.ok, false);
  assert.equal(drive.data.malware, 3);
  s.tools.clampro = true;
  morning(g);
  assert.ok(g.runTool(pc.uid, 'malware').record.ok);
  assert.equal(drive.data.malware, 0);
  assert.equal(drive.data.files.length, 1, 'files kept');
});

test('installing an OS wipes the drive and its files', () => {
  const g = rich(fresh()), s = g.state;
  const pc = benchMachine(g, REFERENCE_BUILDS.office, { owner: 'jx', files: [{ label: 'Tax records', gb: 4 }] });
  const drive = pc.slots.bay25_0;
  s.licenses['os-lumen-home'] = 1;
  const r = g.installOS(pc.uid, 'os-lumen-home', drive);
  assert.ok(r.ok);
  assert.deepEqual(r.lost.map(f => f.label), ['Tax records']);
  assert.equal(J.filesPct(s, { id: 'jx' }, pc), 0);
});

// ---------------------------------------------------------------- jobs, rewards and penalties

function acceptRepair(g, kind = 'repair', tier = 1) {
  const s = g.state;
  const job = J.makeJob(s, rngFor(s.seed, 'test', kind, tier, s.nextUid), tier, kind);
  s.jobs[job.id] = job;
  assert.ok(g.accept(job.id).ok);
  return job;
}

test('a repair can be diagnosed, fixed, tested, delivered and paid', () => {
  const g = rich(fresh(5)), s = g.state;
  const marta = Object.values(s.jobs).find(j => j.customer === 'marta');
  assert.ok(g.accept(marta.id).ok);
  const pcU = marta.machines[0];
  assert.ok(g.toBench(pcU, 0).ok);
  assert.equal(g.powerOn(pcU).boot.problems[0].code, 'atx24loose');
  g.setClosed(pcU, false);
  const vis = g.runTool(pcU, 'visual');
  assert.ok(vis.evidence.some(e => e.tag === 'cable:atx24'));
  assert.ok(vis.evidence.some(e => e.tag === 'dust' && e.level === 'bad'));
  assert.ok(g.connect(pcU, 'atx24').ok);
  assert.ok(g.blowDust(pcU).ok);
  assert.ok(!g.deliver(marta.id, pcU).ok, 'untested machines can\'t be delivered');
  g.setClosed(pcU, true);
  assert.ok(g.powerOn(pcU).boot.os);
  for (const t of marta.tests.filter(t => t !== 'boot')) assert.ok(g.runTool(pcU, t).record.ok, t);
  const money0 = s.money, rep0 = s.reputation;
  const r = g.deliver(marta.id, pcU, {});
  assert.ok(r.ok, r.reason);
  assert.equal(marta.status, 'completed');
  assert.ok(r.result.sat >= 75, `satisfaction ${r.result.sat}`);
  assert.ok(s.money > money0 && s.reputation > rep0);
  assert.ok(!s.pcs[pcU], 'the machine went home');
  assert.ok(!Object.values(s.parts).some(p => p.owner === marta.id), 'no customer parts left behind');
  assert.equal(s.stats.repairs, 1);
  assert.ok(s.milestones['first-job']);
});

test('test results go out of date when the machine changes', () => {
  const g = rich(fresh()), s = g.state;
  const pc = benchMachine(g, REFERENCE_BUILDS.office);
  pc.closed = true;
  assert.ok(g.runTool(pc.uid, 'stability').record.ok);
  const fp = PC.fingerprint(s, pc);
  assert.equal(pc.tests.stability.hash, fp);
  g.setClosed(pc.uid, false);
  assert.equal(PC.fingerprint(s, pc), fp, 'opening the panel alone doesn\'t invalidate tests');
  assert.ok(g.remove(pc.uid, 'fan:front0').ok);
  assert.notEqual(PC.fingerprint(s, pc), fp);
  const job = { id: 'jx', kind: 'build', customer: 'dev', req: { ramGB: 8 }, tests: ['stability'], bonus: [], machines: [], delivered: [] };
  s.jobs.jx = job;
  pc.closed = true;
  assert.equal(J.checkJob(s, job, pc).canDeliver, false);
});

test('charging for a part that was not broken upsets the customer', () => {
  const run = (wrong) => {
    const g = rich(fresh(9)), s = g.state;
    const job = acceptRepair(g, 'malware');
    const pcU = job.machines[0];
    g.toBench(pcU, 0);
    const pc = g.pc(pcU);
    g.setClosed(pcU, false);
    if (wrong) { // swap a perfectly good PSU and bill for it
      const old = s.parts[pc.slots.psu].id;
      assert.ok(g.remove(pcU, 'psu').ok);
      assert.ok(g.install(pcU, shelf(g, old), 'psu').ok);
      for (const c of PC.cableList(s, pc)) if (c.ok && !pc.cables[c.key]) g.connect(pcU, c.key);
    }
    g.setClosed(pcU, true);
    morning(g);
    assert.ok(g.runTool(pcU, 'malware').record.ok);
    for (const t of job.tests.filter(t => t !== 'boot' && t !== 'malware')) assert.ok(g.runTool(pcU, t).record.ok, t);
    g.runTool(pcU, 'malware');
    const r = g.deliver(job.id, pcU, {});
    assert.ok(r.ok, r.reason);
    return r.result;
  };
  const honest = run(false), padded = run(true);
  assert.ok(padded.sat <= honest.sat - 10, `${honest.sat} vs ${padded.sat}`);
  assert.ok(padded.notes.includes('unneeded'));
});

test('overcharging lowers satisfaction; going over the budget is capped', () => {
  const g = rich(fresh(4)), s = g.state;
  const job = { id: 'jq', kind: 'repair', tier: 1, customer: 'dev', deadline: 9, fee: 100, budget: 150 };
  const fair = J.satisfaction(s, job, { invoice: 100, fair: 100 });
  const steep = J.satisfaction(s, job, { invoice: 140, fair: 100 });
  const cheap = J.satisfaction(s, job, { invoice: 80, fair: 100 });
  assert.ok(steep.score < fair.score - 20, 'frugal customers hate a 40% markup');
  assert.ok(cheap.score > fair.score);
  assert.ok(J.satisfaction(s, job, { invoice: 100, fair: 100, issues: [{ msg: 'dust' }] }).score < 50, 'comebacks hurt');
  assert.equal(J.stars(95), 5);
  assert.equal(J.stars(20), 1);
});

test('leaving a fault in place brings the customer back', () => {
  const g = rich(fresh(5)), s = g.state;
  const marta = Object.values(s.jobs).find(j => j.customer === 'marta');
  g.accept(marta.id);
  const pcU = marta.machines[0];
  g.toBench(pcU, 0);
  marta.tests = ['boot', 'stability']; // a lax checklist that doesn't catch dust
  g.setClosed(pcU, false);
  g.connect(pcU, 'atx24');
  g.setClosed(pcU, true);
  g.powerOn(pcU);
  assert.ok(g.runTool(pcU, 'stability').record.ok);
  const money0 = s.money;
  const r = g.deliver(marta.id, pcU, {});
  assert.ok(r.ok);
  assert.ok(r.result.issues.some(i => /dust/i.test(i)));
  assert.ok(r.result.refund > 0);
  assert.ok(r.result.rep < 0);
  assert.equal(s.stats.comebacks, 1);
  assert.ok(r.result.paid - r.result.refund < marta.fee);
  void money0;
});

test('cancelled and failed jobs return your parts and cost reputation', () => {
  const g = rich(fresh(6)), s = g.state;
  const job = acceptRepair(g, 'repair');
  const pcU = job.machines[0];
  g.toBench(pcU, 0);
  const pc = g.pc(pcU);
  g.setClosed(pcU, false);
  const oldPsu = s.parts[pc.slots.psu].id;
  assert.ok(g.remove(pcU, 'psu').ok);
  const mine = shelf(g, oldPsu);
  assert.ok(g.install(pcU, mine, 'psu').ok);
  const rep0 = s.reputation;
  assert.ok(g.cancel(job.id).ok);
  assert.equal(job.status, 'cancelled');
  assert.ok(s.inventory.includes(mine), 'your PSU came back to the shelf');
  assert.ok(!Object.values(s.parts).some(p => p.owner === job.id), 'customer parts left with the customer');
  assert.ok(!s.pcs[pcU] && !s.benches.includes(pcU));
  assert.equal(s.reputation, rep0 - 3);
  // failing at the deadline
  const late = acceptRepair(g, 'repair');
  late.deadline = s.day;
  const rep1 = s.reputation;
  g.endDay(); // day of the deadline → late but allowed
  assert.equal(late.status, 'active');
  g.endDay(); // past the grace day → failed
  assert.equal(late.status, 'failed');
  assert.ok(s.reputation < rep1);
  assert.equal(s.stats.failed, 1);
  assert.ok(!late.machines.some(u => s.pcs[u]));
});

test('offers expire and new ones arrive every morning', () => {
  const g = fresh(12), s = g.state;
  const first = Object.values(s.jobs).filter(j => j.status === 'offered');
  assert.equal(first.length, 3);
  for (let i = 0; i < 4; i++) g.endDay();
  assert.ok(first.every(j => j.status === 'expired'));
  assert.ok(first.every(j => j.machines.every(u => !s.pcs[u])), 'expired offers don\'t leave machines behind');
  assert.ok(Object.values(s.jobs).some(j => j.status === 'offered'));
});

test('multiple jobs and machines can be in progress at once', () => {
  const g = rich(fresh(13)), s = g.state;
  assert.ok(g.buyUpgrade('bench2').ok);
  assert.equal(s.benches.length, 2);
  const a = acceptRepair(g, 'repair'), b = acceptRepair(g, 'malware'), c = acceptRepair(g, 'recovery');
  assert.equal(s.intake.length, 3);
  assert.ok(g.toBench(a.machines[0], 0).ok);
  assert.ok(g.toBench(b.machines[0], 1).ok);
  assert.match(g.toBench(c.machines[0], 0).reason, /occupied/);
  assert.ok(g.toRack(a.machines[0]).ok);
  assert.ok(g.toBench(c.machines[0], 0).ok);
  // the rack is full: more repair offers can't be accepted
  const d = J.makeJob(s, rngFor(1, 'd'), 1, 'repair'); s.jobs[d.id] = d;
  const e = J.makeJob(s, rngFor(1, 'e'), 1, 'repair'); s.jobs[e.id] = e;
  const f = J.makeJob(s, rngFor(1, 'f'), 1, 'repair'); s.jobs[f.id] = f;
  assert.ok(g.accept(d.id).ok);
  assert.ok(g.accept(e.id).ok);
  assert.match(g.accept(f.id).reason, /intake rack/);
});

test('a fleet contract needs every machine and pays per delivery', () => {
  const g = rich(fresh(14)), s = g.state;
  const job = J.makeJob(s, rngFor(1, 'fleet'), 5, 'fleet');
  job.count = 2;
  s.jobs[job.id] = job;
  g.accept(job.id);
  const deliverOne = () => {
    const pc = benchMachine(g, REFERENCE_BUILDS.office);
    pc.closed = true;
    morning(g);
    g.powerOn(pc.uid);
    for (const t of ['stability', 'cpuBench']) g.runTool(pc.uid, t);
    return g.deliver(job.id, pc.uid);
  };
  const r1 = deliverOne();
  assert.ok(r1.ok && r1.partial);
  assert.equal(job.status, 'active');
  const r2 = deliverOne();
  assert.ok(r2.ok && !r2.partial, r2.reason);
  assert.equal(job.status, 'completed');
  assert.equal(s.stats.contracts, 1);
});

test('generated jobs are always well-formed and their machines are sound', () => {
  const g = rich(fresh(15)), s = g.state;
  for (let i = 0; i < 160; i++) {
    const tier = 1 + (i % 5);
    const kinds = tier === 5 ? ['fleet', 'contract'] : ['repair', 'build', 'upgrade', 'recovery', 'malware', 'thermal'];
    const kind = kinds[i % kinds.length];
    const job = J.makeJob(s, rngFor(99, i), tier, kind);
    assert.ok(job.title && job.story && job.customer, `${kind} text`);
    assert.ok(job.budget > 0 && job.deadline > s.day, `${kind} money/deadline`);
    assert.ok(job.tests.includes('boot') && job.tests.includes('stability'));
    for (const u of job.machines) {
      const pc = s.pcs[u];
      assert.ok(pc && pc.owner === job.id);
      assert.deepEqual(analyzeSpec(SIM.specOf(s, pc)).filter(x => x.level === 'error').map(x => x.msg), [], `${job.machine} spec`);
      if (kind !== 'upgrade') assert.ok(J.healthIssues(s, pc).length > 0, `${kind} ${job.faults} has something to fix`);
    }
    if (kind === 'build' || kind === 'fleet') assert.ok(job.req.cpuMark > 0);
    if (job.kind !== 'build' && job.kind !== 'fleet') assert.ok(job.fee > 0 && job.budget >= job.fee);
  }
});

test('customer tiers unlock with level, reputation and upgrades', () => {
  const g = fresh(), s = g.state;
  assert.deepEqual(J.unlockedTiers(s), [1]);
  s.level = 3; s.reputation = 35;
  assert.deepEqual(J.unlockedTiers(s), [1, 2, 3]);
  s.level = 5; s.reputation = 70;
  assert.deepEqual(J.unlockedTiers(s), [1, 2, 3]);
  s.upgrades.showroom = 1; s.upgrades.cert = 1;
  assert.deepEqual(J.unlockedTiers(s), [1, 2, 3, 4, 5]);
  for (const c of CUSTOMERS) assert.ok(PERSONALITIES[c.trait], c.id);
  for (const t of TIERS) assert.ok(CUSTOMERS.some(c => c.tier === t.tier), `customers for tier ${t.tier}`);
});

// ---------------------------------------------------------------- economy

test('money and inventory update correctly on every transaction', () => {
  const g = fresh(16), s = g.state;
  const m0 = s.money;
  assert.ok(g.buy('cpu-arc-k3-1210').ok);
  assert.equal(s.money, m0 - 105);
  assert.equal(s.inventory.filter(u => s.parts[u].id === 'cpu-arc-k3-1210').length, 1, 'tier-1 parts are in stock');
  const r = g.buy('cpu-arc-k5-1260');
  assert.ok(r.ok && r.days === 1);
  assert.equal(s.orders.length, 1);
  assert.ok(!s.inventory.some(u => s.parts[u].id === 'cpu-arc-k5-1260'));
  const m1 = s.money;
  assert.ok(g.buy('gpu-nr-3060', 1, true).ok, 'express');
  assert.equal(s.money, m1 - 300 - 36, 'express fee is 12%');
  assert.ok(s.inventory.some(u => s.parts[u].id === 'gpu-nr-3060'), 'express on a 1-day part arrives now');
  assert.ok(g.cancelOrder(s.orders[0].id).ok);
  assert.equal(s.money, m1 - 336 + 220);
  // sell back at the resale price
  const uid = s.inventory.find(u => s.parts[u].id === 'cpu-arc-k3-1210');
  const before = s.money;
  const sold = g.sell(uid);
  assert.ok(sold.ok);
  assert.equal(s.money, before + Math.round(105 * 0.6));
  assert.ok(!s.parts[uid]);
  // ordered parts arrive overnight
  assert.ok(g.buy('mb-ostrava-b66').ok);
  g.endDay();
  assert.ok(s.inventory.some(u => s.parts[u].id === 'mb-ostrava-b66'));
  // ledger matches the balance
  const sum = s.ledger.reduce((a, l) => a + l.amount, 0);
  assert.equal(s.money, m0 + sum);
});

test('insufficient money and full shelves block purchases', () => {
  const g = fresh(17), s = g.state;
  s.money = 50;
  assert.match(g.buy('cpu-arc-k3-1210').reason, /Not enough money/);
  assert.match(g.buyTool('datarescue').reason, /Not enough money/);
  assert.match(g.buyUpgrade('shelf1').reason, /Not enough money/);
  s.money = 1e6;
  let bought = 0;
  while (g.buy('case-boxwell-mini').ok) bought++;
  assert.ok(bought >= 8);
  assert.match(g.buy('case-boxwell-mini').reason, /shelf space/);
  assert.ok(B.shelfUsed(s) <= B.capacity(s));
  assert.ok(g.buyUpgrade('shelf1').ok);
  assert.ok(g.buy('case-boxwell-mini').ok);
  // customer parts and drives with someone's files can't be sold
  const d = makePart(s, 'sto-pebble-240', { owner: 'shop', data: { os: null, osOk: true, drivers: false, malware: 0, files: [{ label: 'X', gb: 1, owner: 'j1' }] } });
  s.inventory.push(d.uid);
  assert.match(g.sell(d.uid).reason, /files/);
});

test('rent, subscriptions and the bargain bin run on schedule', () => {
  const g = fresh(18), s = g.state;
  g.setSub('ads', true);
  const m0 = s.money;
  for (let i = 0; i < 7; i++) g.endDay();
  assert.equal(s.day, 8);
  assert.ok(s.ledger.some(l => l.kind === 'rent'));
  assert.equal(s.ledger.filter(l => l.kind === 'subs').length, 7);
  assert.ok(s.money < m0);
  assert.ok(s.bargains.length > 0);
  const b = s.bargains[0];
  const r = g.buyBargain(b.key);
  assert.ok(r.ok);
  assert.ok(s.parts[r.uid].used);
});

test('levels, upgrades and milestones progress the business', () => {
  const g = fresh(19), s = g.state;
  assert.equal(B.levelFor(0), 1);
  assert.equal(B.levelFor(260), 2);
  g.gainXp(800);
  assert.equal(s.level, 3);
  assert.ok(s.milestones['level-3']);
  s.money = 1e5;
  assert.match(g.buyUpgrade('bench3').reason, /level 4/i);
  assert.ok(g.buyUpgrade('bench2').ok);
  assert.ok(g.buyUpgrade('supplier').ok);
  assert.ok(E.forSale(s).some(d => d.tier === 3));
  assert.equal(B.timeFactor(s, 'install'), 1);
  assert.ok(g.buyUpgrade('magkit').ok);
  assert.equal(B.timeFactor(s, 'install'), 0.7);
});

test('every action takes time and the workday ends', () => {
  const g = rich(fresh(20)), s = g.state;
  const pc = benchMachine(g, REFERENCE_BUILDS.office);
  s.minute = DAY_END - 10;
  assert.match(g.runTool(pc.uid, 'stability').reason, /closes/);
  g.endDay();
  assert.equal(s.minute, 9 * 60);
  const r = g.runTool(pc.uid, 'stability');
  assert.ok(r.ok && s.minute === 9 * 60 + r.minutes);
});

// ---------------------------------------------------------------- saving

test('save and reload keeps everything, including builds in progress', () => {
  const g = rich(fresh(21)), s = g.state;
  const job = Object.values(s.jobs).find(j => j.customer === 'marta');
  g.accept(job.id);
  g.toBench(job.machines[0], 0);
  s.benches.push(null); s.upgrades.bench2 = 1;
  g.placeCase(1, shelf(g, 'case-boxwell-towerm'));
  const build = g.pc(s.benches[1]);
  g.install(build.uid, shelf(g, 'mb-ostrava-h61m'), 'mb');
  assert.ok(g.buy('cpu-arc-k9-1390').days >= 1);
  g.setSub('club', true);
  g.save();
  const loaded = SAVE.loadGame(g.storage);
  assert.ok(loaded.state);
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.state)), JSON.parse(JSON.stringify(SAVE.sanitizeState(JSON.parse(JSON.stringify(s))))));
  const t = loaded.state;
  assert.equal(t.money, s.money);
  assert.equal(t.benches[0], job.machines[0]);
  assert.equal(t.pcs[t.benches[1]].slots.mb, build.slots.mb);
  assert.equal(t.orders.length, 1);
  assert.equal(t.jobs[job.id].status, 'active');
  assert.ok(t.subs.club);
  assert.deepEqual(t.tools, s.tools);
  // a reloaded game keeps playing
  const g2 = new Game(t);
  assert.ok(g2.powerOn(job.machines[0]).ok);
  g2.endDay();
  assert.ok(t.inventory.some(u => t.parts[u].id === 'cpu-arc-k9-1390'));
});

test('damaged saves are repaired or set aside, never loaded half-broken', () => {
  const st = SAVE.memoryStorage();
  st.setItem('silicon-dreams-save', '{not json');
  const r = SAVE.loadGame(st);
  assert.equal(r.state, null);
  assert.ok(r.error);
  assert.equal(SAVE.sanitizeState({ parts: 3 }), null);
  const g = fresh(22), s = g.state;
  const raw = JSON.parse(JSON.stringify(s));
  const someUid = raw.inventory[0];
  raw.inventory.push(someUid, 'p-nope');
  raw.parts.bogus = { uid: 'bogus', id: 'not-a-part' };
  raw.money = 'lots';
  raw.benches = ['pc-missing'];
  raw.consumables.paste = -4;
  const t = SAVE.sanitizeState(raw);
  assert.equal(new Set(t.inventory).size, t.inventory.length, 'no duplicates');
  assert.ok(!t.parts.bogus && !t.inventory.includes('p-nope'));
  assert.equal(t.money, 0);
  assert.equal(t.benches[0], null);
  assert.equal(t.consumables.paste, 0);
  // offered jobs' machines don't show up on the rack after loading
  assert.equal(t.intake.length, 0);
  // settings are clamped
  assert.equal(SAVE.sanitizeSettings({ textSize: 900, sound: 'yes' }).textSize, 150);
  assert.equal(SAVE.sanitizeSettings({ textSize: 900, sound: 'yes' }).sound, true);
});

test('resetting the save removes it', () => {
  const g = fresh(23);
  g.save();
  assert.ok(SAVE.hasSave(g.storage));
  SAVE.deleteSave(g.storage);
  assert.ok(!SAVE.hasSave(g.storage));
});

// Diagnostic tools, consumables and workshop upgrades. Effects are read by core/business.js.
// `level` is the workshop level needed to buy it.

export const TOOLS = [
  { id: 'screwdriver', name: 'Precision screwdriver kit', price: 0, start: true, desc: 'Opens cases and mounts parts. You can\'t work without it.' },
  { id: 'flashlight', name: 'Inspection flashlight', price: 0, start: true, desc: 'Visual inspection: dust, cables, scorch marks, bulging capacitors.' },
  { id: 'syscheck', name: 'SysCheck OS diagnostics', price: 0, start: true, desc: 'Reads the OS event log, drivers, startup programs and system files.' },
  { id: 'tempeye', name: 'TempEye monitor', price: 0, start: true, desc: 'Shows CPU/GPU temperatures and fan speeds at idle and under load.' },
  { id: 'blazemark', name: 'Blazemark benchmarks', price: 0, start: true, desc: 'CPU and GPU benchmarks with an expected score for the hardware.' },
  { id: 'stressrack', name: 'StressRack stability test', price: 0, start: true, desc: '30-minute full-load test of CPU, GPU, memory and power.' },
  { id: 'clamshield', name: 'ClamShield Free', price: 0, start: true, desc: 'Malware scanner. Removes adware and trojans; can detect but not remove rootkits.' },
  { id: 'memsweep', name: 'MemSweep boot USB', price: 0, start: true, desc: 'Boots a memory test that checks every stick, slot by slot (45 min).' },
  { id: 'psutester', name: 'Voltaic PSU tester', price: 45, level: 1, desc: 'Plugs into the 24-pin cable and reads every voltage rail.' },
  { id: 'diskdoctor', name: 'DiskDoctor', price: 40, level: 1, desc: 'Reads drive health (S.M.A.R.T.): bad sectors, wear, failure warnings.' },
  { id: 'datarescue', name: 'DataRescue dock', price: 150, level: 1, desc: 'Copies files off a drive, even a failing one, onto another drive.' },
  { id: 'postcard', name: 'POST debug card', price: 70, level: 2, desc: 'Shows the boot error code when there\'s no picture — pinpoints CPU, memory, video or board faults.' },
  { id: 'clampro', name: 'ClamShield Pro', price: 120, level: 2, desc: 'Removes every kind of malware, rootkits included, without touching personal files.' },
  { id: 'memsweep_pro', name: 'MemSweep Pro', price: 90, level: 2, desc: 'Memory test in 15 minutes instead of 45.' },
  { id: 'thermalcam', name: 'Thermal camera', price: 380, level: 3, desc: 'See heat directly: works without an OS and shows whether heat reaches the cooler.' },
  { id: 'datarescue_pro', name: 'DataRescue Pro clean bench', price: 650, level: 4, desc: 'Recovers most files even from dead drives.' },
];
export const TOOL = Object.fromEntries(TOOLS.map(t => [t.id, t]));

export const SUPPLIES = [
  { id: 'paste', name: 'Thermal paste tube', adds: 5, price: 9, desc: '5 applications.' },
  { id: 'air', name: 'Compressed air can', adds: 3, price: 8, desc: '3 cleanings.' },
  { id: 'wipes', name: 'Isopropyl wipes', adds: 10, price: 5, desc: 'Cleans old thermal paste. 10 wipes.' },
];
export const SUPPLY = Object.fromEntries(SUPPLIES.map(s => [s.id, s]));

// one-time workshop investments
export const UPGRADES = [
  { id: 'bench2', name: 'Second workbench', price: 900, level: 2, desc: 'Work on two machines at once.', effect: { benches: 1 } },
  { id: 'bench3', name: 'Third workbench', price: 2200, level: 4, requires: 'bench2', desc: 'A third bench for big contracts.', effect: { benches: 1 } },
  { id: 'shelf1', name: 'Extra shelving', price: 300, level: 1, desc: '+20 shelf space for parts.', effect: { capacity: 20 } },
  { id: 'shelf2', name: 'Warehouse racking', price: 900, level: 3, requires: 'shelf1', desc: '+40 shelf space.', effect: { capacity: 40 } },
  { id: 'intake', name: 'Bigger intake rack', price: 400, level: 2, desc: 'Room for 3 more customer machines.', effect: { intake: 3 } },
  { id: 'magkit', name: 'Magnetic driver set & parts trays', price: 250, level: 1, desc: 'Installing and removing parts takes 30% less time.', effect: { installSpeed: 0.3 } },
  { id: 'testrig', name: 'Dedicated test station', price: 1200, level: 3, desc: 'Software tasks and tests take 35% less time.', effect: { testSpeed: 0.35 } },
  { id: 'supplier', name: 'Trade supplier account', price: 600, level: 2, desc: 'Unlocks tier-3 hardware; standard shipping is a day faster.', effect: { supplierTier: 1, shipDays: 1 } },
  { id: 'distributor', name: 'Distributor account', price: 1800, level: 4, requires: 'supplier', desc: 'Unlocks flagship hardware; express orders arrive same day.', effect: { supplierTier: 2, sameDay: true } },
  { id: 'showroom', name: 'Showroom front', price: 1800, level: 3, desc: 'A display window that attracts premium customers.', effect: { premium: true } },
  { id: 'cert', name: 'Specialist certification', price: 3000, level: 5, desc: 'Qualifies the shop for specialist repair and fleet contracts.', effect: { contracts: true } },
  { id: 'lighting', name: 'Bench lighting', price: 150, level: 1, desc: 'Brighter workshop. Visual inspection is 50% faster.', effect: { visualSpeed: 0.5 } },
];
export const UPGRADE = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

// optional recurring costs the player can switch on or off in the Business screen
export const SUBSCRIPTIONS = [
  { id: 'ads', name: 'Local advertising', cost: 20, every: 1, desc: '$20 a day: one extra job offer every day, and offers lean toward bigger jobs.' },
  { id: 'club', name: 'Parts Club membership', cost: 40, every: 7, desc: '$40 a week: 8% off every store purchase.' },
  { id: 'courier', name: 'Courier contract', cost: 30, every: 7, desc: '$30 a week: express shipping is free.' },
];
export const SUBSCRIPTION = Object.fromEntries(SUBSCRIPTIONS.map(s => [s.id, s]));

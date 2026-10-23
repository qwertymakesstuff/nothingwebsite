// The component database: every part definition from parts/*.js, tagged with its category and
// indexed by id. To add hardware, append an entry to the matching parts file; nothing else needs
// to change unless the part introduces a brand-new socket or form factor.

import { CPUS } from './parts/cpus.js';
import { MOTHERBOARDS } from './parts/motherboards.js';
import { GPUS } from './parts/gpus.js';
import { MEMORY } from './parts/memory.js';
import { STORAGE } from './parts/storage.js';
import { PSUS } from './parts/psus.js';
import { COOLERS } from './parts/coolers.js';
import { FANS } from './parts/fans.js';
import { CASES } from './parts/cases.js';
import { OPERATING_SYSTEMS } from './parts/os.js';

// display order, labels, shelf space per item and the fraction of the price a used part resells for
export const CATEGORIES = [
  { id: 'case', label: 'Cases', one: 'Case', size: 4, resale: 0.45, list: CASES },
  { id: 'motherboard', label: 'Motherboards', one: 'Motherboard', size: 2, resale: 0.5, list: MOTHERBOARDS },
  { id: 'cpu', label: 'CPUs', one: 'CPU', size: 1, resale: 0.6, list: CPUS },
  { id: 'cooler', label: 'CPU coolers', one: 'CPU cooler', size: 1, resale: 0.45, list: COOLERS },
  { id: 'ram', label: 'Memory', one: 'Memory stick', size: 1, resale: 0.5, list: MEMORY },
  { id: 'storage', label: 'Storage', one: 'Drive', size: 1, resale: 0.45, list: STORAGE },
  { id: 'psu', label: 'Power supplies', one: 'Power supply', size: 2, resale: 0.45, list: PSUS },
  { id: 'gpu', label: 'Graphics cards', one: 'Graphics card', size: 2, resale: 0.6, list: GPUS },
  { id: 'fan', label: 'Case fans', one: 'Case fan', size: 1, resale: 0.4, list: FANS },
  { id: 'os', label: 'Operating systems', one: 'OS licence', size: 0, resale: 0, list: OPERATING_SYSTEMS },
];

export const CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export const PARTS = [];
export const PART = {};
for (const c of CATEGORIES) for (const p of c.list) {
  const def = Object.freeze({ ...p, cat: c.id, full: `${p.brand} ${p.name}` });
  PARTS.push(def);
  PART[def.id] = def;
}

export const partsIn = cat => PARTS.filter(p => p.cat === cat);
export const def = id => PART[id] || null;

export const SOCKETS = [...new Set(CPUS.map(c => c.socket))];
export const MEM_TYPES = [...new Set(MEMORY.map(m => m.mem))];
export const FORMS = ['ATX', 'mATX', 'ITX'];

// human-readable spec rows for an inspection panel: [label, value]
export function specRows(d) {
  const r = [];
  const add = (l, v) => r.push([l, v]);
  switch (d.cat) {
    case 'cpu':
      add('Socket', d.socket); add('Cores / threads', `${d.cores} / ${d.threads}`); add('Boost clock', `${d.ghz.toFixed(1)} GHz`);
      add('Single-core', d.single); add('Multi-core', d.multi); add('Heat (TDP)', `${d.tdp} W`); add('Peak draw', `${d.peak} W`);
      add('Integrated graphics', d.igpu ? `Yes (${d.igpu * 100} GPU Mark)` : 'No — needs a graphics card'); add('Unlocked', d.unlocked ? 'Yes' : 'No'); break;
    case 'motherboard':
      add('Socket', d.socket); add('Form factor', d.form); add('Memory', `${d.mem}, ${d.ramSlots} slots, up to ${d.maxRam} GB`);
      add('M.2 slots', d.m2); add('SATA ports', d.sata); add('Fan headers', d.fanHeaders); add('PCIe', `Gen ${d.pcie}`); add('Memory profiles / OC', d.oc ? 'Yes' : 'No'); add('Power', `${d.watts} W`); break;
    case 'gpu':
      add('Chip', `${d.brand} ${d.name}`); add('Board maker', d.maker); add('Performance', `${d.perf * 100} GPU Mark`); add('VRAM', `${d.vram} GB`);
      add('Power', `${d.tdp} W`); add('Length', `${d.length} mm`); add('PCIe power', d.pins ? `${d.pins} × 8-pin` : 'Slot powered'); break;
    case 'ram':
      add('Type', d.mem); add('Capacity', `${d.gb} GB`); add('Rated speed', `${d.mhz} MT/s (with memory profile)`); add('Default speed', `${d.base} MT/s`); break;
    case 'storage':
      add('Type', { hdd: 'Hard disk', ssd: 'SATA SSD', nvme: 'NVMe SSD' }[d.kind]); add('Interface', d.iface === 'm2' ? 'M.2 slot' : `SATA, ${d.bay}" bay`);
      add('Capacity', d.gb >= 1000 ? `${d.gb / 1000} TB` : `${d.gb} GB`); add('Read speed', `${d.read} MB/s`); add('Power', `${d.watts} W`); if (d.noise) add('Noise', `${d.noise} dB`); break;
    case 'psu':
      add('Rated output', `${d.watts} W`); add('Form factor', d.form); add('Efficiency grade', d.grade); add('PCIe 8-pin cables', d.pcie); add('SATA power plugs', d.sataPower); add('Modular', d.modular ? 'Yes' : 'No'); add('Noise', `${d.noise} dB`); break;
    case 'cooler':
      add('Type', { air: 'Air tower', aio: 'Liquid (AIO)' }[d.type]); add('Cooling capacity', `${d.capacity} W`);
      if (d.type === 'air') add('Height', `${d.height} mm`); else add('Radiator', `${d.radiator} mm`);
      add('Sockets', d.sockets.join(', ')); add('Pre-applied paste', d.paste ? 'Yes' : 'No'); add('Noise', `${d.noise} dB`); break;
    case 'fan':
      add('Size', `${d.size} mm`); add('Airflow', `${d.airflow} CFM`); add('Noise', `${d.noise} dB`); add('Power', `${d.watts} W`); if (d.rgb) add('Lighting', 'RGB'); break;
    case 'case':
      add('Motherboards', d.forms.join(', ')); add('GPU clearance', `${d.gpuMax} mm`); add('Cooler clearance', `${d.coolerMax} mm`);
      add('Radiator mount', d.radiator ? `${d.radiator} mm` : 'None'); add('PSU', d.psuForm); add('Drive bays', `${d.bays35} × 3.5", ${d.bays25} × 2.5"`);
      add('Fan mounts', `${d.fans.front} front, ${d.fans.rear} rear, ${d.fans.top} top`); add('Passive airflow', d.airflow); add('Noise damping', `${d.damping} dB`); break;
    case 'os':
      add('Publisher', d.brand); add('Minimum memory', `${d.minRam} GB`); add('Minimum storage', `${d.minStorage} GB`); add('Licence', d.price ? 'One install per licence' : 'Free'); break;
  }
  return r;
}

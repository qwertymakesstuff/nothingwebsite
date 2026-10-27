// CPUs. `single` and `multi` are relative performance numbers that the benchmark turns into a
// CPU Mark; `tdp` is the sustained heat/power under load and `peak` the short boost draw.
// Add a CPU by appending an entry: every field below is read by compat.js and sim.js.

export const CPUS = [
  { id: 'cpu-arc-k3-6100', name: 'Kestrel K3-6100', brand: 'Arcturon', socket: 'AX-1151', cores: 2, threads: 4, ghz: 3.7, single: 55, multi: 120, tdp: 51, peak: 55, igpu: 5, price: 55, tier: 1, legacy: true, failRate: 0.02 },
  { id: 'cpu-arc-k5-8400', name: 'Kestrel K5-8400', brand: 'Arcturon', socket: 'AX-1151', cores: 6, threads: 6, ghz: 4.0, single: 72, multi: 330, tdp: 65, peak: 80, igpu: 6, price: 95, tier: 1, legacy: true, failRate: 0.02 },
  { id: 'cpu-arc-k7-9700', name: 'Kestrel K7-9700', brand: 'Arcturon', socket: 'AX-1151', cores: 8, threads: 8, ghz: 4.9, single: 85, multi: 520, tdp: 95, peak: 120, igpu: 6, price: 170, tier: 2, legacy: true, failRate: 0.02 },
  { id: 'cpu-arc-k3-1210', name: 'Kestrel K3-1210', brand: 'Arcturon', socket: 'AX-1700', cores: 4, threads: 8, ghz: 4.3, single: 100, multi: 420, tdp: 60, peak: 85, igpu: 8, price: 105, tier: 1, failRate: 0.01 },
  { id: 'cpu-arc-k5-1260', name: 'Kestrel K5-1260K', brand: 'Arcturon', socket: 'AX-1700', cores: 10, threads: 16, ghz: 4.9, single: 115, multi: 820, tdp: 125, peak: 150, igpu: 8, price: 220, tier: 2, unlocked: true, failRate: 0.01 },
  { id: 'cpu-arc-k7-1370', name: 'Kestrel K7-1370K', brand: 'Arcturon', socket: 'AX-1700', cores: 16, threads: 24, ghz: 5.4, single: 125, multi: 1250, tdp: 150, peak: 210, igpu: 8, price: 360, tier: 3, unlocked: true, failRate: 0.01 },
  { id: 'cpu-arc-k9-1390', name: 'Kestrel K9-1390K', brand: 'Arcturon', socket: 'AX-1700', cores: 24, threads: 32, ghz: 5.8, single: 135, multi: 1650, tdp: 180, peak: 250, igpu: 8, price: 560, tier: 4, unlocked: true, failRate: 0.01 },
  { id: 'cpu-vx-h3-3100', name: 'Helix H3 3100', brand: 'Vantix', socket: 'VR4', cores: 4, threads: 8, ghz: 3.9, single: 80, multi: 380, tdp: 65, peak: 75, igpu: 0, price: 80, tier: 1, failRate: 0.01 },
  { id: 'cpu-vx-h5-3600', name: 'Helix H5 3600', brand: 'Vantix', socket: 'VR4', cores: 6, threads: 12, ghz: 4.2, single: 90, multi: 560, tdp: 65, peak: 85, igpu: 0, price: 115, tier: 1, failRate: 0.01 },
  { id: 'cpu-vx-h5-5600g', name: 'Helix H5 5600G', brand: 'Vantix', socket: 'VR4', cores: 6, threads: 12, ghz: 4.4, single: 102, multi: 640, tdp: 65, peak: 88, igpu: 12, price: 140, tier: 1, failRate: 0.01 },
  { id: 'cpu-vx-h7-5800x', name: 'Helix H7 5800X', brand: 'Vantix', socket: 'VR4', cores: 8, threads: 16, ghz: 4.7, single: 108, multi: 900, tdp: 105, peak: 140, igpu: 0, price: 210, tier: 2, unlocked: true, failRate: 0.01 },
  { id: 'cpu-vx-h5-7600', name: 'Helix H5 7600', brand: 'Vantix', socket: 'VR5', cores: 6, threads: 12, ghz: 5.1, single: 120, multi: 880, tdp: 65, peak: 90, igpu: 4, price: 210, tier: 2, failRate: 0.01 },
  { id: 'cpu-vx-h7-7800x', name: 'Helix H7 7800X', brand: 'Vantix', socket: 'VR5', cores: 8, threads: 16, ghz: 5.0, single: 128, multi: 1150, tdp: 120, peak: 160, igpu: 4, price: 380, tier: 3, unlocked: true, failRate: 0.01 },
  { id: 'cpu-vx-h9-7950x', name: 'Helix H9 7950X', brand: 'Vantix', socket: 'VR5', cores: 16, threads: 32, ghz: 5.7, single: 138, multi: 1900, tdp: 170, peak: 230, igpu: 4, price: 620, tier: 4, unlocked: true, failRate: 0.01 },
];

// Graphics cards. `perf` drives the GPU Mark, `length` (mm) must fit the case, `pins` is how many
// 8-pin PCIe power cables the card needs (0 = powered by the slot alone).

export const GPUS = [
  { id: 'gpu-nr-1050', name: 'NR 1050 Mini', brand: 'Novaray', maker: 'Kestrel Graphics', perf: 18, vram: 2, tdp: 75, length: 170, pins: 0, price: 85, tier: 1, legacy: true, failRate: 0.03 },
  { id: 'gpu-nr-1660', name: 'NR 1660 Duo', brand: 'Novaray', maker: 'Ironpeak', perf: 32, vram: 6, tdp: 120, length: 230, pins: 1, price: 170, tier: 1, legacy: true, failRate: 0.03 },
  { id: 'gpu-cf-6600', name: 'CF 6600 Swift', brand: 'Chromaflux', maker: 'Zephyr', perf: 45, vram: 8, tdp: 132, length: 240, pins: 1, price: 230, tier: 2, failRate: 0.02 },
  { id: 'gpu-nr-3060', name: 'NR 3060 Ironpeak OC', brand: 'Novaray', maker: 'Ironpeak', perf: 52, vram: 12, tdp: 170, length: 245, pins: 1, price: 300, tier: 2, failRate: 0.02 },
  { id: 'gpu-cf-6700', name: 'CF 6700 XT Zephyr', brand: 'Chromaflux', maker: 'Zephyr', perf: 64, vram: 12, tdp: 230, length: 275, pins: 2, price: 370, tier: 2, failRate: 0.02 },
  { id: 'gpu-nr-4070', name: 'NR 4070 Glacier', brand: 'Novaray', maker: 'Glacier Labs', perf: 85, vram: 12, tdp: 200, length: 300, pins: 1, price: 590, tier: 3, failRate: 0.02 },
  { id: 'gpu-cf-7900', name: 'CF 7900 XTX Tempest', brand: 'Chromaflux', maker: 'Zephyr', perf: 110, vram: 24, tdp: 330, length: 325, pins: 2, price: 880, tier: 4, failRate: 0.02 },
  { id: 'gpu-nr-4090', name: 'NR 4090 Titanforge', brand: 'Novaray', maker: 'Ironpeak', perf: 145, vram: 24, tdp: 450, length: 345, pins: 3, price: 1650, tier: 5, failRate: 0.02 },
];

// Memory sticks (one stick per item). `mem` must match the motherboard; `mhz` is the rated speed,
// which only applies when the board's memory profile (XMP) is enabled in the BIOS; otherwise the
// stick runs at `base` speed.

export const MEMORY = [
  { id: 'ram-mw-4-2400', name: 'Value 4GB DDR4-2400', brand: 'Memwright', mem: 'DDR4', gb: 4, mhz: 2400, base: 2133, watts: 3, price: 14, tier: 1, legacy: true, failRate: 0.03 },
  { id: 'ram-mw-8-2666', name: 'Value 8GB DDR4-2666', brand: 'Memwright', mem: 'DDR4', gb: 8, mhz: 2666, base: 2133, watts: 3, price: 22, tier: 1, failRate: 0.02 },
  { id: 'ram-qs-8-3200', name: 'Vortex 8GB DDR4-3200', brand: 'Quillstone', mem: 'DDR4', gb: 8, mhz: 3200, base: 2133, watts: 4, price: 28, tier: 1, failRate: 0.02 },
  { id: 'ram-qs-16-3600', name: 'Vortex 16GB DDR4-3600', brand: 'Quillstone', mem: 'DDR4', gb: 16, mhz: 3600, base: 2133, watts: 4, price: 46, tier: 2, failRate: 0.02 },
  { id: 'ram-mw-8-4800', name: 'Core 8GB DDR5-4800', brand: 'Memwright', mem: 'DDR5', gb: 8, mhz: 4800, base: 4800, watts: 4, price: 32, tier: 2, failRate: 0.02 },
  { id: 'ram-qs-16-6000', name: 'Aurora 16GB DDR5-6000', brand: 'Quillstone', mem: 'DDR5', gb: 16, mhz: 6000, base: 4800, watts: 5, price: 60, tier: 2, failRate: 0.02 },
  { id: 'ram-qs-32-6400', name: 'Aurora 32GB DDR5-6400', brand: 'Quillstone', mem: 'DDR5', gb: 32, mhz: 6400, base: 4800, watts: 6, price: 115, tier: 3, failRate: 0.02 },
];

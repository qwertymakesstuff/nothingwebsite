// Operating systems (sold as install licences on a USB stick; installing uses the licence).
// `minRam` GB and `minStorage` GB are hard requirements; `overhead` slightly lowers benchmarks.

export const OPERATING_SYSTEMS = [
  { id: 'os-lumen-home', name: 'Lumen OS 11 Home', brand: 'Lumen Software', minRam: 4, minStorage: 64, overhead: 0.03, price: 110, tier: 1, family: 'lumen' },
  { id: 'os-lumen-pro', name: 'Lumen OS 11 Pro', brand: 'Lumen Software', minRam: 4, minStorage: 64, overhead: 0.03, price: 170, tier: 2, family: 'lumen', pro: true },
  { id: 'os-fernix', name: 'Fernix Linux 24', brand: 'Fernix Project', minRam: 2, minStorage: 20, overhead: 0.01, price: 0, tier: 1, family: 'fernix' },
  { id: 'os-harbor-ws', name: 'Harbor OS Workstation', brand: 'Harbor Systems', minRam: 16, minStorage: 128, overhead: 0.02, price: 250, tier: 3, family: 'harbor', pro: true },
  { id: 'os-lumen-7', name: 'Lumen OS 7', brand: 'Lumen Software', minRam: 2, minStorage: 32, overhead: 0.05, price: 0, tier: 1, family: 'lumen', legacy: true, unsold: true },
];

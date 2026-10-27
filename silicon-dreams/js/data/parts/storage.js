// Storage drives. `iface` 'm2' needs a free M.2 slot on the motherboard; 'sata' needs a free SATA
// port, a drive bay of the right `bay` size in the case, and SATA power + data cables. `read` is
// sequential speed in MB/s; HDDs add noise.

export const STORAGE = [
  { id: 'sto-strata-500', name: 'Spinner 500GB HDD', brand: 'Strata', kind: 'hdd', iface: 'sata', bay: '3.5', gb: 500, read: 120, watts: 6, noise: 28, price: 25, tier: 1, legacy: true, failRate: 0.06 },
  { id: 'sto-strata-2t', name: 'Spinner 2TB HDD', brand: 'Strata', kind: 'hdd', iface: 'sata', bay: '3.5', gb: 2000, read: 180, watts: 7, noise: 27, price: 55, tier: 1, failRate: 0.05 },
  { id: 'sto-pebble-240', name: 'Pebble 240GB SSD', brand: 'Granite Data', kind: 'ssd', iface: 'sata', bay: '2.5', gb: 240, read: 520, watts: 3, noise: 0, price: 24, tier: 1, failRate: 0.03 },
  { id: 'sto-pebble-1t', name: 'Pebble 1TB SSD', brand: 'Granite Data', kind: 'ssd', iface: 'sata', bay: '2.5', gb: 1000, read: 550, watts: 3, noise: 0, price: 58, tier: 1, failRate: 0.02 },
  { id: 'sto-dv-swift-500', name: 'Swift 500GB NVMe', brand: 'Datavault', kind: 'nvme', iface: 'm2', bay: null, gb: 500, read: 3400, watts: 4, noise: 0, price: 42, tier: 1, failRate: 0.02 },
  { id: 'sto-dv-swift-1t', name: 'Swift 1TB NVMe', brand: 'Datavault', kind: 'nvme', iface: 'm2', bay: null, gb: 1000, read: 3500, watts: 5, noise: 0, price: 68, tier: 2, failRate: 0.02 },
  { id: 'sto-dv-hyper-2t', name: 'Hyper 2TB NVMe', brand: 'Datavault', kind: 'nvme', iface: 'm2', bay: null, gb: 2000, read: 7000, watts: 7, noise: 0, price: 145, tier: 3, failRate: 0.02 },
];

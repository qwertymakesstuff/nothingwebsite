// Motherboards. `form` must be one of the case's supported forms; `mem` is the only memory type
// the DIMM slots take; `m2` and `sata` are storage connectors; `fanHeaders` is how many fans
// (cooler included) can be plugged in; `oc` boards can run memory profiles and unlocked CPUs fast.

export const MOTHERBOARDS = [
  { id: 'mb-tessera-h11m', name: 'Tessera H11M Basic', brand: 'Tessera', socket: 'AX-1151', form: 'mATX', mem: 'DDR4', ramSlots: 2, maxRam: 32, m2: 0, sata: 4, fanHeaders: 2, pcie: 3, oc: false, watts: 25, price: 50, tier: 1, legacy: true, failRate: 0.02 },
  { id: 'mb-tessera-t450m', name: 'Tessera T-450M Lite', brand: 'Tessera', socket: 'AX-1151', form: 'mATX', mem: 'DDR4', ramSlots: 2, maxRam: 32, m2: 1, sata: 4, fanHeaders: 3, pcie: 3, oc: false, watts: 25, price: 70, tier: 1, legacy: true, failRate: 0.02 },
  { id: 'mb-tessera-z900', name: 'Tessera Z-900 Forge', brand: 'Tessera', socket: 'AX-1151', form: 'ATX', mem: 'DDR4', ramSlots: 4, maxRam: 64, m2: 2, sata: 6, fanHeaders: 5, pcie: 3, oc: true, watts: 35, price: 145, tier: 2, legacy: true, failRate: 0.02 },
  { id: 'mb-ostrava-h61m', name: 'Ostrava H61M-E', brand: 'Ostrava', socket: 'AX-1700', form: 'mATX', mem: 'DDR4', ramSlots: 2, maxRam: 64, m2: 1, sata: 4, fanHeaders: 3, pcie: 4, oc: false, watts: 28, price: 85, tier: 1, failRate: 0.01 },
  { id: 'mb-ostrava-b66', name: 'Ostrava B66 Pro', brand: 'Ostrava', socket: 'AX-1700', form: 'ATX', mem: 'DDR4', ramSlots: 4, maxRam: 128, m2: 2, sata: 6, fanHeaders: 4, pcie: 4, oc: false, watts: 32, price: 135, tier: 2, failRate: 0.01 },
  { id: 'mb-ostrava-z79', name: 'Ostrava Z79 Summit', brand: 'Ostrava', socket: 'AX-1700', form: 'ATX', mem: 'DDR5', ramSlots: 4, maxRam: 192, m2: 4, sata: 6, fanHeaders: 7, pcie: 5, oc: true, watts: 40, price: 290, tier: 3, failRate: 0.01 },
  { id: 'mb-tessera-n76i', name: 'Tessera N76i Nano', brand: 'Tessera', socket: 'AX-1700', form: 'ITX', mem: 'DDR5', ramSlots: 2, maxRam: 96, m2: 2, sata: 2, fanHeaders: 2, pcie: 4, oc: true, watts: 28, price: 185, tier: 3, failRate: 0.01 },
  { id: 'mb-pinewood-a52m', name: 'Pinewood A52M', brand: 'Pinewood', socket: 'VR4', form: 'mATX', mem: 'DDR4', ramSlots: 2, maxRam: 64, m2: 1, sata: 4, fanHeaders: 2, pcie: 3, oc: false, watts: 25, price: 65, tier: 1, failRate: 0.01 },
  { id: 'mb-pinewood-b55', name: 'Pinewood B55 Ranger', brand: 'Pinewood', socket: 'VR4', form: 'ATX', mem: 'DDR4', ramSlots: 4, maxRam: 128, m2: 2, sata: 6, fanHeaders: 5, pcie: 4, oc: true, watts: 32, price: 140, tier: 2, failRate: 0.01 },
  { id: 'mb-pinewood-b65', name: 'Pinewood B65 Strata', brand: 'Pinewood', socket: 'VR5', form: 'ATX', mem: 'DDR5', ramSlots: 4, maxRam: 192, m2: 2, sata: 4, fanHeaders: 5, pcie: 4, oc: true, watts: 35, price: 185, tier: 2, failRate: 0.01 },
  { id: 'mb-pinewood-x67', name: 'Pinewood X67 Crown', brand: 'Pinewood', socket: 'VR5', form: 'ATX', mem: 'DDR5', ramSlots: 4, maxRam: 192, m2: 4, sata: 6, fanHeaders: 7, pcie: 5, oc: true, watts: 42, price: 320, tier: 4, failRate: 0.01 },
  { id: 'mb-kiln-a62i', name: 'Kiln A62i Mini', brand: 'Kiln', socket: 'VR5', form: 'ITX', mem: 'DDR5', ramSlots: 2, maxRam: 96, m2: 1, sata: 2, fanHeaders: 2, pcie: 4, oc: false, watts: 25, price: 140, tier: 2, failRate: 0.01 },
];

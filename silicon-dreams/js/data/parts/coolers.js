// CPU coolers. `capacity` is how many watts of CPU heat they move comfortably. Air coolers need
// case clearance (`height` mm); AIO coolers need a radiator mount of at least `radiator` mm.
// `paste` coolers ship with thermal paste pre-applied (first install only).

export const COOLERS = [
  { id: 'cool-breeze-65', name: 'Breeze 65 Stock', brand: 'Breeze', type: 'air', capacity: 70, height: 55, radiator: 0, sockets: ['AX-1151', 'AX-1700', 'VR4', 'VR5'], paste: true, noise: 34, watts: 2, price: 15, tier: 1, failRate: 0.04 },
  { id: 'cool-fl-classic92', name: 'Classic 92', brand: 'Frostline', type: 'air', capacity: 100, height: 130, radiator: 0, sockets: ['AX-1151', 'VR4'], paste: false, noise: 30, watts: 2, price: 22, tier: 1, legacy: true, failRate: 0.03 },
  { id: 'cool-fl-slim47', name: 'Slim 47 Low Profile', brand: 'Frostline', type: 'air', capacity: 95, height: 47, radiator: 0, sockets: ['AX-1151', 'AX-1700', 'VR4', 'VR5'], paste: true, noise: 31, watts: 2, price: 40, tier: 1, failRate: 0.02 },
  { id: 'cool-fl-tower120', name: 'Tower 120', brand: 'Frostline', type: 'air', capacity: 150, height: 155, radiator: 0, sockets: ['AX-1151', 'AX-1700', 'VR4', 'VR5'], paste: false, noise: 27, watts: 3, price: 35, tier: 1, failRate: 0.02 },
  { id: 'cool-fl-duo140', name: 'Duo 140 Silent', brand: 'Frostline', type: 'air', capacity: 230, height: 165, radiator: 0, sockets: ['AX-1700', 'VR4', 'VR5'], paste: false, noise: 23, watts: 4, price: 80, tier: 2, failRate: 0.02 },
  { id: 'cool-gl-hydro240', name: 'Hydro 240', brand: 'Glacier Labs', type: 'aio', capacity: 260, height: 0, radiator: 240, sockets: ['AX-1700', 'VR4', 'VR5'], paste: true, noise: 26, watts: 8, price: 110, tier: 2, failRate: 0.04 },
  { id: 'cool-gl-hydro360', name: 'Hydro 360', brand: 'Glacier Labs', type: 'aio', capacity: 340, height: 0, radiator: 360, sockets: ['AX-1700', 'VR4', 'VR5'], paste: true, noise: 25, watts: 10, price: 160, tier: 3, failRate: 0.04 },
];

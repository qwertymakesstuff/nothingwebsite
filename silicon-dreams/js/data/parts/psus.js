// Power supplies. `watts` is rated output; `form` must match the case's PSU bay; `pcie` is how many
// 8-pin GPU cables it has, `sataPower` how many drive power plugs. Cheap units fail more often.

export const PSUS = [
  { id: 'psu-volt-350', name: 'Basic 350', brand: 'Voltaic', watts: 350, form: 'ATX', grade: 'C', pcie: 0, sataPower: 2, modular: false, noise: 30, price: 28, tier: 1, legacy: true, failRate: 0.08 },
  { id: 'psu-volt-450', name: 'Core 450', brand: 'Voltaic', watts: 450, form: 'ATX', grade: 'B', pcie: 1, sataPower: 4, modular: false, noise: 27, price: 45, tier: 1, failRate: 0.05 },
  { id: 'psu-volt-550', name: 'Core 550', brand: 'Voltaic', watts: 550, form: 'ATX', grade: 'B', pcie: 2, sataPower: 4, modular: false, noise: 26, price: 60, tier: 1, failRate: 0.04 },
  { id: 'psu-amp-650', name: 'Gold 650', brand: 'Ampstead', watts: 650, form: 'ATX', grade: 'A', pcie: 2, sataPower: 6, modular: true, noise: 22, price: 90, tier: 2, failRate: 0.02 },
  { id: 'psu-amp-750', name: 'Gold 750', brand: 'Ampstead', watts: 750, form: 'ATX', grade: 'A', pcie: 3, sataPower: 6, modular: true, noise: 22, price: 115, tier: 2, failRate: 0.02 },
  { id: 'psu-amp-1000', name: 'Titanium 1000', brand: 'Ampstead', watts: 1000, form: 'ATX', grade: 'A+', pcie: 4, sataPower: 8, modular: true, noise: 20, price: 220, tier: 4, failRate: 0.01 },
  { id: 'psu-volt-sfx600', name: 'Compact SFX 600', brand: 'Voltaic', watts: 600, form: 'SFX', grade: 'A', pcie: 2, sataPower: 3, modular: true, noise: 26, price: 115, tier: 2, failRate: 0.03 },
  { id: 'psu-amp-sfx750', name: 'SFX 750 Platinum', brand: 'Ampstead', watts: 750, form: 'SFX', grade: 'A+', pcie: 3, sataPower: 4, modular: true, noise: 23, price: 165, tier: 3, failRate: 0.02 },
];

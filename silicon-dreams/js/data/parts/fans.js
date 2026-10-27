// Case fans. `airflow` in fictional CFM; `noise` in dB at full speed. Fans can be mounted as
// intake or exhaust (flip them while dragging).

export const FANS = [
  { id: 'fan-zp-breeze120', name: 'Breeze 120', brand: 'Zephyr', size: 120, airflow: 45, noise: 24, watts: 2, price: 7, tier: 1, failRate: 0.04 },
  { id: 'fan-zp-quiet120', name: 'Quiet 120', brand: 'Zephyr', size: 120, airflow: 38, noise: 14, watts: 1, price: 14, tier: 1, failRate: 0.02 },
  { id: 'fan-zp-storm120', name: 'Storm 120 RGB', brand: 'Zephyr', size: 120, airflow: 68, noise: 31, watts: 3, rgb: true, price: 15, tier: 1, failRate: 0.03 },
  { id: 'fan-zp-silent140', name: 'Silent 140', brand: 'Zephyr', size: 140, airflow: 58, noise: 17, watts: 2, price: 19, tier: 2, failRate: 0.02 },
];

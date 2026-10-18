// Points of interest in the world: respawn points, job givers, health pickups. Other systems ask here instead of hard-coding spots.
import { B, N, HOSPITAL, STATION, blockX, blockZ, corner } from './layout.js';
import { beam } from './city.js';

export const spawnHospital = [blockX(HOSPITAL[0]) + B / 2, blockZ(HOSPITAL[1]) + B + 3.5];
export const spawnStation = [blockX(STATION[0]) + B / 2, blockZ(STATION[1]) + B + 3.5];

export const POIS = [
  { id: 'hospital', type: 'hospital', label: 'hospital', x: spawnHospital[0], z: spawnHospital[1], color: 0xff4444 },
  { id: 'station', type: 'station', label: 'police station', x: spawnStation[0], z: spawnStation[1], color: 0x4466ff }
];
[[0, 0, 2], [6, 0, 3], [0, N - 1, 1], [N - 1, N - 1, 0], [3, 3, 0], [3, 0, 2]].forEach(([i, j, c], n) => {
  const p = corner(i, j, c); POIS.push({ id: 'job' + n, type: 'job', label: 'job', x: p[0], z: p[1], color: 0xffd23f });
});
[[3, 3], [1, 1], [5, 5], [0, 3], [6, 3], [3, 6]].forEach(([i, j], n) => {
  const p = corner(i, j, 0); POIS.push({ id: 'health' + n, type: 'health', label: 'health', x: p[0] + 3, z: p[1] + 3, color: 0xff4466 });
});
POIS.forEach(p => { if (p.type !== 'health') p.mesh = beam(p.x, p.z, p.color, p.type === 'job' ? 12 : 14); });
export const poisOfType = t => POIS.filter(p => p.type === t);
export const nearestPoi = (x, z, type) => { let best = null, bd = Infinity; for (const p of POIS) { if (type && p.type !== type) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p; } } return best ? { poi: best, dist: bd } : null; };

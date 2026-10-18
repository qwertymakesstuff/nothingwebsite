// Thin runtime view of the POI registry (pois.js): respawn points, and shortcuts the other systems use.
import { POIS, getPoi, poisOfCategory, nearestPoi, resolveRef, resolveTarget, mapPois, CATEGORIES } from './pois.js';
export { POIS, getPoi, poisOfCategory, nearestPoi, resolveRef, resolveTarget, mapPois, CATEGORIES };
export const spawnHospital = getPoi('hospital').road;
export const spawnStation = getPoi('police_hq').road;
export const spawnPoint = which => which === 'station' ? spawnStation : spawnHospital;

// World markers: one system for everything the player is pointed at. A marker can have a light beam in the world, an icon on the
// minimap and on the full map. POIs, mission destinations and the player's waypoint are all just markers.
import { scene } from './render.js';
import { beam } from './city.js';
import { POIS, CATEGORIES } from './pois.js';

const markers = new Map();
const hex = c => parseInt(c.replace('#', ''), 16);
export function addMarker(o) {
  removeMarker(o.id);
  const m = Object.assign({ beam: false, minimap: true, map: true, color: '#ffd23f', glyph: '!', label: '', height: 14, kind: 'poi', mesh: null, y: 0 }, o);
  if (m.beam) { m.mesh = beam(m.x, m.z, hex(m.color), m.height); m.mesh.position.y += m.y; }
  markers.set(m.id, m); return m;
}
export function removeMarker(id) { const m = markers.get(id); if (!m) return; if (m.mesh) scene.remove(m.mesh); markers.delete(id); }
export const getMarker = id => markers.get(id) || null;
export const allMarkers = () => [...markers.values()];
export function moveMarker(id, x, z, y) { const m = markers.get(id); if (!m) return; m.x = x; m.z = z; if (y != null) m.y = y; if (m.mesh) m.mesh.position.set(x, m.height / 2 + (m.y || 0), z); }
const BEAM_CATS = new Set(['mission', 'hospital', 'police', 'dealership', 'garage', 'safehouse']);
/** one marker per POI: beams only for the ones the player actively uses, icons for every flagship place */
export function registerPoiMarkers() {
  for (const p of POIS) {
    const cat = CATEGORIES[p.category]; if (cat.hidden) continue;
    addMarker({ id: 'poi:' + p.id, x: p.x, z: p.z, color: p.color, glyph: p.glyph, label: p.name, kind: 'poi', category: p.category, beam: BEAM_CATS.has(p.category) && !p.minor && p.id !== 'police_holding', height: p.category === 'mission' ? 12 : 14, minimap: !p.minor, map: !p.minor, poi: p.id });
  }
}
/** the player's own waypoint (set from the map) */
export function setWaypoint(x, z) { addMarker({ id: 'waypoint', x, z, color: '#ff4fd8', glyph: 'X', label: 'waypoint', kind: 'waypoint', beam: true, height: 60 }); }
export const clearWaypoint = () => removeMarker('waypoint');
export const getWaypoint = () => getMarker('waypoint');
/** spin job beams and hide far beams (they're tall transparent cylinders) */
export function updateMarkers(dt, px, pz) {
  for (const m of markers.values()) { if (!m.mesh) continue; m.mesh.visible = m.kind === 'waypoint' || m.kind === 'mission' || (Math.abs(m.x - px) < 160 && Math.abs(m.z - pz) < 160); if (m.category === 'mission') m.mesh.rotation.y += dt; }
}

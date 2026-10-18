// Shared materials so hundreds of objects reuse a handful of shader programs.
export const vcLambert = new THREE.MeshLambertMaterial({ vertexColors: true });
export const vcStandard = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: .05 });
export const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2733, roughness: .12, metalness: .55 });
export const lampMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const bodyCache = new Map();
/** One paint material per colour, shared by every car of that colour. */
export function paintMat(hex) {
  let m = bodyCache.get(hex);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: .38, metalness: .35 }); bodyCache.set(hex, m); }
  return m;
}
// radial gradient used for glows and light pools
export function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, inner || 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, outer || 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

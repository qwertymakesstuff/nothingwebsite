// three.js renderer, scene, camera and lights. If WebGL is unavailable `renderer` stays null and a help box is shown.
/* ---------- three setup ---------- */
export let canvas = document.getElementById('view');
function failStart(detail) {
  const b = document.getElementById('go');
  b.textContent = 'can\'t start'; b.disabled = true; b.style.opacity = .5; b.style.cursor = 'default';
  const ua = navigator.userAgent;
  const mine = /Edg\//.test(ua) ? 'edge' : /OPR\/|Opera/.test(ua) ? 'opera' : /Firefox\//.test(ua) ? 'firefox' : /Chrome\/|CriOS/.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : '';
  const url = (u) => '<code class="cp" data-copy="' + u + '" title="click to copy">' + u + '</code>';
  const guides = [
    ['chrome', 'Chrome', '<ol><li>Open ' + url('chrome://settings/system') + ' (click it to copy, then paste into a new tab).</li><li>Turn on <b>Use graphics acceleration when available</b>.</li><li>Click <b>Relaunch</b>.</li><li>Still blank? Open ' + url('chrome://gpu') + ' and check that WebGL says "Hardware accelerated".</li></ol>'],
    ['edge', 'Edge', '<ol><li>Open ' + url('edge://settings/system') + '.</li><li>Turn on <b>Use graphics acceleration when available</b>.</li><li>Click <b>Restart</b>.</li></ol>'],
    ['firefox', 'Firefox', '<ol><li>Open ' + url('about:preferences') + ', scroll to <b>Performance</b>.</li><li>Untick <b>Use recommended performance settings</b>, then tick <b>Use hardware acceleration when available</b>.</li><li>Restart Firefox.</li><li>If it still fails, open ' + url('about:config') + ' and make sure <b>webgl.disabled</b> is <b>false</b>.</li></ol>'],
    ['safari', 'Safari', '<p>Safari has no hardware-acceleration switch &mdash; WebGL is normally always on. Try:</p><ol><li><b>Lockdown Mode</b> turns WebGL off. Check System Settings &rarr; Privacy &amp; Security &rarr; Lockdown Mode.</li><li>Safari &rarr; Settings &rarr; Advanced &rarr; tick <b>Show features for web developers</b>, then in the <b>Develop</b> menu open <b>Feature Flags</b> and reset any flags you changed back to their defaults, then restart Safari.</li><li>Turn off content blockers / extensions for this site, and update macOS &amp; Safari.</li><li>Still stuck? Try Chrome or Firefox instead.</li></ol>'],
    ['opera', 'Opera / Brave / others', '<ol><li>Open the browser settings and search for <b>hardware acceleration</b> (or <b>graphics acceleration</b>).</li><li>Turn it on and restart the browser. Brave: <code class="cp" data-copy="brave://settings/system">brave://settings/system</code></li></ol>']
  ];
  const box = document.createElement('div'); box.className = 'wgl';
  box.innerHTML = '<button type="button" class="wgl-t">Your browser has WebGL turned off or unsupported, so the game can\'t run. <u>Tap here to see how to turn it on.</u></button><div class="wgl-b" hidden>' +
    guides.map(g => '<details' + (g[0] === mine ? ' open' : '') + '><summary>' + g[1] + (g[0] === mine ? ' (your browser)' : '') + '</summary>' + g[2] + '</details>').join('') +
    '<p class="wgl-d">Technical detail: ' + String(detail || 'unknown').replace(/[<>&]/g, '') + '</p></div>';
  b.parentNode.insertBefore(box, b);
  box.querySelector('.wgl-t').addEventListener('click', () => { const x = box.querySelector('.wgl-b'); x.hidden = !x.hidden; });
  box.addEventListener('click', e => {
    const c = e.target.closest('.cp'); if (!c) return;
    const t = c.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { c.textContent = 'copied! paste into a new tab'; setTimeout(() => c.textContent = t, 1800); }).catch(() => {});
  });
}
const ctxErr = [];
export let renderer = null;
for (const [type, attrs] of [['webgl2', { antialias: true }], ['webgl', { antialias: true }], ['webgl', { antialias: false }], ['webgl', { antialias: false, powerPreference: 'default', failIfMajorPerformanceCaveat: false }], ['experimental-webgl', {}]]) {
  const c = document.createElement('canvas'); c.id = 'view';
  c.addEventListener('webglcontextcreationerror', e => ctxErr.push(type + ': ' + (e.statusMessage || 'refused')));
  let gl = null;
  try { gl = c.getContext(type, attrs); } catch (e) { ctxErr.push(type + ': ' + e.message); }
  if (!gl) continue;
  if (gl.isContextLost && gl.isContextLost()) ctxErr.push(type + ': context lost right after creation');
  // some Safari setups return null here, which makes three.js crash; fall back to typical values
  const spf = gl.getShaderPrecisionFormat ? gl.getShaderPrecisionFormat.bind(gl) : null;
  gl.getShaderPrecisionFormat = (a, b) => (spf && spf(a, b)) || { rangeMin: 127, rangeMax: 127, precision: 23 };
  try { renderer = new THREE.WebGLRenderer({ canvas: c, context: gl, antialias: !!attrs.antialias }); canvas.replaceWith(c); canvas = c; break; }
  catch (e) { ctxErr.push('three on ' + type + ': ' + e.message); }
}
if (!renderer) failStart(ctxErr.join(' | ') || 'no WebGL context available');
if (renderer) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setClearColor(0x9fb8c8); }
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fb8c8, 90, 300);
export const camera = new THREE.PerspectiveCamera(65, 1, 0.3, 340);

scene.add(camera);
function resize() {
  if (renderer) renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();
export const hemi = new THREE.HemisphereLight(0xdfe9f2, 0x59605a, 0.95);
export const sun = new THREE.DirectionalLight(0xfff1d6, 0.75); sun.position.set(80, 140, 50);
scene.add(hemi, sun);
export function render() { if (renderer) renderer.render(scene, camera); }

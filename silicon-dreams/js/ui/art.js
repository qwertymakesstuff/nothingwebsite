// Procedural illustrations for every component, drawn as SVG markup in a local w × h box.
// partArt() is used both for the cards in parts trays and for parts drawn inside the case.

import { hashStr } from '../core/rng.js';

const BRAND = {
  Arcturon: '#3b82c4', Vantix: '#d0582f', Tessera: '#2f6f5a', Ostrava: '#3a4c7a', Pinewood: '#5c7a2e', Kiln: '#8a4b2b',
  Novaray: '#3fa34d', Chromaflux: '#c4374a', Memwright: '#4a5563', Quillstone: '#7a3fb0', Strata: '#6b7280', 'Granite Data': '#4b5563', Datavault: '#1f6fb2',
  Voltaic: '#c8a227', Ampstead: '#b9852b', Breeze: '#64748b', Frostline: '#3ba7c4', 'Glacier Labs': '#2b8fb9', Zephyr: '#5b6b8a',
  Boxwell: '#374151', Northwind: '#1e3a5f', Hushbox: '#3f3f46', Pocketworks: '#52525b', 'Lumen Software': '#2e7dd7', 'Fernix Project': '#3c9a5f', 'Harbor Systems': '#1b4f72',
};
export const brandColor = d => BRAND[d.brand] || '#556';
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fanFace(cx, cy, r, { color = '#2a2f38', blade = '#5b6573', rgb = false, spin = false, id = 'f' } = {}) {
  let blades = '';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r * 0.22, y1 = cy + Math.sin(a) * r * 0.22;
    const x2 = cx + Math.cos(a + 0.9) * r * 0.86, y2 = cy + Math.sin(a + 0.9) * r * 0.86;
    const x3 = cx + Math.cos(a + 0.35) * r * 0.9, y3 = cy + Math.sin(a + 0.35) * r * 0.9;
    blades += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${x3.toFixed(1)},${y3.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} L${(cx + Math.cos(a + 0.5) * r * 0.25).toFixed(1)},${(cy + Math.sin(a + 0.5) * r * 0.25).toFixed(1)}Z" fill="${blade}"/>`;
  }
  const ring = rgb ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.98}" fill="none" stroke="url(#rgb-grad)" stroke-width="${Math.max(1.5, r * 0.08)}"/>` : '';
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>${ring}<g class="${spin ? 'spin' : 'blades'}" style="transform-origin:${cx}px ${cy}px">${blades}</g><circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="#1b1f26" stroke="#3a414c"/>`;
}

function chip(x, y, w, h, fill = '#222') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${fill}"/>`; }

const ART = {
  case(d, w, h) {
    const c = brandColor(d);
    const glass = d.id === 'case-monolith';
    return `<rect x="${w * 0.18}" y="${h * 0.04}" width="${w * 0.64}" height="${h * 0.92}" rx="${w * 0.04}" fill="${c}" stroke="#0b0d10" stroke-width="2"/>
      <rect x="${w * 0.24}" y="${h * 0.1}" width="${w * 0.52}" height="${h * 0.62}" rx="3" fill="${glass ? '#7dd3fc33' : '#0003'}" stroke="#0006"/>
      ${d.airflow > 20 ? Array.from({ length: 6 }, (_, i) => `<line x1="${w * 0.27}" x2="${w * 0.73}" y1="${h * (0.16 + i * 0.09)}" y2="${h * (0.16 + i * 0.09)}" stroke="#0005" stroke-width="2"/>`).join('') : ''}
      <circle cx="${w * 0.5}" cy="${h * 0.84}" r="${Math.min(w, h) * 0.05}" fill="#111" stroke="#9ca3af"/>`;
  },
  motherboard(d, w, h) {
    const c = brandColor(d);
    let dimms = '';
    const n = d.ramSlots;
    for (let i = 0; i < n; i++) dimms += `<rect x="${w * (0.68 + i * 0.06)}" y="${h * 0.1}" width="${w * 0.035}" height="${h * 0.42}" fill="#1a1a1a" stroke="#555" stroke-width=".5"/>`;
    let m2 = '';
    for (let i = 0; i < Math.min(2, d.m2); i++) m2 += `<rect x="${w * 0.25}" y="${h * (0.58 + i * 0.12)}" width="${w * 0.4}" height="${h * 0.05}" fill="#2b2b2b" stroke="#666" stroke-width=".5"/>`;
    return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="3" fill="${c}" stroke="#0b0d10" stroke-width="2"/>
      <path d="M${w * 0.1},${h * 0.9} L${w * 0.3},${h * 0.7} L${w * 0.6},${h * 0.7} M${w * 0.15},${h * 0.2} L${w * 0.35},${h * 0.35} L${w * 0.35},${h * 0.5}" stroke="#ffffff22" fill="none" stroke-width="1.5"/>
      <rect x="${w * 0.35}" y="${h * 0.12}" width="${w * 0.24}" height="${w * 0.24}" fill="#cfd4da" stroke="#555"/>
      <rect x="${w * 0.39}" y="${h * 0.12 + w * 0.04}" width="${w * 0.16}" height="${w * 0.16}" fill="#9aa1a9"/>
      ${dimms}${m2}
      <rect x="${w * 0.05}" y="${h * 0.86}" width="${w * 0.75}" height="${h * 0.04}" fill="#111" stroke="#777" stroke-width=".5"/>
      <rect x="${w * 0.04}" y="${h * 0.05}" width="${w * 0.12}" height="${h * 0.3}" fill="#333" stroke="#777" stroke-width=".5"/>`;
  },
  cpu(d, w, h, o = {}) {
    const s = Math.min(w, h) * 0.9, x = (w - s) / 2, y = (h - s) / 2;
    const c = brandColor(d);
    return `<g transform="rotate(${o.rot || 0} ${w / 2} ${h / 2})">
      <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.04}" fill="#2a6b3a" stroke="#0b0d10"/>
      <rect x="${x + s * 0.1}" y="${y + s * 0.1}" width="${s * 0.8}" height="${s * 0.8}" rx="${s * 0.05}" fill="#c9ced6" stroke="#8a9099"/>
      <text x="${w / 2}" y="${h / 2 - s * 0.05}" text-anchor="middle" font-size="${s * 0.12}" font-family="Chakra Petch,sans-serif" font-weight="700" fill="${c}">${esc(d.brand.toUpperCase())}</text>
      <text x="${w / 2}" y="${h / 2 + s * 0.13}" text-anchor="middle" font-size="${s * 0.1}" font-family="Chakra Petch,sans-serif" fill="#374151">${esc(d.name.split(' ').slice(-1)[0])}</text>
      <path d="M${x + s * 0.03},${y + s * 0.03} l${s * 0.14},0 l${-s * 0.14},${s * 0.14}Z" fill="#f5c542"/></g>`;
  },
  cooler(d, w, h, o = {}) {
    if (d.type === 'aio') {
      const s = Math.min(w, h) * 0.8;
      return `<rect x="${(w - s) / 2}" y="${(h - s) / 2}" width="${s}" height="${s}" rx="${s * 0.2}" fill="#1f2937" stroke="#0b0d10"/>
        <circle cx="${w / 2}" cy="${h / 2}" r="${s * 0.3}" fill="#111827" stroke="${brandColor(d)}" stroke-width="${s * 0.05}"/>
        <text x="${w / 2}" y="${h / 2 + s * 0.06}" text-anchor="middle" font-size="${s * 0.16}" fill="#9fd7ef" font-family="Chakra Petch,sans-serif">${d.radiator}</text>`;
    }
    const fins = Array.from({ length: 10 }, (_, i) => `<rect x="${w * 0.08}" y="${h * (0.08 + i * 0.085)}" width="${w * 0.84}" height="${h * 0.035}" fill="#c4cad1"/>`).join('');
    const fr = Math.min(w, h) * 0.36;
    return `<rect x="${w * 0.06}" y="${h * 0.05}" width="${w * 0.88}" height="${h * 0.9}" rx="4" fill="#8b929b"/>${fins}
      ${fanFace(w / 2, h / 2, fr, { color: '#1f242c', blade: d.id === 'cool-breeze-65' ? '#3b4250' : brandColor(d), spin: o.spin })}`;
  },
  ram(d, w, h, o = {}) {
    const c = brandColor(d);
    const notch = o.rot === 180 ? 0.62 : 0.38;
    const vertical = h > w;
    if (vertical) {
      return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="1" fill="#1e5631"/>
        <rect x="${w * 0.08}" y="${h * 0.03}" width="${w * 0.84}" height="${h * 0.86}" rx="1" fill="${c}"/>
        <rect x="0" y="${h * (0.92)}" width="${w}" height="${h * 0.08}" fill="#d4af37"/><rect x="0" y="${h * notch}" width="${w * 0.25}" height="${h * 0.04}" fill="#0b0d10"/>`;
    }
    return `<rect x="1" y="${h * 0.1}" width="${w - 2}" height="${h * 0.8}" rx="2" fill="#1e5631"/>
      <rect x="${w * 0.03}" y="${h * 0.12}" width="${w * 0.94}" height="${h * 0.55}" rx="2" fill="${c}"/>
      <text x="${w / 2}" y="${h * 0.46}" text-anchor="middle" font-size="${h * 0.18}" fill="#fff" font-family="Chakra Petch,sans-serif">${d.gb}GB ${d.mem}</text>
      ${Array.from({ length: 22 }, (_, i) => `<rect x="${w * (0.04 + i * 0.042)}" y="${h * 0.74}" width="${w * 0.025}" height="${h * 0.14}" fill="#d4af37"/>`).join('')}
      <rect x="${w * notch}" y="${h * 0.72}" width="${w * 0.03}" height="${h * 0.2}" fill="#0b0d10"/>`;
  },
  storage(d, w, h) {
    const c = brandColor(d);
    if (d.kind === 'nvme') return `<rect x="1" y="${h * 0.3}" width="${w - 2}" height="${h * 0.4}" rx="2" fill="#173b2a"/><rect x="${w * 0.15}" y="${h * 0.34}" width="${w * 0.6}" height="${h * 0.32}" rx="1" fill="#111"/><rect x="${w * 0.2}" y="${h * 0.4}" width="${w * 0.22}" height="${h * 0.2}" fill="${c}"/><rect x="${w * 0.9}" y="${h * 0.38}" width="${w * 0.08}" height="${h * 0.24}" fill="#d4af37"/>`;
    if (d.kind === 'ssd') return `<rect x="${w * 0.05}" y="${h * 0.1}" width="${w * 0.9}" height="${h * 0.8}" rx="4" fill="#2b2f36" stroke="#0b0d10"/><rect x="${w * 0.12}" y="${h * 0.25}" width="${w * 0.76}" height="${h * 0.5}" rx="3" fill="${c}"/><text x="${w / 2}" y="${h * 0.56}" text-anchor="middle" font-size="${h * 0.17}" fill="#fff" font-family="Chakra Petch,sans-serif">SSD ${d.gb >= 1000 ? d.gb / 1000 + 'TB' : d.gb + 'GB'}</text>`;
    return `<rect x="${w * 0.04}" y="${h * 0.06}" width="${w * 0.92}" height="${h * 0.88}" rx="3" fill="#a7adb5" stroke="#3f444b"/><circle cx="${w * 0.42}" cy="${h / 2}" r="${h * 0.34}" fill="#c9ced5" stroke="#7b8189"/><circle cx="${w * 0.42}" cy="${h / 2}" r="${h * 0.07}" fill="#555"/><path d="M${w * 0.8},${h * 0.2} L${w * 0.5},${h * 0.45}" stroke="#3f444b" stroke-width="${h * 0.06}" stroke-linecap="round"/>`;
  },
  psu(d, w, h) {
    const c = brandColor(d);
    const fr = Math.min(w * 0.3, h * 0.42);
    return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="4" fill="#1d2127" stroke="#0b0d10" stroke-width="2"/>
      <rect x="${w * 0.04}" y="${h * 0.1}" width="${w * 0.2}" height="${h * 0.8}" rx="2" fill="${c}"/>
      ${fanFace(w * 0.62, h / 2, fr, { color: '#111418', blade: '#3a414c' })}
      <circle cx="${w * 0.62}" cy="${h / 2}" r="${fr}" fill="none" stroke="#5b6573" stroke-dasharray="2 3"/>
      <text x="${w * 0.14}" y="${h * 0.58}" text-anchor="middle" font-size="${h * 0.2}" fill="#111" font-family="Chakra Petch,sans-serif" font-weight="700">${d.watts}</text>`;
  },
  gpu(d, w, h, o = {}) {
    const c = brandColor(d);
    const fans = d.length > 290 ? 3 : d.length > 200 ? 2 : 1;
    const fr = Math.min(h * 0.36, w / (fans * 2.4));
    let f = '';
    for (let i = 0; i < fans; i++) f += fanFace(w * (0.18 + (i + 0.5) * (0.78 / fans)), h * 0.45, fr, { color: '#111418', blade: '#4b5563', spin: o.spin });
    return `<rect x="${w * 0.02}" y="${h * 0.06}" width="${w * 0.96}" height="${h * 0.78}" rx="${h * 0.12}" fill="#23272e" stroke="#0b0d10" stroke-width="2"/>
      <path d="M${w * 0.06},${h * 0.1} L${w * 0.2},${h * 0.1} L${w * 0.14},${h * 0.8} L${w * 0.06},${h * 0.8}Z" fill="${c}"/>${f}
      <rect x="${w * 0.2}" y="${h * 0.84}" width="${w * 0.55}" height="${h * 0.12}" fill="#d4af37"/>
      ${d.pins ? `<rect x="${w * 0.86}" y="${h * 0.0}" width="${w * 0.1}" height="${h * 0.12}" fill="#0b0d10"/>` : ''}`;
  },
  fan(d, w, h, o = {}) {
    const r = Math.min(w, h) * 0.46;
    const frame = `<rect x="${w / 2 - r * 1.05}" y="${h / 2 - r * 1.05}" width="${r * 2.1}" height="${r * 2.1}" rx="${r * 0.18}" fill="#14171c" stroke="#3a414c"/>`;
    const arrow = o.dir ? `<path d="M${w / 2},${h * 0.1} l${r * 0.25},${r * 0.3} l${-r * 0.5},0Z" fill="${o.dir === 'in' ? '#38bdf8' : '#f97316'}" transform="rotate(${o.dir === 'in' ? 90 : -90} ${w / 2} ${h / 2})"/>` : '';
    return frame + fanFace(w / 2, h / 2, r * 0.95, { color: '#1b1f26', blade: d.rgb ? '#8b5cf6' : d.size === 140 ? '#6b7280' : '#4b5563', rgb: d.rgb, spin: o.spin }) + arrow;
  },
  os(d, w, h) {
    const c = brandColor(d);
    return `<rect x="${w * 0.2}" y="${h * 0.3}" width="${w * 0.55}" height="${h * 0.4}" rx="4" fill="${c}"/><rect x="${w * 0.75}" y="${h * 0.38}" width="${w * 0.12}" height="${h * 0.24}" fill="#c0c6ce"/>
      <text x="${w * 0.47}" y="${h * 0.55}" text-anchor="middle" font-size="${h * 0.14}" fill="#fff" font-family="Chakra Petch,sans-serif">${esc(d.name.split(' ')[0])}</text>`;
  },
};

export function partArt(d, w, h, opts = {}) {
  const fn = ART[d.cat];
  return fn ? fn(d, w, h, opts) : `<rect width="${w}" height="${h}" fill="#444"/>`;
}

export function partIcon(d, opts = {}) {
  const w = opts.w || 96, h = opts.h || 64;
  const box = { gpu: [120, 50], ram: [120, 36], psu: [100, 60], motherboard: [64, 80], case: [60, 80], storage: d.kind === 'nvme' ? [110, 34] : [90, 60], cpu: [64, 64], cooler: [64, 64], fan: [64, 64], os: [90, 60] }[d.cat] || [w, h];
  return `<svg viewBox="0 0 ${box[0]} ${box[1]}" class="part-svg" aria-hidden="true"><defs>${RGB_DEF}</defs>${partArt(d, box[0], box[1], opts)}</svg>`;
}

export const RGB_DEF = '<linearGradient id="rgb-grad" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#f43f5e"/><stop offset=".35" stop-color="#a855f7"/><stop offset=".7" stop-color="#22d3ee"/><stop offset="1" stop-color="#84cc16"/></linearGradient>';

// customer portraits: deterministic from the name
const SKIN = ['#f5d0b5', '#e8b996', '#d49a6a', '#b07a4f', '#8a5a3b', '#5e3b26'];
const HAIR = ['#1f1a17', '#3b2a1e', '#6b4423', '#a0612b', '#d9b26b', '#9ca3af', '#e5e7eb', '#7c2d12', '#312e81'];
const SHIRT = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4b5563', '#be185d', '#ca8a04'];

export function portrait(name, size = 64, org = false) {
  const hsh = hashStr(name);
  const r = n => (hsh >>> (n * 3)) % 997;
  if (org) {
    const c = SHIRT[r(1) % SHIRT.length];
    const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2);
    return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="portrait" aria-hidden="true"><rect width="64" height="64" rx="12" fill="${c}"/><rect x="14" y="20" width="36" height="30" rx="3" fill="#ffffff22" stroke="#fff6"/><path d="M10 22 L32 8 L54 22Z" fill="#ffffff33"/><text x="32" y="42" text-anchor="middle" font-size="16" font-family="Chakra Petch,sans-serif" font-weight="700" fill="#fff">${esc(initials)}</text></svg>`;
  }
  const skin = SKIN[r(1) % SKIN.length], hair = HAIR[r(2) % HAIR.length], shirt = SHIRT[r(3) % SHIRT.length];
  const style = r(4) % 5, glasses = r(5) % 4 === 0, bg = ['#1e293b', '#27303f', '#2a2438', '#1f3330'][r(6) % 4];
  const hairPath = [
    '<path d="M18 28 Q18 12 32 12 Q46 12 46 28 Q42 18 32 19 Q22 18 18 28Z"/>',
    '<path d="M16 34 Q14 10 32 11 Q50 10 48 34 L46 26 Q40 17 32 18 Q24 17 18 26Z"/>',
    '<path d="M17 30 Q16 12 32 11 Q48 12 47 30 Q46 22 40 20 Q30 24 20 21Z"/><path d="M14 30 Q12 48 20 52 L22 30Z"/><path d="M50 30 Q52 48 44 52 L42 30Z"/>',
    '<circle cx="32" cy="12" r="6"/><path d="M18 28 Q18 14 32 14 Q46 14 46 28 Q40 20 32 21 Q24 20 18 28Z"/>',
    '<path d="M20 22 Q32 14 44 22 L44 24 Q32 19 20 24Z"/>',
  ][style];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" class="portrait" aria-hidden="true"><rect width="64" height="64" rx="12" fill="${bg}"/>
    <path d="M10 64 Q12 46 32 46 Q52 46 54 64Z" fill="${shirt}"/><rect x="28" y="38" width="8" height="10" fill="${skin}"/>
    <ellipse cx="32" cy="29" rx="13" ry="15" fill="${skin}"/>
    <g fill="${hair}">${hairPath}</g>
    <circle cx="27" cy="30" r="1.6" fill="#1f2937"/><circle cx="37" cy="30" r="1.6" fill="#1f2937"/>
    <path d="M27 37 Q32 ${40 + (r(7) % 3) - 1} 37 37" stroke="#7c2d12" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    ${glasses ? '<g fill="none" stroke="#111827" stroke-width="1.4"><circle cx="27" cy="30" r="4"/><circle cx="37" cy="30" r="4"/><path d="M31 30 L33 30"/></g>' : ''}</svg>`;
}

// The empire skyline: a strip of silhouettes along the bottom of the Mint panel that grows
// with what you own. Each building has a slot; it appears with the first copy and gets taller
// as the count grows (one step at 1, 4, 10, 32, 100, 317 owned). The sky warms with your rank.
// Re-rendered only when a level or the rank changes.
import { BUILDINGS } from './buildings.js';
import { RANKS } from './milestones.js';

const W = 560, H = 120, GROUND = 110, SLOT = W / BUILDINGS.length;
const FILL = { business: '#3a3436', machine: '#33302c', worker: '#2f3330' };

export function skylineLevel(owned) {
  if (owned <= 0) return 0;
  return Math.min(6, 1 + Math.floor(Math.log10(owned) * 2));
}

// a few lit windows in a fixed pattern (the same every render, so nothing flickers)
function windows(x, y, w, h, seed) {
  let out = '';
  for (let wy = y + 6; wy < y + h - 6; wy += 8) {
    for (let wx = x + 4; wx < x + w - 4; wx += 6) {
      seed = (seed * 9301 + 49297) % 233280;
      if (seed / 233280 < 0.45) out += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="#f0c46a" opacity=".85"/>`;
    }
  }
  return out;
}

function shape(def, level, i) {
  const x = i * SLOT, h = 12 + level * 13, top = GROUND - h;
  const fill = FILL[def.kind];
  if (def.kind === 'business') {
    // a tower with a peaked roof and lit windows
    const w = 22, bx = x + (SLOT - w) / 2;
    return `<path d="M${bx} ${GROUND}V${top}l${w / 2} -7l${w / 2} 7V${GROUND}z" fill="${fill}"/>${windows(bx, top, w, h, i * 97 + level)}`;
  }
  if (def.kind === 'machine') {
    // a works hall with a chimney and drifting smoke
    const hall = Math.max(10, h * 0.55), cx = x + SLOT - 13;
    return `<rect x="${x + 4}" y="${GROUND - hall}" width="${SLOT - 8}" height="${hall}" fill="${fill}"/>
      <path d="M${x + 4} ${GROUND - hall}l6 -5v5l6 -5v5l6 -5v5" fill="${fill}"/>
      <rect x="${cx}" y="${top}" width="5" height="${h}" fill="${fill}"/>
      <circle class="smoke" cx="${cx + 2.5}" cy="${top - 4}" r="3"/><circle class="smoke s2" cx="${cx + 4}" cy="${top - 4}" r="2.5"/>
      ${windows(x + 4, GROUND - hall, SLOT - 18, hall, i * 31 + level)}`;
  }
  // workers: a cluster of gabled houses, more and taller with the level
  let out = '';
  const n = Math.min(3, Math.ceil(level / 2));
  for (let k = 0; k < n; k++) {
    const hw = 11, hx = x + 3 + k * 11, hh = 8 + level * 4 - k * 5;
    out += `<path d="M${hx} ${GROUND}V${GROUND - hh}l${hw / 2} -5l${hw / 2} 5V${GROUND}z" fill="${fill}" opacity="${1 - k * 0.12}"/>`;
    out += `<rect x="${hx + 4}" y="${GROUND - hh + 3}" width="3" height="3" fill="#f0c46a" opacity=".8"/>`;
  }
  return out;
}

export function createSkyline(container) {
  let key = null;
  return function render(state) {
    const levels = BUILDINGS.map(b => skylineLevel(state.buildings[b.id] || 0));
    const next = `${levels.join('')}:${state.rank}`;
    if (next === key) return;
    key = next;
    const glow = Math.min(1, state.rank / (RANKS.length - 1));
    const slots = BUILDINGS.map((b, i) => {
      if (!levels[i]) return `<rect x="${i * SLOT + 8}" y="${GROUND - 1}" width="${SLOT - 16}" height="1" fill="#3a3236"/>`;
      const owned = state.buildings[b.id];
      return `<g><title>${owned} ${owned === 1 ? b.name : b.plural}</title>${shape(b, levels[i], i)}</g>`;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="Your empire's skyline">
      <defs><linearGradient id="skyGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a171c" stop-opacity="0"/>
        <stop offset="1" stop-color="#e8b54a" stop-opacity="${(0.06 + glow * 0.3).toFixed(2)}"/>
      </linearGradient></defs>
      <rect width="${W}" height="${GROUND}" fill="url(#skyGlow)"/>
      ${slots}
      <rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#26211f"/>
      <rect y="${GROUND}" width="${W}" height="1.5" fill="#5a4c3a"/>
    </svg>`;
  };
}

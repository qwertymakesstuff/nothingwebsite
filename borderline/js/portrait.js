import { esc } from './html.js';

// Builds an entrant's portrait as an SVG string from their `look` data. The same function
// draws the booth view and the passport photo, so the two always match.
//   look: { skin, hair, hairStyle: short|long|bun|cap|scarf, coat, collar, beard?, glasses? }

const HAIR_BACK = {
  long: h => `<path d="M30 52c0-26 14-38 30-38s30 12 30 38v40H30z" fill="${h}"/>`,
  bun: h => `<circle cx="60" cy="16" r="10" fill="${h}"/>`,
};
const HAIR_FRONT = {
  short: h => `<path d="M36 46c0-18 10-28 24-28s24 10 24 28c-6-8-14-12-24-12s-18 4-24 12z" fill="${h}"/>`,
  long: h => `<path d="M36 50c0-20 10-30 24-30s24 10 24 30c-4-10-12-16-24-16s-20 6-24 16z" fill="${h}"/>`,
  bun: h => `<path d="M36 48c0-18 10-26 24-26s24 8 24 26c-6-9-14-13-24-13s-18 4-24 13z" fill="${h}"/>`,
  cap: h => `<path d="M34 40c2-14 12-22 26-22s24 8 26 22z" fill="${h}"/><path d="M30 40h56l-4 5H30z" fill="${h}" opacity=".75"/>`,
  scarf: h => `<path d="M32 58c-2-26 10-42 28-42s30 16 28 42l-6 10c0-18-8-34-22-34s-22 16-22 34z" fill="${h}"/>`,
};

export function portraitSVG(look = {}, { title = '' } = {}) {
  const skin = look.skin || '#d8b090';
  const hair = look.hair || '#3a2a20';
  const style = HAIR_FRONT[look.hairStyle] ? look.hairStyle : 'short';
  const back = HAIR_BACK[style] ? HAIR_BACK[style](hair) : '';
  const beard = look.beard ? `<path d="M44 62c2 14 8 20 16 20s14-6 16-20c-4 6-10 8-16 8s-12-2-16-8z" fill="${hair}"/>` : '';
  const glasses = look.glasses
    ? `<g fill="none" stroke="#222" stroke-width="1.6"><circle cx="51" cy="54" r="6"/><circle cx="69" cy="54" r="6"/><path d="M57 54h6"/></g>` : '';
  const label = title ? `<title>${esc(title)}</title>` : '';
  return `<svg class="portrait" viewBox="0 0 120 120" role="img" aria-label="${esc(title || 'Portrait')}">${label}
    ${back}
    <path d="M14 120c4-26 22-36 46-36s42 10 46 36z" fill="${look.coat || '#4a4a4a'}"/>
    <path d="M48 86l12 14 12-14z" fill="${look.collar || '#ddd'}"/>
    <rect x="52" y="72" width="16" height="16" rx="4" fill="${skin}"/>
    <ellipse cx="60" cy="54" rx="22" ry="26" fill="${skin}"/>
    <circle cx="51" cy="54" r="2.2" fill="#1e1a16"/><circle cx="69" cy="54" r="2.2" fill="#1e1a16"/>
    <path d="M60 56v8h-3" fill="none" stroke="#00000040" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M53 70q7 4 14 0" fill="none" stroke="#5a3028" stroke-width="1.8" stroke-linecap="round"/>
    ${beard}${HAIR_FRONT[style](hair)}${glasses}
  </svg>`;
}

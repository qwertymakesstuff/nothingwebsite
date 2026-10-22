// Renders documents as HTML: ID cards (styled per issuer), event tickets, member cards and
// wristbands, plus the reference-sheet sample cards and hologram emblems. Fields carry
// data-compare attributes for the Compare tool.

import { esc } from './dom.js';
import { fmtDoc } from '../dates.js';
import { ISSUERS } from '../issuers.js';
import { photoSvg } from '../portrait.js';

const EMBLEM_PATHS = {
  heron: 'M30 52 L30 30 Q30 18 40 16 Q46 15 46 20 L38 22 Q36 30 40 36 Q50 44 44 56 Z M30 52 L26 60 M34 52 L36 60',
  lighthouse: 'M26 58 L30 24 L38 24 L42 58 Z M28 20 L40 20 L40 24 L28 24 Z M34 12 L34 20 M22 18 L14 14 M46 18 L54 14',
  oak: 'M34 58 L34 40 M34 40 Q16 40 18 26 Q14 12 30 12 Q34 4 42 12 Q56 12 52 26 Q54 40 34 40',
  star: 'M34 10 L40 28 L58 28 L44 39 L49 57 L34 46 L19 57 L24 39 L10 28 L28 28 Z',
  compass: 'M34 10 A24 24 0 1 1 33.9 10 Z M34 16 L39 34 L34 52 L29 34 Z M16 34 L52 34',
  crown: 'M14 50 L18 22 L28 36 L34 16 L40 36 L50 22 L54 50 Z',
  wave: 'M10 40 Q20 24 30 40 Q40 56 50 40 Q56 30 60 34 M10 50 Q20 34 30 50 Q40 66 50 50',
};

export function emblemSvg(name, { strong = false, cls = '' } = {}) {
  if (!name) return '';
  return `<svg class="emblem ${cls} ${strong ? 'strong' : ''}" viewBox="0 0 68 68" aria-label="${esc(name)} hologram" role="img"><defs><linearGradient id="holo-${name}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#9af7ff"/><stop offset=".5" stop-color="#ff9cf5"/><stop offset="1" stop-color="#fff59a"/></linearGradient></defs><path d="${EMBLEM_PATHS[name] ?? ''}" fill="none" stroke="url(#holo-${name})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const field = (label, value, compare, cls = '') => `<div class="f ${cls}"><span class="fl">${esc(label)}</span><button type="button" class="fv" data-compare='${esc(JSON.stringify(compare))}'>${esc(value)}</button></div>`;

export function idCardHtml(id, { uv = false } = {}) {
  if (!id) return `<div class="doc doc-none"><p>No ID presented.</p></div>`;
  const iss = ISSUERS[id.issuer];
  return `<article class="doc id-card" style="--card:${esc(id.color)}" aria-label="${esc(iss.kind)}">
    <header class="id-head"><span class="id-header">${esc(id.header)}</span><span class="id-kind">${esc(id.idType)}</span></header>
    <div class="id-body">
      <div class="id-photo">${photoSvg(id.photo)}</div>
      <div class="id-fields">
        ${field('Name', id.name, { kind: 'name', label: 'ID name', value: id.name }, 'wide')}
        ${field('Date of birth', fmtDoc(id.dob), { kind: 'date', label: 'Date of birth', value: id.dob })}
        ${field('Expires', fmtDoc(id.expires), { kind: 'date', label: 'Expiry date', value: id.expires })}
        ${field('Issued', fmtDoc(id.issued), { kind: 'date', label: 'Issue date', value: id.issued })}
        ${field('Height', `${id.heightCm} cm`, { kind: 'height', label: 'ID height', value: id.heightCm })}
        ${field('Eyes', id.eyes.toUpperCase(), { kind: 'eyes', label: 'ID eye colour', value: id.eyes })}
        ${field('No.', id.number, { kind: 'number', label: 'ID number', value: id.number, issuer: id.issuer }, 'wide mono')}
      </div>
    </div>
    <footer class="id-foot"><span class="id-addr">${esc(id.address)}</span><span class="holo ${uv ? 'uv' : ''}">${id.hologram ? emblemSvg(id.hologram, { strong: uv }) : '<span class="no-holo" aria-label="no hologram"></span>'}</span></footer>
  </article>`;
}

export function ticketHtml(t) {
  return `<article class="doc ticket" aria-label="Event ticket">
    <div class="tk-main">
      <span class="tk-label">ADMIT ONE</span>
      ${field('Event', t.event, { kind: 'event', label: 'Ticket event', value: t.event }, 'tk-event')}
      <div class="tk-row">${field('Date', fmtDoc(t.date), { kind: 'date', label: 'Ticket date', value: t.date })}${field('Holder', t.holder, { kind: 'name', label: 'Ticket holder', value: t.holder })}</div>
      <span class="tk-tier">${esc(t.tier)}</span>
    </div>
    <div class="tk-stub">${field('Code', t.code, { kind: 'code', label: 'Ticket code', value: t.code }, 'mono')}<div class="barcode" aria-hidden="true"></div></div>
  </article>`;
}

export function memberHtml(m) {
  return `<article class="doc member" aria-label="Member card">
    <header><span class="mb-club">THE ORCHID ROOM</span><span class="mb-tier">${esc(m.tier)} MEMBER</span></header>
    ${field('Member', m.name, { kind: 'name', label: 'Member name', value: m.name }, 'wide')}
    <div class="tk-row">${field('No.', m.number, { kind: 'member', label: 'Member number', value: m.number }, 'mono')}${field('Valid thru', fmtDoc(m.validThru), { kind: 'date', label: 'Membership valid thru', value: m.validThru })}</div>
  </article>`;
}

const BAND = { green: '#3fcf6a', pink: '#ff6fbf', blue: '#4f8dff', orange: '#ff9a3c', yellow: '#ffe14d', white: '#f0f0f0' };
export function bandSwatch(w) {
  const c = BAND[w.color] ?? '#ccc';
  const pat = w.pattern === 'dots' ? `<g fill="#1a1220">${[14, 34, 54, 74, 94].map(x => `<circle cx="${x}" cy="12" r="4"/>`).join('')}</g>`
    : w.pattern === 'stripes' ? `<g stroke="#1a1220" stroke-width="4">${[8, 22, 36, 50, 64, 78, 92].map(x => `<path d="M${x} 2 L${x + 8} 22"/>`).join('')}</g>`
      : `<g fill="#1a1220">${[10, 30, 50, 70, 90].map(x => `<path d="M${x} 19 L${x + 6} 5 L${x + 12} 19 Z"/>`).join('')}</g>`;
  return `<svg class="band" viewBox="0 0 108 24" role="img" aria-label="${esc(w.color)} wristband with ${esc(w.pattern)}"><rect x="1" y="1" width="106" height="22" rx="6" fill="${c}" stroke="#1a1220" stroke-width="2"/>${pat}</svg>`;
}
export function wristbandHtml(w) {
  return `<article class="doc wristband" aria-label="Wristband"><span class="fl">Wristband</span>${bandSwatch(w)}<button type="button" class="fv" data-compare='${esc(JSON.stringify({ kind: 'band', label: 'Wristband', value: `${w.color} ${w.pattern}` }))}'>${esc(w.color)} · ${esc(w.pattern)}</button></article>`;
}

export function sampleCardHtml(iss) {
  return `<div class="sample" style="--card:${iss.hex}">
    <div class="sample-card"><span class="id-header">${esc(iss.full)}</span><span class="id-kind">${esc(iss.kind)}</span>${emblemSvg(iss.emblem, { strong: true })}</div>
    <dl><dt>Header</dt><dd>${esc(iss.full)}</dd><dt>Colour</dt><dd>${esc(iss.color)}</dd><dt>Number</dt><dd class="mono">${esc(iss.patternText)}</dd><dt>Hologram</dt><dd>${esc(iss.emblem)}</dd></dl>
  </div>`;
}

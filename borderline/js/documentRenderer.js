// Turns structured document data into the paper the player reads. Each field shown comes
// straight from the document object; nothing is invented at render time.
//   renderDocument(doc, visitor, { stamp }) → HTML string
import { esc } from './html.js';
import { formatDoc } from './dates.js';
import { NATIONS, SETTING } from '../data/setting.js';
import { portraitSVG } from './portrait.js';

const EMBLEMS = {
  star: 'M20 4l4.7 10.2 11.3 1.2-8.4 7.6 2.4 11-10-5.8-10 5.8 2.4-11-8.4-7.6 11.3-1.2z',
  wheel: 'M20 4a16 16 0 1 0 0 32 16 16 0 0 0 0-32zm0 5v22M9 20h22M12 12l16 16M28 12L12 28',
  tree: 'M20 4l12 16h-7l9 10H6l9-10H8zM18 30h4v6h-4z',
  tower: 'M12 36V14l8-10 8 10v22zM16 18h8M16 24h8M16 30h8',
  sun: 'M20 12a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM20 2v6M20 32v6M2 20h6M32 20h6M7 7l4 4M29 29l4 4M33 7l-4 4M11 29l-4 4',
};

export const emblemSVG = (key, colour) =>
  `<svg class="emblem" viewBox="0 0 40 40" aria-hidden="true"><path d="${EMBLEMS[key] || EMBLEMS.star}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round"/></svg>`;

const field = (label, value, key) =>
  `<div class="doc-field" data-field="${esc(key)}"><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;

const STAMPS = { accept: 'Entry granted', reject: 'Entry denied' };
const stampMark = decision => decision
  ? `<div class="doc-stamp mark-${esc(decision)}" role="img" aria-label="Stamped: ${esc(STAMPS[decision])}"><span>${esc(STAMPS[decision])}</span><small>${esc(SETTING.checkpoint.post)}</small></div>` : '';

const nationName = code => NATIONS[code]?.name || code;

function passport(doc, visitor, opts) {
  const n = NATIONS[doc.nation] || { name: doc.nation, cover: '#444', ink: '#eee', emblem: 'star' };
  return `<article class="doc doc-passport" style="--cover:${n.cover};--cover-ink:${n.ink}" aria-label="Passport of ${esc(n.name)}">
    <header class="doc-head">
      ${emblemSVG(n.emblem, n.ink)}
      <div><p class="doc-issuer">${esc(n.name)}</p><p class="doc-kind">Passport</p></div>
    </header>
    <div class="doc-body passport-body">
      <div class="doc-photo">${portraitSVG(visitor.look, { title: `Passport photograph of ${doc.given} ${doc.surname}` })}</div>
      <dl class="doc-fields">
        ${field('Surname', doc.surname, 'surname')}
        ${field('Given names', doc.given, 'given')}
        ${field('Date of birth', formatDoc(doc.dob), 'dob')}
        ${field('Sex', doc.sex, 'sex')}
        ${field('Issued in', doc.issuedIn, 'issuedIn')}
        ${field('Expires', formatDoc(doc.expires), 'expires')}
      </dl>
    </div>
    <div class="doc-stamps" aria-label="Entry stamps">${stampMark(opts.stamp) || '<span class="doc-stamps-label">Entry stamps</span>'}</div>
    <footer class="doc-number">${esc(doc.number)}</footer>
  </article>`;
}

function declaration(doc) {
  return `<article class="doc doc-declaration" aria-label="Entry declaration">
    <header class="doc-head">
      <div><p class="doc-issuer">${esc(SETTING.country.formal)} · ${esc(SETTING.country.ministry)}</p><p class="doc-kind">Entry Declaration</p></div>
      <span class="doc-form">Form P-2</span>
    </header>
    <dl class="doc-fields doc-grid">
      ${field('Surname', doc.surname, 'surname')}
      ${field('Given names', doc.given, 'given')}
      ${field('Nationality', nationName(doc.nationality), 'nationality')}
      ${field('Passport no.', doc.passportNo, 'passportNo')}
      ${field('Purpose of visit', doc.purpose, 'purpose')}
      ${field('Duration of stay', doc.duration, 'duration')}
      ${field('Destination', doc.destination, 'destination')}
    </dl>
    <p class="doc-fine">I declare the above to be true. False declarations are punishable under the Passage Act.</p>
  </article>`;
}

const RENDERERS = { passport, declaration };

export function renderDocument(doc, visitor, opts = {}) {
  const r = RENDERERS[doc.type];
  if (!r) throw new Error(`no renderer for document type "${doc.type}"`);
  return r(doc, visitor, opts);
}

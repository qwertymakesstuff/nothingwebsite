// Turns structured document data into the paper the player reads. Field text comes from
// documentFields(), so the page always shows exactly what the document object holds.
//   renderDocument(doc, visitor, { stamp, docIndex }) → HTML string
import { esc } from './html.js';
import { NATIONS, SETTING } from '../data/setting.js';
import { DOCUMENT_TYPES } from '../data/documents.js';
import { documentFields } from './documentFactory.js';
import { portraitHTML } from './portrait.js';

// official seals and the forgeries of them (see FORGED_SEALS in data/setting.js)
export const EMBLEMS = {
  star: 'M20 4l4.7 10.2 11.3 1.2-8.4 7.6 2.4 11-10-5.8-10 5.8 2.4-11-8.4-7.6 11.3-1.2z',
  star6: 'M20 4l4.6 8h9.3l-4.7 8 4.7 8h-9.3L20 36l-4.6-8H6.1l4.7-8-4.7-8h9.3z',
  wheel: 'M20 4a16 16 0 1 0 0 32 16 16 0 0 0 0-32zm0 5v22M9 20h22M12 12l16 16M28 12L12 28',
  wheel3: 'M20 4a16 16 0 1 0 0 32 16 16 0 0 0 0-32zM20 20V9M20 20l-9.5 5.5M20 20l9.5 5.5',
  tree: 'M20 4l12 16h-7l9 10H6l9-10H8zM18 30h4v6h-4z',
  tree2: 'M20 4l12 22H8zM18 26h4v10h-4z',
  tower: 'M12 36V14l8-10 8 10v22zM16 18h8M16 24h8M16 30h8',
  towerFlat: 'M12 36V10h16v26zM16 18h8M16 24h8M16 30h8',
  sun: 'M20 12a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM20 2v6M20 32v6M2 20h6M32 20h6M7 7l4 4M29 29l4 4M33 7l-4 4M11 29l-4 4',
  sunRay: 'M20 12a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM20 2v6M20 32v6M2 20h6M32 20h6',
  ministry: 'M20 3l15 8v2H5v-2zM8 15h3v14H8zM15 15h3v14h-3zM22 15h3v14h-3zM29 15h3v14h-3zM5 31h30v4H5z',
};

export const emblemSVG = (key, colour, label = '') =>
  `<svg class="emblem" viewBox="0 0 40 40" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}><path d="${EMBLEMS[key] || ''}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round"/></svg>`;

const fieldHTML = (f, docIndex) =>
  `<div class="doc-field" data-doc="${docIndex}" data-field="${esc(f.key)}" data-kind="${esc(f.kind)}"><span class="f-label">${esc(f.label)}</span><span class="f-value">${esc(f.display)}</span></div>`;

const fieldsHTML = (doc, docIndex, keys) => {
  const all = documentFields(doc);
  return (keys ? keys.map(k => all.find(f => f.key === k)) : all).map(f => fieldHTML(f, docIndex)).join('');
};

const STAMPS = { accept: 'Entry granted', reject: 'Entry denied' };
const stampMark = decision => decision
  ? `<div class="doc-stamp mark-${esc(decision)}" role="img" aria-label="Stamped: ${esc(STAMPS[decision])}"><span>${esc(STAMPS[decision])}</span><small>${esc(SETTING.checkpoint.post)}</small></div>` : '';

const photo = (doc, visitor) =>
  `<div class="doc-photo">${portraitHTML(visitor, { title: `Photograph of ${doc.given} ${doc.surname}` })}</div>`;

const RENDERERS = {
  passport(doc, visitor, o) {
    const n = NATIONS[doc.nationality] || { name: doc.nationality, cover: '#444', ink: '#eee' };
    return `<header class="doc-head" style="--cover:${n.cover};--cover-ink:${n.ink}">
        <span class="doc-seal" data-seal="${esc(doc.seal)}">${emblemSVG(doc.seal, n.ink, `Seal on the passport cover`)}</span>
        <div><p class="doc-issuer">${esc(n.name)}</p><p class="doc-kind">Passport</p></div>
      </header>
      <div class="doc-body passport-body">${photo(doc, visitor)}<div class="doc-fields">${fieldsHTML(doc, o.docIndex, ['surname', 'given', 'dob', 'sex', 'nationality', 'issuedIn', 'expires'])}</div></div>
      <div class="doc-stamps" aria-label="Entry stamps">${stampMark(o.stamp) || '<span class="doc-stamps-label">Entry stamps</span>'}</div>
      <footer class="doc-number">${fieldsHTML(doc, o.docIndex, ['number'])}</footer>`;
  },
  idCard(doc, visitor, o) {
    return `<header class="doc-head"><div><p class="doc-issuer">${esc(SETTING.country.formal)}</p><p class="doc-kind">Identity Card</p></div>${emblemSVG('star', '#e8cf8a')}</header>
      <div class="doc-body id-body">${photo(doc, visitor)}<div class="doc-fields doc-grid">${fieldsHTML(doc, o.docIndex)}</div></div>`;
  },
  declaration(doc, visitor, o) {
    return `<header class="doc-head"><div><p class="doc-issuer">${esc(SETTING.country.formal)} · ${esc(SETTING.country.ministry)}</p><p class="doc-kind">Entry Declaration</p></div><span class="doc-form">Form P-2</span></header>
      <div class="doc-fields doc-grid">${fieldsHTML(doc, o.docIndex)}</div>
      <p class="doc-fine">I declare the above to be true. False declarations are punishable under the Passage Act.</p>`;
  },
  workPermit(doc, visitor, o) {
    return `<header class="doc-head">${emblemSVG('ministry', '#3d4f5c')}<div><p class="doc-issuer">${esc(SETTING.country.formal)} · ${esc(SETTING.country.labour)}</p><p class="doc-kind">Work Permit</p></div></header>
      <div class="doc-fields doc-grid">${fieldsHTML(doc, o.docIndex)}</div>
      <p class="doc-fine">Valid only for the employer named. The holder must leave Corvenna when this permit lapses.</p>`;
  },
  entryPermit(doc, visitor, o) {
    return `<header class="doc-head">${emblemSVG('star', '#6b2626')}<div><p class="doc-issuer">${esc(SETTING.country.formal)} · ${esc(SETTING.country.ministry)}</p><p class="doc-kind">Entry Permit</p></div></header>
      <div class="doc-fields doc-grid">${fieldsHTML(doc, o.docIndex)}</div>
      <p class="doc-fine">Admits the holder once, for the purpose stated, until the date shown.</p>`;
  },
  healthCert(doc, visitor, o) {
    return `<header class="doc-head"><span class="cross" aria-hidden="true">✚</span><div><p class="doc-issuer">International Certificate of Vaccination</p><p class="doc-kind">Health Certificate</p></div></header>
      <div class="doc-fields doc-grid">${fieldsHTML(doc, o.docIndex)}</div>`;
  },
  transitPass(doc, visitor, o) {
    return `<header class="doc-head"><div><p class="doc-issuer">${esc(SETTING.country.ministry)}</p><p class="doc-kind">Transit Pass</p></div><span class="doc-form">No stopping</span></header>
      <div class="doc-fields">${fieldsHTML(doc, o.docIndex)}</div>`;
  },
};

export function renderDocument(doc, visitor, opts = {}) {
  const r = RENDERERS[doc.type];
  if (!r) throw new Error(`no renderer for document type "${doc.type}"`);
  const label = DOCUMENT_TYPES[doc.type].label;
  // papers other than the passport take the stamp across their face
  const overlay = doc.type !== 'passport' && opts.stamp ? `<div class="doc-stamp-overlay">${stampMark(opts.stamp)}</div>` : '';
  return `<article class="doc doc-${esc(doc.type)}" data-doc="${opts.docIndex ?? 0}" aria-label="${esc(label)}">${r(doc, visitor, { ...opts, docIndex: opts.docIndex ?? 0 })}${overlay}</article>`;
}

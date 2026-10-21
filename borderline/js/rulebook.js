// The rulebook on the desk, drawn from the same data the rules engine applies:
//   Rules: the regulations in force today, numbered
//   Nations: each nation's official seal and recognised issuing offices (comparable items)
//   Directive: the morning bulletin, and pay and penalties
//   Archive: regulations no longer in force and earlier directives
import { NATIONS } from '../data/setting.js';
import { esc } from './html.js';
import { emblemSVG } from './documentRenderer.js';
import { formatLong } from './dates.js';
import { SCORING } from '../data/scoring.js';
import { SETTING } from '../data/setting.js';
import { regulationChanges, archivedRegulations, REGULATIONS } from '../data/regulations.js';
import { DAYS } from '../data/campaignDays.js';

export const RULEBOOK_TABS = [['rules', 'Rules'], ['nations', 'Nations'], ['directive', 'Directive'], ['archive', 'Archive']];

const ref = (kind, label, attrs) =>
  `data-ref data-kind="${kind}" data-label="${esc(label)}" data-where="rulebook" ${attrs}`;

function rulesPage(regulations, dayNumber) {
  const ch = regulationChanges(dayNumber);
  const isNew = new Set(ch.added.map(r => r.id)), isChanged = new Set(ch.changed.map(c => c.rule.id));
  // on the first day every rule is new, so nothing is singled out
  const badge = r => (dayNumber === 1 ? '' : isNew.has(r.id) ? '<span class="rule-badge">New</span>' : isChanged.has(r.id) ? '<span class="rule-badge changed">Changed</span>' : '');
  return `<ol class="rule-list">${regulations.map(r => `<li id="rule-${esc(r.id)}">${badge(r)}${esc(r.text)}${r.note ? `<span class="rule-note">${esc(r.note)}</span>` : ''}</li>`).join('')}</ol>`;
}

const daySpan = r => (r.from === r.until ? `Day ${r.from}` : `Days ${r.from}–${r.until}`);

function archivePage(dayNumber) {
  const old = archivedRegulations(dayNumber);
  const successor = r => REGULATIONS.find(x => x.replaces === r.id);
  const rules = old.length
    ? `<ul class="archive-list">${old.map(r => `<li><span class="archive-days">${daySpan(r)}</span>${esc(r.text)}${successor(r) ? '<span class="rule-note">Replaced by a revised rule.</span>' : '<span class="rule-note">Withdrawn.</span>'}</li>`).join('')}</ul>`
    : '<p class="archive-empty">No regulation has been withdrawn or replaced yet.</p>';
  const past = DAYS.filter(d => d.day < dayNumber);
  const directives = past.length
    ? `<ul class="archive-list">${past.map(d => `<li><span class="archive-days">Day ${d.day} · ${esc(formatLong(d.date))}</span><b>${esc(d.bulletin.title)}</b>${d.bulletin.lines.map(l => `<span class="rule-note">${esc(l)}</span>`).join('')}</li>`).join('')}</ul>`
    : '<p class="archive-empty">This is your first day.</p>';
  return `<h3>Former regulations</h3>${rules}<h3 class="rulebook-sub">Earlier directives</h3>${directives}`;
}

function nationsPage() {
  return Object.values(NATIONS).map(n => `
    <section class="nation">
      <span class="nation-seal" ${ref('sealRef', n.name, `data-value="${esc(n.emblem)}" data-display="official seal"`)} aria-label="Official seal of ${esc(n.name)}">${emblemSVG(n.emblem, n.cover)}</span>
      <div>
        <h3>${esc(n.name)}</h3>
        <p class="nation-cities" ${ref('issuerList', n.name, `data-list="${esc(JSON.stringify(n.cities))}" data-display="${esc(n.cities.join(', '))}"`)}>Issuing offices: ${esc(n.cities.join(', '))}</p>
        <p class="nation-format">Passport no. ${esc(n.number.replace(/#/g, '0'))}</p>
      </div>
    </section>`).join('');
}

function directivePage(day, date) {
  const b = day.bulletin;
  const k = n => `${SETTING.currency.symbol}${n}`;
  const pay = [
    `${k(SCORING.wage)} for each correct decision.`,
    `The first ${SCORING.warningsPerShift} mistakes in a shift bring a warning. After that, each mistake is fined ${k(SCORING.fine)}.`,
    `Admitting an entrant on a forged passport (unrecognised issuing office or false seal) is fined ${k(SCORING.seriousFine)} at once.`,
  ];
  return `<h3>${esc(b.title)}</h3><p class="bulletin-date">${esc(formatLong(date))}</p><ul>${b.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    <h3 class="rulebook-sub">Pay and penalties</h3><ul>${pay.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

export function renderRulebook({ tab, regulations, day, date }) {
  const page = tab === 'nations' ? nationsPage() : tab === 'directive' ? directivePage(day, date)
    : tab === 'archive' ? archivePage(day.day) : rulesPage(regulations, day.day);
  return `<header class="rulebook-head"><p class="doc-issuer">Ministry of Passage</p><h2>Rulebook</h2></header>
    <div class="rulebook-tabs" role="tablist" aria-label="Rulebook sections">${RULEBOOK_TABS.map(([id, label]) =>
      `<button type="button" role="tab" id="rbtab-${id}" aria-selected="${tab === id}" aria-controls="rulebookPage" tabindex="${tab === id ? 0 : -1}" data-rulebook="${id}">${label}</button>`).join('')}</div>
    <div class="rulebook-page" id="rulebookPage" role="tabpanel" aria-labelledby="rbtab-${esc(tab)}">${page}</div>`;
}

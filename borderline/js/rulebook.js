// The rulebook on the desk, drawn from the same data the rules engine applies:
//   Rules: the regulations in force today, numbered
//   Nations: each nation's official seal and recognised issuing offices (comparable items)
//   Directive: the morning bulletin
import { NATIONS } from '../data/setting.js';
import { esc } from './html.js';
import { emblemSVG } from './documentRenderer.js';
import { formatLong } from './dates.js';

export const RULEBOOK_TABS = [['rules', 'Rules'], ['nations', 'Nations'], ['directive', 'Directive']];

const ref = (kind, label, attrs) =>
  `data-ref data-kind="${kind}" data-label="${esc(label)}" data-where="rulebook" ${attrs}`;

function rulesPage(regulations) {
  return `<ol class="rule-list">${regulations.map(r => `<li id="rule-${esc(r.id)}">${esc(r.text)}${r.note ? `<span class="rule-note">${esc(r.note)}</span>` : ''}</li>`).join('')}</ol>`;
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
  return `<h3>${esc(b.title)}</h3><p class="bulletin-date">${esc(formatLong(date))}</p><ul>${b.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

export function renderRulebook({ tab, regulations, day, date }) {
  const page = tab === 'nations' ? nationsPage() : tab === 'directive' ? directivePage(day, date) : rulesPage(regulations);
  return `<header class="rulebook-head"><p class="doc-issuer">Ministry of Passage</p><h2>Rulebook</h2></header>
    <div class="rulebook-tabs" role="tablist" aria-label="Rulebook sections">${RULEBOOK_TABS.map(([id, label]) =>
      `<button type="button" role="tab" id="rbtab-${id}" aria-selected="${tab === id}" aria-controls="rulebookPage" tabindex="${tab === id ? 0 : -1}" data-rulebook="${id}">${label}</button>`).join('')}</div>
    <div class="rulebook-page" id="rulebookPage" role="tabpanel" aria-labelledby="rbtab-${esc(tab)}">${page}</div>`;
}

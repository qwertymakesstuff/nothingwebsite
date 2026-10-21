// The morning briefing: the day's directive and what changed in the rulebook overnight.
import { esc } from './html.js';
import { formatLong } from './dates.js';
import { regulationChanges, activeRegulations } from '../data/regulations.js';
import { LAST_DAY } from '../data/campaignDays.js';
import { SETTING } from '../data/setting.js';

export function briefingHTML(day) {
  const ch = regulationChanges(day.day);
  const active = activeRegulations(day.day);
  const number = r => active.findIndex(x => x.id === r.id) + 1;
  const section = (title, items) => (items.length ? `<h3 class="briefing-sub">${title}</h3><ul class="briefing-list">${items.join('')}</ul>` : '');
  const added = ch.added.map(r => `<li><span class="rule-badge">New</span><b>Rule ${number(r)}.</b> ${esc(r.text)}${r.note ? `<span class="rule-note">${esc(r.note)}</span>` : ''}</li>`);
  const changed = ch.changed.map(c => `<li><span class="rule-badge changed">Changed</span><b>Rule ${number(c.rule)}.</b> ${esc(c.rule.text)}${c.rule.note ? `<span class="rule-note">${esc(c.rule.note)}</span>` : ''}<span class="rule-note">${c.previous.text === c.rule.text && !c.previous.note ? 'Before: the same rule, without the note above.' : `Before: ${esc(c.previous.text)}${c.previous.note ? ` ${esc(c.previous.note)}` : ''}`}</span></li>`);
  const withdrawn = ch.withdrawn.map(r => `<li><span class="rule-badge withdrawn">Withdrawn</span>${esc(r.text)}</li>`);
  const none = !added.length && !changed.length && !withdrawn.length;
  return `
    <p class="kicker">${esc(SETTING.country.ministry)} · Day ${day.day} of ${LAST_DAY} · ${esc(formatLong(day.date))}</p>
    <h2 id="briefingTitle">${esc(day.bulletin.title)}</h2>
    <div class="briefing-bulletin">${day.bulletin.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
    ${day.day === 1 ? section('Regulations in force', active.map(r => `<li><b>Rule ${number(r)}.</b> ${esc(r.text)}</li>`)) : ''}
    ${day.day > 1 ? section('New regulations', added) + section('Changed regulations', changed) + section('Withdrawn', withdrawn) : ''}
    ${day.day > 1 && none ? '<p class="summary-note">No change to the regulations today.</p>' : ''}
    <p class="summary-note">${active.length} regulations in force today. ${esc(String(day.entrants.length))} entrants are waiting at the barrier.</p>
    <div class="btn-row"><button type="button" class="btn primary" data-action="openCheckpoint">Open the checkpoint</button></div>`;
}

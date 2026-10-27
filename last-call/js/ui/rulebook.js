// The rule card (always visible during a shift), tonight's lists, and the full rulebook overlay
// with the ID reference sheet.

import { esc, modal } from './dom.js';
import { RULES } from '../rules.js';
import { ISSUERS } from '../issuers.js';
import { fmtDoc, fmtHHMM, bornOnOrBefore } from '../dates.js';
import { mugshotSvg } from '../portrait.js';
import { sampleCardHtml, bandSwatch } from './docs.js';
import { MIN_ISSUE_AGE } from '../issuers.js';
import { HEIGHT_TOLERANCE } from '../config.js';

function ruleDetail(r, date, opts) {
  const p = r.params;
  switch (r.id) {
    case 'age': return opts.ageWheel ? `<span class="hint-chip">Born on or before <b>${fmtDoc(bornOnOrBefore(date, p.min))}</b></span>` : '';
    case 'pass': return [
      p.accept.includes('ticket') ? `<span class="hint-chip">“${esc(p.event)}” · ${fmtDoc(date)} · ${esc(p.codePrefix)}…</span>` : '',
      p.accept.includes('wristband') && p.wristband ? `<span class="hint-chip band-chip">${bandSwatch(p.wristband)} ${esc(p.wristband.color)} · ${esc(p.wristband.pattern)}</span>` : (p.wristband ? '<span class="hint-chip warn">Re-entry closed</span>' : ''),
      p.accept.includes('guestlist') ? '<span class="hint-chip">Guest list</span>' : '',
    ].join('');
    case 'membership': return p.suspended?.length ? `<span class="hint-chip warn">Suspended: ${p.suspended.map(esc).join(', ')}</span>` : '';
    default: return '';
  }
}

export function rulesCardHtml(rules, def, { changed = [], ageWheel = false } = {}) {
  return `<ol class="rule-list">${rules.map((r, i) => `<li class="rule ${def.newRules?.includes(r.id) ? 'is-new' : ''} ${changed.includes(r.id) ? 'is-changed' : ''}">
    <span class="rule-n">${i + 1}</span><div><b>${esc(RULES[r.id].title)}</b>${def.newRules?.includes(r.id) ? '<span class="tag">new</span>' : ''}${changed.includes(r.id) ? '<span class="tag tag-warn">changed</span>' : ''}
    <p>${esc(RULES[r.id].short(r.params))}</p>${ruleDetail(r, def.date, { ageWheel })}</div></li>`).join('')}</ol>`;
}

// Tonight's lists, from the active rules' parameters.
export function listsOf(rules) {
  const get = id => rules.find(r => r.id === id)?.params;
  const out = [];
  const pass = get('pass'); const booking = get('booking'); const mem = get('membership'); const ban = get('banned');
  if (pass?.accept.includes('guestlist')) out.push({ id: 'guests', title: 'Guest list', items: pass.guests ?? [] });
  if (booking) {
    out.push({ id: 'vip', title: 'VIP list', items: booking.vip });
    if (booking.reservations.length) out.push({ id: 'res', title: 'Reservations', items: booking.reservations, kind: 'res' });
  }
  if (mem) out.push({ id: 'sponsored', title: 'Sponsored guests', items: mem.sponsored ?? [] });
  if (ban) out.push({ id: 'banned', title: 'Banned', items: ban.entries, kind: 'banned' });
  return out;
}

export function listsHtml(rules, activeTab) {
  const lists = listsOf(rules);
  if (!lists.length) return '';
  const cur = lists.find(l => l.id === activeTab) ?? lists[0];
  const body = cur.kind === 'res'
    ? `<table class="res-table"><thead><tr><th>Time</th><th>Name</th></tr></thead><tbody>${cur.items.map(r => `<tr><td class="mono">${esc(fmtHHMM(r.time))}</td><td>${esc(r.name)}</td></tr>`).join('')}</tbody></table>`
    : cur.kind === 'banned'
      ? `<div class="banned-grid">${cur.items.map(e => `<figure class="mug">${mugshotSvg(e.face)}<figcaption><b>${esc(e.name)}</b><span>${esc(e.reason)}</span></figcaption></figure>`).join('')}</div>`
      : cur.items.length ? `<ul class="name-list">${cur.items.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : '<p class="muted">Nobody yet.</p>';
  return `<div class="lists"><div class="tabs" role="tablist">${lists.map(l => `<button role="tab" type="button" class="tab ${l === cur ? 'on' : ''}" data-list="${l.id}" aria-selected="${l === cur}">${esc(l.title)} <small>${l.items.length}</small></button>`).join('')}</div><div class="list-body">${body}</div></div>`;
}

export function openRulebook(rules, def, opts = {}) {
  let tab = opts.tab ?? 'rules';
  const m = modal('<div class="rulebook"></div>', { className: 'wide', label: 'Rulebook' });
  const root = m.el.querySelector('.rulebook');
  const render = () => {
    const tabs = [['rules', 'Tonight\'s rules'], ['ids', 'ID reference'], ['lists', 'Lists'], ['help', 'How to play']];
    let body = '';
    if (tab === 'rules') body = rules.map(r => `<section class="rb-rule"><h3>${esc(RULES[r.id].title)} <small>cite: ${esc(RULES[r.id].cite)}</small></h3>${RULES[r.id].explain(r.params).map(l => `<p>${esc(l)}</p>`).join('')}</section>`).join('');
    if (tab === 'ids') body = `<p class="muted">Every genuine card matches its issuer exactly. Cards are never issued to anyone under ${MIN_ISSUE_AGE}, and are always issued before they expire.</p><div class="samples">${Object.values(ISSUERS).map(sampleCardHtml).join('')}</div><p class="muted">Holograms shimmer faintly; a UV torch shows them clearly. Forgers also use emblems no issuer uses — like a crown or a wave.</p>`;
    if (tab === 'lists') body = listsHtml(rules, opts.list) || '<p class="muted">No lists tonight.</p>';
    if (tab === 'help') body = `<ol class="help">
      <li>A guest steps up. Their papers appear on the desk; their face, height and outfit are on the left.</li>
      <li>Check every rule on the rule card against the evidence. Click <b>Rulebook</b> for the full wording and the ID reference.</li>
      <li><b>Admit</b> (A) or <b>Refuse</b> (X). When refusing, cite the rule that failed (number keys) for a small bonus.</li>
      <li>The slip on the right explains every decision. Mistakes cost money; too many and you're sent home.</li>
      <li>The line is impatient. People leave if they wait too long — but a wrong call costs more than a slow one.</li>
      <li>Dates are shown as MM/DD/YYYY. If the ID photo doesn't match the person, refuse — at every venue.</li>
      <li>Height: the door frame has marks every 10 cm. The card should be within ${HEIGHT_TOLERANCE} cm.</li>
      <li>Space or Esc pauses. B opens this rulebook. C toggles Compare (after forensics training).</li></ol>`;
    root.innerHTML = `<header class="rb-head"><h2>Rulebook — ${esc(def.title)}</h2><button class="btn ghost small" data-close aria-label="Close">Close ✕</button></header>
      <div class="tabs" role="tablist">${tabs.map(([id, t]) => `<button type="button" role="tab" class="tab ${tab === id ? 'on' : ''}" data-tab="${id}" aria-selected="${tab === id}">${t}</button>`).join('')}</div><div class="rb-body">${body}</div>`;
    root.querySelector('[data-close]').onclick = m.close;
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
    root.querySelectorAll('[data-list]').forEach(b => b.onclick = () => { opts.list = b.dataset.list; render(); });
  };
  render();
  return m;
}

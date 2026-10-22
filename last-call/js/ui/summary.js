// End of shift: rating against target, the decision log with explanations, incidents, and the
// itemised paycheck.

import { esc, money, signed } from './dom.js';
import { explain } from '../validation.js';
import { VENUES } from '../venues.js';
import { fmtTime } from '../dates.js';
import { CAREER } from '../config.js';

export function renderSummary(app, def, result, pay, onContinue) {
  const venue = VENUES[def.venue];
  const pct = n => `${Math.round(n * 100)}%`;
  const grade = result.rating >= 95 ? 'A+' : result.rating >= 85 ? 'A' : result.rating >= 75 ? 'B' : result.rating >= 65 ? 'C' : result.rating >= 50 ? 'D' : 'F';
  const p = app.player;
  app.audio.music(null);
  app.audio.sfx('cash');
  app.root.innerHTML = `
  <div class="screen summary" style="--glow:${venue.palette.glow};--accent:${venue.palette.accent};--venue-bg:${venue.palette.bg}">
    <header class="sum-head">
      <span class="kicker">${esc(venue.name)} · ${esc(def.title)}</span>
      <h1>${result.sentHome ? 'Sent home early' : result.passed ? 'Shift complete' : 'Below target'}</h1>
    </header>
    <div class="sum-grid">
      <section class="card rating-card ${result.passed ? 'pass' : 'fail'}">
        <div class="gauge" style="--v:${result.rating};--t:${result.target}" role="img" aria-label="Rating ${result.rating} of 100, target ${result.target}"><b>${result.rating}</b><span>${grade}</span><i class="target-mark"></i></div>
        <p class="verdict">${result.passed ? `Target ${result.target} met.` : `Target was ${result.target}.`}</p>
        <dl class="stats">
          <dt>Accuracy</dt><dd>${pct(result.accuracy)} <small>(${result.correct}/${result.decided})</small></dd>
          <dt>Guests handled</dt><dd>${result.decided} of ${result.total}</dd>
          <dt>Walkouts</dt><dd>${result.walkouts}</dd>
          <dt>Best streak</dt><dd>${result.bestStreak}</dd>
          <dt>Fakes caught</dt><dd>${result.fakesCaught}</dd>
          <dt>Underage stopped</dt><dd>${result.underageStopped}</dd>
        </dl>
        ${!result.passed ? `<p class="warn">Warning ${p.warnings} of ${CAREER.maxWarnings}. ${p.warnings >= CAREER.maxWarnings ? 'That\'s the last one.' : 'Miss the target again and it adds up.'}</p>` : ''}
        ${result.bribeCount ? `<p class="warn">You pocketed $${result.bribes} in cash tonight. Someone may have noticed.</p>` : ''}
      </section>
      <section class="card paycheck">
        <h2>Paycheck</h2>
        <table class="pay"><tbody>${pay.lines.map(l => `<tr class="pl-${l.kind}"><td>${esc(l.label)}${l.note ? `<small>${esc(l.note)}</small>` : ''}</td><td class="num">${signed(l.amount)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Net</td><td class="num ${pay.net < 0 ? 'neg' : 'pos'}">${signed(pay.net)}</td></tr><tr><td>Balance</td><td class="num">${money(pay.before)} → <b>${money(pay.after)}</b></td></tr></tfoot></table>
        ${pay.after < 0 ? `<p class="warn">You're in debt. Below ${money(CAREER.evictionDebt)} the landlord changes the locks.</p>` : ''}
      </section>
      <section class="card log">
        <h2>Decisions</h2>
        <ol class="decisions">${result.records.map(r => { const ex = explain(r.judgement, r.name); return `<li class="${r.correct ? 'ok' : 'miss'}"><details><summary><span class="dmark">${r.correct ? '✓' : '✗'}</span> <span class="mono">${fmtTime(r.clock)}</span> ${esc(r.name)} — ${r.verdict === 'admit' ? 'admitted' : 'refused'}${r.fine ? ` <small class="neg">−$${r.fine}</small>` : r.tip ? ` <small class="pos">+$${r.tip}</small>` : ''}</summary><p>${esc(ex.headline)}</p><ul>${ex.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details></li>`; }).join('') || '<li class="muted">No decisions made.</li>'}</ol>
        ${result.incidentLog.length ? `<h3>Incidents</h3><ul class="incidents">${result.incidentLog.map(i => `<li><b>${esc(i.title)}</b>: ${esc(i.choice)} — <span class="muted">${esc(i.result)}</span></li>`).join('')}</ul>` : ''}
      </section>
    </div>
    <footer class="brief-foot"><button class="btn big" id="next" autofocus>Continue</button></footer>
  </div>`;
  const n = document.getElementById('next'); n.focus(); n.onclick = onContinue;
}

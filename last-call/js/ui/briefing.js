// Shift briefing: venue, date, hours, target, the new rule with an explanation, tonight's rules
// and lists, and a word from whoever's in charge.

import { esc } from './dom.js';
import { RULES, rulesAt } from '../rules.js';
import { VENUES } from '../venues.js';
import { CHARACTERS } from '../story.js';
import { portraitSvg } from '../portrait.js';
import { fmtLong, toClock } from '../dates.js';
import { clockRange } from '../timeline.js';
import { rulesCardHtml, openRulebook } from './rulebook.js';
import { totalShifts } from '../campaign.js';
import { shiftModifiers } from '../upgrades.js';

export function renderBriefing(app, def, onStart) {
  const venue = VENUES[def.venue];
  const boss = CHARACTERS[def.briefing.from];
  const rules = rulesAt(def, 0);
  const [a, b] = clockRange(def);
  const mods = shiftModifiers(app.player);
  app.audio.music(null);
  app.root.innerHTML = `
  <div class="screen briefing" style="--glow:${venue.palette.glow};--accent:${venue.palette.accent};--venue-bg:${venue.palette.bg}">
    <header class="brief-head">
      <span class="kicker">Shift ${app.player.index + 1} of ${totalShifts()} · ${esc(fmtLong(def.date))}</span>
      <h1><span class="neon-sign">${esc(venue.palette.sign)}</span></h1>
      <h2>${esc(def.title)}</h2>
      <p class="muted">${esc(venue.name)} — ${esc(venue.tagline)}</p>
    </header>
    <div class="brief-grid">
      <section class="card">
        <div class="boss">${portraitSvg(boss.face, { top: boss.top, mood: 'neutral', bg: 'transparent' })}<div><b>${esc(boss.name)}</b><span class="muted">${esc(boss.role)}</span></div></div>
        <blockquote>“${esc(def.briefing.text)}”</blockquote>
        <p class="muted small">${esc(venue.blurb)}</p>
      </section>
      <section class="card">
        <dl class="brief-facts">
          <dt>Hours</dt><dd>${toClock(a)}–${toClock(b)} <small class="muted">(${Math.round(def.duration / 60 * 10) / 10} real minutes)</small></dd>
          <dt>Target rating</dt><dd>${def.target}</dd>
          <dt>Mistakes allowed</dt><dd>${def.strikes + mods.extraStrikes}${mods.extraStrikes ? ' <small class="muted">(well rested +1)</small>' : ''}</dd>
          <dt>Base wage</dt><dd>$${venue.wage}</dd>
          ${def.changes?.length ? '<dt>Heads-up</dt><dd>Rules may change during the shift.</dd>' : ''}
          ${def.transitStrike && app.player.transport === 'bus' ? '<dt class="warn">Bus strike</dt><dd class="warn">You\'ll arrive late: $10 docked.</dd>' : ''}
        </dl>
        ${def.newRules?.length ? `<div class="new-rule">${def.newRules.map(id => `<h3><span class="tag">new rule</span> ${esc(RULES[id].title)}</h3>${RULES[id].explain(rules.find(r => r.id === id)?.params ?? {}).map(l => `<p>${esc(l)}</p>`).join('')}`).join('')}</div>` : ''}
      </section>
      <section class="card">
        <h3>Tonight's rules</h3>
        ${rulesCardHtml(rules, def, {})}
        <button class="btn ghost small" id="openRules">Open the rulebook</button>
      </section>
    </div>
    <footer class="brief-foot"><button class="btn ghost" id="menuBtn">Menu</button><button class="btn big" id="startBtn" autofocus>Open the door</button></footer>
  </div>`;
  document.getElementById('openRules').onclick = () => openRulebook(rules, def);
  document.getElementById('menuBtn').onclick = () => app.go('menu');
  document.getElementById('startBtn').onclick = () => { app.audio.unlock(); onStart(); };
  document.getElementById('startBtn').focus();
}

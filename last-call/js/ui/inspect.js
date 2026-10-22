// The door: the live inspection screen. Renders the shift engine's state, forwards decisions and
// incident choices to it, and runs the frame loop. The layout puts the person, their papers and
// tonight's rules side by side so every check is one glance away.

import { $, $$, esc, money, modal, toast } from './dom.js';
import { createShift, tick, decide, resolveIncident, summarize, rulesNow, clockNow, choiceAvailable } from '../shiftEngine.js';
import { RULES, sameName } from '../rules.js';
import { explain } from '../validation.js';
import { fmtTime, fmtDoc, daysBetween } from '../dates.js';
import { describeOutfit, OUTFIT } from '../appearance.js';
import { customerPortrait, portraitSvg, moodFor } from '../portrait.js';
import { idCardHtml, ticketHtml, memberHtml, wristbandHtml } from './docs.js';
import { rulesCardHtml, listsHtml, openRulebook } from './rulebook.js';
import { VENUES } from '../venues.js';
import { CHARACTERS } from '../story.js';
import { shiftModifiers, owns, SHOP_BY_ID } from '../upgrades.js';
import { TIMER_SPEEDS } from '../save.js';
import { HEIGHT_TOLERANCE } from '../config.js';

export function runShift(app, prepared, onFinish) {
  const { player, settings, audio } = app;
  const venue = VENUES[prepared.def.venue];
  const s = createShift(prepared, shiftModifiers(player));
  const def = s.def;
  const ui = { paused: false, refusing: false, compare: false, picks: [], listTab: null, changed: [], deskUid: null, slip: null, raf: 0, last: 0, hintShown: false, ended: false, overlay: null };
  const speed = (TIMER_SPEEDS[settings.timer] ?? 1) * (app.debugSpeed ?? 1);

  app.root.innerHTML = `
  <div class="screen door" style="--glow:${venue.palette.glow};--accent:${venue.palette.accent};--venue-bg:${venue.palette.bg}">
    <header class="hud">
      <div class="hud-venue"><span class="neon-mini">${esc(venue.palette.sign)}</span><span class="hud-title">${esc(def.title)}</span></div>
      <div class="hud-clock"><button type="button" class="fv clock" data-compare='${esc(JSON.stringify({ kind: 'date', label: 'Tonight', value: def.date }))}' title="Tonight's date">${fmtDoc(def.date)}</button><b id="clock">--:--</b></div>
      <div class="hud-timer" aria-label="Time left in shift"><div class="bar"><i id="timebar"></i></div><span id="timeleft"></span></div>
      <div class="hud-stat" id="insideStat" hidden><span>Inside</span><b id="inside">0</b></div>
      <div class="hud-stat"><span>Mistakes</span><b id="strikes"></b></div>
      <div class="hud-stat"><span>Tonight</span><b id="earned">$0</b></div>
      <div class="hud-actions">
        ${owns(player, 'forensics') ? '<button type="button" class="btn small ghost" id="compareBtn" aria-pressed="false" title="Compare two fields (C)">Compare <kbd>C</kbd></button>' : ''}
        <button type="button" class="btn small ghost" id="rulebookBtn" title="Rulebook (B)">Rulebook <kbd>B</kbd></button>
        <button type="button" class="btn small ghost" id="pauseBtn" title="Pause (Esc)">Pause</button>
      </div>
    </header>
    <div class="banner" id="banner" hidden role="alert"></div>
    <section class="queue" aria-label="Queue outside"><div class="door-frame-mini" aria-hidden="true"></div><ol id="queue"></ol><span class="queue-count" id="queueCount"></span></section>
    <main class="desk">
      <section class="guest" aria-label="Guest at the door">
        <div class="guest-stage">
          <div class="ruler" aria-hidden="true">${[200, 190, 180, 170, 160, 150, 140, 130].map(h => `<span data-h="${h}" style="bottom:${(h - STAGE_MIN) / STAGE_RANGE * 100}%"></span>`).join('')}</div>
          <div class="guest-figure" id="figure"></div>
          <div class="bubble" id="bubble" aria-live="polite"></div>
        </div>
        <div class="guest-info" id="guestInfo"></div>
      </section>
      <section class="papers" aria-label="Documents"><div id="papers" class="papers-inner"></div></section>
      <aside class="side">
        <div class="slip-slot" id="slip" aria-live="polite"><p class="muted">Decisions are explained here.</p></div>
        <div class="rules-card"><h2>Tonight's rules <span class="muted small">${esc(fmtDoc(def.date))}</span></h2><div id="rules"></div><div id="lists"></div></div>
      </aside>
    </main>
    <footer class="actions">
      <button type="button" class="btn stamp admit" id="admitBtn"><span>ADMIT</span><kbd>A</kbd></button>
      <div class="refuse-wrap"><button type="button" class="btn stamp refuse" id="refuseBtn" aria-haspopup="menu"><span>REFUSE</span><kbd>X</kbd></button><div class="reasons" id="reasons" role="menu" hidden></div></div>
    </footer>
  </div>`;

  const els = { clock: $('#clock'), timebar: $('#timebar'), timeleft: $('#timeleft'), inside: $('#inside'), insideStat: $('#insideStat'), strikes: $('#strikes'), earned: $('#earned'), queue: $('#queue'), queueCount: $('#queueCount'), figure: $('#figure'), bubble: $('#bubble'), guestInfo: $('#guestInfo'), papers: $('#papers'), slip: $('#slip'), rules: $('#rules'), lists: $('#lists'), reasons: $('#reasons'), banner: $('#banner') };
  const hasCapacity = () => rulesNow(s).some(r => r.id === 'capacity') || def.inside != null;

  // ── Rendering ──────────────────────────────────────────────────────────────
  function renderRules() {
    const rules = rulesNow(s);
    els.rules.innerHTML = rulesCardHtml(rules, def, { changed: ui.changed, ageWheel: owns(player, 'age-wheel') });
    els.lists.innerHTML = listsHtml(rules, ui.listTab);
    $$('[data-list]', els.lists).forEach(b => b.onclick = () => { ui.listTab = b.dataset.list; renderRules(); });
  }

  function renderGuest() {
    const c = s.current;
    if (!c) {
      els.figure.innerHTML = '<div class="empty-door">The doorway is empty.</div>';
      els.bubble.textContent = s.queue.length ? '' : 'Quiet for a moment…';
      els.guestInfo.innerHTML = '';
      els.papers.innerHTML = '<p class="muted papers-empty">No papers on the desk.</p>';
      return;
    }
    // The portrait's head top sits at ~17% of its height and its bottom edge ~60 cm below the
    // head top, so it is placed for the ruler marks to read the person's real height.
    els.figure.innerHTML = `<div class="fig" style="bottom:${(c.heightCm - 60 - STAGE_MIN) / STAGE_RANGE * 100}%;height:${(60 / 0.83) / STAGE_RANGE * 100}%">${customerPortrait(c, moodFor(c, 'greet'), 'transparent')}</div>`;
    els.bubble.textContent = `“${c.lines.greet}”`;
    const outfit = describeOutfit(c.outfit);
    const compareBtn = (label, obj) => `<button type="button" class="fv inline" data-compare='${esc(JSON.stringify(obj))}'>${esc(label)}</button>`;
    els.guestInfo.innerHTML = `
      <p class="desc">${esc(c.desc)}${c.intoxicated ? ` <b class="cue">${esc(capital(c.intoxCues))}.</b>` : ''}</p>
      <dl class="facts">
        <dt>Wearing</dt><dd>${outfit.map(o => `<span class="chip">${esc(o)}</span>`).join('')}</dd>
        <dt>Here for</dt><dd>${esc(c.reason)}</dd>
        ${owns(player, 'forensics') ? `<dt>Compare</dt><dd>${compareBtn('Their height', { kind: 'height', label: 'Their height', value: c.heightCm, person: true })} ${compareBtn('Their eyes', { kind: 'eyes', label: 'Their eyes', value: c.face.eyes, person: true })}</dd>` : ''}
      </dl>`;
    const docs = [idCardHtml(c.docs.id, { uv: owns(player, 'uv-torch') })];
    if (c.docs.ticket) docs.push(ticketHtml(c.docs.ticket));
    if (c.wristband) docs.push(wristbandHtml(c.wristband));
    if (c.docs.member) docs.push(memberHtml(c.docs.member));
    const rules = rulesNow(s);
    if (rules.some(r => r.id === 'pass') && !c.docs.ticket && !c.wristband) docs.push('<p class="doc-note">No ticket or wristband shown.</p>');
    if (rules.some(r => r.id === 'membership') && !c.docs.member) docs.push('<p class="doc-note">No member card — says they\'re a guest.</p>');
    if (c.bribe) docs.push(`<p class="doc-note bribe">Folded banknotes held out: $${c.bribe.amount}.</p>`);
    els.papers.innerHTML = docs.join('');
    if (owns(player, 'loupe')) $$('.id-card', els.papers).forEach(card => { card.classList.add('zoomable'); card.title = 'Click the photo to magnify'; card.querySelector('.id-photo').onclick = () => card.classList.toggle('zoomed'); });
    if (settings.hints && !ui.hintShown && (def.tutorial || def.newRules?.length)) { ui.hintShown = true; showHint(); }
  }

  function renderQueue() {
    els.queue.innerHTML = s.queue.slice(0, 14).map(q => {
      const frac = Math.max(0, q.waitLeft / q.patienceMax);
      const tone = frac < 0.25 ? 'low' : frac < 0.5 ? 'mid' : 'ok';
      return `<li class="q ${tone}" data-uid="${q.uid}" style="--p:${frac}" title="${frac < 0.25 ? 'About to leave' : 'Waiting'}">${portraitSvg(q.face, { top: q.outfit.find(i => OUTFIT[i]?.slot === 'top'), hatItem: q.outfit.find(i => OUTFIT[i]?.slot === 'head'), bg: 'transparent', mood: frac < 0.3 ? 'angry' : 'neutral', drunk: q.intoxicated })}</li>`;
    }).join('');
    els.queueCount.textContent = s.queue.length > 14 ? `+${s.queue.length - 14}` : s.queue.length ? '' : 'No one waiting';
  }

  function updateQueuePatience() {
    for (const li of els.queue.children) {
      const q = s.queue.find(x => x.uid === li.dataset.uid);
      if (!q) continue;
      const frac = Math.max(0, q.waitLeft / q.patienceMax);
      li.style.setProperty('--p', frac);
      li.classList.toggle('low', frac < 0.25); li.classList.toggle('mid', frac >= 0.25 && frac < 0.5); li.classList.toggle('ok', frac >= 0.5);
    }
  }

  function updateHud() {
    els.clock.textContent = fmtTime(clockNow(s));
    const left = Math.max(0, def.duration - s.t);
    els.timebar.style.width = `${(left / def.duration) * 100}%`;
    els.timebar.classList.toggle('late', left < def.duration * 0.15);
    els.timeleft.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    const cap = rulesNow(s).find(r => r.id === 'capacity');
    els.insideStat.hidden = !hasCapacity();
    els.inside.textContent = cap ? `${s.inside}/${cap.params.max}` : `${s.inside}`;
    els.inside.classList.toggle('full', !!cap && s.inside >= cap.params.max);
    els.strikes.innerHTML = Array.from({ length: s.maxStrikes + 1 }, (_, i) => `<i class="pip ${i < s.strikes ? 'hit' : ''} ${i === s.maxStrikes ? 'last' : ''}"></i>`).join('') + `<span class="sr">${s.strikes} of ${s.maxStrikes + 1}</span>`;
    const r = s.records.reduce((a, x) => a + x.tip + x.citation - x.fine + x.bribe, 0);
    els.earned.textContent = money(r);
  }

  function showSlip(rec) {
    const ex = explain(rec.judgement, rec.name);
    const c = rec.customer;
    const extra = [];
    if (rec.tip) extra.push(`+$${rec.tip} tip (${rec.speed})`);
    if (rec.citation) extra.push(`+$${rec.citation} citation`);
    if (rec.fine) extra.push(`−$${rec.fine} fine`);
    if (rec.bribe) extra.push(`+$${rec.bribe} cash in hand`);
    if (rec.realName !== rec.name) extra.push(`Real name: ${rec.realName}`);
    els.slip.innerHTML = `<article class="slip ${ex.tone}">
      <div class="slip-head"><div class="slip-face">${customerPortrait(c, moodFor(c, rec.verdict === 'admit' ? 'admit' : 'reject'), 'transparent')}</div>
      <div><span class="slip-verdict">${rec.verdict === 'admit' ? 'ADMITTED' : 'REFUSED'}</span><p class="slip-headline">${esc(ex.headline)}</p><p class="slip-quote">“${esc(rec.verdict === 'admit' ? c.lines.admit : c.lines.reject)}”</p></div></div>
      <ul>${ex.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      ${extra.length ? `<p class="slip-money">${extra.map(esc).join(' · ')}</p>` : ''}</article>`;
  }

  function showBanner(text, tone = 'warn', ms = 6000) {
    els.banner.hidden = false;
    els.banner.className = `banner ${tone}`;
    els.banner.innerHTML = `<b>${tone === 'warn' ? 'RULE CHANGE' : tone === 'info' ? 'HEADS-UP' : ''}</b> ${esc(text)}`;
    clearTimeout(ui.bannerT);
    ui.bannerT = setTimeout(() => { els.banner.hidden = true; }, ms);
  }

  function showHint() {
    const ids = def.tutorial ? ['age', 'photo'] : def.newRules;
    const lines = ids.flatMap(id => RULES[id].explain(rulesNow(s).find(r => r.id === id)?.params ?? {}));
    const box = document.createElement('div');
    box.className = 'coach';
    box.innerHTML = `<b>${def.tutorial ? 'How to check a guest' : `New rule: ${ids.map(id => RULES[id].title).join(', ')}`}</b>${def.tutorial ? '<p>Find the date of birth on the ID card (MM/DD/YYYY) and work out whether they are 21 or older tonight. Check the photo is them. Then press <b>Admit</b> or <b>Refuse</b>.</p>' : ''}${lines.map(l => `<p>${esc(l)}</p>`).join('')}<button type="button" class="btn small">Got it</button>`;
    els.papers.prepend(box);
    box.querySelector('button').onclick = () => box.remove();
  }

  // ── Decisions ──────────────────────────────────────────────────────────────
  function stamp(verdict, reason = null) {
    if (ui.paused || s.incident || !s.current || ui.ended) return;
    closeReasons();
    audio.sfx('stamp');
    const rec = decide(s, verdict, reason);
    if (!rec) return;
    audio.sfx(verdict === 'admit' ? 'admit' : 'refuse');
    setTimeout(() => audio.sfx(rec.correct ? 'right' : 'wrong'), 160);
    if (verdict === 'admit') audio.door();
    showSlip(rec);
    flash(rec.correct ? 'good' : 'bad');
  }

  function flash(tone) {
    const d = $('.desk');
    d.classList.remove('flash-good', 'flash-bad');
    void d.offsetWidth;
    d.classList.add(`flash-${tone}`);
  }

  function openReasons() {
    if (!s.current || ui.paused || s.incident) return;
    const rules = rulesNow(s);
    els.reasons.innerHTML = rules.map((r, i) => `<button type="button" role="menuitem" data-reason="${r.id}"><kbd>${i + 1}</kbd> ${esc(RULES[r.id].cite)}</button>`).join('') + '<button type="button" role="menuitem" data-reason=""><kbd>0</kbd> No reason given</button>';
    els.reasons.hidden = false;
    ui.refusing = true;
    $$('[data-reason]', els.reasons).forEach(b => b.onclick = () => stamp('refuse', b.dataset.reason || null));
    els.reasons.querySelector('button')?.focus();
  }
  function closeReasons() { els.reasons.hidden = true; ui.refusing = false; }

  // ── Compare tool ───────────────────────────────────────────────────────────
  function comparePick(btn) {
    const v = JSON.parse(btn.dataset.compare);
    btn.classList.add('picked');
    ui.picks.push({ v, btn });
    if (ui.picks.length < 2) { toast(`Compare: ${v.label} — now pick another field`, 'info', 1800); return; }
    const [a, b] = ui.picks.map(p => p.v);
    const msg = compareResult(a, b);
    toast(msg.text, msg.tone, 4200);
    ui.picks.forEach(p => setTimeout(() => p.btn.classList.remove('picked'), 600));
    ui.picks = [];
  }

  // ── Pause, incidents, end ──────────────────────────────────────────────────
  function pause(open = true) {
    if (ui.ended) return;
    if (!open) { ui.paused = false; ui.overlay?.close(); ui.overlay = null; return; }
    if (ui.paused) return;
    ui.paused = true;
    ui.overlay = modal(`<h2>Paused</h2><p class="muted">${esc(def.title)} · ${fmtTime(clockNow(s))}</p>
      <div class="stack"><button class="btn" data-a="resume" autofocus>Resume</button><button class="btn ghost" data-a="rules">Rulebook</button><button class="btn ghost" data-a="quit">Abandon shift</button></div>`,
    { onClose: () => { ui.paused = false; ui.overlay = null; }, label: 'Paused' });
    ui.overlay.el.querySelector('[data-a=resume]').onclick = () => pause(false);
    ui.overlay.el.querySelector('[data-a=rules]').onclick = () => { openRulebook(rulesNow(s), def); };
    ui.overlay.el.querySelector('[data-a=quit]').onclick = () => { stop(); ui.overlay.close(); app.go('menu'); };
  }

  function showIncident() {
    const inc = s.incident;
    audio.sfx('alert');
    const who = inc.who && CHARACTERS[inc.who] ? `<div class="inc-face">${portraitSvg(CHARACTERS[inc.who].face, { top: CHARACTERS[inc.who].top, mood: 'stern', bg: 'transparent' })}</div>` : '';
    const m = modal(`<div class="incident">${who}<div><span class="kicker">Incident</span><h2>${esc(inc.title)}</h2><p>${esc(inc.text)}</p>
      <div class="stack">${inc.choices.map((c, i) => {
        const ok = choiceAvailable(c, player);
        const need = !ok && typeof c.requires === 'string' ? ` <small>(needs ${esc(SHOP_BY_ID[c.requires]?.name ?? c.requires)})</small>` : '';
        return `<button class="btn ${ok ? '' : 'disabled'}" data-i="${i}" ${ok ? '' : 'disabled aria-disabled="true"'}>${esc(c.label)}${need}</button>`;
      }).join('')}</div></div></div>`, { dismissable: false, label: inc.title });
    $$('[data-i]', m.el).forEach(b => b.onclick = () => {
      const res = resolveIncident(s, +b.dataset.i, player);
      if (res == null) return;
      m.el.querySelector('.stack').innerHTML = `<p class="inc-result">${esc(res)}</p><button class="btn" data-go autofocus>Back to the door</button>`;
      const go = m.el.querySelector('[data-go]'); go.focus();
      go.onclick = () => { m.close(); ui.last = performance.now(); };
    });
  }

  function finish() {
    if (ui.ended) return;
    ui.ended = true;
    stop();
    const result = summarize(s);
    const why = { time: 'Closing time.', clear: 'Line cleared — nobody left outside.', 'sent-home': 'Too many mistakes. The manager sends you home.' }[s.endReason];
    const m = modal(`<span class="kicker">Shift over</span><h2>${esc(why)}</h2><p>${result.correct} of ${result.decided} calls correct · ${result.walkouts} walked out</p><button class="btn" data-go autofocus>See the paycheck</button>`, { dismissable: false, label: 'Shift over' });
    m.el.querySelector('[data-go]').onclick = () => { m.close(); onFinish(result, s); };
  }

  // ── Events from the engine ─────────────────────────────────────────────────
  function processEvents() {
    let queueDirty = false;
    for (const e of s.events) {
      switch (e.type) {
        case 'arrive': queueDirty = true; break;
        case 'desk': queueDirty = true; renderGuest(); break;
        case 'walkout': queueDirty = true; audio.sfx('walkout'); toast(`${e.name} gave up waiting and left.`, 'bad', 2600); break;
        case 'rule-change': ui.changed = [...new Set([...ui.changed, ...e.rules])]; renderRules(); showBanner(e.message, 'warn', 9000); audio.sfx('alert'); if (s.current) renderGuest(); break;
        case 'heads-up': showBanner(`In ${e.inSeconds}s: ${e.message}`, 'info', 7000); break;
        case 'incident': showIncident(); break;
        case 'streak': toast(`${e.streak} correct in a row — streak bonus!`, 'good', 2200); audio.sfx('cash'); break;
        case 'decision': queueDirty = true; if (!s.current) renderGuest(); break;
        case 'end': finish(); break;
        default: break;
      }
    }
    s.events.length = 0;
    if (queueDirty) renderQueue();
  }

  // ── Loop and input ─────────────────────────────────────────────────────────
  function frame(now) {
    const dt = Math.min(0.1, (now - ui.last) / 1000);
    ui.last = now;
    if (!ui.paused && !s.incident && !document.hidden) tick(s, dt * speed);
    processEvents();
    if (!ui.ended) { updateHud(); updateQueuePatience(); ui.raf = requestAnimationFrame(frame); }
  }
  function stop() { cancelAnimationFrame(ui.raf); document.removeEventListener('keydown', onKey); document.removeEventListener('visibilitychange', onVis); }
  function onVis() { if (document.hidden) pause(true); }

  function onKey(e) {
    if (e.target.closest?.('input, textarea, select') || document.querySelector('.modal-backdrop')) return;
    const k = e.key.toLowerCase();
    if (ui.refusing) {
      if (/^[0-9]$/.test(k)) { e.preventDefault(); const rules = rulesNow(s); if (k === '0') stamp('refuse', null); else if (rules[+k - 1]) stamp('refuse', rules[+k - 1].id); return; }
      if (k === 'escape') { e.preventDefault(); closeReasons(); return; }
    }
    if (k === 'a') { e.preventDefault(); stamp('admit'); }
    else if (k === 'x' || k === 'r') { e.preventDefault(); ui.refusing ? closeReasons() : openReasons(); }
    else if (k === 'b') { e.preventDefault(); openRulebook(rulesNow(s), def); }
    else if (k === 'c' && owns(player, 'forensics')) { e.preventDefault(); toggleCompare(); }
    else if (k === 'escape' || k === ' ') { e.preventDefault(); pause(true); }
  }

  function toggleCompare() {
    ui.compare = !ui.compare; ui.picks.forEach(p => p.btn.classList.remove('picked')); ui.picks = [];
    $('.door').classList.toggle('comparing', ui.compare);
    $('#compareBtn')?.setAttribute('aria-pressed', String(ui.compare));
    toast(ui.compare ? 'Compare on: click two fields.' : 'Compare off.', 'info', 1600);
  }

  $('#admitBtn').onclick = () => stamp('admit');
  $('#refuseBtn').onclick = () => (ui.refusing ? closeReasons() : openReasons());
  $('#rulebookBtn').onclick = () => openRulebook(rulesNow(s), def);
  $('#pauseBtn').onclick = () => pause(true);
  $('#compareBtn')?.addEventListener('click', toggleCompare);
  app.root.addEventListener('click', e => {
    const f = e.target.closest('[data-compare]');
    if (f && ui.compare) { e.preventDefault(); comparePick(f); }
    if (ui.refusing && !e.target.closest('.refuse-wrap')) closeReasons();
  });
  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);

  audio.music(venue.music);
  renderRules(); renderGuest(); renderQueue(); updateHud();
  ui.last = performance.now();
  ui.raf = requestAnimationFrame(frame);
  return { state: s, stop };
}

const STAGE_MIN = 120;
const STAGE_RANGE = 90;
const capital = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

// The Compare tool's verdict on two fields. Pure.
export function compareResult(a, b) {
  const kinds = new Set([a.kind, b.kind]);
  if (a.kind === 'date' && b.kind === 'date') {
    const d = daysBetween(a.value, b.value);
    if (d === 0) return { tone: 'good', text: `${a.label} and ${b.label}: same date.` };
    return { tone: 'info', text: `${a.label} is ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'before' : 'after'} ${b.label}.` };
  }
  if (a.kind === b.kind && a.kind === 'name') return sameName(a.value, b.value) ? { tone: 'good', text: `Names match: ${a.value}.` } : { tone: 'bad', text: `Names differ: "${a.value}" vs "${b.value}".` };
  if (a.kind === b.kind && a.kind === 'height') { const d = Math.abs(a.value - b.value); return d <= HEIGHT_TOLERANCE ? { tone: 'good', text: `Heights agree (within ${HEIGHT_TOLERANCE} cm).` } : { tone: 'bad', text: `Heights differ by about ${Math.round(d / 5) * 5} cm.` }; }
  if (a.kind === b.kind && a.kind === 'eyes') return a.value === b.value ? { tone: 'good', text: `Eye colours match (${a.value}).` } : { tone: 'bad', text: `Eye colours differ: ${a.value} vs ${b.value}.` };
  if (kinds.has('number') && kinds.size === 1) return { tone: 'info', text: 'Two ID numbers — they should match the issuer\'s format on the reference sheet.' };
  if (a.kind === b.kind) return a.value === b.value ? { tone: 'good', text: `${a.label} and ${b.label} match.` } : { tone: 'bad', text: `${a.label} and ${b.label} differ.` };
  return { tone: 'info', text: `${a.label} and ${b.label} record different things.` };
}

// Between-shift scenes: a speaker portrait, a typed line, click or Space to continue, and choices.
// "Skip" jumps to the next choice (or the end); choices can't be skipped.

import { esc } from './dom.js';
import { CHARACTERS, resolveNode, availableChoices, applyEffects, fillName } from '../story.js';
import { portraitSvg } from '../portrait.js';

const PLACES = {
  home: ['#1b1626', '#3a2a3a'], lantern: ['#1a1210', '#4a2a18'], sump: ['#0d140f', '#1f3a22'],
  halcyon: ['#0e1418', '#3a3020'], voltage: ['#0a0b1a', '#2a1a4a'], orchid: ['#140c18', '#3a1e40'], street: ['#0b0716', '#2a1430'],
};

export function playScene(app, scene, onDone, { lines: endingLines } = {}) {
  const p = app.player;
  const [c1, c2] = PLACES[scene.place] ?? PLACES.street;
  app.root.innerHTML = `
  <div class="screen dialogue" style="--c1:${c1};--c2:${c2}">
    <header class="dlg-head"><span class="kicker">${esc(scene.kicker ?? 'Between shifts')}</span><h1>${esc(scene.title)}</h1></header>
    <div class="dlg-stage"><div class="dlg-portrait" id="portrait"></div></div>
    <section class="dlg-box" aria-live="polite">
      <div class="dlg-name" id="who"></div>
      <p class="dlg-text" id="text"></p>
      <div class="dlg-choices" id="choices"></div>
      <div class="dlg-controls"><button class="btn ghost small" id="skip">Skip ▸▸</button><button class="btn small" id="nextBtn">Next ▸</button></div>
    </section>
  </div>`;
  const els = { portrait: document.getElementById('portrait'), who: document.getElementById('who'), text: document.getElementById('text'), choices: document.getElementById('choices'), next: document.getElementById('nextBtn'), skip: document.getElementById('skip') };
  let node = null, lineIdx = 0, typing = null, full = '';
  const reduce = app.settings.reduceMotion;

  function showLine([who, mood, text]) {
    const ch = who ? CHARACTERS[who] : null;
    els.portrait.innerHTML = ch ? portraitSvg(ch.face, { top: ch.top, mood: mood ?? 'neutral', bg: 'transparent', title: ch.name }) : '';
    els.portrait.classList.toggle('empty', !ch);
    els.who.innerHTML = ch ? `<b style="color:${ch.color}">${esc(ch.name)}</b> <span>${esc(ch.role)}</span>` : '';
    full = fillName(text, p);
    clearInterval(typing);
    if (reduce) { els.text.textContent = full; typing = null; return; }
    let i = 0; els.text.textContent = '';
    typing = setInterval(() => {
      i += 2; els.text.textContent = full.slice(0, i);
      if (i % 6 === 0) app.audio.sfx('type');
      if (i >= full.length) { clearInterval(typing); typing = null; }
    }, 18);
  }

  function enter(id) {
    const r = resolveNode(scene, id, p);
    if (!r) return finish();
    node = r.node;
    applyEffects(p, node);
    lineIdx = 0;
    els.choices.innerHTML = '';
    if (node.lines?.length) { showLine(node.lines[0]); setControls(true); } else afterLines();
  }

  function afterLines() {
    const choices = availableChoices(node, p);
    if (choices.length) {
      setControls(false);
      els.choices.innerHTML = choices.map((c, i) => `<button class="btn choice" data-i="${i}">${esc(fillName(c.text, p))}</button>`).join('');
      els.choices.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const c = choices[+b.dataset.i];
        app.audio.sfx('click');
        applyEffects(p, c);
        els.choices.innerHTML = '';
        c.next ? enter(c.next) : finish();
      });
      els.choices.querySelector('button')?.focus();
    } else if (node.next) enter(node.next);
    else finish();
  }

  function advance() {
    if (!node || els.choices.children.length) return;
    if (typing) { clearInterval(typing); typing = null; els.text.textContent = full; return; }
    lineIdx++;
    if (lineIdx < (node.lines?.length ?? 0)) showLine(node.lines[lineIdx]);
    else afterLines();
  }

  function skip() {
    if (!node) return;
    clearInterval(typing); typing = null;
    if (node.lines?.length) { lineIdx = node.lines.length - 1; showLine(node.lines[lineIdx]); clearInterval(typing); typing = null; els.text.textContent = full; }
    afterLines();
  }

  function setControls(on) { els.next.hidden = !on; els.skip.hidden = !on; }
  function finish() { document.removeEventListener('keydown', onKey); onDone(); }
  function onKey(e) {
    if (document.querySelector('.modal-backdrop')) return;
    if (e.key === ' ' || e.key === 'Enter') { if (els.choices.children.length && e.key === 'Enter') return; e.preventDefault(); advance(); }
    if (e.key.toLowerCase() === 's') skip();
    if (/^[1-9]$/.test(e.key)) els.choices.querySelectorAll('[data-i]')[+e.key - 1]?.click();
  }
  els.next.onclick = advance;
  els.skip.onclick = skip;
  app.root.querySelector('.dlg-stage').onclick = advance;
  document.addEventListener('keydown', onKey);
  if (endingLines) { scene.nodes = { start: { lines: endingLines } }; }
  enter('start');
}

// Entry point: owns the campaign state, settings and audio, and moves between screens.

import { loadPlayer, savePlayer, saveCheckpoint, loadCheckpoint, clearSave, loadSettings, saveSettings, memoryStorage } from './save.js';
import { newPlayer, nextStep, markSceneSeen, finishCareer, currentShift } from './campaign.js';
import { prepareShift } from './generator.js';
import { computePaycheck, applyShiftResult } from './finances.js';
import { SCENES, ENDINGS, chooseEnding } from './story.js';
import { createAudio } from './audio.js';
import { esc, money } from './ui/dom.js';
import { renderMenu, streetSvg } from './ui/menu.js';
import { renderBriefing } from './ui/briefing.js';
import { runShift } from './ui/inspect.js';
import { renderSummary } from './ui/summary.js';
import { renderCareer } from './ui/career.js';
import { playScene } from './ui/dialogue.js';
import { openSettings } from './ui/settings.js';

let storage;
try { storage = window.localStorage; storage.setItem('lastcall.probe', '1'); storage.removeItem('lastcall.probe'); } catch { storage = memoryStorage(); }

const app = {
  root: document.getElementById('app'),
  storage,
  settings: loadSettings(storage),
  player: loadPlayer(storage),
  audio: createAudio(),
  ui: {},
  // ?speed=N runs shift time N× faster — for testing only.
  debugSpeed: Math.min(20, Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1)),
  save() { if (this.player) savePlayer(storage, this.player); },
  go(screen) { if (screen === 'menu') renderMenu(this); },
  openSettings() { openSettings(this); },
  applySettings() {
    const s = this.settings;
    const d = document.documentElement.dataset;
    d.text = s.textSize; d.contrast = s.contrast ? 'high' : 'normal'; d.motion = s.reduceMotion ? 'reduce' : 'full';
    this.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx });
    saveSettings(storage, s);
  },
  resetCampaign() { clearSave(storage); this.player = null; renderMenu(this); },
  newGame(name) { this.player = newPlayer(name); this.save(); this.resume(); },
  resume() {
    const p = this.player;
    if (!p) return renderMenu(this);
    const step = nextStep(p);
    this.save();
    window.scrollTo(0, 0);
    switch (step.type) {
      case 'scene': {
        const scene = SCENES.find(s => s.id === step.id);
        return playScene(this, scene, () => { markSceneSeen(p, scene.id); this.save(); this.resume(); });
      }
      case 'briefing': return renderBriefing(this, currentShift(p), () => this.startShift());
      case 'career': return renderCareer(this, () => { finishCareer(p); this.save(); this.resume(); });
      case 'finish': p.ending = chooseEnding(p); this.save(); return this.resume();
      case 'ending': return showEnding(this);
      case 'gameover': return showGameOver(this, step.reason);
      default: return renderMenu(this);
    }
  },
  startShift() {
    const p = this.player;
    const def = currentShift(p);
    saveCheckpoint(storage, p);
    const prepared = prepareShift(def, p.flags, `${p.history.length}|${p.createdAt}`);
    this.ui.shift = runShift(this, prepared, result => {
      const pay = computePaycheck(result, p, def);
      applyShiftResult(p, result, pay, def);
      p.phase = 'career';
      this.save();
      renderSummary(this, def, result, pay, () => this.resume());
    });
  },
};

function showEnding(app) {
  const p = app.player;
  const e = ENDINGS[p.ending];
  playScene(app, { title: e.title, place: 'lantern', kicker: 'Ending', nodes: {} }, () => {
    app.root.innerHTML = `<div class="screen menu end-screen">${streetSvg()}<div class="menu-inner">
      <span class="kicker">Ending</span><h1 class="neon small">${esc(e.title)}</h1>
      <dl class="stats end-stats"><dt>Shifts worked</dt><dd>${p.stats.shifts}</dd><dt>Correct calls</dt><dd>${p.stats.correct} / ${p.stats.correct + p.stats.wrong}</dd><dt>Fakes caught</dt><dd>${p.stats.fakesCaught}</dd><dt>Underage stopped</dt><dd>${p.stats.underageStopped}</dd><dt>Final balance</dt><dd>${money(p.money)}</dd><dt>Career path</dt><dd>${p.flags.career === 'victor' ? 'Halcyon (Victor)' : 'Mensah Door Services (Kwame)'}</dd></dl>
      <p class="muted">There are four endings. Your choices, your honesty at the door and how you handled the Printer decide which one you get.</p>
      <nav class="menu-buttons"><button class="btn big" id="again">New game</button><button class="btn ghost" id="menu">Menu</button></nav></div></div>`;
    document.getElementById('again').onclick = () => { app.player = null; clearSave(storage); renderMenu(app); };
    document.getElementById('menu').onclick = () => renderMenu(app);
  }, { lines: e.lines });
}

function showGameOver(app, reason) {
  const cp = loadCheckpoint(storage);
  const text = reason === 'fired'
    ? 'Three warnings. The manager takes your jacket back and doesn\'t meet your eye. You\'re off the roster.'
    : 'The landlord has changed the locks. Benny\'s couch is out on the street, and so are you.';
  app.audio.music(null);
  app.root.innerHTML = `<div class="screen menu end-screen">${streetSvg()}<div class="menu-inner">
    <span class="kicker">Game over</span><h1 class="neon small">${reason === 'fired' ? 'FIRED' : 'EVICTED'}</h1><p class="menu-sub">${esc(text)}</p>
    <nav class="menu-buttons">${cp ? '<button class="btn big" id="retry">Retry the last shift</button>' : ''}<button class="btn ghost" id="again">New game</button><button class="btn ghost" id="menu">Menu</button></nav></div></div>`;
  document.getElementById('retry')?.addEventListener('click', () => { app.player = cp; cp.phase = 'briefing'; app.save(); app.resume(); });
  document.getElementById('again').onclick = () => { clearSave(storage); app.player = null; renderMenu(app); };
  document.getElementById('menu').onclick = () => renderMenu(app);
}

app.applySettings();
renderMenu(app);
window.lastCall = app; // handy for debugging in the console

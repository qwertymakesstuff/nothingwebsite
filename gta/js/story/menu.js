// LAST EXIT: the start and pause menus' story parts: begin / continue / new story / free roam, voice and subtitle settings, the
// journal (mission progress and relationships) and a tool for hearing one line by ID. Plain DOM, no state of its own beyond the DOM.
import { story, progress, cycleRadio, station, STATIONS } from './runtime.js';
import * as voice from './voice.js';
import { data } from '../save.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function settingsBlock() {
  const box = el('div', 'vopts'), vol = el('input'), subs = el('button', 'opt'), radio = el('button', 'opt'), lab = el('label', null, 'voice volume ');
  vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = Math.round(voice.volume() * 100); vol.setAttribute('aria-label', 'voice volume');
  vol.addEventListener('input', () => voice.setVolume(vol.value / 100));
  subs.type = radio.type = 'button';
  const paint = () => { subs.textContent = 'subtitles: ' + (voice.subtitlesOn() ? 'on' : 'off'); radio.textContent = 'car radio: ' + STATIONS[station()].name; vol.value = Math.round(voice.volume() * 100); };
  subs.addEventListener('click', () => { voice.setSubtitles(!voice.subtitlesOn()); paint(); });
  radio.addEventListener('click', () => { cycleRadio(); paint(); });
  lab.appendChild(vol); box.append(lab, subs, radio); box.paint = paint; paint(); return box;
}
const blocks = [];

/** wire the story buttons. begin(mode) starts the game in 'new' | 'continue' | 'free' mode. */
export function initMenu(begin) {
  voice.loadManifest();                                                                         // the list of recordings is small: fetch it before the first line plays
  $('start').insertBefore(settingsBlock(), $('qual').parentElement); blocks.push($('start').querySelector('.vopts'));
  // a new story starts Ash with $38, so warn before replacing money earned in free roam
  const fresh = replacing => { const m = data.money > 38 ? ' You have $' + data.money.toLocaleString() + '; the story starts with $38.' : ''; return !(replacing || m) || confirm((replacing ? 'Start the story again from the beginning? Your story progress will be replaced.' : 'Begin the story?') + m); };
  $('goStory').addEventListener('click', () => { if (progress() !== 'new') begin('continue'); else if (fresh(false)) begin('new'); });
  $('goNew').addEventListener('click', () => { if (fresh(true)) begin('new'); });
  $('go').addEventListener('click', () => begin('free'));
  refreshStart();
}
export function refreshStart() {
  const p = progress(), b = $('goStory');
  b.textContent = p === 'new' ? 'begin the story' : p === 'finished' ? 'after the story' : 'continue the story';
  $('goNew').hidden = p === 'new';
  const s = story.s; $('storyLine').textContent = p === 'new' ? 'You arrive in Port Alder with $38. Someone is going to ask you for a favour.' : p === 'finished' ? 'The story is told. Side stories and free roam remain.' : s.active ? 'Mission in progress. Continue from its last checkpoint.' : 'Pick up where you left off.';
  blocks.forEach(b2 => b2.paint());
}

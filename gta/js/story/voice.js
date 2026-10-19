// LAST EXIT: voice playback (browser side). The game never needs a recording: a line with no audio file is shown as a subtitle for its
// reading time and play goes on. A recording is only requested when voice/available.json lists it, so a missing file never causes a
// failed network request, a console error or a stalled scene. Dropping a correctly named file into gta/voice/<CHARACTER>/ and running
// `node gta/tools/voice.mjs` (which lists it in voice/available.json) is all it takes to hear it.
import { ac, voiceBus, setVoiceVolume, resumeAudio, suspendAudio } from '../audio.js';
import { data, persist } from '../save.js';
import { LINES } from './dialogue.js';
import { nameOf, CAST } from './cast.js';

const BASE = new URL('../../voice/', import.meta.url);
export const manifest = { ready: false, found: new Map(), error: null };
let loading = null;
const dev = () => { try { return /[?&]voicedebug=1/.test(location.search) || localStorage.getItem('gta:voicedebug') === '1'; } catch (e) { return false; } };
const warned = new Set();
/** development-only note, once per line: never spams the console during normal play */
export function note(id, msg) { if (!dev() || warned.has(id)) return; warned.add(id); console.info('[voice] ' + id + ': ' + msg); }

export function loadManifest() {
  if (loading) return loading;
  loading = fetch(new URL('available.json', BASE), { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(j => {
    if (j && j.files && typeof j.files === 'object') for (const [id, file] of Object.entries(j.files)) if (typeof file === 'string') manifest.found.set(id, file);
    manifest.ready = true;
  }).catch(e => { manifest.ready = true; manifest.error = String(e); });
  return loading;
}
export const hasRecording = id => manifest.found.has(id);

/* ---- decoding and caching ---- */
const cache = new Map();                          // id -> Promise<AudioBuffer | null>
function fetchBuffer(url) {
  return fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); }).then(b => new Promise((res, rej) => ac.decodeAudioData(b, res, rej)));
}
/** Promise<AudioBuffer|null>. `force` tries the standard file names even when the manifest does not list the line (the test tool). */
export function loadRecording(id, force) {
  if (!ac) return Promise.resolve(null);
  if (cache.has(id)) return cache.get(id);
  const line = LINES[id]; let urls = [];
  if (manifest.found.has(id)) urls = [new URL(manifest.found.get(id), BASE).href];
  else if (force && line) urls = ['ogg', 'mp3'].map(ext => new URL(line.char + '/' + id + '.' + ext, BASE).href);
  if (!urls.length) return Promise.resolve(null);
  const p = (async () => { for (const u of urls) { try { return await fetchBuffer(u); } catch (e) { note(id, 'could not load ' + u + ' (' + e.message + '), using subtitles only'); } } return null; })();
  cache.set(id, p); p.then(b => { if (!b) cache.delete(id); });                           // only a recording that loaded is kept
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  return p;
}
/** warm the cache for the lines a scene is about to say, in order */
export function preload(ids) { for (const id of ids) if (manifest.found.has(id)) loadRecording(id); }

/* ---- playing one queue item ---- */
const FILTERED = new Set(['phone', 'radio']);
/** the voice should sound filtered (a phone or radio speaker)? */
export const filtered = item => !!item && FILTERED.has(item.via) && !(item.o && item.o.unfiltered);
const LOAD_TIMEOUT = 5;
/** begin the recording for a queue item. Sets item.audio when there is one; otherwise the queue times the line by reading speed. */
export function startAudio(item, force) {
  const id = item.id; item.audio = null;
  if (!ac) return;
  if (!manifest.ready) {                                                                   // the list of recordings has not arrived yet: hold the line for it, briefly
    const wait = { done: () => false, stop() { this.dead = true; } }; item.audio = wait;
    const release = () => { if (item.audio !== wait || wait.dead) return; item.audio = null; item.t = 0; startAudio(item, force); };
    loadManifest().then(release); setTimeout(release, 3000); return;
  }
  if (!hasRecording(id) && !force) { note(id, 'no recording, subtitles only'); return; }
  const a = { state: 'loading', src: null, t: 0, done() { return this.state === 'ended'; }, stop() { if (this.src) { try { this.src.onended = null; this.src.stop(); } catch (e) { /* already stopped */ } } this.state = 'ended'; } };
  item.audio = a;
  const giveUp = () => { if (item.audio === a) { item.audio = null; item.t = 0; } a.state = 'ended'; };      // from here the line is timed by reading speed instead
  const timer = setTimeout(() => { if (a.state === 'loading') { note(id, 'recording took too long, subtitles only'); giveUp(); } }, LOAD_TIMEOUT * 1000);
  loadRecording(id, force).then(buf => {
    clearTimeout(timer); if (a.state !== 'loading') return;
    if (!buf || !ac) { note(id, 'no recording, subtitles only'); return giveUp(); }
    try {
      const src = ac.createBufferSource(); src.buffer = buf; const out = voiceBus(filtered(item)); if (!out) return giveUp();
      src.connect(out); src.onended = () => { a.state = 'ended'; }; a.src = src; a.state = 'playing'; src.start();
      item.dur = Math.max(item.dur, buf.duration + .35); item.hasAudio = true; item.recordingSeconds = buf.duration;
    } catch (e) { note(id, 'playback failed: ' + e.message); giveUp(); }
  });
}
export function stopAudio(item) { if (item && item.audio && item.audio.stop) item.audio.stop(); if (item) item.audio = null; }

/* ---- settings ---- */
export const volume = () => (typeof data.voiceVol === 'number' ? data.voiceVol : .9);
export function setVolume(v) { data.voiceVol = Math.max(0, Math.min(1, v)); setVoiceVolume(data.voiceVol); persist(); }
export const subtitlesOn = () => data.subs !== false;
export function setSubtitles(on) { data.subs = !!on; persist(); }
export function applyVolume() { setVoiceVolume(volume()); }
export { suspendAudio, resumeAudio };

/** what the subtitle shows for a queue item: { name, color, text, tag } */
export function captionOf(item) {
  const line = item.line, c = CAST[line.char], via = item.via;
  const base = (item.o && item.o.as) || nameOf(line.char);
  return { name: base, tag: via === 'phone' ? 'phone' : via === 'radio' && !(item.o && item.o.as) ? 'radio' : '', color: (c && c.color) || '#ddd', text: line.text.en };
}

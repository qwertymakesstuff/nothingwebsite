// LAST EXIT: the dialogue database builder (pure). Dialogue is data: every scene is a list of steps, every spoken step becomes a line
// record with a unique ID  CHARACTER_MISSION_SCENE_NNN  (e.g. EDDIE_M01_GARAGE_001). Mission code never contains dialogue text; a
// writer can change a line here, and a recorded file named after its ID is picked up automatically (see voice.js).
//
// Step forms (arrays are short for spoken lines):
//   ['EDDIE', 'direction for the actor', 'what he says', { if: 'cond', pri: 3, dur: 4 }]     a spoken line (4th item optional)
//   { choice: 'key', options: [{ v: 'value', t: 'label shown to the player', steps: [...], set: {}, rel: {}, if: 'cond' }] }
//   { set: { flag: true }, rel: { MARA: 1 }, choice: { key: v }, unlock: ['E01'] }              effects, applied when reached
//   { if: 'cond', then: [...], else: [...] }                                                   branch on story state
//   { pause: 1.2 }     { act: 'name', ... }                                                    timing and staging
export const SCENES = {}, LINES = {};
const counters = {};
export const ID_RE = /^[A-Z]+_[A-Z]\d{2}_[A-Z0-9_]+_\d{3}$/;

function norm(steps, mission, name, via) {
  return steps.map(st => {
    if (Array.isArray(st)) {
      const [char, dir, text, o] = st, key = char + '_' + mission + '_' + name, n = (counters[key] = (counters[key] || 0) + 1), id = key + '_' + String(n).padStart(3, '0');
      const line = Object.assign({ id, char, mission, scene: mission + '_' + name, dir, text: { en: text }, pri: via === 'direct' ? 3 : 2, via, file: 'voice/' + char + '/' + id }, o || {});
      if (LINES[id]) throw new Error('duplicate line id ' + id);
      LINES[id] = line; return { k: 'line', id };
    }
    if (typeof st.choice === 'string') return { k: 'choice', key: st.choice, prompt: st.prompt, options: st.options.map(o => Object.assign({}, o, { steps: norm(o.steps || [], mission, name, via) })) };
    if (st.if !== undefined) return { k: 'if', cond: st.if, then: norm(st.then || [], mission, name, via), else: norm(st.else || [], mission, name, via) };
    if (st.pause !== undefined) return { k: 'pause', sec: st.pause };
    if (st.act) return Object.assign({ k: 'act' }, st);
    return { k: 'fx', set: st.set, rel: st.rel, choice: st.choiceSet || st.choice, unlock: st.unlock, ending: st.ending, call: st.call };
  });
}
/**
 * Define a scene. meta: { via: 'direct' | 'phone' | 'radio' | 'car', cast: [char ids on screen], at: 'ref', skip: true|false }
 *   direct = people standing together (camera frames the speaker, the world pauses)
 *   phone / radio = heard while playing (filtered voice, no camera, the player keeps control)
 *   car = a passenger in the player's car (unfiltered, the player keeps control)
 */
export function scene(mission, name, meta, steps) {
  const id = mission + '_' + name; if (SCENES[id]) throw new Error('duplicate scene ' + id);
  const via = (meta && meta.via) || 'direct';
  SCENES[id] = Object.assign({ id, mission, name, via, skip: true }, meta, { steps: norm(steps, mission, name, via) });
  return id;
}
/** all line ids used by a scene (including branches and choice options) */
export function sceneLineIds(sc) {
  const out = [], walk = list => list.forEach(s => { if (s.k === 'line') out.push(s.id); else if (s.k === 'choice') s.options.forEach(o => walk(o.steps)); else if (s.k === 'if') { walk(s.then); walk(s.else); } });
  walk(typeof sc === 'string' ? SCENES[sc].steps : sc.steps); return out;
}
export const textOf = (line, locale) => (line.text[locale || 'en'] || line.text.en);
/** reading time for a subtitle: ~15 characters a second, never under two seconds */
export const readSeconds = text => Math.max(2, Math.min(9, text.length / 15 + .7));

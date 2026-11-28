// Shared helpers for the FAKEOS media tools.
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { STYLE, PARAMS, PEOPLE, PHOTOS, THUMBS, THUMB_WHO, BANNERS, WALLPAPERS } from './assets.mjs';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const HERE = fileURLToPath(new URL('./', import.meta.url));
export const MEDIA = ROOT + 'fakeos/media/';
export const INBOX = HERE + 'inbox/';
export const ORIGINALS = HERE + 'originals/';
export const WORK = HERE + '.work/';

// Output size and folder per image kind.
export const KINDS = {
  avatar: { dir: 'avatars', w: 256, h: 256 },
  photo: { dir: 'photos', w: 800, h: 600 },
  thumb: { dir: 'thumbs', w: 640, h: 360 },
  banner: { dir: 'banners', w: 1500, h: 250 },
  wallpaper: { dir: 'wallpapers', w: 1920, h: 1200 },
};

const look = id => PEOPLE[id]?.look ? PEOPLE[id].look : '';
// Every image job: { kind, id, file, prompt, ref }. The distinctive words come first so a
// Midjourney download (named after the start of its prompt) can be matched back to its job.
export function imageJobs() {
  const jobs = [];
  for (const [id, p] of Object.entries(PEOPLE)) { const object = p.obj || !p.look; jobs.push({ kind: 'avatar', id, prompt: object ? `${p.avatar}, ${STYLE.avatarObject} ${PARAMS.avatar}` : `${p.look}, ${p.avatar}, ${STYLE.avatar} ${PARAMS.avatar}` }); }
  // people whose avatar isn't their face get a separate reference portrait (not shown in the game)
  for (const [id, p] of Object.entries(PEOPLE)) if (p.obj && p.look && !/face never shown/.test(p.look)) jobs.push({ kind: 'ref', id, prompt: `${p.look}, front-facing waist-up portrait, plain background, even light, character reference, realistic photo ${PARAMS.avatar}` });
  for (const [id, p] of Object.entries(PHOTOS)) jobs.push({ kind: 'photo', id, ref: p.who || null, prompt: `${p.scene}${p.who && look(p.who) ? ', featuring ' + look(p.who) : ''}, ${STYLE.photo} ${PARAMS.photo}` });
  for (const [id, scene] of Object.entries(THUMBS)) { const who = THUMB_WHO[id]; jobs.push({ kind: 'thumb', id, ref: who || null, prompt: `${scene}${who && look(who) ? ', the person is ' + look(who) : ''}, ${STYLE.thumb} ${PARAMS.thumb}` }); }
  for (const [id, scene] of Object.entries(BANNERS)) jobs.push({ kind: 'banner', id, prompt: `${scene}, ${STYLE.banner} ${PARAMS.banner}` });
  for (const [id, scene] of Object.entries(WALLPAPERS)) jobs.push({ kind: 'wallpaper', id, prompt: `${scene}, ${STYLE.wallpaper} ${PARAMS.wallpaper}` });
  for (const j of jobs) j.file = `${j.kind}-${j.id}.png`;
  return jobs;
}

// The image to use as a character reference for a person.
export const refFile = id => PEOPLE[id]?.obj ? `ref-${id}.png` : `avatar-${id}.png`;

export const words = s => String(s).toLowerCase().replace(/--\w+.*$/, '').split(/[^a-z0-9]+/).filter(w => w.length > 1);

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26, ...opts });
  if (r.error) throw new Error(`${cmd} could not run: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${(r.stderr || '').slice(-1500)}`);
  return r.stdout;
}
export function probeDuration(file) {
  try { return +(+run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).trim()).toFixed(2); } catch { return null; }
}

// Generates FAKEOS videos with an AI video API, unattended.
//
//   node tools/fakeos-media/make-videos.mjs                 show the plan and estimated cost (spends nothing)
//   node tools/fakeos-media/make-videos.mjs --tier 1 --go   generate every tier-1 video
//   node tools/fakeos-media/make-videos.mjs --only gBforlater0,dGvacuum012 --go
//   options: --tier N (this tier and below)  --only ids  --redo (remake finished videos)  --provider test
//
// Settings live in tools/fakeos-media/config.json (copy config.example.json). API keys come from
// environment variables only: REPLICATE_API_TOKEN or GEMINI_API_KEY.
// Each shot is cached in .work/, so an interrupted run picks up where it stopped and never pays twice.
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { HERE, MEDIA, ORIGINALS, WORK, ROOT, run, probeDuration } from './lib.mjs';
import { STYLE, PEOPLE, VIDEO_JOBS } from './assets.mjs';
import { indexMedia } from './index-media.mjs';

const { VIDEOS } = await import(ROOT + 'fakeos/js/content/videos.js');
const VIDEO = Object.fromEntries(VIDEOS.map(v => [v.id, { ...v, seconds: v.dur.split(':').reduce((a, b) => a * 60 + +b, 0) }]));

// ---- options ----------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = name => { const i = argv.indexOf('--' + name); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const cfgFile = HERE + 'config.json';
const config = { provider: 'replicate', model: '', pricePerSecond: 0.15, maxSpendPerRun: 15, maxShotSeconds: 8, minShotSeconds: 4, loopShots: 3, replicateInput: { prompt: '{prompt}', duration: '{seconds}', aspect_ratio: '16:9', start_image: '{image}' }, geminiParameters: { aspectRatio: '16:9' },
  ...(existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, 'utf8')) : {}) };
if (arg('provider')) config.provider = arg('provider');
const go = !!arg('go'), redo = !!arg('redo');
const tier = arg('tier') ? +arg('tier') : 3;
const only = typeof arg('only') === 'string' ? arg('only').split(',') : null;

// ---- planning ---------------------------------------------------------------------------------
const clampSec = s => Math.max(config.minShotSeconds, Math.min(config.maxShotSeconds, Math.round(s)));
const NOTEXT = 'No subtitles, no captions, no on-screen text, no watermark.';
function planVideo(id) {
  const job = VIDEO_JOBS[id], v = VIDEO[id];
  const who = job.who && PEOPLE[job.who]?.look ? `The person on camera: ${PEOPLE[job.who].look}.` : '';
  const base = `${STYLE.video}. ${job.setting}. ${who}`;
  let shots;
  if (job.mode === 'loop') {
    const angles = ['Wide establishing shot, almost nothing happens.', 'Medium shot, small natural movements.', 'Closer shot, slow subtle movement.'];
    shots = angles.slice(0, config.loopShots).map(a => ({ seconds: config.maxShotSeconds, prompt: `${base} ${a} No speech. ${NOTEXT}` }));
  } else {
    const lines = job.shots || v.caps.map(([at, text], i) => {
      const next = v.caps[i + 1]?.[0] ?? v.seconds;
      const said = text.match(/^(\w[\w ]{0,20}): (.+)$/);
      if (!text) return null;
      if (text.startsWith('[')) return { seconds: next - at, prompt: text.slice(1, -1), cap: text };
      if (said) return { seconds: next - at, prompt: 'an off-camera voice speaks', say: said[2], speaker: `an off-camera voice (${said[1]})`, cap: text };
      return { seconds: next - at, prompt: 'speaking to the camera', say: text, cap: text };
    }).filter(Boolean);
    shots = lines.map(l => ({
      seconds: clampSec(l.seconds ?? config.maxShotSeconds),
      say: l.say || null,
      cap: l.cap ?? l.say ?? '',
      prompt: `${base} ${l.prompt}.${l.say ? ` ${l.speaker || 'They'} say${l.speaker ? 's' : ''}, in a natural unpolished voice: "${l.say}"` : ' No speech.'} ${NOTEXT}`,
    }));
  }
  return shots.map((s, i) => {
    const still = ['png', 'jpg', 'jpeg', 'webp'].map(e => `${ORIGINALS}still-${id}-${i + 1}.${e}`).find(existsSync) || null;
    return { ...s, still, key: createHash('sha1').update(JSON.stringify([config.provider, config.model, s.prompt, s.seconds, still])).digest('hex').slice(0, 10) };
  });
}

// ---- providers --------------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dataUri = file => `data:image/${file.endsWith('png') ? 'png' : file.endsWith('webp') ? 'webp' : 'jpeg'};base64,${readFileSync(file).toString('base64')}`;
async function fetchOk(url, opts, what) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${what}: HTTP ${r.status} ${(await r.text()).slice(0, 400)}`);
  return r;
}
async function download(url, file, headers = {}) {
  const r = await fetchOk(url, { headers, redirect: 'follow' }, 'download');
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}

const providers = {
  // Replicate runs many video models behind one API. config.model is "owner/name" from replicate.com;
  // config.replicateInput maps our fields onto that model's input names ({prompt} {seconds} {image}).
  async replicate(shot, out) {
    const token = process.env.REPLICATE_API_TOKEN; if (!token) throw new Error('set REPLICATE_API_TOKEN');
    if (!config.model.includes('/')) throw new Error('set "model" in config.json to a Replicate video model, e.g. "owner/name"');
    const input = {};
    for (const [k, tpl] of Object.entries(config.replicateInput)) {
      if (tpl === '{image}') { if (shot.still) input[k] = dataUri(shot.still); continue; }
      input[k] = tpl === '{prompt}' ? shot.prompt : tpl === '{seconds}' ? shot.seconds : tpl;
    }
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' };
    let p = await (await fetchOk(`https://api.replicate.com/v1/models/${config.model}/predictions`, { method: 'POST', headers, body: JSON.stringify({ input }) }, 'replicate create')).json();
    while (!['succeeded', 'failed', 'canceled'].includes(p.status)) { await sleep(5000); p = await (await fetchOk(p.urls.get, { headers }, 'replicate poll')).json(); }
    if (p.status !== 'succeeded') throw new Error(`replicate ${p.status}: ${p.error || ''}`);
    const url = Array.isArray(p.output) ? p.output[0] : typeof p.output === 'object' ? p.output.video || Object.values(p.output)[0] : p.output;
    await download(url, out);
  },
  // Google's Gemini API (Veo / newer video models). config.model is the model id from Google's docs.
  async gemini(shot, out) {
    const key = process.env.GEMINI_API_KEY; if (!key) throw new Error('set GEMINI_API_KEY');
    if (!config.model) throw new Error('set "model" in config.json to a current Gemini video model id');
    const BASE = 'https://generativelanguage.googleapis.com/v1beta';
    const instance = { prompt: shot.prompt };
    if (shot.still) instance.image = { bytesBase64Encoded: readFileSync(shot.still).toString('base64'), mimeType: shot.still.endsWith('png') ? 'image/png' : 'image/jpeg' };
    const headers = { 'x-goog-api-key': key, 'Content-Type': 'application/json' };
    let op = await (await fetchOk(`${BASE}/models/${config.model}:predictLongRunning`, { method: 'POST', headers, body: JSON.stringify({ instances: [instance], parameters: { ...config.geminiParameters, durationSeconds: shot.seconds } }) }, 'gemini create')).json();
    while (!op.done) { await sleep(10000); op = await (await fetchOk(`${BASE}/${op.name}`, { headers }, 'gemini poll')).json(); }
    if (op.error) throw new Error('gemini: ' + JSON.stringify(op.error));
    const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!uri) throw new Error('gemini: no video in response ' + JSON.stringify(op.response).slice(0, 300));
    await download(uri, out, { 'x-goog-api-key': key });
  },
  // Free local stand-in: coloured test footage with a tone, to try the whole pipeline without spending.
  async test(shot, out) {
    const hue = parseInt(shot.key.slice(0, 2), 16);
    run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=1280x720:rate=24:duration=${shot.seconds}`, '-f', 'lavfi', '-i', `sine=frequency=${200 + hue}:duration=${shot.seconds}`, '-vf', `hue=h=${hue}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', out]);
  },
};

// ---- assembly ---------------------------------------------------------------------------------
// Every shot is normalised, then all are joined and given the same worn 2012 camera look.
function assemble(id, files, mode) {
  const dir = WORK + id + '/';
  const parts = files.map((f, i) => {
    const part = `${dir}part-${i}.ts`;
    const hasAudio = run('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', f]).trim() !== '';
    const audioIn = hasAudio ? [] : ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo'];
    run('ffmpeg', ['-y', '-v', 'error', '-i', f, ...audioIn, '-map', '0:v:0', '-map', hasAudio ? '0:a:0' : '1:a:0', '-shortest',
      '-vf', 'scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2,fps=25,setsar=1',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-ar', '44100', '-ac', '2', '-f', 'mpegts', part]);
    return part;
  });
  mkdirSync(MEDIA + 'videos', { recursive: true });
  const out = `${MEDIA}videos/${id}.mp4`;
  run('ffmpeg', ['-y', '-v', 'error', '-i', `concat:${parts.join('|')}`,
    '-vf', 'noise=alls=7:allf=t,eq=saturation=0.9:contrast=1.05,unsharp=3:3:-0.3',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    ...(mode === 'loop' ? ['-an'] : ['-c:a', 'aac', '-b:a', '64k', '-af', 'loudnorm=I=-18:TP=-2']), out]);
  return out;
}

// ---- main -------------------------------------------------------------------------------------
const ids = Object.keys(VIDEO_JOBS).filter(id => (only ? only.includes(id) : VIDEO_JOBS[id].tier <= tier));
for (const id of ids) if (!VIDEO[id]) throw new Error(`video job ${id} has no video in the game's content`);
const pending = ids.filter(id => redo || !existsSync(`${MEDIA}videos/${id}.mp4`));
let planSeconds = 0;
console.log(`provider: ${config.provider}${config.model ? ' / ' + config.model : ''}  ·  ${pending.length} of ${ids.length} videos to make\n`);
for (const id of pending) {
  const shots = planVideo(id), j = VIDEO_JOBS[id];
  const fresh = shots.filter(s => !existsSync(`${WORK}${id}/shot-${s.key}.mp4`));
  const secs = fresh.reduce((n, s) => n + s.seconds, 0); planSeconds += secs;
  console.log(`${id}  tier ${j.tier}  ${j.mode}  "${VIDEO[id].title.slice(0, 50)}"  ${shots.length} shots, ${secs}s to generate${shots.some(s => s.still) ? ', uses stills' : ''}`);
}
const cost = planSeconds * (config.provider === 'test' ? 0 : config.pricePerSecond);
console.log(`\n${planSeconds}s of footage to generate, about $${cost.toFixed(2)} at $${config.pricePerSecond}/s (check your provider's real price).`);
if (!go) { console.log('Nothing generated. Add --go to start.'); process.exit(0); }
if (!providers[config.provider]) throw new Error(`unknown provider ${config.provider}`);

let spent = 0, made = 0;
for (const id of pending) {
  const shots = planVideo(id), dir = WORK + id + '/';
  mkdirSync(dir, { recursive: true });
  const files = [];
  try {
    for (const [i, s] of shots.entries()) {
      const f = `${dir}shot-${s.key}.mp4`;
      if (!existsSync(f)) {
        const price = config.provider === 'test' ? 0 : s.seconds * config.pricePerSecond;
        if (spent + price > config.maxSpendPerRun) { console.log(`\nStopping: the next shot would pass maxSpendPerRun ($${config.maxSpendPerRun}). Run again to continue.`); finish(); }
        process.stdout.write(`${id} shot ${i + 1}/${shots.length}… `);
        const tmp = f.replace(/\.mp4$/, '.part.mp4');
        await providers[config.provider](s, tmp);
        renameSync(tmp, f);
        spent += price; console.log('done');
      }
      files.push(f);
    }
    const out = assemble(id, files, VIDEO_JOBS[id].mode);
    const duration = probeDuration(out);
    const meta = { mode: VIDEO_JOBS[id].mode, duration };
    if (meta.mode === 'full') { let t = 0; meta.caps = []; for (const [i, s] of shots.entries()) { const real = probeDuration(files[i]) || s.seconds; meta.caps.push([+t.toFixed(2), s.cap]); t += real; } }
    writeFileSync(`${MEDIA}videos/${id}.json`, JSON.stringify(meta) + '\n');
    made++; console.log(`✓ ${id} → fakeos/media/videos/${id}.mp4 (${duration}s)`);
  } catch (e) { console.log(`\n✗ ${id}: ${e.message}`); }
}
finish();
function finish() {
  if (made) indexMedia();
  console.log(`\n${made} video${made === 1 ? '' : 's'} made, about $${spent.toFixed(2)} spent this run.`);
  process.exit(0);
}

// Builds docs/BORDERLINE-booth-prompts.docx: a second image of everyone who comes to the
// booth, so the face at the window is not simply the passport photo.
// Run: node borderline/tools/make-booth-prompts.js borderline/docs/BORDERLINE-booth-prompts.docx
const fs = require('fs');
const { Packer, AlignmentType } = require('docx');
const { ENTRANTS, CAST, POOL } = require('./portrait-cast.js');
const { INK, MUTED, PAPER, p, b, h1, h2, bullet, table, character, pageBreak, makeDocument, Paragraph, TextRun, ShadingType } = require('./prompt-doc.js');

const BOOTH_STYLE = 'Use the attached reference portrait: this must be recognisably the same person, with the same face, age, hair and clothes. Now seen from inside a border-checkpoint booth, through the service window: a three-quarter view with the body turned slightly to one side, chest-up framing, a natural unposed expression. Cold grey daylight from the side, faint reflections on the glass, a softly blurred mountain road and striped barrier behind. Painted illustration style matching the reference: visible brushwork, muted early-1980s palette, subtle film grain. Square 1:1 composition, head in the upper half of the frame, nothing covering the face.';
const NEGATIVE = 'text, lettering, watermark, logos, real national flags or insignia, a different face or age from the reference, straight-on passport pose, plain studio background, sunglasses, hands covering the face, extreme close-up, multiple people, frames or borders.';

// how each person looks at the window: pose, expression, small action
const AT_THE_WINDOW = {
  v_ilse_marek: 'Tired but relieved, a small polite smile, one hand on the strap of a worn leather handbag.',
  v_tomas_reyl: 'Impatient, leaning towards the window and glancing at his wristwatch, eyebrows raised.',
  v_anika_sorvald: 'Bright and eager, smiling openly, the strap of a violin case over one shoulder.',
  v_mikel_arnsen: 'A cocky grin, cap pushed back on his head, one forearm resting on the counter.',
  v_odessa_kain: 'A warm, patient smile, gloved hands folded together in front of her.',
  v_piotr_halden: 'Weary, rubbing the back of his neck, a crumpled bus ticket in his other hand.',
  c_radim_kessler: 'Arms folded, standing over the counter, looking down with a hard, appraising stare.',
  c_jarek_dusek: 'Leaning casually against the window frame, grinning as if sharing a secret.',
  c_ruth_vlach: 'Perfectly still and unsmiling, one gloved hand resting flat on the counter.',
  c_vera_novak: 'Urgent and watchful, glancing back over her shoulder as if afraid of being seen.',
  c_gleb_rasko: 'A broad, knowing smile, one hand sliding a plain unmarked envelope across the counter.',
  c_hedda_lindqvist: 'Curious and alert, a small notebook and pencil in hand, head tilted slightly.',
  c_arman_sevanyan: 'Anxious, forcing a polite smile, one hand resting protectively on a small shoulder just out of frame.',
  c_nare_sevanyan: 'Only just tall enough to see over the counter, peeking up shyly with wide serious eyes.',
  c_otmar_vogt: 'Faintly amused, peering over his half-moon spectacles, papers held neatly in both hands.',
};
const POOL_MOODS = [
  'Patient but tired after the long queue, papers held ready.',
  'Faintly nervous, eyes flicking towards the guard beside the barrier.',
  'Polite and hopeful, leaning a little towards the window.',
  'Bored and resigned, shoulders slumped.',
  'Wary and unsmiling, watching the officer closely.',
  'Anxious, holding their papers close to their chest.',
];

// the ID prompt's appearance description, without its closing line about mood, plus the
// booth direction, so the person stays recognisable but behaves differently
const appearance = prompt => prompt.split(/(?<=\.) /).slice(0, -1).join(' ');
const booth = (c, extra) => ({ ...c, file: c.file.replace('.png', '_booth.jpg'), reference: c.file.replace('.png', '.jpg'), prompt: `${appearance(c.prompt)} At the window: ${extra}` });
const entrants = ENTRANTS.map(c => booth(c, AT_THE_WINDOW[c.file.replace('.png', '')]));
const cast = CAST.map(c => booth(c, AT_THE_WINDOW[c.file.replace('.png', '')]));
const pool = POOL.map((c, i) => booth({ ...c, name: c.file.replace('.png', '_booth'), meta: `${c.nation} · ${c.sex} · ${c.range}`, role: 'Generic traveller for generated entrants.' }, POOL_MOODS[i % POOL_MOODS.length]));
for (const c of [...entrants, ...cast, ...pool]) if (/undefined/.test(c.prompt)) throw new Error(`no booth direction for ${c.file}`);

// each entry names its reference image, then the prompt
const withReference = (c, n) => character({ ...c, role: `${c.role} Reference image: ${c.reference}` }, n, BOOTH_STYLE);
const list = rows => table(['#', 'Name', 'Reference image', 'Booth file'], rows.map((c, i) => [String(i + 1), c.name, c.reference, c.file]), [500, 2400, 3060, 3400]);
const total = entrants.length + cast.length + pool.length;

const children = [
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 60 }, children: [new TextRun({ text: 'BORDER', bold: true, size: 56, color: INK }), new TextRun({ text: 'LINE', bold: true, size: 56, color: 'B0302A' })] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Booth portraits: image prompts', size: 32, color: MUTED })] }),
  p(`Everyone who comes to the booth needs a second image: the same person as their ID portrait, but seen through the booth window. The ID portrait stays on the passport and identity card, and this one shows at the window, so checking the face against the photo is a real comparison. The ${total} images cover the ${entrants.length} Day 1 entrants, the ${cast.length} recurring characters and the ${pool.length} generic portraits. The household never comes to the booth, so it needs none.`),
  h2('Contents'),
  bullet([b('How to make the booth images: '), 'reference images, file names and the shared style block.']),
  bullet([b('Part 1 · Day 1 entrants: '), `${entrants.length} images.`]),
  bullet([b('Part 2 · Recurring cast: '), `${cast.length} images.`]),
  bullet([b('Part 3 · Generic portraits: '), `${pool.length} images.`]),
  pageBreak(),

  h1('How to make the booth images'),
  h2('Use the ID portrait as the reference'),
  p([b('This matters most. '), 'Give your image tool the person\'s existing ID portrait as a reference image (character reference, image prompt or image-to-image), together with the prompt. Without it, the tool will invent a different face. Each entry below names its reference file, which is the image you already made, for example v_ilse_marek.jpg.']),
  p('The booth image should differ from the ID portrait in pose, angle, expression and light, but never in identity. A player comparing the two should think "yes, that is her", not "that is the same picture".'),
  h2('Technical requirements'),
  bullet([b('Format: '), 'JPEG or PNG, square, at least 1024 × 1024 pixels.']),
  bullet([b('File names: '), 'the ID portrait\'s name with _booth added, for example v_ilse_marek_booth.jpg or pool_cor_f_young_booth.jpg. Put them in the same Dropbox folder as before.']),
  bullet([b('Framing: '), 'chest-up, three-quarter view, the face clear and unobstructed. The booth window crops the image a little at the top and bottom, so keep the head in the upper half but not at the very edge.']),
  bullet([b('Background: '), 'the view behind the person from inside the booth: the mountain road and the barrier, softly blurred.']),
  bullet([b('Making them gradually: '), 'anyone without a booth image keeps using their ID portrait at the window, so you can add these in any order.']),
  h2('Shared style block (already included in every prompt)'),
  new Paragraph({ spacing: { after: 160 }, shading: { fill: PAPER, type: ShadingType.CLEAR }, children: [new TextRun({ text: BOOTH_STYLE, size: 20 })] }),
  p([b('Negative prompt (if your tool supports one):')]),
  new Paragraph({ spacing: { after: 160 }, shading: { fill: 'F3DED8', type: ShadingType.CLEAR }, children: [new TextRun({ text: NEGATIVE, size: 20 })] }),
  pageBreak(),

  h1('Part 1 · Day 1 entrants'),
  list(entrants),
  ...entrants.flatMap((c, i) => withReference(c, i + 1)),
  pageBreak(),
  h1('Part 2 · Recurring cast'),
  p('These characters arrive with the story phases. Some come to the booth as travellers; others, like your supervisor and your colleague, lean in at the window to talk to you.'),
  list(cast),
  ...cast.flatMap((c, i) => withReference(c, i + 1)),
  pageBreak(),
  h1('Part 3 · Generic portraits'),
  p('One booth image for each generic portrait. Generated entrants who share a generic portrait also share its booth image.'),
  list(pool),
  new Paragraph({ spacing: { before: 240 }, children: [] }),
  ...pool.flatMap((c, i) => withReference(c, i + 1)),
];

const doc = makeDocument({ title: 'BORDERLINE booth portraits: image prompts', footer: 'BORDERLINE booth prompts', children });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(process.argv[2], buf); console.log('wrote', process.argv[2], total, 'booth images'); });

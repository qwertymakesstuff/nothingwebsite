// Builds docs/BORDERLINE-portrait-prompts.docx: every person who needs a portrait, with an
// image prompt for each. Run: node borderline/tools/make-portrait-prompts.js borderline/docs/BORDERLINE-portrait-prompts.docx
const fs = require('fs');
const { Packer, AlignmentType } = require('docx');
const { STYLE, NEGATIVE, ENTRANTS, CAST, HOUSEHOLD, POOL } = require('./portrait-cast.js');
const { INK, MUTED, PAPER, p, b, h1, h2, bullet, table, character, pageBreak, makeDocument, Paragraph, TextRun, ShadingType } = require('./prompt-doc.js');

const children = [
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 60 }, children: [new TextRun({ text: 'BORDER', bold: true, size: 56, color: INK }), new TextRun({ text: 'LINE', bold: true, size: 56, color: 'B0302A' })] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: 'Portrait list and image prompts', size: 32, color: MUTED })] }),
  p(`This document lists every person who needs a portrait in BORDERLINE, with a ready-to-paste prompt for each. It covers the ${ENTRANTS.length} entrants already in the game, a planned recurring cast of ${CAST.length} characters for the story phases, your ${HOUSEHOLD.length}-person household, and a pool of ${POOL.length} generic portraits for generated entrants: ${ENTRANTS.length + CAST.length + HOUSEHOLD.length + POOL.length} images in all.`),
  p([b('Start with Part 1. '), 'Those six people are in the game today. The recurring cast and household are a proposal for phases 7 to 9: their names, ages and roles may still change, so they are the safest images to leave until those phases are written.']),
  h2('Contents'),
  bullet([b('How to make the images: '), 'technical requirements, the shared style block and the negative prompt.']),
  bullet([b('Part 1 · Entrants already in the game: '), `${ENTRANTS.length} portraits.`]),
  bullet([b('Part 2 · Recurring cast (planned): '), `${CAST.length} portraits.`]),
  bullet([b('Part 3 · Your household (planned): '), `${HOUSEHOLD.length} portraits.`]),
  bullet([b('Part 4 · Portrait pool for generated entrants: '), `${POOL.length} portraits.`]),
  pageBreak(),

  h1('How to make the images'),
  h2('Technical requirements'),
  bullet([b('Format: '), 'PNG, square, at least 1024 × 1024 pixels.']),
  bullet([b('Framing: '), 'head and shoulders, facing the camera straight on. The same image is used in the booth window and, with a sepia filter, as the passport or identity-card photograph, so it must work as an official ID photo.']),
  bullet([b('Background: '), 'plain flat warm grey. A transparent background is even better, because the booth draws the mountain road behind the entrant.']),
  bullet([b('Expression: '), 'neutral or close to it. Personality should come from the face, hair and clothes, not from a dramatic expression.']),
  bullet([b('File names: '), 'save each image under the exact file name given and put it in borderline/assets/portraits/. The game will look the portraits up by these names.']),
  bullet([b('Setting: '), 'every country in the game is fictional. Avoid real flags, insignia, uniforms and political symbols.']),
  h2('Keeping the style consistent'),
  p('Every prompt below already ends with the shared style block, so each one can be pasted on its own. If your image tool supports a fixed style, a reference image or a seed, generate one portrait you are happy with first and reuse it for the rest so the cast looks like it belongs to the same game.'),
  p([b('Shared style block (already included in every prompt):')]),
  new Paragraph({ spacing: { after: 160 }, shading: { fill: PAPER, type: ShadingType.CLEAR }, children: [new TextRun({ text: STYLE, size: 20 })] }),
  p([b('Negative prompt (use with every image, if your tool supports one):')]),
  new Paragraph({ spacing: { after: 160 }, shading: { fill: 'F3DED8', type: ShadingType.CLEAR }, children: [new TextRun({ text: NEGATIVE, size: 20 })] }),
  h2('Matching the papers'),
  p('Each person\'s age, sex and nationality appear on their documents, and the rules engine never judges by appearance. The portrait should still agree with the papers: a 68-year-old on the passport should look 68. Ages given are on the first shift, 12 March 1982.'),
  pageBreak(),

  h1('Part 1 · Entrants already in the game'),
  p('These are the six hand-written entrants on Day 1. Today they appear as simple drawn portraits.'),
  table(['#', 'Name', 'Nationality · sex · age', 'File'], ENTRANTS.map((c, i) => [String(i + 1), c.name, c.meta, c.file]), [500, 2400, 3060, 3400]),
  ...ENTRANTS.flatMap((c, i) => character(c, i + 1, STYLE)),
  pageBreak(),

  h1('Part 2 · Recurring cast (planned)'),
  p('A proposed cast for the visitor, story and moral-dilemma phases (7 and 9). They are not in the game yet, and their names and roles may change when the story is written.'),
  table(['#', 'Name', 'Nationality · sex · age', 'File'], CAST.map((c, i) => [String(i + 1), c.name, c.meta, c.file]), [500, 2400, 3060, 3400]),
  ...CAST.flatMap((c, i) => character(c, i + 1, STYLE)),
  pageBreak(),

  h1('Part 3 · Your household (planned)'),
  p('The family you support between shifts in the household-finance phase (8). They appear on the household screen, not at the booth, but use the same style so the game stays consistent.'),
  table(['#', 'Name', 'Nationality · sex · age', 'File'], HOUSEHOLD.map((c, i) => [String(i + 1), c.name, c.meta, c.file]), [500, 2400, 3060, 3400]),
  ...HOUSEHOLD.flatMap((c, i) => character(c, i + 1, STYLE)),
  pageBreak(),

  h1('Part 4 · Portrait pool for generated entrants'),
  p('Most entrants each day are generated, so they can\'t each have a bespoke portrait. Instead, the game will pick from a pool by nationality, sex and age band, so the photo always fits the passport. The pool below has one portrait for each of the 5 nations × 2 sexes × 3 age bands.'),
  p([b('More variety: '), 'a day has about a dozen entrants, so faces will repeat across days. If you can, make a second version of each (same prompt, different seed) and add _2 before .png, for example pool_cor_m_young_2.png.']),
  p([b('Skin tones '), 'are spread on purpose: every nation in the game has a mixed population, and the generator gives entrants of any nationality any skin tone.']),
  table(['File', 'Nation', 'Sex', 'Age band'], POOL.map(c => [c.file, c.nation, c.sex, c.range]), [3760, 2000, 1600, 2000]),
  new Paragraph({ spacing: { before: 240 }, children: [] }),
  ...POOL.flatMap((c, i) => character({ ...c, name: c.file.replace('.png', ''), meta: `${c.nation} · ${c.sex} · ${c.range}`, role: 'Generic traveller for generated entrants.' }, i + 1, STYLE)),
];


const doc = makeDocument({ title: 'BORDERLINE portrait list and image prompts', footer: 'BORDERLINE portrait prompts', children });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(process.argv[2], buf); console.log('wrote', process.argv[2], ENTRANTS.length + CAST.length + HOUSEHOLD.length + POOL.length, 'portraits'); });

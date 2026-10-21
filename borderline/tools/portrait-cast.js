// The people of BORDERLINE who need portraits, described once for every prompt document.
// Used by make-portrait-prompts.js (ID portraits) and make-booth-prompts.js (booth views).

const STYLE = 'Head-and-shoulders portrait, facing the camera straight on, eyes level with the viewer, neutral or near-neutral expression suitable for a passport photograph. Plain flat warm-grey background with no scenery. Soft, even, slightly overcast light. Painted illustration style with visible brushwork, muted early-1980s colour palette, subtle film grain. Clothing of a fictional Central or Eastern European country in 1982. Square 1:1 composition, subject centred, top of head and both shoulders fully in frame, eyes on the upper third line.';
const NEGATIVE = 'text, lettering, watermark, signature, logos, real national flags, real military or police insignia, real political symbols, modern clothing, smartphones, headphones, sunglasses, heavy makeup, exaggerated expressions, tilted head, profile view, cropped head or shoulders, busy or outdoor background, multiple people, frames or borders.';

const ENTRANTS = [
  { file: 'v_ilse_marek.png', name: 'Ilse Marek', meta: 'Corvennan citizen · woman · 30', role: 'First entrant of Day 1, coming home from her sister\'s in Brenna. Papers in order.',
    prompt: 'A 30-year-old woman, a citizen of the fictional republic of Corvenna. Light-medium skin with warm undertones, medium-brown hair pulled back into a neat low bun, a few loose strands, calm and slightly tired eyes, no makeup. She wears a plain brown wool coat buttoned over a cream collared blouse. Quiet, relieved to be nearly home.' },
  { file: 'v_tomas_reyl.png', name: 'Tomas Reyl', meta: 'Oskarian · man · 37', role: 'Cloth merchant who travels to Halvost every spring. Brusque, impatient. Papers in order.',
    prompt: 'A 37-year-old man from the fictional nation of Oskaria, a travelling cloth merchant. Medium tan skin, short dark-brown hair, a full, well-trimmed dark beard, sharp impatient eyes. He wears a heavy slate-blue wool overcoat with the collar of a crisp off-white shirt showing. Confident, a little brusque, a man who is always late for a meeting.' },
  { file: 'v_anika_sorvald.png', name: 'Anika Sorvald', meta: 'Velsundi · woman · 20', role: 'Music student starting at the conservatory in Halvost. Her passport has expired.',
    prompt: 'A 20-year-old woman from the fictional nation of Velsund, a music student. Fair skin with rosy cheeks, long straight golden-blonde hair over her shoulders, thin round wire-rimmed glasses, bright hopeful eyes. She wears a rust-red wool coat over an off-white knitted collar. Eager and friendly, the faintest hint of a smile.' },
  { file: 'v_mikel_arnsen.png', name: 'Mikel Arnsen', meta: 'Dravish · man · 24', role: 'Quarry worker heading for Ostrel. His name is spelled differently on his declaration.',
    prompt: 'A 24-year-old man from the fictional nation of Dravenmark, a quarry labourer. Lightly tanned, weathered skin, short light-brown hair under a grey flat wool cap, broad shoulders, a cocky half-smile. He wears a worn olive-grey canvas work jacket over a beige collarless shirt. Cheerful, careless, the kind of man who blames the clerk.' },
  { file: 'v_odessa_kain.png', name: 'Odessa Kain', meta: 'Kaltrini · woman · 68', role: 'Grandmother travelling to her grandson\'s wedding in Brenna. Papers in order.',
    prompt: 'A 68-year-old woman from the fictional nation of Kaltrin, a grandmother. Deep brown skin, a kind and deeply lined face, white hair mostly covered by a patterned dark wool headscarf tied under the chin. She wears a dark bottle-green coat with an ochre embroidered collar and a small round brooch. Warm, patient, stubborn.' },
  { file: 'v_piotr_halden.png', name: 'Piotr Halden', meta: 'Corvennan citizen · man · 32', role: 'Last entrant of Day 1, off the last bus from the east. Papers in order.',
    prompt: 'A 32-year-old man, a citizen of the fictional republic of Corvenna. Light skin, short dark-brown hair slightly messy, a day of stubble, tired eyes after a long bus journey. He wears a brown corduroy jacket over a pale grey shirt, collar a little rumpled. Weary but polite, keen to get home before dark.' },
];

const CAST = [
  { file: 'c_radim_kessler.png', name: 'Captain Radim Kessler', meta: 'Corvennan · man · 52', role: 'Commander of Checkpoint 9 and your supervisor. Follows the rules to the letter and expects you to.',
    prompt: 'A 52-year-old man, a border service captain of the fictional republic of Corvenna. Light skin, grey crew-cut hair, heavy jaw, deep lines on the forehead, stern unblinking eyes. He wears a high-collared olive-drab officer\'s tunic with plain unmarked epaulettes and no badges. Strict, tired of excuses, not unkind.' },
  { file: 'c_jarek_dusek.png', name: 'Officer Jarek Dusek', meta: 'Corvennan · man · 28', role: 'Works the booth next to yours. Friendly, short of money, tempted by bribes.',
    prompt: 'A 28-year-old man, a junior border guard of the fictional republic of Corvenna. Light-medium skin, short sandy hair under a peaked olive-green guard\'s cap with a plain unmarked band, an easy lopsided grin. He wears an olive-green uniform jacket with no insignia over a khaki shirt and dark tie. Likeable, restless, a little reckless.' },
  { file: 'c_ruth_vlach.png', name: 'Inspector Ruth Vlach', meta: 'Corvennan · woman · 45', role: 'Officer of the state security directorate. Watches the checkpoint and asks you questions.',
    prompt: 'A 45-year-old woman, a state security inspector in the fictional republic of Corvenna. Pale skin, sharp jaw-length dark bob with a straight fringe, thin lips, unreadable grey eyes. She wears a charcoal wool coat with a high collar over a black roll-neck and a small plain round enamel pin with no symbol. Composed, cold, missing nothing.' },
  { file: 'c_vera_novak.png', name: 'Vera Novak', meta: 'Corvennan · woman · 34', role: 'A nurse linked to the reform movement. Will ask you to let certain people through.',
    prompt: 'A 34-year-old woman, a hospital nurse in the fictional republic of Corvenna. Medium skin, practical short dark curly hair, determined dark eyes with tired shadows beneath. She wears a navy nurse\'s cape fastened at the throat over a grey cotton uniform dress with a white collar. Earnest, brave, carrying a secret.' },
  { file: 'c_gleb_rasko.png', name: 'Gleb Rasko', meta: 'Oskarian · man · 50', role: 'A trader and smuggler who crosses often and offers "gifts" to cooperative officers.',
    prompt: 'A 50-year-old man from the fictional nation of Oskaria, a trader and smuggler. Ruddy medium skin, heavy-set, thinning slicked-back black hair, thick moustache, one gold tooth showing in a sly smile. He wears a dark brown overcoat with a thick fur collar over a patterned silk scarf. Charming, calculating, generous when it suits him.' },
  { file: 'c_hedda_lindqvist.png', name: 'Hedda Lindqvist', meta: 'Velsundi · woman · 39', role: 'A foreign journalist reporting on conditions at the border.',
    prompt: 'A 39-year-old woman from the fictional nation of Velsund, a foreign newspaper journalist. Fair skin with freckles, ash-blonde hair tied back loosely, alert pale-blue eyes, no glasses. She wears a beige belted trench coat with the collar turned up and a leather camera strap crossing one shoulder. Curious, sceptical, quietly persistent.' },
  { file: 'c_arman_sevanyan.png', name: 'Arman Sevanyan', meta: 'Kaltrini · man · 41', role: 'A father fleeing Kaltrin with his daughter. His papers may not be enough.',
    prompt: 'A 41-year-old man from the fictional nation of Kaltrin, a schoolteacher fleeing with his family. Medium-brown skin, short black hair greying at the temples, several days of stubble, anxious dark eyes. He wears a frayed brown tweed jacket over a mustard knitted pullover and an open-collared shirt. Exhausted, polite, desperate to hide his fear.' },
  { file: 'c_nare_sevanyan.png', name: 'Nare Sevanyan', meta: 'Kaltrini · girl · 8', role: 'Arman\'s daughter, travelling with him.',
    prompt: 'An 8-year-old girl from the fictional nation of Kaltrin. Medium-brown skin, dark hair in two neat plaits, large serious dark eyes, a small solemn mouth. She wears a red knitted cardigan, buttoned up, over a white blouse with a rounded collar. Shy, watchful, holding very still.' },
  { file: 'c_otmar_vogt.png', name: 'Otmar Vogt', meta: 'Dravish · man · 60', role: '"The Clerk": the document forger behind many of the fakes you will catch, or miss.',
    prompt: 'A 60-year-old man from the fictional nation of Dravenmark, a retired print-shop clerk and secret forger. Pale, thin skin, a narrow face, neatly combed thin white hair, small half-moon reading spectacles low on his nose, an amused knowing look. He wears a grey knitted cardigan over a white shirt and a narrow dark-green tie. Meticulous, gentle-mannered, dangerous.' },
];

const HOUSEHOLD = [
  { file: 'h_lena.png', name: 'Lena', meta: 'Corvennan · woman · 33', role: 'Your partner. Keeps the household running and worries about money.',
    prompt: 'A 33-year-old woman, a citizen of the fictional republic of Corvenna. Light-medium skin, shoulder-length chestnut hair held back with a plain clip, warm hazel eyes, faint worry lines. She wears a moss-green hand-knitted cardigan over a cream blouse. Gentle, practical, stronger than she looks.' },
  { file: 'h_tomek.png', name: 'Tomek', meta: 'Corvennan · boy · 9', role: 'Your son. Needs food, warmth and school things.',
    prompt: 'A 9-year-old boy, a citizen of the fictional republic of Corvenna. Light skin, unruly light-brown hair, a gap-toothed hopeful expression, freckles. He wears a navy-blue wool school jumper over a white shirt collar. Bright, cheeky, a little thin.' },
  { file: 'h_agata.png', name: 'Agata', meta: 'Corvennan · woman · 71', role: 'Your mother-in-law. Lives with you and needs medicine.',
    prompt: 'A 71-year-old woman, a citizen of the fictional republic of Corvenna. Pale, papery skin, silver hair in a tidy bun, pale tired eyes, a dignified expression despite illness. She wears a black knitted shawl over a dark plum dress with a lace collar. Frail, proud, sharp-tongued.' },
];

// generated entrants: nation × sex × age band
const NATIONS = [
  ['cor', 'Corvenna', 'the fictional republic of Corvenna', 'wool coats and cardigans in brown, rust and cream, burgundy scarves, flat caps for men'],
  ['osk', 'Oskaria', 'the fictional nation of Oskaria', 'heavy slate-blue and grey overcoats, fur-trimmed collars, knitted hats in winter colours'],
  ['vel', 'Velsund', 'the fictional nation of Velsund', 'forest-green outdoor jackets and cream knitted jumpers with a patterned yoke'],
  ['dra', 'Dravenmark', 'the fictional nation of Dravenmark', 'tailored charcoal and plum-grey jackets, felt hats for men, neat collared blouses for women'],
  ['kal', 'Kaltrin', 'the fictional nation of Kaltrin', 'ochre, mustard and deep-green clothing with embroidered collars, patterned headscarves for some older women'],
];
const BANDS = [
  ['young', '18–35', (noun, pron) => `a ${noun} in ${pron} mid-twenties`],
  ['middle', '36–59', noun => `a middle-aged ${noun} of about 47`],
  ['older', '60–80', noun => `an elderly ${noun} of about 70`],
];
const SKIN = ['light skin', 'light-medium skin', 'medium tan skin', 'medium-brown skin', 'deep brown skin'];
const HAIR = {
  young: { m: 'short dark hair', f: 'long wavy brown hair worn loose' },
  middle: { m: 'short hair greying at the temples, clean-shaven', f: 'shoulder-length hair pinned back' },
  older: { m: 'thinning white hair and a grey moustache', f: 'grey hair in a low bun' },
};
const POOL = [];
NATIONS.forEach(([code, name, phrase, clothes], ni) => {
  BANDS.forEach(([band, range, ageText], bi) => {
    for (const [sex, noun, pron] of [['m', 'man', 'his'], ['f', 'woman', 'her']]) {
      const skin = SKIN[(ni + bi * 2 + (sex === 'f' ? 3 : 0)) % SKIN.length];
      POOL.push({
        file: `pool_${code}_${sex}_${band}.png`, nation: name, sex: noun, range,
        prompt: `An ordinary traveller, ${ageText(noun, pron)} from ${phrase}. ${skin[0].toUpperCase() + skin.slice(1)}, ${HAIR[band][sex]}. Everyday clothing typical of ${name}: ${clothes}. A plain, believable face that could belong to anyone in a queue at a border crossing; patient, faintly wary expression.`,
      });
    }
  });
});

module.exports = { STYLE, NEGATIVE, ENTRANTS, CAST, HOUSEHOLD, POOL };

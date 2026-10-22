// What people look like: face traits (drawn by portrait.js, compared by the identity rule) and the
// clothing catalogue (drawn, described, and checked by the dress-code rule through its tags).

export const SKIN = { s1: '#f6d7c3', s2: '#e9b994', s3: '#c98e66', s4: '#a26a45', s5: '#7a4a2e', s6: '#4f2f1f' };
export const FACE_SHAPES = ['oval', 'round', 'square', 'long', 'heart'];
export const NOSES = ['button', 'straight', 'broad', 'hooked'];
export const BROWS = ['thin', 'thick', 'arched', 'straight'];
export const EYES = ['brown', 'blue', 'green', 'hazel', 'grey'];
export const EYE_HEX = { brown: '#6b3e1f', blue: '#3f7fd1', green: '#3f9a52', hazel: '#9a7a2e', grey: '#8a94a0' };
export const HAIR = ['short', 'buzz', 'long', 'bob', 'bun', 'curly', 'afro', 'mohawk', 'ponytail', 'bald', 'sidepart', 'braids'];
export const HAIR_COLORS = { black: '#1d1716', brown: '#5a3a24', blonde: '#d8b45a', red: '#a8442a', grey: '#9a9a9a', white: '#e8e4dc', pink: '#e86aa8', blue: '#4a7ad8' };
export const FACIAL = ['none', 'stubble', 'beard', 'mustache'];

// The traits a photo must share with the person. Hair, facial hair and glasses can change.
export const IDENTITY_TRAITS = ['skin', 'faceShape', 'nose', 'brows', 'eyes'];
// A genuine photo is an exact likeness: any of these differing means the photo isn't them.
export const PHOTO_TRAITS = [...IDENTITY_TRAITS, 'hair', 'hairColor', 'facial', 'glasses'];
export const faceKey = f => IDENTITY_TRAITS.map(k => f[k]).join('|');
export const sameFace = (a, b) => IDENTITY_TRAITS.every(k => a[k] === b[k]);

export const TRAIT_LABELS = {
  skin: 'skin tone', faceShape: 'face shape', nose: 'nose', brows: 'eyebrows', eyes: 'eye colour',
  hair: 'hairstyle', hairColor: 'hair colour', facial: 'facial hair', glasses: 'glasses',
};

export const OUTFIT = {
  // tops
  'tshirt-band': { slot: 'top', label: 'band T-shirt', tags: ['tshirt'], draw: 'tee', color: '#2a2a2e' },
  'tshirt-plain': { slot: 'top', label: 'plain T-shirt', tags: ['tshirt'], draw: 'tee', color: '#e9e4d8' },
  'tshirt-graphic': { slot: 'top', label: 'graphic T-shirt', tags: ['tshirt'], draw: 'tee', color: '#d65a3a' },
  hoodie: { slot: 'top', label: 'zip hoodie', tags: ['sportswear'], draw: 'hoodie', color: '#5b6b7a' },
  jersey: { slot: 'top', label: 'football jersey', tags: ['sportswear'], draw: 'jersey', color: '#2f6fd0' },
  'track-jacket': { slot: 'top', label: 'track jacket', tags: ['sportswear'], draw: 'track', color: '#1f8a5a' },
  tanktop: { slot: 'top', label: 'tank top', tags: ['tanktop'], draw: 'tank', color: '#f0f0f0' },
  blazer: { slot: 'top', label: 'blazer', tags: ['jacket', 'formal'], draw: 'blazer', color: '#2c2f45' },
  suit: { slot: 'top', label: 'suit and tie', tags: ['jacket', 'formal'], draw: 'suit', color: '#22252e' },
  'dress-cocktail': { slot: 'top', label: 'cocktail dress', tags: ['dress', 'formal'], draw: 'dress', color: '#b0244a' },
  'dress-sequin': { slot: 'top', label: 'sequinned dress', tags: ['dress', 'formal'], draw: 'dress', color: '#c9a646' },
  'leather-jacket': { slot: 'top', label: 'leather jacket', tags: ['jacket'], draw: 'leather', color: '#1c1a1d' },
  'denim-jacket': { slot: 'top', label: 'denim jacket', tags: ['jacket', 'denim'], draw: 'leather', color: '#4a6c9a' },
  sweater: { slot: 'top', label: 'knit sweater', tags: [], draw: 'sweater', color: '#8a5a3a' },
  'collared-shirt': { slot: 'top', label: 'collared shirt', tags: ['formal'], draw: 'shirt', color: '#dfe7f0' },
  turtleneck: { slot: 'top', label: 'turtleneck', tags: [], draw: 'turtle', color: '#3a2a3e' },
  raincoat: { slot: 'top', label: 'yellow raincoat', tags: [], draw: 'hoodie', color: '#e8c23a' },
  'silk-blouse': { slot: 'top', label: 'silk blouse', tags: ['formal'], draw: 'shirt', color: '#e6c8d8' },
  // bottoms
  jeans: { slot: 'bottom', label: 'jeans', tags: ['denim'] },
  'ripped-jeans': { slot: 'bottom', label: 'ripped jeans', tags: ['denim'] },
  trousers: { slot: 'bottom', label: 'chinos', tags: [] },
  tailored: { slot: 'bottom', label: 'tailored trousers', tags: ['formal'] },
  skirt: { slot: 'bottom', label: 'pleated skirt', tags: [] },
  joggers: { slot: 'bottom', label: 'joggers', tags: ['sportswear'] },
  shorts: { slot: 'bottom', label: 'cargo shorts', tags: ['shorts'] },
  'leather-trousers': { slot: 'bottom', label: 'leather trousers', tags: [] },
  // shoes
  'sneakers-white': { slot: 'shoes', label: 'white sneakers', tags: ['sneakers'] },
  'sneakers-designer': { slot: 'shoes', label: 'designer sneakers', tags: ['sneakers'] },
  'running-shoes': { slot: 'shoes', label: 'running shoes', tags: ['sneakers', 'sportswear'] },
  'combat-boots': { slot: 'shoes', label: 'combat boots', tags: [] },
  'chelsea-boots': { slot: 'shoes', label: 'chelsea boots', tags: [] },
  heels: { slot: 'shoes', label: 'heels', tags: [] },
  loafers: { slot: 'shoes', label: 'loafers', tags: [] },
  oxfords: { slot: 'shoes', label: 'oxford shoes', tags: [] },
  flipflops: { slot: 'shoes', label: 'flip-flops', tags: ['flipflops'] },
  'platform-boots': { slot: 'shoes', label: 'platform boots', tags: [] },
  // head
  cap: { slot: 'head', label: 'baseball cap', tags: ['hat'], draw: 'cap' },
  beanie: { slot: 'head', label: 'beanie', tags: ['hat'], draw: 'beanie' },
  fedora: { slot: 'head', label: 'fedora', tags: ['hat'], draw: 'fedora' },
};

export const OUTFIT_BY_SLOT = slot => Object.keys(OUTFIT).filter(k => OUTFIT[k].slot === slot);

// Dress-code tags the rules can ban, with how the rulebook names them.
export const DRESS_TAGS = {
  sneakers: 'Sneakers / trainers',
  sportswear: 'Sportswear (hoodies, jerseys, tracksuits, joggers)',
  hat: 'Hats and caps',
  tanktop: 'Tank tops',
  flipflops: 'Flip-flops',
  shorts: 'Shorts',
  denim: 'Denim',
  tshirt: 'T-shirts',
};

export const outfitTags = items => [...new Set(items.flatMap(i => OUTFIT[i]?.tags ?? []))];

export function describeOutfit(items) {
  const order = ['head', 'top', 'bottom', 'shoes'];
  return order.flatMap(s => items.filter(i => OUTFIT[i]?.slot === s).map(i => OUTFIT[i].label));
}

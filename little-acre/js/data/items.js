// The item catalogue. Crops, seeds, fish, forage and preserves are generated from their own data
// files; everything else is listed here. Fields: `cat` (category shown in menus and used by
// quests), `price` (what shipping one pays), `energy` (eating restores this; absent = inedible),
// `tags` (used by recipes and gift tastes), `place` (an OBJECTS type it can be placed as),
// `icon` (shape + colours for the procedural pixel icon), `desc`.

import { CROPS, seedId } from './crops.js';
import { FISH } from './fish.js';
import { FORAGE } from './forage.js';

const TOOLS = [
  { id: 'hoe', name: 'Hoe', desc: 'Tills grass into soil you can plant in.' },
  { id: 'can', name: 'Watering Can', desc: 'Waters soil. Refill it at the pond, a stream or the well.' },
  { id: 'axe', name: 'Axe', desc: 'Chops twigs, trees and (once upgraded) stumps.' },
  { id: 'pickaxe', name: 'Pickaxe', desc: 'Breaks stones and ore. Also picks up things you placed.' },
  { id: 'scythe', name: 'Scythe', desc: 'Cuts weeds and harvests ripe crops.' },
  { id: 'rod', name: 'Fishing Rod', desc: 'Cast into water, wait for a bite, then reel it in.' },
].map(t => ({ ...t, cat: 'tool', price: 0, tool: true, icon: { shape: 'tool', tool: t.id } }));

const RESOURCES = [
  { id: 'wood', name: 'Wood', price: 2, icon: { shape: 'log', c1: '#a8703a', c2: '#e0b070' }, desc: 'A sturdy building material.' },
  { id: 'hardwood', name: 'Hardwood', price: 15, icon: { shape: 'log', c1: '#6a3e1e', c2: '#b07a4a' }, desc: 'Dense wood from old stumps.' },
  { id: 'stone', name: 'Stone', price: 2, icon: { shape: 'stone', c1: '#8a8a90', c2: '#b8b8c0' }, desc: 'Plain grey stone.' },
  { id: 'fiber', name: 'Fiber', price: 1, icon: { shape: 'leaf', c1: '#6aa84a', c2: '#3a7a2a' }, desc: 'Stringy plant fiber from weeds.' },
  { id: 'sap', name: 'Sap', price: 4, icon: { shape: 'drop', c1: '#d88a2a', c2: '#ffcf6a' }, desc: 'Sticky tree sap.' },
  { id: 'acorn', name: 'Acorn', price: 5, icon: { shape: 'seed', c1: '#8a5a2a', c2: '#c09060' }, place: 'sapling', desc: 'Plant it on grass and it grows into a tree.' },
  { id: 'coal', name: 'Coal', price: 15, icon: { shape: 'ore', c1: '#2a2a30', c2: '#5a5a66' }, desc: 'Fuel for the furnace.' },
  { id: 'copper_ore', name: 'Copper Ore', price: 5, icon: { shape: 'ore', c1: '#7a6a60', c2: '#e0884a' }, tags: ['mineral'], desc: 'Smelt five with a coal for a copper bar.' },
  { id: 'iron_ore', name: 'Iron Ore', price: 10, icon: { shape: 'ore', c1: '#6a6a70', c2: '#d8d0c8' }, tags: ['mineral'], desc: 'Smelt five with a coal for an iron bar.' },
  { id: 'copper_bar', name: 'Copper Bar', price: 60, icon: { shape: 'bar', c1: '#d0703a', c2: '#ffb07a' }, desc: 'Used for tool upgrades and sprinklers.' },
  { id: 'iron_bar', name: 'Iron Bar', price: 120, icon: { shape: 'bar', c1: '#a0a4aa', c2: '#e8ecf0' }, desc: 'Used for tool upgrades and sprinklers.' },
  { id: 'quartz', name: 'Quartz', price: 25, icon: { shape: 'gem', c1: '#e8f0f8', c2: '#ffffff' }, tags: ['mineral', 'gem'], desc: 'A clear crystal.' },
  { id: 'amethyst', name: 'Amethyst', price: 100, icon: { shape: 'gem', c1: '#9a4ad8', c2: '#d8a8ff' }, tags: ['mineral', 'gem'], desc: 'A purple gemstone.' },
  { id: 'topaz', name: 'Topaz', price: 80, icon: { shape: 'gem', c1: '#e8a82a', c2: '#ffe08a' }, tags: ['mineral', 'gem'], desc: 'A golden gemstone.' },
  { id: 'seaweed', name: 'Lakeweed', price: 20, icon: { shape: 'leaf', c1: '#3a7a5a', c2: '#2a5a3a' }, desc: 'Slimy, but somebody might want it.' },
  { id: 'driftwood', name: 'Driftwood', price: 5, icon: { shape: 'log', c1: '#a09080', c2: '#d0c4b4' }, desc: 'Smooth, sun-bleached wood.' },
].map(r => ({ cat: 'resource', ...r }));

const GOODS = [
  { id: 'flour', name: 'Flour', cat: 'ingredient', price: 10, icon: { shape: 'sack', c1: '#f0e8d8', c2: '#c8b898' }, desc: 'For baking.' },
  { id: 'bread', name: 'Bread', cat: 'food', price: 40, energy: 30, icon: { shape: 'bread', c1: '#d8a050', c2: '#f0d090' }, desc: 'A crusty loaf. Restores energy.' },
  { id: 'trailmix', name: 'Trail Mix', cat: 'food', price: 30, energy: 35, icon: { shape: 'sack', c1: '#a0703a', c2: '#e0b070' }, desc: 'Acorns, fiber and good intentions.' },
  { id: 'veggiesoup', name: 'Veggie Soup', cat: 'food', price: 150, energy: 70, icon: { shape: 'bowl', c1: '#e0a040', c2: '#f4f0e8' }, tags: ['cooked'], desc: 'Hearty and warm.' },
  { id: 'berrytart', name: 'Berry Tart', cat: 'food', price: 260, energy: 60, icon: { shape: 'pie', c1: '#4a62d8', c2: '#e0b070' }, tags: ['cooked', 'sweet'], desc: 'Sweet and a little sour.' },
  { id: 'fishstew', name: 'Fish Stew', cat: 'food', price: 220, energy: 90, icon: { shape: 'bowl', c1: '#e05a3a', c2: '#f4f0e8' }, tags: ['cooked'], desc: 'Tomato broth and the catch of the day.' },
  { id: 'pumpkinpie', name: 'Pumpkin Pie', cat: 'food', price: 420, energy: 80, icon: { shape: 'pie', c1: '#f08a1c', c2: '#e0b070' }, tags: ['cooked', 'sweet'], desc: 'The smell of autumn.' },
  { id: 'mushroomtoast', name: 'Mushroom Toast', cat: 'food', price: 200, energy: 65, icon: { shape: 'bread', c1: '#a0784a', c2: '#f0d090' }, tags: ['cooked'], desc: 'Butter, garlic, forest.' },
  { id: 'cornchowder', name: 'Corn Chowder', cat: 'food', price: 230, energy: 75, icon: { shape: 'bowl', c1: '#f5d33f', c2: '#f4f0e8' }, tags: ['cooked'], desc: 'Creamy and golden.' },
  { id: 'roastveg', name: 'Roasted Roots', cat: 'food', price: 330, energy: 85, icon: { shape: 'bowl', c1: '#a3204a', c2: '#c45a2a' }, tags: ['cooked'], desc: 'Beet, yam and eggplant, charred just right.' },
  { id: 'winterstew', name: 'Winter Stew', cat: 'food', price: 260, energy: 90, icon: { shape: 'bowl', c1: '#8a5a3a', c2: '#e9f4ff' }, tags: ['cooked'], desc: 'Keeps the frost out of your bones.' },
  { id: 'fertilizer', name: 'Growth Mix', cat: 'farming', price: 4, icon: { shape: 'sack', c1: '#6a4a2a', c2: '#9ad04a' }, soil: true, desc: 'Use on tilled soil before planting: the crop grows a quarter faster.' },
  { id: 'bait', name: 'Bait', cat: 'fishing', price: 1, icon: { shape: 'drop', c1: '#8a4a3a', c2: '#c07a5a' }, desc: 'Kept in your bag, each cast uses one and fish bite twice as fast.' },
];

const PLACEABLES = [
  { id: 'chest', name: 'Chest', price: 0, icon: { shape: 'chest', c1: '#a8703a', c2: '#e0c040' }, desc: 'Place it to store 24 stacks of items.' },
  { id: 'scarecrow', name: 'Scarecrow', price: 0, icon: { shape: 'scarecrow', c1: '#c8a050', c2: '#5a7ac8' }, desc: 'Keeps crows off crops within 7 tiles.' },
  { id: 'sprinkler', name: 'Sprinkler', price: 0, icon: { shape: 'sprinkler', c1: '#c07a3a', c2: '#6ac0f0' }, desc: 'Waters the 4 tiles next to it every morning.' },
  { id: 'qsprinkler', name: 'Quality Sprinkler', price: 0, icon: { shape: 'sprinkler', c1: '#c8ccd2', c2: '#6ac0f0' }, desc: 'Waters the 8 tiles around it every morning.' },
  { id: 'furnace', name: 'Furnace', price: 0, icon: { shape: 'furnace', c1: '#8a8a90', c2: '#ff8a2a' }, desc: 'Smelts 5 ore and 1 coal into a bar.' },
  { id: 'jar', name: 'Preserves Jar', price: 0, icon: { shape: 'jar', c1: '#a8d0e0', c2: '#e05a3a' }, desc: 'Turns a crop into jam or pickles overnight. Worth far more.' },
  { id: 'lamp', name: 'Lamp Post', price: 0, icon: { shape: 'lamp', c1: '#3a3a40', c2: '#ffe08a' }, desc: 'Lights up the night.' },
  { id: 'bench', name: 'Bench', price: 0, icon: { shape: 'bench', c1: '#a8703a', c2: '#6a4020' }, desc: 'A place to sit and admire the crops.' },
  { id: 'planter', name: 'Flower Planter', price: 0, icon: { shape: 'planter', c1: '#a8703a', c2: '#ff7ab0' }, desc: 'A box of cheerful flowers.' },
  { id: 'gnome', name: 'Garden Gnome', price: 0, icon: { shape: 'gnome', c1: '#d83a3a', c2: '#3a7ac8' }, desc: 'He sees everything.' },
  { id: 'birdbath', name: 'Birdbath', price: 0, icon: { shape: 'birdbath', c1: '#b8b8c0', c2: '#6ac0f0' }, desc: 'The sparrows will thank you.' },
  { id: 'fence', name: 'Wood Fence', price: 0, icon: { shape: 'fence', c1: '#c8a070', c2: '#8a6030' }, desc: 'Joins up with neighbouring fences.' },
  { id: 'ribbon', name: 'Blue Ribbon Stand', price: 0, icon: { shape: 'ribbon', c1: '#3a6ad8', c2: '#ffd34d' }, desc: 'Proof you grew the best in town.' },
  { id: 'lantern', name: 'Paper Lantern', price: 0, icon: { shape: 'lamp', c1: '#e05a3a', c2: '#ffd08a' }, desc: 'A souvenir of Midsummer Lanterns. Glows at night.' },
  { id: 'wpath', name: 'Wood Path', price: 0, icon: { shape: 'tile', c1: '#b0804a', c2: '#8a5a2a' }, desc: 'A floor tile. Walk on it; nothing grows through it.' },
  { id: 'spath', name: 'Stone Path', price: 0, icon: { shape: 'tile', c1: '#a8a8b0', c2: '#7a7a84' }, desc: 'A floor tile. Walk on it; nothing grows through it.' },
].map(p => ({ cat: p.id === 'wpath' || p.id === 'spath' || ['lamp', 'bench', 'planter', 'gnome', 'birdbath', 'fence', 'ribbon', 'lantern'].includes(p.id) ? 'decor' : 'crafted', place: p.id, ...p }));

const preserve = (c, kind) => ({
  id: `${kind}_${c.id}`, name: kind === 'jam' ? `${c.name} Jam` : `Pickled ${c.name}`, cat: 'artisan',
  price: c.price * 2 + 50, tags: ['artisan', kind], icon: { shape: 'jar', c1: '#c8e0e8', c2: c.color }, from: c.id,
  desc: kind === 'jam' ? `Jam made from ${c.name.toLowerCase()}.` : `${c.name} preserved in brine.`,
});

const crops = CROPS.flatMap(c => [
  { id: c.id, name: c.name, cat: 'crop', price: c.price, energy: Math.max(8, Math.round(c.price / 4)), tags: [c.fruit ? 'fruit' : 'vegetable'], icon: { shape: c.shape, c1: c.color, c2: c.color2, leaf: c.leaf }, desc: `Grows in ${c.seasons.map(s => ['spring', 'summer', 'fall', 'winter'][s]).join(' and ')}.` },
  { id: seedId(c.id), name: `${c.name} Seeds`, cat: 'seed', price: Math.floor(c.seedPrice / 2), crop: c.id, icon: { shape: 'packet', c1: c.color, c2: c.leaf }, desc: `${c.days} days to grow${c.regrow ? `, then every ${c.regrow} days` : ''}. Plant in ${c.seasons.map(s => ['spring', 'summer', 'fall', 'winter'][s]).join(' or ')}.` },
  preserve(c, c.fruit ? 'jam' : 'pickle'),
]);

const fish = FISH.map(f => ({ id: f.id, name: f.name, cat: 'fish', price: f.price, energy: Math.round(f.price / 4), tags: ['fish'], icon: { shape: 'fish', c1: f.color, c2: f.color2 }, desc: 'Caught fresh.' }));
const forage = FORAGE.map(f => ({ id: f.id, name: f.name, cat: 'forage', price: f.price, energy: f.energy, tags: ['forage', ...(['morel', 'chanterelle'].includes(f.id) ? ['mushroom'] : []), ...(['spiceberry', 'blackberry'].includes(f.id) ? ['fruit'] : [])], icon: { shape: f.id === 'clam' ? 'shell' : 'flower', c1: f.color, c2: f.color2 }, desc: 'Found growing wild.' }));

export const ITEMS = [...TOOLS, ...crops, ...fish, ...forage, ...RESOURCES, ...GOODS, ...PLACEABLES];
export const ITEMS_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const item = id => ITEMS_BY_ID[id];

// Does an item match a recipe / quest token: an item id, `tag:<tag>` or `cat:<category>`?
export function matches(id, token) {
  const it = ITEMS_BY_ID[id];
  if (!it) return false;
  if (token.startsWith('tag:')) return (it.tags || []).includes(token.slice(4));
  if (token.startsWith('cat:')) return it.cat === token.slice(4);
  return id === token;
}

export const CATEGORY_NAMES = {
  tool: 'Tool', seed: 'Seeds', crop: 'Crop', fish: 'Fish', forage: 'Forage', resource: 'Resource', ingredient: 'Ingredient',
  food: 'Food', farming: 'Farming', fishing: 'Fishing', crafted: 'Crafted', decor: 'Decoration', artisan: 'Artisan Good',
};

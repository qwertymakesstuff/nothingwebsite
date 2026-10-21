// The seven rarity tiers, lowest first. `rank` orders them everywhere.

export const RARITIES = [
  { id: 'consumer', name: 'Consumer', color: '#a9b3c1' },
  { id: 'industrial', name: 'Industrial', color: '#5e9ce6' },
  { id: 'milspec', name: 'Mil-Spec', color: '#4b69ff' },
  { id: 'restricted', name: 'Restricted', color: '#8b4dff' },
  { id: 'classified', name: 'Classified', color: '#d43ce9' },
  { id: 'covert', name: 'Covert', color: '#ee4b4b' },
  { id: 'extraordinary', name: 'Extraordinary', color: '#f5c431' },
].map((r, rank) => Object.freeze({ ...r, rank }));

export const RARITY_BY_ID = Object.freeze(Object.fromEntries(RARITIES.map(r => [r.id, r])));

export function rarityRank(id) {
  return RARITY_BY_ID[id] ? RARITY_BY_ID[id].rank : -1;
}

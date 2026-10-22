// Story quests. A quest becomes active when its `start` condition holds (checked after every
// game event). Objectives: `clear` debris, `plant`, `harvest`, `ship`, `catch`, `craft` and
// `talk` count events from the moment the quest starts; `deliver` is handed over by talking to
// `npc` while carrying the items. `what` is an item id, a `cat:`/`tag:` token, or absent (any).
// `reward` = { money, items: [[id, n]], friendship: { npc: points } }.

export const QUESTS = [
  {
    id: 'fresh-start', title: 'A Fresh Start', from: 'Aunt Hazel\'s letter',
    text: 'The old farm is buried in weeds, stones and twigs. Clear 15 pieces of debris with your tools.',
    start: { type: 'start' }, goal: { type: 'clear', n: 15 }, reward: { money: 200 },
  },
  {
    id: 'first-crop', title: 'Something Green', from: 'Aunt Hazel\'s letter',
    text: 'Till some soil with the hoe, plant the turnip seeds, water them every day, and harvest your first crop.',
    start: { type: 'start' }, goal: { type: 'harvest', n: 1 }, reward: { money: 150, items: [['seed_potato', 5]] },
  },
  {
    id: 'shipping', title: 'Open for Business', from: 'Mayor Odessa',
    text: 'Put crops in the shipping bin by your house. They are sold overnight. Ship 20 items.',
    start: { type: 'quest', id: 'first-crop' }, goal: { type: 'ship', n: 20 }, reward: { money: 300, friendship: { odessa: 40 } },
  },
  {
    id: 'neighbours', title: 'Say Hello', from: 'Mayor Odessa',
    text: 'Bramblewick is small and everybody wants to meet you. Talk to Pip, Bram, Mabel, Juni, Teodor and the mayor.',
    start: { type: 'start' }, goal: { type: 'talk', npcs: ['pip', 'bram', 'mabel', 'juni', 'teodor', 'odessa'] }, reward: { money: 150, items: [['bread', 3]] },
  },
  {
    id: 'first-fish', title: 'Gone Fishing', from: 'Old Teodor',
    text: 'Teodor gave you his spare rod. Face water, use the rod, wait for the "!" and press again, then keep the green bar on the fish. Catch one fish.',
    start: { type: 'met', npc: 'teodor' }, goal: { type: 'catch', n: 1 }, reward: { money: 100, items: [['bait', 10]], friendship: { teodor: 40 } },
  },
  {
    id: 'bram-ore', title: 'Fuel for the Forge', from: 'Bram',
    text: 'Bram needs copper ore for a commission. Break copper nodes at the Old Quarry (east of town) and bring him 10 Copper Ore.',
    start: { type: 'met', npc: 'bram' }, goal: { type: 'deliver', npc: 'bram', what: 'copper_ore', n: 10 }, reward: { money: 300, friendship: { bram: 60 } },
  },
  {
    id: 'mabel-wood', title: 'Timber!', from: 'Mabel',
    text: 'Mabel is short on lumber. Chop trees and twigs and bring her 60 Wood.',
    start: { type: 'met', npc: 'mabel' }, goal: { type: 'deliver', npc: 'mabel', what: 'wood', n: 60 }, reward: { money: 350, items: [['wpath', 20]], friendship: { mabel: 60 } },
  },
  {
    id: 'juni-forage', title: 'Field Notes', from: 'Juni',
    text: 'Juni is cataloguing wild plants. Bring her any 5 forage items from Whisperwood, the lake or town.',
    start: { type: 'met', npc: 'juni' }, goal: { type: 'deliver', npc: 'juni', what: 'cat:forage', n: 5 }, reward: { money: 250, items: [['fertilizer', 10]], friendship: { juni: 60 } },
  },
  {
    id: 'crafty', title: 'Handy', from: 'Mabel',
    text: 'Open the crafting tab (C) and craft a Scarecrow. Place it on the farm to keep crows away from your crops.',
    start: { type: 'quest', id: 'fresh-start' }, goal: { type: 'craft', what: 'scarecrow', n: 1 }, reward: { money: 100, items: [['coal', 3]] },
  },
  {
    id: 'town-pride', title: 'Town Pride', from: 'Mayor Odessa',
    text: 'Show Bramblewick what Little Acre can do. Ship 100 crops in total.',
    start: { type: 'quest', id: 'shipping' }, goal: { type: 'ship', what: 'cat:crop', n: 100 }, reward: { money: 1000, friendship: { odessa: 80 } },
  },
  {
    id: 'upgrade', title: 'Better Tools', from: 'Bram',
    text: 'Smelt copper bars in a furnace and have Bram upgrade any tool to copper.',
    start: { type: 'quest', id: 'bram-ore' }, goal: { type: 'upgrade', n: 1 }, reward: { money: 500, friendship: { bram: 40 } },
  },
];

export const QUESTS_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

// Daily bulletin-board requests: each morning one is posted, picking a villager, then an item
// from the pools available this season. Reward = item price x quantity x multiplier.
export const REQUEST_POOLS = {
  common: ['wood', 'stone', 'fiber', 'copper_ore', 'coal', 'sap'],
  fish: ['bream', 'carp', 'perch', 'chub', 'sunfish'],
};
export const REQUEST_RULES = { days: 2, rewardMultiplier: 3, minReward: 60 };

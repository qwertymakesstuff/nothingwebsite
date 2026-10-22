// Seasonal festivals. On the day, between `from` and `to`, walking onto `map` puts you into the
// festival: villagers gather at `spots`, shops close, and talking to `host` runs the main
// activity (see festival.js). Afterwards the clock jumps to `endsAt` and you are sent home.
// `kind`: 'fair' (festival stall + seed swap), 'show' (enter an item to be judged),
// 'lanterns' (release lanterns, catch a rare fish), 'feast' (secret gift exchange).

const h = t => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };

export const FESTIVALS = [
  {
    id: 'seedling', name: 'Seedling Fair', season: 0, day: 13, map: 'town', from: h('09:00'), to: h('14:00'), endsAt: h('22:00'), kind: 'fair', host: 'odessa',
    desc: 'Spring festival in the square. Strawberry seeds are sold only today, and every villager shares a few seeds.',
    hostLine: 'Welcome to the Seedling Fair! Pip has the fair stall — strawberry seeds, today only. Say hello to everyone; they all brought seeds to swap. Ready to wrap up and head home?',
    swap: { pip: 'seed_turnip', bram: 'seed_potato', mabel: 'seed_snappea', juni: 'seed_cauliflower', teodor: 'seed_potato', odessa: 'seed_cauliflower' },
    spots: { pip: [18, 12], bram: [26, 13], mabel: [16, 17], juni: [23, 11], teodor: [27, 18], odessa: [21, 11] },
  },
  {
    id: 'lanterns', name: 'Midsummer Lanterns', season: 1, day: 20, map: 'lake', from: h('18:00'), to: h('23:00'), endsAt: h('24:00'), kind: 'lanterns', host: 'odessa',
    desc: 'At dusk the whole town gathers at Mirror Lake to set paper lanterns on the water. Some say the Glimmerfin rises to look.',
    hostLine: 'Thank you all for coming. Each year we set a lantern on the water for the year gone by and one for the year to come. Shall we light them?',
    spots: { pip: [16, 12], bram: [25, 12], mabel: [14, 11], juni: [22, 12], teodor: [20, 18], odessa: [20, 11] },
  },
  {
    id: 'harvest', name: 'Harvest Show', season: 2, day: 16, map: 'town', from: h('09:00'), to: h('15:00'), endsAt: h('22:00'), kind: 'show', host: 'odessa',
    desc: 'Bring your best produce or goods to the square. The mayor judges every entry; the top three win prizes.',
    hostLine: 'Welcome to the Harvest Show! Would you like to enter an item? The judging is final, impartial and done by me.',
    rivals: [{ npc: 'bram', item: 'turnip', score: 70 }, { npc: 'pip', item: 'berrytart', score: 260 }, { npc: 'mabel', item: 'pumpkin', score: 320 }],
    prizes: [{ money: 1500, item: 'ribbon' }, { money: 800 }, { money: 400 }],
    spots: { pip: [18, 12], bram: [26, 13], mabel: [16, 17], juni: [23, 11], teodor: [27, 18], odessa: [21, 11] },
  },
  {
    id: 'frostlight', name: 'Frostlight Feast', season: 3, day: 25, map: 'town', from: h('09:00'), to: h('14:00'), endsAt: h('22:00'), kind: 'feast', host: 'odessa',
    desc: 'Winter feast in the square. Everyone draws a secret friend to give a gift to.',
    hostLine: 'Happy Frostlight! Have you given your secret friend their gift? When you\'re ready, we\'ll start the feast.',
    spots: { pip: [18, 12], bram: [26, 13], mabel: [16, 17], juni: [23, 11], teodor: [27, 18], odessa: [21, 11] },
  },
];

export const FESTIVAL_AT = (season, day) => FESTIVALS.find(f => f.season === season && f.day === day) || null;

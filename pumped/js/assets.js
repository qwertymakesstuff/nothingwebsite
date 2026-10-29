// Every tradable asset in PUMPED. All companies and coins are made up.
//
// Behaviour comes from the asset's category (CATS) with per-asset tweaks:
//   volMul   scales volatility        pumpMul / crashMul  scale how often it pumps / crashes
//   driftAdd nudges the long-run fair-value drift per tick (log units)

// Per-tick numbers are in log-price units (0.01 ≈ 1%). A tick is one second of game time.
// fairDrift is the long-run trend: fair value is slowly pulled (ANCHOR) towards the path
// start × e^(fairDrift × tick), so news and pumps move it for minutes, not forever.
// pumpStr is the per-tick push of an average pump; pumpCap the most one pump can add (log units).
export const CATS = {
  safe:   { label: 'Safe',      icon: '🛡', sigma: 0.0025, fairDrift: 0.00008, fairVol: 0.0007, revert: 0.03,
            pump: 0.0004, crash: 0.00025, pumpStr: [0.0015, 0.003], pumpCap: 0.08, pumpLen: [6, 14], crashStr: [0.008, 0.02], crashLen: [3, 6],
            fates: { moon: 0.55, fade: 0.45, rug: 0 }, hypeable: false },
  stock:  { label: 'Stock',     icon: '🏢', sigma: 0.0065, fairDrift: 0.00005, fairVol: 0.0022, revert: 0.02,
            pump: 0.0012, crash: 0.0009, pumpStr: [0.003, 0.0065], pumpCap: 0.45, pumpLen: [6, 20], crashStr: [0.02, 0.05], crashLen: [3, 8],
            fates: { moon: 0.35, fade: 0.55, rug: 0.1 }, hypeable: false },
  crypto: { label: 'Crypto',    icon: '🪙', sigma: 0.011, fairDrift: 0.0001, fairVol: 0.0035, revert: 0.018,
            pump: 0.0017, crash: 0.0013, pumpStr: [0.005, 0.011], pumpCap: 0.8, pumpLen: [6, 22], crashStr: [0.03, 0.07], crashLen: [3, 9],
            fates: { moon: 0.28, fade: 0.5, rug: 0.22 }, hypeable: true },
  meme:   { label: 'Meme stock', icon: '🦍', sigma: 0.015, fairDrift: -0.0004, fairVol: 0.0045, revert: 0.015,
            pump: 0.0019, crash: 0.0018, pumpStr: [0.01, 0.02], pumpCap: 1.5, pumpLen: [5, 24], crashStr: [0.04, 0.09], crashLen: [3, 10],
            fates: { moon: 0.22, fade: 0.45, rug: 0.33 }, hypeable: true },
  degen:  { label: 'Degen coin', icon: '🎰', sigma: 0.024, fairDrift: -0.0005, fairVol: 0.007, revert: 0.012,
            pump: 0.0032, crash: 0.0023, pumpStr: [0.012, 0.026], pumpCap: 2.2, pumpLen: [5, 26], crashStr: [0.05, 0.13], crashLen: [3, 10],
            fates: { moon: 0.17, fade: 0.4, rug: 0.43 }, hypeable: true },
  rare:   { label: 'Rare',      icon: '💎', sigma: 0.009, fairDrift: -0.0002, fairVol: 0.0035, revert: 0.01,
            pump: 0.0011, crash: 0.0009, pumpStr: [0.018, 0.036], pumpCap: 3.0, pumpLen: [8, 24], crashStr: [0.08, 0.18], crashLen: [3, 8],
            fates: { moon: 0.32, fade: 0.28, rug: 0.4 }, hypeable: true, jump: 0.0015 },
};

export const ANCHOR = 0.0015;

export const CAT_ORDER = ['safe', 'stock', 'meme', 'crypto', 'degen', 'rare'];

// Markets: "main" is always open; the others are unlocked with upgrades.
export const MARKETS = {
  main:  { name: 'Main Street Exchange', short: 'MAIN' },
  orbit: { name: 'Off-World Exchange', short: 'ORBIT' },
  night: { name: 'The Night Market', short: 'NIGHT' },
};

const A = (t, name, cat, price, bio, extra = {}) => ({ t, name, cat, price, bio, market: 'main', volMul: 1, pumpMul: 1, crashMul: 1, driftAdd: 0, ...extra });

export const ASSETS = [
  // safe, slow movers
  A('BORE', 'Boring Bonds Fund', 'safe', 100, 'Government paper. Moves like a sleepy turtle. Your grandparents love it.'),
  A('GRAN', "Grandma's Index Fund", 'safe', 250, 'Owns a sliver of everything. Goes up slowly, complains loudly.', { volMul: 1.4 }),
  A('WATR', 'Aqueduct Utilities', 'safe', 45, 'People will always need water. Dividends, not drama.', { volMul: 1.2 }),
  // stocks
  A('MBYT', 'MegaByte Systems', 'stock', 142.5, 'Chips, clouds and a keynote every week. The market\'s favourite nerd.'),
  A('TITN', 'Titan Energy', 'stock', 58.2, 'Oil, wind and a giant battery nobody is allowed to see.', { volMul: 1.1 }),
  A('RKTW', 'RocketWorks', 'stock', 23.4, 'Builds rockets. Some of them land. Wildly volatile for a "real" company.', { volMul: 1.7, pumpMul: 1.6, crashMul: 1.4 }),
  A('NANA', "Nana's Snacks", 'stock', 9.8, 'Banana chips, banana bread, banana-flavoured banana. Everybody snacks, nobody profits.', { volMul: 1.2 }),
  A('VLVT', 'Velvet Pharma', 'stock', 77, 'Lives and dies by trial results. Earnings days are a coin flip.', { volMul: 1.3, crashMul: 1.3 }),
  A('SPUN', 'Greasy Spoon Holdings', 'stock', 31, 'Diners, drive-thrus and a suspiciously loyal fanbase.', { volMul: 0.8 }),
  A('BEEP', 'BEEP Intelligence', 'stock', 64, 'An AI company whose AI writes the press releases about the AI. Founded by Dax Dollar.', { volMul: 1.6, pumpMul: 1.5, crashMul: 1.3 }),
  A('ROCKETR', 'Rocketr Aerospace', 'stock', 41, 'Rex Rocket\'s space company. Reusable rockets, single-use deadlines.', { volMul: 1.7, pumpMul: 1.5, crashMul: 1.4 }),
  A('CHIRP', 'Chirper Inc.', 'stock', 22, 'Owns the social site you are doomscrolling. Revenue: ads. Product: arguments.', { volMul: 1.3 }),
  // meme stocks
  A('BUST', 'Blockbusted Video', 'meme', 12, 'A video rental chain in 2026. The apes refuse to let it die.'),
  A('CRAY', 'CrayonCorp', 'meme', 4.2, 'Makes crayons. Retail traders eat them. Somehow both are bullish.', { volMul: 1.15 }),
  A('BAGZ', 'Bagz Trading App', 'meme', 7.5, 'Commission-free trading with confetti on every order. Their customers hold the bags; Bagz holds the fees.', { volMul: 1.1 }),
  A('MALL', 'Moldy Mall REIT', 'meme', 2.1, 'Owns 40 empty shopping malls and one very popular food court.', { crashMul: 1.3 }),
  // crypto
  A('CORN', 'Bitcorn', 'crypto', 41250, 'The original. Digital gold, or digital corn, depending who you ask.', { volMul: 0.8 }),
  A('ETHL', 'Ethereal', 'crypto', 2480, 'A world computer that mostly runs cartoon monkey JPEGs.'),
  A('SFLR', 'SolarFlare', 'crypto', 96, 'Very fast. Goes down for "scheduled maintenance" a lot.', { volMul: 1.25, crashMul: 1.4 }),
  A('GIGACOIN', 'GigaCoin', 'crypto', 3.3, 'Faster than every other chain, according to the GigaCoin team. Volatile beyond reason.', { volMul: 2.1, pumpMul: 1.6, crashMul: 1.6 }),
  A('TSD', 'Totally Stable Dollar', 'crypto', 1, 'Always worth $1.00. Always. Probably. Don\'t look at the reserves.', { volMul: 0.04, pumpMul: 0, crashMul: 0.25, stable: true }),
  A('DOTS', 'Polkadots', 'crypto', 6.4, 'Hundreds of tiny blockchains held together by optimism and a very long whitepaper.', { volMul: 1.1 }),
  A('CRDB', 'Cardboard', 'crypto', 0.52, 'Peer-reviewed, academically rigorous, launching smart contracts "next quarter" since forever.'),
  A('RIPL', 'Rippled', 'crypto', 0.61, 'A coin for banks. Banks remain unaware. Lawyers have bought three houses.', { volMul: 1.1 }),
  A('SNOW', 'Snowpile', 'crypto', 31, 'Subnets, avalanches and a logo that looks like a ski resort.', { volMul: 1.2 }),
  A('LINKY', 'Chainlinky', 'crypto', 14.2, 'Feeds real-world data to blockchains. Mostly the price of other coins.'),
  A('HUSH', 'Hushcoin', 'crypto', 158, 'The privacy coin. Nobody knows who owns it, including the owners.', { volMul: 0.9 }),
  A('BRAIN', 'BrainChain AI', 'crypto', 2.75, 'Put "AI" in the name and let the market do the rest.', { volMul: 1.4, pumpMul: 1.4 }),
  A('WOMB', 'Wombat Exchange Token', 'crypto', 318, 'The exchange\'s own coin. Goes down every time the exchange does.', { crashMul: 1.2 }),
  A('GAS', 'GasGuzzler', 'crypto', 0.088, 'A layer 2 for your layer 2. Fees are low, explanations are long.', { volMul: 1.3 }),
  A('NODE', 'Nodecraft', 'crypto', 7.9, 'Rent your old laptop to the blockchain. Earn 0.0001 coins a day. Lose a laptop.'),
  A('PSE', 'Probably Stable Euro', 'crypto', 1.08, 'Pegged to the euro. Probably. The audit is "in the post".', { volMul: 0.05, pumpMul: 0, crashMul: 0.25, stable: true }),
  // degen coins
  A('GOB', 'GoblinCoin', 'degen', 0.042, 'Goblins hoard it. Nobody knows what it does. Number go up (sometimes).'),
  A('PUP', 'MoonPup', 'degen', 0.0031, 'A dog coin, but this dog has a rocket. Community is "very passionate".', { pumpMul: 1.25 }),
  A('FIRE', 'Dumpster Fire Token', 'degen', 0.66, 'Honest branding. Burns 1% of supply every transaction and 50% of holders.', { crashMul: 1.35 }),
  A('HFROG', 'HatFrog', 'degen', 1.37, 'It\'s a frog. It has a hat. Market cap: larger than some countries.'),
  A('MOONCAT', 'MoonCat', 'degen', 0.0127, 'A cat that went to the moon in a meme. The coin is still trying to follow it.', { pumpMul: 1.3 }),
  A('WOOF', 'Sir Woofington', 'degen', 0.00042, 'A dog in a monocle. Old money energy, new money volatility.'),
  A('TPT', 'Toilet Paper Token', 'degen', 0.031, 'Backed by four pallets of toilet paper in a garage in Ohio.'),
  A('COPE', 'CopeCoin', 'degen', 0.0074, 'For when your other coins go down. Usually goes down too.'),
  A('BAGS', 'BagHolder', 'degen', 0.0015, 'The official coin of buying the top.', { crashMul: 1.2 }),
  A('GRAMS', 'GrandmaCoin', 'degen', 0.0058, 'Grandma bought it because the logo has a cat on it. Grandma is up 900%.'),
  A('SQD', 'SquidPay', 'degen', 0.27, 'You can buy it. Can you sell it? Find out!', { pumpMul: 1.5, crashMul: 1.5 }),
  A('CATJ', 'CatWithJob', 'degen', 0.019, 'A cat that has a job. More than most crypto projects can say.'),
  A('SHBN', 'Shiba Banana', 'degen', 0.000083, 'Two memes in one coin. Twice the potential, twice the rug.', { volMul: 1.15 }),
  // rare: huge pumps, devastating crashes
  A('UNOB', 'Unobtainium Mining', 'rare', 3.5, 'Claims to mine a metal that may not exist. Every press release is a lottery ticket.'),
  A('QBAN', 'QuantumBanana', 'rare', 0.88, 'A quantum computer made of fruit. Either the future, or a smoothie.', { volMul: 1.2 }),
  A('BOO', 'GhostChain', 'rare', 13, 'An anonymous blockchain run by nobody. Appears and disappears at midnight.'),
  A('LOST', 'Satoshi\'s Lost Wallet', 'rare', 9.9, 'A wallet untouched since 2010. Every rumour that it moved sends shockwaves.'),
  // Off-World Exchange (unlock)
  A('MDRT', 'Mars Dirt Co', 'stock', 18, 'Sells genuine Martian soil, shipped in genuine Earth bags.', { market: 'orbit', volMul: 1.5, pumpMul: 1.5 }),
  A('ROCK', 'Asteroid Bros', 'meme', 6.6, 'Two brothers, one lasso, a trillion-dollar asteroid. What could go wrong?', { market: 'orbit' }),
  A('ZERO', 'Zero-G Noodles', 'stock', 27, 'Instant ramen for astronauts. Recession proof, gravity proof.', { market: 'orbit', volMul: 1.1 }),
  A('STAR', 'StarDust Coin', 'crypto', 4.8, 'Mined on a satellite. Latency: 4 minutes. Hype: infinite.', { market: 'orbit', volMul: 1.3, pumpMul: 1.3 }),
  // The Night Market (unlock)
  A('LAMBO', 'Lambo DAO', 'degen', 0.19, 'A DAO that votes on which Lambo to buy. It has never bought one.', { market: 'night', pumpMul: 1.4, crashMul: 1.3 }),
  A('RUGL', 'Rug Pull Labs', 'degen', 0.07, 'Audited by "a guy". Developers have not been seen since Tuesday.', { market: 'night', volMul: 1.3, crashMul: 1.6, pumpMul: 1.5 }),
  A('GOOSE', 'Golden Goose Protocol', 'rare', 2.2, 'Lays golden eggs. Occasionally lays a regular egg and the price halves.', { market: 'night', pumpMul: 1.4 }),
  A('WAGMI', 'WAGMI Inu', 'degen', 0.0009, 'We are all gonna make it. Some of us, anyway.', { market: 'night', volMul: 1.2 }),
];

export const ASSET_BY_T = Object.fromEntries(ASSETS.map(a => [a.t, a]));

export function assetsFor(markets = ['main']) {
  return ASSETS.filter(a => markets.includes(a.market));
}

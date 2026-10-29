// News events: headlines plus their effect on prices. Everything here is fictional.
//
// target   'asset'  one asset picked from `cats` (or `only` tickers)
//          'group'  every asset in `cats` (each hit with a random strength)
//          'all'    the whole market
// effect   pump  { mul, len:[a,b], fates }   start a pump (fates override the category's)
//          crash { mul, len:[a,b], fate }     start a crash ('recover' | 'permanent')
//          shock [lo, hi]                     instant log-price jump next tick
//          fair  [lo, hi]                     permanent shift of the fair value
//          hype  n                            add hype (hypeable assets only)
//          vol   [mul, ticks]                 temporary volatility multiplier
//          drift [add, ticks]                 temporary fair-value drift per tick
//          odds  p                            each asset in a group is only hit with chance p
// pending  a follow-up headline that resolves later: { in:[a,b], truth, yes:{text, effect}, no:{text, effect} }
// tone     what the headline sounds like (+1 bullish, -1 bearish). The real outcome can differ.

export const CAST = {
  celeb: ['tech billionaire Dax Dollar', 'rapper Lil Margin', 'fitness star Bradley Beef', 'chef Gordon Grumble', 'luxury influencer Princess Paywall', 'beauty mogul Kiki Clout', 'rocket billionaire Rex Rocket', 'streamer Johnny Jackpot', 'DJ Liquidity'],
  influencer: ['Madame Moonshot', 'Brock Blockchain', 'Chadwick Gains', 'Meme Lord Supreme', 'Baby Bull', 'Vivienne Viral'],
  exchange: ['Wombat Exchange', 'CoinBarn', 'BlockBazaar', 'Lemonade Markets'],
  official: ['Fed Chair Marla Hawke', 'Senator Hal Beige', 'the Securities & Feelings Commission', 'the Ministry of Vibes'],
  partner: ['a major airline', 'the Olympic Committee', 'a mid-sized country', 'every school cafeteria in Ohio', 'a famous burger chain', 'NASA\'s cousin, NASB'],
  tech: ['room-temperature superconductors', 'self-folding laundry', 'a battery that lasts a decade', 'AI that can finally fold a fitted sheet', 'cold fusion (for real this time)', 'a phone with no screen'],
  scandal: ['using company funds on a 40-foot yacht shaped like a duck', 'playing poker with investor money', 'faking the moon landing (of their product)', 'replying-all to the entire company'],
  reason: ['a typo in a central bank memo', 'rumors of a recession', 'a rogue algorithm selling everything', 'nobody knows why', 'a scary chart going viral', 'interest rate jitters'],
  thing: ['speculative tokens', 'meme coins', 'unregistered "yield"', 'anything with a dog on it'],
};

export const EVENTS = [
  { id: 'viral_meme', weight: 7, target: 'asset', cats: ['degen', 'meme'], tone: 1,
    text: ['A video of {celeb} dancing with a {name} plushie hits 40M views', '{t} memes take over the internet. Nobody can explain why', '"{name} to the moon" is now the #1 song on streaming'],
    effect: { pump: { mul: 1.25, len: [8, 20] }, hype: 30 } },
  { id: 'breakthrough', weight: 5, target: 'asset', cats: ['stock', 'rare'], tone: 1,
    text: ['{name} announces unexpected breakthrough in {tech}', '{name} unveils {tech}. Analysts "cautiously stunned"'],
    effect: { fair: [0.06, 0.18], pump: { mul: 0.9, len: [5, 12], fates: { moon: 0.6, fade: 0.35, rug: 0.05 } } } },
  { id: 'celebrity', weight: 6, target: 'asset', cats: ['crypto', 'degen', 'meme'], tone: 1,
    text: ['{celeb} posts "{t} to the moon 🚀🚀🚀"', '{celeb} changes their profile picture to the {name} logo', '{celeb} says they "might have bought some {t}, who knows"'],
    effect: { pump: { mul: 1.5, len: [6, 18], fates: { moon: 0.15, fade: 0.35, rug: 0.5 } }, hype: 40 } },
  { id: 'outage', weight: 4, target: 'group', cats: ['crypto', 'degen'], tone: -1,
    text: ['{exchange} goes down for "unscheduled maintenance". Withdrawals paused', 'Major exchange outage: {exchange} users stuck staring at a loading spinner'],
    effect: { odds: 0.7, crash: { mul: 0.55, len: [2, 5], fate: 'recover' }, vol: [1.6, 25] } },
  { id: 'regulation', weight: 4, target: 'group', cats: ['crypto', 'degen'], tone: -1,
    text: ['{official} announces crackdown on {thing}', '{official}: "We are looking very closely at {thing}"', 'New rules proposed for {thing}. Lawyers rejoice'],
    effect: { odds: 0.8, shock: [-0.1, -0.03], fair: [-0.07, -0.01] } },
  { id: 'panic', weight: 3, target: 'all', tone: -1,
    text: ['MARKET PANIC: {reason}', 'Sell-off spreads across the market: {reason}', 'Traders hit the exits: {reason}'],
    effect: { odds: 0.75, crash: { mul: 0.45, len: [2, 6], fate: 'recover' } }, safeBonus: [0.004, 0.012] },
  { id: 'earnings', weight: 6, target: 'asset', cats: ['stock'], tone: 0,
    text: ['{name} reports earnings in a few seconds. Options traders sweating', 'Earnings incoming: {name} to report any moment now'],
    pending: { in: [6, 12], truth: 0.5,
      yes: { text: '{name} BEATS earnings: revenue up {n}%', tone: 1, effect: { shock: [0.04, 0.16], fair: [0.03, 0.1] } },
      no: { text: '{name} MISSES earnings. CEO blames "the weather"', tone: -1, effect: { shock: [-0.18, -0.05], fair: [-0.1, -0.02] } } } },
  { id: 'hype_campaign', weight: 4, target: 'asset', cats: ['meme', 'degen'], tone: 1,
    text: ['Coordinated hype campaign: 4,000 brand-new accounts start posting "{t}" at once', 'Telegram groups light up: "{t} is the next 1000x"', '{influencer} launches a "{t} army". Membership: 80,000'],
    effect: { pump: { mul: 1.7, len: [8, 22], fates: { moon: 0.1, fade: 0.3, rug: 0.6 } }, hype: 55 } },
  { id: 'listing_rumor', weight: 4, target: 'asset', cats: ['crypto', 'degen'], tone: 1,
    text: ['Rumor: {name} to be listed on {exchange}', 'Leaked screenshot suggests {exchange} is adding {t}'],
    effect: { hype: 15, shock: [0.01, 0.04] },
    pending: { in: [8, 16], truth: 0.55,
      yes: { text: 'CONFIRMED: {exchange} lists {t}', tone: 1, effect: { pump: { mul: 1.2, len: [6, 14] }, hype: 20 } },
      no: { text: '{exchange} denies {t} listing rumor. "We\'ve never heard of it"', tone: -1, effect: { shock: [-0.14, -0.05] } } } },
  { id: 'partnership', weight: 4, target: 'asset', cats: ['stock', 'meme'], tone: 1,
    text: ['{name} announces partnership with {partner}', '{name} signs a deal with {partner}. Details: "vague"'],
    effect: { shock: [0.02, 0.08], fair: [0, 0.05] } },
  { id: 'scandal', weight: 3, target: 'asset', cats: ['stock', 'meme'], tone: -1,
    text: ['{name} CEO caught {scandal}', 'Report: {name} executives accused of {scandal}'],
    effect: { shock: [-0.14, -0.04], fair: [-0.09, -0.02] } },
  { id: 'whale', weight: 4, target: 'asset', cats: ['crypto', 'degen', 'rare'], tone: -1,
    text: ['Whale alert: billions of {t} just moved to an exchange', 'A wallet holding 9% of all {t} wakes up after 3 years'],
    effect: { vol: [1.8, 20] },
    pending: { in: [2, 6], truth: 0.6,
      yes: { text: 'The {t} whale is selling. Order books bleeding', tone: -1, effect: { crash: { mul: 0.9, len: [2, 6], fate: 'recover' } } },
      no: { text: 'False alarm: the {t} whale was just moving wallets', tone: 1, effect: { shock: [0.02, 0.06] } } } },
  { id: 'depeg', weight: 1.4, target: 'asset', only: ['TSD', 'PSE'], tone: -1,
    text: ['{name} slips off its peg. Team: "everything is fine"', '{name} reserves audit delayed "for the fourth time"'],
    effect: { crash: { mul: 0.08, len: [3, 6], fate: 'recover' }, vol: [12, 30] } },
  { id: 'rates', weight: 3, target: 'all', tone: 0,
    text: ['{official} hints at a rate cut. Or a hike. Hard to tell', '{official} speech moves markets: "we remain data-dependent"'],
    effect: { odds: 1, vol: [1.5, 15], shock: [-0.025, 0.03] } },
  { id: 'hack', weight: 2, target: 'asset', cats: ['crypto', 'degen'], exclude: ['TSD', 'PSE'], tone: -1,
    text: ['{name} bridge hacked. Attacker leaves a note: "thanks for the liquidity"', 'Exploit drains {name} treasury'],
    effect: { crash: { mul: 1.1, len: [2, 5], fate: 'permanent' }, hype: -40 } },
  { id: 'buyback', weight: 3, target: 'asset', cats: ['stock', 'safe'], tone: 1,
    text: ['{name} announces a giant share buyback', '{name} raises dividend for the 30th year in a row'],
    effect: { shock: [0.01, 0.05], fair: [0.01, 0.04] } },
  { id: 'discovery', weight: 2.5, target: 'asset', cats: ['rare'], tone: 1,
    text: ['{name} claims a discovery that "changes everything". Proof coming soon', '{name} schedules a press conference. Title: "It\'s real"'],
    effect: { hype: 25, shock: [0.03, 0.1] },
    pending: { in: [8, 18], truth: 0.42,
      yes: { text: 'IT\'S REAL: {name} discovery verified by independent labs', tone: 1, effect: { pump: { mul: 2.2, len: [10, 24], fates: { moon: 0.5, fade: 0.3, rug: 0.2 } }, fair: [0.1, 0.4], hype: 40 } },
      no: { text: '{name} press conference was a PowerPoint about crypto. Investors furious', tone: -1, effect: { crash: { mul: 1.0, len: [3, 6], fate: 'permanent' }, hype: -30 } } } },
  { id: 'squeeze', weight: 3, target: 'asset', cats: ['meme'], tone: 1,
    text: ['Short sellers pile into {name}. Forums whisper: "squeeze"', 'Short interest in {name} hits 140%. That shouldn\'t even be possible'],
    effect: { hype: 20 },
    pending: { in: [6, 14], truth: 0.5,
      yes: { text: 'SHORT SQUEEZE! {name} shorts forced to buy back', tone: 1, effect: { pump: { mul: 2, len: [8, 20], fates: { moon: 0.25, fade: 0.4, rug: 0.35 } }, hype: 40 } },
      no: { text: 'The {name} squeeze fizzles. Shorts win this round', tone: -1, effect: { shock: [-0.16, -0.06] } } } },
  { id: 'rug_watch', weight: 3, target: 'asset', cats: ['degen'], tone: -1,
    text: ['On-chain sleuths spot {name} devs moving funds', '{name} website goes offline. Discord set to read-only'],
    effect: { vol: [1.5, 15] },
    pending: { in: [4, 10], truth: 0.6,
      yes: { text: 'RUG PULL: {name} devs dump their entire bag', tone: -1, effect: { crash: { mul: 1.5, len: [2, 5], fate: 'permanent' }, hype: -60 } },
      no: { text: '{name} devs: "we were just paying for server costs lol". Relief rally', tone: 1, effect: { shock: [0.04, 0.12] } } } },
  { id: 'flavor', weight: 5, target: 'asset', cats: ['stock', 'crypto', 'meme', 'degen', 'safe', 'rare'], tone: 0,
    text: ['Analyst says {t} could go "up, down, or sideways"', '{influencer} posts a 47-tweet thread about {t}. Nobody reads it', '{name} trends on social media for "unclear reasons"', 'Survey: 62% of traders have "a feeling" about {t}', '{influencer} draws a line on a {t} chart. Calls it a "cup and handle"'],
    effect: { vol: [1.2, 8] } },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));

export function fillTemplate(text, vars) {
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

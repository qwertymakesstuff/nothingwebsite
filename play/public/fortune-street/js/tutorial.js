// The guided tutorial: a real match against one AI rival whose first rolls and cards are
// scripted, so every idea comes up in a fixed order. Each step explains one idea, may point
// at part of the screen, and either waits for the player to press Next or waits until the
// game reaches a state (the player did the thing). `allow` lists the only actions the human
// may take during the step (null = anything); the AI is never restricted.
import { CIRCUIT_BONUS, IMPOUND_FEE, MIN_BID } from './board.js';

export const TUTORIAL_KEY = 'fortune-street:tutorial';

export const TUTORIAL_GAME = {
  mode: 'tutorial',
  seed: 20261021,
  players: [
    { name: 'Rookie', kind: 'human', token: 'sailboat' },
    { name: 'Captain Wren', kind: 'ai', personality: 'collector', token: 'gull' },
  ],
  script: {
    // you: Saltbox, Crabhouse (completes Old Harbor), doubles onto Wren's Spice Lane then
    // Lantern Street (auction), a City Bulletin, a Business Opportunity (towed), Gallery Steps
    dice: {
      p1: [[1, 2], [1, 2], [1, 1], [2, 1], [4, 2], [3, 2], [4, 2]],
      // Wren: Spice Lane, Central Rail, Lighthouse Park, Brass Bell, Bay Fiber Net, Crown Spire
      p2: [[5, 3], [4, 3], [3, 2], [3, 1], [3, 1], [5, 4]],
    },
    topCards: { bulletin: 'festival', opportunity: 'towed' },
    owned: { p1: ['netmakers'] },
  },
};

// Goals are written as "has the game moved past this point", not "is this showing right now",
// so a tutorial resumed after a reload never waits for something that already happened.
// The scripted match alternates turns: yours are turn numbers 1, 3, 5..., Wren's 2, 4, 6...
const mine = (st, id) => st.props[id].owner === 'p1';
const my = st => st.players[0];
const reached = n => st => st.turnNumber >= n;
const during = (n, cond) => st => st.turnNumber > n || (st.turnNumber === n && cond(st));
const rolled = st => st.turn.rolled;
const doneRolling = st => st.turn.rolled && !st.turn.extraRoll;
const harborBuilt = st => ['netmakers', 'saltbox', 'crabhouse'].some(id => st.props[id].level > 0);

export const STEPS = [
  {
    title: 'Welcome to Meridian Bay',
    body: `<p>Fortune Street is a property-trading game. You travel around the city, buy property, charge rent to rivals, build it up, and try to finish as the <b>richest owner</b>.</p>
      <p>This tutorial is a short real match: you play as <b>Rookie</b> against <b>Captain Wren</b>. We arranged the first few dice so every important rule comes up once. It takes about five minutes.</p>`,
    next: true,
  },
  {
    title: 'The board',
    target: '#board',
    body: `<p>The city is a loop of 40 spaces. Everyone starts at <b>Launch Pier</b> (bottom-left) and moves clockwise. Every time you pass or land on it you collect <b>$${CIRCUIT_BONUS}</b>.</p>
      <p>The colored bands mark <b>districts</b>: groups of properties that belong together. Tap or click any space to see its card: price, rent and owner.</p>`,
    next: true,
  },
  {
    title: 'Your money',
    target: '#turnPanel .cp-stats',
    body: `<p><b>Spendable cash</b> is the money you can pay with right now.</p>
      <p><b>Net worth</b> is your total fortune: cash, plus property at its price, plus what you invested in buildings, minus loans and debts. <b>Net worth decides who wins.</b></p>
      <p>As a head start you already own <b>Netmaker's Wharf</b> in Old Harbor (the blue district).</p>`,
    next: true,
  },
  {
    title: 'The leaderboard',
    target: '#leaderboard',
    body: '<p>Everyone\'s cash and net worth, ranked. Click a player to see everything they own.</p>',
    next: true,
  },
  {
    title: 'Roll the dice',
    target: '[data-act="ROLL"]',
    body: '<p>Each turn starts with a roll of two dice. You move that many spaces. Press <b>Roll dice</b>.</p>',
    allow: ['ROLL'],
    done: during(1, rolled),
  },
  {
    title: 'Buying property',
    target: '[data-act="BUY"]',
    body: `<p>You landed on <b>Saltbox Warehouse</b>, which nobody owns. You can buy it at its price.</p>
      <p>If you decline, it goes to a <b>sealed-bid auction</b>: everyone bids once in secret and the highest bid wins. You'll try that later. For now, press <b>Buy</b>.</p>`,
    allow: ['BUY'],
    done: st => mine(st, 'saltbox') || st.turnNumber > 1,
  },
  {
    title: 'End your turn',
    target: '[data-act="END_TURN"]',
    body: '<p>After moving you can build, trade or manage loans. You have nothing else to do now, so press <b>End turn</b>.</p>',
    allow: ['END_TURN'],
    done: reached(2),
  },
  {
    title: 'Captain Wren\'s turn',
    target: '#board',
    body: '<p>Wren is an AI player: <b>The Collector</b>, who hunts for complete districts. Watch where Wren lands. Rivals buy property too, and you\'ll owe them rent when you land on it.</p>',
    allow: [],
    done: reached(3),
  },
  {
    title: 'Roll again',
    target: '[data-act="ROLL"]',
    body: '<p>Your turn again. Roll.</p>',
    allow: ['ROLL'],
    done: during(3, rolled),
  },
  {
    title: 'Complete a district',
    target: '[data-act="BUY"]',
    body: '<p><b>Crabhouse Row</b> is the last property of Old Harbor. The note says buying it completes the district. Buy it!</p>',
    allow: ['BUY'],
    done: st => mine(st, 'crabhouse') || st.turnNumber > 3,
  },
  {
    title: 'You own a whole district',
    target: '#board',
    body: `<p>Owning <b>every</b> property in a district does two things:</p>
      <ul><li>Its <b>base rent doubles</b>.</li><li>You may <b>build</b> on it.</li></ul>
      <p>The price on each owned space now shows its current rent.</p>`,
    next: true,
    tab: 'portfolio',
  },
  {
    title: 'Build a Storefront',
    target: '#tabBody',
    tab: 'portfolio',
    body: `<p>Your <b>Portfolio</b> lists what you own. Each property can grow through four levels: <b>Storefront → Business Hub → Apartments → Landmark Tower</b>. Each level raises the rent a lot.</p>
      <p>Press a <b>Build</b> button on any Old Harbor property. Hover it (or read the line under the name) to see the new rent first.</p>`,
    allow: ['BUILD'],
    done: st => harborBuilt(st) || st.turnNumber > 3,
  },
  {
    title: 'Build evenly',
    target: '#tabBody, [data-act="END_TURN"]',
    tab: 'portfolio',
    body: `<p>Rule: build <b>evenly</b>. A property can't be more than one level above the others in its district, so build on all three before adding a second level anywhere.</p>
      <p>Build more if you like (keep some cash!), then press <b>End turn</b>.</p>`,
    allow: ['BUILD', 'SELL_BUILDING', 'END_TURN'],
    done: reached(4),
  },
  {
    title: 'Wren moves',
    target: '#board',
    body: '<p>Wren\'s turn. If a rival lands on your property, they pay you rent automatically.</p>',
    allow: [],
    done: reached(5),
  },
  {
    title: 'Roll',
    target: '[data-act="ROLL"]',
    body: '<p>Roll the dice.</p>',
    allow: ['ROLL'],
    done: during(5, rolled),
  },
  {
    title: 'Rent, and doubles',
    target: '[data-tab="ledger"]',
    body: `<p>You landed on <b>Spice Lane</b>, which Wren owns, so you paid Wren rent. Every payment is recorded in the <b>Ledger</b> tab, and every event in the <b>Event feed</b>.</p>
      <p>You also rolled <b>doubles</b> (two equal dice), so you <b>roll again</b>! A third doubles in one turn sends you to the Impound Lot for speeding.</p>`,
    next: true,
  },
  {
    title: 'Roll again',
    target: '[data-act="ROLL"]',
    body: '<p>Roll your bonus roll.</p>',
    allow: ['ROLL'],
    done: during(5, doneRolling),
  },
  {
    title: 'Try an auction',
    target: '[data-act="DECLINE"]',
    body: '<p>This time, press <b>Decline → auction</b> on Lantern Street to see how auctions work.</p>',
    allow: ['DECLINE'],
    done: during(5, st => doneRolling(st) && st.turn.phase !== 'buy'),
  },
  {
    title: 'Sealed bids',
    target: '.bid-form',
    body: `<p>Everyone, including you, places <b>one secret bid</b> (minimum $${MIN_BID}, or pass). When all bids are in, they are revealed and the highest bid buys the property. Ties go to whoever bid first.</p>
      <p>Bargains are possible, but rivals may outbid you. Enter a bid and press <b>Place sealed bid</b> (or <b>Pass</b>).</p>`,
    allow: ['BID'],
    done: during(5, st => doneRolling(st) && !st.pending),
  },
  {
    title: 'End your turn',
    target: '[data-act="END_TURN"]',
    body: '<p>Check the Event feed to see who won the auction, then end your turn.</p>',
    allow: ['END_TURN', 'BUILD'],
    done: reached(6),
  },
  {
    title: 'Wren\'s turn',
    target: '#board',
    body: '<p>Wren moves again.</p>',
    allow: [],
    done: reached(7),
  },
  {
    title: 'Event spaces',
    target: '[data-act="ROLL"]',
    body: '<p>Light-blue <b>City Bulletin</b> spaces and orange <b>Business Opportunity</b> spaces draw a card. Roll and see what happens.</p>',
    allow: ['ROLL'],
    done: during(7, rolled),
  },
  {
    title: 'City Bulletins',
    target: '#effects',
    body: `<p>The card appeared in the middle of the board. <b>City Bulletins</b> are public events. This festival raises Old Harbor rents by 50% (great news for you!).</p>
      <p>Timed events are listed under <b>City conditions</b>, with the round they end. Other bulletins charge builders, pay grants, or change rents.</p>`,
    next: true,
  },
  {
    title: 'End your turn',
    target: '[data-act="END_TURN"]',
    body: '<p>End your turn.</p>',
    allow: ['END_TURN', 'BUILD'],
    done: reached(8),
  },
  {
    title: 'Wren\'s turn',
    target: '#board',
    body: '<p>Wren moves.</p>',
    allow: [],
    done: reached(9),
  },
  {
    title: 'Business Opportunities',
    target: '[data-act="ROLL"]',
    body: '<p><b>Business Opportunity</b> cards happen to you alone: windfalls, fines, trips across town. Roll.</p>',
    allow: ['ROLL'],
    done: during(9, rolled),
  },
  {
    title: 'Towed!',
    target: '#board, [data-act="END_TURN"]',
    body: `<p>Bad luck: you were towed to the <b>Impound Lot</b>. The <b>Tow Zone</b> corner and three doubles in one turn do the same.</p>
      <p>On each turn there you may pay <b>$${IMPOUND_FEE}</b>, use a <b>Tow Waiver</b> card, or roll for doubles. After three misses you pay the fee and move. You can still collect rent while impounded.</p>
      <p>End your turn.</p>`,
    allow: ['END_TURN', 'BUILD'],
    done: reached(10),
  },
  {
    title: 'Wren\'s turn',
    target: '#board',
    body: '<p>Wren moves.</p>',
    allow: [],
    done: reached(11),
  },
  {
    title: 'Leave the Impound Lot',
    target: '[data-act="PAY_IMPOUND"]',
    body: `<p>Pay the <b>$${IMPOUND_FEE}</b> release fee, then roll normally.</p>`,
    allow: ['PAY_IMPOUND'],
    done: during(11, st => !my(st).impounded),
  },
  {
    title: 'Your call',
    target: '#turnPanel .actions',
    body: '<p>Roll, then buy, decline or bid as you like. The rest is up to you now.</p>',
    allow: ['ROLL', 'BUY', 'DECLINE', 'BID', 'BUILD', 'MORTGAGE', 'SELL_BUILDING'],
    done: during(11, st => st.turn.phase === 'postRoll'),
  },
  {
    title: 'Trading',
    target: '[data-ui="trade"]',
    body: `<p>On your turn you can <b>Trade</b>: offer any mix of cash, property and Tow Waivers for theirs. The other player can accept, reject or <b>counter</b>.</p>
      <p>AI rivals judge a deal on its real value. They pay well for the last piece of a district and refuse deals that hand <i>you</i> a complete one. Properties in a district with buildings can't be traded. Sell the buildings first.</p>`,
    next: true,
  },
  {
    title: 'Mortgages and debt',
    target: '[data-tab="portfolio"]',
    body: `<p>Short on cash? In your Portfolio you can <b>mortgage</b> a property (its district must have no buildings) for half its price. It earns no rent until you <b>repay</b> the loan plus 10%. You can also <b>sell</b> building levels back for half what they cost.</p>
      <p>If you owe more than your cash, the game pauses until you raise the money. <b>Raise funds automatically</b> does it for you. Only if selling and mortgaging everything still isn't enough do you go <b>bankrupt</b> and leave the game.</p>`,
    next: true,
  },
  {
    title: 'How the match ends',
    target: '.hud-bar',
    body: `<p>A match ends when only one player is left, or when the round limit is reached (shown at the top). The highest <b>net worth</b> wins.</p>
      <p>Tips: cheap districts like Old Harbor pay back quickly, expensive ones earn the most later. Keep some cash for rent. Completing districts matters most.</p>
      <p><b>Menu</b> has settings and the full rules; <b>Rules</b> is a quick reference any time.</p>`,
    next: true,
  },
  {
    title: 'You\'re ready!',
    body: '<p>That\'s everything you need. Keep playing this match against Wren, or set up a real game with up to four players.</p>',
    finale: true,
  },
];

// first step at or after `from` whose goal is not already met (so a resumed tutorial
// skips ahead past anything that already happened)
export function settleStep(st, from) {
  let i = Math.max(0, Math.min(from, STEPS.length - 1));
  while (i < STEPS.length - 1 && STEPS[i].done && STEPS[i].done(st)) i++;
  return i;
}

// reading steps (next: true) hold the game still unless they list what is allowed
export function actionAllowed(step, action) {
  if (!step || step.finale) return true;
  const allow = step.allow ?? (step.next ? [] : null);
  return allow == null || allow.includes(action.type);
}

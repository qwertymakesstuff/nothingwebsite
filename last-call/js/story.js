// Characters, between-shift scenes and endings. Scenes are short, skippable line by line, and
// every choice is data: flags set or counted, money, items, warnings. `after` is the index of
// the shift the scene follows (-1 = before the first shift).

import { testCondition } from './conditions.js';
import { PROFILE_BY_ID } from './customers.js';

const F = (skin, faceShape, nose, brows, eyes, hair, hairColor, facial = 'none', x = {}) =>
  ({ skin, faceShape, nose, brows, eyes, hair, hairColor, facial, glasses: false, earrings: false, tattoo: false, freckles: false, ...x });

export const CHARACTERS = {
  dee: { name: 'Dee Okonjo', role: 'Owner, The Lantern', face: F('s5', 'round', 'broad', 'thick', 'brown', 'bun', 'grey', 'none', { glasses: true, earrings: true }), top: 'sweater', color: '#ffb347' },
  kwame: { name: 'Kwame Mensah', role: 'Mensah Door Services', face: F('s6', 'square', 'broad', 'thick', 'brown', 'bald', 'black', 'beard'), top: 'leather-jacket', color: '#9dff5c' },
  juno: { name: 'Juno Park', role: 'Door staff, The Sump', face: F('s2', 'heart', 'button', 'arched', 'brown', 'bob', 'black', 'none', { earrings: true, tattoo: true }), top: 'leather-jacket', color: '#ff7ab8' },
  victor: { name: 'Victor Lark', role: 'Operations, Halcyon', face: F('s1', 'long', 'straight', 'arched', 'blue', 'sidepart', 'black', 'stubble'), top: 'suit', color: '#f2c46b' },
  saffron: { name: 'Saffron Ibe', role: 'Promoter, The Sump', face: F('s5', 'oval', 'button', 'arched', 'hazel', 'braids', 'red', 'none', { earrings: true }), top: 'tshirt-band', color: '#47c26b' },
  benny: { name: 'Benny Ruiz', role: 'Your roommate', face: PROFILE_BY_ID.benny.face, top: 'tshirt-band', color: '#ffd166' },
  nadia: { name: 'Nadia Ross', role: 'Reporter, The Night Ledger', face: PROFILE_BY_ID.nadia.face, top: 'turtleneck', color: '#5cc8ff' },
  varga: { name: 'Ilse Varga', role: 'City Licensing', face: PROFILE_BY_ID.varga.face, top: 'blazer', color: '#c0c8d8' },
  theo: { name: 'Theo Lark', role: '???', face: PROFILE_BY_ID.theo.face, top: 'turtleneck', color: '#d39bff' },
};

// Lines: [speaker, mood, text]. Speaker 'you' or null is narration. {name} is the player's name.
export const SCENES = [
  {
    id: 'intro', after: -1, title: 'Couch, 7:40 p.m.', place: 'home',
    nodes: {
      start: {
        lines: [
          ['benny', 'happy', '{name}! Wake up. It\'s your first night. You said to make sure you weren\'t late. You are slightly late.'],
          [null, null, 'Rent is due every week. The couch is Benny\'s. The job is yours — if you keep it.'],
          ['benny', 'neutral', 'The Lantern, right? Dee Okonjo\'s place. She once threw my cousin out through a closed door.'],
          ['dee', 'neutral', 'You\'re the new one. Good. Jacket\'s on the hook. The rule tonight is simple: twenty-one or over. I\'ll be behind the bar if it isn\'t simple.'],
        ],
        choices: [
          { text: '"What happens if I get it wrong?"', next: 'wrong' },
          { text: '"Simple. I\'ve got it."', next: 'got', inc: { dee_trust: 0 } },
        ],
      },
      wrong: {
        lines: [['dee', 'stern', 'Let in a kid, the council fines me. Do it twice, they take my licence. Turn away good customers, I go broke slower. Either way, I notice.'], ['dee', 'smile', 'You\'ll be fine. Read the card, not the face.']],
      },
      got: { lines: [['dee', 'smile', 'They all say that. Prove it.']] },
    },
  },
  {
    id: 'rent', after: 0, title: 'Back home, 2 a.m.', place: 'home',
    nodes: {
      start: {
        lines: [
          ['benny', 'sad', 'So... funny story. My hours got cut at the warehouse. I\'m twenty short on my half of the rent.'],
          ['benny', 'neutral', 'I\'ll pay you back. Double. Benny\'s honour.'],
        ],
        choices: [
          { text: 'Lend him $20', money: -20, set: { benny_loan: true }, next: 'lent', if: { money: { gte: 20 } } },
          { text: '"Sorry, Benny. I\'m stretched too."', next: 'no' },
        ],
      },
      lent: { lines: [['benny', 'happy', 'You\'re a saint. A tired, grumpy saint.']] },
      no: { lines: [['benny', 'sad', 'Fair. Totally fair. I\'ll sell my... something.']] },
    },
  },
  {
    id: 'gus', after: 1, title: 'Closing time', place: 'lantern',
    nodes: {
      start: {
        lines: [['dee', 'neutral', 'Gus came round the back afterwards. Said the new one wouldn\'t let him in.']],
        next: 'branch',
      },
      branch: {
        branch: [
          { if: { outcome: 'gus', correct: true }, next: 'proud' },
          { next: 'warned' },
        ],
      },
      proud: {
        lines: [['dee', 'smile', 'Good. He\'s been "meaning to renew" since autumn. If an inspector saw him come in on that card, it\'s my licence.'], ['dee', 'stern', 'There\'s a letter on the bar from Lark & Vane. Developers. They want the building. The licence is all that keeps them out.']],
        choices: [
          { text: '"Want me to read it?"', inc: { dee_trust: 1 }, next: 'letter' },
          { text: '"Not my business, boss."', next: 'end' },
        ],
      },
      warned: {
        lines: [['dee', 'stern', 'Wait — you let him in? On an expired card? Love, I adore Gus, but an inspector doesn\'t. That\'s my licence on the line.'], ['dee', 'neutral', 'There\'s a letter on the bar from Lark & Vane. Developers. One violation and they get the building cheap.']],
        choices: [{ text: '"It won\'t happen again."', next: 'end' }],
      },
      letter: { lines: [[null, null, '"...a generous offer, which we trust you will accept before your licence review in April." It\'s signed Victor Lark.'], ['dee', 'stern', 'Over my dead body. Or my licence. Whichever goes first.']] },
      end: { lines: [['dee', 'neutral', 'Get some sleep.']] },
    },
  },
  {
    id: 'kwame-offer', after: 2, title: 'Last orders', place: 'lantern',
    nodes: {
      start: {
        lines: [
          ['kwame', 'smile', 'Dee says you\'re sharp. I run a door firm — Mensah Door Services. I need someone at the Sump next week. Better money.'],
          ['dee', 'neutral', 'I can\'t give you more than weekends right now. Take it. Just don\'t forget where you started.'],
        ],
        choices: [
          { text: '"I\'ll take it — and I\'ll still be here when you need me, Dee."', inc: { dee_trust: 1 }, next: 'end' },
          { text: '"Thanks, Kwame. When do I start?"', inc: { kwame_trust: 1 }, next: 'end' },
        ],
      },
      end: { lines: [['kwame', 'neutral', 'Friday. Wear boots. The floor down there is... sticky.']] },
    },
  },
  {
    id: 'juno', after: 3, title: 'Smoking area', place: 'sump',
    nodes: {
      start: {
        lines: [
          ['juno', 'smirk', 'So you\'re Kwame\'s new favourite. I\'ve been on this door two years and he still calls me "the other one".'],
          ['saffron', 'happy', 'Ignore her. She\'s nice once you\'ve saved her life twice.'],
        ],
        choices: [
          { text: '"Only twice? I\'ll get started."', inc: { juno_respect: 1 }, next: 'banter' },
          { text: 'Say nothing and finish your coffee.', next: 'quiet' },
        ],
      },
      banter: { lines: [['juno', 'smile', 'Ha. Okay. You might last.']] },
      quiet: { lines: [['juno', 'neutral', 'Strong silent type. Great. Another one.']] },
    },
  },
  {
    id: 'juno-cover', after: 4, title: 'After the show', place: 'sump',
    nodes: {
      start: {
        lines: [['juno', 'neutral', 'Got a minute?']],
        choices: [{ text: '"Sure."', next: 'branch' }],
      },
      branch: { branch: [{ if: { outcome: 'danny', verdict: 'refuse' }, next: 'carded' }, { if: { outcome: 'danny', verdict: 'admit' }, next: 'let' }, { next: 'ask' }] },
      carded: { lines: [['juno', 'stern', 'You carded my cousin Danny. Fake card, he says. Some guy at college sells them.'], ['juno', 'sigh', '...Good. He\'s seventeen. Mum would have killed me.']], next: 'ask' },
      let: { lines: [['juno', 'stern', 'Danny got in. He\'s seventeen. His card\'s a fake from some college dealer.'], ['juno', 'sigh', 'I pulled him out before Saffron saw. You owe me one.']], next: 'ask' },
      ask: {
        lines: [['juno', 'neutral', 'Saffron\'s asking why the side door was unmanned at ten. That was me — my mum called from the hospital. If Kwame hears, I\'m off the roster.'], ['juno', 'sad', 'Can you tell her you had me fetching wristbands?']],
        choices: [
          { text: 'Cover for her', set: { juno_ally: true }, next: 'covered' },
          { text: '"I won\'t lie for you. Tell Saffron the truth — she\'ll understand."', set: { juno_ally: false }, inc: { kwame_trust: 1 }, next: 'truth' },
        ],
      },
      covered: { lines: [['juno', 'smile', 'I owe you. Properly. I don\'t forget that.']] },
      truth: { lines: [['juno', 'stern', 'Easy for you to say.'], [null, null, 'She tells Saffron anyway. Saffron understands. Juno stays on the roster, but she doesn\'t look at you for a week.']] },
    },
  },
  {
    id: 'victor-deal', after: 5, title: 'The lift down', place: 'halcyon',
    nodes: {
      start: {
        lines: [['victor', 'smile', 'Walk with me. You run a tight door. I appreciate tight.']],
        next: 'branch',
      },
      branch: { branch: [{ if: { outcome: 'kiki', verdict: 'refuse' }, next: 'kiki' }, { next: 'offer' }] },
      kiki: { lines: [['victor', 'smirk', 'You turned away Kiki Lumen in her trainers. Live. On a stream with two million people.'], ['victor', 'smile', 'Her video got four million views. "Halcyon: too exclusive for Kiki." Bookings doubled. I could kiss you.']], next: 'offer' },
      offer: {
        lines: [['victor', 'neutral', 'Tomorrow, two friends of mine — the Ellisons — will come by. No booking. Wave them through, they\'ll take care of you. Forty each. Cash.'], ['victor', 'smile', 'Everybody does it. The rules are for people who aren\'t friends.']],
        choices: [
          { text: '"Sure. Friends of yours."', set: { victor_deal: true }, next: 'yes' },
          { text: '"No booking, no entry. Same as everyone."', set: { victor_deal: false, victor_cold: true }, next: 'no' },
        ],
      },
      yes: { lines: [['victor', 'smile', 'I knew I liked you.'], [null, null, 'The lift doors close. You still have to decide what to do when they actually show up.']] },
      no: { lines: [['victor', 'stern', 'Pity. Well. A hard no is still an answer. I respect answers.']] },
    },
  },
  {
    id: 'crossroads', after: 6, title: 'Two offers', place: 'street',
    nodes: {
      start: {
        lines: [
          ['kwame', 'neutral', 'Voltage Hall wants us full time. Big room, big money, big headaches. I need someone I trust running the main line.'],
          ['victor', 'smile', 'Or. The Lark & Vane launch party, here on the roof. Head door. Double what Kwame pays, and a seat at a very interesting table.'],
        ],
        choices: [
          { text: 'Go with Kwame to Voltage Hall', set: { career: 'kwame' }, inc: { kwame_trust: 1 }, next: 'kwame' },
          { text: 'Take Victor\'s head-door job', set: { career: 'victor' }, next: 'victor' },
        ],
      },
      kwame: { lines: [['kwame', 'smile', 'Good. Wear earplugs. And bring your eyes — Voltage gets every fake in the city.']] },
      victor: { lines: [['victor', 'smile', 'Excellent. Wear something black. Not that black. Better black.'], ['kwame', 'sad', 'Your call. Just... watch who you\'re working for.']] },
    },
  },
  {
    id: 'nadia', after: 6, title: 'A stranger at the bus stop', place: 'street',
    nodes: {
      start: {
        lines: [
          ['nadia', 'neutral', 'Nadia Ross, Night Ledger. I\'m writing about the fake IDs flooding the city. Very good ones. The kids call the maker "the Printer".'],
          ['nadia', 'neutral', 'Door staff see more than anyone. If you spot a pattern — a hologram, a typeface, a car — I\'d love to know. Off the record.'],
        ],
        choices: [
          { text: '"Deal. Here\'s my number."', set: { nadia_help: true }, next: 'yes' },
          { text: '"I just check cards. Good luck."', set: { nadia_help: false }, next: 'no' },
        ],
      },
      yes: { lines: [['nadia', 'smile', 'Thank you. Be careful who else you mention this to.']] },
      no: { lines: [['nadia', 'neutral', 'Fair enough. My card, in case.']] },
    },
  },
  {
    id: 'kwame-proud', after: 7, if: { flag: 'career', eq: 'kwame' }, title: 'Dawn outside Voltage', place: 'voltage',
    nodes: {
      start: {
        lines: [['kwame', 'smile', 'Two thousand people and not one problem I couldn\'t walk away from. That\'s the job.'], ['kwame', 'neutral', 'Next week\'s the Afterdark night. Licensing will be about. Get your licence sorted if you haven\'t — it pays.']],
      },
    },
  },
  {
    id: 'victor-envelope', after: 7, if: { flag: 'career', eq: 'victor' }, title: 'After the launch', place: 'halcyon',
    nodes: {
      start: {
        lines: [['victor', 'smile', 'Flawless. The council loved it.'], ['victor', 'neutral', 'A little extra. For discretion — about who you saw tonight, and who you didn\'t.'], [null, null, 'He holds out an envelope. It looks like a hundred dollars.']],
        choices: [
          { text: 'Take the envelope', money: 100, inc: { bribes_taken: 1 }, next: 'took' },
          { text: '"Put it on my payslip or keep it."', set: { refused_envelope: true }, next: 'refused' },
        ],
      },
      took: { lines: [['victor', 'smile', 'Good. We understand each other.']] },
      refused: { lines: [['victor', 'stern', 'Suit yourself.'], [null, null, 'He sends you to Voltage Hall next week, "as a favour to a partner". It doesn\'t feel like a favour.']] },
    },
  },
  {
    id: 'varga', after: 8, title: 'A visitor', place: 'voltage',
    nodes: {
      start: {
        lines: [['varga', 'neutral', 'Ilse Varga, City Licensing. Last night we sent a test purchaser to your door. Seventeen, with his older brother\'s card.']],
        choices: [{ text: '"And?"', next: 'branch' }],
      },
      branch: { branch: [{ if: { outcome: 'decoy', correct: true }, next: 'caught' }, { if: { outcome: 'decoy', correct: false }, next: 'missed' }, { next: 'missing' }] },
      caught: {
        lines: [['varga', 'smile', 'You stopped him. Most doors don\'t look past the date of birth.'], ['varga', 'neutral', 'I\'m waiving the fee for your door supervisor licence. People like you should have one.']],
        choices: [{ text: '"Thank you."', grant: 'licence', set: { varga_respect: true }, next: 'benny' }],
      },
      missed: {
        lines: [['varga', 'stern', 'You let him in. That\'s a formal warning on your record and a fine of fifty dollars. Don\'t make me come back.']],
        choices: [{ text: '"Understood."', money: -50, warnings: 1, next: 'benny' }],
      },
      missing: { lines: [['varga', 'neutral', 'He says he never reached the desk — the line was too long. We\'ll try again.']], next: 'benny' },
      benny: { branch: [{ if: { flag: 'benny_loan' }, next: 'repay' }, { next: 'end' }] },
      repay: { lines: [['benny', 'happy', 'Oh — and! Forty dollars. Double, like I said. Benny\'s honour.'], [null, null, 'He got a new job. At a print shop, oddly.']], money: 40 },
      end: { lines: [] },
    },
  },
  {
    id: 'nadia-reveal', after: 9, if: { flag: 'nadia_help' }, title: 'Night Ledger office', place: 'street',
    nodes: {
      start: {
        lines: [
          ['nadia', 'neutral', 'Your tip about the holograms helped. The fakes come from a print shop on Tannery Yard. The lease is held by Lark & Vane.'],
          ['nadia', 'stern', 'The man running it is Theo Lark. Victor\'s younger brother. Underage kids with Theo\'s cards get into old venues, the venues lose their licences, Lark & Vane buy the buildings cheap.'],
          ['nadia', 'neutral', 'Theo likes to see his work tested. He\'ll try the Orchid himself — the charity dinner. If you catch him on a fake, I can print.'],
        ],
      },
    },
  },
  {
    id: 'kwame-rumour', after: 9, if: { not: { flag: 'nadia_help' } }, title: 'Locker room', place: 'orchid',
    nodes: { start: { lines: [['kwame', 'neutral', 'Heard a rumour. The fakes going round — the Printer\'s supposed to be someone with money behind him. Old venues keep losing licences, and the same developer keeps buying them.'], ['kwame', 'stern', 'Tomorrow at the Orchid, check the dates on every card. The good fakes get the dates wrong.']] } },
  },
  {
    id: 'dee-call', after: 10, title: 'A phone call', place: 'home',
    nodes: {
      start: {
        lines: [['dee', 'sad', 'Love. The licence review is Friday — they\'re doing it live, on the night. Lark & Vane have filed a complaint. One slip and I\'m done.'], ['dee', 'neutral', 'It\'s also my farewell party, if it goes wrong. I want you on my door.']],
        choices: [{ text: '"I\'ll be there."', next: 'branch' }],
      },
      branch: { branch: [{ if: { outcome: 'printer', correct: true }, next: 'printer' }, { next: 'end' }] },
      printer: { lines: [[null, null, 'The Night Ledger\'s front page: the Orchid caught a man on a forged card. Police found a print shop full of blank holograms.'], ['dee', 'smile', 'And I hear that was my door supervisor.']] },
      end: { lines: [['dee', 'neutral', 'Get some sleep. Big night.']] },
    },
  },
];

export const ENDINGS = {
  busted: {
    title: 'Busted', tone: 'bad',
    lines: [['varga', 'stern', 'We have the Ellisons on camera handing you cash, and Victor Lark\'s ledgers list your name. Your door licence is revoked.'], [null, null, 'The Lantern survives the night, but you watch the rest from across the street. In this city, word travels.']],
  },
  'lights-out': {
    title: 'Lights Out', tone: 'bad',
    lines: [['varga', 'sad', 'I\'m sorry, Ms Okonjo. The violations tonight are enough. The licence is suspended pending review.'], ['dee', 'sad', 'Fifty years. Well. Pour yourself one, love. On the house — while there still is one.'], [null, null, 'Six weeks later, Lark & Vane hang their sign on the Lantern\'s door.']],
  },
  keeper: {
    title: 'Keeper of the Lantern', tone: 'good',
    lines: [['varga', 'smile', 'Ms Okonjo, your licence is renewed for five years. Frankly, your door is the best in the city.'], ['nadia', 'smile', 'The Night Ledger runs the Printer story on Monday. Lark & Vane\'s building purchases are under investigation.'], ['dee', 'smile', 'Head of door, if you want it. And a share of the bar. Someone has to keep the lights on after I\'m gone.']],
  },
  'last-call': {
    title: 'Last Call', tone: 'mixed',
    lines: [['varga', 'neutral', 'Licence renewed. Clean door tonight, Ms Okonjo.'], ['dee', 'smile', 'We\'re still standing, love. They\'ll be back — they always come back. But so will we.'], [null, null, 'Somewhere in the city, the Printer is still working. But the Lantern\'s light is on.']],
  },
};

export function chooseEnding(player) {
  const f = player.flags;
  if ((f.bribes_taken ?? 0) >= 2) return 'busted';
  if (!f.finale_passed) return 'lights-out';
  if (f.outcomes?.printer?.correct || (f.nadia_help && (f.evidence ?? 0) + player.stats.fakesCaught >= 8)) return 'keeper';
  return 'last-call';
}

export function pendingScenes(player, after) {
  return SCENES.filter(s => s.after === after && !player.seenScenes.includes(s.id) && testCondition(s.if, player.flags, player));
}

// Resolve branch nodes until a node with lines/choices is reached.
export function resolveNode(scene, nodeId, player) {
  let id = nodeId;
  for (let i = 0; i < 10 && id; i++) {
    const n = scene.nodes[id];
    if (!n) return null;
    if (!n.branch) return { id, node: n };
    id = n.branch.find(b => testCondition(b.if, player.flags, player))?.next;
  }
  return null;
}

export function availableChoices(node, player) {
  return (node.choices ?? []).filter(c => testCondition(c.if, player.flags, player));
}

// Apply a choice (or a node's own effects): flags, counters, money, items, warnings.
export function applyEffects(player, fx) {
  if (!fx) return;
  if (fx.set) Object.assign(player.flags, fx.set);
  for (const [k, v] of Object.entries(fx.inc ?? {})) player.flags[k] = (player.flags[k] ?? 0) + v;
  if (fx.money) player.money += fx.money;
  if (fx.grant && !player.owned.includes(fx.grant)) player.owned.push(fx.grant);
  if (fx.warnings) player.warnings += fx.warnings;
}

export function fillName(text, player) { return text.replaceAll('{name}', player.name); }

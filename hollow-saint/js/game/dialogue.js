// Conversations. A dialogue has entry points chosen by conditions and a graph of nodes:
//   node: { lines, next?, choices?, end?, ...effects }   (effects as in script.js)
//   choice: { text, when?, once?, goto?, ...effects }    (no goto: the conversation ends)
// Lines are { who, text, cut? }; `cut` lines are interrupted and advance by themselves.
// The runner functions are pure so every branch can be walked in tests.

import { conditionHolds, applyEffects } from './script.js';
import { ENDINGS } from './endings.js';

const R = text => ({ who: 'Ruth', text });
const CAL = text => ({ who: 'Cal', text });
const P = text => ({ who: 'Price', text });
const E = text => ({ who: 'Elias', text });
const V = text => ({ who: '?', text });
const N = text => ({ who: null, text });
const M = text => ({ who: 'Mara', text });

// Cal's evidence: the right note convinces him; the first wrong one makes him wary, the
// second makes him lock the door and leave (the drain still gets you through)
const evidence = (text, req) => [
  { text, when: { ...req, none: ['cal_strike'] }, set: 'cal_strike', goto: 'wrong' },
  { text, when: { ...req, all: [...(req.all || []), 'cal_strike'] }, set: 'cal_blocks', goto: 'blocks' },
];

export const DIALOGUES = {
  ruth: {
    entry: [{ when: { all: ['met_ruth'] }, node: 'again' }, { node: 'hello' }],
    nodes: {
      hello: { lines: [R("You're the Ward boy."), R('You got old.'), R("Sit if you like. Don't touch the photograph.")], set: 'met_ruth', next: 'menu' },
      again: { lines: [R('You came back. People mostly do.')], next: 'menu' },
      menu: {
        lines: [R('Well?')],
        choices: [
          { text: "I'm looking for Mara.", goto: 'mara' },
          { text: "Mara said you'd have a key.", when: { all: ['read:notebook'], none: ['got_keyring'] }, goto: 'keys' },
          { text: "What is St. Oran's House?", goto: 'house' },
          { text: 'Who is scratched out?', when: { all: ['looked:photo'] }, once: true, goto: 'photo' },
          { text: 'Four, one, seven, three?', when: { count: { 'tape:mara': 1 } }, once: true, goto: 'numbers' },
          { text: 'I should go.' },
        ],
      },
      mara: {
        lines: [R('Mara went off in August.'), R('With the man from the radio station. Blue car. Nice teeth.'), R("She didn't say goodbye. Young people don't.")],
        note: 'account_ruth', next: 'menu',
      },
      keys: {
        lines: [R("She said you'd come."), R("She said you'd read it first, and that's how I'd know it was you."), R("Arne's keys. The road gate, and the lane up to the House."), R("Cal put that chain on the road. I don't know why Cal does anything.")],
        give: 'key_ring', set: 'got_keyring', next: 'menu',
      },
      house: {
        lines: [R('A home for boys, once. Then for nobody.'), R('It closed in fifty-one.'), R('When the saint went quiet.')],
        choices: [{ text: 'Went quiet?', goto: 'quiet' }, { text: 'Something else.', goto: 'menu' }],
      },
      quiet: { lines: [R("You'll want to be going now.")], end: true },
      photo: {
        lines: [R('Nobody.'), R("There's nobody there."), { who: 'Ruth', text: 'There was never anybody standing in that-', cut: true }, N('[ In the kitchen, the kettle starts to scream. Ruth does not get up. ]')],
        sfx: 'kettle', set: 'asked_photo', end: true,
      },
      numbers: {
        lines: [R('Hymn numbers. Mara asked me the same.'), R('Four hundred and seventeen. And three.'), R("There's no hymn four hundred and seventeen."), R('Not yet.')],
        note: 'clue_numbers', next: 'menu',
      },
    },
  },

  cal: {
    entry: [{ when: { all: ['met_cal'] }, node: 'again' }, { node: 'hello' }],
    nodes: {
      hello: { lines: [CAL("Road's closed."), CAL('Oh. Ward. Elias.'), CAL('Sorry about your sister.')], set: 'met_cal', next: 'menu' },
      again: { lines: [CAL('Elias.')], next: 'menu' },
      menu: {
        lines: [CAL('Something you need?')],
        choices: [
          { text: 'What happened to Mara?', goto: 'mara' },
          { text: 'Who chained the road gate?', goto: 'gate' },
          { text: 'Her notebook says October ninth.', when: { all: ['read:notebook', 'heard:cal_mara'] }, once: true, goto: 'notebook' },
          { text: "Ruth gave me Arne's keys.", when: { all: ['got_keyring'] }, once: true, goto: 'keys' },
          { text: 'Never mind.' },
        ],
      },
      mara: {
        lines: [CAL("Nothing happened to her. She left."), CAL('September. I drove her to the Greyhound in Ashby myself.'), CAL("Sat in the back. Didn't say a word the whole way.")],
        note: 'account_cal', set: 'heard:cal_mara', next: 'menu',
      },
      gate: { lines: [CAL('County did.'), CAL('I did. For the county.')], next: 'menu' },
      notebook: {
        lines: [CAL('Then she dated it wrong.'), N("[ He doesn't blink for a long time. ]"), CAL('Go on home, Elias.')],
        set: 'cal_rattled', end: true,
      },
      keys: { lines: [CAL("Ruth's a kind woman."), CAL('A key is a kind of invitation. You know that?')], next: 'menu' },
    },
  },

  price: {
    entry: [{ node: 'hello' }],
    nodes: {
      hello: {
        lines: [P('Elias. Good. You\'re early.'), P("The vestry key is with the Pikes. In the ground. You'll know it when you see it.")],
        choices: [
          { text: 'Who are you?', goto: 'who' },
          { text: 'Is Mara here?', goto: 'mara' },
          { text: 'How do you know my name?', goto: 'name' },
        ],
      },
      who: { lines: [P('Father Anselm Price.'), P("I'll hear your confession on Tuesday."), E("I don't- I'm not in the church anymore."), P('You will be.')], set: 'met_price', end: true },
      mara: {
        lines: [P('Not yet.'), P("She comes on Tuesday. She's always very sorry."), N('[ The wind takes whatever he says next. ]')],
        note: 'account_price', set: 'met_price', end: true,
      },
      name: { lines: [P('You told me.'), P('Next week. You were very upset.')], set: 'met_price', end: true },
    },
  },

  cal_below: {
    entry: [
      { when: { all: ['cal_aside'] }, node: 'aside' },
      { node: 'hello' },
    ],
    nodes: {
      hello: {
        lines: [CAL('Turn around, Elias.'), CAL('I drove her to the bus. You heard me say it.'), CAL('Show me different. Go on.')],
        next: 'menu',
      },
      menu: {
        lines: [CAL('Well?')],
        choices: [
          { text: "Her own page: October ninth.", when: { noted: ['account_notebook'] }, set: ['cal_truth', 'cal_aside'], goto: 'truth' },
          ...evidence('Ruth says August.', { noted: ['account_ruth'] }),
          ...evidence('Price says she comes Tuesday.', { noted: ['account_price'] }),
          ...evidence("There's a grave with her name.", { all: ['found:ward_grave'] }),
          { text: "I've got nothing. Yet." },
        ],
      },
      wrong: { lines: [CAL("That's not proof. That's this town."), CAL('One more like that and I lock this door.')], next: 'menu' },
      blocks: {
        lines: [CAL("That's enough."), N('[ He steps through the door behind him. The lock turns. His footsteps go away down the bones. ]')],
        sfx: 'locked', end: true,
      },
      truth: {
        lines: [N('[ He reads the date twice. ]'), CAL('I drove her here. Not the bus. Here.'), CAL('September. She asked me to tell everybody the bus, so I did, and then I believed it.'), CAL('She went down on her own. I just held the door.'), N('[ He unlocks the door behind him and stands aside. ]')],
        note: 'account_cal_truth', sfx: 'unlock', end: true,
      },
      aside: { lines: [CAL("Go on. I won't be here when you come back up.")], end: true },
    },
  },

  confession: {
    entry: [{ when: { all: ['understood'] }, node: 'after' }, { node: 'hello' }],
    nodes: {
      hello: {
        lines: [P("Tuesday already. Sit down, Elias."), P("You don't have to confess anything. Just answer me one thing."), P('What is the hollow for?')],
        choices: [
          { text: "To take the town's sins.", goto: 'sins' },
          { text: 'To keep something shut below.', goto: 'door' },
          { text: 'So the town can forget them.', goto: 'forget' },
          { text: 'I have to go.' },
        ],
      },
      sins: { lines: [P("That's what we tell the children."), P('Come back when you know.')], end: true },
      door: { lines: [P("That's what it does. Not what it's for."), P('Come back when you know.')], end: true },
      forget: {
        lines: [N('[ A long quiet on his side of the grille. ]'), P('Yes.'), P('Every thirty-six years we give it one of our own, and then we are allowed to forget we did.'), P('You will remember that, at the end. It is the only thing that helps.')],
        set: 'understood', note: 'understood', end: true,
      },
      after: { lines: [P('Go on down. You know what it is now.')], end: true },
    },
  },

  last_prayer: {
    entry: [{ node: 'open' }],
    nodes: {
      open: {
        lines: [
          N('[ The ribbon, the light, the water. The hollow in the saint opens like a mouth. ]'),
          { ...N('[ Ruth is in the front pew. She is saying a name under her breath. Danny. Danny. ]'), when: { all: ['asked_photo'] } },
          { ...N('[ Cal stands at the back with his hat in his hands. He is the only one not singing. ]'), when: { all: ['cal_truth'] } },
          V('Elias.'),
          M("Eli? You came. You weren't supposed to come."),
          M("It's all right. It doesn't hurt. You just stop being anybody."),
        ],
        choices: [
          { text: 'Run.', goto: 'dawn' },
          { text: 'Take me instead.', goto: 'hollow' },
          { text: 'Read the names out loud.', when: ENDINGS.names.requires, goto: 'names' },
          { text: 'Pray it the way she meant it.', when: ENDINGS.last_prayer.requires, goto: 'last' },
        ],
      },
      dawn: { lines: [M('Go, then.'), N('[ You run. Behind you the singing does not even falter. ]')], ending: 'dawn', end: true },
      hollow: { lines: [M('Eli, no-'), N('[ You climb into the saint. It is warm, and it fits. ]')], ending: 'hollow', end: true },
      names: { lines: [N('[ You open the Register and read, loud, over the singing: ]'), E('Amos Hollis. Margaret Pike. Daniel Halvorsen. Mara Ward.'), N('[ The singing stops. ]')], ending: 'names', end: true },
      last: { lines: [E('Saint Oran, hollow one, take what we carry.'), E('Empty us as you were emptied, and keep the door below shut-'), E('-and give them back.'), N('[ Something enormous, very far down, lets go. ]')], ending: 'last_prayer', end: true },
    },
  },

  phone: {
    entry: [{ node: 'hello' }],
    nodes: {
      hello: {
        lines: [N('[ Static. Then a room, somewhere big. ]'), V("...Eli? Is it running? I can't tell if it's running.")],
        set: 'phone_answered', clear: 'phone_ringing',
        choices: [{ text: 'Mara?', goto: 'mara' }, { text: 'Who is this?', goto: 'who' }],
      },
      mara: { lines: [V("Don't come to the House on Sunday."), { who: '?', text: "Don't let them fill the-", cut: true }, N('[ Dial tone. ]')], sfx: 'sting', end: true },
      who: { lines: [N('[ Breathing. ]'), V('You know who.'), N('[ Dial tone. ]')], end: true },
    },
  },
};

// ---- the runner ----------------------------------------------------------------------------

export function entryNode(id, state) {
  const d = DIALOGUES[id];
  if (!d) return null;
  return (d.entry.find(e => conditionHolds(e.when, state, null)) || d.entry[d.entry.length - 1]).node;
}

const choiceFlag = (id, node, i) => `chose:${id}.${node}.${i}`;

// enter a node: apply its effects, return what to show
export function enterNode(id, nodeId, state) {
  const node = DIALOGUES[id].nodes[nodeId];
  if (!node) throw new Error(`dialogue ${id} has no node ${nodeId}`);
  applyEffects(node, state);
  const choices = (node.choices || [])
    .map((c, i) => ({ ...c, i }))
    .filter(c => conditionHolds(c.when, state, null) && !(c.once && state.flags.has(choiceFlag(id, nodeId, c.i))));
  return {
    lines: node.lines.filter(l => !l.when || conditionHolds(l.when, state, null)).map(({ when, ...l }) => l),
    ending: node.ending || null,
    choices: choices.map(c => ({ text: c.text, i: c.i })),
    next: node.end ? null : node.next || null,
    sfx: node.sfx || null,
    flash: node.flash || null,
  };
}

// pick choice number `i` (the index in the node's own list); returns the next node or null
export function choose(id, nodeId, i, state) {
  const c = DIALOGUES[id].nodes[nodeId].choices[i];
  applyEffects(c, state);
  state.flags.add(choiceFlag(id, nodeId, i));
  return c.goto || null;
}

// Conversations. A dialogue has entry points chosen by conditions and a graph of nodes:
//   node: { lines, next?, choices?, end?, ...effects }   (effects as in script.js)
//   choice: { text, when?, once?, goto?, ...effects }    (no goto: the conversation ends)
// Lines are { who, text, cut? }; `cut` lines are interrupted and advance by themselves.
// The runner functions are pure so every branch can be walked in tests.

import { conditionHolds, applyEffects } from './script.js';

const R = text => ({ who: 'Ruth', text });
const CAL = text => ({ who: 'Cal', text });
const P = text => ({ who: 'Price', text });
const E = text => ({ who: 'Elias', text });
const V = text => ({ who: '?', text });
const N = text => ({ who: null, text });

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
        sfx: 'kettle', end: true,
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
    lines: node.lines.slice(),
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

// Special incidents that interrupt a shift. The timer pauses while the player chooses; each choice
// has fixed, visible consequences.
//   time: seconds of shift clock used up      patience: added to everyone waiting
//   money: dollars (paycheck)                 walk: guests at the back who give up
//   rating: points on the shift rating        flags / inc: story flags
//   patienceRate: queue patience drains this much faster for the rest of the shift

export const INCIDENTS = {
  spill: {
    title: 'Pint down', who: 'gus',
    text: 'Gus, leaving for a smoke, trips on the step and sends a full pint across the doorway. The queue groans; someone\'s shoes are soaked.',
    choices: [
      { label: 'Grab the mop and sort it', result: 'Two minutes with a mop. Dee nods from the bar.', effects: { time: 12, inc: { dee_trust: 1 } } },
      { label: 'Kick the glass aside and keep checking', result: 'The line shuffles round the puddle, grumbling.', effects: { patience: -12 } },
    ],
  },
  fight: {
    title: 'Shoving in the line', who: null,
    text: 'Two lads near the back start pushing each other over who was there first. Phones come out.',
    choices: [
      { label: 'Talk them down', requires: 'deescalation', result: 'You split them with a joke and a firm hand. The line actually applauds.', effects: { time: 8, patience: 20, rating: 2 } },
      { label: 'Step in and separate them', result: 'Done, but loud. One storms off; the rest of the line is rattled.', effects: { time: 15, patience: -10, walk: 1 } },
      { label: 'Radio Kwame for backup', result: 'Kwame strolls out, says one sentence, and it\'s over. It took a while.', effects: { time: 25, inc: { kwame_trust: 1 } } },
      { label: 'Ignore it', result: 'It spills into the street. Two people give up and leave; Saffron is not pleased.', effects: { walk: 2, money: -10, patience: -15 } },
    ],
  },
  press: {
    title: 'Photographers', who: 'victor',
    text: 'Three photographers have followed Kiki Lumen\'s stream to the door and are blocking the line for shots.',
    choices: [
      { label: 'Move them politely to the kerb', result: 'Cameras on the kerb, line moving. Victor gives you a thumbs-up from the lift.', effects: { time: 10, inc: { victor_rep: 1 } } },
      { label: 'Let them shoot — it\'s good publicity', result: 'The line stalls behind the flashbulbs.', effects: { patience: -20 } },
    ],
  },
  rain: {
    title: 'Downpour', who: null,
    text: 'The sky opens. Thirty-one floors up the bar is dry; down here the queue is not.',
    choices: [
      { label: 'Hand out umbrellas from lost property', result: 'Mismatched umbrellas all round. Spirits lift a little.', effects: { time: 10, patience: 15, patienceRate: 1.25 } },
      { label: 'Keep the line moving', result: 'Wet and miserable, the line gets shorter-tempered.', effects: { patienceRate: 1.6 } },
    ],
  },
  'victor-call': {
    title: 'Victor on the radio', who: 'victor',
    text: '"The Ellisons are coming up the street. Brock and Tamsin. No booking — you remember our arrangement." The radio clicks off.',
    choices: [{ label: 'Noted', result: 'Your call to make. The rulebook hasn\'t changed.', effects: {} }],
  },
  inspector: {
    title: 'Someone\'s watching', who: 'kwame',
    text: 'Kwame, low: "Grey Volvo across the road. Licensing. They send in decoys — kids with borrowed cards. Do it by the book."',
    choices: [{ label: 'By the book', result: 'You straighten up.', effects: {} }],
  },
  medical: {
    title: 'Collapse in the queue', who: null,
    text: 'A young woman near the front goes pale and sinks to the pavement. Her friends panic.',
    choices: [
      { label: 'Recovery position, check her airway', requires: 'first-aid', result: 'She comes round quickly — dehydrated, nothing worse. Her friends can\'t thank you enough.', effects: { time: 15, rating: 3, patience: 10, inc: { good_samaritan: 1 } } },
      { label: 'Call an ambulance and wait with her', result: 'The paramedics take twenty minutes. The line waits, mostly patiently.', effects: { time: 30, patience: 5 } },
      { label: 'Tell her friends to deal with it', result: 'Someone films you. Management fines you for the complaint.', effects: { money: -40, patience: -10, rating: -3 } },
    ],
  },
  power: {
    title: 'Lights out', who: null,
    text: 'The street\'s power flickers and dies. The Orchid\'s brass lamp goes dark; the queue stands in near-blackness.',
    choices: [
      { label: 'Phone torch, keep working', result: 'Squinting at cards by phone light until the power returns.', effects: { time: 10 } },
      { label: 'Pause entry until the lights are back', result: 'Safe, slow. The line gets restless.', effects: { time: 25, patience: -10 } },
    ],
  },
  'juno-assist': {
    title: 'Juno shows up', who: 'juno',
    text: 'Juno appears at your shoulder in her Sump jacket. "Heard it\'s the big night. You covered for me once. I\'ll work the line."',
    choices: [{ label: 'Welcome aboard', result: 'Juno walks the queue, answering questions and handing out water. Everyone calms down.', effects: { patience: 45 } }],
  },
  'printer-crew': {
    title: 'A familiar car', who: 'kwame',
    text: 'Kwame texts: "Black hatchback dropping off kids two streets away. Same car as outside the Orchid. Expect very good fakes."',
    choices: [
      { label: 'Tell Nadia', requires: { flag: 'nadia_help' }, result: 'Nadia is already on her way with a photographer.', effects: { inc: { evidence: 1 } } },
      { label: 'Eyes on every card', result: 'You take a breath and slow down.', effects: {} },
    ],
  },
};

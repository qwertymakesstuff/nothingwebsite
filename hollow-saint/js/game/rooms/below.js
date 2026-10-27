// Under Bellwether: the maintenance passage that joins Pike's cellar, Halvorsen's storeroom
// and the chapel undercroft. See index.js for the room format.

export const BELOW = {
  passages: {
    name: 'The Low Passage',
    ambience: 'passages',
    ambient: 0,
    light: 44,
    mapPos: [0, 3],
    under: true,
    map: [
      '################################################',
      '#KKKKKKKKKKKKKKKKKKLLKKKKKKKKKKKKKKKKKKKKKKKKKK#',
      '#KKKKKKKKKKKKKKKKKKLLKKKKKKKKKKKKKKKKKKKKKKKKKK#',
      '#KKKKKKKKKKKKKKKKKKLLKKKKKKKKKKKKKKKKKKKKKKKKKK#',
      'nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn',
      'nnnnnnnnnnnnnnnnnnnnnnnnn~~nnnnnnnnnnnnnnnnnnnnn',
      'nnnnnn~~nnnnnnnnnnnnnnnnnn~nnnnnnnnnnnnnnnnnnnnn',
      'nnnnnnnnnnnnn~nnnnnnnnnnnnnnnnnnnnnnnnnnn~nnnnnn',
      'nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn',
      '###################################nn###########',
      '###################################nn###########',
      '###################################nn###########',
      '################################################',
    ],
    spawns: { from_cellar: [1.8, 6.6, 'right'], from_hatch: [19.9, 5.4, 'down'], from_undercroft: [45.8, 6.6, 'left'] },
    exits: [
      { x: 0, y: 4, w: 1, h: 5, to: 'caretaker_cellar', spawn: 'from_passages' },
      {
        x: 47, y: 4, w: 1, h: 5, to: 'chapel_nave', spawn: 'from_undercroft',
        lock: { flag: 'undercroft_open', locked: [{ say: ['A door, bolted from the other side.', 'Through the gap at the bottom: candlelight, and the smell of hot wax.'] }] },
      },
    ],
    entities: [
      { id: 'pass_hollow', type: 'hollow', x: 29, y: 6.5 },
      { id: 'kneeler', type: 'penitent', x: 36, y: 9.3 },
      { id: 'pass_edge', type: 'edge', x: 44, y: 5 },
    ],
    props: [
      {
        id: 'ladder', x: 19, y: 1, w: 2, h: 3, zone: [0, 0, 16, 36],
        script: [
          { when: { all: ['hatch_open'] }, say: ["The ladder up to Halvorsen's."], go: { to: 'store_room', spawn: 'from_hatch' } },
          {
            say: ['A ladder up to a wooden hatch. From this side, a plank is wedged across it.', 'You knock the plank loose and push. Above, the padlock swings free: it was hooked through the hasp, never closed.', "[ A way between the passages and Halvorsen's storeroom is open. ]"],
            set: 'hatch_open', sfx: 'unlock',
          },
        ],
      },
      { id: 'pipes_a', sprite: 'pipes', x: 4, y: 2.4 },
      { id: 'pipes_b', sprite: 'pipes', x: 29, y: 2.4 },
      {
        id: 'names', x: 10, y: 3, w: 2, h: 1, zone: [0, -4, 16, 24],
        script: [
          { when: { times: 0 }, say: ['Names scratched into the brick at knee height. Dozens. Children\'s handwriting.', 'The newest says MARA. It is at the height of a grown woman\'s knee.'], set: 'found:names' },
          { say: ['MARA, among the others.'] },
        ],
      },
      {
        id: 'page2', sprite: 'page', x: 35.4, y: 10.4, when: { none: ['found:page2'] },
        script: [{ say: ['A page, pressed flat against the wet floor of the alcove.', "Mara's handwriting."], give: 'page2', doc: 'page2', set: 'found:page2' }],
      },
    ],
  },
};

// The road outside Bellwether: where the car died, the shrine, and Halvorsen's station.
// See index.js for the room format.

export const ROAD = {
  forest_path: {
    name: 'Bellwether Road',
    ambience: 'forest',
    ambient: 0.05,
    light: 62,
    map: [
      'TTTTTTTTTTTTT====TTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTT====TTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTT====TTTTTTTTTTTTTTT',
      'TTTTTTTTTTTFFGGGGFFTTTTTTTTTTTTT',
      'TTTTTTTTTTT..====..TTTTTTTTTTTTT',
      'TTTTTTTTTT...====...TTTTTTTTTTTT',
      'TTTTTTTTT....====....TTTTTTTTTTT',
      'TTTTTTTTT.,..====....RRRRRRRRTTT',
      'TTTTTTTT.....====....RRRRRRRRTTT',
      'TTTTTTTT..,..====....BBWBBwBBTTT',
      'TTTTTTTT.....====....BBBBDBBBTTT',
      'TTTTTTTTT....====.........,..TTT',
      'TTTTTTTTTT...====..........TTTTT',
      'TTTTTTTTTTT..====......TTTTTTTTT',
      'TTTTTTTTTTT..====..TTTTTTTTTTTTT',
      'TTTTTTTTTTTT.====..TTTTTTTTTTTTT',
      'TTTTTTTTTTTT..====.TTTTTTTTTTTTT',
      'TTTTTTTTTTTT..====..TTTTTTTTTTTT',
      'TTTTTTTTTTTTT..====.TTTTTTTTTTTT',
      'TTTTTTTTTTTTT..====..TTTTTTTTTTT',
      'TTTTTTTTTTTTT,.====...TTTTTTTTTT',
      'TTTTTTTTTTTT...====....TTTTTTTTT',
      'TTTTTTTTTTTT...====.....TTTTTTTT',
      'TTTTTTTTTTTT...====......TTTTTTT',
      'TTTTTTTTTTTT...====:::::::::::::',
      'TTTTTTTTTTTT...====.,:::::::::::',
      'TTTTTTTTTTTT...====....TTTTTTTTT',
      'TTTTTTTTTTTT...====...TTTTTTTTTT',
      'TTTTTTTTTTTTT..====..TTTTTTTTTTT',
      'TTTTTTTTTTTTT..====..TTTTTTTTTTT',
      'TTTTTTTTTTTT..====..TTTTTTTTTTTT',
      'TTTTTTTTTTTT..====..TTTTTTTTTTTT',
      'TTTTTTTTTTT..====...TTTTTTTTTTTT',
      'TTTTTTTTTT,..====..TTTTTTTTTTTTT',
      'TTTTTTTTTT...====..TTTTTTTTTTTTT',
      'TTTTTTTTT....====...TTTTTTTTTTTT',
      'TTTTTTTT.....====....TTTTTTTTTTT',
      'TTTTTTT..,...====.....TTTTTTTTTT',
      'TTTTTTT......====....TTTTTTTTTTT',
      'TTTTTTTT.....====...TTTTTTTTTTTT',
      'TTTTTTTTTT...====..TTTTTTTTTTTTT',
      'TTTTTTTTTTT..====..TTTTTTTTTTTTT',
      'TTTTTTTTTTT..====...TTTTTTTTTTTT',
      'TTTTTTTTTTT...====..TTTTTTTTTTTT',
      'TTTTTTTTTTT...====...TTTTTTTTTTT',
      'TTTTTTTTTT....====....TTTTTTTTTT',
      'TTTTTTTTT.....====.....TTTTTTTTT',
      'TTTTTTTTT..,..====......TTTTTTTT',
      'TTTTTTTT......====......TTTTTTTT',
      'TTTTTTTT......====.......TTTTTTT',
      'TTTTTTTT...,..====.......TTTTTTT',
      'TTTTTTTT......====......TTTTTTTT',
      'TTTTTTTTT.....====.....TTTTTTTTT',
      'TTTTTTTTTT....====....TTTTTTTTTT',
      'TTTTTTTTTTT...====...TTTTTTTTTTT',
      'TTTTTTTTTTTT..====..TTTTTTTTTTTT',
    ],
    spawns: {
      start: [16, 52.5, 'up'],
      house_door: [25.5, 11.8, 'down'],
      from_shrine: [29.5, 25.5, 'left'],
      from_row: [15, 1.7, 'down'],
    },
    mapPos: [3, 4],
    overrides: [{ when: { all: ['gate_open'] }, x: 13, y: 3, w: 4, ch: '=' }],
    onEnter: [{ id: 'hint_start', once: true, say: ['[ WASD or arrows to walk. E to look at things. Tab opens your pockets. ]'] }],
    exits: [
      { x: 13, y: 0, w: 4, h: 1, to: 'mill_row', spawn: 'from_gate' },
      { x: 25, y: 10, w: 1, h: 1, to: 'station_hall', spawn: 'from_outside', sfx: 'door' },
      { x: 31, y: 24, w: 1, h: 2, to: 'shrine', spawn: 'from_path' },
    ],
    triggers: [
      {
        id: 'south_road', x: 12, y: 54.6, w: 8, h: 1.4,
        script: [
          { when: { times: 0 }, say: ['The road runs twelve miles back to the highway.', 'Not on foot. Not tonight.'] },
          { say: ['Twelve miles.'] },
        ],
      },
    ],
    props: [
      {
        id: 'car', sprite: 'car', x: 18.5, y: 47, solid: [0, 2, 16, 21],
        script: [
          { when: { times: 0 }, say: ['Your car. It died on the grade a mile back and coasted the rest of the way here.', 'The radio still hisses when you lean in. No station. Just room tone, like somebody holding their breath.'] },
          { say: ['Still dead. The hiss has stopped.'] },
        ],
      },
      {
        id: 'marker', sprite: 'marker', x: 11.6, y: 43, solid: [0, 7, 4, 3],
        script: [
          { when: { times: 0 }, say: ['A mile marker. BELLWETHER 1.'] },
          { say: ['Someone has scratched a second 1 beside it, then scratched that out.'] },
        ],
      },
      {
        id: 'pump', sprite: 'pump', x: 19, y: 8.6, solid: [0, 11, 8, 7],
        script: [
          { when: { times: 0 }, say: ['A gas pump. The price wheels stopped at 0.89.', 'The glass is clean. Nothing else here is.'] },
          { say: ['0.89.'] },
        ],
      },
      {
        id: 'boarded', x: 23, y: 9, w: 1, h: 1, zone: [-2, 0, 12, 15],
        script: [{ say: ['Boards across the window. The nails were driven from the inside.'] }],
      },
      {
        id: 'red_window', sprite: 'red_window', x: 26.125, y: 9.125, glow: true, zone: [-2, 0, 10, 14], anim: 20,
        script: [
          { when: { times: 0 }, say: ['A red light behind the glass, low to the floor.', 'It does not flicker like fire does.'] },
          { say: ['Still there.'] },
        ],
      },
      {
        id: 'gate', sprite: 'chain', x: 13, y: 3, zone: [0, 0, 32, 18],
        alt: [{ when: { all: ['gate_open'] }, sprite: 'chain_open' }],
        script: [
          { when: { all: ['gate_open'] }, say: ['The gate stands open. The chain lies in the ditch where you threw it.'] },
          { when: { has: ['key_ring'] }, say: ["Arne's keys. The third one fits.", 'The padlock opens like it was waiting to. The chain slides off into the ditch.'], set: 'gate_open', sfx: 'unlock' },
          {
            when: { times: 0 },
            say: ['The road gate into Bellwether.', 'Someone has wrapped it in chain and hung a new padlock. The gate has rusted for twenty years. The chain is from this week.'],
            sfx: 'locked', set: ['saw_gate'],
          },
          { when: { times: 1 }, say: ['Locked. The town is just past the trees.', 'Somewhere a dog is barking. It stops when you listen for it.'], sfx: 'locked' },
          { say: ['Locked.'], sfx: 'locked' },
        ],
      },
    ],
  },

  shrine: {
    name: 'Roadside Shrine',
    ambience: 'shrine',
    ambient: 0.06,
    light: 62,
    map: [
      'TTTTTTTTTTTTTTTTTTTTTTTT::TTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTT::TTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTT.::TTTTTT',
      'TTTTTTTTTTTTT,......,TT.::TTTTTT',
      'TTTTTTTTTTT...++++++....::TTTTTT',
      'TTTTTTTTT,....++++++....::TTTTTT',
      'TTTTTTTT......++++++......TTTTTT',
      'TTTTTTT.......++++++.......TTTTT',
      'TTTTTTT....,..++++++..,....TTTTT',
      'TTTTTT.........++++.........TTTT',
      'TTTTTT..........++..........TTTT',
      ':::::::::...................TTTT',
      ':::::::::......,............TTTT',
      'TTTTTT..........,...........TTTT',
      'TTTTTTT.....................TTTT',
      'TTTTTTT....................TTTTT',
      'TTTTTTTT..................TTTTTT',
      'TTTTTTTTT......,.........TTTTTTT',
      'TTTTTTTTTT..............TTTTTTTT',
      'TTTTTTTTTTTT..........TTTTTTTTTT',
      'TTTTTTTTTTTTTT......TTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    spawns: { from_path: [2.5, 12.5, 'right'], from_woods: [24.9, 2.7, 'down'] },
    mapPos: [4, 4],
    exits: [
      { x: 0, y: 11, w: 1, h: 2, to: 'forest_path', spawn: 'from_shrine' },
      { x: 24, y: 0, w: 2, h: 1, to: 'woods', spawn: 'from_shrine' },
    ],
    props: [
      {
        id: 'saint', sprite: 'shrine', x: 15, y: 3, solid: [0, 27, 32, 13], zone: [0, 20, 32, 26],
        script: [
          { when: { times: 0 }, say: ['A roadside shrine. The saint inside has no face, only smooth stone where one was worn away.', 'Its chest has been hollowed out. The edges are clean. Tool marks.'] },
          { when: { times: 1 }, say: ['You drove this road every summer as a boy.', 'You don\'t remember a shrine.'] },
          { say: ['The hollow is deeper than the stone is thick.'] },
        ],
      },
      {
        id: 'candles', sprite: 'candles_unlit', x: 16.25, y: 8.1, zone: [-2, -2, 18, 14],
        alt: [{ when: { all: ['shrine_lit'] }, sprite: 'candles_lit', anim: 9, light: { r: 46, dx: 7, dy: 2, flicker: true } }],
        script: [
          {
            when: { none: ['shrine_lit'] },
            say: ['Three tallow stubs and a votive in red glass. Your lighter still works.', 'The wicks take. The red glass throws your shadow up into the trees, and for a moment it is much too tall.', '[ Progress saved. ]'],
            set: ['shrine_lit'], sfx: 'candle', flash: 'red', save: true, heal: true,
          },
          { say: ['The candles burn without getting any shorter. You stand in their light until your hands stop shaking.', '[ Progress saved. Wounds tended. ]'], sfx: 'save', save: true, heal: true },
        ],
      },
      {
        id: 'bowl', sprite: 'bowl', x: 11, y: 9.4,
        script: [
          { when: { times: 0 }, say: ['An offering bowl. Pennies, a church key, a blue hair ribbon.', 'Under the pennies, a prayer card.'], give: 'prayer_card', doc: 'prayer_card' },
          { when: { none: ['found:ribbon'] }, say: ['The ribbon is newer than anything else in the bowl.', 'Mara wore her hair tied back in blue. Everybody does.'], set: 'found:ribbon' },
          { say: ['Pennies. A church key. The ribbon.'] },
        ],
      },
      {
        id: 'sign', sprite: 'sign', x: 21.5, y: 14,
        script: [
          { when: { times: 0 }, say: ['A sign lying face down. You turn it over.', 'ST. ORAN\'S HOUSE. VISITORS BY APPOINTMENT.'], set: ['read_oran_sign'] },
          { say: ['There was an arrow under the words. Someone burned it out.'] },
        ],
      },
    ],
  },

  station_hall: {
    name: "Halvorsen's Station",
    ambience: 'interior',
    ambient: 0,
    light: 54,
    map: [
      '####################',
      '#HHHHHHHHHHHHHHHHHH#',
      '#HHHHHHHHHHHHHHHHHH#',
      '#__________________#',
      '#__________________#',
      '#__________________#',
      '#___________________',
      '#___________________',
      '#__________________#',
      '#__________________#',
      '########d###########',
    ],
    spawns: { from_outside: [8.5, 9.5, 'up'], from_store: [17.5, 7.5, 'left'] },
    mapPos: [2, 4],
    // once Mara's page has been read, the dead payphone rings
    onEnter: [{ id: 'phone_rings', when: { all: ['read:notebook'], none: ['phone_answered', 'phone_ringing'] }, set: 'phone_ringing' }],
    ringing: 'phone_ringing',
    exits: [
      { x: 8, y: 10, w: 1, h: 1, to: 'forest_path', spawn: 'house_door', sfx: 'door' },
      { x: 19, y: 6, w: 1, h: 2, to: 'store_room', spawn: 'from_hall' },
    ],
    props: [
      {
        id: 'counter', sprite: 'counter', x: 2, y: 3.6, solid: [0, 5, 40, 11],
        script: [
          { when: { times: 0 }, say: ['The register drawer hangs open. Empty, except for a church bulletin.', 'It is dated next Sunday.'], doc: 'bulletin' },
          { say: ['Next Sunday\'s hymn is number 412. The hymnal you grew up with stops at 400.'] },
        ],
      },
      {
        id: 'calendar', sprite: 'calendar', x: 3.5, y: 1.2, zone: [-3, 0, 14, 26],
        script: [
          { when: { times: 0 }, say: ['A feed-store calendar. October, 1987.', 'Every day has been crossed off. Including the ones that haven\'t happened yet.'] },
          { say: ['The last X is darker than the others.'] },
        ],
      },
      {
        id: 'payphone', sprite: 'payphone', x: 8, y: 1.2, zone: [-2, 0, 12, 28],
        script: [
          { when: { all: ['phone_ringing'] }, say: ['It is ringing. The cord is cut. It is ringing anyway.', 'You pick the handset up off the floor.'], talk: 'phone', sfx: 'phone_pickup' },
          { when: { all: ['phone_answered'], none: ['looked:phone_after'] }, say: ['The handset is cold. The cut end of the cord is wet.'], set: 'looked:phone_after' },
          { when: { times: 0 }, say: ['A payphone. The cord has been cut clean through. The handset lies on the floor.'] },
          { when: { times: 1 }, say: ['You lift the handset anyway.', 'Nothing.', 'Then, very faint, a dial tone.'], sfx: 'sting' },
          { say: ['Nothing.'] },
        ],
      },
      {
        id: 'shelves', sprite: 'shelves', x: 11, y: 1.5, solid: [0, 12, 48, 8],
        script: [
          { when: { times: 0 }, say: ['Motor oil. Canned peaches. A box of votive candles.', 'Everything is under a skin of dust, except the candles.'] },
          { say: ['Some of the votives are missing.'] },
        ],
      },
      {
        id: 'window_in', sprite: 'boards', x: 17.6, y: 1.3, zone: [-2, 0, 16, 24],
        script: [{ say: ['From in here you can see the nail points were bent over flat, so no one could pry the boards off from outside.'] }],
      },
      {
        id: 'footprints', sprite: 'footprints', x: 12, y: 6.7,
        script: [
          { when: { times: 0 }, say: ['Footprints in the dust, going toward the back. Bare feet. Small.'] },
          { say: ['They only go in.'] },
        ],
      },
      { id: 'cans', sprite: 'cans', x: 9.2, y: 8.2 },
    ],
  },

  store_room: {
    name: 'Storeroom',
    ambience: 'interior',
    ambient: 0,
    light: 50,
    map: [
      '##############',
      '#HHHHHHHHHHHH#',
      '#HHHHHHHHHHHH#',
      '#____________#',
      '_____________#',
      '_____________#',
      '#____________#',
      '#____________#',
      '#____________#',
      '##############',
    ],
    spawns: { from_hall: [2.5, 5.5, 'right'], from_hatch: [6.2, 5.8, 'down'] },
    mapPos: [1, 4],
    exits: [{ x: 0, y: 4, w: 1, h: 2, to: 'station_hall', spawn: 'from_store' }],
    // the cot cools down the first time you come back after touching it
    onEnter: [{ id: 'cot_cools', when: { all: ['cot_warm'], none: ['cot_cold'] }, set: ['cot_cold'] }],
    props: [
      {
        id: 'cot', sprite: 'cot', x: 9, y: 5.9, solid: [0, 3, 32, 8],
        script: [
          {
            when: { none: ['cot_warm'] },
            say: ['A camp cot. A blanket pushed back.', 'You put your hand on it. It\'s still warm.', 'Under the cot, half under the blanket: a page torn out of a spiral notebook.', 'You know the handwriting before you read a word of it.'],
            set: ['cot_warm'], give: 'notebook', doc: 'notebook', note: 'account_notebook',
          },
          { when: { all: ['cot_cold', 'looked:cot_after'] }, say: ['Cold.'] },
          { when: { all: ['cot_cold'] }, say: ['The blanket is cold now.', 'It was warm. You are sure it was warm.'], set: ['looked:cot_after'] },
          { say: ['Still warm. The room is not.'] },
        ],
      },
      {
        id: 'tape', sprite: 'tapeDeck', x: 10.2, y: 1.9, solid: [0, 8, 14, 6], zone: [-2, 0, 18, 22],
        script: [
          { when: { times: 0 }, say: ['A battery tape deck on a crate. The cassette door is open. Empty.'] },
          { say: ['The batteries are fresh.'] },
        ],
      },
      { id: 'tape_light', sprite: 'tape_light', x: 11.5, y: 2.6, glow: true, anim: 40 },
      {
        id: 'circle', sprite: 'circle', x: 2.6, y: 6.1,
        script: [
          { when: { times: 0 }, say: ['Candle stubs in a ring on the floor, burned down to puddles.', 'Inside the ring the boards have been swept clean.'] },
          { when: { times: 1 }, say: ['Seven candles.', 'You count again. Eight.'] },
          { say: ['Seven.'] },
        ],
      },
      {
        id: 'hatch', sprite: 'hatch', x: 5.2, y: 3.2,
        alt: [{ when: { all: ['hatch_open'] }, sprite: 'hatch_open' }],
        script: [
          { when: { all: ['hatch_open'] }, say: ['The hatch hangs open. A ladder goes down into the cold.'], go: { to: 'passages', spawn: 'from_hatch', sfx: 'door' } },
          { when: { times: 0 }, say: ['A trapdoor with a new padlock. Cold air comes up through the gaps, and a smell like wet stone.'], sfx: 'locked', set: ['saw_hatch'] },
          { say: ['Locked. Something underneath settles, the way an old house settles.'], sfx: 'locked' },
        ],
      },
    ],
  },
};


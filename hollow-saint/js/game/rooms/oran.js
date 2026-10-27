// St. Oran's House: the lane, the chapel, the burying ground, and the caretaker's house.
// See index.js for the room format.

const grave = (x, y) => ({ id: `grave_${x}_${y}`, sprite: 'grave', x, y, solid: [1, 6, 6, 4] });

export const ORAN = {
  oran_lane: {
    name: "St. Oran's House",
    ambience: 'chapel_out',
    ambient: 0.05,
    light: 62,
    mapPos: [3, 2],
    map: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTrrrrrrrrrrrrrrrrTTTTTTTTTTTT',
      'TTTTTTTT....rrrrrrrrrrrrrrrr.....i,,,,TT',
      'TTTTTTTT....rrrrrrrrrrrrrrrr.....i,,,,TT',
      'TTTTTTTT....rrrrrrrrrrrrrrrr..,..i,,,,TT',
      'TTTTTTTT.....SSSSSSSSSSSSSS......i,,,,TT',
      'TTTTTTTT.....SSSSSSSSSSSSSS......i,,,,TT',
      'TT...........SSSSSSSSSSSSSSrrrr..i,,,,TT',
      'TT...........SSvSSSSSSSSvSSrrrr..i,,,,TT',
      'TT...........SSSSSSSSSSSSSSrrrr..i,,,,TT',
      'TT..,........SSvSSSSSSSSvSSSSSS..i,,,,TT',
      'TT...........SSSSSSXXSSSSSSSDSS..i,,,,TT',
      'TT................====......:....i,,,,TT',
      'TT................====:::::::....i,,,,TT',
      'TT.RRRRRRRR.......====...........i,,,,TT',
      'TT.RRRRRRRR.......====...........i,,,,TT',
      'TT.RRRRRRRR.......====...........i,,,,TT',
      'TT.BBWBBBWB.......====...........i,,,,TT',
      'TT.BBBDBBBB.......====............,,,,TT',
      'TT....:...........====............,,,,TT',
      'TT.....:::::::::::====::::::::::::,,,,TT',
      'TT................====::::::::::::,,,,TT',
      'TTTTTTTT......,...====......TTTT.i,,,,TT',
      'TTTTTTTT..........====......TTTT.i,,,,TT',
      'TTTTTTTT.,........====....,.TTTT.i,,,,TT',
      'TTTTTTTT..........====......TTTT.i,,,,TT',
      'TTTTTTTT..........====......TTTT.i,,,,TT',
      'TTTTTTTTTTTTTTTTTT====TTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTT====TTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTT====TTTTTTTTTTTTTTTTTT',
    ],
    events: [{ id: 'chapel_dark', on: 'enter', delay: 30, when: { chapter: 2 }, lights: { mode: 'out', t: 90 }, sfx: 'bell', say: ['Every window in the chapel goes dark at once.', 'Then, one at a time, they light again.'] }],
    spawns: {
      from_row: [20, 26.6, 'up'],
      vestry_door: [28.5, 12.8, 'down'],
      care_door: [6.5, 19.7, 'down'],
      from_cemetery: [31.6, 19, 'left'],
    },
    exits: [
      { x: 18, y: 29, w: 4, h: 1, to: 'mill_row', spawn: 'from_lane' },
      {
        x: 28, y: 11, w: 1, h: 1, to: 'chapel_nave', spawn: 'from_vestry', sfx: 'door',
        lock: {
          flag: 'vestry_open', key: 'vestry_key',
          open: ["The little green key turns as if it's been oiled. The vestry door opens inward onto dark."],
          locked: [{ say: ['The vestry door. Locked.', 'Through the keyhole: candlelight.'] }],
        },
      },
      { x: 6, y: 18, w: 1, h: 1, to: 'caretaker_house', spawn: 'from_lane', sfx: 'door' },
      {
        x: 33, y: 18, w: 1, h: 2, to: 'cemetery', spawn: 'from_lane',
        lock: {
          flag: 'cemetery_open', key: 'cemetery_key',
          open: ['The long iron key. The cemetery gate grinds inward.'],
          locked: [{ say: ['The cemetery gate. Locked, with a lock much older than the chain on the road.'] }],
        },
      },
    ],
    props: [
      {
        id: 'main_doors', x: 19, y: 11, w: 2, h: 1, zone: [-2, 0, 20, 20],
        script: [
          { when: { times: 0 }, say: ['The main doors. Nailed shut with boards, and the boards nailed to each other.'] },
          { say: ['Someone has scratched SUNDAY into the wood, over and over, very small.'] },
        ],
      },
      {
        id: 'notice', sprite: 'notice', x: 14.6, y: 12.2, solid: [4, 12, 4, 3],
        script: [
          { when: { times: 0 }, say: ["ST. ORAN'S HOUSE FOR BOYS. FOUNDED 1889.", 'CLOSED BY ORDER OF THE DIOCESE, 1958.'], note: 'clue_closed' },
          { say: ['Nineteen fifty-eight. Ruth said fifty-one. The paint under the 8 is a different white.'] },
        ],
      },
      { id: 'price', sprite: 'price', x: 21.8, y: 12.4, solid: [1, 12, 6, 4], when: { none: ['met_price'] }, script: [{ talk: 'price' }] },
      {
        id: 'cigarette', sprite: 'cigarette', x: 22.2, y: 14, when: { all: ['met_price'] },
        script: [{ say: ['A cigarette on the step, still lit, where he stood. You look up the lane both ways. Nobody.'] }],
      },
      { id: 'glow_a', sprite: 'stained_glow', x: 15.125, y: 8.125, glow: true, anim: 17 },
      { id: 'glow_b', sprite: 'stained_glow', x: 24.125, y: 8.125, glow: true, anim: 23 },
      { id: 'glow_c', sprite: 'stained_glow', x: 15.125, y: 10.125, glow: true, anim: 19 },
      { id: 'glow_d', sprite: 'stained_glow', x: 24.125, y: 10.125, glow: true, anim: 29 },
      grave(35, 5), grave(36, 9), grave(34.6, 14), grave(35.5, 23),
    ],
  },

  chapel_nave: {
    name: "St. Oran's Chapel",
    ambience: 'chapel',
    ambient: 0.03,
    light: 50,
    mapPos: [3, 1],
    noRelic: 'Your arm will not lift it. Not in here.',
    map: [
      '########################',
      '#HHHHHHHHHKKKKHHHHHHHHH#',
      '#HHHHHHHHHKKKKHHHHHHHHH#',
      '#++++++++++++++++++++++#',
      '#++++++++++++++++++++++#',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '+++++++++++cc+++++++++++',
      '+++++++++++cc+++++++++++',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '#++++++++++cc++++++++++#',
      '########################',
    ],
    spawns: { from_vestry: [21.8, 13, 'left'], from_undercroft: [1.8, 13, 'right'], from_crypt: [12, 3.7, 'down'] },
    overrides: [{ when: { all: ['crypt_open'] }, x: 10, y: 1, w: 4, h: 2, ch: 'Z' }],
    events: [{ id: 'nave_ch2', on: 'enter', delay: 20, when: { chapter: 2, none: ['met_confession'] }, set: 'met_confession', sfx: 'creak', say: ['Somebody has set up a confessional booth by the hymn board. A shape sits behind the grille.'] }],
    onEnter: [{ id: 'nave_first', once: true, set: 'nave_seen', sfx: 'sting' }],
    exits: [
      { x: 23, y: 12, w: 1, h: 2, to: 'oran_lane', spawn: 'vestry_door', sfx: 'door' },
      { x: 10, y: 1, w: 4, h: 1, to: 'crypt_stair', spawn: 'from_nave' },
      {
        x: 0, y: 12, w: 1, h: 2, to: 'passages', spawn: 'from_undercroft',
        lock: { flag: 'undercroft_open', locked: [{ say: ['A low door in the west wall, bolted from this side.', '[ Look at the bolt to draw it. ]'] }] },
      },
    ],
    props: [
      {
        id: 'saint_big', sprite: 'saint_big', x: 3, y: 0.6, solid: [0, 30, 24, 10],
        script: [
          { when: { times: 0 }, say: ['The saint again, taller than a man. No face.', 'The hollow in its chest is big enough to climb into. The edges are worn smooth by hands.'] },
          { say: ['Wax has run down the inside of the hollow, as if it had been lit from within.'] },
        ],
      },
      {
        id: 'altar', sprite: 'altar', x: 8.5, y: 3.4, solid: [0, 6, 56, 8],
        script: [
          { when: { times: 0 }, say: ['An altar cloth, clean and pressed. On it, a cassette with no label.', 'Held up to the candles, the tape is so worn you can see light through it. Recorded over and over.'] },
          { say: ['The cloth has been pressed this week.'] },
        ],
      },
      {
        id: 'crypt', x: 10, y: 1, w: 4, h: 2, zone: [-4, 0, 40, 26],
        script: [
          { when: { all: ['crypt_open'] }, say: ['The crypt stair, open now. Warm air comes up it, and singing.'] },
          {
            when: { noted: ['clue_below'] },
            say: ['You put both hands on the warm bricks, where the recorder\'s cable would come out if it came this way.', 'Something on the other side pushes back.', 'The wall comes down inward, all at once, and the dust goes on falling long after the bricks have stopped.'],
            set: ['crypt_open', 'saw_crypt'], chapter: 2, shake: true, sfx: 'collapse', save: true,
          },
          { when: { times: 0 }, say: ['Where the crypt stair should be, the arch has been bricked up.', 'The mortar is new. The bricks are warm to the touch.'], set: 'saw_crypt' },
          { say: ['Warm. Like a wall with a chimney behind it. Whatever the recorder is listening to is down there.'] },
        ],
      },
      {
        id: 'hymn_board', sprite: 'hymn_board', x: 17, y: 0.9, zone: [-2, 0, 14, 28],
        script: [
          { when: { times: 0 }, say: ['A hymn board. 412. 417. And under them, on its own, a 3.', 'The numbers are painted on cards. The paint on the 3 is still tacky.'], note: 'clue_numbers', set: 'saw_hymns' },
          { say: ['412. 417. 3.'] },
        ],
      },
      {
        id: 'chairs', sprite: 'chairs', x: 14.4, y: 6.6, solid: [2, 9, 36, 12],
        script: [
          { when: { times: 0 }, say: ['Folding chairs, set in a circle facing inward. Eleven of them.', 'A twelfth stands in the middle, facing nothing. There are candles under every chair, burned low.'] },
          { say: ['Eleven. And one.'] },
        ],
      },
      {
        id: 'confessional', sprite: 'confessional', x: 19.6, y: 3.2, solid: [0, 14, 16, 8], when: { chapter: 2 },
        script: [{ talk: 'confession' }],
      },
      {
        id: 'stoup', sprite: 'stoup', x: 21.6, y: 9.2, solid: [0, 6, 8, 4],
        script: [
          { when: { lacks: ['holy_water'], none: ['got_water'] }, say: ['A stone stoup by the door. The water in it is old and perfectly still.', 'A small medicine bottle sits on the rim, as if somebody left it for you. You fill it.'], give: 'holy_water', set: 'got_water' },
          { say: ['The water does not ripple, even when you touch it.'] },
        ],
      },
      { id: 'candle_a', sprite: 'candle_stand', x: 13.4, y: 7.4, light: { r: 44, dx: 2, dy: 1, flicker: true }, anim: 8 },
      { id: 'candle_b', sprite: 'candle_stand', x: 20.4, y: 9.4, light: { r: 40, dx: 2, dy: 1, flicker: true }, anim: 10 },
      {
        id: 'reel', sprite: 'reel', x: 16.2, y: 11.6, solid: [0, 6, 14, 4], anim: 6,
        script: [
          { when: { times: 0 }, say: ['A reel-to-reel recorder, running. The reels turn. There is no power cord.', 'A microphone cable runs from it across the floor and down through an iron grate.', 'From down there, very faintly, someone is praying the way Mara did on the tape. Getting it wrong the same way.'], note: 'clue_below', set: 'found:recorder', sfx: 'sting' },
          { say: ['The reels keep turning.'] },
        ],
      },
      {
        id: 'grate', sprite: 'grate', x: 18.4, y: 13.6,
        script: [{ say: ['An iron grate in the floor. Cold air comes up. The cable goes down further than your light does.'] }],
      },
      { id: 'pew_a', sprite: 'pew', x: 1.6, y: 8.6, solid: [0, 3, 56, 5], script: [{ say: ['The pews have been pushed to the wall, as if to make room for something.'] }] },
      { id: 'pew_b', sprite: 'pew', x: 1.6, y: 10.4, solid: [0, 3, 56, 5] },
      { id: 'pew_c', sprite: 'pew', x: 1.6, y: 15, solid: [0, 3, 56, 5] },
      {
        id: 'bolt', sprite: 'bolt', x: 0.2, y: 11.2, zone: [-2, -2, 20, 26],
        alt: [{ when: { all: ['undercroft_open'] }, sprite: 'bolt_open' }],
        script: [
          { when: { all: ['undercroft_open'] }, say: ['The bolt is drawn. Stone steps go down into the cold.'] },
          { say: ['A heavy bolt, freshly oiled. It slides back without a sound.', '[ The way between the chapel and the passages below is open. ]'], set: 'undercroft_open', sfx: 'unlock' },
        ],
      },
    ],
  },

  cemetery: {
    name: "St. Oran's Burying Ground",
    ambience: 'cemetery',
    ambient: 0.06,
    light: 60,
    mapPos: [4, 2],
    map: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiT',
      'i.................................iT',
      'i.................................iT',
      'i...,...::........................iT',
      'i.......::.................,......iT',
      'i.......::........................iT',
      'i.......::....,...................iT',
      'i.......::........................iT',
      'i.......::........................iT',
      'i.......::........................iT',
      'i.......::........................iT',
      '.:::::::::........................iT',
      '.::::::::::::::::::::::::::::.....iT',
      'i.......::........................iT',
      'i.......::........................iT',
      'i.......::..,.....................iT',
      'i.......::........................iT',
      'i.......::............,...........iT',
      'i.......::........................iT',
      'i..,....::........................iT',
      'i.......::........................iT',
      'i.......::....................,...iT',
      'i.......::........................iT',
      'i.................,...............iT',
      'i.................................iT',
      'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    spawns: { from_lane: [2, 13.4, 'right'] },
    exits: [{ x: 0, y: 12, w: 1, h: 2, to: 'oran_lane', spawn: 'from_cemetery' }],
    entities: [{ id: 'cem_shade', type: 'shade', x: 22, y: 22 }, { id: 'cem_edge', type: 'edge', x: 32, y: 4 }],
    events: [{ id: 'grave_whisper', on: 'zone', zone: { x: 2, y: 18, w: 7, h: 5 }, sfx: 'whisper', glitch: 6 }],
    props: [
      {
        id: 'mausoleum', sprite: 'mausoleum', x: 27.5, y: 2.4, solid: [0, 14, 40, 18],
        script: [
          { when: { times: 0 }, say: ['The Oran family vault. The door is iron, sealed with lead along the seam.'] },
          { say: ['Someone has scratched a tally into the lead. You stop counting at sixty.'] },
        ],
      },
      {
        id: 'arne', sprite: 'grave', x: 13, y: 16, solid: [1, 6, 6, 4],
        script: [
          { when: { times: 0 }, say: ['ARNE HALVORSEN. 1919-1979. BELOVED.', 'A gas station receipt is pinned under a pebble on top of the stone. It is dated last week.'] },
          { say: ['Arne. The receipt is for one gallon. Nobody buys one gallon.'] },
        ],
      },
      {
        id: 'haskell', sprite: 'grave', x: 21, y: 8, solid: [1, 6, 6, 4],
        script: [
          { when: { has: ['hunter_note'] }, say: ['DALE HASKELL. 1941-1986. HE KEPT WATCH.', 'D.H. The note in the deer stand was written on a receipt from this September.'], set: 'found:haskell' },
          { say: ['DALE HASKELL. 1941-1986. HE KEPT WATCH.'] },
        ],
      },
      {
        id: 'pike_plot', sprite: 'grave_pair', x: 25, y: 18, solid: [0, 6, 20, 4],
        script: [{ say: ['WENDELL PIKE, 1902-.  MARGARET PIKE, 1905-1951.', "His date is left blank. There's an urn between the stones."] }],
      },
      {
        id: 'urn', sprite: 'urn', x: 27.1, y: 19.4,
        script: [
          { when: { none: ['got_vestry'] }, say: ['A stone urn between the Pike stones. The lid lifts off.', 'Inside, wrapped in oilcloth: a small green key.'], give: 'vestry_key', set: 'got_vestry' },
          { say: ['The urn is empty. It smells of lamp oil.'] },
        ],
      },
      {
        id: 'ward_grave', sprite: 'grave_fresh', x: 4.5, y: 21,
        script: [
          { when: { times: 0 }, say: ['A fresh grave, no stone. A wooden cross with a name in marker: M. WARD.', 'No dates. Somebody pressed a hand flat into the dirt. A small hand.'], set: 'found:ward_grave', sfx: 'sting' },
          { say: ['M. WARD. Your mother was Margaret. Your sister is Mara.', 'Was. Is.'] },
        ],
      },
      grave(4, 4), grave(4, 8), grave(13, 4), grave(17, 4), grave(25, 8), grave(29, 8),
      grave(13, 8), grave(17, 16), grave(21, 16), grave(4, 16), grave(13, 21), grave(17, 21),
      grave(21, 21), grave(29, 14), grave(30, 21), grave(25, 23),
    ],
  },

  caretaker_house: {
    name: "Pike's House",
    ambience: 'house',
    ambient: 0.02,
    light: 50,
    mapPos: [2, 2],
    map: [
      '##################',
      '#HHHHHHHHHHHHHHHH#',
      '#HHHHHHHHHHHHHHHH#',
      '#_____________ZZZ#',
      '#_____________ZZZ#',
      '#________________#',
      '#________________#',
      '#________________#',
      '#________________#',
      '#________________#',
      '#________________#',
      '########d#########',
    ],
    spawns: { from_lane: [8.5, 10.4, 'up'], from_cellar: [15.5, 6.2, 'down'] },
    exits: [
      { x: 8, y: 11, w: 1, h: 1, to: 'oran_lane', spawn: 'care_door', sfx: 'door' },
      { x: 14, y: 3, w: 3, h: 1, to: 'caretaker_cellar', spawn: 'from_house' },
    ],
    props: [
      {
        id: 'desk', sprite: 'desk', x: 2.5, y: 2.6, solid: [0, 8, 24, 8],
        script: [
          { when: { times: 0 }, say: ['A desk. A ledger lies open, filled in neat block capitals.'], doc: 'maint_log' },
          { say: ['The grounds log.'], doc: 'maint_log' },
        ],
      },
      {
        id: 'stove', sprite: 'stove', x: 8.6, y: 1.8, solid: [0, 12, 12, 8], light: { r: 30, dx: 6, dy: 13, flicker: true }, anim: 7,
        script: [
          { when: { none: ['got_cemkey'] }, say: ['The stove is lit. Someone fed it not long ago.', 'On a nail beside it hangs a long iron key.'], give: 'cemetery_key', set: 'got_cemkey' },
          { say: ['The stove is lit. Nobody is here to have lit it.'] },
        ],
      },
      {
        id: 'stairs_down', x: 14, y: 3, w: 3, h: 2, zone: [0, 0, 24, 22],
        script: [{ say: ['Stairs down to a cellar. Cold comes up them, and a smell of wet brick.'], go: { to: 'caretaker_cellar', spawn: 'from_house' } }],
      },
      {
        id: 'bed', sprite: 'bed', x: 2, y: 7.4, solid: [0, 4, 28, 10],
        script: [{ say: ["A narrow bed, made with hospital corners. A man's slippers underneath, side by side, facing out."] }],
      },
    ],
  },

  caretaker_cellar: {
    name: "Pike's Cellar",
    ambience: 'passages',
    ambient: 0,
    light: 44,
    mapPos: [1, 1],
    under: true,
    map: [
      '############',
      '#KKKKKKKKKK#',
      '#KKKKKKKKKK#',
      '#nnnnnnnZZZ#',
      '#nnnnnnnZZZ#',
      '#nnnnnnnnnn#',
      'nnnnnnnnnnn#',
      'nnnnnnnnnnn#',
      '#nnnnnnnnnn#',
      '############',
    ],
    spawns: { from_house: [9.5, 6.2, 'down'], from_passages: [1.8, 7.6, 'right'] },
    events: [{ id: 'chair_turned', on: 'enter', delay: 10, when: { chapter: 2 }, glitch: 10, sfx: 'creak' }],
    exits: [
      { x: 8, y: 3, w: 3, h: 1, to: 'caretaker_house', spawn: 'from_cellar' },
      { x: 0, y: 6, w: 1, h: 2, to: 'passages', spawn: 'from_cellar' },
    ],
    props: [
      {
        id: 'stairs_up', x: 8, y: 3, w: 3, h: 2, zone: [0, 0, 24, 22],
        script: [{ say: ["The stairs back up to Pike's kitchen."], go: { to: 'caretaker_house', spawn: 'from_cellar' } }],
      },
      {
        id: 'chair_wall', sprite: 'chair_back', x: 4.5, y: 2.8, solid: [0, 8, 8, 4],
        alt: [{ when: { chapter: 2 }, sprite: 'chair_front' }],
        script: [
          { when: { chapter: 2 }, say: ['The chair is facing the room now. Facing the stairs. Facing you.'] },
          { when: { times: 0 }, say: ['A kitchen chair, facing the bare wall.', 'The brick in front of it is worn smooth, at the height of a seated head.'] },
          { say: ["You don't sit in it."] },
        ],
      },
    ],
  },
};

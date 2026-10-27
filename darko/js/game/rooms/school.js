// Middlesex Ridge School: the front courtyard with the bronze mongrel, the main hallway, Ms.
// Pomeroy's English room, Ms. Farmer's health room, and the basement under it all.

import { SCHOOL_THEME, OUTSIDE_THEME, SCHOOL_DAY } from './common.js';

// who is in Ms. Pomeroy's room, and who is in Ms. Farmer's
const ENGLISH = ['!beat:oct27', SCHOOL_DAY];
const HEALTH = 'beat:oct7|oct13';
const BOARDS = {
  oct3: ['THE DESTRUCTORS', '  - Graham Greene'],
  oct7: ['THEY MADE ME DO IT  THEY MADE ME', 'DO IT  THEY MADE ME DO IT  THEY'],
  oct13: ['POETRY DAY'],
  oct18: ['WATERSHIP DOWN', '  - Richard Adams'],
  oct26: ['WATERSHIP DOWN', '  - Richard Adams'],
  oct27: ['', '      Cellar Door'],
};

// a grid of student desks; the player's own desk is 'my_desk'
function desks(room, mine, extra = {}) {
  const out = [];
  const cols = [2.2, 4.8, 7.4, 10, 12.6], rows = [5, 6.8, 8.6];
  rows.forEach((y, r) => cols.forEach((x, c) => {
    const id = r === mine[1] && c === mine[0] ? 'my_desk' : `desk_${r}_${c}`;
    out.push({ id, type: 'schooldesk', x, y, w: 1.3, h: 0.8, solid: true, ...(id === 'my_desk' ? { script: `sit_${room}`, label: 'your desk', ...extra } : {}) });
  }));
  return out;
}

// students sitting behind some of the desks, facing the board
const seat = (id, who, col, row, when) => ({ id, who, x: [2.2, 4.8, 7.4, 10, 12.6][col] + 0.65, y: [5, 6.8, 8.6][row] + 1.25, facing: 'up', pose: 'sit', script: 'classmate', when });

const CLASSROOM = [
  '################',
  '################',
  '################',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#..............#',
  '#_##############',
];

export const SCHOOL = {
  school_front: {
    name: 'Middlesex Ridge School', w: 26, h: 12, outside: true,
    map: [
      'X########################X',
      'X########################X',
      'X########################X',
      'X########################X',
      'X------------------------X',
      'X------------------------X',
      'X------------------------X',
      'X------------------------X',
      'X------------------------X',
      'X,,,,,,,,,,,,,,,,,,,,,,,,X',
      'X========================X',
      'X========================X',
    ],
    theme: { ...OUTSIDE_THEME, wall: '#5a3a30', wallD: '#4a2e26', trim: '#2e1e1a', wallStyle: 'siding' },
    spawns: { bus: [6, 9.2, 'up'], from_hall: [13, 4.9, 'down'], cutaway: [24, 5, 'down'] },
    exits: [
      { x: 1, y: 9.6, w: 24, h: 0.4, script: 'school_leave' },
      { x: 1, y: 4, w: 0.4, h: 6, script: 'school_leave' },
      { x: 24.6, y: 4, w: 0.4, h: 6, script: 'school_leave' },
    ],
    props: [
      { id: 'facade', type: 'facade', x: 1, y: 2, w: 24, h: 2, layer: 'wall', col: '#6a3e32', colD: '#5a3228', script: 'school_facade', label: 'the school',
        windows: [{ x: 10, y: 8, w: 14, h: 10, lit: false }, { x: 40, y: 8, w: 14, h: 10, lit: false }, { x: 70, y: 8, w: 14, h: 10, lit: false }, { x: 250, y: 8, w: 14, h: 10, lit: false }, { x: 280, y: 8, w: 14, h: 10, lit: false }, { x: 310, y: 8, w: 14, h: 10, lit: false }, { x: 340, y: 8, w: 14, h: 10, lit: false }] },
      { id: 'sign', type: 'banner', x: 7.2, y: 0.5, w: 11.6, h: 0.75, layer: 'wall', text: 'MIDDLESEX RIDGE SCHOOL' },
      { id: 'doors', type: 'door', x: 12, y: 2.2, w: 2, h: 1.8, layer: 'wall', script: 'school_doors', label: 'front doors', col: '#3a4c6a' },
      { id: 'statue', type: 'statue', x: 11.8, y: 5.6, w: 2.4, h: 2, solid: [11.8, 7, 2.4, 0.6], script: 'statue', label: 'the mongrel' },
      { id: 'scrubbed', type: 'leaves', x: 11.2, y: 7.7, w: 3.6, h: 0.6, layer: 'floor', when: ['from:oct4', '!cutaway'] },
      { id: 'graffiti', type: 'graffiti', x: 10.4, y: 7.7, w: 5.2, h: 0.7, layer: 'floor', when: 'cutaway' },
      { id: 'axe', type: 'axe', x: 13.3, y: 5.1, w: 0.6, h: 0.8, sy: 7.7, when: 'cutaway' },
      { id: 'tree1', type: 'tree', x: 2, y: 4.4, w: 3, h: 3.4, solid: [3.2, 7.3, 0.6, 0.5], script: 'school_tree', label: 'tree' },
      { id: 'tree2', type: 'tree', x: 21, y: 4.4, w: 3, h: 3.4, solid: [22.2, 7.3, 0.6, 0.5], script: 'school_tree', label: 'tree' },
      { id: 'bus', type: 'bus', x: 3, y: 10.1, w: 8, h: 1.6, solid: true, script: 'school_bus', label: 'the bus' },
    ],
    npcs: [
      { id: 'cole', who: 'cole', x: 15.6, y: 4.9, facing: 'down', script: 'cole', when: SCHOOL_DAY },
      { id: 'cole_cut', who: 'cole', x: 14.6, y: 9.0, facing: 'up', when: 'cutaway' },
      { id: 'leroy', who: 'leroy', x: 11.6, y: 9.1, facing: 'up', when: 'cutaway' },
      { id: 'sean', who: 'sean', x: 8.4, y: 6.4, facing: 'right', script: 'sean_school', when: SCHOOL_DAY },
      { id: 'ronald', who: 'ronald', x: 9.4, y: 6.8, facing: 'left', script: 'ronald_school', when: SCHOOL_DAY },
      { id: 'dance1', who: 'samantha', x: 18.4, y: 7.6, facing: 'down', script: 'sparkle', when: 'beat:oct3' },
      { id: 'dance2', who: 'joanie', x: 19.6, y: 7.9, facing: 'down', script: 'sparkle', when: 'beat:oct3' },
      { id: 'dance3', who: 'emily', x: 20.8, y: 7.6, facing: 'down', script: 'sparkle', when: 'beat:oct3' },
      { id: 'seth', who: 'seth', x: 23.2, y: 8.4, facing: 'left', script: 'seth_knife', when: ['beat:oct18', 'lunch_walk', '!seth_knife'] },
      { id: 'gretchen_f', who: 'gretchen', x: 12.4, y: 4.9, facing: 'down', script: 'gretchen_kiss', when: ['beat:oct24', 'imgs_done', '!kissed'] },
      { id: 'cherita', who: 'cherita', x: 12.6, y: 7.9, facing: 'down', pose: 'sit', when: ['beat:oct24', 'talent_scene'] },
    ],
    lights: [],
  },

  school_hall: {
    name: 'Main hallway', w: 32, h: 8,
    map: [
      '################################',
      '################################',
      '################################',
      '...............................#',
      '...............................#',
      '...............................#',
      '#############################ss#',
      '#############################ss#',
    ],
    theme: SCHOOL_THEME,
    ambience: 'house',
    spawns: { from_physics: [23.3, 3.9, 'down'], from_front: [0.9, 4.6, 'right'], from_english: [8.6, 3.9, 'down'], from_health: [16.6, 3.9, 'down'], from_basement: [29.9, 5.2, 'up'], night: [1.2, 4.6, 'right'] },
    exits: [
      { x: 0, y: 3, w: 0.4, h: 3, to: 'school_front', spawn: 'from_hall', blockWhen: 'beat:flood', script: 'flood_onward' },
      { x: 29, y: 6.5, w: 2, h: 0.5, to: 'basement', spawn: 'from_hall', blockWhen: '!beat:flood', script: 'basement_locked' },
    ],
    props: [
      { id: 'lockers1', type: 'lockers', x: 1.2, y: 1.5, w: 6.4, h: 1.5, layer: 'wall', script: 'lockers', label: 'lockers' },
      { id: 'mylocker', type: 'lockers', x: 3.2, y: 1.5, w: 0.5, h: 1.5, layer: 'wall', mine: 0, script: 'my_locker', label: 'your locker' },
      { id: 'door_english', type: 'door', x: 8.1, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_english', label: 'English (Pomeroy)', col: '#5a4a3a' },
      { id: 'trophies', type: 'trophies', x: 10, y: 1.4, w: 2.2, h: 1.3, layer: 'wall', script: 'trophies', label: 'trophy case' },
      { id: 'banner', type: 'banner', x: 12.6, y: 1.2, w: 3, h: 0.7, layer: 'wall', text: 'GO MONGRELS', script: 'banner', label: 'banner' },
      { id: 'door_health', type: 'door', x: 16.1, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_health', label: 'Health (Farmer)', col: '#5a4a3a' },
      { id: 'lockers2', type: 'lockers', x: 17.6, y: 1.5, w: 4.8, h: 1.5, layer: 'wall', script: 'lockers', label: 'lockers' },
      { id: 'door_physics', type: 'door', x: 22.8, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_physics', label: 'Physics (Monnitoff)', col: '#5a4a3a' },
      { id: 'door_office', type: 'door', x: 25.6, y: 1.15, w: 1.6, h: 1.85, layer: 'wall', script: 'door_office', label: "Principal's office", col: '#3a3a44' },
      { id: 'old_photos', type: 'oldphotos', x: 27.6, y: 1.4, w: 2.3, h: 1.1, layer: 'wall', script: 'old_photos', label: 'old class photos' },
      { id: 'water', type: 'water', x: 1, y: 3, w: 30, h: 3, layer: 'floor', when: 'pipe_broken' },
    ],
    npcs: [
      { id: 'monnitoff', who: 'monnitoff', x: 23.3, y: 4.0, facing: 'left', script: 'monnitoff', when: [SCHOOL_DAY, '!in_physics'] },
      { id: 'farmer', who: 'farmer', x: 19.6, y: 4.4, facing: 'left', script: 'farmer_hall', when: [SCHOOL_DAY, '!beat:oct25|oct26|oct27'] },
      { id: 'gretchen_h', who: 'gretchen', x: 18.2, y: 3.8, facing: 'up', script: 'gretchen_locker', when: s => (s.beat === 'oct26' && s.has('watership') && !s.has('gretchen_angry')) || (s.beat === 'oct27' && !s.has('gretchen_ignored')) },
      { id: 'cherita_h', who: 'cherita', x: 6.2, y: 3.8, facing: 'up', script: 'cherita_locker', when: ['beat:oct27', 'cellar_door', '!cherita_done'] },
      { id: 'pomeroy_h', who: 'pomeroy', x: 12, y: 4.2, facing: 'left', when: ['beat:oct27', 'cellar_door', '!pomeroy_gone'] },
      { id: 'cunningham', who: 'cunningham', x: 26.8, y: 4.6, facing: 'left', script: 'cunningham_hall', when: 'beat:oct3' },
      { id: 'student1', who: 'student', x: 5.2, y: 3.8, facing: 'up', script: 'hall_student', when: SCHOOL_DAY },
      { id: 'student2', who: 'student2', x: 19, y: 3.6, facing: 'up', script: 'hall_student2', when: SCHOOL_DAY },
      { id: 'frank', who: 'frank', x: 27.6, y: 4.4, facing: 'left', script: 'frank_hall', when: ['beat:flood', '!frank_hall_gone'] },
    ],
    lights: [
      { x: 30, y: 4, r: 2.5, i: 0.6, when: 'beat:flood' },
    ],
  },

  english: {
    name: "Ms. Pomeroy's English class", w: 16, h: 11,
    map: CLASSROOM,
    theme: SCHOOL_THEME,
    ambience: 'house',
    spawns: { from_hall: [1.5, 9.4, 'up'] },
    exits: [{ x: 1, y: 10.5, w: 1, h: 0.5, to: 'school_hall', spawn: 'from_english', blockWhen: s => s.has('in_class'), script: 'class_stay' }],
    props: [
      { id: 'board', type: 'chalkboard', x: 3, y: 1.1, w: 9, h: 1.6, layer: 'wall', script: 'english_board', label: 'chalkboard',
        text: s => BOARDS[s.beat] || BOARDS.oct3 },
      { id: 'teacher_desk', type: 'teacherdesk', x: 12.4, y: 3.3, w: 2.2, h: 1, solid: true, script: 'pomeroy_desk', label: "teacher's desk" },
      ...desks('english', [1, 0]),
    ],
    npcs: [
      { id: 'pomeroy', who: 'pomeroy', x: 9, y: 4.2, facing: 'down', script: 'pomeroy', when: ENGLISH },
      { id: 'pomeroy_box', who: 'pomeroy', x: 13.4, y: 4.6, facing: 'left', script: 'pomeroy_cellar', when: ['beat:oct27', '!cellar_door'] },
      seat('c1', 'student', 0, 0, ENGLISH), seat('c2', 'joanie', 3, 0, ENGLISH), seat('c3', 'ronald', 2, 1, ENGLISH),
      seat('c4', 'student2', 4, 1, ENGLISH), seat('c5', 'cherita', 0, 2, ENGLISH), seat('c6', 'sean', 3, 2, ENGLISH),
      seat('gretchen', 'gretchen', 2, 0, s => s.has('gretchen_sat') && s.beat !== 'oct27'),
      { id: 'gretchen_door', who: 'gretchen', x: 1.5, y: 9.4, facing: 'up', script: 'gretchen_class', when: ['beat:oct3', 'gretchen_door', '!gretchen_sat'] },
      { id: 'officer1', who: 'officer', x: 14, y: 5.4, facing: 'left', script: 'officer_class', when: ['beat:oct7', '!oct7_english'] },
      { id: 'officer2', who: 'officer', x: 14.4, y: 7.2, facing: 'left', script: 'officer_class', when: ['beat:oct7', '!oct7_english'] },
      { id: 'cole', who: 'cole', x: 13.2, y: 8.8, facing: 'left', script: 'cole_class', when: ['beat:oct7', '!oct7_english'] },
    ],
    lights: [],
  },

  health: {
    name: "Ms. Farmer's health class", w: 16, h: 11,
    map: CLASSROOM,
    theme: { ...SCHOOL_THEME, wall: '#4e5a52', wallD: '#424c46' },
    ambience: 'house',
    spawns: { from_hall: [1.5, 9.4, 'up'] },
    exits: [{ x: 1, y: 10.5, w: 1, h: 0.5, to: 'school_hall', spawn: 'from_health', blockWhen: s => s.has('in_class'), script: 'class_stay' }],
    props: [
      { id: 'board', type: 'chalkboard', x: 3, y: 1.1, w: 9, h: 1.6, layer: 'wall', script: 'health_board', label: 'chalkboard',
        text: s => (s.beat === 'oct13' ? ['FEAR <-------------------> LOVE', '      THE LIFELINE'] : ['HEALTH - MS. FARMER', 'TODAY: A VIDEO PRESENTATION']) },
      { id: 'tvcart', type: 'tvcart', x: 7, y: 3.2, w: 1.5, h: 1.5, solid: true, script: 'tvcart', label: 'TV cart' },
      { id: 'teacher_desk', type: 'teacherdesk', x: 12.4, y: 3.3, w: 2.2, h: 1, solid: true, script: 'farmer_desk', label: "teacher's desk" },
      ...desks('health', [3, 0]),
    ],
    npcs: [
      { id: 'farmer', who: 'farmer', x: 11.2, y: 4.6, facing: 'down', script: 'farmer_class', when: HEALTH },
      seat('h1', 'student', 0, 0, HEALTH), seat('h2', 'cherita', 1, 0, HEALTH), seat('h3', 'gretchen', 4, 0, HEALTH),
      seat('h4', 'ronald', 1, 1, HEALTH), seat('h5', 'joanie', 3, 1, HEALTH), seat('h6', 'sean', 2, 0, HEALTH),
    ],
    lights: [{ x: 7.75, y: 3.6, r: 3, i: 0.4, when: 'tape_on' }],
  },

  basement: {
    name: 'The basement', w: 18, h: 8,
    map: [
      '##################',
      '#ss###############',
      '#ss###############',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '##################',
    ],
    theme: { ...SCHOOL_THEME, floorKind: 'concrete', floor: '#2e2e34', floorAlt: '#26262c', wall: '#3a3a40', wallD: '#30303a', wallStyle: 'plain', stair: '#3a3a40', stairD: '#1a1a20' },
    ambient: 0.5,
    ambience: 'house',
    spawns: { from_hall: [1.9, 3.8, 'down'] },
    exits: [{ x: 1, y: 1, w: 2, h: 0.9, to: 'school_hall', spawn: 'from_basement', blockWhen: '!pipe_broken', script: 'basement_stay' }],
    props: [
      { id: 'pipes', type: 'pipes', x: 3.2, y: 1.6, w: 14, h: 0.8, layer: 'wall', script: 'pipes', label: 'pipes' },
      { id: 'valve', type: 'valve', x: 11.2, y: 2.4, w: 1.2, h: 1.1, solid: [11.2, 3, 1.2, 0.5], script: 'water_main', label: 'the water main' },
      { id: 'water', type: 'water', x: 1, y: 3, w: 16, h: 4, layer: 'floor', when: 'pipe_broken' },
    ],
    lights: [],
  },

  physics: {
    name: "Dr. Monnitoff's physics class", w: 16, h: 11,
    map: CLASSROOM,
    theme: { ...SCHOOL_THEME, wall: '#4a5260', wallD: '#3e4654' },
    ambience: 'house',
    spawns: { from_hall: [1.5, 9.4, 'up'], front: [7, 4.2, 'down'] },
    exits: [{ x: 1, y: 10.5, w: 1, h: 0.5, to: 'school_hall', spawn: 'from_physics', blockWhen: s => s.has('in_class'), script: 'class_stay' }],
    props: [
      { id: 'board', type: 'chalkboard', x: 3, y: 1.1, w: 9, h: 1.6, layer: 'wall', script: 'physics_board', label: 'chalkboard',
        text: s => ({ oct14: ['WORMHOLE: EINSTEIN-ROSEN', 'VESSEL  +  PORTAL'], oct18: ['YOUNG INVENTORS FAIR', 'PARTNERS DUE TOMORROW'], oct24: ['YOUNG INVENTORS FAIR', 'PRESENTATIONS'], oct25: ['VECTOR PATHS', '  THROUGH SPACE-TIME'] }[s.beat] || ['PHYSICS - DR. MONNITOFF']) },
      { id: 'teacher_desk', type: 'teacherdesk', x: 12.4, y: 3.3, w: 2.2, h: 1, solid: true, script: 'monnitoff_desk', label: "Monnitoff's desk" },
      ...desks('physics', [2, 0]),
    ],
    npcs: [
      { id: 'monnitoff', who: 'monnitoff', x: 11.4, y: 4.4, facing: 'down', script: 'monnitoff_class', when: 'beat:oct14|oct18|oct24|oct25' },
      seat('gretchen', 'gretchen', 3, 0, 'beat:oct18|oct24'),
      seat('p1', 'student', 0, 1, 'beat:oct18|oct24'), seat('p2', 'student2', 4, 1, 'beat:oct18|oct24'),
      seat('seth', 'seth', 1, 2, ['beat:oct24', '!seth_out']),
      seat('cherita', 'cherita', 4, 2, 'beat:oct18|oct24'),
    ],
    lights: [],
  },

  office: {
    name: "Principal Cole's office", w: 12, h: 9,
    map: [
      '############',
      '############',
      '############',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '############',
    ],
    theme: { ...SCHOOL_THEME, floorKind: 'carpet', floor: '#3a3a44', floorAlt: '#44444e', wall: '#5a5848', wallD: '#4a4838', wallStyle: 'panel' },
    ambience: 'house',
    spawns: { chair: [5, 6.4, 'up'] },
    exits: [],
    props: [
      { id: 'desk', type: 'teacherdesk', x: 4.4, y: 3.4, w: 3.2, h: 1.1, solid: true },
      { id: 'diploma', type: 'painting', x: 5.6, y: 1.4, w: 0.9, h: 0.8, layer: 'wall' },
      { id: 'flag', type: 'banner', x: 8.6, y: 1.2, w: 1.6, h: 0.7, layer: 'wall', text: 'USA' },
    ],
    npcs: [
      { id: 'cole', who: 'cole', x: 6, y: 3.3, facing: 'down', sy: 3.2 },
      { id: 'farmer', who: 'farmer', x: 10, y: 4.4, facing: 'left', when: 'beat:oct13' },
      { id: 'rose', who: 'rose', x: 3.6, y: 6.4, facing: 'up', pose: 'sit', when: 'beat:oct13' },
      { id: 'eddie', who: 'eddie', x: 6.4, y: 6.4, facing: 'up', pose: 'sit', when: 'beat:oct13' },
      { id: 'pomeroy', who: 'pomeroy', x: 6, y: 6.4, facing: 'up', when: 'beat:oct25' },
    ],
    lights: [],
  },

  auditorium: {
    name: 'The auditorium', w: 22, h: 13,
    map: [
      '######################',
      '######################',
      '######################',
      '#....................#',
      '#....................#',
      '#....................#',
      '#....................#',
      '#....................#',
      '#....................#',
      '#....................#',
      '#....................#',
      '#....................#',
      '##########__##########',
    ],
    theme: { ...SCHOOL_THEME, floorKind: 'carpet', floor: '#2e2430', floorAlt: '#3a2e3c', wall: '#3a2a2a', wallD: '#2e2020', wallStyle: 'paper' },
    ambient: 0.75,
    ambience: 'crowd',
    spawns: { seat: [11.4, 8.6, 'up'], back: [10.5, 11.4, 'up'], stage: [11, 4.4, 'down'] },
    exits: [{ x: 10, y: 12.5, w: 2, h: 0.5, script: 'assembly_stay' }],
    props: [
      { id: 'curtain', type: 'curtain', x: 1, y: 0.6, w: 20, h: 2.4, layer: 'wall' },
      { id: 'screen', type: 'screen', x: 6, y: 0.7, w: 10, h: 2, layer: 'wall', when: 'screen_slides' },
      { id: 'stage', type: 'stage', x: 1, y: 3, w: 20, h: 2.2, layer: 'floor' },
      ...[5.8, 7.2, 8.6, 10].map((y, i) => ({ id: `rowl${i}`, type: 'seats', x: 1.6, y, w: 8, h: 0.8, solid: true })),
      ...[5.8, 7.2, 8.6, 10].map((y, i) => ({ id: `rowr${i}`, type: 'seats', x: 12.4, y, w: 8, h: 0.8, solid: true })),
      { id: 'mic', type: 'micstand', x: 10.8, y: 10.2, w: 0.4, h: 1.2, solid: [10.8, 11.1, 0.3, 0.2], script: 'microphone', label: 'microphone', when: 'beat:oct20' },
    ],
    npcs: [
      // the PTA, the night of October 7
      { id: 'cole', who: 'cole', x: 11, y: 4.4, facing: 'down', when: 'beat:oct7_pm|oct20' },
      { id: 'farmer', who: 'farmer', x: 5, y: 6.6, facing: 'up', when: 'beat:oct7_pm|oct24' },
      { id: 'pomeroy', who: 'pomeroy', x: 16, y: 6.6, facing: 'up', when: 'beat:oct7_pm|oct24' },
      { id: 'rose', who: 'rose', x: 14.2, y: 8, facing: 'up', when: 'beat:oct7_pm|oct24' },
      { id: 'eddie', who: 'eddie', x: 15.4, y: 8, facing: 'up', when: 'beat:oct7_pm|oct24' },
      { id: 'parent1', who: 'anne', x: 4, y: 8, facing: 'up', when: 'beat:oct7_pm' },
      { id: 'parent2', who: 'fisher', x: 6.8, y: 8, facing: 'up', when: 'beat:oct7_pm' },
      // the assembly
      { id: 'cunningham', who: 'cunningham', x: 8.8, y: 4.4, facing: 'down', when: 'beat:oct20|oct24' },
      { id: 'gretchen', who: 'gretchen', x: 10.2, y: 8.5, facing: 'up', pose: 'sit', sy: 9.5, when: 'beat:oct20' },
      { id: 'a1', who: 'student', x: 3.4, y: 7, facing: 'up', pose: 'sit', sy: 7.8, when: 'beat:oct20' },
      { id: 'a2', who: 'student2', x: 6, y: 8.5, facing: 'up', pose: 'sit', sy: 9.5, when: 'beat:oct20' },
      { id: 'a3', who: 'joanie', x: 15, y: 7, facing: 'up', pose: 'sit', sy: 7.8, when: 'beat:oct20' },
      { id: 'a4', who: 'cherita', x: 17.6, y: 8.5, facing: 'up', pose: 'sit', sy: 9.5, when: 'beat:oct20' },
      { id: 'a5', who: 'ronald', x: 13.8, y: 9.9, facing: 'up', pose: 'sit', sy: 10.9, when: 'beat:oct20' },
      { id: 'a6', who: 'sean', x: 15.2, y: 9.9, facing: 'up', pose: 'sit', sy: 10.9, when: 'beat:oct20' },
      // the talent show
      { id: 'sm1', who: 'samantha', x: 7.6, y: 4.4, facing: 'down', when: ['beat:oct24', 'talent_show'] },
      { id: 'sm2', who: 'beth', x: 9.6, y: 4.4, facing: 'down', when: ['beat:oct24', 'talent_show'] },
      { id: 'sm3', who: 'joanie', x: 11.6, y: 4.4, facing: 'down', when: ['beat:oct24', 'talent_show'] },
      { id: 'sm4', who: 'emily', x: 13.6, y: 4.4, facing: 'down', when: ['beat:oct24', 'talent_show'] },
      { id: 'liz_show', who: 'elizabeth', x: 16.6, y: 8, facing: 'up', when: 'beat:oct24' },
    ],
    lights: [{ x: 11, y: 3.8, r: 8, i: 0.8 }],
  },
};

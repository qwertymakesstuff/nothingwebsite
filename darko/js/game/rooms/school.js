// Middlesex Ridge School: the front courtyard with the bronze mongrel, the main hallway, Ms.
// Pomeroy's English room, Ms. Farmer's health room, and the basement under it all.

import { SCHOOL_THEME, OUTSIDE_THEME } from './common.js';

const SCHOOL_DAY = 'beat:oct3|oct7';

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
      { id: 'dance1', who: 'samantha', x: 18.4, y: 7.6, facing: 'down', script: 'sparkle', when: SCHOOL_DAY },
      { id: 'dance2', who: 'joanie', x: 19.6, y: 7.9, facing: 'down', script: 'sparkle', when: SCHOOL_DAY },
      { id: 'dance3', who: 'emily', x: 20.8, y: 7.6, facing: 'down', script: 'sparkle', when: SCHOOL_DAY },
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
    spawns: { from_front: [0.9, 4.6, 'right'], from_english: [8.6, 3.9, 'down'], from_health: [16.6, 3.9, 'down'], from_basement: [29.9, 5.2, 'up'], night: [1.2, 4.6, 'right'] },
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
      { id: 'water', type: 'water', x: 1, y: 3, w: 30, h: 3, layer: 'floor', when: 'pipe_broken' },
    ],
    npcs: [
      { id: 'monnitoff', who: 'monnitoff', x: 23.3, y: 4.0, facing: 'left', script: 'monnitoff', when: SCHOOL_DAY },
      { id: 'farmer', who: 'farmer', x: 19.6, y: 4.4, facing: 'left', script: 'farmer_hall', when: SCHOOL_DAY },
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
        text: s => (s.beat === 'oct7' ? ['THEY MADE ME DO IT  THEY MADE ME', 'DO IT  THEY MADE ME DO IT  THEY'] : ['THE DESTRUCTORS', '  - Graham Greene']) },
      { id: 'teacher_desk', type: 'teacherdesk', x: 12.4, y: 3.3, w: 2.2, h: 1, solid: true, script: 'pomeroy_desk', label: "teacher's desk" },
      ...desks('english', [1, 0]),
    ],
    npcs: [
      { id: 'pomeroy', who: 'pomeroy', x: 9, y: 4.2, facing: 'down', script: 'pomeroy', when: SCHOOL_DAY },
      seat('c1', 'student', 0, 0, SCHOOL_DAY), seat('c2', 'joanie', 3, 0, SCHOOL_DAY), seat('c3', 'ronald', 2, 1, SCHOOL_DAY),
      seat('c4', 'student2', 4, 1, SCHOOL_DAY), seat('c5', 'cherita', 0, 2, SCHOOL_DAY), seat('c6', 'sean', 3, 2, SCHOOL_DAY),
      seat('gretchen', 'gretchen', 2, 0, s => s.has('gretchen_sat') || s.beat === 'oct7'),
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
      { id: 'board', type: 'chalkboard', x: 3, y: 1.1, w: 9, h: 1.6, layer: 'wall', script: 'health_board', label: 'chalkboard', text: ['HEALTH - MS. FARMER', 'TODAY: A VIDEO PRESENTATION'] },
      { id: 'tvcart', type: 'tvcart', x: 7, y: 3.2, w: 1.5, h: 1.5, solid: true, script: 'tvcart', label: 'TV cart' },
      { id: 'teacher_desk', type: 'teacherdesk', x: 12.4, y: 3.3, w: 2.2, h: 1, solid: true, script: 'farmer_desk', label: "teacher's desk" },
      ...desks('health', [3, 0]),
    ],
    npcs: [
      { id: 'farmer', who: 'farmer', x: 11.2, y: 4.6, facing: 'down', script: 'farmer_class', when: 'beat:oct7' },
      seat('h1', 'student', 0, 0, 'beat:oct7'), seat('h2', 'cherita', 1, 0, 'beat:oct7'), seat('h3', 'gretchen', 4, 0, 'beat:oct7'),
      seat('h4', 'ronald', 1, 1, 'beat:oct7'), seat('h5', 'joanie', 3, 1, 'beat:oct7'), seat('h6', 'student2', 2, 2, 'beat:oct7'),
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
};


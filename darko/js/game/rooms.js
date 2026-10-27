// The Stage 1 world: Donnie's bedroom, the upstairs hall, the living room, the kitchen, the front
// yard and the street. All positions are in tiles (16px); a spawn is [x, y, facing] at the feet.
//
// props:  { id, type, x, y, w, h, solid?: true | [x, y, w, h], layer?: 'floor' | 'wall',
//           script?, again?, label?, when?, sy? (sort depth override) }
// npcs:   { id, who, x, y, facing, pose?, script, when?, sy? }
// exits:  { x, y, w, h, to, spawn, blockWhen?, script? }  a blocked exit runs its script instead
// lights: { x, y, r, i, phases?, when?, flicker? }
// onEnter: [{ when, script }]  checked on entry and whenever a scene ends

import { C } from './palette.js';

const NIGHTLIGHT = ['dusk', 'night'];

const HOUSE_THEME = {
  floorKind: 'carpet', floor: '#2e2c3a', floorAlt: '#3a3848',
  wall: '#3c4a4a', wallD: '#344040', trim: C.woodD, top: C.ink, wallStyle: 'paper', threshold: C.woodD,
};

const OUTSIDE_THEME = {
  wall: '#5c5a68', wallD: '#4a4856', trim: '#3a3846', top: '#1a1820', roof: true, roofD: '#121118', wallStyle: 'siding',
};

export const ROOMS = {
  donnie_room: {
    name: "Donnie's room", w: 12, h: 10,
    map: [
      '############',
      '############',
      '############',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '#..........#',
      '#####__#####',
    ],
    theme: { ...HOUSE_THEME, floor: '#262636', floorAlt: '#30304a', wall: '#2c3c46', wallD: '#26343c' },
    ambience: 'house',
    spawns: { start: [6.5, 6.5, 'down'], from_hall: [6, 8.7, 'up'], bed: [3.6, 5.2, 'left'] },
    exits: [{ x: 5, y: 9.6, w: 2, h: 0.4, to: 'hall', spawn: 'from_room' }],
    props: [
      { id: 'window', type: 'window', x: 1.5, y: 1.15, w: 2.2, h: 1.55, layer: 'wall', script: 'room_window', label: 'window' },
      { id: 'poster', type: 'poster', x: 4.7, y: 1.1, w: 1.1, h: 1.45, layer: 'wall', script: 'poster', label: 'poster' },
      { id: 'shelf', type: 'shelf', x: 7.8, y: 1.4, w: 2.2, h: 2.1, solid: [7.8, 3, 2.2, 0.5], script: 'shelf', label: 'shelf' },
      { id: 'bed', type: 'bed', x: 1, y: 3, w: 2, h: 3.1, solid: true, script: 'bed', label: 'bed' },
      { id: 'book', type: 'book', x: 1.7, y: 4.9, w: 0.5, h: 0.4, when: '!took_book', script: 'book', label: 'book', sy: 6.2 },
      { id: 'stereo', type: 'stereo', x: 5.6, y: 3.0, w: 1.5, h: 0.75, solid: true, script: 'stereo', label: 'tape deck' },
      { id: 'desk', type: 'desk', x: 9, y: 4.2, w: 2, h: 1.25, solid: true, script: 'desk', label: 'desk' },
      { id: 'lamp', type: 'desklamp', x: 10.3, y: 3.75, w: 0.6, h: 0.85, script: 'lamp', label: 'lamp', sy: 5.5 },
      { id: 'rug', type: 'rug', x: 4, y: 5, w: 4, h: 2.4, layer: 'floor' },
      { id: 'clothes', type: 'clothes', x: 7.9, y: 7.4, w: 0.9, h: 0.6, layer: 'floor', script: 'clothes', label: 'clothes' },
    ],
    npcs: [
      { id: 'rose', who: 'rose', x: 6, y: 9.3, facing: 'up', when: 'rose_visit', script: 'rose_room' },
    ],
    lights: [
      { x: 10.6, y: 4.2, r: 5, i: 0.85, when: '!lamp_off' },
      { x: 2.6, y: 3.4, r: 3, i: 0.25, phases: ['day', 'dusk'] },
    ],
    onEnter: [{ when: ['dinner_done', '!rose_talk'], script: 'rose_bedroom' }],
  },

  hall: {
    name: 'Upstairs hall', w: 19, h: 7,
    map: [
      '###################',
      '###################',
      '###################',
      '#.................#',
      '#.................#',
      '###############ss##',
      '###############ss##',
    ],
    theme: { ...HOUSE_THEME, floor: '#3a3230', floorAlt: '#443a36', wall: '#4a4a3c', wallD: '#403f33' },
    ambience: 'house',
    spawns: { from_room: [2.5, 3.9, 'down'], from_stairs: [15.9, 4.4, 'up'] },
    exits: [{ x: 15, y: 6.3, w: 2, h: 0.7, to: 'living', spawn: 'from_stairs' }],
    props: [
      { id: 'door_donnie', type: 'door', x: 2, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_donnie', label: 'your room' },
      { id: 'door_bath', type: 'door', x: 5, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_bath', label: 'bathroom', col: C.bone },
      { id: 'door_liz', type: 'door', x: 8.2, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_liz', label: "Elizabeth's room" },
      { id: 'photos', type: 'photos', x: 10.1, y: 1.4, w: 1.7, h: 0.8, layer: 'wall', script: 'hall_photos', label: 'photos' },
      { id: 'door_sam', type: 'door', x: 12.6, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_sam', label: "Samantha's room", sign: true },
      { id: 'door_parents', type: 'door', x: 15.6, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'door_parents', label: "parents' room", light: true },
    ],
    lights: [
      { x: 9.5, y: 3.5, r: 6, i: 0.55, phases: NIGHTLIGHT },
      { x: 16.1, y: 3.1, r: 2, i: 0.35, phases: ['night'], when: 'rose_talk' },
    ],
  },

  living: {
    name: 'Living room', w: 20, h: 11,
    map: [
      '####################',
      '#ss#################',
      '#ss#################',
      '#..................#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#...................',
      '#...................',
      '#..................#',
      '#########__#########',
    ],
    theme: { ...HOUSE_THEME, floor: '#3a2e28', floorAlt: '#46382e', wall: '#5a5440', wallD: '#4c4636', wallLow: '#3e3a2e', wallStyle: 'panel', stair: '#5a4434', stairD: '#2a1e18' },
    ambience: 'tv',
    spawns: { from_stairs: [1.9, 3.7, 'down'], from_kitchen: [18.6, 8.3, 'left'], from_front: [10, 9.6, 'up'] },
    exits: [
      { x: 1, y: 1, w: 2, h: 0.9, to: 'hall', spawn: 'from_stairs' },
      { x: 19.6, y: 7, w: 0.4, h: 2, to: 'kitchen', spawn: 'from_living' },
      { x: 9, y: 10.6, w: 2, h: 0.4, to: 'yard', spawn: 'from_house', blockWhen: 'dinner_done', script: 'front_door_night' },
    ],
    props: [
      { id: 'window1', type: 'window', x: 5, y: 1.15, w: 2.4, h: 1.55, layer: 'wall', script: 'living_window', label: 'window', curtain: C.creamD },
      { id: 'photos', type: 'photos', x: 12.4, y: 1.4, w: 1.7, h: 0.8, layer: 'wall', script: 'living_photos', label: 'photos' },
      { id: 'window2', type: 'window', x: 15, y: 1.15, w: 2.4, h: 1.55, layer: 'wall', script: 'living_window', label: 'window', curtain: C.creamD },
      { id: 'tv', type: 'tv', x: 8.4, y: 2.7, w: 2, h: 1.35, solid: [8.4, 3, 2, 1.05], script: 'tv', label: 'TV' },
      { id: 'lamp', type: 'floorlamp', x: 3.6, y: 3.0, w: 0.6, h: 1.5, solid: [3.6, 4.1, 0.6, 0.4], script: 'floorlamp', label: 'lamp' },
      { id: 'plant', type: 'plant', x: 17.8, y: 2.9, w: 0.9, h: 1.1, solid: [17.8, 3.6, 0.9, 0.4], script: 'plant', label: 'plant' },
      { id: 'table', type: 'coffeetable', x: 5.9, y: 5.1, w: 2.2, h: 0.8, solid: true, script: 'newspaper', label: 'newspaper' },
      { id: 'couch', type: 'couch', x: 5.4, y: 6.5, w: 3.6, h: 1.3, solid: true, script: 'couch', label: 'couch' },
      { id: 'recliner', type: 'recliner', x: 12, y: 4.6, w: 1.4, h: 1.4, solid: true, script: 'recliner', label: 'La-Z-Boy' },
      { id: 'coatrack', type: 'coatrack', x: 7.4, y: 8.4, w: 0.6, h: 1.3, solid: [7.4, 9.3, 0.6, 0.4], script: 'coatrack', label: 'coats' },
    ],
    npcs: [
      { id: 'samantha', who: 'samantha', x: 9.4, y: 5.3, facing: 'up', pose: 'sit', script: 'samantha', when: ['!dinner_ready'] },
      { id: 'eddie', who: 'eddie', x: 12.7, y: 5.55, facing: 'up', pose: 'sit', sy: 6.1, script: 'eddie_after', when: ['dinner_done'] },
      { id: 'callie', who: 'callie', x: 14.8, y: 8.2, facing: 'left', script: 'callie' },
    ],
    lights: [
      { x: 3.9, y: 3.5, r: 4.5, i: 0.75, phases: NIGHTLIGHT },
      { x: 9.4, y: 4.6, r: 4, i: 0.55, flicker: true },
    ],
  },

  kitchen: {
    name: 'Kitchen', w: 14, h: 10,
    map: [
      '##############',
      '##############',
      '##############',
      '#............#',
      '#............#',
      '.............#',
      '.............#',
      '#............#',
      '#............#',
      '##############',
    ],
    theme: { ...HOUSE_THEME, floorKind: 'tile', floor: '#4a4a40', floorAlt: '#3a3a34', grout: '#2e2e2a', wall: '#5e5a3e', wallD: '#504c34', wallStyle: 'plain' },
    ambience: 'house',
    spawns: { from_living: [0.9, 6.2, 'right'] },
    exits: [{ x: 0, y: 5, w: 0.4, h: 2, to: 'living', spawn: 'from_kitchen' }],
    props: [
      { id: 'fridge', type: 'fridge', x: 1.1, y: 1.3, w: 1.1, h: 2.2, solid: [1.1, 3, 1.1, 0.5], script: 'fridge', again: 'fridge_again', label: 'fridge' },
      { id: 'counter1', type: 'counter', x: 2.3, y: 2.4, w: 1.2, h: 1.1, solid: [2.3, 3, 1.2, 0.5] },
      { id: 'sink', type: 'sink', x: 3.5, y: 2.4, w: 1.3, h: 1.1, solid: [3.5, 3, 1.3, 0.5], script: 'sink', label: 'sink' },
      { id: 'stove', type: 'stove', x: 4.8, y: 2.4, w: 1.2, h: 1.1, solid: [4.8, 3, 1.2, 0.5], script: 'stove', label: 'stove' },
      { id: 'counter2', type: 'counter', x: 6, y: 2.4, w: 1.1, h: 1.1, solid: [6, 3, 1.1, 0.5] },
      { id: 'clock', type: 'clock', x: 7.7, y: 1.3, w: 0.7, h: 0.7, layer: 'wall', script: 'clock', label: 'clock' },
      { id: 'window', type: 'window', x: 8.8, y: 1.15, w: 2, h: 1.45, layer: 'wall', script: 'kitchen_window', label: 'window', curtain: C.cream },
      { id: 'phone', type: 'phone', x: 11.2, y: 1.6, w: 0.5, h: 1.1, layer: 'wall', script: 'phone', label: 'phone' },
      { id: 'backdoor', type: 'door', x: 12.1, y: 1.15, w: 1, h: 1.85, layer: 'wall', script: 'back_door', label: 'patio door', col: C.bone },
      { id: 'table', type: 'table', x: 6, y: 5.6, w: 3, h: 1.5, solid: true, script: 'table', label: 'table' },
    ],
    npcs: [
      { id: 'rose', who: 'rose', x: 6.8, y: 5.5, facing: 'down', pose: 'sit', script: 'rose', when: '!dinner_done' },
      { id: 'rose_sink', who: 'rose', x: 4.1, y: 3.95, facing: 'up', script: 'rose', when: ['dinner_done', '!rose_talk'] },
      { id: 'eddie', who: 'eddie', x: 8.3, y: 5.5, facing: 'down', pose: 'sit', script: 'eddie_kitchen', when: ['told_dad', '!dinner_done'] },
      { id: 'elizabeth', who: 'elizabeth', x: 5.55, y: 6.9, facing: 'right', pose: 'sit', script: 'liz_kitchen', when: ['told_liz', '!dinner_done'] },
      { id: 'samantha', who: 'samantha', x: 9.45, y: 6.9, facing: 'left', pose: 'sit', script: 'sam_kitchen', when: ['dinner_ready', '!dinner_done'] },
    ],
    lights: [
      { x: 7.5, y: 6, r: 5, i: 0.75, phases: NIGHTLIGHT },
      { x: 9.8, y: 3.4, r: 3, i: 0.3, phases: ['day', 'dusk'] },
    ],
  },

  yard: {
    name: 'Front yard', w: 22, h: 10, outside: true,
    map: [
      '######################',
      '######################',
      '######################',
      '######################',
      'h,,,,,,,~~,,,,,,::::,h',
      'h,,,,,,,~~,,,,,,::::,h',
      'h,,,,,,,~~,,,,,,::::,h',
      'h,,,,,,,~~,,,,,,::::,h',
      'h,,,,,,,~~,,,,,,::::,h',
      '----------------------',
    ],
    theme: OUTSIDE_THEME,
    spawns: { from_house: [9, 4.9, 'down'], from_street: [9, 9.1, 'up'] },
    exits: [
      { x: 0, y: 9, w: 0.4, h: 1, script: 'edge' },
      { x: 21.6, y: 9, w: 0.4, h: 1, script: 'edge' },
      { x: 0, y: 9.75, w: 22, h: 0.25, to: 'street', spawn: 'from_yard' },
    ],
    props: [
      { id: 'house', type: 'facade', x: 0, y: 2, w: 15.6, h: 2, layer: 'wall', col: '#66647a', colD: '#56546a', script: 'house_front', label: 'house',
        windows: [{ x: 24, y: 9, w: 14, h: 10 }, { x: 70, y: 9, w: 14, h: 10 }, { x: 180, y: 9, w: 14, h: 10 }, { x: 214, y: 9, w: 12, h: 10 }] },
      { id: 'front_door', type: 'door', x: 8.5, y: 2.2, w: 1, h: 1.8, layer: 'wall', script: 'front_door', label: 'front door', col: C.redD },
      { id: 'porch', type: 'porchlight', x: 9.7, y: 2.6, w: 0.2, h: 0.3, layer: 'wall' },
      { id: 'garage', type: 'garage', x: 16, y: 2.25, w: 4, h: 1.75, layer: 'wall', script: 'garage', label: 'garage' },
      { id: 'dormer1', type: 'litwindow', x: 2.8, y: 0.35, w: 1.2, h: 1, layer: 'wall', script: 'dormer', label: 'your window', when: '!lamp_off' },
      { id: 'dormer2', type: 'litwindow', x: 11.2, y: 0.35, w: 1.2, h: 1, layer: 'wall', lit: false },
      { id: 'bush1', type: 'bush', x: 0.6, y: 3.6, w: 1.4, h: 0.9, solid: true },
      { id: 'bush2', type: 'bush', x: 5.6, y: 3.6, w: 1.4, h: 0.9, solid: true },
      { id: 'bush3', type: 'bush', x: 10.6, y: 3.6, w: 1.4, h: 0.9, solid: true },
      { id: 'bush4', type: 'bush', x: 13.4, y: 3.6, w: 1.4, h: 0.9, solid: true },
      { id: 'tree', type: 'tree', x: 1.6, y: 4.6, w: 3, h: 3.4, solid: [2.8, 7.5, 0.6, 0.5], script: 'oak', label: 'oak tree' },
      { id: 'leaves', type: 'leaves', x: 10.4, y: 6.4, w: 2.2, h: 1.4, layer: 'floor' },
      { id: 'car', type: 'car', x: 16.6, y: 4.3, w: 2.6, h: 3.6, solid: true, script: 'car', label: 'car' },
      { id: 'bike', type: 'bike', x: 14.2, y: 7.6, w: 1.4, h: 0.6, script: 'bike', label: 'bike' },
      { id: 'mailbox', type: 'mailbox', x: 6.6, y: 8.15, w: 0.5, h: 1, solid: [6.6, 8.9, 0.5, 0.25], script: 'mailbox', label: 'mailbox' },
    ],
    npcs: [
      { id: 'eddie', who: 'eddie', x: 12.4, y: 6.6, facing: 'left', pose: 'blower', script: 'eddie_yard', when: '!told_dad' },
    ],
    lights: [
      { x: 9.8, y: 3.5, r: 3.5, i: 0.8, phases: NIGHTLIGHT },
      { x: 2, y: 4.2, r: 2.5, i: 0.4, phases: NIGHTLIGHT },
      { x: 11.5, y: 4.2, r: 2.5, i: 0.4, phases: NIGHTLIGHT },
      { x: 3.4, y: 1.3, r: 1.6, i: 0.5, phases: NIGHTLIGHT, when: '!lamp_off' },
    ],
  },

  street: {
    name: 'The street', w: 44, h: 12, outside: true,
    map: [
      'X########,,,,##########,,,,########,,,#####X',
      'X########,,,,##########,,,,########,,,#####X',
      'X########,,,,##########,,,,########,,,#####X',
      'X########,,,,##########,,,,########,,,#####X',
      'X,,,,,,,,,,,,,,,,~~~,::,,,,,,,,,,,,,,,,,,,,X',
      'X------------------------------------------X',
      'X==========================================X',
      'X==========================================X',
      'X------------------------------------------X',
      'X,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,X',
      'X,,,#########,,,,##########,,,##########,,,X',
      'X,,,#########,,,,##########,,,##########,,,X',
    ],
    theme: OUTSIDE_THEME,
    spawns: { from_yard: [17.9, 5.3, 'down'] },
    exits: [
      { x: 16.6, y: 4, w: 3, h: 0.55, to: 'yard', spawn: 'from_street' },
      { x: 1, y: 4, w: 0.4, h: 6, script: 'edge' },
      { x: 42.6, y: 4, w: 0.4, h: 6, script: 'edge' },
    ],
    props: [
      { id: 'house_a', type: 'facade', x: 1, y: 2, w: 8, h: 2, layer: 'wall', col: '#4e5060', colD: '#42444f', door: 56, script: 'house_a', label: 'house',
        windows: [{ x: 12, y: 9, w: 14, h: 10, until: 18 * 60 }, { x: 96, y: 9, w: 14, h: 10 }] },
      { id: 'house_darko', type: 'facade', x: 13, y: 2, w: 7, h: 2, layer: 'wall', col: '#66647a', colD: '#56546a', door: 64, doorCol: C.redD, script: 'house_darko', label: 'home',
        windows: [{ x: 12, y: 9, w: 14, h: 10 }, { x: 36, y: 9, w: 10, h: 10 }, { x: 92, y: 9, w: 12, h: 10 }] },
      { id: 'garage_darko', type: 'garage', x: 20.2, y: 2.25, w: 2.6, h: 1.75, layer: 'wall' },
      { id: 'house_c', type: 'facade', x: 27, y: 2, w: 8, h: 2, layer: 'wall', col: '#5a4a48', colD: '#4c3e3c', door: 30, script: 'house_c', label: 'house',
        windows: [{ x: 8, y: 9, w: 14, h: 10 }, { x: 70, y: 9, w: 14, h: 10 }, { x: 98, y: 9, w: 14, h: 10, lit: false }] },
      { id: 'house_d', type: 'facade', x: 38, y: 2, w: 5, h: 2, layer: 'wall', col: '#4a5450', colD: '#3e4744', door: 20, script: 'house_d', label: 'house',
        windows: [{ x: 50, y: 9, w: 14, h: 10, lit: false }] },
      { id: 'tree1', type: 'tree', x: 9.4, y: 0.7, w: 3.2, h: 3.6, solid: [10.7, 3.8, 0.6, 0.5], script: 'street_tree', label: 'tree' },
      { id: 'tree2', type: 'tree', x: 23.4, y: 0.7, w: 3.2, h: 3.6, solid: [24.7, 3.8, 0.6, 0.5], script: 'street_tree', label: 'tree' },
      { id: 'tree3', type: 'tree', x: 35, y: 0.9, w: 2.8, h: 3.3, solid: [36.1, 3.7, 0.6, 0.5], script: 'street_tree', label: 'tree' },
      { id: 'mail_a', type: 'mailbox', x: 7.4, y: 4.0, w: 0.5, h: 1, solid: [7.4, 4.75, 0.5, 0.25] },
      { id: 'mail_darko', type: 'mailbox', x: 15.8, y: 4.0, w: 0.5, h: 1, solid: [15.8, 4.75, 0.5, 0.25], script: 'mailbox', label: 'mailbox' },
      { id: 'mail_c', type: 'mailbox', x: 33.4, y: 4.0, w: 0.5, h: 1, solid: [33.4, 4.75, 0.5, 0.25] },
      { id: 'lamp1', type: 'streetlamp', x: 5, y: 3.6, w: 0.5, h: 1.7, solid: [5.1, 5, 0.3, 0.3], script: 'streetlamp', label: 'streetlamp' },
      { id: 'lamp2', type: 'streetlamp', x: 25.5, y: 3.6, w: 0.5, h: 1.7, solid: [25.6, 5, 0.3, 0.3], script: 'streetlamp', label: 'streetlamp' },
      { id: 'lamp3', type: 'streetlamp', x: 15, y: 7.6, w: 0.5, h: 1.7, solid: [15.1, 9, 0.3, 0.3], script: 'streetlamp', label: 'streetlamp' },
      { id: 'lamp4', type: 'streetlamp', x: 38, y: 7.6, w: 0.5, h: 1.7, solid: [38.1, 9, 0.3, 0.3], script: 'streetlamp', label: 'streetlamp' },
      { id: 'busstop', type: 'sign', x: 30.6, y: 7.9, w: 0.6, h: 1.3, solid: [30.7, 8.9, 0.3, 0.3], script: 'bus_stop', label: 'bus stop' },
      { id: 'roadline', type: 'roadline', x: 1, y: 6.95, w: 42, h: 0.1, layer: 'floor' },
    ],
    lights: [
      { x: 5.25, y: 5.4, r: 4.5, i: 0.85, phases: NIGHTLIGHT },
      { x: 25.75, y: 5.4, r: 4.5, i: 0.85, phases: NIGHTLIGHT },
      { x: 15.25, y: 9.4, r: 4.5, i: 0.85, phases: NIGHTLIGHT },
      { x: 38.25, y: 9.4, r: 4.5, i: 0.85, phases: NIGHTLIGHT, flicker: true },
      { x: 18.2, y: 4.3, r: 2, i: 0.6, phases: NIGHTLIGHT },
    ],
  },
};

// fill in ids and check nothing is obviously broken at load time
for (const [id, room] of Object.entries(ROOMS)) {
  room.id = id;
  room.props ||= []; room.npcs ||= []; room.exits ||= []; room.lights ||= []; room.onEnter ||= [];
  if (room.map.length !== room.h || room.map.some(r => r.length !== room.w)) throw new Error(`room ${id}: map is not ${room.w}x${room.h}`);
}

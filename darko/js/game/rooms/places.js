// The rest of Middlesex: the Wizard's Arcade, Powderham Drive and Jim Cunningham's house, the
// Byrd Theatre, Carpathian Ridge, Roberta Sparrow's cellar, and Flight 2806.

import { C } from '../palette.js';
import { NIGHTLIGHT, HOUSE_THEME, OUTSIDE_THEME } from './common.js';

const ROOM = (w, h, door = true) => {
  const rows = [];
  for (let y = 0; y < h; y++) {
    if (y < 3) rows.push('#'.repeat(w));
    else if (y === h - 1) rows.push(door ? '#'.repeat((w >> 1) - 1) + '__' + '#'.repeat(w - (w >> 1) - 1) : '#'.repeat(w));
    else rows.push('#' + '.'.repeat(w - 2) + '#');
  }
  return rows;
};

export const PLACES = {
  arcade: {
    name: "Wizard's Arcade", w: 14, h: 9,
    map: ROOM(14, 9),
    theme: { ...HOUSE_THEME, floor: '#241a34', floorAlt: '#3a2454', wall: '#1a1424', wallD: '#2a1e3a', wallStyle: 'plain' },
    ambience: 'arcade',
    spawns: { start: [7, 7.6, 'up'] },
    exits: [{ x: 6, y: 8.6, w: 2, h: 0.4, script: 'arcade_leave' }],
    props: [
      ...[1.4, 3.2, 5, 9, 10.8].map((x, i) => ({ id: `cab${i}`, type: 'arcadecab', x, y: 2.2, w: 1.4, h: 1.6, solid: [x, 3, 1.4, 0.8], col: [C.red, C.blue, C.amber, C.green, C.pink][i], script: 'arcade_cab', label: 'arcade cabinet' })),
      { id: 'racer', type: 'arcadecab', x: 6.8, y: 2.2, w: 1.8, h: 1.8, solid: [6.8, 3, 1.8, 0.9], col: C.red, script: 'racer', label: 'driving game' },
      { id: 'counter', type: 'counter', x: 1.4, y: 6, w: 2.4, h: 1, solid: true, script: 'token_counter', label: 'token counter' },
    ],
    npcs: [
      { id: 'gretchen', who: 'gretchen', x: 8.6, y: 4.7, facing: 'up', script: 'gretchen_arcade', when: 'beat:oct8' },
      { id: 'kid', who: 'student', x: 10.6, y: 4.2, facing: 'up', script: 'arcade_kid', when: 'beat:oct8' },
    ],
    lights: [{ x: 7, y: 3.6, r: 7, i: 0.6, flicker: true }],
  },

  powderham: {
    name: 'Powderham Drive', w: 26, h: 11, outside: true,
    map: [
      'X,,,,,,,,,##########,,,,,X',
      'X,,,,,,,,,##########,,,,,X',
      'X,,,,,,,,,##########,,,,,X',
      'X,,,,,,,,,##########,,,,,X',
      'X,,,,,,,,,,,,~~,,,,,,,,,,X',
      'X,,,,,,,,,,,,~~,,,,,,,,,,X',
      'X------------------------X',
      'X========================X',
      'X========================X',
      'X------------------------X',
      'XhhhhhhhhhhhhhhhhhhhhhhhhX',
    ],
    theme: { ...OUTSIDE_THEME, wall: '#c8bca0', wallD: '#3a2a1e', wallStyle: 'plain' },
    spawns: { west: [1.8, 6.6, 'right'], from_house: [13.4, 5.4, 'down'] },
    exits: [
      { x: 1, y: 4, w: 0.4, h: 6, script: 'powderham_leave' },
      { x: 24.6, y: 4, w: 0.4, h: 6, script: 'powderham_leave' },
      { x: 8, y: 6, w: 0.5, h: 1, trigger: true, once: 'wallet_seen', when: 'beat:oct18', script: 'wallet_spot' },
    ],
    props: [
      { id: 'mansion', type: 'tudor', x: 10, y: 2, w: 10, h: 2, layer: 'wall', script: 'mansion', label: 'Tudor mansion',
        windows: [{ x: 12, y: 9, w: 12, h: 10 }, { x: 40, y: 9, w: 12, h: 10 }, { x: 110, y: 9, w: 12, h: 10 }, { x: 138, y: 9, w: 12, h: 10 }] },
      { id: 'mdoor', type: 'door', x: 13, y: 2.2, w: 1, h: 1.8, layer: 'wall', script: 'mansion_door', label: 'front door', col: '#3a2a1e' },
      { id: 'mailbox', type: 'mailbox', x: 15.4, y: 5.1, w: 0.5, h: 1, solid: [15.4, 5.85, 0.5, 0.25], script: 'cunningham_mailbox', label: 'mailbox' },
      { id: 'gascan', type: 'gascan', x: 19.6, y: 4.6, w: 0.5, h: 0.7, script: 'gascan', label: 'gas can', when: ['beat:oct24', 'portal_seen', '!have_gas'] },
      { id: 'wallet', type: 'book', x: 9.2, y: 6.3, w: 0.5, h: 0.4, layer: 'floor', script: 'wallet', label: 'wallet', when: ['beat:oct18', '!took_wallet'] },
      { id: 'hedge1', type: 'bush', x: 4, y: 3.4, w: 2.4, h: 1, solid: true },
      { id: 'hedge2', type: 'bush', x: 21, y: 3.4, w: 2.4, h: 1, solid: true },
      { id: 'tree', type: 'tree', x: 1.6, y: 0.6, w: 3, h: 3.4, solid: [2.8, 3.6, 0.6, 0.4], script: 'street_tree', label: 'tree' },
      { id: 'lamp', type: 'streetlamp', x: 7, y: 4.6, w: 0.5, h: 1.7, solid: [7.1, 6, 0.3, 0.3], script: 'streetlamp', label: 'streetlamp' },
      { id: 'roadline', type: 'roadline', x: 1, y: 7.95, w: 24, h: 0.1, layer: 'floor' },
      { id: 'smoke', type: 'fire', x: 10.4, y: 1.4, w: 9, h: 1.6, layer: 'wall', when: ['beat:oct24', 'house_burned'] },
    ],
    lights: [
      { x: 7.25, y: 6.2, r: 4.5, i: 0.85, phases: NIGHTLIGHT },
      { x: 15, y: 3.6, r: 6, i: 0.9, flicker: true, when: ['beat:oct24', 'house_burned'] },
    ],
  },

  cunningham: {
    name: "Jim Cunningham's house", w: 16, h: 10,
    map: ROOM(16, 10),
    theme: { ...HOUSE_THEME, floorKind: 'wood', floor: '#5a3e2a', floorAlt: '#46301e', wall: '#6a5a44', wallD: '#5a4a36', wallStyle: 'panel', wallLow: '#3e3024' },
    ambience: 'house',
    spawns: { from_door: [8, 8.6, 'up'] },
    exits: [{ x: 7, y: 9.6, w: 2, h: 0.4, to: 'powderham', spawn: 'from_house', blockWhen: s => s.has('dousing') && !s.has('house_burned'), script: 'not_done' }],
    props: [
      { id: 'deer', type: 'deer', x: 7.6, y: 1.1, w: 0.8, h: 1, layer: 'wall', script: 'deer', label: 'deer head' },
      { id: 'curtain1', type: 'curtain', x: 2, y: 1, w: 2.2, h: 2, layer: 'wall', script: 'douse_curtains', label: 'curtains' },
      { id: 'curtain2', type: 'curtain', x: 11.8, y: 1, w: 2.2, h: 2, layer: 'wall', script: 'douse_curtains', label: 'curtains' },
      { id: 'shelf', type: 'shelf', x: 5, y: 1.4, w: 2.2, h: 2.1, solid: [5, 3, 2.2, 0.5], script: 'cunningham_tapes', label: 'shelf of tapes' },
      { id: 'couch', type: 'couch', x: 3, y: 5.4, w: 4, h: 1.3, solid: true, script: 'douse_couch', label: 'couch' },
      { id: 'chair', type: 'armchair', x: 10.6, y: 5.2, w: 1.4, h: 1.3, solid: true, script: 'douse_chair', label: 'armchair' },
      { id: 'rug', type: 'rug', x: 4, y: 4.2, w: 8, h: 3.6, layer: 'floor' },
      { id: 'bdoor', type: 'basementdoor', x: 13.4, y: 3.4, w: 1, h: 1.6, solid: true, script: 'basement_door', label: 'a door' },
      { id: 'fire1', type: 'fire', x: 2.8, y: 4.4, w: 4.4, h: 2.2, when: 'house_burned' },
      { id: 'fire2', type: 'fire', x: 1.8, y: 1.6, w: 2.6, h: 1.6, layer: 'wall', when: 'house_burned' },
      { id: 'fire3', type: 'fire', x: 10.2, y: 4.2, w: 2.4, h: 2.2, when: 'house_burned' },
    ],
    npcs: [],
    lights: [
      { x: 8, y: 4, r: 6, i: 0.5 },
      { x: 5, y: 5, r: 8, i: 0.9, flicker: true, when: 'house_burned' },
    ],
  },

  theatre: {
    name: 'The Byrd Theatre', w: 16, h: 12,
    map: ROOM(16, 12),
    theme: { ...HOUSE_THEME, floor: '#3a1418', floorAlt: '#4a1a20', wall: '#2a1414', wallD: '#3a1c1c', wallStyle: 'paper' },
    ambient: 0.5,
    ambience: 'theatre',
    spawns: { seat: [8.6, 8.2, 'up'], aisle: [7.5, 10.6, 'up'] },
    exits: [{ x: 7, y: 11.6, w: 2, h: 0.4, to: 'powderham', spawn: 'west', blockWhen: s => s.beat !== 'oct24' || !s.has('portal_seen') || s.has('house_burned'), script: 'theatre_stay' }],
    props: [
      { id: 'screen', type: 'screen', x: 2.5, y: 0.7, w: 11, h: 2.2, layer: 'wall', script: 'movie', label: 'the screen' },
      ...[4.6, 6.4, 8.2].map((y, i) => ({ id: `row${i}`, type: 'seats', x: 1.6, y, w: 12.8, h: 0.8, solid: true })),
    ],
    npcs: [
      { id: 'gretchen', who: 'gretchen', x: 7.2, y: 8.15, facing: 'up', pose: 'sit', sy: 8.25, script: 'gretchen_asleep', when: 'beat:oct24' },
      { id: 'frank', who: 'frank', x: 6, y: 8.15, facing: 'right', sy: 8.25, script: 'frank_theatre', when: ['beat:oct24', 'frank_theatre', '!portal_seen'] },
    ],
    lights: [{ x: 8, y: 3, r: 7, i: 0.6, flicker: true }],
    onEnter: [{ when: ['beat:oct24', 'house_burned', '!fire_done'], script: 'theatre_return' }],
  },

  ridge: {
    name: 'Carpathian Ridge', w: 24, h: 11, outside: true,
    map: [
      'X,,,,,,,,,,,,,,,,,,,,,,X',
      'X,,,,,,,,,,,,,,,,,,,,,,X',
      'X,,,,,,,,::::,,,,,,,,,,X',
      'X,,,,,,,,::::,,,,,,,,,,X',
      'X,,,,,,,,::::,,,,,,,,,,X',
      'X,,,,,,,,,,,,,,,,,,,,,,X',
      'X,,,,,,,,,,,,,,,,,,,,,,X',
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXXXXXXXXXXXX',
    ],
    theme: OUTSIDE_THEME,
    spawns: { edge: [11, 6.4, 'down'], car: [12.6, 5.2, 'down'] },
    exits: [{ x: 1, y: 0, w: 0.4, h: 7, script: 'ridge_stay' }, { x: 22.6, y: 0, w: 0.4, h: 7, script: 'ridge_stay' }],
    props: [
      { id: 'canyon', type: 'canyon', x: 1, y: 7, w: 22, h: 4, layer: 'floor' },
      { id: 'sky', type: 'stormsky', x: 1, y: 7.3, w: 22, h: 3.6, layer: 'floor', when: ['beat:oct30', 'at_ridge'] },
      { id: 'taurus', type: 'carh', x: 10.4, y: 3, w: 3.4, h: 1.6, solid: true, script: 'ridge_car', label: 'the Taurus', when: 'beat:oct30' },
      { id: 'blankets', type: 'rug', x: 9.4, y: 5.4, w: 3.2, h: 1.4, layer: 'floor', when: 'beat:oct25' },
      { id: 'pine1', type: 'tree', x: 2, y: 0.4, w: 3, h: 3.4, solid: [3.2, 3.3, 0.6, 0.4] },
      { id: 'pine2', type: 'tree', x: 17.4, y: 0.2, w: 3, h: 3.4, solid: [18.6, 3.1, 0.6, 0.4] },
      { id: 'pine3', type: 'tree', x: 20, y: 2.8, w: 3, h: 3.4, solid: [21.2, 5.7, 0.6, 0.4] },
    ],
    npcs: [
      { id: 'gretchen', who: 'gretchen', x: 12.2, y: 6.2, facing: 'down', pose: 'sit', script: 'gretchen_ridge', when: 'beat:oct25' },
    ],
    lights: [{ x: 12, y: 9, r: 9, i: 0.8, when: ['beat:oct30', 'at_ridge'] }],
  },

  cellar: {
    name: "Grandma Death's cellar", w: 14, h: 9,
    map: [
      '##############',
      '#ss###########',
      '#ss###########',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '#............#',
      '##############',
    ],
    theme: { ...HOUSE_THEME, floorKind: 'concrete', floor: '#34302c', floorAlt: '#2a2622', wall: '#3a342e', wallD: '#2e2a24', wallStyle: 'plain', stair: '#4a4034', stairD: '#221c16' },
    ambient: 0.4,
    ambience: 'house',
    spawns: { from_door: [1.9, 3.8, 'down'] },
    exits: [{ x: 1, y: 1, w: 2, h: 0.9, script: 'cellar_stay' }],
    props: [
      { id: 'boxes1', type: 'boxes', x: 4, y: 3.4, w: 2, h: 1.4, solid: true, script: 'cellar_boxes', label: 'boxes' },
      { id: 'boxes2', type: 'boxes', x: 4, y: 6, w: 2, h: 1.4, solid: true, script: 'cellar_boxes', label: 'boxes' },
      { id: 'paintings', type: 'painting', x: 8, y: 1.2, w: 1.4, h: 1, layer: 'wall', script: 'cellar_paintings', label: 'paintings' },
      { id: 'chand', type: 'chandelier', x: 7.4, y: 4.4, w: 1.6, h: 0.6, script: 'cellar_chandelier', label: 'chandelier' },
      { id: 'piano', type: 'piano', x: 10.4, y: 2.6, w: 2.6, h: 1.4, solid: [10.4, 3, 2.6, 1], script: 'piano', label: 'piano' },
      { id: 'boxes3', type: 'boxes', x: 8, y: 6, w: 2.4, h: 1.4, solid: true, script: 'cellar_boxes', label: 'boxes' },
    ],
    npcs: [
      { id: 'gretchen', who: 'gretchen', x: 3, y: 4.8, facing: 'right', follow: true, script: 'gretchen_cellar', when: 'in_cellar' },
    ],
    lights: [{ x: 2, y: 3, r: 4, i: 0.6 }, { x: 11.6, y: 3.6, r: 2.5, i: 0.4 }],
  },

  plane: {
    name: 'Flight 2806', w: 14, h: 7,
    map: [
      '##############',
      '##############',
      '##############',
      '#............#',
      '#............#',
      '#............#',
      '##############',
    ],
    theme: { ...HOUSE_THEME, floor: '#3a3a4a', floorAlt: '#44445a', wall: '#8a8a94', wallD: '#6a6a74', wallStyle: 'plain' },
    ambience: 'plane',
    spawns: { aisle: [12.6, 5.2, 'left'] },
    exits: [],
    props: [
      ...[1.6, 4, 6.4, 8.8, 11.2].map((x, i) => ({ id: `win${i}`, type: 'litwindow', x, y: 1.4, w: 0.9, h: 0.9, layer: 'wall', lit: false })),
      ...[1.4, 3.8, 6.2, 8.6, 11].map((x, i) => ({ id: `seat${i}`, type: 'seats', x, y: 3.3, w: 1.9, h: 0.9, solid: true, col: '#2a3a6a' })),
    ],
    npcs: [
      { id: 'rose', who: 'rose', x: 7, y: 4.25, facing: 'up', pose: 'sit', sy: 4.3 },
      { id: 'samantha', who: 'samantha', x: 7.9, y: 4.25, facing: 'up', pose: 'sit', sy: 4.3 },
    ],
    lights: [{ x: 7, y: 2.4, r: 6, i: 0.5 }],
  },
};

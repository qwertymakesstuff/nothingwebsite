// Shared room themes and conditions. Room format (all positions in 16px tiles; a spawn is
// [x, y, facing] at the feet):
//
// props:  { id, type, x, y, w, h, solid?: true | [x, y, w, h], layer?: 'floor' | 'wall',
//           script?, again?, label?, when?, sy? (sort depth override), ...drawing options }
// npcs:   { id, who, x, y, facing, pose?, script?, when?, sy? }
// exits:  { x, y, w, h, to?, spawn?, when?, blockWhen?, script?, trigger?, once? }
//         Exits are checked in order and only while `when` holds. An exit with no `to`, or whose
//         blockWhen holds, runs its script and puts the player back. A trigger runs its script
//         where the player stands, once (it sets its `once` flag).
// lights: { x, y, r, i, phases?, when?, flicker? }
// onEnter: [{ when, script }]  checked on entry and whenever a scene ends

import { C } from '../palette.js';

export const NIGHTLIGHT = ['dusk', 'night'];

export const HOUSE_THEME = {
  floorKind: 'carpet', floor: '#2e2c3a', floorAlt: '#3a3848',
  wall: '#3c4a4a', wallD: '#344040', trim: C.woodD, top: C.ink, wallStyle: 'paper', threshold: C.woodD,
};

export const OUTSIDE_THEME = {
  wall: '#5c5a68', wallD: '#4a4856', trim: '#3a3846', top: '#1a1820', roof: true, roofD: '#121118', wallStyle: 'siding',
};

export const SCHOOL_THEME = {
  floorKind: 'tile', floor: '#4a4a46', floorAlt: '#3e3e3c', grout: '#2c2c2a',
  wall: '#5a5a4a', wallD: '#4a4a3c', wallLow: '#3c4652', trim: '#2a3440', top: C.ink, wallStyle: 'panel', threshold: '#2a2a30',
};

// the evenings and quiet days the family is simply at home
export const AT_HOME = ['oct3_eve', 'oct4', 'oct5', 'oct6'];
// mornings at the bus stop
export const SCHOOL_MORNING = 'beat:oct3|oct4|oct7';

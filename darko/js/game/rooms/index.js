// Every room in the game, by id, grouped by place: house.js, town.js, places.js and school.js.

import { HOUSE } from './house.js';
import { TOWN } from './town.js';
import { SCHOOL } from './school.js';
import { PLACES } from './places.js';

export const ROOMS = { ...HOUSE, ...TOWN, ...PLACES, ...SCHOOL };

// fill in ids and defaults, and fail loudly at load time if a map is the wrong shape
for (const [id, room] of Object.entries(ROOMS)) {
  room.id = id;
  room.props ||= []; room.npcs ||= []; room.exits ||= []; room.lights ||= []; room.onEnter ||= [];
  if (room.map.length !== room.h || room.map.some(r => r.length !== room.w)) throw new Error(`room ${id}: map is not ${room.w}x${room.h}`);
}

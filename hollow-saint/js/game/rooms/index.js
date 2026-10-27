// Every room in the game, gathered from the area files.
//
// A room: { name, ambience, ambient (0..1 base light), light (lantern radius), map (rows of
// tile characters, see tiles.js), mapPos: [col, row] on the journal map (under: true for
// rooms below ground), spawns, exits, triggers, props, entities, overrides, onEnter,
// noRelic (text shown if the relic is raised here), ringing (a flag that makes a phone ring) }.
// Positions are in tiles (fractions allowed); spawns give the player's feet.
//
// Scripts are lists of variants; the first whose `when` holds is played (see script.js).
// After any interaction the flag `looked:<id>` is set, so repeat visits can be told apart.
// Exits may carry a lock: { flag, key?, open?, locked } - with the key in hand the flag is
// set and the exit opens; otherwise `locked` plays.

import { ROAD } from './road.js';
import { TOWN } from './town.js';
import { ORAN } from './oran.js';
import { BELOW } from './below.js';

export const ROOMS = { ...ROAD, ...TOWN, ...ORAN, ...BELOW };
export const START = { room: 'forest_path', spawn: 'start' };

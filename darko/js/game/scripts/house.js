// The house after the prologue. The same rooms tell time passing: the TV and the paper change
// with the date, Donnie's room is under a tarp after the engine, and he sleeps on the couch.
// Anything not overridden for a beat falls back to the prologue's lines.

import { phase, formatTime } from '../calendar.js';
import { n, say, byBeat } from './util.js';
import { PROLOGUE as P } from './prologue.js';
import { canSleep } from '../timeline.js';

const fall = (key, map) => s => {
  const v = map[s.beat];
  if (v === undefined) { const d = P[key]; return typeof d === 'function' ? d(s) : d; }
  return typeof v === 'function' ? v(s) : v;
};

// sleeping: wherever the current beat says Donnie sleeps, once the day's events are done
export const sleepHere = (room, notYet) => s => {
  if (!canSleep(s, room)) return notYet(s);
  return [
    n(phase(s.time) === 'night' ? 'He is tired. Finally.' : "It isn't late, but he could sleep. He could sleep for a week."),
    ['choice', [['Sleep', [['fadeOut'], ['time', '23:40'], ['wait', 0.6], ['sleep']]], ['Not yet', []]]],
  ];
};

const TV = {
  frank: [n('Static. The station signed off with the national anthem a while ago; nobody turned it off.')],
  oct3_eve: [say('tv', '...an aircraft engine fell onto a house in Middlesex early Sunday. The FAA says it cannot yet identify the aircraft, and no airline has reported a missing engine.'), n('Dad turns it down.')],
  oct4: [say('tv', '...Middlesex Ridge School was closed today after a water main burst overnight and flooded the building. Police say vandals were responsible.'), n('Donnie watches every second of it.')],
  oct5: [n('The vice-presidential debate, from Omaha. Quayle and Bentsen. Dad argues with both of them.'), ['note', 'debate']],
  oct6: [say('tv', '...federal investigators say they still cannot match the engine that fell in Middlesex to any aircraft.'), n('Samantha changes the channel.')],
  flood: [n('Dark. Just his own face, faint in the glass.')],
};

export const HOUSE_SCRIPTS = {
  tv: fall('tv', TV),
  newspaper: fall('newspaper', {
    frank: [n('The paper, folded open to the election. In the dark the headlines are just gray stripes.')],
    oct3_eve: [n("Monday's paper. A photo of their own roof, from across the street. FAA: ENGINE'S ORIGIN A MYSTERY."), ['note', 'roof']],
    oct4: [n('ENGINE STILL UNCLAIMED. Further down: a school board meeting about the budget.')],
    oct5: [n('Debate preview. Weather: clear and cold.')],
    oct6: [n('A short piece about the flooded school. Police "pursuing leads."')],
  }),

  couch: fall('couch', {
    oct3_eve: sleepHere('living', () => [n("Not yet. Dr. Thurman's waiting.")]),
    oct4: sleepHere('living', () => [n('Not yet.')]),
    oct5: sleepHere('living', () => [n('Not yet.')]),
    oct6: sleepHere('living', () => [n("Not yet. Dr. Thurman's at six.")]),
    flood: [n("He doesn't lie back down. Frank is still in the corner.")],
  }),

  recliner: fall('recliner', {
    frank: [n("Dad, asleep in the La-Z-Boy with his mouth open. The TV's static crawls across his face. He doesn't stir.")],
  }),

  eddie_after: fall('eddie_after', {
    frank: [n("Dad doesn't wake up. Donnie walks right past him.")],
    oct3_eve: [say('eddie', 'The roofers say a week. Damn airline better not stiff us on the shingles.')],
    oct4: [say('eddie', "School's flooded? Huh. Well. Enjoy it."), n('He goes back to the TV.')],
    oct5: [say('eddie', 'Look at this guy. Look at him.'), n('He means the man on TV.')],
    oct6: [say('eddie', 'Go easy on Dr. Thurman, bud.')],
  }),

  samantha: fall('samantha', {
    oct3_eve: [say('samantha', 'Is the engine still in your room?'), say('donnie', 'They took it away, Sam.'), say('samantha', 'Darn.')],
    oct4: [say('samantha', 'Joanie says somebody flooded the school on purpose.'), say('donnie', 'Joanie says a lot of things.')],
    oct5: [n('Samantha is practicing a dance routine in front of the TV, counting under her breath.'), say('samantha', "Five, six, seven, eight. Don't watch!")],
    oct6: [say('samantha', 'Mom says you have to go to the doctor again.'), say('donnie', "She's not that kind of doctor.")],
  }),

  callie: fall('callie', {
    frank: [n('Callie lifts her head as he passes. She watches him all the way to the door.')],
    flood: [n('Callie is wide awake, staring into the corner of the room. Her hackles are up.')],
  }),

  rose: fall('rose', {
    oct3_eve: [say('rose', "Your father's taking you to Dr. Thurman's after dinner. Don't argue.")],
    oct4: [say('rose', "School's cancelled and you're still up before me. That's a first.")],
    oct5: [say('rose', 'The roofers say Monday. Maybe.'), n('She looks at the ceiling like it might come down again.')],
    oct6: s => (s.has('thurman2_done') ? [say('rose', 'How did it go?'), say('donnie', 'She hypnotized me.'), say('rose', '...And?'), say('donnie', "I don't remember.")] : [say('rose', "Dr. Thurman, six o'clock. The car's out front.")]),
  }),

  door_donnie: fall('door_donnie', {
    engine: [n("Plastic sheeting over his doorway. Behind it, sky, where the ceiling used to be.")],
  }),

  door_liz: fall('door_liz', {
    frank: [n("Elizabeth's room is empty. She isn't home yet.")],
    flood: [n('Her door is shut. Silence.')],
    oct3_eve: [n('Through the door: Elizabeth on the phone. "...no, it landed on his BED."')],
    oct4: [n('A note taped to her door: AT WORK.')],
    oct5: [say('elizabeth', '(through the door) Go away, Donnie.'), say('donnie', "I didn't say anything."), say('elizabeth', 'Go away anyway.')],
    oct6: [n('Music through the door. Something with a lot of synthesizer.')],
  }),

  door_bath: fall('door_bath', {
    frank: [n('The bathroom. He walks past without looking at the mirror.')],
    oct3_eve: [n('The medicine cabinet. He takes his pills. He counts them twice, for Mom.')],
    oct4: [n('He takes his pills.')],
    oct5: [n('He takes his pills.')],
    oct6: [n('He takes his pills.')],
  }),

  door_parents: fall('door_parents', {
    frank: [n("Mom's asleep. Dad's bed is empty; he's downstairs in his chair.")],
  }),

  fridge: fall('fridge', {
    frank: s => (s.has('took_marker') ? [n("WHERE IS DONNIE? The marker's gone from its string.")] : [
      n('The fridge hums. On its string next to the notepad, the black magic marker.'),
      n('He takes it. He couldn\'t say why.'),
      ['give', 'marker'], ['set', 'took_marker'], ['obj', 'Follow the voice.'],
    ]),
  }),

  stove: fall('stove', {
    oct3_eve: [n('A casserole a neighbor brought over. Everybody keeps bringing casseroles.')],
    oct4: [n('Cold coffee in the pot.')],
  }),

  clock: s => [n(`The kitchen clock says ${formatTime(s.time)}.`)],

  front_door_blocked: s => {
    if (s.beat === 'oct1') return P.front_door_night(s);
    if (s.beat === 'frank') return [n('His hand stops on the doorknob. Not yet. Something in the kitchen.')];
    if (s.beat === 'flood') return [n('Frank is still in the corner, watching him.')];
    return [n("It's late. Mom has the deadbolt on and the chain across.")];
  },

  flood_stairs: [n("He can't look away from the corner of the room.")],

  front_door: s => (s.beat === 'engine' ? [n('A fireman shakes his head. Nobody goes in.')] : [['sfx', 'door'], ['go', 'living', 'from_front']]),

  house_front: byBeat({
    engine: [n('Half the roof is gone over his window. Blue tarp, splintered rafters, sky.')],
  }, [n('Home. Blue TV light moves on the living room ceiling.')]),

  roofhole: [n('The hole in the roof over his room, under a blue tarp. It snaps in the wind like a flag.')],

  car: byBeat({
    oct6: s => (s.has('thurman2_done') ? [n("Mom's car. The engine's still ticking.")] : [
      n('Mom is already behind the wheel. They drive out past the edge of town.'),
      ['fadeOut'], ['time', '18:00'], ['run', 'thurman2'],
    ]),
  }, [n("Dad's car. Leaves are already collecting under the wipers.")]),

  edge: s => {
    if (s.beat === 'frank') return [n("Not that way. The voice is coming from the golf course. East.")];
    if (s.beat === 'engine') return [n('The street is full of people. He needs to get to the house.')];
    if (s.beat === 'oct4' && s.has('walking_gretchen')) return [n("Gretchen's house is the other way.")];
    if (phase(s.time) === 'night') return [n("It's late. Mom will be watching the windows.")];
    if (s.beat === 'oct1') return P.edge(s);
    return [n("Nowhere he needs to be that way. Not today.")];
  },

  // ---- the street on school mornings -------------------------------------------------------

  bus_stop: byBeat({}, [n('The school bus stops here every weekday morning.')]),
};

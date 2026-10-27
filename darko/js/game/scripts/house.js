// The house after the prologue. The same rooms tell time passing: the TV and the paper change
// with the date, Donnie's room is under a tarp after the engine and he sleeps on the couch until
// it is fixed. On Saturday, October 1 everything uses the prologue's lines; on later days each
// thing uses that beat's line, or a neutral one.

import { phase, formatTime } from '../calendar.js';
import { n, say, byBeat } from './util.js';
import { PROLOGUE as P } from './prologue.js';
import { canSleep } from '../timeline.js';

const run = (v, s) => (typeof v === 'function' ? v(s) : v);

// fall(key, { beat: lines }, later): the prologue on October 1, then per beat, then `later`
const fall = (key, map, later) => s => {
  if (s.beat === 'oct1' && map.oct1 === undefined) return run(P[key], s);
  if (map[s.beat] !== undefined) return run(map[s.beat], s);
  return run(later !== undefined ? later : P[key], s);
};

const sleepChoice = [['choice', [['Sleep', [['fadeOut'], ['time', '23:40'], ['wait', 0.6], ['sleep']]], ['Not yet', []]]]];

// sleeping: wherever the current beat says Donnie sleeps, once the day's events are done
export const sleepHere = (room, notYet, before = []) => s => {
  if (!canSleep(s, room)) return run(notYet, s);
  return [
    ...before,
    n(phase(s.time) === 'night' ? 'He is tired. Finally.' : "It isn't late, but he could sleep. He could sleep for a week."),
    ...sleepChoice,
  ];
};

const notYet = [n('Not yet. There is still something he has to do today.')];

const TV = {
  frank: [n('Static. The station signed off with the national anthem a while ago; nobody turned it off.')],
  oct3_eve: [say('tv', '...an aircraft engine fell onto a house in Middlesex early Sunday. The FAA says it cannot yet identify the aircraft, and no airline has reported a missing engine.'), n('Dad turns it down.')],
  oct4: [say('tv', '...Middlesex Ridge School was closed today after a water main burst overnight and flooded the building. Police say vandals were responsible.'), n('Donnie watches every second of it.')],
  oct5: [n('The vice-presidential debate, from Omaha. Quayle and Bentsen. Dad argues with both of them.'), ['note', 'debate']],
  oct6: [say('tv', '...federal investigators say they still cannot match the engine that fell in Middlesex to any aircraft.'), n('Samantha changes the channel.')],
  flood: [n('Dark. Just his own face, faint in the glass.')],
  oct7_pm: [say('tv', '...cleanup at Middlesex Ridge School, where construction crews have finished pumping water from twelve classrooms...'), n('Workers in the footage are packing up their things.')],
  oct16: [n('The Redskins, losing. John Madden draws his lines across the frozen players on the screen.')],
  oct25: [say('tv', '...Cunningham, the motivational speaker, was arrested this morning. Cunning Visions denies everything.')],
  oct29: [n('Music videos, the sound down. Nobody is watching.')],
  oct30: [n('Snow on the screen. Someone at the party unplugged the antenna.')],
};

export const HOUSE_SCRIPTS = {
  tv: fall('tv', TV, [n('Nothing on. He watches it anyway.')]),
  newspaper: fall('newspaper', {
    frank: [n('The paper, folded open to the election. In the dark the headlines are just gray stripes.')],
    oct3_eve: [n("Monday's paper. A photo of their own roof, from across the street. FAA: ENGINE'S ORIGIN A MYSTERY."), ['note', 'roof']],
    oct4: [n('ENGINE STILL UNCLAIMED. Further down: a school board meeting about the budget.')],
    oct5: [n('Debate preview. Weather: clear and cold.')],
    oct6: [n('A short piece about the flooded school. Police "pursuing leads."')],
    oct8: [n('PTA MEETING TURNS HEATED. A photo of Ms. Farmer, mid-sentence, holding up a paperback.')],
    oct25: [n('Tomorrow\'s headline will be about Jim Cunningham. Today\'s is still the election.')],
    oct26: [n('JIM CUNNINGHAM CHARGED. A photo of him ducking his head into a police car.'), ['note', 'charged']],
  }, [n('The paper. The election, the World Series, the weather.')]),

  couch: fall('couch', {
    oct3_eve: sleepHere('living', [n("Not yet. Dr. Thurman's waiting.")]),
    oct4: sleepHere('living', notYet),
    oct5: sleepHere('living', notYet),
    oct6: sleepHere('living', [n("Not yet. Dr. Thurman's at six.")]),
    oct7_pm: sleepHere('living', [n('Not yet. His pills.')]),
    oct8: sleepHere('living', notYet),
    flood: [n("He doesn't lie back down. Frank is still in the corner.")],
  }, [n('The couch. His room is fixed; he doesn\'t have to sleep down here anymore.')]),

  recliner: fall('recliner', {
    frank: [n("Dad, asleep in the La-Z-Boy with his mouth open. The TV's static crawls across his face. He doesn't stir.")],
    oct16: s => (s.has('thurman3_done') && !s.has('gun_found') && !s.has('spears') ? [['run', 'spears_vision']] : [n("Dad's La-Z-Boy.")]),
  }, [n("Dad's La-Z-Boy. Technically anyone can sit in it.")]),

  eddie_after: fall('eddie_after', {
    frank: [n("Dad doesn't wake up. Donnie walks right past him.")],
    oct3_eve: [say('eddie', 'The roofers say a week. Damn airline better not stiff us on the shingles.')],
    oct4: [say('eddie', "School's flooded? Huh. Well. Enjoy it."), n('He goes back to the TV.')],
    oct5: [say('eddie', 'Look at this guy. Look at him.'), n('He means the man on TV.')],
    oct6: [say('eddie', 'Go easy on Dr. Thurman, bud.')],
    oct8: [say('eddie', 'How was the arcade?'), say('donnie', 'I crashed into a tree.'), say('eddie', 'That happens.')],
    oct16: [say('eddie', 'We need Theisman.'), say('fisher', 'We need a miracle.')],
    oct20: [say('eddie', "Two days' suspension. Your mother's beside herself."), n("He doesn't sound like he is.")],
  }, [say('eddie', 'Hey, bud.')]),

  fisher_game: [say('fisher', 'Son. Staying off the greens these days?'), n('Dr. Fisher laughs at his own joke.')],
  ronald_game: [say('ronald', "My dad says the Redskins are cursed. He says that every year.")],

  samantha: fall('samantha', {
    oct3_eve: [say('samantha', 'Is the engine still in your room?'), say('donnie', 'They took it away, Sam.'), say('samantha', 'Darn.')],
    oct4: [say('samantha', 'Joanie says somebody flooded the school on purpose.'), say('donnie', 'Joanie says a lot of things.')],
    oct5: [n('Samantha is practicing a dance routine in front of the TV, counting under her breath.'), say('samantha', "Five, six, seven, eight. Don't watch!")],
    oct6: [say('samantha', 'Mom says you have to go to the doctor again.'), say('donnie', "She's not that kind of doctor.")],
    oct7_pm: [say('samantha', 'Mom and Dad went to the meeting about the flood. Are you in trouble?'), say('donnie', 'Not yet.')],
    oct13_eve: [say('samantha', 'Ms. Farmer is Beth\'s mom, you know.'), say('donnie', 'I know.'), say('samantha', 'Beth says you said a bad word to her.')],
    oct23: [say('samantha', "Sparkle Motion goes on last tomorrow. Last is the best."), ['note', 'sparkle']],
    oct26: [say('samantha', "We're going to be on TV, Donnie. Star Search. In California.")],
  }, [say('samantha', "Shh. I'm watching.")]),

  dog: fall('dog', {
    frank: [n('The dog lifts her head as he passes. She watches him all the way to the door.')],
    flood: [n('The dog is wide awake, staring into the corner of the room. Her hackles are up.')],
    oct30: [n('The dog is hiding under the coffee table from the party. She won\'t come out.')],
  }, [n('The dog thumps her tail against the floor.')]),

  rose: fall('rose', {
    oct3_eve: [say('rose', "Your father's taking you to Dr. Thurman's after dinner. Don't argue.")],
    oct4: [say('rose', "School's cancelled and you're still up before me. That's a first.")],
    oct5: [say('rose', 'The roofers say Monday. Maybe.'), n('She looks at the ceiling like it might come down again.')],
    oct6: s => (s.has('thurman2_done') ? [say('rose', 'How did it go?'), say('donnie', 'She hypnotized me.'), say('rose', '...And?'), say('donnie', "I don't remember.")] : [say('rose', "Dr. Thurman, six o'clock. The car's out front.")]),
    oct8: [say('rose', 'Was that the girl from the meeting? Gretchen?'), say('donnie', 'Mom.'), say('rose', "I'm just asking.")],
    oct14: [say('rose', 'Sit down, dinner.')],
    oct15: [say('rose', 'Your friend is welcome to stay for dinner.'), say('donnie', "She's not my friend."), say('rose', '...Oh.')],
    oct20: [n("Mom doesn't say anything. She keeps washing the same plate.")],
    oct23: [say('rose', 'Sit down, dinner.')],
    oct25: [say('rose', "Your father's flying to New York tonight. Be nice.")],
  }, [say('rose', 'Hi, honey.')]),

  rose_wine: [say('rose', 'Anne keeps telling me about this Jim Cunningham.'), n('She refills her glass.')],
  anne: [
    say('anne', "His tapes made me realize that for forty-five years I've been a prisoner of fear. Rose, you have to meet Jim Cunningham."),
    say('anne', "I can't believe he's not married."),
  ],

  door_donnie: fall('door_donnie', {
    engine: [n('Plastic sheeting over his doorway. Behind it, sky, where the ceiling used to be.')],
  }, s => (s.has('engine_fell') ? [n('Plastic sheeting over his doorway. The roofers aren\'t done.')] : [['sfx', 'door'], ['go', 'donnie_room', 'from_hall']])),

  door_liz: fall('door_liz', {
    frank: [n("Elizabeth's room is empty. She isn't home yet.")],
    flood: [n('Her door is shut. Silence.')],
    oct3_eve: [n('Through the door: Elizabeth on the phone. "...no, it landed on his BED."')],
    oct4: [n('A note taped to her door: AT WORK.')],
    oct5: [say('elizabeth', '(through the door) Go away, Donnie.'), say('donnie', "I didn't say anything."), say('elizabeth', 'Go away anyway.')],
    oct6: [n('Music through the door. Something with a lot of synthesizer.')],
    oct29: [n('Her door is open. Her Harvard letter is taped to the mirror.')],
  }, [n("Elizabeth's door. Music, or the phone, or both.")]),

  door_bath: [['sfx', 'door'], ['go', 'bathroom', 'start']],
  toilet: [n('The toilet. Where Elizabeth caught him flushing the pills.')],
  tub: [n('The bathtub. A ring of Samantha\'s bubble bath.')],
  mirror_stay: [n('He can\'t look away from the mirror.')],
  sam_bath: [say('samantha', 'Who are you talking to?')],

  cabinet: s => {
    if (s.beat === 'oct1') {
      if (s.has('rose_talk') && !s.has('took_pills')) {
        return [
          n('He opens the medicine cabinet. The orange bottle: L. THURMAN, M.D.'),
          ['note', 'thurman'],
          ['choice', [
            ['Take them', [['sfx', 'pills'], n('He shakes the pills into his palm and swallows them, watching himself in the mirror until it gets uncomfortable.'), ['set', 'took_pills'], ['obj', 'Go to bed.'], ['save']]],
            ['Not yet', [n('He shuts the cabinet. The mirror swings back, and there he is again.')]],
          ]],
        ];
      }
      if (s.has('took_pills')) return [n("His reflection looks like it hasn't slept in a week.")];
      return [n('The medicine cabinet. A crack runs across one corner of the mirror.'), n('Behind the mirror, the orange bottle with his name on it.'), ['note', 'thurman']];
    }
    if (s.beat === 'frank') return [n('He walks past the mirror without looking at it.')];
    if (s.beat === 'oct7_pm' && !s.has('mirror1')) return [['run', 'mirror_frank']];
    if (s.beat === 'oct18' && s.hasItem('knife') && !s.has('knife_done')) return [['run', 'mirror_knife']];
    if (s.has('placebos')) return [n('Pills made of water. He takes them anyway.')];
    return [['sfx', 'pills'], n('He takes his pills. He counts them twice, for Mom.')];
  },

  door_parents: s => {
    if (s.beat === 'frank') return [n("Mom's asleep. Dad's bed is empty; he's downstairs in his chair.")];
    if (s.beat === 'oct1') return run(P.door_parents, s);
    if (s.has('spears')) return [n('His spear slides under the door, and he follows it.'), ['go', 'parents_room', 'from_hall']];
    if (s.beat === 'oct29' && s.has('gretchen_arrived') && !s.has('gretchen_up')) {
      return [n('He takes Gretchen upstairs, away from the noise.'), ['set', 'gretchen_up'], ['go', 'parents_room', 'from_hall'], ['run', 'parents_bed_scene']];
    }
    return [n("Mom and Dad's room. Off limits, more or less.")];
  },
  parents_stay: s => [n(s.has('spears') ? 'The spear pulls him toward the closet.' : "Not yet. Gretchen's here.")],
  parents_window: [n('The street. Somebody\'s jack-o\'-lantern guttering on a porch.')],
  parents_bed: [n("Mom and Dad's bed, made tight enough to bounce a quarter on.")],
  parents_dresser: [n("Dad's watch, Mom's earrings, a dish of loose change.")],
  answering: s => [n(s.has('rose_message') ? 'The answering machine blinks: 1 message.' : 'The answering machine. No messages.')],

  closet: s => {
    if (s.has('spears') && s.beat === 'oct16') return [['run', 'gun_box']];
    if (s.beat === 'oct29' && s.has('gretchen_up') && !s.hasItem('gun')) {
      return [
        n("His father's closet. The shoe rack. The box underneath it."),
        n('This time he takes what\'s inside.'),
        ['give', 'gun'],
        ['set', 'party_go'],
      ];
    }
    return [n("Dad's suits, Mom's dresses, and under the shoe rack, a box he knows not to touch.")];
  },

  fridge: fall('fridge', {
    frank: s => (s.has('took_marker') ? [n("WHERE IS DONNIE? The marker's gone from its string.")] : [
      n('The fridge hums. On its string next to the notepad, the black magic marker.'),
      n('He takes it. He couldn\'t say why.'),
      ['give', 'marker'], ['set', 'took_marker'], ['obj', 'Follow the voice.'],
    ]),
    oct30: s => (s.has('spears') && !s.has('beer_note') ? [['run', 'beer_note']] : [n('FRANK WAS HERE... WENT TO GET BEER!!')]),
  }, [n('The fridge. Somebody has drawn a pumpkin on the notepad.')]),

  knives: s => {
    if (s.beat === 'oct18' && s.has('pumpkin_carved') && !s.hasItem('knife') && !s.has('knife_done')) {
      return [n('He opens the drawer and takes out the butcher knife. He doesn\'t decide to. His hand does.'), ['give', 'knife'], ['obj', 'Upstairs. The bathroom.']];
    }
    return [n('The knife drawer.')];
  },

  pumpkin: s => [n(s.has('pumpkin_carved') ? 'The jack-o\'-lantern. Its face looks exactly like Frank\'s.' : 'A pumpkin, waiting to be carved.')],

  stove: fall('stove', {
    oct3_eve: [n('A casserole a neighbor brought over. Everybody keeps bringing casseroles.')],
    oct4: [n('Cold coffee in the pot.')],
  }, [n('The stove. Something left on low.')]),

  table: fall('table', {}, [n('The kitchen table.')]),
  sink: fall('sink', {}, [n('Dishes.')]),
  phone: fall('phone', {
    oct29: [n('The phone rings and rings in the noise. Nobody hears it but him.')],
  }, [n('The kitchen phone.')]),
  back_door: s => {
    const open = s.beat === 'oct15' || s.beat === 'oct25' || s.beat === 'oct30' || (s.beat === 'oct29' && s.has('party_on'));
    if (s.beat === 'oct30' && s.has('spears')) return [n('Not yet. The spear points at the fridge.')];
    return open ? [['sfx', 'door'], ['go', 'backyard', 'from_kitchen']] : run(P.back_door, s);
  },
  back_in: [['sfx', 'door'], ['go', 'kitchen', 'from_back']],
  clock: s => [n(`The kitchen clock says ${formatTime(s.time)}.`)],

  front_door_blocked: s => {
    if (s.beat === 'oct1') return P.front_door_night(s);
    if (s.beat === 'frank') return [n('His hand stops on the doorknob. Not yet. Something in the kitchen.')];
    if (s.beat === 'flood') return [n('Frank is still in the corner, watching him.')];
    if (s.has('spears')) return [n('The spear doesn\'t go that way.')];
    if (s.beat === 'oct29' && s.has('party_on')) {
      if (s.has('party_friends') && !s.has('gretchen_arrived')) return [['run', 'gretchen_arrives']];
      return [n('The doorbell keeps ringing. Kids he half knows keep coming in.')];
    }
    if (s.beat === 'oct30') return [n('Not that way. Not yet.')];
    return [n("It's late. Mom has the deadbolt on and the chain across.")];
  },

  flood_stairs: s => [n(s.has('spears') ? 'The spear pulls him the other way.' : "He can't look away from the corner of the room.")],
  spear_pull: [n('The spear pulls him back.')],

  front_door: s => (s.beat === 'engine' ? [n('A fireman shakes his head. Nobody goes in.')] : [['sfx', 'door'], ['go', 'living', 'from_front']]),

  house_front: byBeat({
    engine: [n('Half the roof is gone over his window. Blue tarp, splintered rafters, sky.')],
    oct30: [n('Somebody has thrown toilet paper into every tree.')],
  }, [n('Home. Blue TV light moves on the living room ceiling.')]),
  house_back: [n('The back of the house. The kitchen light is on.')],

  roofhole: [n('The hole in the roof over his room, under a blue tarp. It snaps in the wind like a flag.')],

  car: byBeat({
    oct6: s => (s.has('thurman2_done') ? [n("Mom's car. The engine's still ticking.")] : [
      n('Mom is already behind the wheel. They drive out past the edge of town.'),
      ['fadeOut'], ['time', '18:00'], ['run', 'thurman2'],
    ]),
    oct30: s => (s.has('kissed_liz') ? [['run', 'drive_ridge']] : [n('The Taurus. Mom left Elizabeth the keys. They\'re on the kitchen table.')]),
  }, [n("The car. Leaves are already collecting under the wipers.")]),

  edge: s => {
    if (s.beat === 'frank') return [n('Not that way. The voice is coming from the golf course. East.')];
    if (s.beat === 'engine') return [n('The street is full of people. He needs to get to the house.')];
    if (s.beat === 'oct4' && s.has('walking_gretchen')) return [n("Gretchen's house is the other way.")];
    if (phase(s.time) === 'night') return [n("It's late. Mom will be watching the windows.")];
    if (s.beat === 'oct1') return P.edge(s);
    return [n('Nowhere he needs to be that way. Not today.')];
  },

  // ---- the party ---------------------------------------------------------------------------

  partier: s => [n(s.beat === 'oct30' ? 'Somebody in a Ronald Reagan mask raises a beer at him.' : ['A kid in a mask he doesn\'t recognize. They raise a beer.', 'Somebody\'s dancing on the coffee table.', 'A vampire, a nurse and a guy in a garbage bag argue about the Redskins.'][Math.floor(s.time) % 3])],
  liz_party: [say('elizabeth', '(over the music) Has anybody seen Frank?'), say('partier', "Beer run, I think!")],
  sean_party: [say('sean', 'We got eggs, water balloons, and a dozen rolls of toilet paper.')],
  ronald_party: [say('ronald', 'I stole four beers from my dad.'), say('donnie', "There's a keg here."), say('sean', 'Only losers drink keg beer.')],
  gretchen_party: [say('gretchen', 'I don\'t want to be alone tonight.')],
  liz_asleep: s => (s.has('kissed_liz') ? [n('Elizabeth, asleep on the couch.')] : [
    n('Elizabeth is asleep on the couch in the wreck of the party.'),
    n('He leans down and kisses his sister on the forehead.'),
    ['set', 'kissed_liz'],
    ['obj', 'The car. (Out front.)'],
  ]),

  // ---- the backyard ------------------------------------------------------------------------

  ptable: [n('The patio table. A citronella candle, long out.')],
  trampoline: s => (s.beat === 'oct15' && !s.has('trampoline_done') ? [['run', 'trampoline_scene']] : [n('Samantha\'s trampoline.')]),
  gretchen_tramp: s => (s.has('trampoline_done') ? [] : [['run', 'trampoline_scene']]),
  leafsheet: [n('A big sheet for the leaves.')],
  rake: s => (s.has('raked') ? [n('The rake.')] : [['run', 'raking']]),
  eddie_rake: s => (s.has('raked') ? [] : [['run', 'raking']]),

  // ---- the bedroom, later ------------------------------------------------------------------

  bed: s => {
    if (s.beat === 'oct1') return run(P.bed, s);
    if (s.beat === 'frank') return [n("He isn't getting back in. Not yet.")];
    if (s.beat === 'oct13_eve') return sleepHere('donnie_room', notYet, [n('He lies on the new bed and looks up at the ceiling. Then over at the calendar on the wall.'), say('donnie', '28 days, 6 hours, 42 minutes, 12 seconds.')])(s);
    return sleepHere('donnie_room', notYet)(s);
  },
  room_calendar: s => [n(`October. Every day so far crossed off in red, up to the ${s.day}th. Tacked to the corner: a drawing of Frank.`), ['note', 'calendar']],
  desk: fall('desk', {
    oct20: s => (s.hasItem('letter') || s.has('letter_sent') ? [n('His desk.')] : [
      n('He sits down and writes a letter. He addresses the envelope carefully: MS. ROBERTA SPARROW, 22 OLD GUN ROAD.'),
      ['give', 'letter'], ['obj', 'Mail the letter. (The mailbox out front.)'],
    ]),
    oct26: [n('A drawing he has been working on for days: a cloud formation, a spiral with a hard white center. Across the top he has written THE PORTAL.'), ['note', 'portal_drawing']],
    oct14: [n('He opens the book on the desk and reads until his eyes hurt.'), ['read', 'philosophy']],
  }, s => (s.hasItem('philosophy') ? [['read', 'philosophy']] : [n('His desk.')])),
  mailbox: s => {
    if (s.hasItem('letter') && !s.has('letter_sent')) return [n('He puts the letter in the mailbox and puts up the flag.'), ['take', 'letter'], ['set', 'letter_sent'], ['obj', 'Get some sleep.']];
    return run(P.mailbox, s);
  },
};

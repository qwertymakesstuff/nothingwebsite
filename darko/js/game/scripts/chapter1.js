// Chapter 1, "Wake Up, Donnie": October 2, 1988. The voice at 12:50 AM, the walk to the golf
// course, Frank and the countdown; the engine coming through the roof; the morning on the
// seventh green; the crane, the FAA and the hotel. Frank's few lines that carry the plot are kept
// close to the film; everything around them is paraphrased.

import { n, say } from './util.js';
import { sleepHere } from './house.js';

export const CHAPTER1 = {
  frank_wake: [
    ['card', ['OCTOBER 2 1988'], 2.8],
    ['place', 'player', 3.6, 5.2, 'left'],
    ['set', 'lamp_off'],
    ['fadeIn'],
    ['wobble', 1.5, 4],
    say('voice', '(a whisper) Wake... up... Donnie.'),
    ['sfx', 'sting'],
    n('He jerks upright. The clock on the desk says 12:50. He doesn\'t remember deciding to stand up, but he\'s standing.'),
    ['set', 'woke_oct2'],
    ['obj', 'Follow the voice.'],
    ['save'],
  ],

  nothing_there: [n('Nothing in here now.')],

  frank_golf: [
    ['wobble', 1, 60],
    say('voice', 'Quite a night for a walk... huh, Donnie?'),
    n('He stares out across the dark fairway.'),
    say('voice', 'Tonight is very special, Donnie.'),
    say('donnie', 'What?'),
    say('voice', "I've been watching you."),
    n('He holds his stomach, taking slow breaths. The ground feels tilted.'),
    ['sfx', 'sting'], ['flash'],
    n('There. Standing on the seventh green: a six-foot-tall figure in a grotesque rabbit suit.'),
    ['note', 'frank'],
    ['obj', 'Go to him.'],
  ],

  frank_golf_talk: [
    say('frank', 'My name is Frank.'),
    say('frank', 'I want you to follow me.'),
    ['choice', [['"Why?"', [say('donnie', 'Why?')]], ['Say nothing', [n('Donnie says nothing. His mouth has gone dry.')]]]],
    say('frank', "I'm here to save you. The world is coming to an end, Donnie."),
    say('frank', 'Look up at the sky.'),
    ['face', 'player', 'up'],
    n('He looks up into the black night.'),
    ['time', '01:30'],
    ['wobble', 2.5, 60],
    say('frank', '28 days... 6 hours... 42 minutes... 12 seconds.'),
    say('frank', 'That is when the world will end.'),
    ['set', 'countdown'],
    n('Donnie looks back at Frank. Nothing in his head at all.'),
    ['sfx', 'sting'], ['flash'], ['shake', 2, 0.6],
    ['set', 'frank_gone'],
    ['fadeOut'],
    ['wobble', 0, 0],
    // meanwhile, at the house
    ['set', 'crash_scene'],
    ['set', 'hide_player'],
    ['go', 'living', 'crash'],
    n('At the house, Elizabeth slips in through the front door and leans back against it, eyes closed.'),
    n("In the La-Z-Boy, Dad sleeps through the end of the broadcast. The anthem. Then static."),
    ['sfx', 'static'],
    ['wait', 1.2],
    ['sfx', 'thud'], ['shake', 5, 1.6], ['dust', 2.4], ['set', 'crashed'],
    n('A roar from above, like the sky splitting open. Plaster pours from the ceiling. Books fly off the shelves upstairs.'),
    n('Dad jerks awake. Elizabeth falls back against the door, plaster in her hair.'),
    ['set', 'engine_fell'],
    ['go', 'donnie_room', 'crash'],
    ['dust', 1.5],
    n("Where Donnie's bed was, there is a jet engine."),
    ['wait', 1.2],
    ['unset', 'crash_scene'], ['unset', 'hide_player'],
    ['fadeOut'],
  ],

  engine_room: [n('The engine. It is still ticking as it cools.')],
  liz_crash: [n('Elizabeth stares at the ceiling.')],

  golf_leave: s => [n(s.beat === 'frank' ? 'The voice is coming from out on the course. He keeps walking.' : '"Son?" Dr. Fisher is still talking to him.')],
  pin: s => [n(s.beat === 'engine' ? 'The flag on the seventh hole snaps in the wind.' : 'The flag for the seventh hole. 7, in white.')],
  golf_tree: [n('Pines, black against the sky. The wind moves the tops and nothing else.')],
  golfcart: [n('A golf cart, four bags of clubs on the back.')],

  // ---- the morning after -------------------------------------------------------------------

  golf_wake: [
    ['card', ['SUNDAY MORNING'], 2.2],
    ['go', 'golf', 'green'],
    ['time', '10:00'],
    n('Donnie is curled up asleep on the seventh green. A golf ball drops out of the sky, bounces once, and rolls to a stop beside his head.'),
    ['sfx', 'tap'],
    ['set', 'golf_woken'],
    ['face', 'player', 'down'],
    say('fisher', 'Donnie Darko? Son, what\'s going on here?'),
    say('cunningham', 'Who is it, Don?'),
    say('fisher', "Eddie Darko's kid."),
    n('Donnie gets up and brushes himself off. On his forearm, in black magic marker, somebody has written numbers.'),
    n('28:06:42:12'),
    ['note', 'arm'],
    say('fisher', '(to the other man) Sorry about this, Jim. Kid from the neighborhood.'),
    say('fisher', "(to Donnie) Let's stay off the greens at night, OK?"),
    n('The other man just smiles at him. A big, warm, practiced smile.'),
    say('donnie', "Sorry, Dr. Fisher. It won't happen again."),
    ['set', 'golf_done'],
    ['note', 'cunningham_golf'],
    ['obj', 'Go home.'],
    ['save'],
  ],

  fisher: [say('fisher', 'Go on home, son.')],
  cunningham_golf: [n('He smiles.')],

  officer: s => (s.has('officer_ok') ? [say('officer', 'Go on through.')] : [
    say('donnie', 'Hey, I live here!'),
    say('officer', 'Are you... Donnie Darko?'),
    say('donnie', 'Yeah!'),
    n('He lifts the tape and lets him through.'),
    ['set', 'officer_ok'],
  ]),
  path_blocked: s => (s.has('walking_gretchen') ? [n("Gretchen's walking the other way. West.")] : [say('officer', 'Behind the barricade, please.')]),
  crowd: [n('Neighbors in bathrobes and church clothes, craning to see. Someone points at the roof.')],
  firetruck: [n('A fire engine, idling. A man in a silver fire suit sprays something down in the yard.')],
  policecar: [n('A police car, lights turning lazily.')],
  newsvan: [n('A news van. Channel 12. A reporter fixes her hair in the side mirror.')],

  engine_arrive: [
    n('A crane is swinging something enormous out of the house: a jet engine, lowered onto a flatbed truck. Firemen kick broken shingles off the roof.'),
    n('He turns and sees his whole family standing in the yard. Dad is holding Samantha.'),
    say('samantha', 'It fell on your room.'),
    ['set', 'engine_seen'],
    ['note', 'engine'],
    ['obj', 'Stay with the family.'],
  ],

  samantha_engine: [say('samantha', 'It fell right on your bed. Right on it.')],
  liz_engine: [say('elizabeth', "(whispering, grinning) They don't know where it came from."), ['note', 'faa']],
  rose_engine: [say('rose', 'Donnie.'), n('She holds onto him for a long time. She doesn\'t ask where he was.')],
  garland: [
    say('garland', "Mrs. Darko, my name is Bob Garland. This is David Coleman. We're with the FAA."),
    say('garland', "If you don't mind, we'd like to speak with you and your husband privately."),
    ['note', 'faa'],
  ],
  fireman: [say('fireman', 'Stand back, kid.')],
  crane: [n('A caterpillar crane on the driveway, its arm reaching over the roof.')],
  flatbed: [n('The engine, strapped to a flatbed truck. It is bigger than their car. Somebody sprays it down with water and it hisses.')],
  engine_stay: [n('Not without the family.')],

  eddie_engine: s => (!s.has('engine_seen') ? [] : [
    n('Dad signs papers on a folding table while one of the FAA men points: here. And here.'),
    say('garland', "We've arranged a hotel for you. Get some sleep. We'll take care of things here."),
    say('eddie', "Come on, Donnie. We're going to a hotel."),
    ['set', 'hotel_go'],
    ['fadeOut'],
    ['time', '17:30'],
    ['go', 'hotel', 'start'],
    n('Sunday night. Room 614. Mom and Dad are next door in 615.'),
    ['obj', 'Get some sleep.'],
    ['save'],
  ]),

  // ---- the hotel -----------------------------------------------------------------------------

  sam_hotel: s => (s.has('hotel_talk') ? [say('samantha', 'Why do I have to sleep in here? Donnie stinks.')] : [
    say('samantha', 'If it fell off a plane, then what happened to the plane?'),
    say('elizabeth', "They don't know, Samantha."),
    say('samantha', 'Could we sue the airline? Could we be on TV?'),
    ['choice', [
      ['Tease her', [say('donnie', "When you fall asleep tonight, I'm going to fart in your face."), say('samantha', "I'm telling Mom!"), say('elizabeth', "Samantha, don't go over there.")]],
      ['Say nothing', [n('Donnie keeps watching the TV.')]],
    ]],
    ['set', 'hotel_talk'],
  ]),
  liz_hotel: [say('elizabeth', 'Go to sleep, Donnie.')],
  hotel_tv: [say('tv', '...a jet engine, which officials say fell from an aircraft early Sunday...'), n('A shot of their house. Their roof. It looks like someone else\'s.')],
  hotel_painting: [n('A painting of a lighthouse. Every hotel has one.')],
  hotel_window: [n('The parking lot, orange under sodium lights. The highway beyond.')],
  hotel_door: [
    n('Through the adjoining door: Mom and Dad, talking low.'),
    n('Dad\'s voice: something about a boy from high school, Frankie Feedler, who died on the way to the prom. "He was doomed." Then: "They could have said the same thing about Donnie. But he dodged it."'),
    n('Then, unbelievably, Mom laughing.'),
    ['note', 'dodged'],
  ],
  hotel_bed: sleepHere('hotel', () => [n('Not yet.')]),
  hotel_bed2: [n("Elizabeth's bed. She's claimed it with her whole body.")],
};

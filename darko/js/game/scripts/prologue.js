// The prologue: Saturday, October 1, 1988, from late afternoon until Donnie goes to bed. These
// are also the house's default lines; house.js overrides them on later days.

import { formatTime, phase } from '../calendar.js';
import { n, say } from './util.js';

// after either errand: once both Dad and Elizabeth know, dinner can start
const errandDone = [
  ['if', ['told_dad', 'told_liz'],
    [['set', 'dinner_ready'], ['obj', 'Sit down for dinner. (Kitchen)']],
    [['call', s => { s.objective = s.has('told_dad') ? 'Tell Elizabeth: dinner at six. (Upstairs)' : 'Tell Dad: dinner at six. (Out front)'; }]]],
];

const edgeLine = s => (phase(s.time) === 'night'
  ? "It's late. Mom will be watching the windows."
  : "Dinner's at six. Better not wander off tonight.");

export const PROLOGUE = {
  // ---- the opening ---------------------------------------------------------------------------

  intro: [
    ['card', ['MIDDLESEX, VIRGINIA', 'SATURDAY, OCTOBER 1, 1988'], 3.4],
    ['note', 'ridge'],
    n("He woke up this morning at the edge of Carpathian Ridge, curled up next to his bike. He still doesn't know how he got up there."),
    n("It's late afternoon now. Something is cooking downstairs."),
    ['obj', 'Head downstairs.'],
    ['save'],
  ],

  // ---- Donnie's room -------------------------------------------------------------------------

  room_window: s => [n(phase(s.time) === 'night'
    ? 'Streetlights. Somebody\'s sprinkler ticking. Nothing else moves.'
    : 'Across the street the porch lights are coming on, one at a time. Past the rooftops, the golf course is going dark.')],
  poster: [n('A band poster, curling at the corners. He keeps meaning to tape it back down.')],
  shelf: [n('Comic books. A model space shuttle with one wing glued on crooked. A Smurfs lunchbox he is never throwing away.')],
  stereo: [n('A tape deck. One speaker buzzes. He doesn\'t feel like music.')],
  desk: [n('Homework he hasn\'t started, on top of homework he hasn\'t finished.')],
  clothes: [n('Clothes. Yesterday\'s, and the day before\'s.')],
  lamp: s => [['sfx', 'switch'], s.has('lamp_off') ? ['unset', 'lamp_off'] : ['set', 'lamp_off']],
  book: [
    n('Graham Greene. Collected Short Stories. The library copy, dog-eared at the same page for a week.'),
    ['give', 'greene'], ['set', 'took_book'],
  ],
  dormer: [n('His bedroom window, upstairs. The lamp is still on.')],

  bed: s => {
    if (s.has('took_pills')) {
      return [
        n('The bed. The house is quiet except for the clock downstairs.'),
        ['choice', [
          ['Go to sleep', 'sleep'],
          ['Not yet', [n('Not yet.')]],
        ]],
      ];
    }
    if (s.has('dinner_done')) return [n('Not yet. The pills first. Mom checks the count.')];
    return [n("The sheets still smell like pine needles and cold air. He isn't tired. He's never tired at the right time.")];
  },

  sleep: [
    ['fadeOut'],
    ['place', 'player', 3.6, 5.2, 'left'],
    ['set', 'lamp_off'],
    ['time', '23:30'],
    ['wait', 0.8],
    ['card', ['The house goes quiet.', '', 'Downstairs, Dad falls asleep in the La-Z-Boy', 'in front of a replay of the debate.'], 3.6],
    ['sleep'],
  ],

  rose_bedroom: [
    ['time', '21:05'],
    ['walk', 'player', 3.6, 6.8],
    ['face', 'player', 'down'],
    ['wait', 0.4],
    ['sfx', 'door'],
    ['set', 'rose_visit'],
    ['walk', 'rose', 5.4, 7.6],
    ['face', 'rose', 'left'],
    n('Mom comes in without knocking and starts picking clothes up off the floor.'),
    say('donnie', 'Get out of my room.'),
    n('She straightens up, an armful of his shirts against her chest.'),
    say('rose', 'I wish I knew where you went. At night, Donnie. Where do you go?'),
    say('donnie', 'Nowhere. I ride around.'),
    say('rose', "Some days I look at you and I don't recognize who I'm looking at."),
    say('donnie', 'Then maybe you should be the one taking the pills.'),
    ['sfx', 'switch'], ['set', 'lamp_off'],
    n('He reaches over and switches off the lamp.'),
    ['walk', 'rose', 6, 9.4],
    ['sfx', 'door'],
    ['unset', 'rose_visit'], ['set', 'rose_talk'],
    n('Her footsteps stop in the hall. For a long moment, nothing. Then her bedroom door closes.'),
    ['note', 'mom'],
    ['obj', 'Take your pills. (Bathroom, upstairs)'],
    ['save'],
  ],
  rose_room: [say('rose', '...')],

  // ---- upstairs hall -------------------------------------------------------------------------

  door_donnie: [['sfx', 'door'], ['go', 'donnie_room', 'from_hall']],

  door_bath: s => {
    if (s.has('rose_talk') && !s.has('took_pills')) {
      return [
        ['sfx', 'door'],
        n('He opens the medicine cabinet. The orange bottle: L. THURMAN, M.D.'),
        ['note', 'thurman'],
        ['choice', [
          ['Take them', [
            ['sfx', 'pills'],
            n('He shakes the pills into his palm and swallows them, watching himself in the mirror until it gets uncomfortable.'),
            ['set', 'took_pills'],
            ['obj', 'Go to bed.'],
            ['save'],
          ]],
          ['Not yet', [n('He shuts the cabinet. The mirror swings back, and there he is again.')]],
        ]],
      ];
    }
    if (s.has('took_pills')) return [n("The bathroom. His reflection looks like it hasn't slept in a week.")];
    return [
      n('The upstairs bathroom. A crack runs across one corner of the medicine cabinet mirror.'),
      n('Behind the mirror, the orange bottle with his name on it.'),
      ['note', 'thurman'],
    ];
  },

  door_liz: s => {
    if (s.has('dinner_done')) return [n('Music through the door. Loud enough to be a statement.')];
    if (s.has('told_liz')) return [n("Her door's open a crack. The phone is off the hook on her bed. She's downstairs.")];
    if (!s.has('rose_asked')) return [n("Elizabeth's on the phone. Through the door: laughing, then whispering, then laughing again.")];
    return [
      ['sfx', 'knock'],
      say('elizabeth', '(through the door) Hang on. ...What?'),
      say('donnie', "Mom says dinner. Six o'clock."),
      say('elizabeth', "Tell her I'm coming. ...No. Just my brother."),
      n('The laughing starts again.'),
      ['set', 'told_liz'],
      ...errandDone,
    ];
  },
  door_sam: [['sfx', 'locked'], n('Samantha\'s room. A sign in purple marker: NO BOYS. Underneath, smaller: THIS MEANS DONNIE.')],
  door_parents: s => [n(s.has('rose_talk')
    ? 'A line of lamplight under the door. Low voices. He can\'t make out the words, and then he can: his name.'
    : "Mom and Dad's room. Off limits, more or less.")],
  hall_photos: [n('School pictures, all three kids. Elizabeth smiling. Samantha smiling. Donnie looks like somebody told him a joke he didn\'t get.')],

  // ---- living room ---------------------------------------------------------------------------

  tv: s => [n(s.has('dinner_done')
    ? 'The news. A man in a suit talks about the election, and then the weather, in the same voice.'
    : "Who's the Boss? Samantha knows every word of the theme song and sings all of them.")],
  newspaper: [
    n('The Saturday paper. Bush and Dukakis on the front page, five weeks out, both mid-sentence. The rest is under a coffee ring.'),
    ['note', 'election'],
  ],
  recliner: [n("Dad's La-Z-Boy. Technically anyone can sit in it. Technically.")],
  couch: [n('The couch. The dog isn\'t allowed on it, which is why it\'s covered in dog hair.')],
  floorlamp: [n('A lamp Mom found at a yard sale. It makes the whole room look like an old photograph.')],
  plant: [n("A plant nobody remembers to water. It's doing fine anyway.")],
  coatrack: [n("Dad's windbreaker. Mom's raincoat. Donnie's jacket isn't here; it's on his floor.")],
  living_photos: [n('A beach, years ago. Everybody squinting into the sun.')],
  living_window: s => [n(phase(s.time) === 'night'
    ? 'The street under the lamps. Every house on it has its curtains drawn.'
    : 'The front lawn, the street, the neighbors\' houses going blue in the dusk.')],
  front_door_night: s => (s.has('rose_talk')
    ? [n('The deadbolt is on. If he opens it now, the whole house will hear.')]
    : [n('He has his hand on the knob when Mom\'s voice comes from the kitchen.'), say('rose', "Don't even think about it.")]),

  samantha: s => {
    if (s.has('dinner_done')) return [say('samantha', 'Is Elizabeth still mad?'), say('donnie', 'Elizabeth was born mad.')];
    if (s.has('seen:samantha')) return [say('samantha', 'Shh!')];
    return [
      say('samantha', "Shh. It's on."),
      say('samantha', 'Mom was looking for you all day. She called everybody.'),
      say('donnie', 'I went for a ride.'),
      say('samantha', 'All day?'),
      n("He doesn't answer. On TV, an audience laughs at something."),
      ['set', 'seen:samantha'],
    ];
  },
  dog: s => (phase(s.time) === 'night' && s.has('rose_talk')
    ? [n('The dog is asleep by the door, paws twitching. Chasing something.')]
    : [n('The dog thumps her tail against the floor and rolls over for a belly scratch.')]),
  eddie_after: [say('eddie', "Your mother's upset, bud."), say('eddie', '...Get some sleep. Okay?')],

  // ---- kitchen -------------------------------------------------------------------------------

  fridge: s => (s.hasNote('fridge') ? [n("WHERE IS DONNIE? Nobody's crossed it out.")] : [
    n('The fridge notepad. In magic marker, in Mom\'s handwriting:'),
    n('WHERE IS DONNIE?'),
    say('donnie', '...Good question.'),
    ['note', 'fridge'],
  ]),
  sink: [n('Dishes soaking. The faucet drips about once a second, a little out of time with the clock.')],
  stove: s => [n(s.has('dinner_done') ? 'Leftovers under foil. The oven ticks as it cools.' : "Pot roast. It's been in since three.")],
  clock: s => [n(`The kitchen clock says ${formatTime(s.time)}.`)],
  kitchen_window: [n("The backyard. Samantha's trampoline, gray in the half-light. Past the fence, nothing but trees.")],
  phone: [n('The kitchen phone. Elizabeth has dragged the cord into the pantry so many times it barely coils anymore.')],
  back_door: [['sfx', 'locked'], n("The patio door. It's getting dark out back, and Mom wants everyone inside.")],

  table: s => {
    if (s.has('dinner_ready')) return [['run', 'dinner']];
    if (s.has('dinner_done')) return [n("Crumbs, and the ring from somebody's glass.")];
    return [n('Five places. Samantha set them, so the forks are on the wrong side.')];
  },

  rose: s => {
    if (s.has('dinner_done')) return [say('rose', "Go on up. I'll finish these.")];
    if (s.has('dinner_ready')) return [say('rose', 'Sit down, honey.')];
    if (s.has('rose_asked')) return [say('rose', "Your father. Your sister. Six o'clock.")];
    return [
      n('Mom looks up from her paperback. Stephen King. IT.'),
      say('rose', 'There you are.'),
      say('rose', 'Where were you this morning, Donnie?'),
      ['choice', [
        ['"Out riding."', [say('donnie', 'Out. Riding.'), say('rose', 'Since before breakfast?')]],
        ['"I don\'t know."', [say('donnie', "I don't know."), say('rose', "...You don't know.")]],
      ]],
      n('She holds his eyes a second too long, then goes back to her book.'),
      say('rose', "Dinner's at six. Go get your father, he's out front with that leaf blower. And tell your sister."),
      ['set', 'rose_asked'],
      ['obj', 'Tell Dad and Elizabeth: dinner at six.'],
    ];
  },
  eddie_kitchen: [say('eddie', 'Smells good in here, huh?')],
  liz_kitchen: [say('elizabeth', 'What are you looking at?')],
  sam_kitchen: [say('samantha', 'I set the table!')],

  dinner: [
    ['fadeOut'],
    ['place', 'player', 7.5, 7.75, 'up'],
    ['time', '18:00'],
    ['fadeIn'],
    n('Pot roast. For a while the only sound is forks on plates.'),
    say('elizabeth', "I've decided. I'm voting for Dukakis."),
    say('eddie', 'Wait until half your paycheck goes to Washington. Then tell me how you\'re voting.'),
    say('elizabeth', "I'll let you know when I have a paycheck."),
    say('rose', "She'll have plenty of time to make up her mind at Harvard."),
    say('elizabeth', "I haven't gotten in yet, Mom."),
    ['choice', [
      ['Needle Elizabeth', [say('donnie', "They'll love her. A whole year off to find herself, working retail.")]],
      ['Keep eating', [n('Donnie keeps his eyes on his plate.')]],
    ]],
    say('elizabeth', "Donnie, why don't you tell Mom and Dad why you stopped taking your medication?"),
    ['sfx', 'thud'],
    n('Nobody moves.'),
    say('rose', 'You stopped taking your medication?'),
    ['choice', [
      ['"She\'s lying."', [say('donnie', "She's lying."), say('elizabeth', 'I watched you flush them.')]],
      ['Say nothing', [n('He stares at Elizabeth. She stares right back.')]],
    ]],
    say('rose', 'When, Donnie?'),
    say('donnie', 'Can we not do this right now?'),
    say('samantha', '...What are we doing right now?'),
    n('Dad makes a sound into his napkin that might be a cough.'),
    say('rose', 'Eddie.'),
    say('eddie', 'Sorry. Sorry.'),
    n('Nobody says anything else worth remembering. The clock over the stove ticks.'),
    ['fadeOut'],
    ['time', '19:20'],
    ['set', 'dinner_done'], ['unset', 'dinner_ready'],
    ['note', 'dinner'],
    ['obj', 'Go up to your room.'],
    ['place', 'player', 7.5, 8.2, 'down'],
    ['fadeIn'],
    ['save'],
  ],

  // ---- outside -------------------------------------------------------------------------------

  edge: s => [n(edgeLine(s))],
  front_door: [['sfx', 'door'], ['go', 'living', 'from_front']],
  house_front: [n('Home. Blue TV light moves on the living room ceiling.')],
  garage: [n('The garage door. The opener is in Dad\'s car.')],
  oak: [n('An old oak. Half its leaves are already on the lawn, and Dad has opinions about that.')],
  car: [n("Dad's car. Leaves are already collecting under the wipers.")],
  bike: [n('His bike, dropped where he left it. Pine needles are still caught in the spokes.')],
  mailbox: [n('DARKO, in stick-on letters. The K is starting to peel.')],

  eddie_yard: [
    ['sfx', 'blower'], ['shake', 2, 0.8],
    n('Dad swings the leaf blower around and gets him square in the face.'),
    say('eddie', 'Gotcha!'),
    n('He kills the motor. The whole street goes quiet.'),
    say('eddie', 'Well. Look who decided to come home.'),
    say('donnie', "Mom says dinner's at six."),
    say('eddie', "Tell her I'll be right in."),
    say('eddie', '...You doing okay, bud?'),
    ['choice', [
      ['"Fine."', [say('donnie', 'Fine.')]],
      ['"Tired."', [say('donnie', 'Tired.'), say('eddie', 'Yeah. Me too.')]],
    ]],
    say('eddie', 'Okay.'),
    n('He picks up the leaf blower and heads for the house.'),
    ['set', 'told_dad'],
    ...errandDone,
  ],

  house_a: s => [n(s.time >= 18 * 60
    ? "The Johnsons' house. Dark now, except for one window upstairs."
    : "The Johnsons' house. Someone's moving around in the front room.")],
  house_darko: [n('Home. His window is the one on the left, upstairs.')],
  house_c: [n('A house like theirs. Somebody inside is watching the same channel; he can hear the same laugh track through the glass.')],
  house_d: [n('The last house before the road curves. A dog barks once behind the fence, then thinks better of it.')],
  street_tree: [n('The wind moves the top of the tree and nothing else.')],
  streetlamp: s => [n(phase(s.time) === 'day' ? "A streetlamp. It hasn't come on yet." : 'A streetlamp, buzzing. Moths, even this late in the year.')],
  bus_stop: [n('The school bus stops here every weekday morning.')],
};

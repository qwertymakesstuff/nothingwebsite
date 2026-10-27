// Chapter 2, "The Destructors": Monday, October 3, into the early hours of the 4th. The bus stop,
// Ms. Pomeroy's English class and Gretchen; Old Gun Road and Grandma Death; Dr. Thurman; then
// Frank in the living room at 2 AM, and the school's water main.

import { n, say } from './util.js';

export const CHAPTER2 = {
  oct3_morning: [
    ['card', ['OCTOBER 3 1988'], 2.6],
    ['go', 'street', 'bus_stop'],
    n('Mom drops Donnie and Samantha off at the corner and pulls away in the Taurus.'),
    say('samantha', 'Hi, Cherita.'),
    say('cherita', 'Chut up.'),
    say('ronald', 'DARKO CHEATS DEATH! Man, you\'re famous. I called you, like, a million times last night!'),
    say('donnie', 'We went to a hotel.'),
    say('ronald', 'My dad said he found you on the golf course. Are you sleepwalking again?'),
    say('donnie', "I don't wanna talk about it."),
    say('sean', 'Now that you\'re famous, you gotta have a smoke.'),
    n('Sean holds out a cigarette. Donnie takes it, and looks over at Samantha.'),
    say('donnie', 'What happens if you tell Mom and Dad about this, Samantha?'),
    say('samantha', 'You put Ariel in the garbage disposal.'),
    n('Sean turns and says something ugly to Cherita.'),
    say('donnie', 'Leave her alone, man.'),
    n('Cherita looks over at Donnie. She doesn\'t say anything.'),
    ['sfx', 'thud'],
    n('The bus groans around the corner.'),
    ['set', 'bus_gone'],
    ['fadeOut'],
    ['time', '07:55'],
    ['go', 'school_front', 'bus'],
    n('Middlesex Ridge School. Everybody already knows about the engine. Girls he has never talked to say hi.'),
    ['obj', 'English class, Ms. Pomeroy. (Main hallway)'],
    ['save'],
  ],

  sean: [say('sean', "Bus is late. Bus is always late.")],
  ronald: [say('ronald', 'Did it really land on your bed? Like, on it?')],
  cherita: [say('cherita', 'Chut up.')],
  joanie: [say('joanie', 'So grody.')],
  samantha_bus: [say('samantha', "Don't tell Mom I talked to Cherita.")],
  emily: [say('emily', "It's flooded! The whole school!")],
  bus_stop: s => [n(s.has('bus_gone') ? 'The bus stop. Nobody here now.' : 'The bus stop. The bus is late.')],

  // ---- school --------------------------------------------------------------------------------

  school_doors: [['sfx', 'door'], ['go', 'school_hall', 'from_front']],
  school_leave: s => [n(s.beat === 'oct7' ? 'Health class at one. He can\'t leave.' : 'The bus is gone. Class first.')],
  school_facade: [n('Middlesex Ridge School. Brick, and more brick.')],
  school_bus: [n('The bus, empty, its engine still ticking.')],
  school_tree: [n('A maple, going red at the edges.')],
  statue: s => (s.beat === 'oct7'
    ? [n('The bronze mongrel. There is a fresh, bright dent in its head. On the concrete in front of it, the ghost of scrubbed-off spray paint.')]
    : [n('The bronze Middlesex mongrel, the school mascot. Somebody has left a cigarette butt in its mouth.')]),
  cole: s => (s.beat === 'oct7' ? [say('cole', 'Keep moving, Mr. Darko.')] : [say('cole', 'Off to class, people.')]),
  sean_school: [say('sean', 'Pomeroy\'s gonna make you talk about it. The engine. Watch.')],
  ronald_school: [say('ronald', "Everybody's staring at you, man. It's awesome.")],
  sparkle: [n("Samantha's dance troupe, Sparkle Motion, running a routine on the courtyard concrete. Samantha's counting under her breath.")],

  lockers: [n('Lockers. Somebody has scratched a heart into one of the doors and then scratched it out.')],
  my_locker: s => [n(s.beat === 'oct7' ? 'His locker. Somebody has slipped a note through the vents: HEARD YOU FLOODED IT. COOL.' : 'His locker. Textbooks he hasn\'t opened since September.')],
  door_english: [['sfx', 'door'], ['go', 'english', 'from_hall']],
  door_health: s => (s.beat === 'oct7' && s.has('oct7_english') ? [['sfx', 'door'], ['go', 'health', 'from_hall']] : [['sfx', 'locked'], n(s.beat === 'oct7' ? 'Health is after lunch. English first.' : 'Ms. Farmer\'s health room. Not his class this morning.')]),
  door_physics: [['sfx', 'locked'], n("Dr. Monnitoff's physics room. Through the window: a chalkboard full of diagrams nobody's erased.")],
  door_office: [['sfx', 'locked'], n("The principal's office. You don't go in there unless you have to.")],
  trophies: [n('Trophies from the seventies. A photo of a football team in short shorts.')],
  banner: [n('GO MONGRELS. The O has been made into a face.')],
  monnitoff: s => [say('monnitoff', s.beat === 'oct7' ? 'Mr. Darko. Good morning.' : 'Mr. Darko. Glad you\'re in one piece.')],
  farmer_hall: s => (s.beat === 'oct7'
    ? [say('farmer', 'Health class. One o\'clock. We\'re watching something very important today.')]
    : [say('farmer', 'Walk, don\'t run.'), n('She has a stack of glossy brochures under her arm.')]),
  cunningham_hall: [n('The man from the golf course, in a cream suit, shaking hands with Ms. Farmer. He sees Donnie and smiles exactly the way he did on the green.')],
  hall_student: [n('A kid at his locker. He pretends not to look at Donnie.')],
  hall_student2: [say('student2', 'Is it true it landed on your bed?')],
  classmate: [n('A classmate. Head down.')],
  class_stay: [n('Not in the middle of class.')],

  pomeroy: s => (s.beat === 'oct7' ? [n('Ms. Pomeroy watches the police officers. She doesn\'t look happy.')] : [say('pomeroy', 'Find your seat, Mr. Darko.')]),
  pomeroy_desk: [n('A copy of Graham Greene\'s short stories, bristling with bookmarks.')],
  english_board: s => [n(s.beat === 'oct7' ? 'THEY MADE ME DO IT, over and over, in a dozen hands.' : '"The Destructors," Graham Greene. Underlined twice.')],
  gretchen_class: [n('The new girl, at the door.')],

  sit_english: s => {
    if (s.beat === 'oct7') return [['run', 'oct7_english']];
    if (s.has('oct3_class')) return [n('His desk.')];
    return [
      ['set', 'in_class'],
      ['place', 'player', 5.45, 6.25, 'up'],
      ['time', '08:30'],
      n('Ms. Pomeroy has been reading aloud from "The Destructors," by Graham Greene: a gang of boys who take an old man\'s house apart from the inside.'),
      say('pomeroy', 'So. Why do the boys break into Old Misery\'s house?'),
      say('joanie', 'They wanted to rob him.'),
      say('pomeroy', 'Joanie, if you had read the story - all thirteen pages of it - you would know they find a great deal of money hidden in his mattress. And they burn it.'),
      n('The class goes "Ooooh." Joanie turns red.'),
      say('pomeroy', 'Donnie Darko. Perhaps, given your recent brush with mass destruction, you could give us your opinion?'),
      say('donnie', "They say it themselves, while they're tearing the place to pieces. Wrecking something is a way of making something."),
      say('donnie', "So burning the money is... ironic. They don't want it. They just want to see what happens when they tear the world apart. They want to change things."),
      ['note', 'destructors'],
      ['set', 'gretchen_door'],
      n('Someone is standing in the doorway.'),
      say('pomeroy', 'May we help you?'),
      say('gretchen', 'I just registered. I think they put me in the wrong English class.'),
      n('Ms. Pomeroy studies her for a moment.'),
      say('pomeroy', 'You look like you belong here.'),
      say('gretchen', 'Um... where do I sit?'),
      say('pomeroy', 'Sit next to the boy you think is the cutest.'),
      n('The room loses its mind. Ronald fixes his hair.'),
      say('pomeroy', 'Quiet! Let her choose.'),
      ['walk', 'gretchen_door', 8.05, 7.3, 50],
      ['walk', 'gretchen_door', 8.05, 6.25, 50],
      ['set', 'gretchen_sat'],
      n('She doesn\'t even hesitate. She sits down next to Donnie. Their eyes meet. He grins from ear to ear.'),
      n('The whole class cracks up.'),
      ['note', 'gretchen'],
      ['fadeOut'],
      ['unset', 'in_class'],
      ['time', '14:50'],
      ['set', 'oct3_class'],
    ];
  },

  // ---- Old Gun Road, Grandma Death, Dr. Thurman ---------------------------------------------

  oct3_drive: [
    ['go', 'oldgun', 'car'],
    ['time', '18:00'],
    n('That evening, Dad drives Donnie out along Old Gun Road, the winding back road toward the country.'),
    say('eddie', 'So how was school today?'),
    say('donnie', 'Great. Juice and graham crackers at snack time. My stuffed walrus was a big hit at show-and-tell.'),
    say('eddie', 'Good Lord.'),
    say('eddie', "So the construction guys say about a week to fix the roof. The airline better not stiff us on the shingles."),
    say('donnie', 'Do they know yet?'),
    say('eddie', 'Know what?'),
    say('donnie', 'Where it came from.'),
    say('eddie', "No. Something about a serial number that got burned. And I had to sign a form saying I wouldn't talk about it."),
    say('donnie', "So we're not supposed to tell anybody what nobody knows?"),
    say('eddie', 'You tell Dr. Thurman whatever you want.'),
    ['sfx', 'thud'], ['shake', 3, 0.5],
    say('eddie', 'Whoa!'),
    say('donnie', 'Grandma Death.'),
    n('An old woman is standing in the middle of the road, right in front of the car. Roberta Sparrow. A hundred and one years old, they say. Everybody calls her Grandma Death.'),
    n('Her little brick house sits back in the field, high on the hill. Her mailbox is down here, at the edge of the road.'),
    ['note', 'sparrow'],
    ['obj', 'Walk Grandma Death back to her mailbox.'],
    ['save'],
  ],

  sparrow: [
    n('He takes her hand. It weighs nothing.'),
    ['set', 'sparrow_led'],
    ['obj', 'Walk her to the mailbox.'],
  ],
  sparrow_follow: [n('She shuffles along beside him, holding on.')],

  sparrow_mailbox: s => {
    if (s.has('sparrow_done')) return [n('Her mailbox. Empty.')];
    if (!s.has('sparrow_led')) return [n('A rusted mailbox on a post. The flag is down.')];
    return [
      ['sfx', 'locked'],
      n('He opens the mailbox for her.'),
      say('donnie', 'No mail today. Maybe tomorrow.'),
      n('She smiles at him and starts slowly back toward her house. Then she turns, and takes both his hands in her frail grip.'),
      say('sparrow', '(very slowly) Every living creature on this earth...'),
      say('sparrow', '...dies alone.'),
      ['note', 'dies_alone'],
      ['set', 'sparrow_done'],
      n('Donnie stands there in silence while she makes her way back up the hill.'),
      ['obj', 'Back to the car.'],
    ];
  },
  sparrow_house: [n('A modest brick house in a big grassy field, looking down over the whole town. One lamp lit.')],
  oldgun_edge: [n("Dad's waiting in the car.")],

  taurus: s => {
    if (s.beat !== 'oct3_eve') return [n('The car.')];
    if (!s.has('sparrow_done')) return [say('eddie', '(through the window) Go on, help her out of the road.')];
    return [
      n('They drive on, toward Dr. Thurman\'s.'),
      ['fadeOut'],
      ['time', '18:40'],
      ['run', 'thurman1'],
    ];
  },

  thurman1: [
    ['go', 'thurman', 'start'],
    n('Dr. Lilian Thurman. A big colonial house out in the country, and an office that smells like old books.'),
    say('thurman', "Your mother said that you've been skipping cycles of your medication."),
    say('donnie', 'I\'ve been taking it. I just like to make her feel guilty. You know. Psychologically.'),
    say('thurman', "None of this is your mother's fault, Donald."),
    n('He is quiet for a while.'),
    say('donnie', 'So. I met a new friend.'),
    say('thurman', 'Would you like to talk about this friend?'),
    say('donnie', 'His name is Frank.'),
    say('thurman', 'Frank.'),
    say('donnie', 'I think he saved my life.'),
    say('thurman', 'How so?'),
    say('donnie', "Don't you watch the news? A jet engine fell on my house. On my bed. While I was out on the golf course talking to Frank."),
    n('She looks at him for a long time, deciding whether he\'s telling the truth.'),
    say('donnie', "I'm not kidding."),
    say('thurman', 'Frank... told you to get out of bed... just before this happened.'),
    say('donnie', 'He said to follow him.'),
    say('thurman', 'Follow him where?'),
    say('donnie', 'Into the future. And then he said the world was coming to an end.'),
    n('He rubs his arm, where the numbers are still faintly there.'),
    say('thurman', 'Do you believe that the world is coming to an end?'),
    ['choice', [
      ['"No. That\'s stupid."', [say('donnie', "No. That's stupid.")]],
      ['Take your time', [n('A long pause.'), say('donnie', "No. That's stupid.")]],
    ]],
    ['set', 'thurman1_done'],
    ['note', 'thurman_frank'],
    ['fadeOut'],
    ['time', '20:30'],
    ['go', 'living', 'couch'],
    n("Home. His room is under a tarp, so he's on the couch until the roof is fixed."),
    ['obj', 'Sleep on the couch.'],
    ['save'],
  ],
  thurman: [say('thurman', 'Sit wherever you like, Donald.')],
  thurman_door: [n('The session isn\'t over.')],
  thurman_books: [n('Freud, Jung, a whole shelf on sleep disorders. One on hypnosis, with a cracked spine.')],
  thurman_window: [n('Fields, going dark. Her house is out past the edge of everything.')],
  thurman_diploma: [n('LILIAN THURMAN, M.D., in heavy gothic letters.')],
  thurman_couch: [n('The couch. He never sits on it. It feels like admitting something.')],
  thurman_chair: [n('Her chair.')],

  // ---- the flood -----------------------------------------------------------------------------

  flood_wake: [
    ['place', 'player', 7.2, 8.6, 'up'],
    ['set', 'lamp_off'],
    ['fadeIn'],
    ['wobble', 1, 5],
    n('Two in the morning. Donnie is asleep on the couch. His eyes slowly open.'),
    n('There, standing in the corner of the room, in the shadows, is Frank.'),
    say('frank', 'Wake up, Donnie.'),
    ['obj', 'Go to Frank.'],
    ['save'],
  ],

  frank_living: [
    ['wobble', 2, 2], ['flash'],
    ['set', 'flood_go'],
    ['fadeOut'],
    ['set', 'flashlight'],
    ['give', 'axe'], ['give', 'spraypaint'],
    ['go', 'school_hall', 'night'],
    n("The school, in the dark. He doesn't remember getting here. A flashlight in one hand, an axe over his shoulder, a can of spray paint in his pocket."),
    n('At the far end of the hallway, Frank is waiting.'),
    ['obj', 'Follow Frank.'],
  ],

  frank_hall: [
    n('Frank stands perfectly still at the top of the basement stairs.'),
    ['wobble', 2, 1.5], ['flash'], ['sfx', 'sting'],
    ['set', 'frank_hall_gone'],
    n('And then he isn\'t there.'),
    ['obj', 'Down to the basement.'],
  ],
  flood_onward: [n('Frank is waiting at the other end of the hall.')],
  basement_locked: [['sfx', 'locked'], n('The stairs down to the basement. A chain across the door: JANITOR ONLY.')],
  basement_stay: [n('Not yet. The pipes.')],
  pipes: [n('Old pipes, sweating in the flashlight beam, running off into the dark.')],

  water_main: s => (s.has('pipe_broken') ? [n('Water roars out of the split main.')] : [
    n('The water main. As thick as his leg, painted a flaking red.'),
    n('He puts the axe back over his shoulder... and brings it down.'),
    ['sfx', 'thud'], ['shake', 3, 0.3], ['wait', 0.4],
    ['sfx', 'thud'], ['shake', 3, 0.3], ['wait', 0.4],
    ['sfx', 'thud'], ['shake', 4, 0.5],
    ['set', 'pipe_broken'], ['sfx', 'blower'],
    n('Metal on metal echoes through the huge room, again and again, until the pipe splits and the water comes.'),
    ['take', 'spraypaint'], ['take', 'axe'],
    ['fadeOut'],
    ['set', 'flood_done'],
  ]),
};

// Chapter 4, "They Made Me Do It": Friday, October 7. The police in Ms. Pomeroy's room, the
// handwriting on the board, and Jim Cunningham's "Controlling Fear" tape in health class. The
// current build ends after the tape.

import { n, say } from './util.js';

export const CHAPTER4 = {
  oct7_morning: [
    ['card', ['OCTOBER 7 1988'], 2.4],
    ['go', 'school_front', 'bus'],
    ['time', '08:20'],
    n('Friday. Something is wrong at school: police cars out front, and the mongrel with a fresh dent in its head.'),
    ['obj', 'English class, Ms. Pomeroy.'],
    ['save'],
  ],

  oct7_english: s => (s.has('oct7_english') ? [n('His desk.')] : [
    ['set', 'in_class'],
    ['place', 'player', 5.45, 6.25, 'up'],
    ['time', '08:30'],
    n('Donnie sits with his eyes wide open, staring at the board. On it, over and over: THEY MADE ME DO IT.'),
    n('Two police officers stand with Principal Cole in the corner. One holds a clipboard.'),
    say('officer', 'Aaron Armitage... Cherita Chen...'),
    n('One by one, students walk to the board and write the phrase. The officer studies each one.'),
    say('cole', 'Donald Darko.'),
    n("Donnie's face has gone white."),
    ['unset', 'in_class'],
    ['walk', 'player', 6.4, 4.4, 50],
    ['walk', 'player', 6.4, 3.4, 50],
    ['face', 'player', 'up'],
    ['wait', 0.6],
    n('He walks to the board and writes it. THEY MADE ME DO IT. Then he sits back down, without the slightest hesitation.'),
    ['walk', 'player', 6.4, 4.4, 50],
    ['walk', 'player', 5.45, 6.25, 50],
    ['face', 'player', 'up'],
    n("The officer lingers over Donnie's penmanship a moment too long. Then he makes a small question mark next to Donnie's name on the roster."),
    n('Ms. Pomeroy catches Donnie\'s eye.'),
    ['note', 'handwriting'],
    ['set', 'oct7_english'],
    ['time', '11:40'],
    ['obj', 'Health class at one, with Ms. Farmer.'],
    ['save'],
  ]),

  officer_class: [n('He watches the students write. He doesn\'t look at Donnie. Not yet.')],
  cole_class: [n('Principal Cole, arms folded, jaw tight.')],

  // ---- health class ------------------------------------------------------------------------

  farmer_class: s => [say('farmer', s.has('tape_on') ? 'Eyes on the screen.' : 'Take your seat. This is important.')],
  farmer_desk: [n('A stack of xeroxed worksheets: the LIFELINE EXERCISE. And a VHS box: CONTROLLING FEAR.')],
  tvcart: [n('A TV on a rolling cart, a VCR strapped underneath with a bungee cord.')],
  health_board: [n('HEALTH - MS. FARMER. TODAY: A VIDEO PRESENTATION.')],

  sit_health: s => (s.has('oct7_health') ? [n('His desk.')] : [
    ['set', 'in_class'],
    ['place', 'player', 10.65, 6.25, 'up'],
    ['time', '13:00'],
    n('The class is lined up in neat rows in front of the TV cart. Ms. Farmer paces in front of them.'),
    ['set', 'tape_on'], ['sfx', 'static'],
    n('A cloud formation blows across the screen, revealing a logo: CUNNING VISIONS PRODUCTIONS.'),
    say('tv', '(a woman, very sincere) My whole life, I was a victim of my own FEAR. And finally... I looked in the mirror. Not just IN the mirror. THROUGH it.'),
    say('tv', '(a mother, her arm around her son) ...and for two years I thought it was NORMAL for a fifteen-year-old to wet the bed.'),
    n('Laughter from the class.'),
    say('farmer', 'QUIET!'),
    say('tv', "(the son, bursting out) I'm not AFRAID anymore!"),
    say('tv', '(a narrator, over pictures of families holding hands) All across America, people have come together. People who believe that human life is too valuable to be controlled by FEAR.'),
    n('A middle-aged man walks out onto a sunny country patio. It is the man from the golf course.'),
    say('cunningham', '(on the tape) Hello. My name is Jim Cunningham. And welcome to "Controlling Fear."'),
    n('CONTROLLING FEAR, PART ONE: ATTITUDINAL BELIEFS.'),
    ['wobble', 1.2, 4],
    say('frank', '(close, from nowhere) Pay close attention. You could miss something.'),
    n('Donnie stares at the screen. At Jim Cunningham.'),
    ['note', 'controlling_fear'],
    ['fadeOut'],
    ['unset', 'in_class'], ['unset', 'tape_on'],
    ['set', 'oct7_health'],
  ]),

  build_end: [
    ['save'],
    ['end', ['Friday afternoon continues in the next stages:', 'Old Gun Road, Frank in the mirror,', 'and the emergency PTA meeting.']],
  ],
};

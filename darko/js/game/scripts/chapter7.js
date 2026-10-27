// Chapter 7, "His Name Was Frank": Thursday, October 20 to Sunday, October 23. Jim Cunningham's
// assembly and the microphone; suspended again; Grandma Death's house with Gretchen; the letter;
// Dr. Thurman and the workers; the dinner before the talent show.

import { n, say } from './util.js';

export const CHAPTER7 = {
  assembly: [
    ['card', ['OCTOBER 20 1988'], 2.4],
    ['go', 'auditorium', 'seat'],
    ['time', '10:00'],
    n('The auditorium, packed with Middlesex mongrels. Jim Cunningham takes the stage.'),
    say('cunningham', 'Good morning, mongrels!'),
    n('A few scattered voices.'),
    say('cunningham', "Is that all you've got? I said, GOOD MORNING!"),
    n('GOOD MORNING! Louder. And louder, until they are screaming it.'),
    say('cunningham', "Now that's what I like to hear. Because too many young people today are paralyzed by their fears. They surrender to drugs, alcohol, premarital sex. Empty solutions."),
    ['set', 'screen_slides'],
    say('cunningham', 'I want to tell you a story about a young man whose life was destroyed by the instruments of fear. A young man searching for love in all the wrong places.'),
    say('cunningham', '(tragically) His name was Frank.'),
    ['wobble', 1.6, 6], ['sfx', 'sting'],
    n('On the screen: a cartoon teenager, eyes wild on drugs. HIS NAME WAS FRANK. At the name, Donnie goes somewhere far away.'),
    say('gretchen', "(bored) Let's get out of here."),
    say('donnie', "We're moving through time."),
    say('gretchen', 'What?'),
    ['unset', 'screen_slides'],
    n('Within minutes the whole room is laughing along with Jim Cunningham. Then the screen goes up, and students line up at the microphone in the back to ask him questions.'),
    say('student2', 'Hi. My stepsister... I sometimes worry that she eats too much.'),
    say('cunningham', "Many times we eat because we're afraid to face our ego reflections. We shouldn't just look INTO the mirror. We should look THROUGH it."),
    say('student', 'How can I decide what I want to be when I grow up?'),
    say('cunningham', 'Look deep within your heart, and find what it is in the world that makes you feel LOVE. And go to that.'),
    say('ronald', 'What can I do to learn how to fight?'),
    say('cunningham', 'Violence is a product of fear. Learn to truly love yourself, and the world will be yours.'),
    n('Donnie gets up out of his seat.'),
    ['obj', 'The microphone.'],
    ['save'],
  ],
  assembly_stay: [n('Not yet.')],

  microphone: s => (s.has('assembly_done') ? [n('The microphone.')] : [
    ['place', 'player', 11, 10.6, 'up'],
    say('donnie', '(furious) How much are they paying you to be here?'),
    say('cunningham', "Excuse me? What's your name, son?"),
    say('donnie', 'Gerald.'),
    say('cunningham', "Well, Gerald, I think you're afraid."),
    say('donnie', "Well, Jim, I think you're full of it. Are you telling us this stuff because you want us to buy your book? Because that was some of the worst advice I've ever heard."),
    n('Rumbling from the faculty. Laughter from the students.'),
    say('donnie', "(to the girl) If you want your sister to lose weight, tell her to get off the couch, stop eating Twinkies, and maybe go out for field hockey."),
    say('donnie', "(to the kid) You're never going to know what you want to be when you grow up. Most of the time, nobody does. How about you, Jim?"),
    say('donnie', '(to Ronald) Sick of some jerk shoving your head in a toilet? Lift some weights. Take a karate lesson. And when he tries it again, kick him where it counts.'),
    say('cunningham', "(getting angry) I think you are afraid to ask me for advice. I think you are a very troubled, confused young man. I think you're searching for answers in all the wrong places."),
    n('A long beat.'),
    say('donnie', "Well, I think you're the Antichrist."),
    n('The room erupts. Students break into applause. Principal Cole marches up the aisle and removes Donnie from the auditorium. Gretchen watches him go, smiling.'),
    ['note', 'antichrist'],
    ['set', 'assembly_done'],
    ['fadeOut'],
    ['time', '15:30'],
    ['set', 'gretchen_og'],
    ['go', 'oldgun', 'west'],
    n('Afternoon. Donnie and Gretchen walk down the wooded road.'),
    ['obj', 'Walk with Gretchen. (East.)'],
    ['save'],
  ]),

  oldgun_walk: [
    say('donnie', '(mumbling) They suspended me for two days.'),
    say('gretchen', 'Are you okay?'),
    n('A long beat.'),
    say('donnie', "I've been seeing stuff. A lot of really messed-up stuff. Do you know who Grandma Death is?"),
    say('gretchen', 'Who?'),
    say('donnie', 'The crazy old woman who lives off Old Gun Road.'),
    n('He takes out the book.'),
    say('gretchen', '"The Philosophy of Time Travel." What is this?'),
    say('donnie', "She wrote it. There are chapters in this book that describe the stuff I've been seeing. It can't just be a coincidence. Will you come see her with me?"),
    ['obj', "Roberta Sparrow's house. (Up the hill.)"],
  ],
  gretchen_og: [say('gretchen', 'This is her house?')],

  sparrow_house: s => {
    if (s.beat === 'oct20' && s.has('gretchen_og') && !s.has('sparrow_rang')) {
      return [
        n('Gretchen leads him up to the porch of the decrepit house. She rings the doorbell.'),
        ['sfx', 'doorbell'],
        ['wait', 1],
        n('They wait. Nothing. Gretchen goes and peers through a window.'),
        say('donnie', 'I know she\'s here. She never leaves the house.'),
        say('gretchen', "Maybe she's asleep."),
        ['set', 'sparrow_rang'],
        ['obj', 'Her mailbox. (Down by the road.)'],
      ];
    }
    if (s.beat === 'oct30') return [n('Pitch black. No lights anywhere.')];
    return [n('A modest brick house in a big grassy field, looking down over the whole town. One lamp lit.')];
  },

  sparrow_mailbox: s => {
    if (s.beat === 'oct20' && s.has('sparrow_rang') && !s.has('sparrow_visited')) {
      return [
        ['sfx', 'locked'],
        n('He stops at the mailbox at the end of the driveway and opens it. Empty.'),
        say('gretchen', '(pointing) Donnie. Look.'),
        ['set', 'sparrow_window'], ['sfx', 'sting'],
        n('In an upstairs window, the silhouette of Grandma Death, looking down at them.'),
        ['note', 'silhouette'],
        ['set', 'sparrow_visited'],
        ['obj', 'Home. (Either end of the road.)'],
      ];
    }
    if (s.has('sparrow_done') || s.beat !== 'oct3_eve') return [n('Her mailbox. Empty.')];
    if (!s.has('sparrow_led')) return [n('A rusted mailbox on a post. The flag is down.')];
    return [['run', 'sparrow_mailbox_first']];
  },

  // ---- Sunday, October 23 --------------------------------------------------------------------

  oct23_thurman: [
    ['card', ['OCTOBER 23 1988'], 2.4],
    ['go', 'thurman', 'start'],
    ['time', '18:00'],
    n("Dr. Thurman is looking at a diagram from Roberta Sparrow's book. Donnie paces around the office."),
    say('thurman', 'And they grow out of our stomachs?'),
    say('donnie', "It was just like she described them in her book. Like they were alive. The way they looked, and moved. Like workers, assigned to each one of us."),
    say('donnie', '(distant) I followed my spear... and I found something.'),
    say('thurman', 'What did you find?'),
    n('He is silent for a moment.'),
    say('donnie', 'Nothing.'),
    say('thurman', 'Have you told Gretchen about the spears?'),
    say('donnie', 'Yeah. But if I told her the other stuff, about Frank...'),
    say('thurman', 'Are you embarrassed by these things you see?'),
    say('donnie', "You know, every week I come in here and tell you stuff, and it's all embarrassing. It's your turn, Dr. Thurman. I'm not saying anything else until you tell me something embarrassing about yourself."),
    n('He makes a zipper across his lips.'),
    n('A long, stubborn pause.'),
    say('thurman', 'I once had an extended fantasy involving Mr. Rogers.'),
    say('donnie', "Whoa. (beat) That's okay, Dr. Thurman. It's nothing to be embarrassed about."),
    say('donnie', "Gretchen won't even let me kiss her. She says it's our first kiss, and she's waiting for this big moment. I just want to get it over with so we can move on to the good stuff."),
    say('thurman', 'Have you ever made love, Donald?'),
    n('Donnie looks at her, and the answer is obvious.'),
    ['set', 'ptt3'],
    ['note', 'workers'],
    ['fadeOut'],
    ['set', 'dinner_scene'],
    ['time', '19:15'],
    ['go', 'kitchen', 'seat'],
    n('Dinner. Donnie is a thousand miles away.'),
    say('samantha', 'Donnie, are you coming to my talent show tomorrow?'),
    n('He doesn\'t answer.'),
    say('rose', "He can't, Samantha. He's been suspended from after-school activities. Donnie, are you still with us? How was therapy?"),
    say('donnie', "Fine. You know, Dr. Thurman isn't so bad. I can tell her anything."),
    n('Mom looks surprised, and then sad. She looks at Dad. Dad looks down at his plate.'),
    ['unset', 'dinner_scene'], ['set', 'dinner23'],
    ['obj', 'Bed.'],
    ['save'],
  ],
};

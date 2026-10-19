// MISSION 7: BURN NOTICE. Darius turns. A trap. Eddie finally says his brother's name. Mara decides who Ash is to her.
import { scene } from '../dialogue.js';

scene('M07', 'CALL', { via: 'phone', who: 'JOJO' }, [
  { if: 'flag:jojo_trusts', then: [
    ['JOJO', 'Whispering, panicked, a hand over the phone. Not the same Jojo from the depot.', 'Ash. Don\'t come to the meeting. Listen to me, don\'t go. There are six guys in the back of the car park who weren\'t on the list.'],
    ['JOJO', 'Quick, stumbling.', 'I\'ll say I couldn\'t reach you. He\'s going to know I\'m lying. He always knows. Just, please, be somewhere else.']
  ], else: [
    ['JOJO', 'Bright, jittery, over-rehearsed. He is reading from somebody else\'s script.', 'Hey, Ash! It\'s Jojo. Darius wants to say thank you in person. The public car park, south end. He\'d really like you to bring the, uh, the paperwork. All of it. He says to bring all of it.']
  ] }
]);
scene('M07', 'REP', { via: 'direct', cast: ['JOJO', 'ASH'], at: 'place:carpark' }, [
  ['JOJO', 'Standing by a car, hands too busy, eyes going to the far end of the lot.', 'Hey. Hey. You came.'],
  ['ASH', 'Level, taking in the lot. Four dark cars where there were none.', 'You said Darius wanted to say thank you.'],
  ['JOJO', 'Flat, the voice of a person lying to a camera.', 'He does. He\'s just late.'],
  ['ASH', 'Quiet.', 'Jojo. Whose cars are those?'],
  ['JOJO', 'Fast, tight, finally cracking.', 'I can\'t. I can\'t say. I\'m sorry. I really like you, okay? I really like you, so please just run.'],
  ['ASH', 'Slowly, and the world narrows.', 'Okay.']
]);
scene('M07', 'TRAP', { via: 'phone', who: 'DARIUS', pri: 4 }, [
  ['DARIUS', 'On the phone. Still warm. Every word relaxed, and not a trace of a smile left under it.', 'Ash. Don\'t run. It\'s undignified. I\'ve sent some friends to bring you home.'],
  ['ASH', 'Steady, getting into the car.', 'You\'re not my friend, Darius.'],
  ['DARIUS', 'Soft. Hurt, almost, in a way that makes it worse.', 'See, that. That\'s what I can\'t forgive. Who gave you your first eight hundred dollars? Who put your name in the right ears? Who let you walk into my yard like family?'],
  ['DARIUS', 'A low, patient breath. He is being very reasonable.', 'You went to Mara. You went to a journalist, or you\'re about to. You took a thing that belongs to me and showed it to people who don\'t love this city the way I do.'],
  ['DARIUS', 'Gently, as if he were asking about the family.', 'How is Mara\'s brother? Mateo, isn\'t it? Seventeen. Lovely boy. He carries a bag very well.'],
  ['ASH', 'Very cold.', 'Don\'t.'],
  ['DARIUS', 'The warmth drains from the voice all at once. Flat.', 'I\'m not threatening, Ash. I\'m telling you about the weather. It\'s about to change.']
]);
scene('M07', 'ESCAPE', { via: 'phone', who: 'MARA', pri: 3 }, [
  { if: 'rel:MARA<=DISTRUSTED', then: [
    ['MARA', 'Distant, cold, but she picked up.', 'I saw it on a scanner. Whatever you did, you did it without me. Head for the room. I\'ll decide when I get there whether to be there.']
  ], else: [
    ['MARA', 'Fast, sharp, ready. Engines in the background.', 'I\'m two blocks east. I\'ve got the scanner. They\'re sending three cars, not four, the fourth went for the garage.'],
    ['MARA', 'Quick.', 'Don\'t go home. Don\'t go to Eddie. Drive like you\'re late and make them follow you. I\'ll clear the street.']
  ] },
  ['MARA', 'Tight, calling out the turns.', 'Left. Left! Under the highway, they\'ll lose a block.'],
  ['MARA', 'A sharp laugh, adrenaline.', 'You really know how to find trouble. I almost admire it.']
]);
scene('M07', 'CALLBACK', { via: 'phone', who: 'ASH', pri: 3 }, [
  ['ASH', 'Out of breath. Weighing a call and a risk.', 'Who do I call?'],
  { choice: 'who_called', prompt: 'You have one call.', options: [
    { v: 'mara', t: 'Call Mara.', rel: { MARA: 1 }, steps: [
      ['MARA', 'Phone. Immediate. No hello.', 'I\'m here. What do you need?'],
      ['ASH', 'Steadier for hearing it.', 'A place to hide, and somebody who isn\'t afraid.']
    ] },
    { v: 'eddie', t: 'Call Eddie.', rel: { EDDIE: 2 }, steps: [
      ['EDDIE', 'Phone. Rough. He picks up on the first ring.', 'Where are you? No. Don\'t tell me. Come to the garage. The back door\'s open.'],
      ['ASH', 'A tired breath.', 'They\'re going to look there.'],
      ['EDDIE', 'Quiet, steady. The first time he has sounded certain about anything.', 'Let them look.']
    ] }
  ] }
]);
scene('M07', 'EDDIE', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:room' }, [
  ['EDDIE', 'Standing in the doorway of the back room with the lights off. He has closed the garage door and locked it. He talks to the floor.', 'They didn\'t come. Not yet.'],
  ['ASH', 'Low.', 'Eddie. The truck in the photograph.'],
  ['EDDIE', 'Slow. Quiet. He sits down on the edge of the cot like his knees have stopped being reliable.', 'My brother\'s name was Danny. He was three years younger than me and he laughed at everything. We ran this garage together. Eleven years. Then Darius King showed up with a job that paid in a week what we made in a month.'],
  ['EDDIE', 'Flat.', 'I told him not to take it. He took it. The night he was supposed to come home, a man from the docks brought me that truck at two in the morning with the tailgate kicked in and a story about how Danny had left town. I fixed it. I repainted it. I put on the plates.'],
  ['ASH', 'Quiet.', 'You didn\'t know.'],
  ['EDDIE', 'Very quiet. It is not an absolution.', 'I didn\'t want to. There\'s a difference. For five years, I told myself he went to Florida. I even bought a map.'],
  ['EDDIE', 'Barely a voice.', 'He didn\'t go to Florida.'],
  ['ASH', 'Gentle.', 'I\'m sorry.'],
  ['EDDIE', 'A short, rough breath. He wipes his face with the back of his hand, once.', 'Don\'t be. Be angry. I\'ve been practising being sorry for five years. It never got me anywhere.'],
  { set: { eddie_confessed: true } }
]);
scene('M07', 'MARA', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:room' }, [
  { if: 'rel:MARA>=TRUSTED', then: [
    ['MARA', 'In the doorway. She came the moment she could. Steady.', 'I\'m not going anywhere. I want that said out loud.'],
    ['ASH', 'Quiet.', 'They know about Mateo.'],
    ['MARA', 'Tight. Her jaw sets.', 'I know. I called him. He\'s at his friend\'s place. I told him to stay there and not answer the door. He thinks I\'m being dramatic.'],
    ['MARA', 'Very steady.', 'I\'m done being a person who watches. Whatever we do, we do it together.']
  ] },
  { if: 'rel:MARA<TRUSTED && rel:MARA>DISTRUSTED', then: [
    ['MARA', 'Arms folded, leaning in the doorway. Calm and careful.', 'Okay. Talk to me. Everything. Not the version where you\'re a hero. The one where you made choices.'],
    ['ASH', 'Honest, tired.', 'I made some bad ones. And some good ones. I\'m going to need you to tell me which is which.'],
    ['MARA', 'A long look. Then, slowly.', 'Prove it. Not with words. With what you do next, because the next thing has my brother in it.']
  ] },
  { if: 'rel:MARA<=DISTRUSTED', then: [
    ['MARA', 'A bag over her shoulder. Cold, completely composed. She has packed.', 'I came to say goodbye. Not to you. To this. I\'m taking Mateo and I\'m going somewhere that isn\'t Port Alder.'],
    ['ASH', 'Quiet.', 'You\'re leaving.'],
    ['MARA', 'Flat.', 'I\'m not leaving you. I\'m leaving a mess you chose not to ask me about. You didn\'t listen, Ash.'],
    ['ASH', 'Careful.', 'Give me one more chance.'],
    ['MARA', 'A hard, tired silence. Then she puts the bag down, slowly.', 'One. Because of Mateo. Not because of you.']
  ] }
]);
scene('M07', 'DECIDE', { via: 'direct', cast: ['ASH'], at: 'place:room' }, [
  ['ASH', 'Standing at the window. Barely audible.', 'Darius is going to keep coming. We can\'t hide in a back room for the rest of our lives.'],
  { choice: 'darius_reply', prompt: 'Darius will want an answer.', options: [
    { v: 'defy', t: 'Defy him. Tell him it\'s over.', rel: { DARIUS: -2, MARA: 1 }, set: { defied_darius: true }, steps: [
      ['ASH', 'Dialling. Cold, level, speaking to a recording of a man.', 'Darius. It\'s Ash. You gave me eight hundred dollars. I\'m giving you a week. Leave Mara\'s brother out of this, and leave Eddie\'s door alone.'],
      ['DARIUS', 'Voice message, recorded. Lazy and warm and terrifying in the exact same breath.', 'That\'s fine. I like a man who knows what he wants. A week is a very long time.']
    ] },
    { v: 'bargain', t: 'Bargain. Offer him something.', rel: { DARIUS: 1, MARA: -1 }, set: { bargained_darius: true }, steps: [
      ['ASH', 'Smooth. Playing the wrong card as well as it can be played.', 'Darius. I have half of what you want. I\'ll trade it for the people I care about.'],
      ['DARIUS', 'Voice message, recorded. Delighted.', 'Now we\'re talking. Business is just talking with better manners.']
    ] },
    { v: 'silent', t: 'Say nothing. Let him wonder.', rel: { DARIUS: 0 }, set: { silent_darius: true }, steps: [
      ['ASH', 'Putting the phone down on the sill. No call.', 'Let him wonder.'],
      ['MARA', 'Quiet, from the doorway.', 'That\'s the scariest thing you could\'ve done.']
    ] }
  ] }
]);

// MISSION 6: THE PEOPLE WHO PAY. The legitimate face of the conspiracy: eviction notices on Wharf Street, the Alder Point site, and Victor Sloane.
import { scene } from '../dialogue.js';

scene('M06', 'CALL', { via: 'phone', who: 'MARA' }, [
  ['MARA', 'Back to brisk. Something eased since the beach, though she would deny it.', 'Wharf Street. Ng\'s Corner Mart. The owner is a woman called Lucille and she is terrifying. Be polite, and don\'t touch the candy.']
]);
scene('M06', 'MART', { via: 'direct', cast: ['LUCILLE', 'MARA', 'ASH'], at: 'place:mart' }, [
  ['LUCILLE', 'Sweeping glass from a shattered window. She does not stop sweeping. Dry, sharp.', 'We\'re open. Mind the glass. Somebody threw a brick last night. I\'m told it was kids. Kids with excellent aim and a very good sense of when I\'ve gone home.'],
  ['MARA', 'Easy, familiar. She has bought candy here since she was nine.', 'Lucille. This is Ash. Ash, Lucille Ng. She\'s run this counter thirty-one years.'],
  ['LUCILLE', 'Looks Ash up and down once, and gives nothing away.', 'Thirty-one. Before you ask, I\'m not selling.'],
  ['ASH', 'Gently.', 'I\'m not here to buy.'],
  ['LUCILLE', 'Dry.', 'Everyone says that. Then a man in a very nice coat comes in and wants to buy.'],
  ['MARA', 'Quiet.', 'Show him the letter, Lucille.'],
  ['LUCILLE', 'A long beat. She takes a folded paper from under the register and doesn\'t hand it over.', 'I signed one thing. A "property assessment access agreement." Nice paper. Nice smile. I didn\'t read the second page.'],
  ['ASH', 'Reading it.', 'This isn\'t an assessment. It\'s a sale option. With a thirty-day clause.'],
  ['LUCILLE', 'Flat. She has known for a week and has not said it aloud.', 'Yes. I know. I\'m not an idiot. I just didn\'t have a lawyer, and then I didn\'t have a window.'],
  ['MARA', 'Low, practical.', 'The whole block got the same letter. Four shops, nine apartments. Every one of them has had a window broken, a fire in a bin, or a rumour in the paper that Wharf Street isn\'t safe.'],
  ['LUCILLE', 'Tight, bright with anger.', 'It\'s very safe. It was perfectly safe until they started making it dangerous.'],
  ['LUCILLE', 'Quiet. She finally stops sweeping.', 'There\'s a trailer on the Alder Point site where they keep the property files. A man left a visitor pass on my counter last month and I kept it. Don\'t ask why. You never know when a woman my age might need to visit a construction site.'],
  ['LUCILLE', 'Handing over the pass, brisk again.', 'And if you meet a woman named Priya Nair at the diner on Cedar, tell her Lucille Ng is finally prepared to be quoted.']
]);
scene('M06', 'SITE', { via: 'car', cast: ['MARA', 'ASH'], at: 'place:site' }, [
  ['MARA', 'Whisper. The site is quiet, the cranes motionless.', 'Trailer by the fence. The pass should get us past the gate guard. Say you\'re from the lender.'],
  ['ASH', 'Quiet.', 'Which lender?'],
  ['MARA', 'Flat.', 'Any lender. Developers love lenders.'],
  ['ASH', 'Reading folders by phone light.', 'Purchase orders. Wharf Street, every unit. And a payment schedule. Alder Point Development to King Haulage, monthly. "Consulting: public safety."'],
  ['MARA', 'Very quiet.', 'Public safety. They pay Darius to make it unsafe, and then they pay for the cleanup.'],
  ['ASH', 'Closing the folder. Low.', 'There\'s a cross reference. PAC-4471.']
]);
scene('M06', 'ALARM', { via: 'phone', who: 'MARA', pri: 3 }, [
  ['MARA', 'Hissed, urgent. Somewhere behind her a door slams.', 'Headlights at the gate. Two vans. They are not your friendly security. Get to the car.'],
  ['MARA', 'Fast, controlled.', 'Don\'t speed through the gate, you\'ll make them remember you. Be a boring man in a boring car. Go.']
]);
scene('M06', 'EVENT', { via: 'direct', cast: ['SLOANE', 'MARA', 'ASH'], at: 'place:tower' }, [
  ['SLOANE', 'Smooth, courteous, arriving as though the room were his. He holds out a hand and takes his time.', 'Mr. Ash. Or Ms. Ash. I\'m told the preference doesn\'t matter. Victor Sloane. Thank you for coming to the reception.'],
  ['MARA', 'Polite, brittle, every muscle tight.', 'Mr. Sloane.'],
  ['SLOANE', 'To Mara, warm.', 'Ms. Cruz. A pleasure. Your family has been delivering to the waterfront for years. We value that, as I\'m told they value us.'],
  ['SLOANE', 'To Ash, the soft focus of a man doing a favour.', 'I understand you\'ve been touring Wharf Street. It\'s a disgrace what has happened there, honestly. I\'m trying to help those people leave before it gets worse. It\'s the only decent thing to do.'],
  ['ASH', 'Level.', 'I met a woman who said it was perfectly safe until somebody started making it dangerous.'],
  ['SLOANE', 'A gentle, rueful smile. He is not threatened. He is delighted to be understood.', 'Emotional people say remarkable things. You and I are practical, I think. May I be practical?'],
  ['SLOANE', 'Steady, as if reading out a menu.', 'I have a project that will employ four thousand people. A handful of unhappy owners are a regrettable cost. I\'d like to prevent anyone from being hurt.'],
  ['SLOANE', 'Taking out an envelope and leaving it on the table between them, very gently.', 'Twenty thousand dollars. In return, a quiet understanding: that whatever you\'ve borrowed, you will return, and whatever you\'re planning to say, you will say nothing at all. It isn\'t a threat. It is, if anything, a very generous kind of advice.'],
  ['MARA', 'Low, through her teeth.', 'Ash.'],
  ['SLOANE', 'Mild. He has heard her and ignored it with perfect manners.', 'Take a moment. I have all evening.'],
  { choice: 'sloane_offer', prompt: 'The envelope.', options: [
    { v: 'accept', t: 'Take the money. For now.', rel: { MARA: -3, ROWAN: 0 }, set: { took_sloane_money: true }, steps: [
      ['ASH', 'Quiet. The envelope is heavier than it looks.', 'I\'ll think about it.'],
      ['SLOANE', 'Delighted, and not showing it too much.', 'That is all anyone can ask. Thank you. I\'m sure we will understand each other.'],
      ['MARA', 'A very quiet, very flat laugh that has no humour in it.', 'Wow.']
    ] },
    { v: 'refuse', t: 'Push it back. "No."', rel: { MARA: 2, DARIUS: 0 }, set: { refused_sloane: true }, steps: [
      ['ASH', 'Pushing the envelope across the table with one finger. Level.', 'No.'],
      ['SLOANE', 'Not a flicker of anger. He picks it up, and puts it away like a man putting away a pen.', 'Very well. I regret that. I do hope the two of you stay safe in the city. It can be unpredictable.'],
      ['MARA', 'Under her breath, a hard smile.', 'There it is.']
    ] },
    { v: 'pretend', t: 'Pretend to accept. Keep looking.', rel: { MARA: 1 }, set: { pretended_sloane: true }, steps: [
      ['ASH', 'Smooth. Not quite a lie, not quite the truth.', 'Twenty thousand is a lot of reasons to listen. I\'ll consider myself advised.'],
      ['SLOANE', 'A small, approving nod.', 'A practical answer. I do appreciate practical people.'],
      ['MARA', 'Very low, so only Ash can hear.', 'I hope you know what you\'re doing.']
    ] }
  ] },
  ['SLOANE', 'Parting, courteous. He is already looking at someone else in the room.', 'Enjoy the evening. The shrimp are excellent. Please don\'t let anyone tell you otherwise.']
]);
scene('M06', 'AFTER', { via: 'car', cast: ['MARA', 'ASH'] }, [
  { if: 'choice:sloane_offer=refuse', then: [
    ['MARA', 'Quiet, once the doors are shut. A smile she can\'t help.', 'You know he\'s going to remember that.'],
    ['ASH', 'Dry.', 'I was hoping so.'],
    ['MARA', 'Soft, almost to herself.', 'I wasn\'t sure what you\'d do. I\'m glad I was wrong.']
  ] },
  { if: 'choice:sloane_offer=accept', then: [
    ['MARA', 'Cold. Looking out of the window.', 'Twenty thousand.'],
    ['ASH', 'Level.', 'I haven\'t spent it.'],
    ['MARA', 'Tired.', 'Not yet.']
  ] },
  { if: 'choice:sloane_offer=pretend', then: [
    ['MARA', 'Quiet, careful.', 'You were very convincing. I need to know whether that was an act.'],
    ['ASH', 'Honest.', 'It was. Mostly.'],
    ['MARA', 'A breath, half laugh.', 'Mostly. Great. That\'s going on my tombstone.']
  ] },
  ['MARA', 'Practical again, rubbing her eyes.', 'The files are in your jacket. We have to put them somewhere safe. Somewhere that isn\'t Darius, and isn\'t police.'],
  ['MARA', 'Honest.', 'Lucille said a woman named Priya Nair would be at the diner on Cedar. She writes for the Ledger. She\'s the only person in this city who\'s written a word about Wharf Street.']
]);
scene('M06', 'CONTACT', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:diner' }, [
  ['MARA', 'Parked outside the diner. Her hand is on the door but she is not opening it.', 'Okay. We have a few options and a lot of risk.'],
  { choice: 'evidence2', prompt: 'Who gets the Alder Point files?', options: [
    { v: 'priya', t: 'Priya Nair, the journalist.', rel: { PRIYA: 2, MARA: 1 }, set: { priya_has_files: true }, steps: [
      ['ASH', 'Steady.', 'Priya. She\'s the only one who wrote a word.'],
      ['MARA', 'A nod. She exhales.', 'Then let\'s see if she writes the next one.']
    ] },
    { v: 'mara', t: 'Mara keeps them somewhere safe.', rel: { MARA: 2 }, set: { mara_has_files: true }, steps: [
      ['ASH', 'Pushing the folder into her hands.', 'You keep them. You know the city better than I do.'],
      ['MARA', 'Quiet, startled.', 'You\'re giving me the only thing that\'s worth anything.']
    ] },
    { v: 'rowan', t: 'Rowan. He\'s still the police.', rel: { ROWAN: 2, MARA: -2 }, set: { rowan_has_files: true }, steps: [
      ['ASH', 'A little too reasonable.', 'We need someone with a badge. He can open doors we can\'t.'],
      ['MARA', 'Very quiet.', 'He is the voice on the tape.'],
      ['ASH', 'Tired, uncertain.', 'Or he isn\'t. I have to know.']
    ] }
  ] }
]);
scene('M06', 'PRIYA', { via: 'direct', cast: ['PRIYA', 'ASH'], at: 'place:diner', if: 'flag:priya_has_files' }, [
  ['PRIYA', 'Sharp, bright, a notebook already open. She has been waiting for a source for a year.', 'Lucille called me. I\'ve never heard her call anyone.'],
  ['ASH', 'Hands over the folder.', 'You\'ll want to read this slowly.'],
  ['PRIYA', 'Reading, going very still.', 'Alder Point to King Haulage. Monthly. "Public safety." I\'ve been asking the city for this for fourteen months.'],
  ['PRIYA', 'Looking up. Direct.', 'My editor killed the last version of this story. I don\'t want to lose this one. Will you go on the record?'],
  ['ASH', 'Honest.', 'Not yet. Maybe not for a while. Keep it safe.'],
  ['PRIYA', 'A short nod. She respects it.', 'Then I\'ll keep it safe. And I\'ll tell you now, in case it matters later: I only print what holds up.']
]);

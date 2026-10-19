// THE WORLD TALKS BACK: hangout conversations (press E near a person), and radio broadcasts that change as the story does.
import { scene } from '../dialogue.js';

/* ---- Eddie at the garage ---- */
scene('H01', 'EDDIE1', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage', skipOk: true }, [
  ['EDDIE', 'Not looking up. Easy.', 'The coffee machine is broken. Don\'t take that personally. It\'s broken for everyone.']
]);
scene('H01', 'EDDIE2', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Under a car. Muffled.', 'If you\'re going to ask about the job, no. If you\'re going to ask how I\'m doing, also no.'],
  ['ASH', 'Dry.', 'I was going to ask for a wrench.'],
  ['EDDIE', 'A pause.', 'Third drawer. Don\'t lose it. It\'s the only one I like.']
]);
scene('H01', 'EDDIE3', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Quiet, wiping a gauge.', 'You\'re still here. I keep expecting you to be a person who leaves.'],
  ['ASH', 'Light.', 'I like the window.'],
  ['EDDIE', 'A short, dry laugh.', 'Nobody likes the window.']
]);
scene('H01', 'EDDIE4', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Not turning round. Flat, the voice of a man who has been told too much and not enough.', 'Walt\'s been quiet. Walt is always quiet. But it\'s a different quiet.'],
  ['ASH', 'Careful.', 'Different how?'],
  ['EDDIE', 'Shrugs.', 'Like a man holding his breath.']
]);
scene('H01', 'EDDIE5', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Quiet. He has been saying it to himself all morning.', 'I\'m going to say his name every day. Danny. There. That\'s the exercise. The therapist is a woman called Pat. She\'s very good, she hates my jokes.'],
  ['ASH', 'Warm.', 'She sounds like Lucille.'],
  ['EDDIE', 'A real smile.', 'Everybody does.']
]);
scene('H01', 'EDDIE6', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Dry, sitting on a drum.', 'There\'s a rumour you took Sloane\'s money. I told them it was a lie. Is it a lie?'],
  ['ASH', 'Honest.', 'Not yet.'],
  ['EDDIE', 'Quiet. A longer silence than he usually allows.', 'Okay. Thank you for the honesty. I\'m going to keep hoping that stays true.']
]);
/* ---- Mara ---- */
scene('H02', 'MARA1', { via: 'direct', cast: ['MARA', 'ASH'] }, [
  ['MARA', 'Leaning on a car. Bright.', 'You know, if you drove even slightly worse, I\'d be able to teach you things. It\'s deeply frustrating.']
]);
scene('H02', 'MARA2', { via: 'direct', cast: ['MARA', 'ASH'] }, [
  ['MARA', 'Quiet, scanning the street.', 'Same black car again. I keep naming them. This one is Gerald.'],
  ['ASH', 'Dry.', 'He looks like a Gerald.']
]);
scene('H02', 'MARA3', { via: 'direct', cast: ['MARA', 'ASH'], if: 'rel:MARA>=TRUSTED' }, [
  ['MARA', 'Easy, open.', 'Okay, so I told Mateo about you. He thinks you\'re cool. I\'m trying very hard not to make it weird.'],
  ['ASH', 'Smiling.', 'You\'re making it weird.'],
  ['MARA', 'Grins.', 'Obviously.']
]);
scene('H02', 'MARA4', { via: 'direct', cast: ['MARA', 'ASH'], if: 'rel:MARA<=DISTRUSTED' }, [
  ['MARA', 'Cool. Not looking up from her phone.', 'If you need something, say it. Otherwise I\'m busy.']
]);
scene('H02', 'MARA5', { via: 'direct', cast: ['MARA', 'ASH'] }, [
  ['MARA', 'Quiet, once Ash comes close. She says it like a secret.', 'I\'ve got a map on my wall. A small one. It has a lot of pins in it. I know it\'s stupid.'],
  ['ASH', 'Gentle.', 'It isn\'t.']
]);
/* ---- the rest of the city ---- */
scene('H03', 'WALT1', { via: 'direct', cast: ['WALT', 'ASH'] }, [
  ['WALT', 'Sitting on a bollard. Gruff, not looking at Ash.', 'Don\'t talk to me around the cameras.']
]);
scene('H03', 'WALT2', { via: 'direct', cast: ['WALT', 'ASH'] }, [
  ['WALT', 'Quiet, after a long pause.', 'The tide comes in and goes out. People think it\'s the sea. It\'s the moon. Nobody ever thanks the moon.']
]);
scene('H04', 'LUCILLE1', { via: 'direct', cast: ['LUCILLE', 'ASH'] }, [
  ['LUCILLE', 'Behind the counter, dry.', 'We\'re out of the good candy. We\'re always out of the good candy. The good candy is a rumour.']
]);
scene('H04', 'LUCILLE2', { via: 'direct', cast: ['LUCILLE', 'ASH'], if: 'flag:mart_saved' }, [
  ['LUCILLE', 'Pleased with herself.', 'Two kids came by to apologise for the brick. I made them sweep. I\'ve never seen anyone sweep so honestly.']
]);
scene('H05', 'DANA1', { via: 'direct', cast: ['DANA', 'ASH'] }, [
  ['DANA', 'Standing by her patrol car. Quiet, polite, glancing at the station.', 'Please don\'t talk to me in front of the building. I mean it kindly.']
]);
scene('H06', 'PRIYA1', { via: 'direct', cast: ['PRIYA', 'ASH'] }, [
  ['PRIYA', 'Typing at a diner table. Doesn\'t look up.', 'Don\'t tell me anything yet. I\'m allergic to unconfirmed things. It\'s a condition.']
]);
scene('H07', 'JOJO1', { via: 'direct', cast: ['JOJO', 'ASH'] }, [
  ['JOJO', 'Skateboard under one arm. Fast.', 'Hey! Sorry, I\'m busy. I\'m always busy. It\'s a thing I do now.']
]);
scene('H08', 'DARIUS1', { via: 'direct', cast: ['DARIUS', 'ASH'], if: '!done:M06' }, [
  ['DARIUS', 'Big, friendly, a hand on Ash\'s shoulder.', 'My favourite driver! Eat something. You look like you\'ve been thinking. Thinking is how people lose weight.']
]);
scene('H09', 'ROWAN1', { via: 'direct', cast: ['ROWAN', 'ASH'] }, [
  ['ROWAN', 'Calm, hands folded.', 'I\'d prefer we spoke elsewhere. I don\'t care for being overheard.']
]);
scene('H10', 'MATEO1', { via: 'direct', cast: ['MATEO', 'ASH'] }, [
  ['MATEO', 'On the bench. Defensive.', 'If my sister told you to check on me, I\'m fine. Tell her I\'m fine. Tell her loudly.']
]);

/* ---- radio: what Alder FM says changes with the story ---- */
scene('X01', 'CITY', { via: 'radio', who: 'HOST', unfiltered: true, pri: 1 }, [
  ['HOST', 'Easy, warm, in no hurry.', 'You\'re listening to Alder FM. If you\'re stuck on the highway, relax. It\'s a very nice highway to be stuck on.']
]);
scene('X01', 'NEWS1', { via: 'radio', who: 'HOST', unfiltered: true, pri: 1, if: 'done:M03 && !done:M06' }, [
  ['HOST', 'Mock-casual.', 'Port police have confirmed a break-in at a port warehouse and reported that, quote, nothing of value was taken. Unquote. Which is the best kind of break-in, if you ask a certain kind of person.']
]);
scene('X01', 'NEWS2', { via: 'radio', who: 'HOST', unfiltered: true, pri: 1, if: 'done:M06 && !done:M09' }, [
  ['HOST', 'More careful.', 'The Port Alder Ledger is promising a series on waterfront redevelopment. Sloane Development says it welcomes, quote, "any good faith inquiry."']
]);
scene('X01', 'NEWS3', { via: 'radio', who: 'HOST', unfiltered: true, pri: 1, if: 'done:M07 && !done:M09' }, [
  ['HOST', 'Flat. Reading what has been handed to him.', 'Police are investigating a disturbance at the public car park this evening. Nobody has been hurt, the cars are, however, unrecognisable.']
]);
scene('X01', 'AD', { via: 'radio', who: 'SLOANE', unfiltered: true, pri: 1, if: '!end:A' }, [
  ['SLOANE', 'Polished, warm.', 'Alder Point. A waterfront for everyone. Sloane Development. Building what comes next.']
]);

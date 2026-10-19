// MISSION 2: EASY MONEY. Eddie introduces Mara; Ash meets Darius; the paperwork on the car does not match the car.
import { scene } from '../dialogue.js';

scene('M02', 'MEET', { via: 'direct', cast: ['EDDIE', 'MARA', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Not looking at anyone. Rag, wrench, reluctance.', 'Ash. Mara. Mara, Ash. Don\'t shake hands, it\'ll just make it official.'],
  ['MARA', 'Leaning on the bench, taking Ash in with one sweep. Amused and unimpressed.', 'The new guy. Eddie says you don\'t crash. Is that a skill, or just a lack of enthusiasm?'],
  ['ASH', 'Dry.', 'I\'m told it\'s a skill.'],
  ['MARA', 'Quick, a little sharp.', 'Cute. I don\'t hire cute. I hire people who don\'t stop when things get loud.'],
  ['EDDIE', 'Quieter. To Ash, not to Mara.', 'The call you got last night. The one I told you to ignore. That\'s Darius King\'s people. I\'m not telling you to take it. I\'m telling you it\'s a bad idea in a nice jacket.'],
  ['ASH', 'Careful.', 'But it pays.'],
  ['EDDIE', 'A tired breath. He has had this argument with himself for years.', 'It pays. That\'s the whole problem with it.'],
  ['MARA', 'Cutting in, brisk, not unkind.', 'It\'s a car. Pick up, drop off, no questions, and you get paid more than he pays you for a week. I\'ve done it a hundred times. Nothing has ever exploded.'],
  ['EDDIE', 'Dry.', 'Nothing ever has. That\'s how you know it\'s about to.'],
  ['MARA', 'Rolling her eyes, grinning. She likes him.', 'Eddie. Go work on something.'],
  ['EDDIE', 'He goes. Over his shoulder, to Ash.', 'Be careful about work from strangers. Strangers have reasons.'],
  ['ASH', 'To Mara, once Eddie is out of earshot.', 'Does he always do that?'],
  ['MARA', 'Slight, genuine smile. She picks up her keys.', 'Worry? Every day. Come on, newcomer. You follow me, you don\'t try to be clever, and if somebody asks, you work for Eddie.']
]);
scene('M02', 'DRIVE', { via: 'phone', who: 'MARA' }, [
  ['MARA', 'Radio crackle, bright, fast, engine in the background.', 'Okay, stay on my bumper. Not too close, I\'m picky about my bumper.'],
  ['MARA', 'Teasing.', 'Public car park, downtown side. Grey sedan, bay on the end of row C. Plates end four-four-seven-one. Somebody is going to leave the key under the mat, because people like that think that\'s clever.'],
  ['ASH', 'Over the radio, steady.', 'And you know these people.'],
  ['MARA', 'A tiny pause, a decision about how honest to be.', 'I know what they pay. That\'s a different thing.']
]);
scene('M02', 'CARPARK', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:carpark' }, [
  ['MARA', 'Quiet, scanning the car park. A different Mara: attentive, tight.', 'Okay. Before we move anything. Look at this.'],
  ['ASH', 'Leaning in.', 'The paperwork?'],
  ['MARA', 'Flat. Pointing with a keycap.', 'The VIN on the paperwork ends four-four-one-seven. The VIN on the windshield ends four-four-seven-one. Somebody swapped two numbers. Either they\'re sloppy, or the car isn\'t the car.'],
  ['ASH', 'Slowly.', 'And which one do you think it is?'],
  ['MARA', 'Dry, evasive.', 'I think I get paid not to think. And so do you.'],
  ['MARA', 'Quick glance at Ash. She says it as if asking about the weather, and it is not.', 'Did Eddie say anything about this job?'],
  ['ASH', 'Honest.', 'He said I shouldn\'t take it.'],
  ['MARA', 'A short laugh with no humour in it. She files that away.', 'That\'s Eddie.'],
  ['MARA', 'Back to business, deliberately. She is a professional.', 'We do the job. We deliver the car. Anyone asks, the numbers matched, because they always do on the day.'],
  ['ASH', 'Quiet, a decision.', 'Understood.']
]);
scene('M02', 'FIND', { via: 'phone', who: 'MARA' }, [
  ['MARA', 'Low, radio-clipped. A bit smug.', 'Grey sedan, end of row C. Told you. Key under the mat.'],
  ['MARA', 'Practical.', 'Take it to the King Haulage depot, the one with the high fence on the industrial side. I\'ll be ahead of you. Drive like you\'re late for nothing.']
]);
scene('M02', 'ROAD', { via: 'phone', who: 'MARA', pri: 2 }, [
  ['MARA', 'Easy, watching her mirror.', 'Nice and legal. If a cop gets behind you, you are a very boring person with a very boring car.'],
  ['MARA', 'A little more tension, the same tone.', 'Don\'t look now. Dark car behind the box truck. It\'s been three turns. Probably nothing. Everything is probably nothing until it isn\'t.']
]);
scene('M02', 'DEPOT', { via: 'direct', cast: ['GUARD', 'MARA', 'JOJO', 'DARIUS', 'ASH'], at: 'place:depot' }, [
  ['GUARD', 'Low, suspicious. Hand on the gate. Not an ordinary employee.', 'Whose car is that?'],
  ['MARA', 'Easy, unbothered, like she has done this a hundred times.', 'Mine. Well, theirs. Today. Open the gate, we\'re expected.'],
  ['GUARD', 'Eyeing Ash.', 'Who\'s that?'],
  ['MARA', 'Light.', 'The driver. He doesn\'t talk much. It\'s the best thing about him.'],
  ['JOJO', 'Hurrying up, nervous energy. Cutting off whatever the guard was going to say.', 'It\'s fine, it\'s fine, they\'re with Darius. Hey. You\'re the new driver? I\'m Jojo. I left you that message. Sorry about the message. I\'m bad at messages.'],
  ['ASH', 'Faintly amused.', 'It was fine.'],
  ['DARIUS', 'Warm, loud, arriving with his arms open like this is a party.', 'There he is! The driver who doesn\'t crash!'],
  ['DARIUS', 'Walks a circle around the car. Delighted by it, delighted by everything.', 'Look at that. Not a scratch. You know how many people I send out for a simple pickup, and what comes back? Dents. Excuses. One time, a goat. Don\'t ask.'],
  ['ASH', 'Almost smiling despite themselves.', 'I won\'t.'],
  ['DARIUS', 'A big laugh, a hand on Ash\'s shoulder. It lands lightly and stays.', 'I like him. Mara, I like him. Mr. Eddie\'s got himself some good hands. Come. Come in the shade. Jojo, get this person a cold drink.'],
  ['DARIUS', 'Counting bills with a showman\'s flourish, putting them into Ash\'s hand without being asked.', 'Eight hundred. Don\'t argue, it\'s embarrassing. Here is my one rule, my friend, and it\'s free. Port Alder rewards the people who get things done and don\'t ask what they\'re getting done. I\'m a very generous man to people like that.'],
  ['ASH', 'Careful. The money is heavy in the hand.', 'That\'s a lot for a car.'],
  ['DARIUS', 'Warm. Perfectly sincere. That\'s what makes it unsettling.', 'It\'s not for the car. It\'s for the quiet.'],
  ['GUARD', 'Under his breath, watching the road, nervous.', 'Cruiser.'],
  ['DARIUS', 'The smile stays. The eyes follow the police car, steady and unhurried. He says nothing until it is gone.', 'Hm.'],
  ['DARIUS', 'Back in the joke, as if nothing happened.', 'Port Alder police. Always on time and never in the right place. Come back soon, Ash. Mara, a word.']
]);
scene('M02', 'POST', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:room' }, [
  ['EDDIE', 'Leaning in the doorway of the back room, arms folded. Soft, not accusing.', 'Mara texted me you got paid.'],
  ['ASH', 'Honest, tired.', 'Eight hundred.'],
  ['EDDIE', 'A short, quiet breath. He looks at the floor.', 'Yeah. That\'s the number he opens with.'],
  ['ASH', 'Gently pushing.', 'You know him.'],
  ['EDDIE', 'Closing it down fast, but not rudely.', 'Everybody who has a car in this city knows Darius King. Knowing him and owing him are two different things. Be the first kind.'],
  ['ASH', 'Quiet.', 'The paperwork on the car didn\'t match.'],
  ['EDDIE', 'Very still for half a second. Then he says it too evenly.', 'Paperwork never matches. It\'s the only thing it\'s good at. Get some sleep.']
]);

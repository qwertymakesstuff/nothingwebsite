// OPTIONAL CHAINS: the honest officer (O01-O03), the waterfront residents (W01-W03) and Darius's crew (D01-D03).
import { scene } from '../dialogue.js';

/* ------------------------------ THE HONEST OFFICER ------------------------------ */
scene('O01', 'MEET', { via: 'direct', cast: ['DANA', 'ASH'], at: 'place:hq' }, [
  ['DANA', 'Standing by her patrol car, keys turning in her fingers. Nervous and trying to look as though she is not.', 'You\'re Ash. I know you, because three different people told me not to talk to you.'],
  ['ASH', 'Dry.', 'That sounds about right.'],
  ['DANA', 'Quieter. Checking over her shoulder.', 'I\'m Officer Whitfield. Dana. I\'ve been on the street five years. I have a notebook and I have a photo of a logbook page that doesn\'t match it.'],
  ['DANA', 'Fast.', 'Detective Rowan\'s reports say that nothing happened at three addresses on nights when I was personally standing there watching things happen.'],
  ['ASH', 'Gentle.', 'Why tell me?'],
  ['DANA', 'A short, tired breath.', 'Because you\'re not on the force. Nobody can be sacked for talking to you.']
]);
scene('O02', 'BRIEF', { via: 'phone', who: 'DANA' }, [
  ['DANA', 'On the radio, businesslike. A list.', 'Three places. The Wharf Street shops, the old Vale storage unit, and the Port Warehouse. Rowan\'s reports say "no incident". See what you see.']
]);
scene('O02', 'SITE1', { via: 'car', cast: ['ASH'] }, [
  ['ASH', 'At the Wharf Street shops. Quiet.', 'Broken windows, fire damage, police tape. Nothing in the report. Not one word.']
]);
scene('O02', 'SITE2', { via: 'car', cast: ['ASH'] }, [
  ['ASH', 'At the storage unit. Flat.', 'Locks cut, boxes opened. Somebody has been through here since the report was filed. Recently.']
]);
scene('O02', 'SITE3', { via: 'car', cast: ['ASH'] }, [
  ['ASH', 'At the port. Low.', 'Fresh forklift tracks and a gate log with a page torn out. Dana was right. Every single report is wrong in exactly the same way.']
]);
scene('O03', 'FILE', { via: 'direct', cast: ['DANA', 'ASH'], at: 'place:hq' }, [
  ['DANA', 'Spreading photographs on the hood of the patrol car. Hands steady now.', 'Three sites. Three false reports. One signature. If this goes to the captain, it goes straight to Rowan. If it goes to Internal Affairs, I\'m done before the end of the week.'],
  ['ASH', 'Level.', 'What do you want to do?'],
  ['DANA', 'Squares her shoulders.', 'I want to keep a file. Real, properly documented, ready for the day someone who can act on it is willing to read it. And I want it to be me who kept it.'],
  { set: { dana_has_case: true }, rel: { DANA: 2 } },
  ['DANA', 'A small, hopeful smile.', 'Thank you. For not telling me to leave it alone.']
]);

/* ------------------------------ THE WATERFRONT RESIDENTS ------------------------------ */
scene('W01', 'CALL', { via: 'phone', who: 'LUCILLE' }, [
  ['LUCILLE', 'On the phone. Dry, curt, brisk as a slap.', 'There are two men outside my shop with a van. I\'m holding the broom. Come or don\'t, but the broom and I are going out.']
]);
scene('W01', 'SIEGE', { via: 'radio', who: 'LUCILLE', pri: 3 }, [
  ['LUCILLE', 'Shouting through the door. A woman in the middle of the fight of her life, and enjoying it.', 'Get away from my window! This is a lawful establishment!'],
  ['ASH', 'Low.', 'Lucille, get down.'],
  ['LUCILLE', 'Furious, delighted.', 'I\'ve never been down a day in my life!']
]);
scene('W01', 'DONE', { via: 'direct', cast: ['LUCILLE', 'ASH'], at: 'place:mart' }, [
  ['LUCILLE', 'Leaning on the broom among the glass. Out of breath, grinning.', 'They\'re gone. I didn\'t even have to hit one. Mostly.'],
  ['ASH', 'Dry.', 'Mostly?'],
  ['LUCILLE', 'Straight-faced.', 'I have a very good swing.'],
  { set: { mart_saved: true }, rel: { LUCILLE: 2 } }
]);
scene('W02', 'ASK', { via: 'direct', cast: ['LUCILLE', 'ASH'], at: 'place:mart' }, [
  ['LUCILLE', 'Handing over a clipboard, a pen on a string.', 'A petition. I need twenty names. Three streets. Nobody wants to be the first.'],
  ['ASH', 'Gentle.', 'And you want me to be the first.'],
  ['LUCILLE', 'Dry.', 'I want you to be the one with the transport.']
]);
scene('W02', 'NEIGHBOUR', { via: 'direct', cast: ['ASH'], at: 'place:diner' }, [
  ['ASH', 'Talking to a stranger off-screen. Neutral and friendly.', 'It\'s about Wharf Street. We\'re collecting signatures against the buyout.'],
  ['ASH', 'Taking the pen back with a small smile.', 'Thank you. You\'ve done more than you know.']
]);
scene('W02', 'PLAZA', { via: 'direct', cast: ['PRIYA', 'ASH'], at: 'place:plaza' }, [
  ['PRIYA', 'Receiving the clipboard, a quick, real smile.', 'Twenty-three. Lucille asked for twenty. I\'m going to put "a few more" in the story, because it sounds stubborn.'],
  { set: { petition_filed: true }, rel: { PRIYA: 1, LUCILLE: 1 } }
]);
scene('W03', 'ASK', { via: 'phone', who: 'PRIYA' }, [
  ['PRIYA', 'On the phone. Quick, excited and careful at the same time.', 'There\'s a permit posted on the Alder Point site fence. If the environmental waiver on it is forged, I can prove it. I need someone to take a photo. Preferably someone who looks like they\'re supposed to be there.']
]);
scene('W03', 'SITE', { via: 'car', cast: ['ASH'] }, [
  ['ASH', 'Squinting at a laminated notice, taking a photograph. Quiet.', 'Environmental waiver, signed, dated. The date is a Sunday. Nobody signs a waiver on Sunday.'],
  ['ASH', 'A flat, pleased laugh.', 'And it\'s signed by a man who died in March.']
]);
scene('W03', 'PRIYA', { via: 'direct', cast: ['PRIYA', 'ASH'], at: 'place:diner' }, [
  ['PRIYA', 'Staring at the photo as though it were a diamond.', 'A dead man signed the waiver. Ash, do you understand how much easier this makes my life?'],
  { set: { waiver_forged: true }, rel: { PRIYA: 2 } },
  ['PRIYA', 'Quiet, serious.', 'I\'ll hold it until the rest comes together. And when it does, I\'ll quote you as "a concerned neighbour". That okay?']
]);

/* ------------------------------ DARIUS'S CREW (before it goes bad) ------------------------------ */
scene('D01', 'CALL', { via: 'phone', who: 'JOJO' }, [
  ['JOJO', 'Bright, a little too eager. He loves being asked.', 'Hey! Darius says you can do a collection run with me. Three shops, three envelopes. Nobody gets hurt, nobody gets hassled. We just say hi and take the thing. Easy.']
]);
scene('D01', 'STOP', { via: 'car', cast: ['JOJO', 'ASH'] }, [
  ['JOJO', 'Hopping out of the car, whispering back through the window.', 'Okay. Nice and calm. We say it\'s from Darius.'],
  ['JOJO', 'Back in the car, a small, nervous laugh.', 'See? Easy. Nobody even looked at us.']
]);
scene('D01', 'DONE', { via: 'direct', cast: ['JOJO', 'ASH'], at: 'place:depot' }, [
  ['JOJO', 'Counting the envelopes, a little too carefully. He doesn\'t meet Ash\'s eye.', 'Darius is going to love this. He loves it when the envelopes are right.'],
  ['ASH', 'Dry.', 'What are they for?'],
  ['JOJO', 'Fast, flat, the voice of someone lying to himself.', 'Insurance. It\'s, like, protection. For the shops. You know, from stuff.'],
  ['ASH', 'Quiet.', 'From who?'],
  ['JOJO', 'A short, miserable laugh.', 'That\'s the funny part.'],
  { set: { did_collections: true }, rel: { DARIUS: 1, JOJO: 1 } }
]);
scene('D02', 'CALL', { via: 'phone', who: 'DARIUS' }, [
  ['DARIUS', 'Warm, playful, theatrical. He is clearly enjoying it.', 'Ash! Ash, Ash, Ash. Port Alder has a very bad habit of buying cars it can\'t afford. I\'d like to help one of them find a new home.'],
  ['DARIUS', 'Chuckling.', 'Sports car, dealership lot, nice and visible. Bring it to the depot. The police might be a little curious. Don\'t be a hero. Be a driver.']
]);
scene('D02', 'DONE', { via: 'direct', cast: ['DARIUS', 'ASH'], at: 'place:depot' }, [
  ['DARIUS', 'Walking around the stolen car with his hands behind his back, grinning like a man at a gallery.', 'Perfect. Not a scratch and a police chase to boot. You\'re wasted on Eddie, you know that? A man of your talents, fixing brakes.'],
  ['ASH', 'Dry.', 'I deliver brakes. I don\'t fix them.'],
  ['DARIUS', 'A big, delighted laugh.', 'See? That\'s why I like you. You\'re funny. Nobody\'s funny in Port Alder. They\'re just loud.'],
  { set: { did_stolen_car: true }, rel: { DARIUS: 1 } }
]);
scene('D03', 'JOJO', { via: 'direct', cast: ['JOJO', 'ASH'], at: 'place:depot' }, [
  ['JOJO', 'Alone, pacing between two trucks, not slowing when Ash walks up.', 'Can I ask you something? You\'re not going to tell Darius?'],
  ['ASH', 'Quiet.', 'Ask.'],
  ['JOJO', 'Fast, low.', 'If you found out something... bad. About him. About what we move. What would you do?'],
  { choice: 'jojo', prompt: 'Jojo.', options: [
    { v: 'help', t: '"I\'d want somebody to tell me. Tell me what you know."', rel: { JOJO: 3 }, set: { jojo_trusts: true }, steps: [
      ['ASH', 'Steady, kind.', 'You don\'t have to tell me anything. But if you want to, I\'m not going to repeat it. Not to him, not to anyone.'],
      ['JOJO', 'A long, shaky breath. A young man putting something heavy down.', 'Okay. Okay. There\'s a container. I drove it. I\'m not sleeping. If I ever need to call you, I\'ll call you.']
    ] },
    { v: 'ignore', t: '"I\'d keep my head down. Don\'t get involved."', rel: { JOJO: -1 }, set: { jojo_silent: true }, steps: [
      ['ASH', 'Gently. It\'s not cruelty; it\'s fear.', 'I\'d stay out of it. Nobody ever got hurt by not asking.'],
      ['JOJO', 'Flat. The face of someone who has been given exactly the answer he feared.', 'Yeah. That\'s what I figured. Forget I asked.']
    ] }
  ] }
]);

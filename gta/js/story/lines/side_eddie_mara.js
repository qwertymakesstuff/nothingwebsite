// OPTIONAL CHAINS: Eddie's garage (E01-E03) and Mara's escape plan (R01-R03).
import { scene } from '../dialogue.js';

/* ------------------------------ EDDIE'S GARAGE ------------------------------ */
scene('E01', 'ASK', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'In the doorway. Not looking at Ash. A man who has been rehearsing a request for days.', 'You said you wouldn\'t drag me in.'],
  ['ASH', 'Quiet.', 'I won\'t.'],
  ['EDDIE', 'A long pause. His voice is almost too soft.', 'I\'m dragging myself. I kept every job ticket for twelve years. Danny filed them. His handwriting. They\'re in a storage unit by the industrial blocks. I haven\'t been in there since.'],
  ['EDDIE', 'Dry, to cover it.', 'There\'s a box that says TAXES on it. It doesn\'t say taxes. Don\'t tell anyone I said that.'],
  ['ASH', 'Gentle.', 'I\'ll bring it back.']
]);
scene('E01', 'UNIT', { via: 'car', cast: ['ASH'] }, [
  ['ASH', 'Alone in a dusty storage unit. Light finger on a taped box.', 'The box that doesn\'t say taxes.'],
  ['ASH', 'Reading, slowly, a small, human laugh at the margin notes.', '"Eddie is wrong. Again." "Eddie is wrong, but he is right about the brakes." This is Danny\'s handwriting.'],
  ['ASH', 'Quieter. Turning to the last ticket.', '"Berth Nine. Pickup 11 PM. Do NOT put the date on it. E. says it\'s a bad idea. It is." And a name. Not a name. Initials. R.']
]);
scene('E01', 'BACK', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Holding the last ticket in two fingers. He doesn\'t turn it over until he has read it three times.', 'He wrote "E. says it\'s a bad idea." I did say that. I did.'],
  ['EDDIE', 'Very low.', 'And here\'s the part that\'s going to bother me for the rest of my life. I wasn\'t wrong. I just didn\'t stop him.'],
  ['ASH', 'Quiet.', 'You didn\'t know it was the last time.'],
  ['EDDIE', 'A small, careful breath, and, for the first time, he looks at Ash.', 'No. But I think I could have.']
]);
scene('E02', 'CALL', { via: 'phone', who: 'EDDIE' }, [
  ['EDDIE', 'On the phone. Gruff, too casual, a man asking for a favour by pretending it isn\'t one.', 'There\'s a truck. Blue. You know the one. It\'s in Walt\'s yard at the docks. I\'d like it back. Not for the money.'],
  ['EDDIE', 'Dry, quiet.', 'It\'s the only thing of his I can still fix.']
]);
scene('E02', 'WALT', { via: 'direct', cast: ['WALT', 'ASH'], at: 'place:docks' }, [
  ['WALT', 'Handing over the keys without being asked. Quiet.', 'It\'s been sitting there. I never could look at it. Tell Eddie it still runs.'],
  ['ASH', 'Gentle.', 'Why did you keep it?'],
  ['WALT', 'A grunt. He looks away.', 'Somebody had to. Danny would\'ve kept it for me.']
]);
scene('E02', 'DRIVE', { via: 'phone', who: 'EDDIE', pri: 2 }, [
  ['EDDIE', 'Over the phone. Stiff, quiet, trying not to ask.', 'How does she sound?'],
  ['ASH', 'Dry, warm.', 'Like she has opinions.'],
  ['EDDIE', 'A small laugh. It cracks.', 'That\'s her. Bring her home.']
]);
scene('E02', 'HOME', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Walking around the pickup, one palm flat on the hood. Not speaking for a while.', 'You know, I fixed this. I fixed it wrong. I repaired every dent and not one thing that mattered.'],
  ['EDDIE', 'Quietly, almost to the truck.', 'Thank you for bringing her back.']
]);
scene('E03', 'ASK', { via: 'phone', who: 'EDDIE' }, [
  ['EDDIE', 'On the phone. Rough. He has decided to say something and cannot yet say it.', 'There\'s one more thing. People who knew Danny. Not the docks. Not the crew. People who liked him. I realised I\'d never asked any of them what they remembered.'],
  ['EDDIE', 'Quieter.', 'Lucille Ng. She says he fixed her delivery van for free for a year. She\'s been trying to tell me for five years. I kept finding reasons to be somewhere else.']
]);
scene('E03', 'LUCILLE', { via: 'direct', cast: ['LUCILLE', 'ASH'], at: 'place:mart' }, [
  ['LUCILLE', 'Behind the counter, polishing a spotless glass. Warm, dry, and entirely serious about it.', 'He came in Tuesdays. Danny Vale. Bought one sour candy and told me the same joke for six years. I never once laughed. He took it very personally.'],
  ['ASH', 'Smiling a little.', 'What was the joke?'],
  ['LUCILLE', 'Straight-faced.', 'A mechanic walks into a bar. It gets worse from there.'],
  ['LUCILLE', 'Setting a small keyring on the counter. A tiny brass wrench.', 'He left this behind. I\'ve kept it behind the register for five years. Tell Eddie it\'s not his fault. Tell him in whatever words he\'ll actually hear.'],
  ['ASH', 'Quiet.', 'I will.']
]);
scene('E03', 'PIER', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:pier' }, [
  ['EDDIE', 'Standing at the end of the pier with the brass wrench keyring in his hand. A long silence.', 'He told that joke to me too. Every day. It never got better.'],
  ['ASH', 'Quiet.', 'Lucille said it\'s not your fault.'],
  ['EDDIE', 'A short, wet laugh. He wipes his eyes and does not apologise.', 'I\'ll believe her in a few years. But it\'s a start.'],
  ['EDDIE', 'Hanging the keyring on the rail, gently, and stepping back. Quietly.', 'There. Everyone says to say goodbye. I\'m just going to say I\'m sorry I took so long.'],
  { set: { eddie_closure: true }, rel: { EDDIE: 2 } },
  ['EDDIE', 'Turning, brisk, the old Eddie sliding back in.', 'The garage is yours whenever you need it. Free. Parts too. I\'ll complain about it, but you\'ll never see a bill.']
]);

/* ------------------------------ MARA'S ESCAPE PLAN ------------------------------ */
scene('R01', 'CALL', { via: 'phone', who: 'MARA' }, [
  ['MARA', 'On the phone. Quick, businesslike, a little shy about it.', 'I need a favour. Not a Darius favour. A clean one. A courier job for the hospital: lab samples from the dealership side. Legal, boring, twelve hundred dollars.'],
  ['MARA', 'Dry.', 'That\'s a quarter of my ticket out. I\'ve been saving for two years. I\'m not telling you why I trust you with it. I\'m just telling you I do.']
]);
scene('R01', 'DRIVE', { via: 'phone', who: 'MARA', pri: 2 }, [
  ['MARA', 'Light. She can hear the car through the phone.', 'Legal speeds. Seatbelt. Pretend you\'re a nice person. It\'s good practice.']
]);
scene('R01', 'DONE', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:garage' }, [
  ['MARA', 'Counting the money into an envelope. She doesn\'t look up.', 'Okay. Twelve hundred. That\'s thirty-one hundred. I need five. I\'ve started to do the maths in my sleep.'],
  ['ASH', 'Gentle.', 'Where is the money going?'],
  ['MARA', 'Looks up. A flash of something unguarded.', 'Out. Me and Mateo. Somewhere with a school he can get into and a street I\'m not afraid of. I\'ve got a map on my wall.'],
  { set: { mara_savings: true }, rel: { MARA: 1 } }
]);
scene('R02', 'CALL', { via: 'phone', who: 'MARA' }, [
  ['MARA', 'On the phone. Tight, a little ashamed to be asking.', 'Mateo\'s at the park. He won\'t talk to me. He\'ll talk to you. You\'re not a sister. You\'re a stranger. Strangers are easier.']
]);
scene('R02', 'PARK', { via: 'direct', cast: ['MATEO', 'ASH'], at: 'place:park' }, [
  ['MATEO', 'Sitting on the back of a bench with his feet on the seat. Defensive, bored, performing it.', 'My sister sent you.'],
  ['ASH', 'Sitting, not too close.', 'She didn\'t say it to your face?'],
  ['MATEO', 'A short snort.', 'She says everything to my face. It\'s very loud.'],
  ['ASH', 'Honest.', 'What are you carrying for them?'],
  ['MATEO', 'Quick, too quick.', 'Packages. For a friend\'s uncle.'],
  ['ASH', 'Level.', 'Mateo. Mara says you carry a bag very well. Those were Darius\'s words. Not hers.'],
  ['MATEO', 'The performance falters. He stares at his sneakers.', '...Last month one of the packages was heavy in a way it shouldn\'t have been. I looked. I\'m not stupid. I put it back and I didn\'t say anything.'],
  { choice: 'mateo', prompt: 'Mateo.', options: [
    { v: 'quit', t: 'Tell him to stop. Tonight. Today.', rel: { MARA: 1 }, set: { mateo_out: true }, steps: [
      ['ASH', 'Steady.', 'Stop. Tell them you\'re sick. Tell them whatever you want. Your sister is the only one in this city who wants nothing from you.'],
      ['MATEO', 'A long breath. A teenager\'s deflated shrug that hides a huge relief.', 'Okay. Okay. I\'ll tell Jojo I\'m done.']
    ] },
    { v: 'use', t: 'Tell him to keep going. For now. Let him be a source.', rel: { MARA: -2 }, set: { mateo_source: true }, steps: [
      ['ASH', 'Careful. It is a cold thing to ask.', 'Keep carrying. Tell me what you see. Don\'t be a hero. Just remember.'],
      ['MATEO', 'Surprised. Pleased and scared at once.', 'Wait. You want me to be, like, a spy?']
    ] }
  ] }
]);
scene('R03', 'PLAN', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:garage' }, [
  ['MARA', 'Leaning on her car, a ticket in her hand. The first real calm.', 'Four thousand eight hundred. Two hundred short. I\'m going to say it out loud. I\'m afraid.'],
  ['ASH', 'Quiet.', 'Of leaving?'],
  ['MARA', 'Dry.', 'Of staying. Of being the person who stayed. What would you do?'],
  { choice: 'mara_plan', prompt: 'Mara\'s plan.', options: [
    { v: 'leave', t: 'Go. Take Mateo and go. You\'ve earned it.', rel: { MARA: 2 }, set: { mara_leaves: true }, steps: [
      ['ASH', 'Warm.', 'Go. Take Mateo and go. You\'ve earned the map on your wall.'],
      ['MARA', 'A shaky, grateful exhale.', 'You\'re telling me to leave. And I thought you were going to ask me to stay.']
    ] },
    { v: 'fight', t: 'Stay. Port Alder needs people who stay.', rel: { MARA: 1 }, set: { mara_stays: true }, steps: [
      ['ASH', 'Honest.', 'I\'d like you to stay. Not because I need you to. Because this city has been shaped by people who left.'],
      ['MARA', 'A slow, tired smile.', 'That is manipulative and I love it.']
    ] },
    { v: 'self', t: 'It\'s your decision. Don\'t make it about me.', rel: { MARA: -1 }, set: { mara_alone: true }, steps: [
      ['ASH', 'Careful. It comes out colder than it is.', 'I can\'t be the reason you stay or go. That\'s not fair to either of us.'],
      ['MARA', 'Quiet, a flinch she hides.', 'Right. Not fair. Got it.']
    ] }
  ] }
]);

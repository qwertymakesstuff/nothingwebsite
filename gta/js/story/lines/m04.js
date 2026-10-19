// MISSION 4: NO LOOSE ENDS. Someone knew exactly where Mara would go. Her brother. A choice about how to treat her.
import { scene } from '../dialogue.js';

scene('M04', 'CALL', { via: 'phone', who: 'MARA' }, [
  ['MARA', 'Low, fast, outdoors. No jokes. A different Mara.', 'Ash. Where are you? Good. West beach car park. Come alone, take the long way round, and look in your mirrors like you mean it.'],
  { if: 'choice:evidence=darius', then: [
    ['MARA', 'Cool. Short.', 'And don\'t tell Darius you\'re coming. Don\'t tell anyone.']
  ], else: [
    ['MARA', 'Quieter. Almost kind.', 'I think somebody\'s been following me since the port. I need a second pair of eyes that doesn\'t work for Darius.']
  ] }
]);
scene('M04', 'MEET', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:westbeach' }, [
  ['MARA', 'Leaning on her car, not relaxed. Watching a dark sedan parked far down the row.', 'Same car, three days in a row. Different driver each time. Don\'t turn around, it\'s not worth it.'],
  ['ASH', 'Dry, keeping their eyes forward.', 'You\'re sure?'],
  ['MARA', 'Flat.', 'I grew up on these roads. I know every car that doesn\'t belong.'],
  ['MARA', 'Practical. She has made a plan and does not want to be told it is a bad one.', 'There was a second page. After the port, I split my notes. I hid a bag at the cove. Receipts, a flash drive, a log of every delivery I could watch. If something happens to me, that bag is the only record.'],
  ['ASH', 'Quiet.', 'Why tell me?'],
  ['MARA', 'A tight, honest shrug.', 'Because I can\'t carry it and drive at the same time. And because nobody else has walked into that warehouse and walked out.'],
  { if: 'choice:evidence=mara', then: [
    ['MARA', 'Softer, a half-smile that vanishes. A thank-you she can\'t say directly.', 'And because you didn\'t hand me a story. You handed me the page.']
  ] },
  ['MARA', 'Back to business, car keys already in her hand.', 'The cove. We go in my car, I\'ll drive, you watch the mirrors. If anything looks wrong, you say so. Out loud. Not nicely.']
]);
scene('M04', 'DRIVE', { via: 'car', who: 'MARA', pri: 2 }, [
  ['MARA', 'Driving, eyes on the mirror. Bright, a tight joke to keep the nerves down.', 'Rule one of getaways. You never call it a getaway until you\'re in it.'],
  ['ASH', 'Dry.', 'Is this a getaway?'],
  ['MARA', 'Quick.', 'Ask me in twenty minutes.']
]);
scene('M04', 'SEARCH', { via: 'car', cast: ['MARA', 'ASH'] }, [
  ['MARA', 'Low, whispering as if the gulls could hear. Pointing with her chin.', 'Under the concrete step. The lifeguard hut. There.'],
  ['ASH', 'Pulling a damp canvas bag from the gap.', 'Got it. It\'s lighter than I thought.'],
  ['MARA', 'Very still. She is looking at something past Ash\'s shoulder.', 'Ash. Don\'t move. Headlights. Two cars. Both pointing at us.'],
  ['MARA', 'Not loud. Almost conversational, which is much worse.', 'They knew exactly where I\'d be. Nobody knew I\'d be here. Nobody.']
]);
scene('M04', 'ESCAPE', { via: 'car', who: 'MARA', pri: 3 }, [
  ['MARA', 'Snapping into focus. Sharp, quick.', 'Seatbelt. Left at the pier road, then the coast road. Don\'t talk, just tell me when they\'re close.'],
  ['ASH', 'Over the engine noise.', 'Close.'],
  ['MARA', 'A short, breathless laugh.', 'You\'re really committing to this.'],
  ['MARA', 'Raw. A bit of the truth leaking through the speed.', 'I\'ve been thinking about my brother the whole time. I think he\'s been running packages for Darius. And I think somebody told them where I\'d be.'],
  ['ASH', 'Level.', 'Keep driving.'],
  ['MARA', 'A broken laugh.', 'Always.'],
  ['ASH', 'Quick.', 'Two behind, one pulling up on the right.'],
  ['MARA', 'Hard, flat.', 'Hold on. Not my car, not my insurance, not my problem.'],
  ['MARA', 'Quiet, once the engines fall behind. Out of breath.', 'That\'s the last of them. Where\'s the safest place you know?'],
  ['ASH', 'Tired.', 'Eddie\'s back room.']
]);
scene('M04', 'SAFE', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:room' }, [
  ['MARA', 'Sitting on the cot, bag across her knees. Her hands won\'t stop shaking.', 'I didn\'t expect anyone to be there.'],
  ['ASH', 'Gentle.', 'You said you thought somebody was following you.'],
  ['MARA', 'Dry, brittle. The joke is a wall.', 'Thinking and expecting are different departments.'],
  ['MARA', 'Quiet, finally. This is the confession.', 'Mateo. My little brother. He\'s seventeen. For a year he\'s been bringing home cash and telling me it\'s deliveries for a friend\'s uncle. I let myself believe him because I needed the money more than I needed the truth.'],
  ['MARA', 'Looks away.', 'If somebody told Darius where I\'d be, it came from someone who knows my life. That\'s a short list. And Mateo\'s on it.'],
  ['MARA', 'Flat, scared.', 'I don\'t know if he\'s doing it willingly. Or if somebody is making him.'],
  { choice: 'mara_confession', prompt: 'Mara.', options: [
    { v: 'reassure', t: 'Reassure her. "We\'ll find him. We\'ll sort it out."', rel: { MARA: 2 }, steps: [
      ['ASH', 'Steady, kind, not pretending to have more than they have.', 'We find him. Before anyone else does. And we find out what he knows. You\'re not alone in this.'],
      ['MARA', 'A long breath. Her shoulders drop an inch.', 'I don\'t... okay. Okay. Thank you.']
    ] },
    { v: 'challenge', t: 'Challenge her. "You should have told me sooner."', rel: { MARA: -1 }, steps: [
      ['ASH', 'Not cruel, but honest and a little hurt.', 'You should have told me sooner. We both could have been dead at that beach.'],
      ['MARA', 'Flinching, then flat, defensive.', 'Right. Sure. You\'re right. I\'ll remember that, next time I\'m trying not to get my brother killed.']
    ] },
    { v: 'stayout', t: 'Tell her to stay out of the next jobs.', rel: { MARA: -2 }, set: { mara_benched: true }, steps: [
      ['ASH', 'Firm, concerned, clumsy.', 'Stay out of the next job. I\'ll handle it. You\'re too close to this.'],
      ['MARA', 'Cold. Very controlled.', 'Too close. That\'s funny. That\'s my family you\'re calling too close.'],
      ['MARA', 'She stands. Quiet, deliberate. It is not a threat; it is a door closing.', 'I don\'t take orders from people I met a week ago.']
    ] }
  ] }
]);

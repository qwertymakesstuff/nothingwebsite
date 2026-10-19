// MISSION 5: DIRTY BADGE. Detective Rowan offers a trade; he knows something he should not; Eddie recognises a truck in a photograph.
import { scene } from '../dialogue.js';

scene('M05', 'CALL', { via: 'phone', who: 'ROWAN' }, [
  ['ROWAN', 'Calm, courteous. A man who has never needed to raise his voice.', 'Ash. Detective Rowan, Port Alder police. I hope this isn\'t a bad time. I think we might be interested in the same shipment.'],
  ['ROWAN', 'A short pause. He lets it sit.', 'There\'s a bench in City Plaza by the clock tower. Public place. Nobody will be taking notes. I\'d like to buy you a coffee and trade a few facts.']
]);
scene('M05', 'MEET', { via: 'direct', cast: ['ROWAN', 'ASH'], at: 'place:plaza' }, [
  ['ROWAN', 'Seated, two coffees on the bench. Pleasant, measured. He doesn\'t stand.', 'Thank you for coming. Sit. The coffee is better than it has any right to be.'],
  ['ASH', 'Sitting, not touching the cup.', 'You said facts.'],
  ['ROWAN', 'A thin smile. He is not offended.', 'I did. Let me start with mine. For eighteen months this department has been trying to understand a pattern. Stolen vehicles. Cargo that goes missing from the port and comes back as something else. Evictions in places that are conveniently quiet at night.'],
  ['ROWAN', 'Slow. Each sentence chosen.', 'Every time we get close, someone higher up reminds us that the port is a political subject. I won\'t name them. You would learn nothing.'],
  ['ASH', 'Dry.', 'So you\'re a good cop with bad bosses.'],
  ['ROWAN', 'A very small pause. His eyes do not move.', 'I\'m a cautious one. That\'s often the same thing from a distance.'],
  ['ROWAN', 'Gentler. Almost fatherly.', 'The warehouse. I understand you went through rack nine, behind the blue containers. I understand someone was waiting at the gate with a flashlight. And I understand you did not take what you came for.'],
  ['ASH', 'Very still. Careful.', 'Who told you about rack nine?'],
  ['ROWAN', 'Smooth. Not a flicker.', 'The incident report.'],
  ['ASH', 'Not pushing, but noting it.', 'The incident report says rack nine?'],
  { pause: 1.4 },
  ['ROWAN', 'He sips his coffee. A deliberate silence. Then he says it as if it were nothing.', 'Reports are very thorough, when I\'m the one who writes them.'],
  ['ROWAN', 'Setting the cup down. Patient.', 'I have access to an evidence room that has seen better days. If you\'ll let me, I\'d like to show you something you may find useful. And in return, I\'d like to know what you took.'],
  { if: 'flag:gave_darius_manifest', then: [
    ['ROWAN', 'Mild. He has read the room.', 'And I suspect you\'ve already decided what to do with whatever you found. I only ask that you hear me out.']
  ] }
]);
scene('M05', 'DRIVE', { via: 'phone', who: 'ROWAN', pri: 2 }, [
  ['ROWAN', 'On the phone, driving ahead. Even, unhurried.', 'The holding yard, north of the station. I will meet you at the gate. Stay in your car until I wave you in. The officers on duty are good people. They don\'t need to remember you.']
]);
scene('M05', 'YARD', { via: 'direct', cast: ['ROWAN', 'ASH'], at: 'place:holding' }, [
  ['ROWAN', 'Quiet, a hand on the gate. He glances once at the cameras.', 'The cameras are on a loop. I wouldn\'t take the loop personally.'],
  ['ASH', 'Level.', 'You can do that.'],
  ['ROWAN', 'A single, controlled nod.', 'I can do a number of things.'],
  ['ROWAN', 'Pointing, without pointing, at a stack of boxes under a tarpaulin.', 'Box four, on the right. Property from a locker at Berth Nine, taken five years ago. Nobody ever signed for it.'],
  ['ASH', 'Quiet. Opening the box and finding the photograph.', 'A blue pickup. At night. A plate, partly covered.'],
  ['ASH', 'Reading the back, slowly.', '"Berth Nine. Never reported."'],
  ['ROWAN', 'Gentle, with the patience of a man who has told this story before.', 'I could tell you that was a missing person case that was never closed. It isn\'t my case to open. It is, apparently, yours.'],
  ['ASH', 'Lifting a small cassette recorder, sealed in a bag. Frowning.', 'And this?'],
  ['ROWAN', 'The first real silence. Then, smoothly.', 'Evidence. I haven\'t listened to it. I\'d prefer someone with less to lose did.']
]);
scene('M05', 'TAPE', { via: 'radio', who: 'DARIUS', as: 'Recording', pri: 3 }, [
  ['DARIUS', 'Recorded, hissy. Warm, mid-laugh, a little drunk on his own cleverness.', '...and the harbor squad? They\'re covered?'],
  ['ROWAN', 'Recorded, distorted, a man who does not want to be heard. Flat. Precise.', 'Let\'s be precise. They\'ll find only what I put in front of them.'],
  ['DARIUS', 'Recorded. A big, easy laugh.', 'That\'s why I love working with professionals.']
]);
scene('M05', 'DECIDE', { via: 'direct', cast: ['ROWAN', 'ASH'], at: 'place:holding' }, [
  { pause: 1.6 },
  ['ROWAN', 'Gently, as if the tape had not played. He has made himself a person with nothing to hide.', 'Now, Ash. What do I tell my captain? What did you find at the warehouse?'],
  ['ASH', 'Slow, aware that the answer is a lever either way.', 'I need a minute.'],
  { choice: 'rowan_share', prompt: 'What do you tell Rowan?', options: [
    { v: 'rowan', t: 'Tell him everything. He can bury it, or not.', rel: { ROWAN: 1, MARA: -2, DANA: 0 }, set: { rowan_knows_everything: true }, steps: [
      ['ASH', 'A slow breath. The wrong decision, said calmly.', 'A manifest. Alder Point, King Haulage, consulting fees. It\'s with someone I trust.'],
      ['ROWAN', 'A very small smile. He has what he came for.', 'Thank you. That is exactly what I needed to know. I\'ll see it is handled properly.']
    ] },
    { v: 'half', t: 'Tell him part of it. Keep the names.', rel: { ROWAN: 0 }, set: { rowan_half: true }, steps: [
      ['ASH', 'Careful, bargaining.', 'A shipping document. Mismatched container numbers. I\'ll know more when I know whose it is.'],
      ['ROWAN', 'Studying Ash for exactly one second too long. Then pleasant.', 'Of course. We\'ll keep this between us.']
    ] },
    { v: 'nothing', t: 'Tell him nothing. You still haven\'t decided if he\'s clean.', rel: { ROWAN: -1 }, set: { rowan_suspected: true }, steps: [
      ['ASH', 'Level.', 'Nothing yet. I\'d like to know whose side the evidence is on before I tell you what it says.'],
      ['ROWAN', 'Very calm. The temperature in the yard drops a degree.', 'A wise caution. I will remember that you offered it.']
    ] }
  ] }
]);
scene('M05', 'EDDIE', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['ASH', 'Quietly, putting the photograph on the bench.', 'Eddie. I need you to look at this and tell me I\'m wrong.'],
  ['EDDIE', 'Wiping his hands. He looks, and stops wiping.', 'It\'s a truck.'],
  ['ASH', 'Level.', 'It\'s a blue pickup with a replaced tailgate and a fresh paint job. It looks like the one I delivered to Walt.'],
  ['EDDIE', 'Very quiet. He puts the rag down, slowly, as if it might break.', 'It\'s that one. I did the tailgate. A big dent, shaped like a boot. I did the paint. I put the plates on. A man from the docks brought it in at two in the morning, paid cash, and asked me not to put the date on the ticket.'],
  ['ASH', 'Gentle.', 'Who was it?'],
  ['EDDIE', 'A short, flat, defensive breath.', 'I don\'t remember. It was five years ago. You fix a hundred cars and you don\'t keep every face.'],
  ['ASH', 'Not unkind.', 'You remember the dent.'],
  ['EDDIE', 'Pause. His voice goes quieter, not louder.', 'Yeah. I remember the dent.'],
  ['EDDIE', 'Sharp, protective, a man pulling a door shut. He does not look up.', 'I need you not to involve me anymore. Whatever this is, I can\'t be in it. I have a garage. I have a mortgage. I have... I can\'t be in it, Ash.'],
  ['ASH', 'Quiet. Putting the photograph back in the envelope.', 'Okay. I won\'t drag you in.'],
  ['EDDIE', 'Barely audible, to the bench.', 'Thanks.']
]);
scene('M05', 'MARA', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:room' }, [
  ['MARA', 'Perched on the bench, tape recorder in her hands, listening to the tape a second time.', '"Let\'s be precise." Who says that? Who actually talks like that?'],
  ['ASH', 'Level.', 'Somebody who writes the incident report.'],
  { if: 'choice:rowan_share=rowan', then: [
    ['MARA', 'Cold. She sets the recorder down very carefully.', 'You told him. You told the man on the tape what we found.'],
    ['ASH', 'Quiet.', 'I didn\'t know it was him.'],
    ['MARA', 'Flat.', 'That\'s the point. You never do.']
  ], else: [
    ['MARA', 'A short, relieved, bitter laugh.', 'And you didn\'t give him everything. Small mercies.']
  ] },
  ['MARA', 'Quiet, practical. She has already set the next thing in motion in her head.', 'There\'s a development called Alder Point. Eviction notices on Wharf Street. A shop owner I know. If this is real, the paperwork is in that neighbourhood, not at the port.'],
  ['ASH', 'Yes.', 'Then that\'s where we look.']
]);

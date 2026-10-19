// MISSION 8: THE LAST WITNESS. Walt kept a copy of the gate log. Darius's people are on the way. Where does the evidence go?
import { scene } from '../dialogue.js';

scene('M08', 'CALL', { via: 'phone', who: 'MARA' }, [
  { if: 'flag:jojo_trusts', then: [
    ['JOJO', 'Whispered, from somewhere echoing. Scared and trying to be brave.', 'It\'s Jojo. I can\'t talk long. Walt isn\'t fishing. He\'s at the North Point lighthouse. Darius found out an hour ago. They\'re already on the way.']
  ], else: [
    ['MARA', 'Fast, working it out as she says it.', 'Walt hasn\'t been to work in six days. His neighbour says he\'s fishing at the point. Walt doesn\'t fish. He\'s hiding. North Point lighthouse.']
  ] },
  ['MARA', 'Urgent.', 'If Walt kept anything, that\'s where it is. And if I can work it out, so can Darius.']
]);
scene('M08', 'WALT', { via: 'direct', cast: ['WALT', 'ASH'], at: 'place:lighthouse' }, [
  ['WALT', 'In the shadow of the door, a thermos in his hand. He doesn\'t come out. He sounds ten years older than at the docks.', 'I said I was fishing.'],
  ['ASH', 'Gentle.', 'You don\'t fish, Walt.'],
  ['WALT', 'A dry, defeated half-laugh.', 'No. I don\'t.'],
  ['ASH', 'Quietly.', 'You asked about the dent on the tailgate. The first day. Why?'],
  ['WALT', 'Long silence. Then, haltingly, as if he has been practising the first line for five years.', 'Because the boy who made that dent was Danny Vale. And the last time I saw him, he gave me an envelope and said, "If I don\'t come in Tuesday, give it to somebody who isn\'t scared."'],
  ['WALT', 'A short, rough breath.', 'He didn\'t come in Tuesday. I wasn\'t that person. I\'ve been waiting five years to find out who was.'],
  ['ASH', 'Very quiet.', 'What\'s in the envelope?'],
  ['WALT', 'Taking a worn envelope from inside his coat. His hands are shaking.', 'A copy of the Berth Four gate log. The night PAC-4471 left without a signature. Four names on it. One of them is a detective. One of them is a man who doesn\'t do his own lifting. And one of them I recognise from the radio ads.'],
  ['ASH', 'Level.', 'Rowan. Sloane. Darius.'],
  ['WALT', 'He nods, once. It\'s the nod of a man handing something heavy to someone younger.', 'I saw Danny\'s truck go out that night with two men I\'d never seen before. It came back two days later. Danny never did.'],
  ['WALT', 'Quiet. He looks at Ash for the first time.', 'I know I should\'ve said something. I just kept thinking, ain\'t my business. It\'s been everybody\'s business the whole time.'],
  ['ASH', 'Putting a hand on his shoulder.', 'You\'re saying it now.'],
  ['WALT', 'Headlights sweep the road below. His voice drops to nothing.', 'They\'re here.']
]);
scene('M08', 'SIEGE', { via: 'radio', who: 'MARA', pri: 4 }, [
  ['MARA', 'Over the radio. Sharp, quick, breathless.', 'Three cars. They\'re spreading out for the lighthouse. Don\'t let them near the door.'],
  ['ASH', 'Low, urgent.', 'Walt, stay inside.'],
  ['WALT', 'Shouting, from inside, frightened.', 'I\'m not going anywhere!'],
  ['MARA', 'A short, grim laugh.', 'That\'s the spirit. Keep them off him, Ash. Ram them. Smoke them. I don\'t care, just don\'t let them get close.']
]);
scene('M08', 'LIVES', { via: 'direct', cast: ['WALT', 'ASH'], at: 'place:lighthouse', if: 'flag:walt_alive' }, [
  ['WALT', 'Sitting on the lighthouse step, one hand pressed to his ribs. Out of breath. Alive.', 'I thought I\'d be braver.'],
  ['ASH', 'Quiet, kind.', 'You were. You stayed.'],
  ['WALT', 'Dry, wheezing.', 'In a lighthouse. Hiding. Very brave.']
]);
scene('M08', 'DEAD', { via: 'car', cast: ['ASH'], if: '!flag:walt_alive' }, [
  { pause: 1.8 },
  ['ASH', 'Quiet. Standing in the doorway. Looking at the thermos on the step. It takes a while.', 'He was right. It was everybody\'s business.'],
  ['ASH', 'Folding the envelope into a pocket. A low, flat promise, to nobody.', 'He left us the log. I\'ll make it count.']
]);
scene('M08', 'DECIDE', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:lighthouse' }, [
  ['MARA', 'Arriving, winded, hair wild. Looks at the envelope, then at Ash.', 'That\'s the last piece. Tell me what we\'re doing with it.'],
  ['ASH', 'Quietly. The weight of it.', 'Three options. A detective with a badge we can trust, or a reporter who prints the truth, or we hold it, and use it as leverage.'],
  { choice: 'witness_evidence', prompt: 'Where does the gate log go?', options: [
    { v: 'police', t: 'The police. Dana Whitfield, if she can be trusted. Rowan if not.', rel: { DANA: 2 }, set: { gave_police_log: true }, steps: [
      { if: 'flag:dana_has_case', then: [
        ['MARA', 'Slowly. She is impressed in spite of herself.', 'Dana Whitfield. The one who photographed Rowan\'s logbook. Okay. Okay, that\'s a person with a spine.'],
        ['ASH', 'Quiet.', 'She will do it right. Slow, but right.']
      ], else: [
        ['MARA', 'Hard, flat, alarmed.', 'Ash, the only detective you know is on the tape.'],
        ['ASH', 'Level. It sounds sounder than it is.', 'It\'s a risk. If he buries it, we know for certain. If he doesn\'t, it gets read by someone with power.'],
        ['MARA', 'Very quiet.', 'That\'s a lot of faith in a man who says "let\'s be precise."']
      ] }
    ] },
    { v: 'journalist', t: 'Priya Nair at the Ledger. Print it.', rel: { PRIYA: 2, MARA: 1 }, set: { gave_priya_log: true }, steps: [
      ['MARA', 'A nod. Relief, firm.', 'Priya. She can\'t be bought. She can be fired, but she can\'t be bought.'],
      ['ASH', 'Quiet.', 'Then she has to be fast.']
    ] },
    { v: 'keep', t: 'Keep it. Leverage is safer than hope.', rel: { MARA: -1, DARIUS: 0 }, set: { kept_log: true }, steps: [
      ['ASH', 'A decision that sounds cold.', 'It\'s the only thing that keeps anyone alive. As long as nobody has it, nobody has to kill us for it.'],
      ['MARA', 'Slowly, not agreeing.', 'And when somebody decides to start?']
    ] }
  ] }
]);
scene('M08', 'RUN', { via: 'phone', who: 'MARA', pri: 3 }, [
  ['MARA', 'Fast, breathless, the engine loud around her.', 'They\'ve got a second set of cars on the coast road. Don\'t go that way. Cut through the industrial blocks.'],
  ['MARA', 'Quick, steadier.', 'And somebody put in a call. Listen to the scanner. There\'s a lot of police on the way and none of them for them.']
]);

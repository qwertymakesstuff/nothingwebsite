// MISSION 9: PORT ALDER BURNING. The final operation, the final confrontations and three endings.
import { scene } from '../dialogue.js';

scene('M09', 'ALLIES', { via: 'direct', cast: ['EDDIE', 'MARA', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Hauling the garage shutter down halfway, then leaving it. Dry, but steadier than we have heard him.', 'I closed the shop this morning. Put a note on the door. First time in eleven years the sign\'s been telling the truth.'],
  ['ASH', 'Quiet.', 'You don\'t have to come, Eddie.'],
  ['EDDIE', 'A small, wry exhale. He holds up a ring of keys.', 'These are Danny\'s. I\'ve carried them for five years in case he came back for them. I thought I\'d bring them. He\'d want to be annoyed with me for coming.'],
  { if: 'rel:MARA>=TRUSTED', then: [
    ['MARA', 'Pulling a duffel from her car. Crisp. Loose and almost cheerful. A woman who has stopped being afraid of being counted.', 'Mateo\'s at Lucille\'s. Lucille has a baseball bat and an opinion about everyone who walks in. I\'ve never felt safer about anything.']
  ] },
  { if: 'rel:MARA<TRUSTED && rel:MARA>DISTRUSTED', then: [
    ['MARA', 'Arms folded. Professional. A little cool.', 'I\'m here for Mateo. After tonight I\'ll decide what I think of you. Fair?'],
    ['ASH', 'Honest.', 'Fair.']
  ] },
  { if: 'rel:MARA<=DISTRUSTED', then: [
    ['MARA', 'Flat. She is on time, and has not forgiven anything.', 'I\'m only here because the alternative is worse. Don\'t say anything nice. I\'ll know it\'s a trick.']
  ] },
  ['MARA', 'Straight to it. She spreads a map of the port across the bench.', 'Three stages. The container yard first. PAC-4471 is the container that started this. Whatever\'s inside is why everyone has been running for six months. We find it, we get it out. Darius will be at the docks, because Darius always is. After that, Sloane.'],
  ['EDDIE', 'Dry.', 'You make it sound organised.'],
  ['MARA', 'A flash of her old grin.', 'It\'s not. I just say it with confidence.'],
  { if: 'flag:dana_has_case', then: [
    ['DANA', 'On speaker. Careful, quiet, the sound of a person speaking from a stairwell.', 'It\'s Dana Whitfield. I\'ll be at the harbor gate with three officers I trust. If you need police that aren\'t Detective Rowan\'s, that\'s us. Give me a signal.']
  ] },
  { if: 'flag:priya_has_files || flag:gave_priya_log', then: [
    ['PRIYA', 'On speaker. Brisk, bright and tired. Typing in the background.', 'Priya. I have two pages written and a lawyer on standby. Give me names, dates and documents, and I\'ll have a story by midnight that can\'t be killed.']
  ] }
]);
scene('M09', 'DRIVE', { via: 'car', who: 'MARA', pri: 2 }, [
  ['MARA', 'Driving. Dry, to cover the nerves.', 'If this goes well, I\'m going to tell everyone I planned it.'],
  ['EDDIE', 'From the back seat. Quiet, steady, a mechanic\'s opinion.', 'If this goes badly, tell them I told you so. In a nicer voice than I normally use.']
]);
scene('M09', 'YARD', { via: 'car', cast: ['ASH', 'MARA'] }, [
  ['MARA', 'Whispering. The yard is huge and silent, row after row of containers.', 'Row twelve. Blue door. There it is. PAC-4471.'],
  ['ASH', 'Working the latch with a bar. Quiet.', 'It\'s open. Somebody opened it.'],
  ['ASH', 'Inside, a steel cabinet. Flat, unbelieving.', 'Ledgers. Boxes of them. Signed contracts. Hard drives. Everything, all of it, in one place.'],
  ['MARA', 'Very quiet. Her voice cracks on the last word.', 'Six months. And it\'s been here the entire time. Sitting in a yard they thought no one would look at.'],
  ['ASH', 'Closing the cabinet. Steady.', 'Take what we can carry.']
]);
scene('M09', 'ALARM', { via: 'phone', who: 'ROWAN', pri: 4 }, [
  ['ROWAN', 'Calm, courteous, almost sorry. A police radio murmurs behind him.', 'Ash. Good evening. You\'re in a restricted area. I\'d advise you step away from the container.'],
  ['ASH', 'Level.', 'You were quick.'],
  ['ROWAN', 'A very small pause.', 'I\'m always quick. It\'s the only reason I\'ve lasted.'],
  ['ROWAN', 'Gently. A man being reasonable.', 'There are four patrol cars at the gate. They will not harm you if you put the cabinet down. I\'d much rather this were quiet.']
]);
scene('M09', 'HOLD', { via: 'radio', who: 'EDDIE', pri: 3 }, [
  ['MARA', 'Crisp, calling it. She has taken the wheel.', 'Cars at the gate and cars coming up the service road. We\'re not going to sit still.'],
  ['EDDIE', 'Steady. His voice is a rock.', 'Ash. Go. I\'ll watch the mirrors.'],
  ['MARA', 'A short, breathless laugh.', 'Eddie Vale. Backseat hero.']
]);
scene('M09', 'DARIUS', { via: 'direct', cast: ['DARIUS', 'JOJO', 'ASH'], at: 'place:berth4' }, [
  ['DARIUS', 'Sitting on a crate on the quay with a bottle of something expensive, no tie, no smile. The warmth is gone. What\'s left is just tired.', 'You know, I really did like you.'],
  ['ASH', 'Level.', 'You tried to have me killed.'],
  ['DARIUS', 'A soft, tired shrug.', 'I tried to have you stopped. It\'s a different department.'],
  ['ASH', 'Low.', 'Danny Vale.'],
  ['DARIUS', 'A very long beat. He doesn\'t look away.', 'Danny found a ledger he shouldn\'t have. Danny asked Sloane\'s people the wrong questions. And my crew, on my order, which I\'ll say once because I\'m an honest man at least about this, made sure he stopped asking.'],
  ['ASH', 'Very cold.', 'And you let Eddie believe he left town.'],
  ['DARIUS', 'Quiet.', 'Everyone needs a version they can live with.'],
  ['DARIUS', 'Standing now. The charisma returns, thin as paint.', 'Listen to me. You think this is a morality play. It is not. Everybody in this city is compromised. Eddie fixed my trucks. Mara drove my cars. The cops take my envelopes. And Victor Sloane pays me to be a monster so he can stand on a stage and be the hero. I\'m not the cancer, Ash. I\'m the symptom.'],
  ['ASH', 'Flat.', 'It still doesn\'t make it okay.'],
  ['DARIUS', 'A cold, reasonable shrug.', 'It doesn\'t have to be okay. It only has to be true.'],
  { if: 'flag:jojo_trusts', then: [
    ['JOJO', 'Stepping between them, shaking. His voice is thin and very brave.', 'Darius. Stop. It\'s finished. Let them go.'],
    ['DARIUS', 'Pained. Almost hurt.', 'Jojo. Not you too.']
  ] },
  ['DARIUS', 'Suddenly bright, suddenly cruel, a snap decision. He slides into his car.', 'You want to talk about okay? Come and get me.']
]);
scene('M09', 'FLEE', { via: 'radio', who: 'DARIUS', pri: 3 }, [
  ['DARIUS', 'Over the radio, laughing, driving fast, enjoying himself in a thin, terrible way.', 'Port Alder\'s built for this, you know. Every road leads to somebody who owes me.'],
  ['MARA', 'Over the radio, sharp.', 'He\'s heading for the bridge. Cut him off or he\'s gone.']
]);
scene('M09', 'DFATE', { via: 'direct', cast: ['DARIUS', 'ASH'], at: 'place:berth4' }, [
  ['DARIUS', 'Sitting on the kerb beside his wrecked car, bleeding from the forehead. Not laughing. Almost relieved.', 'Well. That\'s quite a rear bumper you\'ve got.'],
  ['ASH', 'Standing over him. Quiet.', 'It\'s over, Darius.'],
  ['DARIUS', 'Mild. Looking at his hands.', 'Is it. Say what you\'re going to do. I\'d rather hear it from a person than a siren.'],
  { pause: 1.2 },
  { choice: 'darius_fate', prompt: 'Darius.', options: [
    { v: 'police', t: 'Hand him to the police. He talks, or he doesn\'t.', rel: { DANA: 1 }, set: { darius_arrested: true }, steps: [
      ['ASH', 'Quiet.', 'You\'re going to say it all on the record. All of it. In front of someone you can\'t buy.'],
      ['DARIUS', 'A very dry, very tired smile.', 'I never could stand a good audience. Fine. Let\'s do it properly.']
    ] },
    { v: 'spare', t: 'Let him go. Tell him never to come back.', rel: { EDDIE: -2, MARA: -1 }, set: { darius_free: true }, steps: [
      ['ASH', 'Tired, flat.', 'Walk. Leave Port Alder. If I see you again, I won\'t be asking.'],
      ['DARIUS', 'A thin, surprised breath, and then, a little startled by it, a real smile.', 'You\'re going to regret that. I\'ll try to disappoint you as little as possible.']
    ] },
    { v: 'kill', t: 'Finish it. Nobody gets to say Danny\'s name like that.', rel: { EDDIE: -3, MARA: -2 }, set: { darius_dead: true }, steps: [
      ['ASH', 'Cold. Not loud. This is a decision they will remember every day.', 'This is for Danny.'],
      ['DARIUS', 'Barely audible. He has no more jokes.', 'Of course it is.']
    ] }
  ] }
]);
scene('M09', 'ROWAN', { via: 'direct', cast: ['ROWAN', 'ASH'], at: 'place:berth4' }, [
  ['ROWAN', 'Arriving alone, coat buttoned. The same calm voice. It no longer sounds like control; it sounds like fatigue.', 'Ash. I think we should speak before anyone else arrives.'],
  ['ASH', 'Level.', 'You were the voice on the tape.'],
  ['ROWAN', 'A very long pause. Longer than any pause he has used.', 'Let\'s be precise. I was, and I am not proud of it.'],
  ['ROWAN', 'Slowly. He is speaking to someone who is not Ash.', 'I joined to make a difference. In the first years, I did. Then someone made a call about my daughter\'s tuition, and the next day a report was misplaced, and the day after that I was the person who misplaced them. It is remarkably easy. That\'s what I would like you to understand. It is not a decision; it is a series of small mercies you grant yourself.'],
  ['ASH', 'Quiet.', 'And now?'],
  ['ROWAN', 'Dry. Almost a smile. His hands are open at his sides.', 'Now I have a cabinet of evidence to arrest and a conscience that has become, inconveniently, very loud.'],
  { choice: 'rowan_fate', prompt: 'Rowan.', options: [
    { v: 'arrested', t: 'Let Dana Whitfield take his statement.', if: 'flag:dana_has_case', rel: { DANA: 2, ROWAN: 0 }, set: { rowan_arrested: true }, steps: [
      ['DANA', 'Stepping out of the dark with two officers. Shaking a little, standing straight.', 'Detective Rowan. I\'d like to ask you to come with me. Please.'],
      ['ROWAN', 'Studying her. Then, very quietly, a faint, relieved, broken exhale.', 'Officer Whitfield. I was very much hoping it would be you.']
    ] },
    { v: 'flips', t: 'Tell him to testify against Sloane. Tonight.', rel: { ROWAN: 2 }, set: { rowan_flipped: true }, steps: [
      ['ASH', 'Low.', 'You keep copies. You always keep copies. Bring them.'],
      ['ROWAN', 'A pause. Then something that is almost a laugh.', 'I do. How very precise of you.']
    ] },
    { v: 'free', t: 'Walk away. Let him live with it.', rel: { ROWAN: -2 }, set: { rowan_free: true }, steps: [
      ['ASH', 'Turning their back.', 'I\'m not your conscience.'],
      ['ROWAN', 'Very quiet, behind them.', 'No. But it would have been nice to borrow one.']
    ] }
  ] }
]);
scene('M09', 'SLOANE', { via: 'direct', cast: ['SLOANE', 'MARA', 'ASH'], at: 'place:tower' }, [
  ['SLOANE', 'In the lobby of Harbor Tower at night, alone, immaculate, holding a cufflink. He greets Ash as if they had agreed to meet.', 'Ash. Good evening. I wondered whether you would find your way here.'],
  ['ASH', 'Level.', 'You\'re alone.'],
  ['SLOANE', 'A gentle smile.', 'I am always alone. It\'s what keeps one from getting sentimental.'],
  ['SLOANE', 'Calm. As if describing a weather system.', 'You have a cabinet of paper. I have a city. If you give it to a reporter, a number of people will lose their jobs, and some will lose more than that. The project will fail. Four thousand jobs. The waterfront will be left as it was, derelict, until it is eventually bought by someone less patient.'],
  { if: 'flag:took_sloane_money', then: [
    ['SLOANE', 'Mild.', 'You accepted my envelope once. I did notice. It tells me a great deal about you. I think we could do business.']
  ] },
  { if: 'flag:refused_sloane', then: [
    ['SLOANE', 'Mild.', 'You refused my first offer. I admired it. I hope you will forgive me for making a better one.']
  ] },
  ['SLOANE', 'Taking a slim folder from his jacket. He makes it sound like a gift.', 'Fifty thousand dollars. A clean record. A new life. A place at the table, if you want one. Or an end to it all, if you prefer. There is room for you in whatever I build next.'],
  ['SLOANE', 'Gently, almost fond.', 'The alternative is that you give it away, and a great many people will be very angry with you, including some I can no longer restrain.'],
  ['MARA', 'Low, through her teeth. She is standing right behind Ash.', 'Don\'t you dare.'],
  { pause: 2 },
  { choice: 'ending_choice', prompt: 'The last decision.', options: [
    { v: 'A', t: 'Refuse. Hand everything over. Let it all come out.', ending: 'A', rel: { MARA: 1, EDDIE: 1 }, steps: [
      ['ASH', 'Quiet. Firm. A decision that costs them something.', 'No. Everything goes to people who can print it and prosecute it. Including this conversation.'],
      ['SLOANE', 'Tilting his head. He is, for the first time, mildly interested.', 'Including this.'],
      ['ASH', 'Holding up a phone, the call light red.', 'It\'s been recording since the lobby.'],
      ['SLOANE', 'A small, almost admiring exhale. The first unplanned sound he has made.', 'How very impractical of you.']
    ] },
    { v: 'B', t: 'Take the deal. Fifty thousand, a clean record, a new life.', ending: 'B', rel: { MARA: -3, EDDIE: -2 }, steps: [
      ['ASH', 'Slow. The words come out smoother than they feel.', 'Fifty thousand. A clean record. I walk away and the paper never leaves my hands.'],
      ['SLOANE', 'A warm, pleased smile.', 'That\'s all I ever wanted. A practical conversation.'],
      ['MARA', 'Barely a voice. It is not anger; it is grief.', 'You knew him. Eddie. You were in his back room.'],
      ['ASH', 'Not turning around.', 'I know.']
    ] },
    { v: 'C', t: 'Burn it all. The cabinet, the deal, the lot.', ending: 'C', rel: { MARA: 0 }, steps: [
      ['ASH', 'Very quiet. A decision made a long way down.', 'No deal. No reporter. Nobody gets any of it.'],
      ['SLOANE', 'For the first time, a flicker of alarm.', 'That is, I think, rather foolish.'],
      ['ASH', 'Producing a lighter. Level.', 'You said it yourself, Mr. Sloane. It\'s only paper.']
    ] }
  ] }
]);

/* ------------------------------ ENDING A: EXPOSE THE TRUTH ------------------------------ */
scene('M09', 'EPI_A1', { via: 'radio', who: 'PRIYA', unfiltered: true, pri: 4 }, [
  ['HOST', 'Warm radio voice gone quiet. Genuinely shaken, for once not performing.', 'This is Alder FM. We are interrupting our regular programming. The Port Alder Ledger has this morning published a seven-page investigation into the Alder Point redevelopment.'],
  { if: 'flag:rowan_arrested || flag:rowan_flipped', then: [
    ['HOST', 'Steadier.', 'Police confirm that a senior detective has given a statement, and that warrants have been issued for Victor Sloane and for several officials.']
  ], else: [
    ['HOST', 'Steadier.', 'Police confirm they are reviewing the documents. A senior detective is on leave. Warrants are reported to be issued for Victor Sloane.']
  ] },
  ['HOST', 'A beat, almost to himself.', 'And for once, folks, I have nothing funny to say.']
]);
scene('M09', 'EPI_A2', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Hanging a new, hand-painted sign above the garage door. It reads VALE & VALE AUTO. He does not turn around.', 'Took a while to decide who to put on it.'],
  ['ASH', 'Quiet.', 'It suits it.'],
  ['EDDIE', 'A small, rough exhale.', 'I went to the harbor. First time in five years. Sat on the quay for an hour. Didn\'t say anything. I think that was the point.'],
  { if: 'flag:darius_arrested', then: [
    ['EDDIE', 'Quietly.', 'They read Darius\'s statement on the news. I listened to the whole thing. He said Danny\'s name, in a courtroom. I didn\'t think I\'d ever hear that.']
  ] },
  { if: 'flag:darius_free', then: [
    ['EDDIE', 'Quietly, with an edge.', 'You let him walk. I\'m still angry about that. I\'ll be angry for a while. But I\'m working on being angry out loud.']
  ] },
  { if: 'flag:darius_dead', then: [
    ['EDDIE', 'Very quiet.', 'I heard what happened to Darius. I don\'t want to talk about it. I just want you to know that I know, and I\'m still standing here.']
  ] },
  ['EDDIE', 'A last, dry line. It is the closest he will come to a hug.', 'The back room\'s still yours. If you want it. The window still doesn\'t close.']
]);
scene('M09', 'EPI_A3', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:pier' }, [
  { if: 'rel:MARA>=TRUSTED', then: [
    ['MARA', 'Leaning on the rail at the end of the pier, bag at her feet. Easy, open, the sun on her face. She is smiling, which she does not do often.', 'Mateo got a place on a program in the city. Not the docks. A real one. I looked at the map, and for the first time it didn\'t look like a trap.'],
    ['ASH', 'Quiet.', 'You\'re leaving?'],
    ['MARA', 'Light.', 'I\'m going for a while. Not leaving. There\'s a difference. And I thought you might want to come with me and find out what it is.']
  ] },
  { if: 'rel:MARA<TRUSTED && rel:MARA>DISTRUSTED', then: [
    ['MARA', 'Looking at the water. Careful and honest.', 'You did the right thing in the end. I can say that. I can also say I\'m not sure how I feel about the road that got us here.'],
    ['ASH', 'Level.', 'That\'s fair.'],
    ['MARA', 'A half-smile.', 'Mateo\'s safe. That\'s all I\'ll say about it. For now.']
  ] },
  { if: 'rel:MARA<=DISTRUSTED', then: [
    ['MARA', 'At the rail. Cool and distant, a bag already packed.', 'You were right about the evidence. You were wrong about me. I don\'t think I\'ll ever stop thinking about both.'],
    ['ASH', 'Quiet.', 'Where will you go?'],
    ['MARA', 'Flat. Not unkind.', 'Somewhere that isn\'t a mess you chose not to ask me about.']
  ] }
]);

/* ------------------------------ ENDING B: TAKE THE MONEY ------------------------------ */
scene('M09', 'EPI_B1', { via: 'radio', who: 'SLOANE', unfiltered: true, pri: 4 }, [
  ['SLOANE', 'The radio ad again, ever so slightly changed. Gentle, wry, satisfied.', 'Port Alder is changing. Alder Point: a waterfront for everyone. Now open to the public. Sloane Development. Building what comes next.'],
  ['HOST', 'Flat. A man who knows what he is selling and has decided not to say it.', 'Sloane Development, everybody. Building what comes next. We\'ll be right back after this word from a sponsor, which is also Sloane Development.']
]);
scene('M09', 'EPI_B2', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'The garage door half down. The sign over it is still the old one. He is cleaning a wrench he doesn\'t need to clean.', 'You\'re leaving.'],
  ['ASH', 'Quiet.', 'I have a place in a high building. A car. A job nobody can explain.'],
  ['EDDIE', 'Looks at the floor.', 'You had the chance to say my brother\'s name out loud, in front of the whole city. And you took the money.'],
  ['ASH', 'Honest, exhausted.', 'I know.'],
  ['EDDIE', 'Quiet. A different voice entirely: the one for people he has stopped expecting anything from.', 'The room\'s empty. I\'ll leave the window open in case you ever want to climb back in.']
]);
scene('M09', 'EPI_B3', { via: 'direct', cast: ['ASH'], at: 'place:tower' }, [
  ['ASH', 'Alone at a very high window. The city spread out below like a light fixture. A voice that has stopped fighting.', 'It\'s a beautiful view.'],
  ['ASH', 'Barely there.', 'I don\'t know why I can\'t stop thinking about the sign on the garage.'],
  { if: 'flag:darius_free', then: [
    ['ASH', 'Flat.', 'Darius got out of town. Sloane\'s lawyers made sure of it. I used to think I was the only person in this city who could say no.']
  ] },
  ['ASH', 'A tired breath. The title of the story, said aloud for the first time.', 'There was an exit. I think I drove past it.']
]);

/* ------------------------------ ENDING C: BURN IT ALL ------------------------------ */
scene('M09', 'EPI_C1', { via: 'radio', who: 'HOST', unfiltered: true, pri: 4 }, [
  ['HOST', 'Raw, hushed, broadcasting while something terrible is still happening. No jokes.', 'This is Alder FM. Emergency crews are at the Port Alder container yard, where a fire has spread across the northern berths. Authorities believe that documents relating to the Alder Point project were among the material destroyed.'],
  ['HOST', 'A beat of dead air.', 'Victor Sloane\'s office has issued a statement. It says only: "We are deeply saddened."']
]);
scene('M09', 'EPI_C2', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Standing in the door of the garage as sirens carry across the city. He is holding an envelope. He does not look surprised.', 'You didn\'t keep a copy.'],
  ['ASH', 'Quiet.', 'No.'],
  ['EDDIE', 'A long, soft silence.', 'Danny would\'ve liked the fire. He never could stand a ledger.'],
  ['EDDIE', 'Barely audible.', 'I\'d have liked to hear his name, though. Once. In a room full of people. Out loud.'],
  ['ASH', 'Quiet.', 'I\'m sorry.'],
  ['EDDIE', 'A small, honest nod. It does not forgive and it does not condemn.', 'I know. Go on. Before they ask who lit it.']
]);
scene('M09', 'EPI_C3', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:jetty' }, [
  { if: 'rel:MARA>=TRUSTED', then: [
    ['MARA', 'Behind the wheel of her car at the end of the East Jetty, engine running. She has Mateo in the back seat, asleep. She grins when she sees Ash, a flash of the old Mara.', 'The tank\'s full. I\'ve got a map and a very tired brother. Get in or don\'t, but you\'ve got about eleven seconds.'],
    ['ASH', 'Quiet. A first, real smile.', 'Where are we going?'],
    ['MARA', 'Easy.', 'Anywhere that isn\'t here.']
  ] },
  { if: 'rel:MARA<TRUSTED', then: [
    ['MARA', 'At the jetty, her car already loaded. Mateo sits in the back seat, pretending not to listen. Very cool.', 'You burned everything. The whole thing. I want you to know I understand why. I also want you to know I\'m not coming with you.'],
    ['ASH', 'Quiet.', 'I wouldn\'t ask.'],
    ['MARA', 'A tight, honest half smile.', 'That\'s the nicest thing you\'ve ever said.']
  ] },
  ['ASH', 'On the quay, watching the glow on the water. Low.', 'Last exit.']
]);

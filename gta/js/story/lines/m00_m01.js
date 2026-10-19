// PROLOGUE and MISSION 1. Direction strings are for the voice actor only; they are never shown or spoken.
import { scene } from '../dialogue.js';

/* ------------------------------ PROLOGUE: ARRIVAL ------------------------------ */
scene('M00', 'VOICEMAIL', { via: 'phone', who: 'DALE' }, [
  ['DALE', 'Breezy, not sorry at all. Voicemail energy.', 'Hey, it\'s Dale, about the room on Cedar. So, little bit of news. My cousin showed up this morning with cash in hand and, you know how it is, first come, first served.'],
  ['DALE', 'Bright and fast, getting ahead of the complaint.', 'Your deposit? That\'s a non-refundable retainer. It says so in the text I sent. Which you didn\'t read, because nobody reads them.'],
  ['DALE', 'Throwing a crumb. Quick and vague.', 'If you need work, try Vale Auto, over on Third. Eddie\'s always short a pair of hands. Say Dale sent you. Actually, don\'t. Just say you can drive. Good luck out there!']
]);
scene('M00', 'REACT', { via: 'car', skip: true }, [
  ['ASH', 'Flat, tired, almost amused at how bad this is.', 'Non-refundable. Of course it is.'],
  ['ASH', 'Talking to the dashboard. Counting.', 'Thirty-eight dollars, a car that shudders on left turns, and a garage on Third. Fine. Third it is.']
]);
scene('M00', 'RADIO', { via: 'radio', who: 'HOST', unfiltered: true }, [
  ['HOST', 'Big warm radio voice, mid-sentence, selling the city.', '...and if you\'re just coming in off the coast road, welcome to Port Alder. Population: big. Parking: small. This is Marty Quill on Alder FM, and it is a very good evening to be somewhere else, or here, I guess. Here is fine.'],
  ['HOST', 'Mock-serious.', 'Traffic: the Harbor Bridge is moving. The highway is what we politely call "a conversation." If you\'re headed through the port, the gate guys are checking paperwork twice, so bring a book.'],
  ['SLOANE', 'Calm, polished radio-ad voice. Warm, never salesy.', 'Port Alder is changing. Alder Point: a waterfront for everyone. Jobs, homes, and a skyline we can all be proud of. Sloane Development. Building what comes next.'],
  ['HOST', 'Back to breezy, a little dry about the ad.', 'Sloane Development, everybody. Building what comes next, and demolishing what came before, but they don\'t put that on the radio. Here\'s something from a band that definitely doesn\'t exist.']
]);
scene('M00', 'EDDIE', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Muffled, half under a hood. Not looking up. Deadpan.', 'We\'re closed.'],
  ['ASH', 'Level. A little too tired to be polite.', 'The door\'s open.'],
  ['EDDIE', 'Dry, patient, like he has explained this before.', 'The door\'s always open. It\'s the sign that lies. Sign says "closed" so people who want a quote go away. You want a quote?'],
  ['ASH', 'Plain.', 'Dale sent me. He said you might need a driver.'],
  ['EDDIE', 'A beat of silence. Surfaces slowly from under the hood.', 'Dale.'],
  ['EDDIE', 'Wiping his hands on a rag. Faintly amused, faintly pained.', 'Dale owes me three hundred dollars and a transmission. When Dale starts sending people, he\'s either dying or desperate.'],
  ['ASH', 'Deadpan back.', 'He sold my room twice. So, desperate.'],
  ['EDDIE', 'Finally looks at Ash. A small, dry exhale that is almost a laugh.', 'Yeah. That sounds like Dale.']
]);

/* ------------------------------ MISSION 1: A NEW START ------------------------------ */
scene('M01', 'GARAGE', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Dry humour, distracted, pretending not to care.', 'You look like somebody who could use a job. Lucky for you, I have a truck that needs driving.'],
  ['ASH', 'Careful. Not wanting to sound desperate.', 'What\'s the catch?'],
  ['EDDIE', 'Mild. He means it.', 'No catch. My usual guy didn\'t show up. He does that. I have a pickup that needs to be at the docks in the next hour, and I have a waiting list of exactly nobody.'],
  ['ASH', 'Practical.', 'How much?'],
  ['EDDIE', 'Names a figure the way you\'d name a weather report.', 'Two hundred. Cash, when you get back. The blue pickup, out front. Keys are in it, because if somebody steals it, it\'s the most useful thing that ever happened to me.'],
  ['EDDIE', 'Looks at Ash properly for the first time.', 'I\'m Eddie. Vale. It\'s on the sign, which is the only reason anybody gets it right.'],
  ['ASH', 'A beat. Then offering the name.', 'Ash.'],
  ['EDDIE', 'Slight eyebrow, accepting.', 'Just Ash.'],
  ['ASH', 'Not unfriendly. A closed door with a polite note on it.', 'For now.'],
  ['EDDIE', 'Lets it go, which is a kindness. Back to business.', 'Fine. For now. Take it to the docks, find a man named Walt Pruitt, hand him the truck and the paperwork on the seat. Don\'t scratch it. Don\'t talk about the weather. Walt hates the weather.']
]);
scene('M01', 'TRUCK', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Gesturing at the pickup with a wrench. Lightly mocking his own work.', 'She\'s older than she looks and louder than she should be. Brake pedal is honest. Horn is a liar.'],
  ['ASH', 'Walking around it. A little impressed in spite of themselves.', 'Somebody put a lot of work into this.'],
  ['EDDIE', 'The smallest hitch, then covered.', 'Somebody did. Get in. Seat\'s a little forward. You\'ll live.']
]);
scene('M01', 'CALL', { via: 'phone', who: 'EDDIE' }, [
  ['EDDIE', 'On the phone, distracted, clanking in the background.', 'Ash. Eddie. Quick thing: Walt\'s picky. Be polite, hand over the truck, get the signature. And if he asks you anything about the truck, you don\'t know anything.'],
  ['EDDIE', 'Adding it as a joke, hoping it lands as one.', 'Which, to be fair, you don\'t. So that part should be easy.']
]);
scene('M01', 'DOCKS', { via: 'direct', cast: ['WALT', 'ASH'], at: 'place:docks' }, [
  ['WALT', 'Gruff, suspicious, a man who has been burned by new faces.', 'You\'re not Tony.'],
  ['ASH', 'Neutral.', 'Tony didn\'t show up. I\'m Ash. I\'m delivering the truck for Eddie.'],
  ['WALT', 'Walking slowly around the pickup, looking at the tailgate.', 'Hm.'],
  ['WALT', 'Careful. Pretending it\'s a casual question and failing.', 'Who had it before Eddie got it? Before the paint.'],
  ['ASH', 'Honestly puzzled.', 'I don\'t know. I met Eddie ten minutes ago.'],
  ['WALT', 'Crouching, thumb on the tailgate where something should be.', 'There was a dent here. Shaped like a boot. Big man kicked it, one night, over a gate that wouldn\'t open. You see a boot dent?'],
  ['ASH', 'Looks.', 'No. It\'s smooth.'],
  ['WALT', 'Quiet. He stands, and he does not like what he is thinking.', 'Huh. Somebody fixed a lot of things on this truck.'],
  ['WALT', 'Signs the paper without reading it. Low, like he regrets saying anything.', 'Tell Eddie thanks. Don\'t tell him I asked about the dent. It ain\'t my business.']
]);
scene('M01', 'RETURN', { via: 'direct', cast: ['EDDIE', 'ASH'], at: 'place:garage' }, [
  ['EDDIE', 'Glancing up from a clipboard. Dry.', 'Still got the truck? No. Walt\'s got the truck. You still have both arms. That\'s a good first day.'],
  ['ASH', 'Hands over the signed paper. Watching Eddie.', 'He asked about the previous owner. And a dent in the tailgate.'],
  ['EDDIE', 'A fraction too quick. Light and dismissive.', 'Walt asks everyone about everything. He once asked me where my shoes came from. It\'s a lonely port.'],
  ['ASH', 'Not pushing. Filing it away.', 'Sure.'],
  ['EDDIE', 'Counts out the cash and puts it on the bench, not in Ash\'s hand.', 'Two hundred. Take it. And a piece of advice, free, which is the only kind I give: this city is full of strange people. Most of them are just lonely. A few of them are not. You don\'t need to know which is which, you need to not ask.'],
  ['ASH', 'Taking the money. Dry.', 'That\'s a lot of advice for free.'],
  ['EDDIE', 'Quiet, almost shy. Looking at the clipboard instead of Ash.', 'Where are you sleeping tonight?'],
  ['ASH', 'The truth, but light.', 'The car. Possibly.'],
  ['EDDIE', 'Gruff. Pretending it\'s business.', 'There\'s a room out back. Cot, hot plate, a window that doesn\'t close. It\'s not charity. I need somebody to keep an eye on the place at night, and I\'m too cheap to hire anybody I\'d have to like.'],
  ['ASH', 'Genuinely moved, and hiding it.', 'Thank you.'],
  ['EDDIE', 'Waves it off without turning around.', 'Don\'t thank me. Thank the window. It lets in the cold, so you\'ll want to be tough.']
]);
scene('M01', 'TEXT', { via: 'phone', who: 'JOJO', as: 'Unknown number', pri: 2 }, [
  ['JOJO', 'Voice message. Nervous, trying to sound relaxed and failing a little.', 'Hey. You don\'t know me. Somebody I work for heard Eddie\'s got a new driver who doesn\'t crash. Pays three times what Eddie pays. Talk to Eddie about it. He knows who I mean. Don\'t, uh, don\'t tell him I said that.']
]);

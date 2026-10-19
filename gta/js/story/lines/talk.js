// HARBOR AM 1190: THE DEAD AIR HOUR. A late-night talk show nobody asked for: Duke Pelletier (host), Rollo Teague (the camera guy) and
// Mags Fenwick (producer, screener, sound desk and every caller). It reacts to what is happening in the story, never shows it, and gets
// most of it wrong in a way that is almost right. The jokes are about absurdity, not about anyone's real-world identity.
import { scene } from '../dialogue.js';
const R = (name, steps, o) => scene('X02', name, Object.assign({ via: 'radio', who: 'DUKE', unfiltered: true, pri: 1 }, o || {}), steps);

R('OPEN', [
  ['DUKE', 'Rolling, gravelly, delighted with himself. A man who has been awake for thirty hours and considers it a talent.', 'You are listening to Harbor AM eleven-ninety, the Dead Air Hour, where the dead air is the content and the content is, frankly, also dead. I\'m Duke Pelletier. It\'s a beautiful night in Port Alder, I\'m told. I haven\'t been outside since Tuesday.'],
  ['ROLLO', 'Flat. Does not look up from whatever he is eating.', 'It\'s Thursday.'],
  ['DUKE', 'Not even slowed down.', 'Rollo is our camera guy. Say hello to the camera, Rollo.'],
  ['ROLLO', 'A long pause.', 'No.'],
  ['DUKE', 'Warm.', 'Great energy. Rollo films this show for the video stream. We have four viewers.'],
  ['MAGS', 'Brisk, the voice of someone with three other jobs. Typing as she talks.', 'Two are me. One is my other phone.'],
  ['DUKE', 'Grave.', 'And one is a man in Duluth who I believe is lost.'],
  ['MAGS', 'Reading off a screen.', 'He left a comment. It says "where is this."'],
  ['DUKE', 'Leaning into the mic, tender, as if to the man himself.', 'Everybody\'s asking, Duluth. Everybody\'s asking.']
]);

R('GULL', [
  ['DUKE', 'Wounded. A man about to explain a grudge.', 'Quick personal update. This morning on the quay, a seagull took my entire sandwich. Not a bite. The sandwich, the wax paper, my dignity.'],
  ['ROLLO', 'Dry.', 'You fed him a chip first.'],
  ['DUKE', 'Offended, rising.', 'I extended a hand of friendship, Rollo, and he responded with a hostile takeover.'],
  ['MAGS', 'Not looking up.', 'The harbor commission says gulls are "a protected local community." So technically you owe him.'],
  ['DUKE', 'Stunned, slow.', 'I owe a bird. Folks, sit with that. I sat with it for six hours, and I came out the other side a changed man. No. Same man. Angrier at bread.'],
  ['ROLLO', 'Flat.', 'He\'s been filing paperwork.'],
  ['DUKE', 'Proud and furious.', 'Form eleven-B, "Complaint Against Wildlife With A Union." They\'re represented, folks. They have a rep. His name is Gerald. He is also a gull.'],
  ['MAGS', 'Without conviction.', 'That\'s not confirmed.'],
  ['DUKE', 'Hushed.', 'He looked at me like a man who bills by the hour.']
]);

R('FOG', [
  ['DUKE', 'Booming, scandalised.', 'Now, the city council, bless their laminated hearts, is floating a fog tax.'],
  ['MAGS', 'Correcting, bored.', 'A fog assessment fee.'],
  ['DUKE', 'Waving it off.', 'Fee, tax, fog. Same shape. Residents who "benefit from fog" will pay eleven dollars a month.'],
  ['ROLLO', 'Genuinely curious, for him.', 'What\'s the benefit?'],
  ['DUKE', 'Counting on his fingers.', 'Ambience. Mystery. Plausible deniability when you miss your exit. Councilman Tibbets says fog is, quote, "a municipal asset we\'ve been giving away for free."'],
  ['MAGS', 'Flat.', 'He also said that about Tuesdays.'],
  ['DUKE', 'Pointing at the ceiling.', 'You want to tax weather, Tibbets, start with the weather you caused. The rain that fell on my toast. Billing department, are you there.'],
  ['ROLLO', 'Quiet.', 'There\'s no billing department. It\'s a drawer.'],
  ['DUKE', 'A beat. Then, with full resolve.', 'Then we\'re taxing the drawer.']
]);

R('WHEEL', [
  ['DUKE', 'Lowering his voice to a stage whisper that is louder than his normal voice.', 'Listener theory of the week. The Harbor Wheel. Is it a ride? Or is it, and I\'m just asking questions, a very slow antenna?'],
  ['MAGS', 'Patient.', 'It\'s a ride. I\'ve been on it.'],
  ['DUKE', 'Pouncing.', 'Were you looking at the city, Mags, or was the city looking at you?'],
  ['MAGS', 'Deadpan.', 'I was eating a pretzel.'],
  ['DUKE', 'Triumphant.', 'That\'s what they WANT you to be doing.'],
  ['ROLLO', 'Flat, from behind the camera.', 'The pretzel guy is the same guy who runs the wheel.'],
  ['DUKE', 'Astonished, delighted.', 'Rollo. Rollo, that is a conspiracy with a MENU. Mags, put that on a mug.'],
  ['MAGS', 'Typing.', 'We don\'t have mugs.'],
  ['DUKE', 'Resolute.', 'We have a wheel and we have a pretzel. We\'re a brand.']
]);

R('CALLER', [
  ['MAGS', 'Bright, professional, the studio voice.', 'Line two, we have Lorraine from Cedar Street.'],
  ['MAGS', 'Now an extremely unconvincing high, quavering older lady. She is clearly doing a voice and is not trying very hard.', 'Hi, Duke, long-time listener, first-time caller.'],
  ['DUKE', 'Slowly, suspicious.', 'Lorraine. You sound exactly like Mags.'],
  ['MAGS', 'Back to herself, instantly.', 'It\'s a very bad line.'],
  ['DUKE', 'Generous.', 'Lorraine, what\'s on your mind tonight?'],
  ['MAGS', 'The voice again, a little too close to the mic.', 'I just think pigeons should have to carry ID.'],
  ['DUKE', 'Moved.', 'Controversial. Bold. Lorraine, you are a brave woman, and a possibly invented one.'],
  ['ROLLO', 'Flat.', 'Her number is the studio number.'],
  ['DUKE', 'Pressing on, regal.', 'Lorraine, hold, please. ... We lost Lorraine. She\'s gone where all the good callers go. The other line.']
]);

R('SPONSOR', [
  ['DUKE', 'The golden, trusted voice of a man reading something he has never read before.', 'This segment is brought to you by Gulliver\'s Discount Mattresses. Do you sleep? Gulliver\'s has a mattress for that. Do you not sleep? Gulliver\'s has a mattress for THAT.'],
  ['MAGS', 'Reading from a card.', 'Legal wants me to say they\'re "previously enjoyed."'],
  ['DUKE', 'Appalled.', 'Enjoyed by WHO, Mags? That is a love story I did not ask for.'],
  ['ROLLO', 'Dry.', 'Mine has a water stain shaped like Ohio.'],
  ['DUKE', 'Triumphant.', 'That\'s not a flaw, that\'s a feature. Gulliver\'s. Lie Down Somewhere. Offer not valid in fog.']
]);

R('ROOM', [
  ['DUKE', 'Gleeful, the way a man is when a story contains a villain he can pronounce.', 'Housing news. A landlord on Cedar Street named Dale rented the same room to two different people. And a cousin.'],
  ['MAGS', 'Reading from a screen.', 'He\'s calling it, quote, "a hybrid arrangement."'],
  ['DUKE', 'Wheezing.', 'A hybrid arrangement. It\'s a room, Dale! It\'s a room with three people in it and a lie!'],
  ['ROLLO', 'Flat.', 'I\'ve been in that room. It has a very strong opinion about itself.'],
  ['DUKE', 'Fond.', 'Port Alder real estate, folks. If you can find it, you can lose it to a cousin.']
], { if: 'done:M00' });

R('TRUCKS', [
  ['DUKE', 'Conspiratorial.', 'Listener mail. A caller points out there are far too many grey sedans in Port Alder. Not variety. Not color. Sedans, grey.'],
  ['MAGS', 'Shrugging audibly.', 'It\'s the most common car.'],
  ['DUKE', 'A man cracking open a case.', 'Is it? Or is it ONE car, in a trench coat, going around very fast?'],
  ['ROLLO', 'Quiet.', 'Cars don\'t wear trench coats.'],
  ['DUKE', 'Delighted.', 'That is exactly what the car wants you to say.'],
  ['MAGS', 'Scrolling.', 'Another caller says a plate near the King Haulage depot ends in four-four-seven-one.'],
  ['DUKE', 'Rubbing his temples.', 'Four-four-seven-one. That\'s twice this week. That is either a clue or my birthday.'],
  ['ROLLO', 'Flat.', 'It\'s not your birthday.'],
  ['DUKE', 'Pointing, victorious.', 'Then it\'s a clue!']
], { if: 'done:M02 && !done:M05' });

R('WAREHOUSE', [
  ['DUKE', 'Newsreader voice, badly worn.', 'Breaking news. Which I am legally required to say is not breaking, it\'s lightly cracking. Port police responded to a silent alarm at the Port Warehouse complex in ninety seconds.'],
  ['MAGS', 'Reading it again, in case it was a typo.', 'Ninety.'],
  ['DUKE', 'Rising.', 'Ninety seconds! Folks, these are the same officers who took forty minutes to find a parade. A PARADE. It had a float.'],
  ['ROLLO', 'Flat.', 'It was on a bridge. It was a hard parade to find.'],
  ['DUKE', 'Thoughtful, dangerous.', 'My theory: the alarm called the police itself. From the inside. Smart alarm. Woke up one morning, felt something, dialed.'],
  ['MAGS', 'Mild.', 'Or somebody phoned it in before anyone got there.'],
  ['DUKE', 'Pained.', 'Mags. You can\'t just say normal things. We have a format.'],
  ['ROLLO', 'Reading from his phone.', 'The container number\'s on the news. P-A-C, four-four-seven-one.'],
  ['DUKE', 'Gasping, thrilled.', 'Four-four-seven-one. Which is also my locker at the Y, which I will now be checking, with a flashlight and a lawyer.']
], { if: 'done:M03 && !done:M06' });

R('BADGE', [
  ['DUKE', 'Hushed, enjoying himself terribly.', 'A source inside the department, whom I\'ll call Cheryl, because that is her name, tells me one of our detectives has been "writing his own incident reports."'],
  ['MAGS', 'Without looking up.', 'That\'s most of them.'],
  ['DUKE', 'Ignoring her.', 'Cheryl says this fella talks like a terms-and-conditions page. "Let\'s be precise." Folks, anyone who says "let\'s be precise" at a party has never once been invited back.'],
  ['ROLLO', 'Flat.', 'I\'ve heard him at the diner. He asked for the salt in a subordinate clause.'],
  ['DUKE', 'Reverent.', 'That\'s not a man. That is a rider on a contract. Rollo, you\'ve said more tonight than you have since the fish thing.'],
  ['ROLLO', 'Instantly, quietly alarmed.', 'I don\'t want to talk about the fish thing.'],
  ['DUKE', 'Solemn.', 'We will never talk about the fish thing.'],
  ['MAGS', 'Typing.', 'The fish thing is in the archive.'],
  ['DUKE', 'Instantly.', 'Burn the archive.']
], { if: 'done:M05 && !done:M09' });

R('ALDERPOINT', [
  ['DUKE', 'Rolling out the name like a man ordering wine in a haunted house.', 'Alder Point. "A waterfront for everyone." Mr. Victor Sloane, who sounds like a man you\'d meet in a very expensive elevator, says it\'s for everyone.'],
  ['MAGS', 'Dry.', 'Everyone who can afford the fence.'],
  ['DUKE', 'Warming up.', 'Wharf Street gets "relocated," which is a word that means "a van arrives." Lucille at the corner mart has been selling milk on that street since before you could legally own a sandwich.'],
  ['ROLLO', 'Quietly, for once, not joking.', 'Thirty years.'],
  ['DUKE', 'Indignant.', 'And Sloane sends her an ENVELOPE. You know who sends envelopes? Villains and grandmas. And my grandmother was not a villain.'],
  ['MAGS', 'Flat.', 'She once bit a priest.'],
  ['DUKE', 'Pointing at her.', 'Over a casserole. Context matters, Mags.'],
  ['ROLLO', 'Dry.', 'I toured the site. They have a mascot. It\'s a lighthouse with arms.'],
  ['DUKE', 'Whispering, truly frightened.', 'A lighthouse with arms. That\'s not a development. That is a warning.']
], { if: 'done:M06 && !done:M09' });

R('CARPARK', [
  ['DUKE', 'Reporting, magisterial.', 'Update from the public car park, where last night a gathering of gentlemen in matching dark sedans "discussed parking." Witnesses describe it as the most coordinated thing to happen in a car park since never.'],
  ['MAGS', 'Reading.', 'Three cars left at once.'],
  ['DUKE', 'Ecstatic.', 'IN UNISON, Mags. They signalled. That\'s not crime, that\'s choreography. I want to see the dance.'],
  ['ROLLO', 'Flat.', 'I have footage. It\'s dark. There\'s a lot of shouting about a spot.'],
  ['DUKE', 'Reverent.', 'A spot! Folks, that\'s the oldest war in the world. "That\'s my spot." They\'ve been doing it since the Romans.'],
  ['MAGS', 'Reading from the report.', 'Police say the cars left at "speeds unsuitable for a car park."'],
  ['DUKE', 'Honestly curious.', 'What\'s suitable for a car park, Mags? Four? Five? A brisk shuffle?'],
  ['MAGS', 'Gravely.', 'A brisk shuffle, yes.'],
  ['DUKE', 'Chastened.', 'Then I stand corrected. I\'ve been driving like a man in a hurry for years.']
], { if: 'done:M07 && !done:M09' });

R('LIGHTHOUSE', [
  ['DUKE', 'Newsreader again, but warmer.', 'Shots reported at North Point Lighthouse last night. Residents describe "a significant amount of noise and one unusually motivated seagull."'],
  ['ROLLO', 'Flat.', 'Gerald.'],
  ['MAGS', 'Reading.', 'The lighthouse keepers\' union says the light "stayed on throughout, as per contract."'],
  ['DUKE', 'Moved.', 'Union professionals. Bullets flying, light stays on. That is the dedication I want in a plumber.'],
  ['ROLLO', 'Looking at the photo.', 'There\'s a thermos on the step.'],
  ['DUKE', 'Quietly.', 'There\'s always a thermos.'],
  { if: 'flag:walt_alive', then: [
    ['MAGS', 'Reading.', 'The dockworker who was out there is reportedly fine. He asked for a blanket and a sandwich.'],
    ['DUKE', 'Rolling again, warm, relieved.', 'Good. Good! Somebody give that man a sandwich. Not a gull.'],
    ['ROLLO', 'Flat, but pleased.', 'Not a gull.']
  ], else: [
    ['DUKE', 'Quiet. The act has gone out of him. This is the other man, the one under the show.', 'Rollo. Kill the sound effects.'],
    ['ROLLO', 'Quietly.', 'They\'re off.'],
    ['DUKE', 'Slow.', 'There was a man out there. A dockworker. Folks, I make jokes about this city. The fog, the pigeons, the councilmen. And I\'ll keep making them, because that is the job. But a man who kept a logbook for twenty years and did the right thing late, he is gone. Mags, play the quiet one.'],
    ['MAGS', 'Gently.', 'We don\'t have a quiet one.'],
    ['DUKE', 'After a moment.', 'Then everybody just be quiet. Ten seconds.'],
    { pause: 4 },
    ['DUKE', 'Clearing his throat. Almost himself.', 'Okay. Thank you. We\'ll be right back.']
  ] }
], { if: 'done:M08 && !done:M09' });

R('END_A', [
  ['DUKE', 'Pounding the desk, vindicated.', 'Folks, the Ledger published the Alder Point investigation. Seven pages. I\'ve read four. The rest are in a font I associate with divorces.'],
  ['MAGS', 'Reading.', 'Warrants for Victor Sloane.'],
  ['DUKE', 'Beaming.', 'And let the record show, I called it. I called it eleven years ago.'],
  ['ROLLO', 'Flat.', 'You called it a shipment of left shoes.'],
  ['DUKE', 'Without missing a beat.', 'It was fraud AND a shipment of left shoes. I contain multitudes.'],
  ['MAGS', 'Quietly impressed.', 'Somebody gave the paper the whole file.'],
  ['DUKE', 'Intimate, to the audience.', 'Whoever you are, listener, you magnificent weirdo, Gulliver\'s will send you a mattress. Previously enjoyed.'],
  ['ROLLO', 'Flat.', 'Nobody wants that prize.'],
  ['DUKE', 'Tender.', 'It\'s the thought, Rollo.']
], { if: 'end:A' });

R('END_B', [
  ['DUKE', 'Mournful, in a velvet way.', 'Alder Point is open to the public. I went. It\'s a fence. With a gift shop. The gift shop sells the fence. In miniature.'],
  ['MAGS', 'Fair.', 'It\'s very nice.'],
  ['DUKE', 'Spreading his hands.', 'It\'s a lovely fence! And the investigation we were all so excited about? Gone. Like a sandwich on a quay.'],
  ['ROLLO', 'Flat.', 'Somebody\'s moved into the tower. High floor. Nobody\'s seen them.'],
  ['DUKE', 'Wistful.', 'Rich, mysterious, and I bet he owns a robe. I envy him with the part of me that\'s a coward.'],
  ['MAGS', 'Gently.', 'You said you\'d say that at the end of the show.'],
  ['DUKE', 'Serene.', 'I\'m saying it at the beginning. Now I\'m free.']
], { if: 'end:B' });

R('END_C', [
  ['DUKE', 'Over the sound of a distant siren he is clearly enjoying.', 'The container yard fire is still going. The mayor calls it "a learning opportunity." The insurance companies call it "a bigger learning opportunity."'],
  ['ROLLO', 'Flat.', 'I filmed it.'],
  ['DUKE', 'Flat, delighted.', 'Of course you did.'],
  ['ROLLO', 'Quietly proud.', 'It\'s very good footage. There\'s a seagull in it.'],
  ['DUKE', 'Electrified.', 'Is it Gerald?'],
  ['ROLLO', 'Flat.', 'It\'s carrying something. Could be a sandwich. Could be paperwork.'],
  ['DUKE', 'On his feet.', 'Gerald has the evidence! Rollo, zoom in! GERALD HAS THE EVIDENCE!'],
  ['MAGS', 'Quietly.', 'He ate it.'],
  ['DUKE', 'Sinking back, a man at peace with the universe.', 'Of course he did. He\'s represented.']
], { if: 'end:C' });

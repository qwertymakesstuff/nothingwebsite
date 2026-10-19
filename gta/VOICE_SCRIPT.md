# LAST EXIT: master voice script

Every line of spoken dialogue in the game, by character, with its ID, performance direction and where it is heard. **No line is recorded yet** unless the manifest says so; the game is fully playable with subtitles only.

Lines: **692** across **16** characters. Recorded so far: **0** of 692.

## How to deliver recordings

- One file per line, named exactly after the line ID: `gta/voice/<CHARACTER>/<LINE_ID>.ogg` (Ogg Vorbis, mono, 44.1 kHz, about -16 LUFS, peaks under -1 dBFS). `.mp3` is also accepted.
- Record **dry**: no reverb, no added room tone. The game adds the phone/radio filter itself where a line is marked **filtered**.
- Leave about 0.2 s of silence at the start and end of each file; trim the rest.
- Read only the **spoken text**. The *direction* is for you and is never shown to the player.
- After adding files run `node gta/tools/voice.mjs`, which marks them in `gta/voice/manifest.json`. The game then plays them automatically.
- Test any single line in the game: pause, open "test a line of dialogue", type the line ID.

## Characters

| Character | Role | Lines | Words | About |
|---|---|---:|---:|---|
| Ash (`ASH`) | protagonist | 223 | 1666 | 11 min |
| Eddie Vale (`EDDIE`) | the mechanic | 91 | 1527 | 10 min |
| Mara Cruz (`MARA`) | the getaway driver | 160 | 2434 | 16 min |
| Detective Rowan (`ROWAN`) | the compromised detective | 33 | 626 | 4 min |
| Victor Sloane (`SLOANE`) | the developer | 25 | 490 | 3 min |
| Darius King (`DARIUS`) | the local boss | 43 | 771 | 5 min |
| Walt Pruitt (`WALT`) | the dockworker | 26 | 359 | 2 min |
| Lucille Ng (`LUCILLE`) | the shop owner | 20 | 366 | 2 min |
| Officer Dana Whitfield (`DANA`) | the honest officer | 11 | 233 | 1 min |
| Jojo Baptiste (`JOJO`) | a member of Darius's crew | 21 | 360 | 2 min |
| Mateo Cruz (`MATEO`) | Mara's younger brother | 7 | 81 | 1 min |
| Priya Nair (`PRIYA`) | the journalist | 10 | 207 | 1 min |
| Dale Pruitt-Moss (landlord) (`DALE`) | landlord (voicemail only) | 3 | 87 | 1 min |
| Marty Quill (radio host) (`HOST`) | radio host, Alder FM | 14 | 356 | 2 min |
| Police dispatcher (`DISPATCH`) | police radio | 2 | 32 | 0 min |
| Depot guard (`GUARD`) | guard at Darius's depot | 3 | 7 | 0 min |

## Ash (`ASH`)

**Role:** protagonist  
**Voice:** Adult, gender-neutral casting; any actor can play Ash. Tired, observant, a dry streak that grows as they gain footing.  
**Direction:** Understated. Think out loud, never shout. Humour comes from tiredness, not from jokes.  
**Accent:** Neutral American; no regional markers.  
**Pace:** Medium, slightly slower than the other leads.  
**Range:** Low to medium. Anger shows as stillness.  
**Recording notes:** Close mic, dry. Record every option of a choice even if it is rarely picked.

**Who they are:** Arrives in Port Alder at dusk with a cheap car, $38 and no connections. The past is left deliberately vague so the player can shape it through choices.

**Wants:** Get on their feet. Find out whether a person can leave a bad life behind.  
**Fears:** That they are exactly the person Port Alder will make them.  
**Hides:** Why they left wherever they came from.  
**Arc:** Arrives with nothing to lose and learns that every favour has a price. By the end Ash has chosen what kind of person Port Alder gets: a witness, a profiteer, or a fire.

223 lines, 1666 words.

### D01_DONE
*D01_COLLECTIONS; heard face to face*

- `ASH_D01_DONE_001`  
  *Direction:* Dry.  
  **Say:** What are they for?

- `ASH_D01_DONE_002`  
  *Direction:* Quiet.  
  **Say:** From who?

### D02_DONE
*D02_BORROWED_CAR; heard face to face*

- `ASH_D02_DONE_001`  
  *Direction:* Dry.  
  **Say:** I deliver brakes. I don't fix them.

### D03_JOJO
*D03_JOJOS_QUESTION; heard face to face*

- `ASH_D03_JOJO_001`  
  *Direction:* Quiet.  
  **Say:** Ask.

- `ASH_D03_JOJO_002`  
  *Direction:* Steady, kind.  
  **Say:** You don't have to tell me anything. But if you want to, I'm not going to repeat it. Not to him, not to anyone.

- `ASH_D03_JOJO_003`  
  *Direction:* Gently. It's not cruelty; it's fear.  
  **Say:** I'd stay out of it. Nobody ever got hurt by not asking.

### E01_ASK
*E01_OLD_TICKETS; heard face to face*

- `ASH_E01_ASK_001`  
  *Direction:* Quiet.  
  **Say:** I won't.

- `ASH_E01_ASK_002`  
  *Direction:* Gentle.  
  **Say:** I'll bring it back.

### E01_BACK
*E01_OLD_TICKETS; heard face to face*

- `ASH_E01_BACK_001`  
  *Direction:* Quiet.  
  **Say:** You didn't know it was the last time.

### E01_UNIT
*E01_OLD_TICKETS; heard in the car*

- `ASH_E01_UNIT_001`  
  *Direction:* Alone in a dusty storage unit. Light finger on a taped box.  
  **Say:** The box that doesn't say taxes.

- `ASH_E01_UNIT_002`  
  *Direction:* Reading, slowly, a small, human laugh at the margin notes.  
  **Say:** "Eddie is wrong. Again." "Eddie is wrong, but he is right about the brakes." This is Danny's handwriting.

- `ASH_E01_UNIT_003`  
  *Direction:* Quieter. Turning to the last ticket.  
  **Say:** "Berth Nine. Pickup 11 PM. Do NOT put the date on it. E. says it's a bad idea. It is." And a name. Not a name. Initials. R.

### E02_DRIVE
*E02_DANNYS_TRUCK; heard over the phone, **filtered** (record dry)*

- `ASH_E02_DRIVE_001`  
  *Direction:* Dry, warm.  
  **Say:** Like she has opinions.

### E02_WALT
*E02_DANNYS_TRUCK; heard face to face*

- `ASH_E02_WALT_001`  
  *Direction:* Gentle.  
  **Say:** Why did you keep it?

### E03_LUCILLE
*E03_SOMEONE_WHO_KNEW_HIM; heard face to face*

- `ASH_E03_LUCILLE_001`  
  *Direction:* Smiling a little.  
  **Say:** What was the joke?

- `ASH_E03_LUCILLE_002`  
  *Direction:* Quiet.  
  **Say:** I will.

### E03_PIER
*E03_SOMEONE_WHO_KNEW_HIM; heard face to face*

- `ASH_E03_PIER_001`  
  *Direction:* Quiet.  
  **Say:** Lucille said it's not your fault.

### H01_EDDIE2
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H01_EDDIE2_001`  
  *Direction:* Dry.  
  **Say:** I was going to ask for a wrench.

### H01_EDDIE3
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H01_EDDIE3_001`  
  *Direction:* Light.  
  **Say:** I like the window.

### H01_EDDIE4
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H01_EDDIE4_001`  
  *Direction:* Careful.  
  **Say:** Different how?

### H01_EDDIE5
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H01_EDDIE5_001`  
  *Direction:* Warm.  
  **Say:** She sounds like Lucille.

### H01_EDDIE6
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H01_EDDIE6_001`  
  *Direction:* Honest.  
  **Say:** Not yet.

### H02_MARA2
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H02_MARA2_001`  
  *Direction:* Dry.  
  **Say:** He looks like a Gerald.

### H02_MARA3
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H02_MARA3_001`  
  *Direction:* Smiling.  
  **Say:** You're making it weird.

### H02_MARA5
*HANGOUT (talk to people in the city); heard face to face*

- `ASH_H02_MARA5_001`  
  *Direction:* Gentle.  
  **Say:** It isn't.

### M00_EDDIE
*M00_ARRIVAL; heard face to face*

- `ASH_M00_EDDIE_001`  
  *Direction:* Level. A little too tired to be polite.  
  **Say:** The door's open.

- `ASH_M00_EDDIE_002`  
  *Direction:* Plain.  
  **Say:** Dale sent me. He said you might need a driver.

- `ASH_M00_EDDIE_003`  
  *Direction:* Deadpan back.  
  **Say:** He sold my room twice. So, desperate.

### M00_REACT
*M00_ARRIVAL; heard in the car*

- `ASH_M00_REACT_001`  
  *Direction:* Flat, tired, almost amused at how bad this is.  
  **Say:** Non-refundable. Of course it is.

- `ASH_M00_REACT_002`  
  *Direction:* Talking to the dashboard. Counting.  
  **Say:** Thirty-eight dollars, a car that shudders on left turns, and a garage on Third. Fine. Third it is.

### M01_DOCKS
*M01_A_NEW_START; heard face to face*

- `ASH_M01_DOCKS_001`  
  *Direction:* Neutral.  
  **Say:** Tony didn't show up. I'm Ash. I'm delivering the truck for Eddie.

- `ASH_M01_DOCKS_002`  
  *Direction:* Honestly puzzled.  
  **Say:** I don't know. I met Eddie ten minutes ago.

- `ASH_M01_DOCKS_003`  
  *Direction:* Looks.  
  **Say:** No. It's smooth.

### M01_GARAGE
*M01_A_NEW_START; heard face to face*

- `ASH_M01_GARAGE_001`  
  *Direction:* Careful. Not wanting to sound desperate.  
  **Say:** What's the catch?

- `ASH_M01_GARAGE_002`  
  *Direction:* Practical.  
  **Say:** How much?

- `ASH_M01_GARAGE_003`  
  *Direction:* A beat. Then offering the name.  
  **Say:** Ash.

- `ASH_M01_GARAGE_004`  
  *Direction:* Not unfriendly. A closed door with a polite note on it.  
  **Say:** For now.

### M01_RETURN
*M01_A_NEW_START; heard face to face*

- `ASH_M01_RETURN_001`  
  *Direction:* Hands over the signed paper. Watching Eddie.  
  **Say:** He asked about the previous owner. And a dent in the tailgate.

- `ASH_M01_RETURN_002`  
  *Direction:* Not pushing. Filing it away.  
  **Say:** Sure.

- `ASH_M01_RETURN_003`  
  *Direction:* Taking the money. Dry.  
  **Say:** That's a lot of advice for free.

- `ASH_M01_RETURN_004`  
  *Direction:* The truth, but light.  
  **Say:** The car. Possibly.

- `ASH_M01_RETURN_005`  
  *Direction:* Genuinely moved, and hiding it.  
  **Say:** Thank you.

### M01_TRUCK
*M01_A_NEW_START; heard face to face*

- `ASH_M01_TRUCK_001`  
  *Direction:* Walking around it. A little impressed in spite of themselves.  
  **Say:** Somebody put a lot of work into this.

### M02_CARPARK
*M02_EASY_MONEY; heard face to face*

- `ASH_M02_CARPARK_001`  
  *Direction:* Leaning in.  
  **Say:** The paperwork?

- `ASH_M02_CARPARK_002`  
  *Direction:* Slowly.  
  **Say:** And which one do you think it is?

- `ASH_M02_CARPARK_003`  
  *Direction:* Honest.  
  **Say:** He said I shouldn't take it.

- `ASH_M02_CARPARK_004`  
  *Direction:* Quiet, a decision.  
  **Say:** Understood.

### M02_DEPOT
*M02_EASY_MONEY; heard face to face*

- `ASH_M02_DEPOT_001`  
  *Direction:* Faintly amused.  
  **Say:** It was fine.

- `ASH_M02_DEPOT_002`  
  *Direction:* Almost smiling despite themselves.  
  **Say:** I won't.

- `ASH_M02_DEPOT_003`  
  *Direction:* Careful. The money is heavy in the hand.  
  **Say:** That's a lot for a car.

### M02_DRIVE
*M02_EASY_MONEY; heard over the phone, **filtered** (record dry)*

- `ASH_M02_DRIVE_001`  
  *Direction:* Over the radio, steady.  
  **Say:** And you know these people.

### M02_MEET
*M02_EASY_MONEY; heard face to face*

- `ASH_M02_MEET_001`  
  *Direction:* Dry.  
  **Say:** I'm told it's a skill.

- `ASH_M02_MEET_002`  
  *Direction:* Careful.  
  **Say:** But it pays.

- `ASH_M02_MEET_003`  
  *Direction:* To Mara, once Eddie is out of earshot.  
  **Say:** Does he always do that?

### M02_POST
*M02_EASY_MONEY; heard face to face*

- `ASH_M02_POST_001`  
  *Direction:* Honest, tired.  
  **Say:** Eight hundred.

- `ASH_M02_POST_002`  
  *Direction:* Gently pushing.  
  **Say:** You know him.

- `ASH_M02_POST_003`  
  *Direction:* Quiet.  
  **Say:** The paperwork on the car didn't match.

### M03_AFTER
*M03_THE_WRONG_PACKAGE; heard over the phone, **filtered** (record dry)*

- `ASH_M03_AFTER_001`  
  *Direction:* Level.  
  **Say:** I did. I'll have it for you tonight.

- `ASH_M03_AFTER_002`  
  *Direction:* Careful, lying with a straight face.  
  **Say:** It wasn't there, Darius. They cleared the rack before I got in.

### M03_ARRIVE
*M03_THE_WRONG_PACKAGE; heard face to face*

- `ASH_M03_ARRIVE_001`  
  *Direction:* Neutral.  
  **Say:** Darius sent me. For a case in Warehouse 14.

- `ASH_M03_ARRIVE_002`  
  *Direction:* Not accepting it.  
  **Say:** He said it was.

- `ASH_M03_ARRIVE_003`  
  *Direction:* Slowly.  
  **Say:** Cleared by who?

- `ASH_M03_ARRIVE_004`  
  *Direction:* Dry. Giving him the out and the push at once.  
  **Say:** It's getting to be everybody's business, Walt.

### M03_CALL
*M03_THE_WRONG_PACKAGE; heard over the phone, **filtered** (record dry)*

- `ASH_M03_CALL_001`  
  *Direction:* Careful.  
  **Say:** And if the case isn't there?

### M03_FOUND
*M03_THE_WRONG_PACKAGE; heard in the car*

- `ASH_M03_FOUND_001`  
  *Direction:* Opening the case. Reading, a little breathless.  
  **Say:** Partial shipping manifest. Handwritten notes. And a company name.

- `ASH_M03_FOUND_002`  
  *Direction:* Slow, reading it off. Unhappy about it.  
  **Say:** Alder Point Development. Consulting fees. Payable to King Haulage.

- `ASH_M03_FOUND_003`  
  *Direction:* Closing the case. Fast, a decision.  
  **Say:** That's not paperwork. That's a rope.

### M03_MARKS
*M03_THE_WRONG_PACKAGE; heard in the car*

- `ASH_M03_MARKS_001`  
  *Direction:* Muttering, crouched by a container, reading it.  
  **Say:** Container tag says PAC-4471.

- `ASH_M03_MARKS_002`  
  *Direction:* A flat, careful read. Quiet thinking aloud.  
  **Say:** Paperwork on the door says Berth Nine. This is not Berth Nine. This container was never supposed to be here.

- `ASH_M03_MARKS_003`  
  *Direction:* Pulling a latch, finding a hard case behind a pallet. Low.  
  **Say:** Okay. Okay, there you are.

### M03_SAFE
*M03_THE_WRONG_PACKAGE; heard face to face*

- `ASH_M03_SAFE_001`  
  *Direction:* Lays the case on the bench. Tired, a bit shaky.  
  **Say:** I found it.

- `ASH_M03_SAFE_002`  
  *Direction:* Watching her.  
  **Say:** You know the name.

- `ASH_M03_SAFE_003`  
  *Direction:* Level.  
  **Say:** You never told me.

- `ASH_M03_SAFE_004`  
  *Direction:* Quiet, a small sting.  
  **Say:** And am I?

- `ASH_M03_SAFE_005`  
  *Direction:* Careful, deciding as they speak.  
  **Say:** He asked for it. I owe him a straight answer, or at least a quiet one.

- `ASH_M03_SAFE_006`  
  *Direction:* Steady, a little guarded.  
  **Say:** I'll hold it. Nobody sees it until I know whose it is.

- `ASH_M03_SAFE_007`  
  *Direction:* Pushing the case across the bench.  
  **Say:** You've been looking for months. It's yours as much as mine.

### M04_DRIVE
*M04_NO_LOOSE_ENDS; heard in the car*

- `ASH_M04_DRIVE_001`  
  *Direction:* Dry.  
  **Say:** Is this a getaway?

### M04_ESCAPE
*M04_NO_LOOSE_ENDS; heard in the car*

- `ASH_M04_ESCAPE_001`  
  *Direction:* Over the engine noise.  
  **Say:** Close.

- `ASH_M04_ESCAPE_002`  
  *Direction:* Level.  
  **Say:** Keep driving.

- `ASH_M04_ESCAPE_003`  
  *Direction:* Quick.  
  **Say:** Two behind, one pulling up on the right.

- `ASH_M04_ESCAPE_004`  
  *Direction:* Tired.  
  **Say:** Eddie's back room.

### M04_MEET
*M04_NO_LOOSE_ENDS; heard face to face*

- `ASH_M04_MEET_001`  
  *Direction:* Dry, keeping their eyes forward.  
  **Say:** You're sure?

- `ASH_M04_MEET_002`  
  *Direction:* Quiet.  
  **Say:** Why tell me?

### M04_SAFE
*M04_NO_LOOSE_ENDS; heard face to face*

- `ASH_M04_SAFE_001`  
  *Direction:* Gentle.  
  **Say:** You said you thought somebody was following you.

- `ASH_M04_SAFE_002`  
  *Direction:* Steady, kind, not pretending to have more than they have.  
  **Say:** We find him. Before anyone else does. And we find out what he knows. You're not alone in this.

- `ASH_M04_SAFE_003`  
  *Direction:* Not cruel, but honest and a little hurt.  
  **Say:** You should have told me sooner. We both could have been dead at that beach.

- `ASH_M04_SAFE_004`  
  *Direction:* Firm, concerned, clumsy.  
  **Say:** Stay out of the next job. I'll handle it. You're too close to this.

### M04_SEARCH
*M04_NO_LOOSE_ENDS; heard in the car*

- `ASH_M04_SEARCH_001`  
  *Direction:* Pulling a damp canvas bag from the gap.  
  **Say:** Got it. It's lighter than I thought.

### M05_DECIDE
*M05_DIRTY_BADGE; heard face to face*

- `ASH_M05_DECIDE_001`  
  *Direction:* Slow, aware that the answer is a lever either way.  
  **Say:** I need a minute.

- `ASH_M05_DECIDE_002`  
  *Direction:* A slow breath. The wrong decision, said calmly.  
  **Say:** A manifest. Alder Point, King Haulage, consulting fees. It's with someone I trust.

- `ASH_M05_DECIDE_003`  
  *Direction:* Careful, bargaining.  
  **Say:** A shipping document. Mismatched container numbers. I'll know more when I know whose it is.

- `ASH_M05_DECIDE_004`  
  *Direction:* Level.  
  **Say:** Nothing yet. I'd like to know whose side the evidence is on before I tell you what it says.

### M05_EDDIE
*M05_DIRTY_BADGE; heard face to face*

- `ASH_M05_EDDIE_001`  
  *Direction:* Quietly, putting the photograph on the bench.  
  **Say:** Eddie. I need you to look at this and tell me I'm wrong.

- `ASH_M05_EDDIE_002`  
  *Direction:* Level.  
  **Say:** It's a blue pickup with a replaced tailgate and a fresh paint job. It looks like the one I delivered to Walt.

- `ASH_M05_EDDIE_003`  
  *Direction:* Gentle.  
  **Say:** Who was it?

- `ASH_M05_EDDIE_004`  
  *Direction:* Not unkind.  
  **Say:** You remember the dent.

- `ASH_M05_EDDIE_005`  
  *Direction:* Quiet. Putting the photograph back in the envelope.  
  **Say:** Okay. I won't drag you in.

### M05_MARA
*M05_DIRTY_BADGE; heard face to face*

- `ASH_M05_MARA_001`  
  *Direction:* Level.  
  **Say:** Somebody who writes the incident report.

- `ASH_M05_MARA_002`  
  *Direction:* Quiet.  
  **Say:** I didn't know it was him.

- `ASH_M05_MARA_003`  
  *Direction:* Yes.  
  **Say:** Then that's where we look.

### M05_MEET
*M05_DIRTY_BADGE; heard face to face*

- `ASH_M05_MEET_001`  
  *Direction:* Sitting, not touching the cup.  
  **Say:** You said facts.

- `ASH_M05_MEET_002`  
  *Direction:* Dry.  
  **Say:** So you're a good cop with bad bosses.

- `ASH_M05_MEET_003`  
  *Direction:* Very still. Careful.  
  **Say:** Who told you about rack nine?

- `ASH_M05_MEET_004`  
  *Direction:* Not pushing, but noting it.  
  **Say:** The incident report says rack nine?

### M05_YARD
*M05_DIRTY_BADGE; heard face to face*

- `ASH_M05_YARD_001`  
  *Direction:* Level.  
  **Say:** You can do that.

- `ASH_M05_YARD_002`  
  *Direction:* Quiet. Opening the box and finding the photograph.  
  **Say:** A blue pickup. At night. A plate, partly covered.

- `ASH_M05_YARD_003`  
  *Direction:* Reading the back, slowly.  
  **Say:** "Berth Nine. Never reported."

- `ASH_M05_YARD_004`  
  *Direction:* Lifting a small cassette recorder, sealed in a bag. Frowning.  
  **Say:** And this?

### M06_AFTER
*M06_THE_PEOPLE_WHO_PAY; heard in the car*

- `ASH_M06_AFTER_001`  
  *Direction:* Dry.  
  **Say:** I was hoping so.

- `ASH_M06_AFTER_002`  
  *Direction:* Level.  
  **Say:** I haven't spent it.

- `ASH_M06_AFTER_003`  
  *Direction:* Honest.  
  **Say:** It was. Mostly.

### M06_CONTACT
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `ASH_M06_CONTACT_001`  
  *Direction:* Steady.  
  **Say:** Priya. She's the only one who wrote a word.

- `ASH_M06_CONTACT_002`  
  *Direction:* Pushing the folder into her hands.  
  **Say:** You keep them. You know the city better than I do.

- `ASH_M06_CONTACT_003`  
  *Direction:* A little too reasonable.  
  **Say:** We need someone with a badge. He can open doors we can't.

- `ASH_M06_CONTACT_004`  
  *Direction:* Tired, uncertain.  
  **Say:** Or he isn't. I have to know.

### M06_EVENT
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `ASH_M06_EVENT_001`  
  *Direction:* Level.  
  **Say:** I met a woman who said it was perfectly safe until somebody started making it dangerous.

- `ASH_M06_EVENT_002`  
  *Direction:* Quiet. The envelope is heavier than it looks.  
  **Say:** I'll think about it.

- `ASH_M06_EVENT_003`  
  *Direction:* Pushing the envelope across the table with one finger. Level.  
  **Say:** No.

- `ASH_M06_EVENT_004`  
  *Direction:* Smooth. Not quite a lie, not quite the truth.  
  **Say:** Twenty thousand is a lot of reasons to listen. I'll consider myself advised.

### M06_MART
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `ASH_M06_MART_001`  
  *Direction:* Gently.  
  **Say:** I'm not here to buy.

- `ASH_M06_MART_002`  
  *Direction:* Reading it.  
  **Say:** This isn't an assessment. It's a sale option. With a thirty-day clause.

### M06_PRIYA
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `ASH_M06_PRIYA_001`  
  *Direction:* Hands over the folder.  
  **Say:** You'll want to read this slowly.

- `ASH_M06_PRIYA_002`  
  *Direction:* Honest.  
  **Say:** Not yet. Maybe not for a while. Keep it safe.

### M06_SITE
*M06_THE_PEOPLE_WHO_PAY; heard in the car*

- `ASH_M06_SITE_001`  
  *Direction:* Quiet.  
  **Say:** Which lender?

- `ASH_M06_SITE_002`  
  *Direction:* Reading folders by phone light.  
  **Say:** Purchase orders. Wharf Street, every unit. And a payment schedule. Alder Point Development to King Haulage, monthly. "Consulting: public safety."

- `ASH_M06_SITE_003`  
  *Direction:* Closing the folder. Low.  
  **Say:** There's a cross reference. PAC-4471.

### M07_CALLBACK
*M07_BURN_NOTICE; heard over the phone, **filtered** (record dry)*

- `ASH_M07_CALLBACK_001`  
  *Direction:* Out of breath. Weighing a call and a risk.  
  **Say:** Who do I call?

- `ASH_M07_CALLBACK_002`  
  *Direction:* Steadier for hearing it.  
  **Say:** A place to hide, and somebody who isn't afraid.

- `ASH_M07_CALLBACK_003`  
  *Direction:* A tired breath.  
  **Say:** They're going to look there.

### M07_DECIDE
*M07_BURN_NOTICE; heard face to face*

- `ASH_M07_DECIDE_001`  
  *Direction:* Standing at the window. Barely audible.  
  **Say:** Darius is going to keep coming. We can't hide in a back room for the rest of our lives.

- `ASH_M07_DECIDE_002`  
  *Direction:* Dialling. Cold, level, speaking to a recording of a man.  
  **Say:** Darius. It's Ash. You gave me eight hundred dollars. I'm giving you a week. Leave Mara's brother out of this, and leave Eddie's door alone.

- `ASH_M07_DECIDE_003`  
  *Direction:* Smooth. Playing the wrong card as well as it can be played.  
  **Say:** Darius. I have half of what you want. I'll trade it for the people I care about.

- `ASH_M07_DECIDE_004`  
  *Direction:* Putting the phone down on the sill. No call.  
  **Say:** Let him wonder.

### M07_EDDIE
*M07_BURN_NOTICE; heard face to face*

- `ASH_M07_EDDIE_001`  
  *Direction:* Low.  
  **Say:** Eddie. The truck in the photograph.

- `ASH_M07_EDDIE_002`  
  *Direction:* Quiet.  
  **Say:** You didn't know.

- `ASH_M07_EDDIE_003`  
  *Direction:* Gentle.  
  **Say:** I'm sorry.

### M07_MARA
*M07_BURN_NOTICE; heard face to face*

- `ASH_M07_MARA_001`  
  *Direction:* Quiet.  
  **Say:** They know about Mateo.

- `ASH_M07_MARA_002`  
  *Direction:* Honest, tired.  
  **Say:** I made some bad ones. And some good ones. I'm going to need you to tell me which is which.

- `ASH_M07_MARA_003`  
  *Direction:* Quiet.  
  **Say:** You're leaving.

- `ASH_M07_MARA_004`  
  *Direction:* Careful.  
  **Say:** Give me one more chance.

### M07_REP
*M07_BURN_NOTICE; heard face to face*

- `ASH_M07_REP_001`  
  *Direction:* Level, taking in the lot. Four dark cars where there were none.  
  **Say:** You said Darius wanted to say thank you.

- `ASH_M07_REP_002`  
  *Direction:* Quiet.  
  **Say:** Jojo. Whose cars are those?

- `ASH_M07_REP_003`  
  *Direction:* Slowly, and the world narrows.  
  **Say:** Okay.

### M07_TRAP
*M07_BURN_NOTICE; heard over the phone, **filtered** (record dry)*

- `ASH_M07_TRAP_001`  
  *Direction:* Steady, getting into the car.  
  **Say:** You're not my friend, Darius.

- `ASH_M07_TRAP_002`  
  *Direction:* Very cold.  
  **Say:** Don't.

### M08_DEAD
*M08_THE_LAST_WITNESS; heard in the car*

- `ASH_M08_DEAD_001`  
  *Direction:* Quiet. Standing in the doorway. Looking at the thermos on the step. It takes a while.  
  **Say:** He was right. It was everybody's business.

- `ASH_M08_DEAD_002`  
  *Direction:* Folding the envelope into a pocket. A low, flat promise, to nobody.  
  **Say:** He left us the log. I'll make it count.

### M08_DECIDE
*M08_THE_LAST_WITNESS; heard face to face*

- `ASH_M08_DECIDE_001`  
  *Direction:* Quietly. The weight of it.  
  **Say:** Three options. A detective with a badge we can trust, or a reporter who prints the truth, or we hold it, and use it as leverage.

- `ASH_M08_DECIDE_002`  
  *Direction:* Quiet.  
  **Say:** She will do it right. Slow, but right.

- `ASH_M08_DECIDE_003`  
  *Direction:* Level. It sounds sounder than it is.  
  **Say:** It's a risk. If he buries it, we know for certain. If he doesn't, it gets read by someone with power.

- `ASH_M08_DECIDE_004`  
  *Direction:* Quiet.  
  **Say:** Then she has to be fast.

- `ASH_M08_DECIDE_005`  
  *Direction:* A decision that sounds cold.  
  **Say:** It's the only thing that keeps anyone alive. As long as nobody has it, nobody has to kill us for it.

### M08_LIVES
*M08_THE_LAST_WITNESS; heard face to face*

- `ASH_M08_LIVES_001`  
  *Direction:* Quiet, kind.  
  **Say:** You were. You stayed.

### M08_SIEGE
*M08_THE_LAST_WITNESS; heard over the radio, **filtered** (record dry)*

- `ASH_M08_SIEGE_001`  
  *Direction:* Low, urgent.  
  **Say:** Walt, stay inside.

### M08_WALT
*M08_THE_LAST_WITNESS; heard face to face*

- `ASH_M08_WALT_001`  
  *Direction:* Gentle.  
  **Say:** You don't fish, Walt.

- `ASH_M08_WALT_002`  
  *Direction:* Quietly.  
  **Say:** You asked about the dent on the tailgate. The first day. Why?

- `ASH_M08_WALT_003`  
  *Direction:* Very quiet.  
  **Say:** What's in the envelope?

- `ASH_M08_WALT_004`  
  *Direction:* Level.  
  **Say:** Rowan. Sloane. Darius.

- `ASH_M08_WALT_005`  
  *Direction:* Putting a hand on his shoulder.  
  **Say:** You're saying it now.

### M09_ALARM
*M09_PORT_ALDER_BURNING; heard over the phone, **filtered** (record dry)*

- `ASH_M09_ALARM_001`  
  *Direction:* Level.  
  **Say:** You were quick.

### M09_ALLIES
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_ALLIES_001`  
  *Direction:* Quiet.  
  **Say:** You don't have to come, Eddie.

- `ASH_M09_ALLIES_002`  
  *Direction:* Honest.  
  **Say:** Fair.

### M09_DARIUS
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_DARIUS_001`  
  *Direction:* Level.  
  **Say:** You tried to have me killed.

- `ASH_M09_DARIUS_002`  
  *Direction:* Low.  
  **Say:** Danny Vale.

- `ASH_M09_DARIUS_003`  
  *Direction:* Very cold.  
  **Say:** And you let Eddie believe he left town.

- `ASH_M09_DARIUS_004`  
  *Direction:* Flat.  
  **Say:** It still doesn't make it okay.

### M09_DFATE
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_DFATE_001`  
  *Direction:* Standing over him. Quiet.  
  **Say:** It's over, Darius.

- `ASH_M09_DFATE_002`  
  *Direction:* Quiet.  
  **Say:** You're going to say it all on the record. All of it. In front of someone you can't buy.

- `ASH_M09_DFATE_003`  
  *Direction:* Tired, flat.  
  **Say:** Walk. Leave Port Alder. If I see you again, I won't be asking.

- `ASH_M09_DFATE_004`  
  *Direction:* Cold. Not loud. This is a decision they will remember every day.  
  **Say:** This is for Danny.

### M09_EPI_A2
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_EPI_A2_001`  
  *Direction:* Quiet.  
  **Say:** It suits it.

### M09_EPI_A3
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_EPI_A3_001`  
  *Direction:* Quiet.  
  **Say:** You're leaving?

- `ASH_M09_EPI_A3_002`  
  *Direction:* Level.  
  **Say:** That's fair.

- `ASH_M09_EPI_A3_003`  
  *Direction:* Quiet.  
  **Say:** Where will you go?

### M09_EPI_B2
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_EPI_B2_001`  
  *Direction:* Quiet.  
  **Say:** I have a place in a high building. A car. A job nobody can explain.

- `ASH_M09_EPI_B2_002`  
  *Direction:* Honest, exhausted.  
  **Say:** I know.

### M09_EPI_B3
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_EPI_B3_001`  
  *Direction:* Alone at a very high window. The city spread out below like a light fixture. A voice that has stopped fighting.  
  **Say:** It's a beautiful view.

- `ASH_M09_EPI_B3_002`  
  *Direction:* Barely there.  
  **Say:** I don't know why I can't stop thinking about the sign on the garage.

- `ASH_M09_EPI_B3_003`  
  *Direction:* Flat.  
  **Say:** Darius got out of town. Sloane's lawyers made sure of it. I used to think I was the only person in this city who could say no.

- `ASH_M09_EPI_B3_004`  
  *Direction:* A tired breath. The title of the story, said aloud for the first time.  
  **Say:** There was an exit. I think I drove past it.

### M09_EPI_C2
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_EPI_C2_001`  
  *Direction:* Quiet.  
  **Say:** No.

- `ASH_M09_EPI_C2_002`  
  *Direction:* Quiet.  
  **Say:** I'm sorry.

### M09_EPI_C3
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_EPI_C3_001`  
  *Direction:* Quiet. A first, real smile.  
  **Say:** Where are we going?

- `ASH_M09_EPI_C3_002`  
  *Direction:* Quiet.  
  **Say:** I wouldn't ask.

- `ASH_M09_EPI_C3_003`  
  *Direction:* On the quay, watching the glow on the water. Low.  
  **Say:** Last exit.

### M09_ROWAN
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_ROWAN_001`  
  *Direction:* Level.  
  **Say:** You were the voice on the tape.

- `ASH_M09_ROWAN_002`  
  *Direction:* Quiet.  
  **Say:** And now?

- `ASH_M09_ROWAN_003`  
  *Direction:* Low.  
  **Say:** You keep copies. You always keep copies. Bring them.

- `ASH_M09_ROWAN_004`  
  *Direction:* Turning their back.  
  **Say:** I'm not your conscience.

### M09_SLOANE
*M09_PORT_ALDER_BURNING; heard face to face*

- `ASH_M09_SLOANE_001`  
  *Direction:* Level.  
  **Say:** You're alone.

- `ASH_M09_SLOANE_002`  
  *Direction:* Quiet. Firm. A decision that costs them something.  
  **Say:** No. Everything goes to people who can print it and prosecute it. Including this conversation.

- `ASH_M09_SLOANE_003`  
  *Direction:* Holding up a phone, the call light red.  
  **Say:** It's been recording since the lobby.

- `ASH_M09_SLOANE_004`  
  *Direction:* Slow. The words come out smoother than they feel.  
  **Say:** Fifty thousand. A clean record. I walk away and the paper never leaves my hands.

- `ASH_M09_SLOANE_005`  
  *Direction:* Not turning around.  
  **Say:** I know.

- `ASH_M09_SLOANE_006`  
  *Direction:* Very quiet. A decision made a long way down.  
  **Say:** No deal. No reporter. Nobody gets any of it.

- `ASH_M09_SLOANE_007`  
  *Direction:* Producing a lighter. Level.  
  **Say:** You said it yourself, Mr. Sloane. It's only paper.

### M09_YARD
*M09_PORT_ALDER_BURNING; heard in the car*

- `ASH_M09_YARD_001`  
  *Direction:* Working the latch with a bar. Quiet.  
  **Say:** It's open. Somebody opened it.

- `ASH_M09_YARD_002`  
  *Direction:* Inside, a steel cabinet. Flat, unbelieving.  
  **Say:** Ledgers. Boxes of them. Signed contracts. Hard drives. Everything, all of it, in one place.

- `ASH_M09_YARD_003`  
  *Direction:* Closing the cabinet. Steady.  
  **Say:** Take what we can carry.

### O01_MEET
*O01_INCONSISTENCIES; heard face to face*

- `ASH_O01_MEET_001`  
  *Direction:* Dry.  
  **Say:** That sounds about right.

- `ASH_O01_MEET_002`  
  *Direction:* Gentle.  
  **Say:** Why tell me?

### O02_SITE1
*O02_THREE_SITES; heard in the car*

- `ASH_O02_SITE1_001`  
  *Direction:* At the Wharf Street shops. Quiet.  
  **Say:** Broken windows, fire damage, police tape. Nothing in the report. Not one word.

### O02_SITE2
*O02_THREE_SITES; heard in the car*

- `ASH_O02_SITE2_001`  
  *Direction:* At the storage unit. Flat.  
  **Say:** Locks cut, boxes opened. Somebody has been through here since the report was filed. Recently.

### O02_SITE3
*O02_THREE_SITES; heard in the car*

- `ASH_O02_SITE3_001`  
  *Direction:* At the port. Low.  
  **Say:** Fresh forklift tracks and a gate log with a page torn out. Dana was right. Every single report is wrong in exactly the same way.

### O03_FILE
*O03_THE_FILE; heard face to face*

- `ASH_O03_FILE_001`  
  *Direction:* Level.  
  **Say:** What do you want to do?

### R01_DONE
*R01_CLEAN_MONEY; heard face to face*

- `ASH_R01_DONE_001`  
  *Direction:* Gentle.  
  **Say:** Where is the money going?

### R02_PARK
*R02_MATEO; heard face to face*

- `ASH_R02_PARK_001`  
  *Direction:* Sitting, not too close.  
  **Say:** She didn't say it to your face?

- `ASH_R02_PARK_002`  
  *Direction:* Honest.  
  **Say:** What are you carrying for them?

- `ASH_R02_PARK_003`  
  *Direction:* Level.  
  **Say:** Mateo. Mara says you carry a bag very well. Those were Darius's words. Not hers.

- `ASH_R02_PARK_004`  
  *Direction:* Steady.  
  **Say:** Stop. Tell them you're sick. Tell them whatever you want. Your sister is the only one in this city who wants nothing from you.

- `ASH_R02_PARK_005`  
  *Direction:* Careful. It is a cold thing to ask.  
  **Say:** Keep carrying. Tell me what you see. Don't be a hero. Just remember.

### R03_PLAN
*R03_THE_PLAN; heard face to face*

- `ASH_R03_PLAN_001`  
  *Direction:* Quiet.  
  **Say:** Of leaving?

- `ASH_R03_PLAN_002`  
  *Direction:* Warm.  
  **Say:** Go. Take Mateo and go. You've earned the map on your wall.

- `ASH_R03_PLAN_003`  
  *Direction:* Honest.  
  **Say:** I'd like you to stay. Not because I need you to. Because this city has been shaped by people who left.

- `ASH_R03_PLAN_004`  
  *Direction:* Careful. It comes out colder than it is.  
  **Say:** I can't be the reason you stay or go. That's not fair to either of us.

### W01_DONE
*W01_WINDOWS; heard face to face*

- `ASH_W01_DONE_001`  
  *Direction:* Dry.  
  **Say:** Mostly?

### W01_SIEGE
*W01_WINDOWS; heard over the radio, **filtered** (record dry)*

- `ASH_W01_SIEGE_001`  
  *Direction:* Low.  
  **Say:** Lucille, get down.

### W02_ASK
*W02_SIGNATURES; heard face to face*

- `ASH_W02_ASK_001`  
  *Direction:* Gentle.  
  **Say:** And you want me to be the first.

### W02_NEIGHBOUR
*W02_SIGNATURES; heard face to face*

- `ASH_W02_NEIGHBOUR_001`  
  *Direction:* Talking to a stranger off-screen. Neutral and friendly.  
  **Say:** It's about Wharf Street. We're collecting signatures against the buyout.

- `ASH_W02_NEIGHBOUR_002`  
  *Direction:* Taking the pen back with a small smile.  
  **Say:** Thank you. You've done more than you know.

### W03_SITE
*W03_THE_PERMIT; heard in the car*

- `ASH_W03_SITE_001`  
  *Direction:* Squinting at a laminated notice, taking a photograph. Quiet.  
  **Say:** Environmental waiver, signed, dated. The date is a Sunday. Nobody signs a waiver on Sunday.

- `ASH_W03_SITE_002`  
  *Direction:* A flat, pleased laugh.  
  **Say:** And it's signed by a man who died in March.

## Eddie Vale (`EDDIE`)

**Role:** the mechanic  
**Voice:** Middle-aged, slightly rough, conversational. Late forties.  
**Direction:** Dry humour, deflection. Gets quieter, not louder, when it matters. Never theatrical.  
**Accent:** Working-class American, East Coast port-town lean. Light touch.  
**Pace:** Easy and unhurried; pauses before saying the true thing.  
**Range:** Narrow: deadpan to quietly raw.  
**Pronunciation:** Vale: "vayl"; Danny: "DAN-ee"  
**Recording notes:** Warm room tone, mic a little off-axis. For the emotional scenes record a take at conversational volume, then one softer.

**Who they are:** Runs Vale Auto. Once ran it with his younger brother Danny, who disappeared five years ago after a job for Darius King. Eddie tells himself Danny just left town.

**Wants:** Keep the garage alive and the people he cares about out of trouble. Stay out of the criminal world.  
**Fears:** That Danny is dead and that Eddie could have stopped it.  
**Hides:** For years he repaired trucks for dock-connected people, and one of them helped hide the missing shipment.  
**Arc:** Starts by steering Ash toward easy jobs. When the truth lands he has to stop pretending and decide what his silence cost.

91 lines, 1527 words.

### E01_ASK
*E01_OLD_TICKETS; heard face to face*

- `EDDIE_E01_ASK_001`  
  *Direction:* In the doorway. Not looking at Ash. A man who has been rehearsing a request for days.  
  **Say:** You said you wouldn't drag me in.

- `EDDIE_E01_ASK_002`  
  *Direction:* A long pause. His voice is almost too soft.  
  **Say:** I'm dragging myself. I kept every job ticket for twelve years. Danny filed them. His handwriting. They're in a storage unit by the industrial blocks. I haven't been in there since.

- `EDDIE_E01_ASK_003`  
  *Direction:* Dry, to cover it.  
  **Say:** There's a box that says TAXES on it. It doesn't say taxes. Don't tell anyone I said that.

### E01_BACK
*E01_OLD_TICKETS; heard face to face*

- `EDDIE_E01_BACK_001`  
  *Direction:* Holding the last ticket in two fingers. He doesn't turn it over until he has read it three times.  
  **Say:** He wrote "E. says it's a bad idea." I did say that. I did.

- `EDDIE_E01_BACK_002`  
  *Direction:* Very low.  
  **Say:** And here's the part that's going to bother me for the rest of my life. I wasn't wrong. I just didn't stop him.

- `EDDIE_E01_BACK_003`  
  *Direction:* A small, careful breath, and, for the first time, he looks at Ash.  
  **Say:** No. But I think I could have.

### E02_CALL
*E02_DANNYS_TRUCK; heard over the phone, **filtered** (record dry)*

- `EDDIE_E02_CALL_001`  
  *Direction:* On the phone. Gruff, too casual, a man asking for a favour by pretending it isn't one.  
  **Say:** There's a truck. Blue. You know the one. It's in Walt's yard at the docks. I'd like it back. Not for the money.

- `EDDIE_E02_CALL_002`  
  *Direction:* Dry, quiet.  
  **Say:** It's the only thing of his I can still fix.

### E02_DRIVE
*E02_DANNYS_TRUCK; heard over the phone, **filtered** (record dry)*

- `EDDIE_E02_DRIVE_001`  
  *Direction:* Over the phone. Stiff, quiet, trying not to ask.  
  **Say:** How does she sound?

- `EDDIE_E02_DRIVE_002`  
  *Direction:* A small laugh. It cracks.  
  **Say:** That's her. Bring her home.

### E02_HOME
*E02_DANNYS_TRUCK; heard face to face*

- `EDDIE_E02_HOME_001`  
  *Direction:* Walking around the pickup, one palm flat on the hood. Not speaking for a while.  
  **Say:** You know, I fixed this. I fixed it wrong. I repaired every dent and not one thing that mattered.

- `EDDIE_E02_HOME_002`  
  *Direction:* Quietly, almost to the truck.  
  **Say:** Thank you for bringing her back.

### E03_ASK
*E03_SOMEONE_WHO_KNEW_HIM; heard over the phone, **filtered** (record dry)*

- `EDDIE_E03_ASK_001`  
  *Direction:* On the phone. Rough. He has decided to say something and cannot yet say it.  
  **Say:** There's one more thing. People who knew Danny. Not the docks. Not the crew. People who liked him. I realised I'd never asked any of them what they remembered.

- `EDDIE_E03_ASK_002`  
  *Direction:* Quieter.  
  **Say:** Lucille Ng. She says he fixed her delivery van for free for a year. She's been trying to tell me for five years. I kept finding reasons to be somewhere else.

### E03_PIER
*E03_SOMEONE_WHO_KNEW_HIM; heard face to face*

- `EDDIE_E03_PIER_001`  
  *Direction:* Standing at the end of the pier with the brass wrench keyring in his hand. A long silence.  
  **Say:** He told that joke to me too. Every day. It never got better.

- `EDDIE_E03_PIER_002`  
  *Direction:* A short, wet laugh. He wipes his eyes and does not apologise.  
  **Say:** I'll believe her in a few years. But it's a start.

- `EDDIE_E03_PIER_003`  
  *Direction:* Hanging the keyring on the rail, gently, and stepping back. Quietly.  
  **Say:** There. Everyone says to say goodbye. I'm just going to say I'm sorry I took so long.

- `EDDIE_E03_PIER_004`  
  *Direction:* Turning, brisk, the old Eddie sliding back in.  
  **Say:** The garage is yours whenever you need it. Free. Parts too. I'll complain about it, but you'll never see a bill.

### H01_EDDIE1
*HANGOUT (talk to people in the city); heard face to face*

- `EDDIE_H01_EDDIE1_001`  
  *Direction:* Not looking up. Easy.  
  **Say:** The coffee machine is broken. Don't take that personally. It's broken for everyone.

### H01_EDDIE2
*HANGOUT (talk to people in the city); heard face to face*

- `EDDIE_H01_EDDIE2_001`  
  *Direction:* Under a car. Muffled.  
  **Say:** If you're going to ask about the job, no. If you're going to ask how I'm doing, also no.

- `EDDIE_H01_EDDIE2_002`  
  *Direction:* A pause.  
  **Say:** Third drawer. Don't lose it. It's the only one I like.

### H01_EDDIE3
*HANGOUT (talk to people in the city); heard face to face*

- `EDDIE_H01_EDDIE3_001`  
  *Direction:* Quiet, wiping a gauge.  
  **Say:** You're still here. I keep expecting you to be a person who leaves.

- `EDDIE_H01_EDDIE3_002`  
  *Direction:* A short, dry laugh.  
  **Say:** Nobody likes the window.

### H01_EDDIE4
*HANGOUT (talk to people in the city); heard face to face*

- `EDDIE_H01_EDDIE4_001`  
  *Direction:* Not turning round. Flat, the voice of a man who has been told too much and not enough.  
  **Say:** Walt's been quiet. Walt is always quiet. But it's a different quiet.

- `EDDIE_H01_EDDIE4_002`  
  *Direction:* Shrugs.  
  **Say:** Like a man holding his breath.

### H01_EDDIE5
*HANGOUT (talk to people in the city); heard face to face*

- `EDDIE_H01_EDDIE5_001`  
  *Direction:* Quiet. He has been saying it to himself all morning.  
  **Say:** I'm going to say his name every day. Danny. There. That's the exercise. The therapist is a woman called Pat. She's very good, she hates my jokes.

- `EDDIE_H01_EDDIE5_002`  
  *Direction:* A real smile.  
  **Say:** Everybody does.

### H01_EDDIE6
*HANGOUT (talk to people in the city); heard face to face*

- `EDDIE_H01_EDDIE6_001`  
  *Direction:* Dry, sitting on a drum.  
  **Say:** There's a rumour you took Sloane's money. I told them it was a lie. Is it a lie?

- `EDDIE_H01_EDDIE6_002`  
  *Direction:* Quiet. A longer silence than he usually allows.  
  **Say:** Okay. Thank you for the honesty. I'm going to keep hoping that stays true.

### M00_EDDIE
*M00_ARRIVAL; heard face to face*

- `EDDIE_M00_EDDIE_001`  
  *Direction:* Muffled, half under a hood. Not looking up. Deadpan.  
  **Say:** We're closed.

- `EDDIE_M00_EDDIE_002`  
  *Direction:* Dry, patient, like he has explained this before.  
  **Say:** The door's always open. It's the sign that lies. Sign says "closed" so people who want a quote go away. You want a quote?

- `EDDIE_M00_EDDIE_003`  
  *Direction:* A beat of silence. Surfaces slowly from under the hood.  
  **Say:** Dale.

- `EDDIE_M00_EDDIE_004`  
  *Direction:* Wiping his hands on a rag. Faintly amused, faintly pained.  
  **Say:** Dale owes me three hundred dollars and a transmission. When Dale starts sending people, he's either dying or desperate.

- `EDDIE_M00_EDDIE_005`  
  *Direction:* Finally looks at Ash. A small, dry exhale that is almost a laugh.  
  **Say:** Yeah. That sounds like Dale.

### M01_CALL
*M01_A_NEW_START; heard over the phone, **filtered** (record dry)*

- `EDDIE_M01_CALL_001`  
  *Direction:* On the phone, distracted, clanking in the background.  
  **Say:** Ash. Eddie. Quick thing: Walt's picky. Be polite, hand over the truck, get the signature. And if he asks you anything about the truck, you don't know anything.

- `EDDIE_M01_CALL_002`  
  *Direction:* Adding it as a joke, hoping it lands as one.  
  **Say:** Which, to be fair, you don't. So that part should be easy.

### M01_GARAGE
*M01_A_NEW_START; heard face to face*

- `EDDIE_M01_GARAGE_001`  
  *Direction:* Dry humour, distracted, pretending not to care.  
  **Say:** You look like somebody who could use a job. Lucky for you, I have a truck that needs driving.

- `EDDIE_M01_GARAGE_002`  
  *Direction:* Mild. He means it.  
  **Say:** No catch. My usual guy didn't show up. He does that. I have a pickup that needs to be at the docks in the next hour, and I have a waiting list of exactly nobody.

- `EDDIE_M01_GARAGE_003`  
  *Direction:* Names a figure the way you'd name a weather report.  
  **Say:** Two hundred. Cash, when you get back. The blue pickup, out front. Keys are in it, because if somebody steals it, it's the most useful thing that ever happened to me.

- `EDDIE_M01_GARAGE_004`  
  *Direction:* Looks at Ash properly for the first time.  
  **Say:** I'm Eddie. Vale. It's on the sign, which is the only reason anybody gets it right.

- `EDDIE_M01_GARAGE_005`  
  *Direction:* Slight eyebrow, accepting.  
  **Say:** Just Ash.

- `EDDIE_M01_GARAGE_006`  
  *Direction:* Lets it go, which is a kindness. Back to business.  
  **Say:** Fine. For now. Take it to the docks, find a man named Walt Pruitt, hand him the truck and the paperwork on the seat. Don't scratch it. Don't talk about the weather. Walt hates the weather.

### M01_RETURN
*M01_A_NEW_START; heard face to face*

- `EDDIE_M01_RETURN_001`  
  *Direction:* Glancing up from a clipboard. Dry.  
  **Say:** Still got the truck? No. Walt's got the truck. You still have both arms. That's a good first day.

- `EDDIE_M01_RETURN_002`  
  *Direction:* A fraction too quick. Light and dismissive.  
  **Say:** Walt asks everyone about everything. He once asked me where my shoes came from. It's a lonely port.

- `EDDIE_M01_RETURN_003`  
  *Direction:* Counts out the cash and puts it on the bench, not in Ash's hand.  
  **Say:** Two hundred. Take it. And a piece of advice, free, which is the only kind I give: this city is full of strange people. Most of them are just lonely. A few of them are not. You don't need to know which is which, you need to not ask.

- `EDDIE_M01_RETURN_004`  
  *Direction:* Quiet, almost shy. Looking at the clipboard instead of Ash.  
  **Say:** Where are you sleeping tonight?

- `EDDIE_M01_RETURN_005`  
  *Direction:* Gruff. Pretending it's business.  
  **Say:** There's a room out back. Cot, hot plate, a window that doesn't close. It's not charity. I need somebody to keep an eye on the place at night, and I'm too cheap to hire anybody I'd have to like.

- `EDDIE_M01_RETURN_006`  
  *Direction:* Waves it off without turning around.  
  **Say:** Don't thank me. Thank the window. It lets in the cold, so you'll want to be tough.

### M01_TRUCK
*M01_A_NEW_START; heard face to face*

- `EDDIE_M01_TRUCK_001`  
  *Direction:* Gesturing at the pickup with a wrench. Lightly mocking his own work.  
  **Say:** She's older than she looks and louder than she should be. Brake pedal is honest. Horn is a liar.

- `EDDIE_M01_TRUCK_002`  
  *Direction:* The smallest hitch, then covered.  
  **Say:** Somebody did. Get in. Seat's a little forward. You'll live.

### M02_MEET
*M02_EASY_MONEY; heard face to face*

- `EDDIE_M02_MEET_001`  
  *Direction:* Not looking at anyone. Rag, wrench, reluctance.  
  **Say:** Ash. Mara. Mara, Ash. Don't shake hands, it'll just make it official.

- `EDDIE_M02_MEET_002`  
  *Direction:* Quieter. To Ash, not to Mara.  
  **Say:** The call you got last night. The one I told you to ignore. That's Darius King's people. I'm not telling you to take it. I'm telling you it's a bad idea in a nice jacket.

- `EDDIE_M02_MEET_003`  
  *Direction:* A tired breath. He has had this argument with himself for years.  
  **Say:** It pays. That's the whole problem with it.

- `EDDIE_M02_MEET_004`  
  *Direction:* Dry.  
  **Say:** Nothing ever has. That's how you know it's about to.

- `EDDIE_M02_MEET_005`  
  *Direction:* He goes. Over his shoulder, to Ash.  
  **Say:** Be careful about work from strangers. Strangers have reasons.

### M02_POST
*M02_EASY_MONEY; heard face to face*

- `EDDIE_M02_POST_001`  
  *Direction:* Leaning in the doorway of the back room, arms folded. Soft, not accusing.  
  **Say:** Mara texted me you got paid.

- `EDDIE_M02_POST_002`  
  *Direction:* A short, quiet breath. He looks at the floor.  
  **Say:** Yeah. That's the number he opens with.

- `EDDIE_M02_POST_003`  
  *Direction:* Closing it down fast, but not rudely.  
  **Say:** Everybody who has a car in this city knows Darius King. Knowing him and owing him are two different things. Be the first kind.

- `EDDIE_M02_POST_004`  
  *Direction:* Very still for half a second. Then he says it too evenly.  
  **Say:** Paperwork never matches. It's the only thing it's good at. Get some sleep.

### M05_EDDIE
*M05_DIRTY_BADGE; heard face to face*

- `EDDIE_M05_EDDIE_001`  
  *Direction:* Wiping his hands. He looks, and stops wiping.  
  **Say:** It's a truck.

- `EDDIE_M05_EDDIE_002`  
  *Direction:* Very quiet. He puts the rag down, slowly, as if it might break.  
  **Say:** It's that one. I did the tailgate. A big dent, shaped like a boot. I did the paint. I put the plates on. A man from the docks brought it in at two in the morning, paid cash, and asked me not to put the date on the ticket.

- `EDDIE_M05_EDDIE_003`  
  *Direction:* A short, flat, defensive breath.  
  **Say:** I don't remember. It was five years ago. You fix a hundred cars and you don't keep every face.

- `EDDIE_M05_EDDIE_004`  
  *Direction:* Pause. His voice goes quieter, not louder.  
  **Say:** Yeah. I remember the dent.

- `EDDIE_M05_EDDIE_005`  
  *Direction:* Sharp, protective, a man pulling a door shut. He does not look up.  
  **Say:** I need you not to involve me anymore. Whatever this is, I can't be in it. I have a garage. I have a mortgage. I have... I can't be in it, Ash.

- `EDDIE_M05_EDDIE_006`  
  *Direction:* Barely audible, to the bench.  
  **Say:** Thanks.

### M07_CALLBACK
*M07_BURN_NOTICE; heard over the phone, **filtered** (record dry)*

- `EDDIE_M07_CALLBACK_001`  
  *Direction:* Phone. Rough. He picks up on the first ring.  
  **Say:** Where are you? No. Don't tell me. Come to the garage. The back door's open.

- `EDDIE_M07_CALLBACK_002`  
  *Direction:* Quiet, steady. The first time he has sounded certain about anything.  
  **Say:** Let them look.

### M07_EDDIE
*M07_BURN_NOTICE; heard face to face*

- `EDDIE_M07_EDDIE_001`  
  *Direction:* Standing in the doorway of the back room with the lights off. He has closed the garage door and locked it. He talks to the floor.  
  **Say:** They didn't come. Not yet.

- `EDDIE_M07_EDDIE_002`  
  *Direction:* Slow. Quiet. He sits down on the edge of the cot like his knees have stopped being reliable.  
  **Say:** My brother's name was Danny. He was three years younger than me and he laughed at everything. We ran this garage together. Eleven years. Then Darius King showed up with a job that paid in a week what we made in a month.

- `EDDIE_M07_EDDIE_003`  
  *Direction:* Flat.  
  **Say:** I told him not to take it. He took it. The night he was supposed to come home, a man from the docks brought me that truck at two in the morning with the tailgate kicked in and a story about how Danny had left town. I fixed it. I repainted it. I put on the plates.

- `EDDIE_M07_EDDIE_004`  
  *Direction:* Very quiet. It is not an absolution.  
  **Say:** I didn't want to. There's a difference. For five years, I told myself he went to Florida. I even bought a map.

- `EDDIE_M07_EDDIE_005`  
  *Direction:* Barely a voice.  
  **Say:** He didn't go to Florida.

- `EDDIE_M07_EDDIE_006`  
  *Direction:* A short, rough breath. He wipes his face with the back of his hand, once.  
  **Say:** Don't be. Be angry. I've been practising being sorry for five years. It never got me anywhere.

### M09_ALLIES
*M09_PORT_ALDER_BURNING; heard face to face*

- `EDDIE_M09_ALLIES_001`  
  *Direction:* Hauling the garage shutter down halfway, then leaving it. Dry, but steadier than we have heard him.  
  **Say:** I closed the shop this morning. Put a note on the door. First time in eleven years the sign's been telling the truth.

- `EDDIE_M09_ALLIES_002`  
  *Direction:* A small, wry exhale. He holds up a ring of keys.  
  **Say:** These are Danny's. I've carried them for five years in case he came back for them. I thought I'd bring them. He'd want to be annoyed with me for coming.

- `EDDIE_M09_ALLIES_003`  
  *Direction:* Dry.  
  **Say:** You make it sound organised.

### M09_DRIVE
*M09_PORT_ALDER_BURNING; heard in the car*

- `EDDIE_M09_DRIVE_001`  
  *Direction:* From the back seat. Quiet, steady, a mechanic's opinion.  
  **Say:** If this goes badly, tell them I told you so. In a nicer voice than I normally use.

### M09_EPI_A2
*M09_PORT_ALDER_BURNING; heard face to face*

- `EDDIE_M09_EPI_A2_001`  
  *Direction:* Hanging a new, hand-painted sign above the garage door. It reads VALE & VALE AUTO. He does not turn around.  
  **Say:** Took a while to decide who to put on it.

- `EDDIE_M09_EPI_A2_002`  
  *Direction:* A small, rough exhale.  
  **Say:** I went to the harbor. First time in five years. Sat on the quay for an hour. Didn't say anything. I think that was the point.

- `EDDIE_M09_EPI_A2_003`  
  *Direction:* Quietly.  
  **Say:** They read Darius's statement on the news. I listened to the whole thing. He said Danny's name, in a courtroom. I didn't think I'd ever hear that.

- `EDDIE_M09_EPI_A2_004`  
  *Direction:* Quietly, with an edge.  
  **Say:** You let him walk. I'm still angry about that. I'll be angry for a while. But I'm working on being angry out loud.

- `EDDIE_M09_EPI_A2_005`  
  *Direction:* Very quiet.  
  **Say:** I heard what happened to Darius. I don't want to talk about it. I just want you to know that I know, and I'm still standing here.

- `EDDIE_M09_EPI_A2_006`  
  *Direction:* A last, dry line. It is the closest he will come to a hug.  
  **Say:** The back room's still yours. If you want it. The window still doesn't close.

### M09_EPI_B2
*M09_PORT_ALDER_BURNING; heard face to face*

- `EDDIE_M09_EPI_B2_001`  
  *Direction:* The garage door half down. The sign over it is still the old one. He is cleaning a wrench he doesn't need to clean.  
  **Say:** You're leaving.

- `EDDIE_M09_EPI_B2_002`  
  *Direction:* Looks at the floor.  
  **Say:** You had the chance to say my brother's name out loud, in front of the whole city. And you took the money.

- `EDDIE_M09_EPI_B2_003`  
  *Direction:* Quiet. A different voice entirely: the one for people he has stopped expecting anything from.  
  **Say:** The room's empty. I'll leave the window open in case you ever want to climb back in.

### M09_EPI_C2
*M09_PORT_ALDER_BURNING; heard face to face*

- `EDDIE_M09_EPI_C2_001`  
  *Direction:* Standing in the door of the garage as sirens carry across the city. He is holding an envelope. He does not look surprised.  
  **Say:** You didn't keep a copy.

- `EDDIE_M09_EPI_C2_002`  
  *Direction:* A long, soft silence.  
  **Say:** Danny would've liked the fire. He never could stand a ledger.

- `EDDIE_M09_EPI_C2_003`  
  *Direction:* Barely audible.  
  **Say:** I'd have liked to hear his name, though. Once. In a room full of people. Out loud.

- `EDDIE_M09_EPI_C2_004`  
  *Direction:* A small, honest nod. It does not forgive and it does not condemn.  
  **Say:** I know. Go on. Before they ask who lit it.

### M09_HOLD
*M09_PORT_ALDER_BURNING; heard over the radio, **filtered** (record dry)*

- `EDDIE_M09_HOLD_001`  
  *Direction:* Steady. His voice is a rock.  
  **Say:** Ash. Go. I'll watch the mirrors.

## Mara Cruz (`MARA`)

**Role:** the getaway driver  
**Voice:** Young adult, mid twenties.  
**Direction:** Quick, sharp, funny. In serious scenes she sounds tired and guarded, never melodramatic.  
**Accent:** Natural American, urban working-class. No exaggerated accent.  
**Pace:** Fast; slows right down when she is afraid.  
**Range:** Wide: sarcastic to cracked-open.  
**Pronunciation:** Mara: "MAH-rah"; Cruz: "krooz"; Mateo: "mah-TAY-oh"  
**Recording notes:** Close and energetic. Overlap-style interruptions are written as cut-off lines; record them cut off.

**Who they are:** Port Alder native who learned to drive on her family's delivery routes. Took illegal driving jobs after a family money crisis. Reads people well, hates admitting she needs help.

**Wants:** Earn enough to leave Port Alder and get her younger brother Mateo out first.  
**Fears:** That leaving means abandoning Mateo, and staying means losing him.  
**Hides:** She has been collecting evidence about suspicious shipments for months, and she picked Ash because they might be useful, not because she trusts them.  
**Arc:** Transactional ally. Becomes a loyal friend, a bitter rival, or someone who leaves, depending on how Ash treats her.

160 lines, 2434 words.

### H02_MARA1
*HANGOUT (talk to people in the city); heard face to face*

- `MARA_H02_MARA1_001`  
  *Direction:* Leaning on a car. Bright.  
  **Say:** You know, if you drove even slightly worse, I'd be able to teach you things. It's deeply frustrating.

### H02_MARA2
*HANGOUT (talk to people in the city); heard face to face*

- `MARA_H02_MARA2_001`  
  *Direction:* Quiet, scanning the street.  
  **Say:** Same black car again. I keep naming them. This one is Gerald.

### H02_MARA3
*HANGOUT (talk to people in the city); heard face to face*

- `MARA_H02_MARA3_001`  
  *Direction:* Easy, open.  
  **Say:** Okay, so I told Mateo about you. He thinks you're cool. I'm trying very hard not to make it weird.

- `MARA_H02_MARA3_002`  
  *Direction:* Grins.  
  **Say:** Obviously.

### H02_MARA4
*HANGOUT (talk to people in the city); heard face to face*

- `MARA_H02_MARA4_001`  
  *Direction:* Cool. Not looking up from her phone.  
  **Say:** If you need something, say it. Otherwise I'm busy.

### H02_MARA5
*HANGOUT (talk to people in the city); heard face to face*

- `MARA_H02_MARA5_001`  
  *Direction:* Quiet, once Ash comes close. She says it like a secret.  
  **Say:** I've got a map on my wall. A small one. It has a lot of pins in it. I know it's stupid.

### M02_CARPARK
*M02_EASY_MONEY; heard face to face*

- `MARA_M02_CARPARK_001`  
  *Direction:* Quiet, scanning the car park. A different Mara: attentive, tight.  
  **Say:** Okay. Before we move anything. Look at this.

- `MARA_M02_CARPARK_002`  
  *Direction:* Flat. Pointing with a keycap.  
  **Say:** The VIN on the paperwork ends four-four-one-seven. The VIN on the windshield ends four-four-seven-one. Somebody swapped two numbers. Either they're sloppy, or the car isn't the car.

- `MARA_M02_CARPARK_003`  
  *Direction:* Dry, evasive.  
  **Say:** I think I get paid not to think. And so do you.

- `MARA_M02_CARPARK_004`  
  *Direction:* Quick glance at Ash. She says it as if asking about the weather, and it is not.  
  **Say:** Did Eddie say anything about this job?

- `MARA_M02_CARPARK_005`  
  *Direction:* A short laugh with no humour in it. She files that away.  
  **Say:** That's Eddie.

- `MARA_M02_CARPARK_006`  
  *Direction:* Back to business, deliberately. She is a professional.  
  **Say:** We do the job. We deliver the car. Anyone asks, the numbers matched, because they always do on the day.

### M02_DEPOT
*M02_EASY_MONEY; heard face to face*

- `MARA_M02_DEPOT_001`  
  *Direction:* Easy, unbothered, like she has done this a hundred times.  
  **Say:** Mine. Well, theirs. Today. Open the gate, we're expected.

- `MARA_M02_DEPOT_002`  
  *Direction:* Light.  
  **Say:** The driver. He doesn't talk much. It's the best thing about him.

### M02_DRIVE
*M02_EASY_MONEY; heard over the phone, **filtered** (record dry)*

- `MARA_M02_DRIVE_001`  
  *Direction:* Radio crackle, bright, fast, engine in the background.  
  **Say:** Okay, stay on my bumper. Not too close, I'm picky about my bumper.

- `MARA_M02_DRIVE_002`  
  *Direction:* Teasing.  
  **Say:** Public car park, downtown side. Grey sedan, bay on the end of row C. Plates end four-four-seven-one. Somebody is going to leave the key under the mat, because people like that think that's clever.

- `MARA_M02_DRIVE_003`  
  *Direction:* A tiny pause, a decision about how honest to be.  
  **Say:** I know what they pay. That's a different thing.

### M02_FIND
*M02_EASY_MONEY; heard over the phone, **filtered** (record dry)*

- `MARA_M02_FIND_001`  
  *Direction:* Low, radio-clipped. A bit smug.  
  **Say:** Grey sedan, end of row C. Told you. Key under the mat.

- `MARA_M02_FIND_002`  
  *Direction:* Practical.  
  **Say:** Take it to the King Haulage depot, the one with the high fence on the industrial side. I'll be ahead of you. Drive like you're late for nothing.

### M02_MEET
*M02_EASY_MONEY; heard face to face*

- `MARA_M02_MEET_001`  
  *Direction:* Leaning on the bench, taking Ash in with one sweep. Amused and unimpressed.  
  **Say:** The new guy. Eddie says you don't crash. Is that a skill, or just a lack of enthusiasm?

- `MARA_M02_MEET_002`  
  *Direction:* Quick, a little sharp.  
  **Say:** Cute. I don't hire cute. I hire people who don't stop when things get loud.

- `MARA_M02_MEET_003`  
  *Direction:* Cutting in, brisk, not unkind.  
  **Say:** It's a car. Pick up, drop off, no questions, and you get paid more than he pays you for a week. I've done it a hundred times. Nothing has ever exploded.

- `MARA_M02_MEET_004`  
  *Direction:* Rolling her eyes, grinning. She likes him.  
  **Say:** Eddie. Go work on something.

- `MARA_M02_MEET_005`  
  *Direction:* Slight, genuine smile. She picks up her keys.  
  **Say:** Worry? Every day. Come on, newcomer. You follow me, you don't try to be clever, and if somebody asks, you work for Eddie.

### M02_ROAD
*M02_EASY_MONEY; heard over the phone, **filtered** (record dry)*

- `MARA_M02_ROAD_001`  
  *Direction:* Easy, watching her mirror.  
  **Say:** Nice and legal. If a cop gets behind you, you are a very boring person with a very boring car.

- `MARA_M02_ROAD_002`  
  *Direction:* A little more tension, the same tone.  
  **Say:** Don't look now. Dark car behind the box truck. It's been three turns. Probably nothing. Everything is probably nothing until it isn't.

### M03_POLICE
*M03_THE_WRONG_PACKAGE; heard over the radio, **filtered** (record dry)*

- `MARA_M03_POLICE_001`  
  *Direction:* Fast, low, over the radio. She has been listening.  
  **Say:** Ash. Where are you? Tell me you're not still in there.

- `MARA_M03_POLICE_002`  
  *Direction:* Cutting in, quick and furious.  
  **Say:** That was ninety seconds. Port Alder police don't do ninety seconds. Somebody called it in before you opened the door. Get out. Now.

### M03_SAFE
*M03_THE_WRONG_PACKAGE; heard face to face*

- `MARA_M03_SAFE_001`  
  *Direction:* Out of breath, trying to be light about it. The jokes land short.  
  **Say:** You're alive. Great. I want that on the record. I'm not paying your funeral.

- `MARA_M03_SAFE_002`  
  *Direction:* Flips the case. Goes quiet. Very quiet. She reads the page for far too long.  
  **Say:** ...Alder Point. Sloane.

- `MARA_M03_SAFE_003`  
  *Direction:* Slow, a different, flatter voice. The first time she tells the truth.  
  **Say:** Six months ago, three in the morning, I drove a truck from the port to a place that wasn't a place. Nobody said where. The papers on the dash said "Alder Point." I've been watching the docks ever since. This is the first thing I've ever held that looks like what I've been looking for.

- `MARA_M03_SAFE_004`  
  *Direction:* A sharp, tired laugh. Back to her guard.  
  **Say:** I didn't tell you my name until Eddie did it for me. I tell people things when I've decided they're useful.

- `MARA_M03_SAFE_005`  
  *Direction:* Looks at Ash. Honest.  
  **Say:** You walked into a rigged warehouse for a stranger and walked out with this. Yeah. You might be.

- `MARA_M03_SAFE_006`  
  *Direction:* Low. Practical. The thinking has already started.  
  **Say:** Darius told you it was his paperwork. This says his money comes from them. That's not an ordinary business arrangement. What do you want to do with it?

- `MARA_M03_SAFE_007`  
  *Direction:* Very flat. The shutters come down.  
  **Say:** Okay.

- `MARA_M03_SAFE_008`  
  *Direction:* Cold, not angry. That is worse.  
  **Say:** Then you should know it's the last thing you'll hand him that he can't take back.

- `MARA_M03_SAFE_009`  
  *Direction:* A slow, approving breath, and a small, real smile.  
  **Say:** Good. That is the first smart thing anyone has done in this city in a week.

- `MARA_M03_SAFE_010`  
  *Direction:* Quiet. She does not know what to do with her hands. Then she takes a photo of every page.  
  **Say:** You don't know what that means to me.

- `MARA_M03_SAFE_011`  
  *Direction:* Quick, rough, hiding it.  
  **Say:** Okay. We do this together. Don't make it weird.

### M04_CALL
*M04_NO_LOOSE_ENDS; heard over the phone, **filtered** (record dry)*

- `MARA_M04_CALL_001`  
  *Direction:* Low, fast, outdoors. No jokes. A different Mara.  
  **Say:** Ash. Where are you? Good. West beach car park. Come alone, take the long way round, and look in your mirrors like you mean it.

- `MARA_M04_CALL_002`  
  *Direction:* Cool. Short.  
  **Say:** And don't tell Darius you're coming. Don't tell anyone.

- `MARA_M04_CALL_003`  
  *Direction:* Quieter. Almost kind.  
  **Say:** I think somebody's been following me since the port. I need a second pair of eyes that doesn't work for Darius.

### M04_DRIVE
*M04_NO_LOOSE_ENDS; heard in the car*

- `MARA_M04_DRIVE_001`  
  *Direction:* Driving, eyes on the mirror. Bright, a tight joke to keep the nerves down.  
  **Say:** Rule one of getaways. You never call it a getaway until you're in it.

- `MARA_M04_DRIVE_002`  
  *Direction:* Quick.  
  **Say:** Ask me in twenty minutes.

### M04_ESCAPE
*M04_NO_LOOSE_ENDS; heard in the car*

- `MARA_M04_ESCAPE_001`  
  *Direction:* Snapping into focus. Sharp, quick.  
  **Say:** Seatbelt. Left at the pier road, then the coast road. Don't talk, just tell me when they're close.

- `MARA_M04_ESCAPE_002`  
  *Direction:* A short, breathless laugh.  
  **Say:** You're really committing to this.

- `MARA_M04_ESCAPE_003`  
  *Direction:* Raw. A bit of the truth leaking through the speed.  
  **Say:** I've been thinking about my brother the whole time. I think he's been running packages for Darius. And I think somebody told them where I'd be.

- `MARA_M04_ESCAPE_004`  
  *Direction:* A broken laugh.  
  **Say:** Always.

- `MARA_M04_ESCAPE_005`  
  *Direction:* Hard, flat.  
  **Say:** Hold on. Not my car, not my insurance, not my problem.

- `MARA_M04_ESCAPE_006`  
  *Direction:* Quiet, once the engines fall behind. Out of breath.  
  **Say:** That's the last of them. Where's the safest place you know?

### M04_MEET
*M04_NO_LOOSE_ENDS; heard face to face*

- `MARA_M04_MEET_001`  
  *Direction:* Leaning on her car, not relaxed. Watching a dark sedan parked far down the row.  
  **Say:** Same car, three days in a row. Different driver each time. Don't turn around, it's not worth it.

- `MARA_M04_MEET_002`  
  *Direction:* Flat.  
  **Say:** I grew up on these roads. I know every car that doesn't belong.

- `MARA_M04_MEET_003`  
  *Direction:* Practical. She has made a plan and does not want to be told it is a bad one.  
  **Say:** There was a second page. After the port, I split my notes. I hid a bag at the cove. Receipts, a flash drive, a log of every delivery I could watch. If something happens to me, that bag is the only record.

- `MARA_M04_MEET_004`  
  *Direction:* A tight, honest shrug.  
  **Say:** Because I can't carry it and drive at the same time. And because nobody else has walked into that warehouse and walked out.

- `MARA_M04_MEET_005`  
  *Direction:* Softer, a half-smile that vanishes. A thank-you she can't say directly.  
  **Say:** And because you didn't hand me a story. You handed me the page.

- `MARA_M04_MEET_006`  
  *Direction:* Back to business, car keys already in her hand.  
  **Say:** The cove. We go in my car, I'll drive, you watch the mirrors. If anything looks wrong, you say so. Out loud. Not nicely.

### M04_SAFE
*M04_NO_LOOSE_ENDS; heard face to face*

- `MARA_M04_SAFE_001`  
  *Direction:* Sitting on the cot, bag across her knees. Her hands won't stop shaking.  
  **Say:** I didn't expect anyone to be there.

- `MARA_M04_SAFE_002`  
  *Direction:* Dry, brittle. The joke is a wall.  
  **Say:** Thinking and expecting are different departments.

- `MARA_M04_SAFE_003`  
  *Direction:* Quiet, finally. This is the confession.  
  **Say:** Mateo. My little brother. He's seventeen. For a year he's been bringing home cash and telling me it's deliveries for a friend's uncle. I let myself believe him because I needed the money more than I needed the truth.

- `MARA_M04_SAFE_004`  
  *Direction:* Looks away.  
  **Say:** If somebody told Darius where I'd be, it came from someone who knows my life. That's a short list. And Mateo's on it.

- `MARA_M04_SAFE_005`  
  *Direction:* Flat, scared.  
  **Say:** I don't know if he's doing it willingly. Or if somebody is making him.

- `MARA_M04_SAFE_006`  
  *Direction:* A long breath. Her shoulders drop an inch.  
  **Say:** I don't... okay. Okay. Thank you.

- `MARA_M04_SAFE_007`  
  *Direction:* Flinching, then flat, defensive.  
  **Say:** Right. Sure. You're right. I'll remember that, next time I'm trying not to get my brother killed.

- `MARA_M04_SAFE_008`  
  *Direction:* Cold. Very controlled.  
  **Say:** Too close. That's funny. That's my family you're calling too close.

- `MARA_M04_SAFE_009`  
  *Direction:* She stands. Quiet, deliberate. It is not a threat; it is a door closing.  
  **Say:** I don't take orders from people I met a week ago.

### M04_SEARCH
*M04_NO_LOOSE_ENDS; heard in the car*

- `MARA_M04_SEARCH_001`  
  *Direction:* Low, whispering as if the gulls could hear. Pointing with her chin.  
  **Say:** Under the concrete step. The lifeguard hut. There.

- `MARA_M04_SEARCH_002`  
  *Direction:* Very still. She is looking at something past Ash's shoulder.  
  **Say:** Ash. Don't move. Headlights. Two cars. Both pointing at us.

- `MARA_M04_SEARCH_003`  
  *Direction:* Not loud. Almost conversational, which is much worse.  
  **Say:** They knew exactly where I'd be. Nobody knew I'd be here. Nobody.

### M05_MARA
*M05_DIRTY_BADGE; heard face to face*

- `MARA_M05_MARA_001`  
  *Direction:* Perched on the bench, tape recorder in her hands, listening to the tape a second time.  
  **Say:** "Let's be precise." Who says that? Who actually talks like that?

- `MARA_M05_MARA_002`  
  *Direction:* Cold. She sets the recorder down very carefully.  
  **Say:** You told him. You told the man on the tape what we found.

- `MARA_M05_MARA_003`  
  *Direction:* Flat.  
  **Say:** That's the point. You never do.

- `MARA_M05_MARA_004`  
  *Direction:* A short, relieved, bitter laugh.  
  **Say:** And you didn't give him everything. Small mercies.

- `MARA_M05_MARA_005`  
  *Direction:* Quiet, practical. She has already set the next thing in motion in her head.  
  **Say:** There's a development called Alder Point. Eviction notices on Wharf Street. A shop owner I know. If this is real, the paperwork is in that neighbourhood, not at the port.

### M06_AFTER
*M06_THE_PEOPLE_WHO_PAY; heard in the car*

- `MARA_M06_AFTER_001`  
  *Direction:* Quiet, once the doors are shut. A smile she can't help.  
  **Say:** You know he's going to remember that.

- `MARA_M06_AFTER_002`  
  *Direction:* Soft, almost to herself.  
  **Say:** I wasn't sure what you'd do. I'm glad I was wrong.

- `MARA_M06_AFTER_003`  
  *Direction:* Cold. Looking out of the window.  
  **Say:** Twenty thousand.

- `MARA_M06_AFTER_004`  
  *Direction:* Tired.  
  **Say:** Not yet.

- `MARA_M06_AFTER_005`  
  *Direction:* Quiet, careful.  
  **Say:** You were very convincing. I need to know whether that was an act.

- `MARA_M06_AFTER_006`  
  *Direction:* A breath, half laugh.  
  **Say:** Mostly. Great. That's going on my tombstone.

- `MARA_M06_AFTER_007`  
  *Direction:* Practical again, rubbing her eyes.  
  **Say:** The files are in your jacket. We have to put them somewhere safe. Somewhere that isn't Darius, and isn't police.

- `MARA_M06_AFTER_008`  
  *Direction:* Honest.  
  **Say:** Lucille said a woman named Priya Nair would be at the diner on Cedar. She writes for the Ledger. She's the only person in this city who's written a word about Wharf Street.

### M06_ALARM
*M06_THE_PEOPLE_WHO_PAY; heard over the phone, **filtered** (record dry)*

- `MARA_M06_ALARM_001`  
  *Direction:* Hissed, urgent. Somewhere behind her a door slams.  
  **Say:** Headlights at the gate. Two vans. They are not your friendly security. Get to the car.

- `MARA_M06_ALARM_002`  
  *Direction:* Fast, controlled.  
  **Say:** Don't speed through the gate, you'll make them remember you. Be a boring man in a boring car. Go.

### M06_CALL
*M06_THE_PEOPLE_WHO_PAY; heard over the phone, **filtered** (record dry)*

- `MARA_M06_CALL_001`  
  *Direction:* Back to brisk. Something eased since the beach, though she would deny it.  
  **Say:** Wharf Street. Ng's Corner Mart. The owner is a woman called Lucille and she is terrifying. Be polite, and don't touch the candy.

### M06_CONTACT
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `MARA_M06_CONTACT_001`  
  *Direction:* Parked outside the diner. Her hand is on the door but she is not opening it.  
  **Say:** Okay. We have a few options and a lot of risk.

- `MARA_M06_CONTACT_002`  
  *Direction:* A nod. She exhales.  
  **Say:** Then let's see if she writes the next one.

- `MARA_M06_CONTACT_003`  
  *Direction:* Quiet, startled.  
  **Say:** You're giving me the only thing that's worth anything.

- `MARA_M06_CONTACT_004`  
  *Direction:* Very quiet.  
  **Say:** He is the voice on the tape.

### M06_EVENT
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `MARA_M06_EVENT_001`  
  *Direction:* Polite, brittle, every muscle tight.  
  **Say:** Mr. Sloane.

- `MARA_M06_EVENT_002`  
  *Direction:* Low, through her teeth.  
  **Say:** Ash.

- `MARA_M06_EVENT_003`  
  *Direction:* A very quiet, very flat laugh that has no humour in it.  
  **Say:** Wow.

- `MARA_M06_EVENT_004`  
  *Direction:* Under her breath, a hard smile.  
  **Say:** There it is.

- `MARA_M06_EVENT_005`  
  *Direction:* Very low, so only Ash can hear.  
  **Say:** I hope you know what you're doing.

### M06_MART
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `MARA_M06_MART_001`  
  *Direction:* Easy, familiar. She has bought candy here since she was nine.  
  **Say:** Lucille. This is Ash. Ash, Lucille Ng. She's run this counter thirty-one years.

- `MARA_M06_MART_002`  
  *Direction:* Quiet.  
  **Say:** Show him the letter, Lucille.

- `MARA_M06_MART_003`  
  *Direction:* Low, practical.  
  **Say:** The whole block got the same letter. Four shops, nine apartments. Every one of them has had a window broken, a fire in a bin, or a rumour in the paper that Wharf Street isn't safe.

### M06_SITE
*M06_THE_PEOPLE_WHO_PAY; heard in the car*

- `MARA_M06_SITE_001`  
  *Direction:* Whisper. The site is quiet, the cranes motionless.  
  **Say:** Trailer by the fence. The pass should get us past the gate guard. Say you're from the lender.

- `MARA_M06_SITE_002`  
  *Direction:* Flat.  
  **Say:** Any lender. Developers love lenders.

- `MARA_M06_SITE_003`  
  *Direction:* Very quiet.  
  **Say:** Public safety. They pay Darius to make it unsafe, and then they pay for the cleanup.

### M07_CALLBACK
*M07_BURN_NOTICE; heard over the phone, **filtered** (record dry)*

- `MARA_M07_CALLBACK_001`  
  *Direction:* Phone. Immediate. No hello.  
  **Say:** I'm here. What do you need?

### M07_DECIDE
*M07_BURN_NOTICE; heard face to face*

- `MARA_M07_DECIDE_001`  
  *Direction:* Quiet, from the doorway.  
  **Say:** That's the scariest thing you could've done.

### M07_ESCAPE
*M07_BURN_NOTICE; heard over the phone, **filtered** (record dry)*

- `MARA_M07_ESCAPE_001`  
  *Direction:* Distant, cold, but she picked up.  
  **Say:** I saw it on a scanner. Whatever you did, you did it without me. Head for the room. I'll decide when I get there whether to be there.

- `MARA_M07_ESCAPE_002`  
  *Direction:* Fast, sharp, ready. Engines in the background.  
  **Say:** I'm two blocks east. I've got the scanner. They're sending three cars, not four, the fourth went for the garage.

- `MARA_M07_ESCAPE_003`  
  *Direction:* Quick.  
  **Say:** Don't go home. Don't go to Eddie. Drive like you're late and make them follow you. I'll clear the street.

- `MARA_M07_ESCAPE_004`  
  *Direction:* Tight, calling out the turns.  
  **Say:** Left. Left! Under the highway, they'll lose a block.

- `MARA_M07_ESCAPE_005`  
  *Direction:* A sharp laugh, adrenaline.  
  **Say:** You really know how to find trouble. I almost admire it.

### M07_MARA
*M07_BURN_NOTICE; heard face to face*

- `MARA_M07_MARA_001`  
  *Direction:* In the doorway. She came the moment she could. Steady.  
  **Say:** I'm not going anywhere. I want that said out loud.

- `MARA_M07_MARA_002`  
  *Direction:* Tight. Her jaw sets.  
  **Say:** I know. I called him. He's at his friend's place. I told him to stay there and not answer the door. He thinks I'm being dramatic.

- `MARA_M07_MARA_003`  
  *Direction:* Very steady.  
  **Say:** I'm done being a person who watches. Whatever we do, we do it together.

- `MARA_M07_MARA_004`  
  *Direction:* Arms folded, leaning in the doorway. Calm and careful.  
  **Say:** Okay. Talk to me. Everything. Not the version where you're a hero. The one where you made choices.

- `MARA_M07_MARA_005`  
  *Direction:* A long look. Then, slowly.  
  **Say:** Prove it. Not with words. With what you do next, because the next thing has my brother in it.

- `MARA_M07_MARA_006`  
  *Direction:* A bag over her shoulder. Cold, completely composed. She has packed.  
  **Say:** I came to say goodbye. Not to you. To this. I'm taking Mateo and I'm going somewhere that isn't Port Alder.

- `MARA_M07_MARA_007`  
  *Direction:* Flat.  
  **Say:** I'm not leaving you. I'm leaving a mess you chose not to ask me about. You didn't listen, Ash.

- `MARA_M07_MARA_008`  
  *Direction:* A hard, tired silence. Then she puts the bag down, slowly.  
  **Say:** One. Because of Mateo. Not because of you.

### M08_CALL
*M08_THE_LAST_WITNESS; heard over the phone, **filtered** (record dry)*

- `MARA_M08_CALL_001`  
  *Direction:* Fast, working it out as she says it.  
  **Say:** Walt hasn't been to work in six days. His neighbour says he's fishing at the point. Walt doesn't fish. He's hiding. North Point lighthouse.

- `MARA_M08_CALL_002`  
  *Direction:* Urgent.  
  **Say:** If Walt kept anything, that's where it is. And if I can work it out, so can Darius.

### M08_DECIDE
*M08_THE_LAST_WITNESS; heard face to face*

- `MARA_M08_DECIDE_001`  
  *Direction:* Arriving, winded, hair wild. Looks at the envelope, then at Ash.  
  **Say:** That's the last piece. Tell me what we're doing with it.

- `MARA_M08_DECIDE_002`  
  *Direction:* Slowly. She is impressed in spite of herself.  
  **Say:** Dana Whitfield. The one who photographed Rowan's logbook. Okay. Okay, that's a person with a spine.

- `MARA_M08_DECIDE_003`  
  *Direction:* Hard, flat, alarmed.  
  **Say:** Ash, the only detective you know is on the tape.

- `MARA_M08_DECIDE_004`  
  *Direction:* Very quiet.  
  **Say:** That's a lot of faith in a man who says "let's be precise."

- `MARA_M08_DECIDE_005`  
  *Direction:* A nod. Relief, firm.  
  **Say:** Priya. She can't be bought. She can be fired, but she can't be bought.

- `MARA_M08_DECIDE_006`  
  *Direction:* Slowly, not agreeing.  
  **Say:** And when somebody decides to start?

### M08_RUN
*M08_THE_LAST_WITNESS; heard over the phone, **filtered** (record dry)*

- `MARA_M08_RUN_001`  
  *Direction:* Fast, breathless, the engine loud around her.  
  **Say:** They've got a second set of cars on the coast road. Don't go that way. Cut through the industrial blocks.

- `MARA_M08_RUN_002`  
  *Direction:* Quick, steadier.  
  **Say:** And somebody put in a call. Listen to the scanner. There's a lot of police on the way and none of them for them.

### M08_SIEGE
*M08_THE_LAST_WITNESS; heard over the radio, **filtered** (record dry)*

- `MARA_M08_SIEGE_001`  
  *Direction:* Over the radio. Sharp, quick, breathless.  
  **Say:** Three cars. They're spreading out for the lighthouse. Don't let them near the door.

- `MARA_M08_SIEGE_002`  
  *Direction:* A short, grim laugh.  
  **Say:** That's the spirit. Keep them off him, Ash. Ram them. Smoke them. I don't care, just don't let them get close.

### M09_ALLIES
*M09_PORT_ALDER_BURNING; heard face to face*

- `MARA_M09_ALLIES_001`  
  *Direction:* Pulling a duffel from her car. Crisp. Loose and almost cheerful. A woman who has stopped being afraid of being counted.  
  **Say:** Mateo's at Lucille's. Lucille has a baseball bat and an opinion about everyone who walks in. I've never felt safer about anything.

- `MARA_M09_ALLIES_002`  
  *Direction:* Arms folded. Professional. A little cool.  
  **Say:** I'm here for Mateo. After tonight I'll decide what I think of you. Fair?

- `MARA_M09_ALLIES_003`  
  *Direction:* Flat. She is on time, and has not forgiven anything.  
  **Say:** I'm only here because the alternative is worse. Don't say anything nice. I'll know it's a trick.

- `MARA_M09_ALLIES_004`  
  *Direction:* Straight to it. She spreads a map of the port across the bench.  
  **Say:** Three stages. The container yard first. PAC-4471 is the container that started this. Whatever's inside is why everyone has been running for six months. We find it, we get it out. Darius will be at the docks, because Darius always is. After that, Sloane.

- `MARA_M09_ALLIES_005`  
  *Direction:* A flash of her old grin.  
  **Say:** It's not. I just say it with confidence.

### M09_DRIVE
*M09_PORT_ALDER_BURNING; heard in the car*

- `MARA_M09_DRIVE_001`  
  *Direction:* Driving. Dry, to cover the nerves.  
  **Say:** If this goes well, I'm going to tell everyone I planned it.

### M09_EPI_A3
*M09_PORT_ALDER_BURNING; heard face to face*

- `MARA_M09_EPI_A3_001`  
  *Direction:* Leaning on the rail at the end of the pier, bag at her feet. Easy, open, the sun on her face. She is smiling, which she does not do often.  
  **Say:** Mateo got a place on a program in the city. Not the docks. A real one. I looked at the map, and for the first time it didn't look like a trap.

- `MARA_M09_EPI_A3_002`  
  *Direction:* Light.  
  **Say:** I'm going for a while. Not leaving. There's a difference. And I thought you might want to come with me and find out what it is.

- `MARA_M09_EPI_A3_003`  
  *Direction:* Looking at the water. Careful and honest.  
  **Say:** You did the right thing in the end. I can say that. I can also say I'm not sure how I feel about the road that got us here.

- `MARA_M09_EPI_A3_004`  
  *Direction:* A half-smile.  
  **Say:** Mateo's safe. That's all I'll say about it. For now.

- `MARA_M09_EPI_A3_005`  
  *Direction:* At the rail. Cool and distant, a bag already packed.  
  **Say:** You were right about the evidence. You were wrong about me. I don't think I'll ever stop thinking about both.

- `MARA_M09_EPI_A3_006`  
  *Direction:* Flat. Not unkind.  
  **Say:** Somewhere that isn't a mess you chose not to ask me about.

### M09_EPI_C3
*M09_PORT_ALDER_BURNING; heard face to face*

- `MARA_M09_EPI_C3_001`  
  *Direction:* Behind the wheel of her car at the end of the East Jetty, engine running. She has Mateo in the back seat, asleep. She grins when she sees Ash, a flash of the old Mara.  
  **Say:** The tank's full. I've got a map and a very tired brother. Get in or don't, but you've got about eleven seconds.

- `MARA_M09_EPI_C3_002`  
  *Direction:* Easy.  
  **Say:** Anywhere that isn't here.

- `MARA_M09_EPI_C3_003`  
  *Direction:* At the jetty, her car already loaded. Mateo sits in the back seat, pretending not to listen. Very cool.  
  **Say:** You burned everything. The whole thing. I want you to know I understand why. I also want you to know I'm not coming with you.

- `MARA_M09_EPI_C3_004`  
  *Direction:* A tight, honest half smile.  
  **Say:** That's the nicest thing you've ever said.

### M09_FLEE
*M09_PORT_ALDER_BURNING; heard over the radio, **filtered** (record dry)*

- `MARA_M09_FLEE_001`  
  *Direction:* Over the radio, sharp.  
  **Say:** He's heading for the bridge. Cut him off or he's gone.

### M09_HOLD
*M09_PORT_ALDER_BURNING; heard over the radio, **filtered** (record dry)*

- `MARA_M09_HOLD_001`  
  *Direction:* Crisp, calling it. She has taken the wheel.  
  **Say:** Cars at the gate and cars coming up the service road. We're not going to sit still.

- `MARA_M09_HOLD_002`  
  *Direction:* A short, breathless laugh.  
  **Say:** Eddie Vale. Backseat hero.

### M09_SLOANE
*M09_PORT_ALDER_BURNING; heard face to face*

- `MARA_M09_SLOANE_001`  
  *Direction:* Low, through her teeth. She is standing right behind Ash.  
  **Say:** Don't you dare.

- `MARA_M09_SLOANE_002`  
  *Direction:* Barely a voice. It is not anger; it is grief.  
  **Say:** You knew him. Eddie. You were in his back room.

### M09_YARD
*M09_PORT_ALDER_BURNING; heard in the car*

- `MARA_M09_YARD_001`  
  *Direction:* Whispering. The yard is huge and silent, row after row of containers.  
  **Say:** Row twelve. Blue door. There it is. PAC-4471.

- `MARA_M09_YARD_002`  
  *Direction:* Very quiet. Her voice cracks on the last word.  
  **Say:** Six months. And it's been here the entire time. Sitting in a yard they thought no one would look at.

### R01_CALL
*R01_CLEAN_MONEY; heard over the phone, **filtered** (record dry)*

- `MARA_R01_CALL_001`  
  *Direction:* On the phone. Quick, businesslike, a little shy about it.  
  **Say:** I need a favour. Not a Darius favour. A clean one. A courier job for the hospital: lab samples from the dealership side. Legal, boring, twelve hundred dollars.

- `MARA_R01_CALL_002`  
  *Direction:* Dry.  
  **Say:** That's a quarter of my ticket out. I've been saving for two years. I'm not telling you why I trust you with it. I'm just telling you I do.

### R01_DONE
*R01_CLEAN_MONEY; heard face to face*

- `MARA_R01_DONE_001`  
  *Direction:* Counting the money into an envelope. She doesn't look up.  
  **Say:** Okay. Twelve hundred. That's thirty-one hundred. I need five. I've started to do the maths in my sleep.

- `MARA_R01_DONE_002`  
  *Direction:* Looks up. A flash of something unguarded.  
  **Say:** Out. Me and Mateo. Somewhere with a school he can get into and a street I'm not afraid of. I've got a map on my wall.

### R01_DRIVE
*R01_CLEAN_MONEY; heard over the phone, **filtered** (record dry)*

- `MARA_R01_DRIVE_001`  
  *Direction:* Light. She can hear the car through the phone.  
  **Say:** Legal speeds. Seatbelt. Pretend you're a nice person. It's good practice.

### R02_CALL
*R02_MATEO; heard over the phone, **filtered** (record dry)*

- `MARA_R02_CALL_001`  
  *Direction:* On the phone. Tight, a little ashamed to be asking.  
  **Say:** Mateo's at the park. He won't talk to me. He'll talk to you. You're not a sister. You're a stranger. Strangers are easier.

### R03_PLAN
*R03_THE_PLAN; heard face to face*

- `MARA_R03_PLAN_001`  
  *Direction:* Leaning on her car, a ticket in her hand. The first real calm.  
  **Say:** Four thousand eight hundred. Two hundred short. I'm going to say it out loud. I'm afraid.

- `MARA_R03_PLAN_002`  
  *Direction:* Dry.  
  **Say:** Of staying. Of being the person who stayed. What would you do?

- `MARA_R03_PLAN_003`  
  *Direction:* A shaky, grateful exhale.  
  **Say:** You're telling me to leave. And I thought you were going to ask me to stay.

- `MARA_R03_PLAN_004`  
  *Direction:* A slow, tired smile.  
  **Say:** That is manipulative and I love it.

- `MARA_R03_PLAN_005`  
  *Direction:* Quiet, a flinch she hides.  
  **Say:** Right. Not fair. Got it.

## Detective Rowan (`ROWAN`)

**Role:** the compromised detective  
**Voice:** Mature, fifties.  
**Direction:** Calm, measured, controlled. Menace comes from precise wording and long pauses, never volume.  
**Accent:** Educated American, neutral.  
**Pace:** Slow and deliberate. Let the pauses sit.  
**Range:** Very narrow until the last scene.  
**Pronunciation:** Rowan: "ROH-un"  
**Recording notes:** Dry and close. Record a clean version of each line with no breath noise at the start; the silences are part of the performance.

**Who they are:** Joined the force believing he could change things. Years of pressure and compromises made him part of what he once fought.

**Wants:** Keep his position, protect his family from ruin, and believe that he prevents worse people from taking over.  
**Fears:** Being seen clearly by his daughter.  
**Hides:** He feeds selected information to Darius and has buried evidence about Sloane's redevelopment.  
**Arc:** Helpful at first; his explanations get harder to reconcile with the evidence. Becomes an enemy, a reluctant source, or a witness.

33 lines, 626 words.

### H09_ROWAN1
*HANGOUT (talk to people in the city); heard face to face*

- `ROWAN_H09_ROWAN1_001`  
  *Direction:* Calm, hands folded.  
  **Say:** I'd prefer we spoke elsewhere. I don't care for being overheard.

### M05_CALL
*M05_DIRTY_BADGE; heard over the phone, **filtered** (record dry)*

- `ROWAN_M05_CALL_001`  
  *Direction:* Calm, courteous. A man who has never needed to raise his voice.  
  **Say:** Ash. Detective Rowan, Port Alder police. I hope this isn't a bad time. I think we might be interested in the same shipment.

- `ROWAN_M05_CALL_002`  
  *Direction:* A short pause. He lets it sit.  
  **Say:** There's a bench in City Plaza by the clock tower. Public place. Nobody will be taking notes. I'd like to buy you a coffee and trade a few facts.

### M05_DECIDE
*M05_DIRTY_BADGE; heard face to face*

- `ROWAN_M05_DECIDE_001`  
  *Direction:* Gently, as if the tape had not played. He has made himself a person with nothing to hide.  
  **Say:** Now, Ash. What do I tell my captain? What did you find at the warehouse?

- `ROWAN_M05_DECIDE_002`  
  *Direction:* A very small smile. He has what he came for.  
  **Say:** Thank you. That is exactly what I needed to know. I'll see it is handled properly.

- `ROWAN_M05_DECIDE_003`  
  *Direction:* Studying Ash for exactly one second too long. Then pleasant.  
  **Say:** Of course. We'll keep this between us.

- `ROWAN_M05_DECIDE_004`  
  *Direction:* Very calm. The temperature in the yard drops a degree.  
  **Say:** A wise caution. I will remember that you offered it.

### M05_DRIVE
*M05_DIRTY_BADGE; heard over the phone, **filtered** (record dry)*

- `ROWAN_M05_DRIVE_001`  
  *Direction:* On the phone, driving ahead. Even, unhurried.  
  **Say:** The holding yard, north of the station. I will meet you at the gate. Stay in your car until I wave you in. The officers on duty are good people. They don't need to remember you.

### M05_MEET
*M05_DIRTY_BADGE; heard face to face*

- `ROWAN_M05_MEET_001`  
  *Direction:* Seated, two coffees on the bench. Pleasant, measured. He doesn't stand.  
  **Say:** Thank you for coming. Sit. The coffee is better than it has any right to be.

- `ROWAN_M05_MEET_002`  
  *Direction:* A thin smile. He is not offended.  
  **Say:** I did. Let me start with mine. For eighteen months this department has been trying to understand a pattern. Stolen vehicles. Cargo that goes missing from the port and comes back as something else. Evictions in places that are conveniently quiet at night.

- `ROWAN_M05_MEET_003`  
  *Direction:* Slow. Each sentence chosen.  
  **Say:** Every time we get close, someone higher up reminds us that the port is a political subject. I won't name them. You would learn nothing.

- `ROWAN_M05_MEET_004`  
  *Direction:* A very small pause. His eyes do not move.  
  **Say:** I'm a cautious one. That's often the same thing from a distance.

- `ROWAN_M05_MEET_005`  
  *Direction:* Gentler. Almost fatherly.  
  **Say:** The warehouse. I understand you went through rack nine, behind the blue containers. I understand someone was waiting at the gate with a flashlight. And I understand you did not take what you came for.

- `ROWAN_M05_MEET_006`  
  *Direction:* Smooth. Not a flicker.  
  **Say:** The incident report.

- `ROWAN_M05_MEET_007`  
  *Direction:* He sips his coffee. A deliberate silence. Then he says it as if it were nothing.  
  **Say:** Reports are very thorough, when I'm the one who writes them.

- `ROWAN_M05_MEET_008`  
  *Direction:* Setting the cup down. Patient.  
  **Say:** I have access to an evidence room that has seen better days. If you'll let me, I'd like to show you something you may find useful. And in return, I'd like to know what you took.

- `ROWAN_M05_MEET_009`  
  *Direction:* Mild. He has read the room.  
  **Say:** And I suspect you've already decided what to do with whatever you found. I only ask that you hear me out.

### M05_TAPE
*M05_DIRTY_BADGE; heard over the radio, **filtered** (record dry); shown as "Recording"*

- `ROWAN_M05_TAPE_001`  
  *Direction:* Recorded, distorted, a man who does not want to be heard. Flat. Precise.  
  **Say:** Let's be precise. They'll find only what I put in front of them.

### M05_YARD
*M05_DIRTY_BADGE; heard face to face*

- `ROWAN_M05_YARD_001`  
  *Direction:* Quiet, a hand on the gate. He glances once at the cameras.  
  **Say:** The cameras are on a loop. I wouldn't take the loop personally.

- `ROWAN_M05_YARD_002`  
  *Direction:* A single, controlled nod.  
  **Say:** I can do a number of things.

- `ROWAN_M05_YARD_003`  
  *Direction:* Pointing, without pointing, at a stack of boxes under a tarpaulin.  
  **Say:** Box four, on the right. Property from a locker at Berth Nine, taken five years ago. Nobody ever signed for it.

- `ROWAN_M05_YARD_004`  
  *Direction:* Gentle, with the patience of a man who has told this story before.  
  **Say:** I could tell you that was a missing person case that was never closed. It isn't my case to open. It is, apparently, yours.

- `ROWAN_M05_YARD_005`  
  *Direction:* The first real silence. Then, smoothly.  
  **Say:** Evidence. I haven't listened to it. I'd prefer someone with less to lose did.

### M09_ALARM
*M09_PORT_ALDER_BURNING; heard over the phone, **filtered** (record dry)*

- `ROWAN_M09_ALARM_001`  
  *Direction:* Calm, courteous, almost sorry. A police radio murmurs behind him.  
  **Say:** Ash. Good evening. You're in a restricted area. I'd advise you step away from the container.

- `ROWAN_M09_ALARM_002`  
  *Direction:* A very small pause.  
  **Say:** I'm always quick. It's the only reason I've lasted.

- `ROWAN_M09_ALARM_003`  
  *Direction:* Gently. A man being reasonable.  
  **Say:** There are four patrol cars at the gate. They will not harm you if you put the cabinet down. I'd much rather this were quiet.

### M09_ROWAN
*M09_PORT_ALDER_BURNING; heard face to face*

- `ROWAN_M09_ROWAN_001`  
  *Direction:* Arriving alone, coat buttoned. The same calm voice. It no longer sounds like control; it sounds like fatigue.  
  **Say:** Ash. I think we should speak before anyone else arrives.

- `ROWAN_M09_ROWAN_002`  
  *Direction:* A very long pause. Longer than any pause he has used.  
  **Say:** Let's be precise. I was, and I am not proud of it.

- `ROWAN_M09_ROWAN_003`  
  *Direction:* Slowly. He is speaking to someone who is not Ash.  
  **Say:** I joined to make a difference. In the first years, I did. Then someone made a call about my daughter's tuition, and the next day a report was misplaced, and the day after that I was the person who misplaced them. It is remarkably easy. That's what I would like you to understand. It is not a decision; it is a series of small mercies you grant yourself.

- `ROWAN_M09_ROWAN_004`  
  *Direction:* Dry. Almost a smile. His hands are open at his sides.  
  **Say:** Now I have a cabinet of evidence to arrest and a conscience that has become, inconveniently, very loud.

- `ROWAN_M09_ROWAN_005`  
  *Direction:* Studying her. Then, very quietly, a faint, relieved, broken exhale.  
  **Say:** Officer Whitfield. I was very much hoping it would be you.

- `ROWAN_M09_ROWAN_006`  
  *Direction:* A pause. Then something that is almost a laugh.  
  **Say:** I do. How very precise of you.

- `ROWAN_M09_ROWAN_007`  
  *Direction:* Very quiet, behind them.  
  **Say:** No. But it would have been nice to borrow one.

## Victor Sloane (`SLOANE`)

**Role:** the developer  
**Voice:** Refined, early sixties.  
**Direction:** Confident, understated, courteous. Threats sound like helpful suggestions. Never raises his voice.  
**Accent:** Polished American, hint of boarding school, not British.  
**Pace:** Unhurried; every sentence sounds pre-approved.  
**Range:** Narrow and smooth.  
**Pronunciation:** Sloane: "slohn"; Alder Point: "AWL-der point"  
**Recording notes:** Warm, intimate mic. He is always almost smiling.

**Who they are:** Built a reputation buying neglected property and promising to revive it. His waterfront project promises jobs, housing and a modern district.

**Wants:** Finish the redevelopment, consolidate his empire, secure a political legacy.  
**Fears:** Being ordinary; a ledger with his handwriting in it.  
**Hides:** The criminal network was used to frighten owners into selling, move stolen cargo and bury inconvenient evidence.  
**Arc:** Sees Ash as a useful, disposable outsider, then tries to recruit, discredit, intimidate or remove them.

25 lines, 490 words.

### M00_RADIO
*M00_ARRIVAL; heard over the radio*

- `SLOANE_M00_RADIO_001`  
  *Direction:* Calm, polished radio-ad voice. Warm, never salesy.  
  **Say:** Port Alder is changing. Alder Point: a waterfront for everyone. Jobs, homes, and a skyline we can all be proud of. Sloane Development. Building what comes next.

### M06_EVENT
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `SLOANE_M06_EVENT_001`  
  *Direction:* Smooth, courteous, arriving as though the room were his. He holds out a hand and takes his time.  
  **Say:** Mr. Ash. Or Ms. Ash. I'm told the preference doesn't matter. Victor Sloane. Thank you for coming to the reception.

- `SLOANE_M06_EVENT_002`  
  *Direction:* To Mara, warm.  
  **Say:** Ms. Cruz. A pleasure. Your family has been delivering to the waterfront for years. We value that, as I'm told they value us.

- `SLOANE_M06_EVENT_003`  
  *Direction:* To Ash, the soft focus of a man doing a favour.  
  **Say:** I understand you've been touring Wharf Street. It's a disgrace what has happened there, honestly. I'm trying to help those people leave before it gets worse. It's the only decent thing to do.

- `SLOANE_M06_EVENT_004`  
  *Direction:* A gentle, rueful smile. He is not threatened. He is delighted to be understood.  
  **Say:** Emotional people say remarkable things. You and I are practical, I think. May I be practical?

- `SLOANE_M06_EVENT_005`  
  *Direction:* Steady, as if reading out a menu.  
  **Say:** I have a project that will employ four thousand people. A handful of unhappy owners are a regrettable cost. I'd like to prevent anyone from being hurt.

- `SLOANE_M06_EVENT_006`  
  *Direction:* Taking out an envelope and leaving it on the table between them, very gently.  
  **Say:** Twenty thousand dollars. In return, a quiet understanding: that whatever you've borrowed, you will return, and whatever you're planning to say, you will say nothing at all. It isn't a threat. It is, if anything, a very generous kind of advice.

- `SLOANE_M06_EVENT_007`  
  *Direction:* Mild. He has heard her and ignored it with perfect manners.  
  **Say:** Take a moment. I have all evening.

- `SLOANE_M06_EVENT_008`  
  *Direction:* Delighted, and not showing it too much.  
  **Say:** That is all anyone can ask. Thank you. I'm sure we will understand each other.

- `SLOANE_M06_EVENT_009`  
  *Direction:* Not a flicker of anger. He picks it up, and puts it away like a man putting away a pen.  
  **Say:** Very well. I regret that. I do hope the two of you stay safe in the city. It can be unpredictable.

- `SLOANE_M06_EVENT_010`  
  *Direction:* A small, approving nod.  
  **Say:** A practical answer. I do appreciate practical people.

- `SLOANE_M06_EVENT_011`  
  *Direction:* Parting, courteous. He is already looking at someone else in the room.  
  **Say:** Enjoy the evening. The shrimp are excellent. Please don't let anyone tell you otherwise.

### M09_EPI_B1
*M09_PORT_ALDER_BURNING; heard over the radio*

- `SLOANE_M09_EPI_B1_001`  
  *Direction:* The radio ad again, ever so slightly changed. Gentle, wry, satisfied.  
  **Say:** Port Alder is changing. Alder Point: a waterfront for everyone. Now open to the public. Sloane Development. Building what comes next.

### M09_SLOANE
*M09_PORT_ALDER_BURNING; heard face to face*

- `SLOANE_M09_SLOANE_001`  
  *Direction:* In the lobby of Harbor Tower at night, alone, immaculate, holding a cufflink. He greets Ash as if they had agreed to meet.  
  **Say:** Ash. Good evening. I wondered whether you would find your way here.

- `SLOANE_M09_SLOANE_002`  
  *Direction:* A gentle smile.  
  **Say:** I am always alone. It's what keeps one from getting sentimental.

- `SLOANE_M09_SLOANE_003`  
  *Direction:* Calm. As if describing a weather system.  
  **Say:** You have a cabinet of paper. I have a city. If you give it to a reporter, a number of people will lose their jobs, and some will lose more than that. The project will fail. Four thousand jobs. The waterfront will be left as it was, derelict, until it is eventually bought by someone less patient.

- `SLOANE_M09_SLOANE_004`  
  *Direction:* Mild.  
  **Say:** You accepted my envelope once. I did notice. It tells me a great deal about you. I think we could do business.

- `SLOANE_M09_SLOANE_005`  
  *Direction:* Mild.  
  **Say:** You refused my first offer. I admired it. I hope you will forgive me for making a better one.

- `SLOANE_M09_SLOANE_006`  
  *Direction:* Taking a slim folder from his jacket. He makes it sound like a gift.  
  **Say:** Fifty thousand dollars. A clean record. A new life. A place at the table, if you want one. Or an end to it all, if you prefer. There is room for you in whatever I build next.

- `SLOANE_M09_SLOANE_007`  
  *Direction:* Gently, almost fond.  
  **Say:** The alternative is that you give it away, and a great many people will be very angry with you, including some I can no longer restrain.

- `SLOANE_M09_SLOANE_008`  
  *Direction:* Tilting his head. He is, for the first time, mildly interested.  
  **Say:** Including this.

- `SLOANE_M09_SLOANE_009`  
  *Direction:* A small, almost admiring exhale. The first unplanned sound he has made.  
  **Say:** How very impractical of you.

- `SLOANE_M09_SLOANE_010`  
  *Direction:* A warm, pleased smile.  
  **Say:** That's all I ever wanted. A practical conversation.

- `SLOANE_M09_SLOANE_011`  
  *Direction:* For the first time, a flicker of alarm.  
  **Say:** That is, I think, rather foolish.

### X01_AD
*CAR RADIO (ambient broadcasts); heard over the radio*

- `SLOANE_X01_AD_001`  
  *Direction:* Polished, warm.  
  **Say:** Alder Point. A waterfront for everyone. Sloane Development. Building what comes next.

## Darius King (`DARIUS`)

**Role:** the local boss  
**Voice:** Charismatic, forties.  
**Direction:** Warm, funny, generous early on, so the threats later land harder. Likeable first, frightening second.  
**Accent:** Local Port Alder, relaxed American. Do not play a stereotype.  
**Pace:** Loose, rhythmic; he enjoys his own jokes.  
**Range:** Wide: laughing to flat and cold.  
**Pronunciation:** Darius: "DAIR-ee-us"  
**Recording notes:** Close, warm. Smile in the early lines. In M07 and M09 take the smile out completely.

**Who they are:** Built an operation on stolen vehicles, cargo theft and illegal deliveries. Presents himself as a neighbourhood businessman who understands how the city really works.

**Wants:** Keep control of his network and not become disposable to richer people like Sloane.  
**Fears:** Being used up and thrown away.  
**Hides:** He knows the redevelopment is using him, and plans to take a bigger share.  
**Arc:** Treats Ash like a promising recruit; turns viciously on anyone he decides has betrayed him.

43 lines, 771 words.

### D02_CALL
*D02_BORROWED_CAR; heard over the phone, **filtered** (record dry)*

- `DARIUS_D02_CALL_001`  
  *Direction:* Warm, playful, theatrical. He is clearly enjoying it.  
  **Say:** Ash! Ash, Ash, Ash. Port Alder has a very bad habit of buying cars it can't afford. I'd like to help one of them find a new home.

- `DARIUS_D02_CALL_002`  
  *Direction:* Chuckling.  
  **Say:** Sports car, dealership lot, nice and visible. Bring it to the depot. The police might be a little curious. Don't be a hero. Be a driver.

### D02_DONE
*D02_BORROWED_CAR; heard face to face*

- `DARIUS_D02_DONE_001`  
  *Direction:* Walking around the stolen car with his hands behind his back, grinning like a man at a gallery.  
  **Say:** Perfect. Not a scratch and a police chase to boot. You're wasted on Eddie, you know that? A man of your talents, fixing brakes.

- `DARIUS_D02_DONE_002`  
  *Direction:* A big, delighted laugh.  
  **Say:** See? That's why I like you. You're funny. Nobody's funny in Port Alder. They're just loud.

### H08_DARIUS1
*HANGOUT (talk to people in the city); heard face to face*

- `DARIUS_H08_DARIUS1_001`  
  *Direction:* Big, friendly, a hand on Ash's shoulder.  
  **Say:** My favourite driver! Eat something. You look like you've been thinking. Thinking is how people lose weight.

### M02_DEPOT
*M02_EASY_MONEY; heard face to face*

- `DARIUS_M02_DEPOT_001`  
  *Direction:* Warm, loud, arriving with his arms open like this is a party.  
  **Say:** There he is! The driver who doesn't crash!

- `DARIUS_M02_DEPOT_002`  
  *Direction:* Walks a circle around the car. Delighted by it, delighted by everything.  
  **Say:** Look at that. Not a scratch. You know how many people I send out for a simple pickup, and what comes back? Dents. Excuses. One time, a goat. Don't ask.

- `DARIUS_M02_DEPOT_003`  
  *Direction:* A big laugh, a hand on Ash's shoulder. It lands lightly and stays.  
  **Say:** I like him. Mara, I like him. Mr. Eddie's got himself some good hands. Come. Come in the shade. Jojo, get this person a cold drink.

- `DARIUS_M02_DEPOT_004`  
  *Direction:* Counting bills with a showman's flourish, putting them into Ash's hand without being asked.  
  **Say:** Eight hundred. Don't argue, it's embarrassing. Here is my one rule, my friend, and it's free. Port Alder rewards the people who get things done and don't ask what they're getting done. I'm a very generous man to people like that.

- `DARIUS_M02_DEPOT_005`  
  *Direction:* Warm. Perfectly sincere. That's what makes it unsettling.  
  **Say:** It's not for the car. It's for the quiet.

- `DARIUS_M02_DEPOT_006`  
  *Direction:* The smile stays. The eyes follow the police car, steady and unhurried. He says nothing until it is gone.  
  **Say:** Hm.

- `DARIUS_M02_DEPOT_007`  
  *Direction:* Back in the joke, as if nothing happened.  
  **Say:** Port Alder police. Always on time and never in the right place. Come back soon, Ash. Mara, a word.

### M03_AFTER
*M03_THE_WRONG_PACKAGE; heard over the phone, **filtered** (record dry)*

- `DARIUS_M03_AFTER_001`  
  *Direction:* Warm, genuinely curious. Fishing, with a smile in his voice.  
  **Say:** Ash! You're breathing! I've been telling everyone you're a legend. Did you get my case?

- `DARIUS_M03_AFTER_002`  
  *Direction:* A big, delighted laugh with no tension in it at all, which is very much worth noticing.  
  **Say:** Wonderful. Wonderful. See? That's all this is. Nothing has to be hard. You're a good man, Ash. Nobody ever gave me a reason to doubt you.

- `DARIUS_M03_AFTER_003`  
  *Direction:* A very small pause. The smile does not leave his voice. It sounds slightly less like a person.  
  **Say:** That's strange. Because it was supposed to be. Hm.

- `DARIUS_M03_AFTER_004`  
  *Direction:* Warm again, rolling over it. A joke, an invitation.  
  **Say:** It's fine. It's paperwork. I'll sort it out. Get some rest, friend. We'll talk soon.

### M03_CALL
*M03_THE_WRONG_PACKAGE; heard over the phone, **filtered** (record dry)*

- `DARIUS_M03_CALL_001`  
  *Direction:* Warm, friendly, speaking from a car. Treats it like a favour between friends.  
  **Say:** Ash! My favourite driver. Are you sitting? Don't sit. This is a standing kind of job.

- `DARIUS_M03_CALL_002`  
  *Direction:* Easy, naming it as if it were nothing.  
  **Say:** There's a sealed hard case in Warehouse 14, down at the port. It's mine, it's paperwork, it's boring. A shipment leaves tonight and the case is going with it by mistake. I'd like it to stay in Port Alder, with me, like a good citizen.

- `DARIUS_M03_CALL_003`  
  *Direction:* A little joke to cover the weight.  
  **Say:** See Walt Pruitt at the gate. He knows nothing and loves it. Tell him it's for me.

- `DARIUS_M03_CALL_004`  
  *Direction:* A fraction too fast, still cheerful.  
  **Say:** It will be. Be quick, be polite, and be home for dinner.

### M05_TAPE
*M05_DIRTY_BADGE; heard over the radio, **filtered** (record dry); shown as "Recording"*

- `DARIUS_M05_TAPE_001`  
  *Direction:* Recorded, hissy. Warm, mid-laugh, a little drunk on his own cleverness.  
  **Say:** ...and the harbor squad? They're covered?

- `DARIUS_M05_TAPE_002`  
  *Direction:* Recorded. A big, easy laugh.  
  **Say:** That's why I love working with professionals.

### M07_DECIDE
*M07_BURN_NOTICE; heard face to face*

- `DARIUS_M07_DECIDE_001`  
  *Direction:* Voice message, recorded. Lazy and warm and terrifying in the exact same breath.  
  **Say:** That's fine. I like a man who knows what he wants. A week is a very long time.

- `DARIUS_M07_DECIDE_002`  
  *Direction:* Voice message, recorded. Delighted.  
  **Say:** Now we're talking. Business is just talking with better manners.

### M07_TRAP
*M07_BURN_NOTICE; heard over the phone, **filtered** (record dry)*

- `DARIUS_M07_TRAP_001`  
  *Direction:* On the phone. Still warm. Every word relaxed, and not a trace of a smile left under it.  
  **Say:** Ash. Don't run. It's undignified. I've sent some friends to bring you home.

- `DARIUS_M07_TRAP_002`  
  *Direction:* Soft. Hurt, almost, in a way that makes it worse.  
  **Say:** See, that. That's what I can't forgive. Who gave you your first eight hundred dollars? Who put your name in the right ears? Who let you walk into my yard like family?

- `DARIUS_M07_TRAP_003`  
  *Direction:* A low, patient breath. He is being very reasonable.  
  **Say:** You went to Mara. You went to a journalist, or you're about to. You took a thing that belongs to me and showed it to people who don't love this city the way I do.

- `DARIUS_M07_TRAP_004`  
  *Direction:* Gently, as if he were asking about the family.  
  **Say:** How is Mara's brother? Mateo, isn't it? Seventeen. Lovely boy. He carries a bag very well.

- `DARIUS_M07_TRAP_005`  
  *Direction:* The warmth drains from the voice all at once. Flat.  
  **Say:** I'm not threatening, Ash. I'm telling you about the weather. It's about to change.

### M09_DARIUS
*M09_PORT_ALDER_BURNING; heard face to face*

- `DARIUS_M09_DARIUS_001`  
  *Direction:* Sitting on a crate on the quay with a bottle of something expensive, no tie, no smile. The warmth is gone. What's left is just tired.  
  **Say:** You know, I really did like you.

- `DARIUS_M09_DARIUS_002`  
  *Direction:* A soft, tired shrug.  
  **Say:** I tried to have you stopped. It's a different department.

- `DARIUS_M09_DARIUS_003`  
  *Direction:* A very long beat. He doesn't look away.  
  **Say:** Danny found a ledger he shouldn't have. Danny asked Sloane's people the wrong questions. And my crew, on my order, which I'll say once because I'm an honest man at least about this, made sure he stopped asking.

- `DARIUS_M09_DARIUS_004`  
  *Direction:* Quiet.  
  **Say:** Everyone needs a version they can live with.

- `DARIUS_M09_DARIUS_005`  
  *Direction:* Standing now. The charisma returns, thin as paint.  
  **Say:** Listen to me. You think this is a morality play. It is not. Everybody in this city is compromised. Eddie fixed my trucks. Mara drove my cars. The cops take my envelopes. And Victor Sloane pays me to be a monster so he can stand on a stage and be the hero. I'm not the cancer, Ash. I'm the symptom.

- `DARIUS_M09_DARIUS_006`  
  *Direction:* A cold, reasonable shrug.  
  **Say:** It doesn't have to be okay. It only has to be true.

- `DARIUS_M09_DARIUS_007`  
  *Direction:* Pained. Almost hurt.  
  **Say:** Jojo. Not you too.

- `DARIUS_M09_DARIUS_008`  
  *Direction:* Suddenly bright, suddenly cruel, a snap decision. He slides into his car.  
  **Say:** You want to talk about okay? Come and get me.

### M09_DFATE
*M09_PORT_ALDER_BURNING; heard face to face*

- `DARIUS_M09_DFATE_001`  
  *Direction:* Sitting on the kerb beside his wrecked car, bleeding from the forehead. Not laughing. Almost relieved.  
  **Say:** Well. That's quite a rear bumper you've got.

- `DARIUS_M09_DFATE_002`  
  *Direction:* Mild. Looking at his hands.  
  **Say:** Is it. Say what you're going to do. I'd rather hear it from a person than a siren.

- `DARIUS_M09_DFATE_003`  
  *Direction:* A very dry, very tired smile.  
  **Say:** I never could stand a good audience. Fine. Let's do it properly.

- `DARIUS_M09_DFATE_004`  
  *Direction:* A thin, surprised breath, and then, a little startled by it, a real smile.  
  **Say:** You're going to regret that. I'll try to disappoint you as little as possible.

- `DARIUS_M09_DFATE_005`  
  *Direction:* Barely audible. He has no more jokes.  
  **Say:** Of course it is.

### M09_FLEE
*M09_PORT_ALDER_BURNING; heard over the radio, **filtered** (record dry)*

- `DARIUS_M09_FLEE_001`  
  *Direction:* Over the radio, laughing, driving fast, enjoying himself in a thin, terrible way.  
  **Say:** Port Alder's built for this, you know. Every road leads to somebody who owes me.

## Walt Pruitt (`WALT`)

**Role:** the dockworker  
**Voice:** Sixties, gravelly.  
**Direction:** Short sentences. Starts with "ain't my business" and ends up telling the truth.  
**Accent:** Older working-class American.  
**Pace:** Slow, with long gaps.  
**Range:** Narrow.  
**Pronunciation:** Pruitt: "PROO-it"  
**Recording notes:** Room tone with a little distance.

**Who they are:** Thirty years on the Port Alder docks. Saw a container leave Berth 4 that was never logged, and saw Danny Vale's truck the night he vanished.

**Wants:** Get through the shift. Then, slowly, get it off his chest.  
**Fears:** Losing his pension; being the one who talked.  
**Hides:** He has kept a copy of the gate log and has told no one.  
**Arc:** Starts as a man who looks at his boots and says nothing. Pushed far enough, he decides his silence has cost enough, and either lives to testify or becomes the reason Ash cannot walk away.

26 lines, 359 words.

### E02_WALT
*E02_DANNYS_TRUCK; heard face to face*

- `WALT_E02_WALT_001`  
  *Direction:* Handing over the keys without being asked. Quiet.  
  **Say:** It's been sitting there. I never could look at it. Tell Eddie it still runs.

- `WALT_E02_WALT_002`  
  *Direction:* A grunt. He looks away.  
  **Say:** Somebody had to. Danny would've kept it for me.

### H03_WALT1
*HANGOUT (talk to people in the city); heard face to face*

- `WALT_H03_WALT1_001`  
  *Direction:* Sitting on a bollard. Gruff, not looking at Ash.  
  **Say:** Don't talk to me around the cameras.

### H03_WALT2
*HANGOUT (talk to people in the city); heard face to face*

- `WALT_H03_WALT2_001`  
  *Direction:* Quiet, after a long pause.  
  **Say:** The tide comes in and goes out. People think it's the sea. It's the moon. Nobody ever thanks the moon.

### M01_DOCKS
*M01_A_NEW_START; heard face to face*

- `WALT_M01_DOCKS_001`  
  *Direction:* Gruff, suspicious, a man who has been burned by new faces.  
  **Say:** You're not Tony.

- `WALT_M01_DOCKS_002`  
  *Direction:* Walking slowly around the pickup, looking at the tailgate.  
  **Say:** Hm.

- `WALT_M01_DOCKS_003`  
  *Direction:* Careful. Pretending it's a casual question and failing.  
  **Say:** Who had it before Eddie got it? Before the paint.

- `WALT_M01_DOCKS_004`  
  *Direction:* Crouching, thumb on the tailgate where something should be.  
  **Say:** There was a dent here. Shaped like a boot. Big man kicked it, one night, over a gate that wouldn't open. You see a boot dent?

- `WALT_M01_DOCKS_005`  
  *Direction:* Quiet. He stands, and he does not like what he is thinking.  
  **Say:** Huh. Somebody fixed a lot of things on this truck.

- `WALT_M01_DOCKS_006`  
  *Direction:* Signs the paper without reading it. Low, like he regrets saying anything.  
  **Say:** Tell Eddie thanks. Don't tell him I asked about the dent. It ain't my business.

### M03_ARRIVE
*M03_THE_WRONG_PACKAGE; heard face to face*

- `WALT_M03_ARRIVE_001`  
  *Direction:* Tired, at the fence, a flashlight in his hand. He recognises the driver from the pickup.  
  **Say:** You again. The truck kid.

- `WALT_M03_ARRIVE_002`  
  *Direction:* A long exhale. The name is a weight he already carries.  
  **Say:** That case ain't here.

- `WALT_M03_ARRIVE_003`  
  *Direction:* Low. He glances at the camera on the pole and keeps his voice under it.  
  **Say:** He said a lot of things. Everything on that rack was cleared this afternoon. Forklift, flatbed, gone. Nobody told me. Nobody told the paper either.

- `WALT_M03_ARRIVE_004`  
  *Direction:* Flat. He has said it before, to himself.  
  **Say:** That ain't my business.

- `WALT_M03_ARRIVE_005`  
  *Direction:* A long look. Something moves behind his face and goes back.  
  **Say:** Rack nine. Back of the building, behind the blue containers. They left a few. If you're going to look, don't take long. Alarm wasn't armed this morning and it's been armed since lunch.

### M08_LIVES
*M08_THE_LAST_WITNESS; heard face to face*

- `WALT_M08_LIVES_001`  
  *Direction:* Sitting on the lighthouse step, one hand pressed to his ribs. Out of breath. Alive.  
  **Say:** I thought I'd be braver.

- `WALT_M08_LIVES_002`  
  *Direction:* Dry, wheezing.  
  **Say:** In a lighthouse. Hiding. Very brave.

### M08_SIEGE
*M08_THE_LAST_WITNESS; heard over the radio, **filtered** (record dry)*

- `WALT_M08_SIEGE_001`  
  *Direction:* Shouting, from inside, frightened.  
  **Say:** I'm not going anywhere!

### M08_WALT
*M08_THE_LAST_WITNESS; heard face to face*

- `WALT_M08_WALT_001`  
  *Direction:* In the shadow of the door, a thermos in his hand. He doesn't come out. He sounds ten years older than at the docks.  
  **Say:** I said I was fishing.

- `WALT_M08_WALT_002`  
  *Direction:* A dry, defeated half-laugh.  
  **Say:** No. I don't.

- `WALT_M08_WALT_003`  
  *Direction:* Long silence. Then, haltingly, as if he has been practising the first line for five years.  
  **Say:** Because the boy who made that dent was Danny Vale. And the last time I saw him, he gave me an envelope and said, "If I don't come in Tuesday, give it to somebody who isn't scared."

- `WALT_M08_WALT_004`  
  *Direction:* A short, rough breath.  
  **Say:** He didn't come in Tuesday. I wasn't that person. I've been waiting five years to find out who was.

- `WALT_M08_WALT_005`  
  *Direction:* Taking a worn envelope from inside his coat. His hands are shaking.  
  **Say:** A copy of the Berth Four gate log. The night PAC-4471 left without a signature. Four names on it. One of them is a detective. One of them is a man who doesn't do his own lifting. And one of them I recognise from the radio ads.

- `WALT_M08_WALT_006`  
  *Direction:* He nods, once. It's the nod of a man handing something heavy to someone younger.  
  **Say:** I saw Danny's truck go out that night with two men I'd never seen before. It came back two days later. Danny never did.

- `WALT_M08_WALT_007`  
  *Direction:* Quiet. He looks at Ash for the first time.  
  **Say:** I know I should've said something. I just kept thinking, ain't my business. It's been everybody's business the whole time.

- `WALT_M08_WALT_008`  
  *Direction:* Headlights sweep the road below. His voice drops to nothing.  
  **Say:** They're here.

## Lucille Ng (`LUCILLE`)

**Role:** the shop owner  
**Voice:** Sixties, sharp.  
**Direction:** Wry, tough, funny when cornered. Never a victim voice.  
**Accent:** Port Alder native.  
**Pace:** Brisk.  
**Range:** Medium.  
**Pronunciation:** Ng: "ing" (as in "sing")  
**Recording notes:** Bright, close.

**Who they are:** Has run Ng's Corner Mart for thirty-one years. Her street has been "cleaned up" by vandals and eviction notices ever since the redevelopment was announced.

**Wants:** Keep her counter and her neighbours.  
**Fears:** Being the last one standing.  
**Hides:** She already signed one paper she does not understand.  
**Arc:** Treats Ash as another stranger with a favour to ask. If the neighbourhood is defended she becomes its stubborn heart; if not, the shop she has kept for thirty years becomes a tally of what was lost.

20 lines, 366 words.

### E03_LUCILLE
*E03_SOMEONE_WHO_KNEW_HIM; heard face to face*

- `LUCILLE_E03_LUCILLE_001`  
  *Direction:* Behind the counter, polishing a spotless glass. Warm, dry, and entirely serious about it.  
  **Say:** He came in Tuesdays. Danny Vale. Bought one sour candy and told me the same joke for six years. I never once laughed. He took it very personally.

- `LUCILLE_E03_LUCILLE_002`  
  *Direction:* Straight-faced.  
  **Say:** A mechanic walks into a bar. It gets worse from there.

- `LUCILLE_E03_LUCILLE_003`  
  *Direction:* Setting a small keyring on the counter. A tiny brass wrench.  
  **Say:** He left this behind. I've kept it behind the register for five years. Tell Eddie it's not his fault. Tell him in whatever words he'll actually hear.

### H04_LUCILLE1
*HANGOUT (talk to people in the city); heard face to face*

- `LUCILLE_H04_LUCILLE1_001`  
  *Direction:* Behind the counter, dry.  
  **Say:** We're out of the good candy. We're always out of the good candy. The good candy is a rumour.

### H04_LUCILLE2
*HANGOUT (talk to people in the city); heard face to face*

- `LUCILLE_H04_LUCILLE2_001`  
  *Direction:* Pleased with herself.  
  **Say:** Two kids came by to apologise for the brick. I made them sweep. I've never seen anyone sweep so honestly.

### M06_MART
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `LUCILLE_M06_MART_001`  
  *Direction:* Sweeping glass from a shattered window. She does not stop sweeping. Dry, sharp.  
  **Say:** We're open. Mind the glass. Somebody threw a brick last night. I'm told it was kids. Kids with excellent aim and a very good sense of when I've gone home.

- `LUCILLE_M06_MART_002`  
  *Direction:* Looks Ash up and down once, and gives nothing away.  
  **Say:** Thirty-one. Before you ask, I'm not selling.

- `LUCILLE_M06_MART_003`  
  *Direction:* Dry.  
  **Say:** Everyone says that. Then a man in a very nice coat comes in and wants to buy.

- `LUCILLE_M06_MART_004`  
  *Direction:* A long beat. She takes a folded paper from under the register and doesn't hand it over.  
  **Say:** I signed one thing. A "property assessment access agreement." Nice paper. Nice smile. I didn't read the second page.

- `LUCILLE_M06_MART_005`  
  *Direction:* Flat. She has known for a week and has not said it aloud.  
  **Say:** Yes. I know. I'm not an idiot. I just didn't have a lawyer, and then I didn't have a window.

- `LUCILLE_M06_MART_006`  
  *Direction:* Tight, bright with anger.  
  **Say:** It's very safe. It was perfectly safe until they started making it dangerous.

- `LUCILLE_M06_MART_007`  
  *Direction:* Quiet. She finally stops sweeping.  
  **Say:** There's a trailer on the Alder Point site where they keep the property files. A man left a visitor pass on my counter last month and I kept it. Don't ask why. You never know when a woman my age might need to visit a construction site.

- `LUCILLE_M06_MART_008`  
  *Direction:* Handing over the pass, brisk again.  
  **Say:** And if you meet a woman named Priya Nair at the diner on Cedar, tell her Lucille Ng is finally prepared to be quoted.

### W01_CALL
*W01_WINDOWS; heard over the phone, **filtered** (record dry)*

- `LUCILLE_W01_CALL_001`  
  *Direction:* On the phone. Dry, curt, brisk as a slap.  
  **Say:** There are two men outside my shop with a van. I'm holding the broom. Come or don't, but the broom and I are going out.

### W01_DONE
*W01_WINDOWS; heard face to face*

- `LUCILLE_W01_DONE_001`  
  *Direction:* Leaning on the broom among the glass. Out of breath, grinning.  
  **Say:** They're gone. I didn't even have to hit one. Mostly.

- `LUCILLE_W01_DONE_002`  
  *Direction:* Straight-faced.  
  **Say:** I have a very good swing.

### W01_SIEGE
*W01_WINDOWS; heard over the radio, **filtered** (record dry)*

- `LUCILLE_W01_SIEGE_001`  
  *Direction:* Shouting through the door. A woman in the middle of the fight of her life, and enjoying it.  
  **Say:** Get away from my window! This is a lawful establishment!

- `LUCILLE_W01_SIEGE_002`  
  *Direction:* Furious, delighted.  
  **Say:** I've never been down a day in my life!

### W02_ASK
*W02_SIGNATURES; heard face to face*

- `LUCILLE_W02_ASK_001`  
  *Direction:* Handing over a clipboard, a pen on a string.  
  **Say:** A petition. I need twenty names. Three streets. Nobody wants to be the first.

- `LUCILLE_W02_ASK_002`  
  *Direction:* Dry.  
  **Say:** I want you to be the one with the transport.

## Officer Dana Whitfield (`DANA`)

**Role:** the honest officer  
**Voice:** Late twenties.  
**Direction:** Earnest, straightforward, nervous when she says the risky thing.  
**Accent:** Neutral American.  
**Pace:** Medium; speeds up when anxious.  
**Range:** Medium.  
**Pronunciation:** Whitfield: "WHIT-feeld"  
**Recording notes:** Clean, close.

**Who they are:** Patrol officer five years in. Noticed that Detective Rowan's reports do not match her own notes.

**Wants:** Do the job she thought she signed up for.  
**Fears:** Being the one who ends her own career.  
**Hides:** She photographed a page of Rowan's logbook and has not told her sergeant.  
**Arc:** A patrol officer who keeps her notes in a drawer. Given proof and a partner she stops waiting for permission and builds a case that cannot be buried.

11 lines, 233 words.

### H05_DANA1
*HANGOUT (talk to people in the city); heard face to face*

- `DANA_H05_DANA1_001`  
  *Direction:* Standing by her patrol car. Quiet, polite, glancing at the station.  
  **Say:** Please don't talk to me in front of the building. I mean it kindly.

### M09_ALLIES
*M09_PORT_ALDER_BURNING; heard face to face*

- `DANA_M09_ALLIES_001`  
  *Direction:* On speaker. Careful, quiet, the sound of a person speaking from a stairwell.  
  **Say:** It's Dana Whitfield. I'll be at the harbor gate with three officers I trust. If you need police that aren't Detective Rowan's, that's us. Give me a signal.

### M09_ROWAN
*M09_PORT_ALDER_BURNING; heard face to face*

- `DANA_M09_ROWAN_001`  
  *Direction:* Stepping out of the dark with two officers. Shaking a little, standing straight.  
  **Say:** Detective Rowan. I'd like to ask you to come with me. Please.

### O01_MEET
*O01_INCONSISTENCIES; heard face to face*

- `DANA_O01_MEET_001`  
  *Direction:* Standing by her patrol car, keys turning in her fingers. Nervous and trying to look as though she is not.  
  **Say:** You're Ash. I know you, because three different people told me not to talk to you.

- `DANA_O01_MEET_002`  
  *Direction:* Quieter. Checking over her shoulder.  
  **Say:** I'm Officer Whitfield. Dana. I've been on the street five years. I have a notebook and I have a photo of a logbook page that doesn't match it.

- `DANA_O01_MEET_003`  
  *Direction:* Fast.  
  **Say:** Detective Rowan's reports say that nothing happened at three addresses on nights when I was personally standing there watching things happen.

- `DANA_O01_MEET_004`  
  *Direction:* A short, tired breath.  
  **Say:** Because you're not on the force. Nobody can be sacked for talking to you.

### O02_BRIEF
*O02_THREE_SITES; heard over the phone, **filtered** (record dry)*

- `DANA_O02_BRIEF_001`  
  *Direction:* On the radio, businesslike. A list.  
  **Say:** Three places. The Wharf Street shops, the old Vale storage unit, and the Port Warehouse. Rowan's reports say "no incident". See what you see.

### O03_FILE
*O03_THE_FILE; heard face to face*

- `DANA_O03_FILE_001`  
  *Direction:* Spreading photographs on the hood of the patrol car. Hands steady now.  
  **Say:** Three sites. Three false reports. One signature. If this goes to the captain, it goes straight to Rowan. If it goes to Internal Affairs, I'm done before the end of the week.

- `DANA_O03_FILE_002`  
  *Direction:* Squares her shoulders.  
  **Say:** I want to keep a file. Real, properly documented, ready for the day someone who can act on it is willing to read it. And I want it to be me who kept it.

- `DANA_O03_FILE_003`  
  *Direction:* A small, hopeful smile.  
  **Say:** Thank you. For not telling me to leave it alone.

## Jojo Baptiste (`JOJO`)

**Role:** a member of Darius's crew  
**Voice:** Early twenties.  
**Direction:** Talks fast when nervous, goes flat when he lies.  
**Accent:** Port Alder, a little slang. Keep it light.  
**Pace:** Fast and clipped.  
**Range:** Medium.  
**Pronunciation:** Baptiste: "bap-TEEST"; Jojo: "JOH-joh"  
**Recording notes:** Close, energetic.

**Who they are:** Twenty-two, runs errands and collections for Darius. Started because he was loyal; stays because he is afraid.

**Wants:** Prove himself without getting anyone hurt.  
**Fears:** Darius.  
**Hides:** He drove the truck that moved the container, and has not slept properly since.  
**Arc:** Loyal because he is afraid. Shown another way out, he either turns against Darius or is the one who warns him, depending on what Ash gave him to hold on to.

21 lines, 360 words.

### D01_CALL
*D01_COLLECTIONS; heard over the phone, **filtered** (record dry)*

- `JOJO_D01_CALL_001`  
  *Direction:* Bright, a little too eager. He loves being asked.  
  **Say:** Hey! Darius says you can do a collection run with me. Three shops, three envelopes. Nobody gets hurt, nobody gets hassled. We just say hi and take the thing. Easy.

### D01_DONE
*D01_COLLECTIONS; heard face to face*

- `JOJO_D01_DONE_001`  
  *Direction:* Counting the envelopes, a little too carefully. He doesn't meet Ash's eye.  
  **Say:** Darius is going to love this. He loves it when the envelopes are right.

- `JOJO_D01_DONE_002`  
  *Direction:* Fast, flat, the voice of someone lying to himself.  
  **Say:** Insurance. It's, like, protection. For the shops. You know, from stuff.

- `JOJO_D01_DONE_003`  
  *Direction:* A short, miserable laugh.  
  **Say:** That's the funny part.

### D01_STOP
*D01_COLLECTIONS; heard in the car*

- `JOJO_D01_STOP_001`  
  *Direction:* Hopping out of the car, whispering back through the window.  
  **Say:** Okay. Nice and calm. We say it's from Darius.

- `JOJO_D01_STOP_002`  
  *Direction:* Back in the car, a small, nervous laugh.  
  **Say:** See? Easy. Nobody even looked at us.

### D03_JOJO
*D03_JOJOS_QUESTION; heard face to face*

- `JOJO_D03_JOJO_001`  
  *Direction:* Alone, pacing between two trucks, not slowing when Ash walks up.  
  **Say:** Can I ask you something? You're not going to tell Darius?

- `JOJO_D03_JOJO_002`  
  *Direction:* Fast, low.  
  **Say:** If you found out something... bad. About him. About what we move. What would you do?

- `JOJO_D03_JOJO_003`  
  *Direction:* A long, shaky breath. A young man putting something heavy down.  
  **Say:** Okay. Okay. There's a container. I drove it. I'm not sleeping. If I ever need to call you, I'll call you.

- `JOJO_D03_JOJO_004`  
  *Direction:* Flat. The face of someone who has been given exactly the answer he feared.  
  **Say:** Yeah. That's what I figured. Forget I asked.

### H07_JOJO1
*HANGOUT (talk to people in the city); heard face to face*

- `JOJO_H07_JOJO1_001`  
  *Direction:* Skateboard under one arm. Fast.  
  **Say:** Hey! Sorry, I'm busy. I'm always busy. It's a thing I do now.

### M01_TEXT
*M01_A_NEW_START; heard over the phone, **filtered** (record dry); shown as "Unknown number"*

- `JOJO_M01_TEXT_001`  
  *Direction:* Voice message. Nervous, trying to sound relaxed and failing a little.  
  **Say:** Hey. You don't know me. Somebody I work for heard Eddie's got a new driver who doesn't crash. Pays three times what Eddie pays. Talk to Eddie about it. He knows who I mean. Don't, uh, don't tell him I said that.

### M02_DEPOT
*M02_EASY_MONEY; heard face to face*

- `JOJO_M02_DEPOT_001`  
  *Direction:* Hurrying up, nervous energy. Cutting off whatever the guard was going to say.  
  **Say:** It's fine, it's fine, they're with Darius. Hey. You're the new driver? I'm Jojo. I left you that message. Sorry about the message. I'm bad at messages.

### M07_CALL
*M07_BURN_NOTICE; heard over the phone, **filtered** (record dry)*

- `JOJO_M07_CALL_001`  
  *Direction:* Whispering, panicked, a hand over the phone. Not the same Jojo from the depot.  
  **Say:** Ash. Don't come to the meeting. Listen to me, don't go. There are six guys in the back of the car park who weren't on the list.

- `JOJO_M07_CALL_002`  
  *Direction:* Quick, stumbling.  
  **Say:** I'll say I couldn't reach you. He's going to know I'm lying. He always knows. Just, please, be somewhere else.

- `JOJO_M07_CALL_003`  
  *Direction:* Bright, jittery, over-rehearsed. He is reading from somebody else's script.  
  **Say:** Hey, Ash! It's Jojo. Darius wants to say thank you in person. The public car park, south end. He'd really like you to bring the, uh, the paperwork. All of it. He says to bring all of it.

### M07_REP
*M07_BURN_NOTICE; heard face to face*

- `JOJO_M07_REP_001`  
  *Direction:* Standing by a car, hands too busy, eyes going to the far end of the lot.  
  **Say:** Hey. Hey. You came.

- `JOJO_M07_REP_002`  
  *Direction:* Flat, the voice of a person lying to a camera.  
  **Say:** He does. He's just late.

- `JOJO_M07_REP_003`  
  *Direction:* Fast, tight, finally cracking.  
  **Say:** I can't. I can't say. I'm sorry. I really like you, okay? I really like you, so please just run.

### M08_CALL
*M08_THE_LAST_WITNESS; heard over the phone, **filtered** (record dry)*

- `JOJO_M08_CALL_001`  
  *Direction:* Whispered, from somewhere echoing. Scared and trying to be brave.  
  **Say:** It's Jojo. I can't talk long. Walt isn't fishing. He's at the North Point lighthouse. Darius found out an hour ago. They're already on the way.

### M09_DARIUS
*M09_PORT_ALDER_BURNING; heard face to face*

- `JOJO_M09_DARIUS_001`  
  *Direction:* Stepping between them, shaking. His voice is thin and very brave.  
  **Say:** Darius. Stop. It's finished. Let them go.

## Mateo Cruz (`MATEO`)

**Role:** Mara's younger brother  
**Voice:** Seventeen.  
**Direction:** Defensive, funny, deflects, cracks when pushed.  
**Accent:** Natural American teen; no performed slang.  
**Pace:** Quick.  
**Range:** Medium.  
**Pronunciation:** Mateo: "mah-TAY-oh"  
**Recording notes:** Natural and close. Direct him to under-act.

**Who they are:** Seventeen. Carries packages for Darius's crew for cash and does not ask what is in them.

**Wants:** Be useful. Not be a kid.  
**Fears:** Being as stuck as his sister thinks he is.  
**Hides:** He knows one of the packages was not what he was told.  
**Arc:** A seventeen-year-old who thinks he is helping. His choice to talk, or not, decides whether Mara's plan to leave is a rescue or an escape from him.

7 lines, 81 words.

### H10_MATEO1
*HANGOUT (talk to people in the city); heard face to face*

- `MATEO_H10_MATEO1_001`  
  *Direction:* On the bench. Defensive.  
  **Say:** If my sister told you to check on me, I'm fine. Tell her I'm fine. Tell her loudly.

### R02_PARK
*R02_MATEO; heard face to face*

- `MATEO_R02_PARK_001`  
  *Direction:* Sitting on the back of a bench with his feet on the seat. Defensive, bored, performing it.  
  **Say:** My sister sent you.

- `MATEO_R02_PARK_002`  
  *Direction:* A short snort.  
  **Say:** She says everything to my face. It's very loud.

- `MATEO_R02_PARK_003`  
  *Direction:* Quick, too quick.  
  **Say:** Packages. For a friend's uncle.

- `MATEO_R02_PARK_004`  
  *Direction:* The performance falters. He stares at his sneakers.  
  **Say:** ...Last month one of the packages was heavy in a way it shouldn't have been. I looked. I'm not stupid. I put it back and I didn't say anything.

- `MATEO_R02_PARK_005`  
  *Direction:* A long breath. A teenager's deflated shrug that hides a huge relief.  
  **Say:** Okay. Okay. I'll tell Jojo I'm done.

- `MATEO_R02_PARK_006`  
  *Direction:* Surprised. Pleased and scared at once.  
  **Say:** Wait. You want me to be, like, a spy?

## Priya Nair (`PRIYA`)

**Role:** the journalist  
**Voice:** Early thirties.  
**Direction:** Crisp, curious, warm when she wants you to talk. Always listening for the quote.  
**Accent:** Neutral American.  
**Pace:** Brisk.  
**Range:** Medium.  
**Pronunciation:** Priya: "PREE-yah"; Nair: "NY-eer"  
**Recording notes:** Clean, close.

**Who they are:** Runs the Port Alder Ledger's two-person investigations desk. Has been writing about waterfront evictions for a year and cannot get a source to go on record.

**Wants:** Publish something that holds up.  
**Fears:** Printing a story that gets someone killed.  
**Hides:** Her editor has already killed one version of the story.  
**Arc:** A journalist who has been told the story is not a story. With the right files she turns a town's whispers into a headline; with the wrong ones she never gets the chance.

10 lines, 207 words.

### H06_PRIYA1
*HANGOUT (talk to people in the city); heard face to face*

- `PRIYA_H06_PRIYA1_001`  
  *Direction:* Typing at a diner table. Doesn't look up.  
  **Say:** Don't tell me anything yet. I'm allergic to unconfirmed things. It's a condition.

### M06_PRIYA
*M06_THE_PEOPLE_WHO_PAY; heard face to face*

- `PRIYA_M06_PRIYA_001`  
  *Direction:* Sharp, bright, a notebook already open. She has been waiting for a source for a year.  
  **Say:** Lucille called me. I've never heard her call anyone.

- `PRIYA_M06_PRIYA_002`  
  *Direction:* Reading, going very still.  
  **Say:** Alder Point to King Haulage. Monthly. "Public safety." I've been asking the city for this for fourteen months.

- `PRIYA_M06_PRIYA_003`  
  *Direction:* Looking up. Direct.  
  **Say:** My editor killed the last version of this story. I don't want to lose this one. Will you go on the record?

- `PRIYA_M06_PRIYA_004`  
  *Direction:* A short nod. She respects it.  
  **Say:** Then I'll keep it safe. And I'll tell you now, in case it matters later: I only print what holds up.

### M09_ALLIES
*M09_PORT_ALDER_BURNING; heard face to face*

- `PRIYA_M09_ALLIES_001`  
  *Direction:* On speaker. Brisk, bright and tired. Typing in the background.  
  **Say:** Priya. I have two pages written and a lawyer on standby. Give me names, dates and documents, and I'll have a story by midnight that can't be killed.

### W02_PLAZA
*W02_SIGNATURES; heard face to face*

- `PRIYA_W02_PLAZA_001`  
  *Direction:* Receiving the clipboard, a quick, real smile.  
  **Say:** Twenty-three. Lucille asked for twenty. I'm going to put "a few more" in the story, because it sounds stubborn.

### W03_ASK
*W03_THE_PERMIT; heard over the phone, **filtered** (record dry)*

- `PRIYA_W03_ASK_001`  
  *Direction:* On the phone. Quick, excited and careful at the same time.  
  **Say:** There's a permit posted on the Alder Point site fence. If the environmental waiver on it is forged, I can prove it. I need someone to take a photo. Preferably someone who looks like they're supposed to be there.

### W03_PRIYA
*W03_THE_PERMIT; heard face to face*

- `PRIYA_W03_PRIYA_001`  
  *Direction:* Staring at the photo as though it were a diamond.  
  **Say:** A dead man signed the waiver. Ash, do you understand how much easier this makes my life?

- `PRIYA_W03_PRIYA_002`  
  *Direction:* Quiet, serious.  
  **Say:** I'll hold it until the rest comes together. And when it does, I'll quote you as "a concerned neighbour". That okay?

## Dale Pruitt-Moss (landlord) (`DALE`)

**Role:** landlord (voicemail only)  
**Voice:** Forties, casual and slippery.  
**Direction:** Breezy; he is not sorry.  
**Accent:** Local.  
**Pace:** Quick.  
**Range:** Narrow.  
**Recording notes:** Phone-style take is fine; the game applies the filter.

**Who they are:** The man who sold the room twice. Voicemail only.

3 lines, 87 words.

### M00_VOICEMAIL
*M00_ARRIVAL; heard over the phone, **filtered** (record dry)*

- `DALE_M00_VOICEMAIL_001`  
  *Direction:* Breezy, not sorry at all. Voicemail energy.  
  **Say:** Hey, it's Dale, about the room on Cedar. So, little bit of news. My cousin showed up this morning with cash in hand and, you know how it is, first come, first served.

- `DALE_M00_VOICEMAIL_002`  
  *Direction:* Bright and fast, getting ahead of the complaint.  
  **Say:** Your deposit? That's a non-refundable retainer. It says so in the text I sent. Which you didn't read, because nobody reads them.

- `DALE_M00_VOICEMAIL_003`  
  *Direction:* Throwing a crumb. Quick and vague.  
  **Say:** If you need work, try Vale Auto, over on Third. Eddie's always short a pair of hands. Say Dale sent you. Actually, don't. Just say you can drive. Good luck out there!

## Marty Quill (radio host) (`HOST`)

**Role:** radio host, Alder FM  
**Voice:** Fifties, big radio voice.  
**Direction:** Warm, breezy, a little too pleased with himself.  
**Accent:** Radio American.  
**Pace:** Fast and flowing.  
**Range:** Wide.  
**Pronunciation:** Quill: "kwill"  
**Recording notes:** Studio-bright. The game does not filter this character.

**Who they are:** Afternoon-drive host on Alder FM.

14 lines, 356 words.

### M00_RADIO
*M00_ARRIVAL; heard over the radio*

- `HOST_M00_RADIO_001`  
  *Direction:* Big warm radio voice, mid-sentence, selling the city.  
  **Say:** ...and if you're just coming in off the coast road, welcome to Port Alder. Population: big. Parking: small. This is Marty Quill on Alder FM, and it is a very good evening to be somewhere else, or here, I guess. Here is fine.

- `HOST_M00_RADIO_002`  
  *Direction:* Mock-serious.  
  **Say:** Traffic: the Harbor Bridge is moving. The highway is what we politely call "a conversation." If you're headed through the port, the gate guys are checking paperwork twice, so bring a book.

- `HOST_M00_RADIO_003`  
  *Direction:* Back to breezy, a little dry about the ad.  
  **Say:** Sloane Development, everybody. Building what comes next, and demolishing what came before, but they don't put that on the radio. Here's something from a band that definitely doesn't exist.

### M09_EPI_A1
*M09_PORT_ALDER_BURNING; heard over the radio*

- `HOST_M09_EPI_A1_001`  
  *Direction:* Warm radio voice gone quiet. Genuinely shaken, for once not performing.  
  **Say:** This is Alder FM. We are interrupting our regular programming. The Port Alder Ledger has this morning published a seven-page investigation into the Alder Point redevelopment.

- `HOST_M09_EPI_A1_002`  
  *Direction:* Steadier.  
  **Say:** Police confirm that a senior detective has given a statement, and that warrants have been issued for Victor Sloane and for several officials.

- `HOST_M09_EPI_A1_003`  
  *Direction:* Steadier.  
  **Say:** Police confirm they are reviewing the documents. A senior detective is on leave. Warrants are reported to be issued for Victor Sloane.

- `HOST_M09_EPI_A1_004`  
  *Direction:* A beat, almost to himself.  
  **Say:** And for once, folks, I have nothing funny to say.

### M09_EPI_B1
*M09_PORT_ALDER_BURNING; heard over the radio*

- `HOST_M09_EPI_B1_001`  
  *Direction:* Flat. A man who knows what he is selling and has decided not to say it.  
  **Say:** Sloane Development, everybody. Building what comes next. We'll be right back after this word from a sponsor, which is also Sloane Development.

### M09_EPI_C1
*M09_PORT_ALDER_BURNING; heard over the radio*

- `HOST_M09_EPI_C1_001`  
  *Direction:* Raw, hushed, broadcasting while something terrible is still happening. No jokes.  
  **Say:** This is Alder FM. Emergency crews are at the Port Alder container yard, where a fire has spread across the northern berths. Authorities believe that documents relating to the Alder Point project were among the material destroyed.

- `HOST_M09_EPI_C1_002`  
  *Direction:* A beat of dead air.  
  **Say:** Victor Sloane's office has issued a statement. It says only: "We are deeply saddened."

### X01_CITY
*CAR RADIO (ambient broadcasts); heard over the radio*

- `HOST_X01_CITY_001`  
  *Direction:* Easy, warm, in no hurry.  
  **Say:** You're listening to Alder FM. If you're stuck on the highway, relax. It's a very nice highway to be stuck on.

### X01_NEWS1
*CAR RADIO (ambient broadcasts); heard over the radio*

- `HOST_X01_NEWS1_001`  
  *Direction:* Mock-casual.  
  **Say:** Port police have confirmed a break-in at a port warehouse and reported that, quote, nothing of value was taken. Unquote. Which is the best kind of break-in, if you ask a certain kind of person.

### X01_NEWS2
*CAR RADIO (ambient broadcasts); heard over the radio*

- `HOST_X01_NEWS2_001`  
  *Direction:* More careful.  
  **Say:** The Port Alder Ledger is promising a series on waterfront redevelopment. Sloane Development says it welcomes, quote, "any good faith inquiry."

### X01_NEWS3
*CAR RADIO (ambient broadcasts); heard over the radio*

- `HOST_X01_NEWS3_001`  
  *Direction:* Flat. Reading what has been handed to him.  
  **Say:** Police are investigating a disturbance at the public car park this evening. Nobody has been hurt, the cars are, however, unrecognisable.

## Police dispatcher (`DISPATCH`)

**Role:** police radio  
**Voice:** Any adult.  
**Direction:** Clipped, procedural, bored.  
**Accent:** Neutral.  
**Pace:** Fast.  
**Range:** Narrow.  
**Recording notes:** Flat. The game adds the radio filter.

**Who they are:** Port Alder PD dispatch.

2 lines, 32 words.

### M03_POLICE
*M03_THE_WRONG_PACKAGE; heard over the radio, **filtered** (record dry)*

- `DISPATCH_M03_POLICE_001`  
  *Direction:* Clipped, procedural, a little bored.  
  **Say:** All units, silent alarm at the Port Warehouse complex, Warehouse 14. Anonymous caller reports a break-in. Units responding, please advise.

- `DISPATCH_M03_POLICE_002`  
  *Direction:* Same flat tone, repeating after a pause.  
  **Say:** Dispatch to Unit twelve. You are the first in, report on arrival.

## Depot guard (`GUARD`)

**Role:** guard at Darius's depot  
**Voice:** Thirties, gruff.  
**Direction:** Suspicious, nervous around police.  
**Accent:** Local.  
**Pace:** Medium.  
**Range:** Narrow.  
**Recording notes:** Close.

**Who they are:** Not an ordinary employee.

3 lines, 7 words.

### M02_DEPOT
*M02_EASY_MONEY; heard face to face*

- `GUARD_M02_DEPOT_001`  
  *Direction:* Low, suspicious. Hand on the gate. Not an ordinary employee.  
  **Say:** Whose car is that?

- `GUARD_M02_DEPOT_002`  
  *Direction:* Eyeing Ash.  
  **Say:** Who's that?

- `GUARD_M02_DEPOT_003`  
  *Direction:* Under his breath, watching the road, nervous.  
  **Say:** Cruiser.

## Master list by mission

Which recordings each part of the story needs.

- **D01_COLLECTIONS**: 8 lines, 0 recorded
- **D02_BORROWED_CAR**: 5 lines, 0 recorded
- **D03_JOJOS_QUESTION**: 7 lines, 0 recorded
- **E01_OLD_TICKETS**: 12 lines, 0 recorded
- **E02_DANNYS_TRUCK**: 10 lines, 0 recorded
- **E03_SOMEONE_WHO_KNEW_HIM**: 12 lines, 0 recorded
- **HANGOUT (talk to people in the city)**: 35 lines, 0 recorded
- **M00_ARRIVAL**: 17 lines, 0 recorded
- **M01_A_NEW_START**: 36 lines, 0 recorded
- **M02_EASY_MONEY**: 54 lines, 0 recorded
- **M03_THE_WRONG_PACKAGE**: 48 lines, 0 recorded
- **M04_NO_LOOSE_ENDS**: 41 lines, 0 recorded
- **M05_DIRTY_BADGE**: 55 lines, 0 recorded
- **M06_THE_PEOPLE_WHO_PAY**: 67 lines, 0 recorded
- **M07_BURN_NOTICE**: 55 lines, 0 recorded
- **M08_THE_LAST_WITNESS**: 38 lines, 0 recorded
- **M09_PORT_ALDER_BURNING**: 128 lines, 0 recorded
- **O01_INCONSISTENCIES**: 6 lines, 0 recorded
- **O02_THREE_SITES**: 4 lines, 0 recorded
- **O03_THE_FILE**: 4 lines, 0 recorded
- **R01_CLEAN_MONEY**: 6 lines, 0 recorded
- **R02_MATEO**: 12 lines, 0 recorded
- **R03_THE_PLAN**: 9 lines, 0 recorded
- **CAR RADIO (ambient broadcasts)**: 5 lines, 0 recorded
- **W01_WINDOWS**: 7 lines, 0 recorded
- **W02_SIGNATURES**: 6 lines, 0 recorded
- **W03_THE_PERMIT**: 5 lines, 0 recorded

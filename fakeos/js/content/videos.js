// Vidder videos. caps = captions [seconds, line]; comments = [user, text, likes, replies?].
// Commenters not in USERS are passers-by: real accounts with no other presence.
// scene describes how the player draws the video (see drawScene in lib/art.js).

export const VIDEOS = [
  // ---- MaxPlaysStuff --------------------------------------------------------------------
  { id: 'mXq7Rt2Lk9a', ch: 'maxplaysstuff', title: 'I PLAYED SKYFORT FOR 24 HOURS STRAIGHT (gone wrong)', date: '2013-07-19', dur: '18:42', views: 4120339, likes: 61204, dislikes: 3310,
    tags: ['skyfort', 'challenge', '24 hours', 'gaming'], scene: { kind: 'game', text: '24 HOURS!!', sky: '#7fb8ff' },
    desc: 'WHAT IS UP MAXIMUMS!! I did it. 24 hours. No sleep. Two VOLT RUSH cans (ok five). At hour 19 I started talking to a sheep. Don\'t try this at home lol\n\nSubscribe and hit the bell!!\nMy Blink: blink.social/maxplaysstuff\nSkyfort server IP in my Blink bio',
    caps: [[0, 'WHAT IS UP MAXIMUMS'], [4, 'today we are doing something stupid'], [9, 'twenty four hours of Skyfort. no breaks.'], [40, 'hour one. feeling great. built a house.'], [120, 'hour six. the house is on fire. I don\'t know why.'], [300, 'hour nineteen. this sheep gets it. Gerald gets it.'], [600, 'I can hear colours now'], [900, 'we made it. I\'m going to bed for a week. love you maximums']],
    comments: [
      ['tylerdoesvlogs', 'MAX IM YOUR BIGGEST FAN i watched this 3 times!! can you check out my channel', 41, [['neon_viking', 'nobody is going to check out your channel kid', 12], ['josh_tan', 'i checked it out. its fine', 30]]],
      ['ghostlemon', 'RIP gerald the sheep 2013-2013', 2204],
      ['neon_viking', '"gone wrong" nothing went wrong you just got tired. clickbait as usual', 340, [['maxplaysstuff', 'bro the house literally burned down', 512], ['neon_viking', 'that was you', 288]]],
      ['skyfortmom', 'my son made me watch this with him. I have no idea what is happening but you seem nice. please sleep.', 980],
      ['kevlarkev', '14:20 he really said "I can hear colours" and then kept playing for 4 more hours', 671],
    ] },
  { id: 'mXvR9shT3qe', ch: 'maxplaysstuff', title: 'VOLT RUSH taste test!!! (all 6 flavours) not sponsored lol', date: '2013-08-02', dur: '9:14', views: 2390114, likes: 31880, dislikes: 22410,
    tags: ['volt rush', 'energy drink', 'taste test', 'vlog'], scene: { kind: 'vlog', text: 'ALL 6!!', color: '#2a5fa8' },
    desc: 'tried every flavour of VOLT RUSH. honestly these are so good. not sponsored, I just like them lol.\n\nUse code MAXIMUM for 20% off at voltrush.com',
    caps: [[0, 'ok guys so I went to the store and got all six'], [8, 'blue lightning. this one is my favourite. not sponsored'], [60, 'tropical surge. tastes like a beach. a good beach'], [150, 'they have a code. MAXIMUM. 20 percent. just saying'], [300, 'the orange one is honestly life changing'], [500, 'anyway I drink like four of these a day. normal amount']],
    comments: [
      ['actually_its_pronounced', '"not sponsored" followed by a discount code in the description. Interesting definition of the word.', 4521, [['maxplaysstuff', 'its an affiliate code thats different', 802], ['actually_its_pronounced', 'It is, in fact, a kind of sponsorship.', 3310]]],
      ['volt_rush_official', 'Thanks for the love Max!! ⚡ #RUSHMODE', 12],
      ['m_teller', 'the leaked email though. "please say not sponsored in the title, it tests better." bro.', 6603],
      ['tylerdoesvlogs', 'i got the blue one its so good!! my mom says i cant have them tho', 220],
      ['lurkmore2009', 'remember when people just played games and didn\'t sell you liquid heart attacks', 1902],
    ] },
  { id: 'mXa1ddrSs00', ch: 'maxplaysstuff', title: 'addressing the situation.', date: '2013-08-21', dur: '11:03', views: 3780662, likes: 88110, dislikes: 41203,
    tags: ['apology', 'volt rush', 'drama'], scene: { kind: 'rant', color: '#59636e' },
    desc: 'I don\'t usually do these. Comments are on. Please be nice to each other.',
    caps: [[0, 'hey guys. no intro today.'], [6, 'so a lot of you have seen the emails'], [20, 'yes, Volt Rush paid me. I should have said that.'], [60, 'I was told it was fine. it wasn\'t fine. that\'s on me.'], [150, 'some of you are like twelve and you bought these because I said they were good'], [240, 'I\'m donating what they paid me. all of it.'], [400, 'I\'m taking a week off. I love you maximums. sorry.']],
    comments: [
      ['neon_viking', 'donating it is the least you could do. still unsubbed', 2210, [['tylerdoesvlogs', 'he said sorry!!', 302], ['xXDeathGripXx', 'cope', 15]]],
      ['skyfortmom', 'This was a good apology. My son was upset but this helped. Thank you for being honest.', 5320],
      ['actually_its_pronounced', 'Credit where due: this is the first apology video I have seen that actually contains an apology.', 7712],
      ['dramabarn', 'notice how he says "I was told it was fine" twice. who told him. name names max', 911],
      ['gluefactory', 'week off = 2 days, calling it now', 3402],
    ] },
  { id: 'mXc4vEcr47b', ch: 'maxplaysstuff', title: 'Cragmoor Survival Ep. 47 - THE CAVE (do not go in the cave)', date: '2013-10-09', dur: '22:10', views: 940211, likes: 30480, dislikes: 811,
    tags: ['cragmoor', 'survival', 'lets play', 'series'], scene: { kind: 'game', sky: '#2b2f3a', ground: '#3a3a3a', hero: '#ffcc33', text: 'EP 47' },
    desc: 'We\'re back!! Episode 47. There is something in the cave and Toby (my dog in game, not real) does NOT like it.',
    caps: [[0, 'what is up maximums welcome back to cragmoor'], [30, 'today we go in the cave. everyone said don\'t go in the cave'], [200, 'Toby is growling. why is Toby growling'], [500, 'there is a door down here. why is there a door in a cave'], [900, 'I\'m not opening it. I\'m opening it.'], [1200, 'see you next episode']],
    comments: [
      ['kevlarkev', 'glad you\'re back man. the cragmoor series is the best thing on vidder', 1203],
      ['neon_viking', 'resubbed. dont make me regret it', 640],
      ['pixel_wren', 'the door in cragmoor caves is a known glitch, the devs said its a leftover from an old build. its not supposed to open', 220, [['gluefactory', 'it opened though', 188], ['pixel_wren', 'yeah. i know.', 401]]],
      ['tylerdoesvlogs', 'TOBY!!!!!', 99],
    ] },

  // ---- Pruitt Reviews -----------------------------------------------------------------------
  { id: 'prT0aSt400h', ch: 'pruittreviews', title: 'Review: Halvorsen ProToast 4-Slice (Model HT-400)', date: '2012-02-11', dur: '14:55', views: 801233, likes: 22190, dislikes: 140,
    tags: ['toaster', 'review', 'halvorsen', 'appliances'], scene: { kind: 'unboxing', item: '#9aa0a6', text: 'HT-400' },
    desc: 'A complete review of the Halvorsen ProToast HT-400. I tested this unit for three weeks with white bread, rye, English muffins and one frozen waffle. Purchased at full retail price ($64.99) from Hartwell\'s.\n\nChapters:\n0:00 Introduction\n2:10 Build quality\n5:45 Browning consistency\n9:30 The crumb tray\n13:00 Verdict\n\nToast responsibly.',
    caps: [[0, 'Good evening. Today we are looking at the Halvorsen ProToast HT-400.'], [40, 'The housing is brushed steel. It is cool to the touch on the sides, which I appreciate.'], [130, 'Build quality is acceptable. The lever has some wobble.'], [345, 'Browning consistency is where this unit shines. Look at this. Even.'], [570, 'The crumb tray is, I am sorry to say, a disgrace.'], [780, 'Verdict: four slices out of five. Toast responsibly.']],
    comments: [
      ['helpfulhank', 'Mr. Pruitt, I have had the HT-400 for six years. You are right about the crumb tray. I bent mine back with pliers. Works fine now. Thank you for the review. Hank', 3001],
      ['breadhead', 'this man is the last honest person on the internet', 12043],
      ['pickledpete', 'I was on the fence about this toaster but this review really made me pop up', 30, [['actually_its_pronounced', 'No.', 911]]],
      ['ostrichmom', 'my kids think you are a wizard. we watch you during breakfast', 640],
    ] },
  { id: 'prBreadmst2', ch: 'pruittreviews', title: 'Review: The Breadmaster Duo — Do Not Buy This Toaster', date: '2010-06-03', dur: '8:20', views: 1240600, likes: 34020, dislikes: 410,
    tags: ['toaster', 'review', 'breadmaster', 'warning'], scene: { kind: 'unboxing', item: '#c0392b', text: 'DO NOT BUY' },
    desc: 'I do not often tell people not to buy something. Do not buy the Breadmaster Duo. The left slot does not work. The right slot works too well. I have contacted the manufacturer twice.\n\nToast responsibly.',
    caps: [[0, 'Good evening. I am going to be brief.'], [20, 'The left slot does not heat. At all.'], [90, 'The right slot reached a temperature I could not measure. My thermometer stops at 600.'], [200, 'I contacted Breadmaster. They sent me a coupon. For a Breadmaster.'], [420, 'Do not buy this toaster. Toast responsibly.']],
    comments: [
      ['lurkmore2009', 'the original. 2010 pruitt was a different beast', 2110],
      ['m_teller', '"they sent me a coupon. for a breadmaster." the restraint in his voice', 8320],
      ['breadmaster_support', 'Hi Dennis, we\'d love to make this right. Please DM us.', 2, [['pruittreviews', 'You have my email. You have had my email for three years.', 15022]]],
    ] },
  { id: 'prRemixMsg1', ch: 'pruittreviews', title: 'A Message to My Viewers (Re: "TOASTED" Remix)', date: '2011-09-14', dur: '3:12', views: 2004110, likes: 98201, dislikes: 302,
    tags: ['pruitt', 'remix', 'toasted', 'message'], scene: { kind: 'vlog', color: '#8a7a5a', face: 'pruittreviews', faceSpec: { hair: '#8c8c8c', glasses: true, mood: 'flat', shirt: '#59636e' } },
    desc: 'I have been made aware of the remix. Thank you for all of your messages.',
    caps: [[0, 'Good evening. This is not a review.'], [8, 'Many of you have sent me a song called "TOASTED".'], [20, 'In it, I say "even browning" four hundred times, over a beat.'], [45, 'My granddaughter tells me this is an honour. I will take her word for it.'], [90, 'I do ask that you not send it to me at three in the morning.'], [150, 'Normal reviews resume next week. Toast responsibly.']],
    comments: [
      ['breadhead', 'he called it an honour. we don\'t deserve this man', 22103],
      ['beatsbynobody', 'sorry dennis. (it was not me but i understand the urge)', 4010],
      ['ghostlemon', 'EVEN. BROWNING. *bass drop*', 6602],
      ['kit_halloran', 'played this for my patients on the ward and an 80 year old man laughed so hard he needed his inhaler. thank you mr pruitt', 3203],
    ] },
  { id: 'prCompare13', ch: 'pruittreviews', title: 'Toaster Comparison 2013: Six Machines, One Bagel', date: '2013-09-28', dur: '26:31', views: 330980, likes: 15120, dislikes: 88,
    tags: ['toaster', 'comparison', '2013', 'bagel'], scene: { kind: 'slides', color: '#8a7a5a', cards: ['SIX MACHINES', 'ONE BAGEL', 'Halvorsen HT-400', 'Corvette ToastPro', 'Hartwell Basic', 'Breadmaster Duo II', 'Nikko SmartToast', 'Unbranded ($9)', 'VERDICT'] },
    desc: 'My annual comparison. This year we toast a single everything bagel in six machines. Yes, the Breadmaster Duo II is included. Yes, I bought it with my own money. It was difficult.\n\nToast responsibly.',
    caps: [[0, 'Good evening, and welcome to the 2013 comparison.'], [120, 'The unbranded nine dollar unit performed, frankly, above its station.'], [600, 'The Nikko SmartToast has an app. A toaster with an app. I do not know why.'], [1100, 'The Breadmaster Duo II. They fixed the left slot. They broke the right one.'], [1500, 'Winner: the Halvorsen. Again. Toast responsibly.']],
    comments: [
      ['rigdoctor', 'The Nikko SmartToast teardown is wild btw, it has a full ARM chip in it. For toast.', 912, [['pruittreviews', 'Thank you, Sam. That would explain the price.', 2210]]],
      ['helpfulhank', 'The $9 one winning against the Breadmaster made my week. Hank', 404],
      ['xXDeathGripXx', 'imagine spending 26 minutes on bread lmao', 3, [['breadhead', 'imagine spending 26 seconds on a comment this bad', 801]]],
    ] },

  // ---- KaylaKreates / GlitterGrrl ------------------------------------------------------------
  { id: 'kKfallEye13', ch: 'kaylakreates', title: 'Fall Makeup Tutorial | Pumpkin Spice Eyes 🍂', date: '2013-09-24', dur: '12:08', views: 610388, likes: 24055, dislikes: 1902,
    tags: ['makeup', 'fall', 'tutorial', 'pumpkin spice'], scene: { kind: 'vlog', color: '#d18a2d', face: 'kaylakreates', faceSpec: { long: true, hair: '#3b2518', skin: '#e8b796', shirt: '#e8a0bf' } },
    desc: 'hi you guys!! 🍂 my favourite season is HERE. today: a warm, wearable pumpkin spice eye look using drugstore stuff. full product list below ⬇\n\n(this video is NOT sponsored. if something is ever sponsored I will say it in the first 10 seconds, always 💛)',
    caps: [[0, 'hi you guys, welcome back!'], [15, 'okay so this is NOT sponsored, I just love fall'], [90, 'start with a warm transition shade in the crease'], [300, 'little bit of copper on the lid, pat don\'t swipe'], [560, 'and that\'s it! super wearable, super cozy'], [700, 'love you guys, see you tuesday']],
    comments: [
      ['hannah_lu', 'the "not sponsored, and I will always tell you" line in the description is so classy after this month lol', 2311],
      ['glittergrrl', 'cute look hun 💅', 40, [['dramabarn', 'the 💅 is doing a LOT of work here', 1320], ['megan_oduya', 'bree why are you like this', 610]]],
      ['beautybylou', 'what transition shade did you use?? the link is broken', 18, [['kaylakreates', 'sorry!! it\'s Fawn Fields by Milou, fixed the link 💛', 52]]],
    ] },
  { id: 'kKmasonLamp', ch: 'kaylakreates', title: 'DIY Mason Jar Lamp (super easy!!)', date: '2012-11-02', dur: '7:45', views: 1880712, likes: 40332, dislikes: 1220,
    tags: ['diy', 'mason jar', 'lamp', 'crafts'], scene: { kind: 'unboxing', item: '#f2d16b', text: 'DIY!!' },
    desc: 'a mason jar lamp for under $10! you need: a mason jar, a lamp kit from any hardware store, a drill (ask a grown up lol)',
    caps: [[0, 'hi guys! today we are making a lamp'], [60, 'drill a hole in the lid, slowly'], [200, 'thread the cord through like this'], [360, 'and it works!! look at that glow']],
    comments: [
      ['helpfulhank', 'Lovely project Kayla. Please everyone make sure the lamp kit is UL listed, and don\'t use a bulb over 40 watts in a sealed jar, it gets very hot. Hank', 9020, [['kaylakreates', 'thank you Hank!! pinning this 💛', 1100]]],
      ['marisol_b', 'made two of these for my tiny apartment. they look great', 340],
      ['carl_brennan', 'MADE THIS FOR MY WIFE. SHE LOVES IT. LOL', 88],
    ] },
  { id: 'kKaboutBree', ch: 'kaylakreates', title: 'about bree. (please watch before commenting)', date: '2013-10-05', dur: '16:20', views: 2210044, likes: 120994, dislikes: 30221,
    tags: ['drama', 'glittergrrl', 'lumiere', 'storytime'], scene: { kind: 'rant', color: '#9aa0a6', face: 'kaylakreates', faceSpec: { long: true, hair: '#3b2518', skin: '#e8b796', mood: 'flat', shirt: '#333' } },
    desc: 'I didn\'t want to make this. I\'m only going to make it once. Please do not send hate to anyone, including Bree.',
    caps: [[0, 'hi. so. I didn\'t want to make this video.'], [30, 'in March, Bree and I talked about doing a palette together'], [120, 'I sent her my colour stories. all twelve shades.'], [300, 'in September, the Lumiere palette came out. you\'ve all seen it.'], [500, 'I have the emails. I\'m not going to show them. I just want you to know they exist.'], [800, 'please don\'t send her hate. I mean it. I just needed to say this out loud.']],
    comments: [
      ['dramabarn', 'side by side of the shade names: "Fawn Fields" vs "Fawn Field". BREE', 30210, [['glittergrrl', 'colours arent copyrighted hun', 1920], ['megan_oduya', 'neither is having a conscience apparently', 12002]]],
      ['hannah_lu', 'she literally said don\'t send hate and the comments are a warzone', 4020],
      ['xXDeathGripXx', 'women fighting over eyeshadow 🍿', 22, [['ellie_draws', 'hope you find something to be happy about :)', 3330]]],
      ['actually_its_pronounced', 'For the record, Lumiere\'s own site lists the palette as "designed by GlitterGrrl in March". Which is when Kayla says the conversation happened.', 8901],
    ] },
  { id: 'gGlumPalet1', ch: 'glittergrrl', title: 'GLITTERGRRL x LUMIERE PALETTE REVEAL!!! 💜', date: '2013-09-03', dur: '10:33', views: 1640922, likes: 52011, dislikes: 18400,
    tags: ['lumiere', 'palette', 'collab', 'makeup'], scene: { kind: 'unboxing', item: '#a36bd1', text: 'ITS HERE' },
    desc: 'ITS FINALLY HERE!!! my dream palette with @Lumiere. 12 shades I designed from scratch 💜 available now at Lumiere and Hartwell\'s',
    caps: [[0, 'OK GUYS IT\'S HERE'], [40, 'twelve shades, all designed by me, from scratch'], [180, 'this one is called Fawn Field, it\'s my baby'], [400, 'go get it before it sells out!!']],
    comments: [
      ['dramabarn', 'coming back to this after the kayla video. "designed by me from scratch" aged like milk', 18031],
      ['beautybylou', 'bought it before all this. the formula is honestly good though?', 1022, [['megan_oduya', 'the formula is fine. the ethics are chalky', 4209]]],
      ['glittergrrl', 'pinning this: I DID design this. stop sending me death threats over EYESHADOW', 2930],
    ] },
  { id: 'gGresponse1', ch: 'glittergrrl', title: 'my response.', date: '2013-10-07', dur: '4:51', views: 1980330, likes: 22440, dislikes: 109201,
    tags: ['response', 'drama'], scene: { kind: 'rant', color: '#a36bd1', face: 'glittergrrl', faceSpec: { long: true, hair: '#d9b56b', mood: 'flat', shirt: '#111' } },
    desc: 'comments off. you all know why.',
    caps: [[0, 'I\'m only saying this once.'], [10, 'Kayla and I talked. Talking is not a contract.'], [60, 'Lots of people use the colour fawn. It is a colour.'], [150, 'I wish her the best. I really do. Bye.']], comments: [] },

  // ---- Danny Cooks Poorly -------------------------------------------------------------------
  { id: 'dCmicroLas1', ch: 'dannycookspoorly', title: 'Making Lasagna With Only A Microwave (bad idea)', date: '2012-03-16', dur: '11:47', views: 2402109, likes: 70333, dislikes: 1201,
    tags: ['cooking', 'lasagna', 'microwave', 'fail'], scene: { kind: 'cooking', food: '#c0392b', text: 'MICROWAVE??' },
    desc: 'My oven broke so I made lasagna in a microwave. My sister Sophia has asked me to state that she was not consulted.\n\nRecipe (do not follow): in the video',
    caps: [[0, 'Hey everybody, welcome to Danny Cooks Poorly!'], [30, 'oven\'s broken. we have a microwave and confidence.'], [180, 'the noodles are... crunchy in the middle. that\'s normal right'], [400, 'it sparked. why did it spark. there\'s no metal'], [550, 'there was metal. it was a twist tie. in the cheese.'], [680, 'Sophia rates it a 3. she\'s being nice.']],
    comments: [
      ['sophia_reyes', 'I want it on the record that I was NOT consulted', 18020],
      ['carbonara_kid', 'MICROWAVE. LASAGNA. I am going to lie down', 1240],
      ['helpfulhank', 'Danny, never microwave a twist tie. You were lucky. Love the show. Hank', 903],
      ['breadhead', '"there was metal. it was a twist tie. in the cheese." poetry', 3320],
    ] },
  { id: 'dCpancakeHk', ch: 'dannycookspoorly', title: 'I Tried The "Viral" Pancake Hack (ketchup bottle method)', date: '2013-06-28', dur: '9:02', views: 980120, likes: 31004, dislikes: 640,
    tags: ['pancakes', 'hack', 'cooking', 'viral'], scene: { kind: 'cooking', food: '#e8b04a', text: 'IT WORKS?' },
    desc: 'You\'ve all seen the hack where you put pancake batter in a ketchup bottle. I did not wash the ketchup bottle well enough.',
    caps: [[0, 'okay the hack. batter in a squeeze bottle.'], [80, 'this is going really well actually'], [200, 'why is it pink'], [260, 'oh no. that\'s ketchup. there was ketchup left.'], [400, 'ketchup pancakes. honestly? not the worst thing I\'ve made']],
    comments: [
      ['sophia_reyes', 'the worst part is he made me try them and they were FINE', 4401],
      ['pickledpete', 'this video really ketchup to me', 12, [['carbonara_kid', 'get OUT', 340]]],
      ['ostrichmom', 'my 7 year old wants ketchup pancakes now. thanks danny', 902],
    ] },
  { id: 'dCchili40pp', ch: 'dannycookspoorly', title: 'Chili For 40 People (church potluck, no pressure)', date: '2013-10-11', dur: '15:30', views: 201554, likes: 12810, dislikes: 102,
    tags: ['chili', 'potluck', 'big batch', 'cooking'], scene: { kind: 'cooking', food: '#8e3b1b', text: 'FOR 40??' },
    desc: 'St. Brendan\'s asked me to make chili for the fall potluck. They have seen my videos. They asked anyway. Wish me luck. Shout out to Aunt Deb for the giant pot.',
    caps: [[0, 'this is the biggest pot I have ever seen'], [100, 'Aunt Deb lent me this pot. it has a name. it\'s called Big Linda.'], [400, 'four pounds of beans. is that enough. that feels like enough'], [700, 'tasting... it\'s actually good? I\'m scared'], [900, 'update from the potluck: they ate ALL of it. I\'m crying']],
    comments: [
      ['aunt_deb', 'So proud of you Danny!!! Big Linda has fed this parish since 1987... You did her proud... Love, Aunt Deb', 2210],
      ['wexley_native', 'st brendans on harbor street? my mom was at that potluck, she said it was legit good', 404],
      ['sophia_reyes', 'first video where I didn\'t have to lie. growth', 3021],
    ] },

  // ---- Gravy Boat Guy ------------------------------------------------------------------------
  { id: 'gBforlater0', ch: 'w_haskins', title: 'it\'s for later', date: '2010-10-02', dur: '0:19', views: 48201776, likes: 610225, dislikes: 9120,
    tags: ['gravy', 'rain'], scene: { kind: 'outdoor', time: .8 }, thumbAt: .5,
    desc: '',
    caps: [[0, '[rain]'], [3, '[man standing in parking lot holding a gravy boat]'], [8, 'what\'s that for?'], [11, 'it\'s for later.'], [15, '[he walks away]']],
    comments: [
      ['lurkmore2009', 'paying respects to the most important 19 seconds on the internet', 40221],
      ['dialtone_dana', 'I was here when this had 400 views. I told everyone on MyPlace. nobody listened', 12003],
      ['ghostlemon', 'it\'s for later', 88201, [['breadhead', 'it\'s for later', 20220], ['pickledpete', 'it\'s for later', 15021], ['actually_its_pronounced', 'What is?', 30400], ['ghostlemon', 'you know what', 40001]]],
      ['tapewormtheory', 'genuinely though who was filming. the second voice is never identified. three years and nobody knows', 2203],
      ['w_haskins', 'it was my neighbour. he does not want to be found. neither do i.', 60102],
    ] },
  { id: 'gBclarify11', ch: 'w_haskins', title: 'clarification', date: '2011-02-14', dur: '1:02', views: 9120330, likes: 201330, dislikes: 2003,
    tags: ['gravy', 'clarification'], scene: { kind: 'vlog', color: '#59636e', face: 'w_haskins', faceSpec: { hair: '#8c8c8c', glasses: true, mood: 'flat', shirt: '#59636e' } },
    desc: 'please stop coming to my house',
    caps: [[0, 'I\'m only going to say this once.'], [5, 'It was gravy. For later. There\'s no deeper meaning.'], [20, 'I was bringing it to my sister\'s. She forgot it at Thanksgiving.'], [35, 'Please stop leaving gravy boats on my porch. I have forty-one.'], [50, 'that\'s it.']],
    comments: [
      ['ghostlemon', '"I have forty-one" is the funniest thing anyone has ever said', 30120],
      ['bigdaveontheroad', 'i left one in 2011 when i was driving thru. sorry walt. it was a nice one tho', 9010],
      ['ellie_draws', 'I hope he\'s doing ok. this was a lot to go through for one sentence :)', 4220],
    ] },

  // ---- Doug ------------------------------------------------------------------------------------
  { id: 'dGvacuum012', ch: 'dougtheunbothered', title: 'Doug Does Not Care About The Vacuum', date: '2011-11-30', dur: '2:14', views: 12403119, likes: 302110, dislikes: 1902,
    tags: ['cat', 'doug', 'vacuum', 'unbothered'], scene: { kind: 'cat', fur: '#777', animal: 'cat', color: '#c9b9a6' },
    desc: 'Every cat on earth fears the vacuum. Doug is not every cat.',
    caps: [[0, '[vacuum starts]'], [10, '[Doug does not move]'], [40, '[vacuum gets closer]'], [70, '[Doug yawns]'], [100, '[vacuum touches Doug]'], [110, '[Doug looks at camera]'], [125, 'Priya: Doug, please.']],
    comments: [
      ['ellie_draws', 'drew doug as a renaissance painting. he looks exactly the same :)', 9201],
      ['jess_whitlock', 'doug is my spirit animal. specifically during meetings', 22109],
      ['priya_raman', 'Doug has asked me to say he has seen your comments and does not care.', 40201],
    ] },
  { id: 'dGcucumber3', ch: 'dougtheunbothered', title: 'Doug vs. Cucumber (he wins)', date: '2012-08-14', dur: '1:21', views: 6201330, likes: 180332, dislikes: 2201,
    tags: ['cat', 'doug', 'cucumber'], scene: { kind: 'cat', fur: '#777', color: '#a8b8a0' },
    desc: 'Everyone is scaring their cats with cucumbers. We tried. Doug ate it. Please don\'t scare your cats.',
    caps: [[0, '[cucumber placed behind Doug]'], [20, '[Doug turns around slowly]'], [35, '[Doug sniffs cucumber]'], [50, '[Doug eats cucumber]'], [70, 'Priya: that\'s... fine I guess']],
    comments: [
      ['helpfulhank', 'Good for Doug. Hank', 1201],
      ['megan_oduya', 'he ate it out of SPITE', 8810],
    ] },
  { id: 'dGbday5th00', ch: 'dougtheunbothered', title: 'Doug\'s 5th Birthday Party (he attended)', date: '2013-05-02', dur: '3:40', views: 2210331, likes: 90221, dislikes: 302,
    tags: ['cat', 'doug', 'birthday'], scene: { kind: 'cat', fur: '#777', color: '#e8a0bf' },
    desc: 'Doug turned five. There was a fish-shaped cake. He sat near it.',
    caps: [[0, 'Priya: happy birthday Doug!'], [20, '[party horn]'], [25, '[Doug does not react to party horn]'], [100, '[Doug sits near cake]'], [180, '[Doug leaves party early]']],
    comments: [
      ['jess_whitlock', 'leaving your own party early is the most doug thing possible', 6602],
      ['ellie_draws', 'happy birthday doug!! (he doesnt care) :)', 2201],
    ] },

  // ---- RigDoctor -----------------------------------------------------------------------------------
  { id: 'rDbuild2013', ch: 'rigdoctor', title: 'How To Build A Gaming PC — Full Step-by-Step Guide (2013)', date: '2013-04-20', dur: '41:18', views: 3340221, likes: 88402, dislikes: 1102,
    tags: ['pc build', 'tutorial', 'gaming pc', 'guide'], scene: { kind: 'tutorial', text: 'FULL GUIDE' },
    desc: 'Everything, start to finish. No skipped steps, no "and then it works". If you get stuck, c/rigbuilders on Threadit is where I answer questions.\n\n0:00 Parts overview\n4:30 CPU install\n9:10 Thermal paste (yes, the pea method)\n13:00 RAM\n15:20 Case prep\n22:00 Power supply\n28:30 Cable management\n35:00 First boot\n38:40 If it doesn\'t POST',
    caps: [[0, 'Welcome. Today we build a computer from nothing.'], [270, 'Line up the golden triangle. Never force the CPU.'], [550, 'A pea-sized dot of paste. Not a spread. Not a smiley face.'], [1320, 'Plug the 8-pin CPU power in. You\'ll forget. Everyone forgets.'], [2100, 'First boot. If you hear one short beep, that\'s good.'], [2320, 'No beep? Check the 8-pin. I told you.']],
    comments: [
      ['marcus_webb', 'built my nephew\'s first PC with this. it posted first try. he thinks I\'m a genius. I am not, Sam is', 3301],
      ['xXDeathGripXx', 'imagine not just buying a console', 4, [['rigdoctor', 'Imagine not reading the room.', 2203]]],
      ['tylerdoesvlogs', 'saving up for this!! i have $41 so far', 902, [['rigdoctor', 'Good start. Message me on Threadit when you get to $300 and I\'ll help you pick parts.', 4402]]],
      ['bluescreenbetty', '38:40 saved me. it was the 8-pin. he TOLD me', 1201],
    ] },
  { id: 'rDcoilWhine', ch: 'rigdoctor', title: 'Is Your PC Making THIS Noise? (coil whine explained)', date: '2012-12-01', dur: '8:33', views: 720110, likes: 18810, dislikes: 330,
    tags: ['coil whine', 'pc', 'troubleshooting', 'noise'], scene: { kind: 'slides', color: '#2d8a4f', cards: ['WHAT IS COIL WHINE?', 'Inductors vibrating', 'Usually harmless', 'Cap your frame rate', 'When to RMA', 'When it is NOT coil whine'] },
    desc: 'That high-pitched buzz when you play games? Probably coil whine. Probably harmless. Here\'s how to tell.',
    caps: [[0, 'That noise. You know the one.'], [90, 'It\'s the inductors on your graphics card vibrating.'], [240, 'Cap your frame rate in menus. 900 FPS on a menu screen will scream.'], [400, 'If the noise is a click or a grind, that\'s not coil whine. That\'s a hard drive.']],
    comments: [
      ['helpfulhank', 'Good explanation Sam. Same thing happens in old transformers. Hank', 302],
      ['kit_halloran', 'mine only whines at 3am which feels personal', 1220],
    ] },

  // ---- PedalPush -------------------------------------------------------------------------------
  { id: 'pPcoastRd01', ch: 'pedalpush', title: 'Riding the Coast Road at Sunrise — Port Wexley to Gull Point', date: '2013-08-17', dur: '24:05', views: 31200, likes: 1902, dislikes: 12,
    tags: ['cycling', 'port wexley', 'coast road', 'sunrise'], scene: { kind: 'bike', time: .12 },
    desc: 'Left at 5:40am. Gull Point by 6:30. No talking for most of this one, just the road. Coffee at Marlow\'s at the end (not sponsored, I just love them).',
    caps: [[0, 'morning. it\'s 5:40 and I hate myself, let\'s go.'], [200, '[wind]'], [600, 'this is my favourite bit, right here, past the lighthouse'], [1100, 'Gull Point. made it. coffee time.']],
    comments: [
      ['wexley_native', 'the coast road before the tourists wake up. this is what wexley actually looks like', 402],
      ['megan_oduya', 'lena you are insane for doing this before class. respect', 120],
      ['bigdaveontheroad', 'i drive that road in the truck sometimes. watch out for the bend at mile 3 the sand gets bad', 88, [['pedalpush', 'oh I know. I KNOW.', 61]]],
    ] },
  { id: 'pPdooredPSA', ch: 'pedalpush', title: 'I got doored. (a bike safety PSA, I\'m fine)', date: '2013-05-09', dur: '6:42', views: 88120, likes: 4022, dislikes: 301,
    tags: ['cycling', 'safety', 'dooring', 'psa'], scene: { kind: 'vlog', color: '#16a085', face: 'pedalpush', faceSpec: { long: true, hair: '#b3401f', shirt: '#16a085', mood: 'flat' } },
    desc: 'Harbor Street, Tuesday. Driver opened their door without looking. I\'m fine, the bike is not. Please look before you open your door. Dutch reach. Look it up.',
    caps: [[0, 'hey. I\'m fine. bruised, but fine.'], [40, 'someone opened their car door right into me on Harbor Street'], [150, 'drivers: use your far hand to open the door. it makes you turn and look.'], [300, 'and we NEED a protected lane on Harbor. I\'m emailing the council again.']],
    comments: [
      ['wexley_native', 'harbor street is a deathtrap. council has been "studying" it since 2009', 640],
      ['carl_brennan', 'BIKES SHOULD BE ON THE SIDEWALK', 3, [['pedalpush', 'Carl that is illegal and you know it', 402], ['megan_oduya', 'uncle carl please', 220]]],
    ] },

  // ---- beats by nobody --------------------------------------------------------------------------
  { id: 'bNrainTues1', ch: 'beatsbynobody', title: 'rain on a tuesday [lo-fi]', date: '2012-11-20', dur: '3:12', views: 2810330, likes: 81220, dislikes: 402,
    tags: ['lofi', 'beats', 'study', 'rain'], scene: { kind: 'music', color: '#3d5a80', label: 'rain on a tuesday' }, music: { seed: 7, bpm: 72, mood: 'minor' },
    desc: 'for studying. or not studying.', caps: [[0, '♪']],
    comments: [
      ['kit_halloran', 'this got me through a 14 hour shift. thank you nobody', 2201],
      ['mossgarden', 'that vinyl crackle layered under the rhodes is so nice. what sample pack?', 120, [['beatsbynobody', 'recorded my own kettle', 902]]],
      ['ellie_draws', 'drawing to this right now :)', 401],
    ] },
  { id: 'bNlastBus02', ch: 'beatsbynobody', title: 'the last bus home', date: '2013-03-03', dur: '2:48', views: 1220190, likes: 40221, dislikes: 211,
    tags: ['lofi', 'beats', 'night', 'bus'], scene: { kind: 'music', color: '#2b2140', label: 'the last bus home' }, music: { seed: 21, bpm: 80, mood: 'minor' },
    desc: 'number 14. empty except for me and the driver.', caps: [[0, '♪']],
    comments: [
      ['wexley_native', 'the 14 is the eastside line in wexley. is nobody from wexley??', 802, [['beatsbynobody', 'maybe', 1201]]],
      ['megan_oduya', 'every bus is the last bus home if you are tired enough', 330],
    ] },
  { id: 'bN417am0003', ch: 'beatsbynobody', title: '4:17 am', date: '2013-09-30', dur: '4:17', views: 402119, likes: 20330, dislikes: 98,
    tags: ['lofi', 'ambient', 'night'], scene: { kind: 'music', color: '#14182a', label: '4:17 am' }, music: { seed: 417, bpm: 64, mood: 'minor' },
    desc: 'woke up at the same time three nights in a row. made this.', caps: [[0, '♪']],
    comments: [
      ['kit_halloran', 'i also wake up at 4:17. every night for a month. thought it was just me', 902, [['tapewormtheory', 'wait me too?? this is the second thread i\'ve seen about 4:17', 402], ['grumbletoes', 'It\'s a common time to wake up during a sleep cycle. Please don\'t start a thing.', 1200]]],
      ['mossgarden', 'the detuned pad at 2:40 is beautiful', 220],
    ] },

  // ---- Wexley News 9 ------------------------------------------------------------------------
  { id: 'wNseagull01', ch: 'wexleynews9', title: 'Seagull Steals Entire Hot Dog Cart Umbrella At Harbor Fest', date: '2013-07-07', dur: '1:48', views: 1840221, likes: 30220, dislikes: 402,
    tags: ['port wexley', 'seagull', 'harbor fest', 'news'], scene: { kind: 'news', ticker: 'GULL TAKES UMBRELLA - HARBOR FEST' },
    desc: 'A seagull made off with more than a snack at Saturday\'s Harbor Fest. Reporter Glenn Ashby has the story.',
    caps: [[0, 'Good evening. A bizarre scene at Harbor Fest today.'], [15, 'Vendor Sal Moretti says the gull "looked him dead in the eye".'], [40, 'The umbrella was last seen heading toward Gull Point.'], [80, 'Glenn Ashby, Wexley News 9.']],
    comments: [
      ['wexley_native', 'that gull has been terrorising sal for YEARS. finally on the news', 4022],
      ['pickledpete', 'he was just trying to make a quick buck... I mean a quick gull... I mean', 3, [['actually_its_pronounced', 'Please stop.', 520]]],
      ['carl_brennan', 'GO GULLS!!!!', 902, [['jess_whitlock', 'carl I don\'t think this is about the football team', 401]]],
    ] },
  { id: 'wNpowerCut1', ch: 'wexleynews9', title: 'Power Cut Leaves 8,000 Without Electricity In Eastside', date: '2013-09-19', dur: '2:33', views: 41022, likes: 220, dislikes: 30,
    tags: ['port wexley', 'power cut', 'eastside', 'news'], scene: { kind: 'news', ticker: 'EASTSIDE POWER CUT - 8,000 AFFECTED' },
    desc: 'Coastal Power says a substation fault caused Thursday night\'s outage. Power was restored by 4:20am.',
    caps: [[0, 'Thousands on the eastside spent Thursday night in the dark.'], [30, 'Coastal Power blames a fault at the Mill Road substation.'], [70, 'Residents report hearing a "humming" sound before the outage.'], [110, 'Power was restored at around 4:20 Friday morning.']],
    comments: [
      ['wexley_native', 'the humming was real. whole street heard it. coastal power says "equipment noise" ok sure', 120],
      ['marcus_webb', 'my UPS screamed for an hour. fun night', 40],
    ] },

  // ---- hollowfrequency ------------------------------------------------------------------------
  { id: 'hF20140309x', ch: 'hollowfrequency', title: '2014-03-09', date: '2013-01-01', dur: '4:44', views: 1201, likes: 3, dislikes: 40,
    tags: [], scene: { kind: 'static', shape: true, dark: true }, desc: '', caps: [[0, ''], [180, '[a tone]'], [284, '']],
    comments: [
      ['tapewormtheory', 'the upload date says january 1 but the title is a date that hasn\'t happened yet. every hollowfrequency video is like this', 30, [['grumbletoes', 'Upload dates of 01-01 are what Vidder shows when the original metadata is missing. It doesn\'t mean anything.', 22]]],
      ['ghostlemon', 'at 3:00 there is a tone and then i swear the shape gets closer', 14],
      ['cobbled_up', 'what\'s supposed to be happening here', 2],
    ] },
  { id: 'hFhallway07', ch: 'hollowfrequency', title: 'the hallway (restored)', date: '2013-01-01', dur: '11:06', views: 4022, likes: 81, dislikes: 12,
    tags: ['lantern'], scene: { kind: 'hallway' }, desc: '', caps: [[0, ''], [400, '[footsteps, distant]'], [600, ''], [640, '[a door, somewhere]'], [666, '']],
    comments: [
      ['tapewormtheory', 'THIS IS IT. THIS IS THE LANTERN TAPE. 11:06 runtime, same hallway, same light. who uploaded this', 120, [['grumbletoes', 'The runtime matches. That is all that matches so far. Thread in c/lostmedia, please keep discussion there.', 80]]],
      ['q_mardell', 'The door at 10:40 is the one from the cave.', 1],
      ['kit_halloran', 'not watching this at 4am again. not doing it', 9],
    ] },

  // ---- Vidder official ------------------------------------------------------------------------
  { id: 'vDnew2013ab', ch: 'vidder', title: 'Introducing the new Vidder', date: '2013-06-10', dur: '2:01', views: 8201774, likes: 40221, dislikes: 380112,
    tags: ['vidder', 'redesign', 'announcement'], scene: { kind: 'slides', color: '#d1252a', cards: ['THE NEW VIDDER', 'Cleaner.', 'Faster.', 'More you.', 'Watch Later', 'Recommended For You', 'Broadcast yourself.'] },
    desc: 'Today we\'re rolling out a brand new Vidder. A cleaner home page, a smarter Recommended For You, and Watch Later for everyone. We can\'t wait to hear what you think!',
    caps: [[0, '[upbeat ukulele]'], [20, 'A cleaner home page.'], [50, 'Recommended For You, now smarter than ever.'], [90, 'Watch Later, so you never miss a thing.'], [115, 'Broadcast yourself.']],
    comments: [
      ['lurkmore2009', 'bring back the 5 star ratings you cowards', 120330],
      ['neon_viking', 'the ukulele is a war crime', 40221],
      ['rigdoctor', 'Can you at least fix the comments from 2011 that disappeared in the March outage? Mine are still gone.', 22110, [['vidder', 'Hi! We\'re always working to improve Vidder. Thanks for the feedback!', 3, []], ['rigdoctor', 'That isn\'t an answer.', 18330]]],
    ] },

  // ---- TylerDoesVlogs -----------------------------------------------------------------------
  { id: 'tYfirstVlog', ch: 'tylerdoesvlogs', title: 'my first vlog!!! (please subscribe)', date: '2013-06-04', dur: '4:12', views: 61, likes: 9, dislikes: 2,
    tags: ['vlog', 'first video', 'tyler'], scene: { kind: 'vlog', color: '#5d7fa3', face: 'tylerdoesvlogs', faceSpec: { hair: '#a8743a', skin: '#f5d2b8', shirt: '#2d4f8a', mood: 'grin' } },
    desc: 'my first vlog!!! please subscribe and like and comment!! i will sub back!! also max dolan if you see this hi',
    caps: [[0, 'hi guys!! welcome to my channel'], [10, 'this is my first vlog so its kind of bad but'], [60, 'this is my room. this is my bed. this is my Skyfort poster'], [150, 'my mom says i have to do homework now so bye!!'], [240, 'please subscribe!!']],
    comments: [
      ['josh_tan', 'first', 3],
      ['aunt_deb', 'Tyler this is wonderful!!! Your Aunt Deb is so proud... Love, Aunt Deb', 4],
      ['helpfulhank', 'Good first video son. Tip: put the camera by the window, the light will look better. Keep it up. Hank', 6, [['tylerdoesvlogs', 'thank you hank!!! i will!!', 2]]],
    ] },
  { id: 'tYmallJosh2', ch: 'tylerdoesvlogs', title: 'DAY AT THE MALL WITH JOSH (we got kicked out)', date: '2013-09-14', dur: '7:30', views: 102, likes: 14, dislikes: 1,
    tags: ['vlog', 'mall', 'josh'], scene: { kind: 'vlog', color: '#d9d2c5', face: 'tylerdoesvlogs', faceSpec: { hair: '#a8743a', skin: '#f5d2b8', shirt: '#c0392b', mood: 'grin' } },
    desc: 'me and josh went to harbor mall!! we did NOT get kicked out (we sort of did) (by a security guy named ron)',
    caps: [[0, 'we are at harbor mall!!'], [60, 'josh say hi'], [62, 'Josh: no'], [200, 'this is the fountain where we throw pennies'], [300, 'Ron says we cant film here. hi Ron'], [420, 'ok we have to go bye!!']],
    comments: [
      ['josh_tan', 'ron was right', 6],
      ['megan_oduya', 'tyler I work at the pretzel place, you walked past me 4 times lol. good vlog', 3],
    ] },

  // ---- RetroRandy -----------------------------------------------------------------------------
  { id: 'rRcollect21', ch: 'retrorandy', title: 'My ENTIRE Pocketeer Collection — 212 of 214 (boxed, graded)', date: '2013-02-02', dur: '58:10', views: 210330, likes: 8022, dislikes: 140,
    tags: ['pocketeer', 'collection', 'retro', 'handheld'], scene: { kind: 'unboxing', item: '#333', text: '212/214' },
    desc: 'Twenty-two years. Every North American Pocketeer cartridge except two: Moon Dredger and Pasta Knight. All boxed. All graded. Condition notes for every one below. If you have either missing title, CIB, message me. I am not joking. I will drive.',
    caps: [[0, 'This is twenty-two years of my life.'], [300, 'Here\'s Bog Patrol. Box is a 7, manual is a 9, cart is perfect.'], [1800, 'People ask why I don\'t open them. Why would I open them.'], [3200, 'And here are the two empty slots. Moon Dredger. Pasta Knight.'], [3400, 'One day.']],
    comments: [
      ['lurkmore2009', 'pasta knight had a print run of like 800. you\'re never finding it randy', 302, [['retrorandy', 'Then I will die looking.', 1102]]],
      ['boltbrigadefan99', 'whats a pocketeer', 2, [['retrorandy', 'I\'m going to pretend I didn\'t see this.', 802]]],
      ['tapewormtheory', 'have you checked c/lostmedia? someone claimed to have a moon dredger prototype in 2011', 140, [['retrorandy', 'That was a reshelled Bog Patrol. I checked. I drove to Ohio.', 909]]],
    ] },

  // ---- sadkeyboard ----------------------------------------------------------------------------
  { id: 'sKskyfortPn', ch: 'sadkeyboard', title: 'Skyfort - Main Theme (Piano Cover)', date: '2013-04-01', dur: '3:55', views: 940110, likes: 41220, dislikes: 210,
    tags: ['piano', 'skyfort', 'cover', 'game music'], scene: { kind: 'music', color: '#2c3e50', label: 'skyfort · piano' }, music: { seed: 99, bpm: 90, mood: 'major' },
    desc: 'Skyfort main theme, arranged for solo piano. Sheet music on request.', caps: [[0, '♪']],
    comments: [
      ['maxplaysstuff', 'this is beautiful man. using this in my next montage (with credit obviously)', 3022, [['sadkeyboard', 'thank you!! please do', 1022]]],
      ['tylerdoesvlogs', 'this made me cry a little bit dont tell josh', 220, [['josh_tan', 'i saw', 410]]],
    ] },
];

// Curated playlists shown on channels and the watch page.
export const PLAYLISTS = [
  { id: 'PLpruitt', title: 'The Essential Pruitt', ch: 'pruittreviews', videos: ['prBreadmst2', 'prRemixMsg1', 'prT0aSt400h', 'prCompare13'] },
  { id: 'PLdoug', title: 'Doug: Collected Works', ch: 'dougtheunbothered', videos: ['dGvacuum012', 'dGcucumber3', 'dGbday5th00'] },
  { id: 'PLnobody', title: 'for when you cannot sleep', ch: 'beatsbynobody', videos: ['bNrainTues1', 'bNlastBus02', 'bN417am0003'] },
  { id: 'PLdanny', title: 'Danny\'s Worst Hits', ch: 'dannycookspoorly', videos: ['dCmicroLas1', 'dCpancakeHk', 'dCchili40pp'] },
  { id: 'PLmaxvolt', title: 'the volt rush situation (in order)', ch: 'maxplaysstuff', videos: ['mXvR9shT3qe', 'mXa1ddrSs00', 'mXc4vEcr47b'] },
  { id: 'PLbeauty13', title: 'Fawn Field / Fawn Fields: the whole story', ch: 'kaylakreates', videos: ['gGlumPalet1', 'kKaboutBree', 'gGresponse1', 'kKfallEye13'] },
];

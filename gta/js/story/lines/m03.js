// MISSION 3: THE WRONG PACKAGE. A warehouse job that has already been cleared; the first physical evidence; a police response that is too fast.
import { scene } from '../dialogue.js';

scene('M03', 'CALL', { via: 'phone', who: 'DARIUS' }, [
  ['DARIUS', 'Warm, friendly, speaking from a car. Treats it like a favour between friends.', 'Ash! My favourite driver. Are you sitting? Don\'t sit. This is a standing kind of job.'],
  ['DARIUS', 'Easy, naming it as if it were nothing.', 'There\'s a sealed hard case in Warehouse 14, down at the port. It\'s mine, it\'s paperwork, it\'s boring. A shipment leaves tonight and the case is going with it by mistake. I\'d like it to stay in Port Alder, with me, like a good citizen.'],
  ['DARIUS', 'A little joke to cover the weight.', 'See Walt Pruitt at the gate. He knows nothing and loves it. Tell him it\'s for me.'],
  ['ASH', 'Careful.', 'And if the case isn\'t there?'],
  ['DARIUS', 'A fraction too fast, still cheerful.', 'It will be. Be quick, be polite, and be home for dinner.']
]);
scene('M03', 'ARRIVE', { via: 'direct', cast: ['WALT', 'ASH'], at: 'place:warehouse' }, [
  ['WALT', 'Tired, at the fence, a flashlight in his hand. He recognises the driver from the pickup.', 'You again. The truck kid.'],
  ['ASH', 'Neutral.', 'Darius sent me. For a case in Warehouse 14.'],
  ['WALT', 'A long exhale. The name is a weight he already carries.', 'That case ain\'t here.'],
  ['ASH', 'Not accepting it.', 'He said it was.'],
  ['WALT', 'Low. He glances at the camera on the pole and keeps his voice under it.', 'He said a lot of things. Everything on that rack was cleared this afternoon. Forklift, flatbed, gone. Nobody told me. Nobody told the paper either.'],
  ['ASH', 'Slowly.', 'Cleared by who?'],
  ['WALT', 'Flat. He has said it before, to himself.', 'That ain\'t my business.'],
  ['ASH', 'Dry. Giving him the out and the push at once.', 'It\'s getting to be everybody\'s business, Walt.'],
  ['WALT', 'A long look. Something moves behind his face and goes back.', 'Rack nine. Back of the building, behind the blue containers. They left a few. If you\'re going to look, don\'t take long. Alarm wasn\'t armed this morning and it\'s been armed since lunch.']
]);
scene('M03', 'MARKS', { via: 'car', cast: ['ASH'] }, [
  ['ASH', 'Muttering, crouched by a container, reading it.', 'Container tag says PAC-4471.'],
  ['ASH', 'A flat, careful read. Quiet thinking aloud.', 'Paperwork on the door says Berth Nine. This is not Berth Nine. This container was never supposed to be here.'],
  ['ASH', 'Pulling a latch, finding a hard case behind a pallet. Low.', 'Okay. Okay, there you are.']
]);
scene('M03', 'FOUND', { via: 'car', cast: ['ASH'] }, [
  ['ASH', 'Opening the case. Reading, a little breathless.', 'Partial shipping manifest. Handwritten notes. And a company name.'],
  ['ASH', 'Slow, reading it off. Unhappy about it.', 'Alder Point Development. Consulting fees. Payable to King Haulage.'],
  ['ASH', 'Closing the case. Fast, a decision.', 'That\'s not paperwork. That\'s a rope.']
]);
scene('M03', 'POLICE', { via: 'radio', who: 'DISPATCH', pri: 3 }, [
  ['DISPATCH', 'Clipped, procedural, a little bored.', 'All units, silent alarm at the Port Warehouse complex, Warehouse 14. Anonymous caller reports a break-in. Units responding, please advise.'],
  ['DISPATCH', 'Same flat tone, repeating after a pause.', 'Dispatch to Unit twelve. You are the first in, report on arrival.'],
  ['MARA', 'Fast, low, over the radio. She has been listening.', 'Ash. Where are you? Tell me you\'re not still in there.'],
  ['MARA', 'Cutting in, quick and furious.', 'That was ninety seconds. Port Alder police don\'t do ninety seconds. Somebody called it in before you opened the door. Get out. Now.']
]);
scene('M03', 'SAFE', { via: 'direct', cast: ['MARA', 'ASH'], at: 'place:room' }, [
  ['MARA', 'Out of breath, trying to be light about it. The jokes land short.', 'You\'re alive. Great. I want that on the record. I\'m not paying your funeral.'],
  ['ASH', 'Lays the case on the bench. Tired, a bit shaky.', 'I found it.'],
  ['MARA', 'Flips the case. Goes quiet. Very quiet. She reads the page for far too long.', '...Alder Point. Sloane.'],
  ['ASH', 'Watching her.', 'You know the name.'],
  ['MARA', 'Slow, a different, flatter voice. The first time she tells the truth.', 'Six months ago, three in the morning, I drove a truck from the port to a place that wasn\'t a place. Nobody said where. The papers on the dash said "Alder Point." I\'ve been watching the docks ever since. This is the first thing I\'ve ever held that looks like what I\'ve been looking for.'],
  ['ASH', 'Level.', 'You never told me.'],
  ['MARA', 'A sharp, tired laugh. Back to her guard.', 'I didn\'t tell you my name until Eddie did it for me. I tell people things when I\'ve decided they\'re useful.'],
  ['ASH', 'Quiet, a small sting.', 'And am I?'],
  ['MARA', 'Looks at Ash. Honest.', 'You walked into a rigged warehouse for a stranger and walked out with this. Yeah. You might be.'],
  ['MARA', 'Low. Practical. The thinking has already started.', 'Darius told you it was his paperwork. This says his money comes from them. That\'s not an ordinary business arrangement. What do you want to do with it?'],
  { choice: 'evidence', prompt: 'The manifest.', options: [
    { v: 'darius', t: 'Give it to Darius. He asked for it.', rel: { DARIUS: 1, MARA: -1 }, set: { gave_darius_manifest: true }, steps: [
      ['ASH', 'Careful, deciding as they speak.', 'He asked for it. I owe him a straight answer, or at least a quiet one.'],
      ['MARA', 'Very flat. The shutters come down.', 'Okay.'],
      ['MARA', 'Cold, not angry. That is worse.', 'Then you should know it\'s the last thing you\'ll hand him that he can\'t take back.']
    ] },
    { v: 'keep', t: 'Keep it. Nobody gets it yet.', rel: { MARA: 0 }, set: { kept_manifest: true }, steps: [
      ['ASH', 'Steady, a little guarded.', 'I\'ll hold it. Nobody sees it until I know whose it is.'],
      ['MARA', 'A slow, approving breath, and a small, real smile.', 'Good. That is the first smart thing anyone has done in this city in a week.']
    ] },
    { v: 'mara', t: 'Share it with Mara. She has been looking longer than I have.', rel: { MARA: 2 }, set: { shared_manifest: true }, steps: [
      ['ASH', 'Pushing the case across the bench.', 'You\'ve been looking for months. It\'s yours as much as mine.'],
      ['MARA', 'Quiet. She does not know what to do with her hands. Then she takes a photo of every page.', 'You don\'t know what that means to me.'],
      ['MARA', 'Quick, rough, hiding it.', 'Okay. We do this together. Don\'t make it weird.']
    ] }
  ] }
]);
scene('M03', 'AFTER', { via: 'phone', who: 'DARIUS' }, [
  ['DARIUS', 'Warm, genuinely curious. Fishing, with a smile in his voice.', 'Ash! You\'re breathing! I\'ve been telling everyone you\'re a legend. Did you get my case?'],
  { if: 'choice:evidence=darius', then: [
    ['ASH', 'Level.', 'I did. I\'ll have it for you tonight.'],
    ['DARIUS', 'A big, delighted laugh with no tension in it at all, which is very much worth noticing.', 'Wonderful. Wonderful. See? That\'s all this is. Nothing has to be hard. You\'re a good man, Ash. Nobody ever gave me a reason to doubt you.']
  ], else: [
    ['ASH', 'Careful, lying with a straight face.', 'It wasn\'t there, Darius. They cleared the rack before I got in.'],
    ['DARIUS', 'A very small pause. The smile does not leave his voice. It sounds slightly less like a person.', 'That\'s strange. Because it was supposed to be. Hm.'],
    ['DARIUS', 'Warm again, rolling over it. A joke, an invitation.', 'It\'s fine. It\'s paperwork. I\'ll sort it out. Get some rest, friend. We\'ll talk soon.']
  ] }
]);

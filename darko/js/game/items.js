// Things Donnie carries. Items with `pages` can be read from the journal's pockets page; a page
// with `when` stays stuck shut until that story flag is set.

export const ITEMS = {
  house_key: {
    name: 'House key',
    text: 'A brass key on a shoelace. The shoelace used to be red.',
  },
  greene: {
    name: 'Graham Greene paperback',
    text: 'Collected Short Stories, Graham Greene. Spine cracked, corners soft. He has been reading it in bed for a week.',
  },
  marker: {
    name: 'Magic marker',
    text: 'The black marker from the fridge notepad. The cap is chewed.',
  },
  axe: {
    name: 'Axe',
    text: "An axe. He doesn't know where it came from. It's heavier than it looks.",
  },
  spraypaint: {
    name: 'Spray paint',
    text: 'A can of black spray paint, half empty.',
  },

  philosophy: {
    name: 'The Philosophy of Time Travel',
    text: 'A battered paperback by Roberta Sparrow, who taught science at Middlesex Ridge a long time ago. Dr. Monnitoff said not to tell anyone where he got it.',
    pages: [
      { head: 'THE PHILOSOPHY OF TIME TRAVEL', text: 'by Roberta Sparrow. Inside the cover, in pencil, someone has written a date from the 1940s and then crossed it out.' },
      { head: 'Chapter One: The Tangent Universe', text: 'Sparrow writes that time is not perfectly stable. Very rarely it frays, and when it does a second universe splits away from ours: a copy, a Tangent. A Tangent cannot hold. It lasts a matter of weeks, and when it collapses it can drag the real universe, the Primary, down with it.' },
      { head: 'Chapter Two: Water and Metal', text: 'The first sign of a Tangent, she says, is an Artifact: an object of metal that appears out of nowhere, carried across from the Primary. Water runs all through her descriptions, as though she thought the two were connected in ways she couldn\'t quite put into words.' },
      { when: 'ptt2', head: 'Chapter Four: The Artifact and the Living', text: 'The Artifact must go back to the Primary Universe before the Tangent collapses. Someone has to send it. She calls that person the Living Receiver.' },
      { when: 'ptt2', head: 'Chapter Six: The Living Receiver', text: 'The Receiver is chosen; Sparrow does not say by whom. While the Tangent lasts, the Receiver may find themselves stronger than they should be, able to do things they can\'t explain, and troubled by frightening visions. Their dreams, she writes, will show them the way.' },
      { when: 'ptt3', head: 'Chapter Seven: The Manipulated Living', text: 'The people closest to the Receiver are drawn into the Tangent too. Without knowing why, they will say and do things that push the Receiver toward the end, and they will make sure the Receiver has every reason to do what must be done.' },
      { when: 'ptt3', head: 'Chapter Eight: The Manipulated Dead', text: 'Those who die inside the Tangent are not bound by time the way the living are. They can move through it. They will come back to the Receiver, and guide them.' },
      { when: 'ptt4', head: 'Chapter Nine: The Ensurance Trap', text: 'If the Receiver will not act, the Dead will build a trap: a chain of events that leaves the Receiver no choice. The trap is the Tangent\'s way of protecting the Primary from itself.' },
      { when: 'ptt4', head: 'Chapter Ten: Dreams', text: 'When the Tangent closes and the Primary goes on, the people who lived through it wake up. Most remember nothing. Some are left with the feeling of a dream they can\'t hold on to. A few remember everything, and are frightened by it for the rest of their lives.' },
    ],
  },
  poem: {
    name: 'Poetry Day',
    text: 'The poem he read out loud in English. Ms. Pomeroy asked who Frank was.',
    pages: [{ head: 'Poetry Day', text: 'A storm is coming, Frank says, a storm to swallow the children, and I will carry them out of the kingdom of pain. I will walk every child home to their door. I will send the monsters back below, back where nobody can see them. Nobody but me. Because I am Donnie Darko.' }],
  },
  lifeline: {
    name: 'Lifeline card',
    text: 'A CHARACTER DILEMMA card from Ms. Farmer\'s health class.',
    pages: [{ head: 'CHARACTER DILEMMA #7', text: 'Ling Ling finds a wallet full of money on the ground. She takes it to the address on the driver\'s license, but she keeps the money. Place an X on the Lifeline: FEAR <-----> LOVE.' }],
  },
  watership: {
    name: 'Watership Down',
    text: 'The paperback Ms. Pomeroy handed out when Graham Greene was banned. "Maybe you and Frank can read this one together."',
  },
  wallet: {
    name: "Jim Cunningham's wallet",
    text: 'Found on the sidewalk. The license reads JIM CUNNINGHAM, 42 POWDERHAM DRIVE, MIDDLESEX, VA.',
  },
  knife: {
    name: 'Butcher knife',
    text: 'From the kitchen drawer. He doesn\'t remember taking it.',
  },
  letter: {
    name: 'Letter to Ms. Sparrow',
    text: 'Addressed to MS. ROBERTA SPARROW, 22 OLD GUN ROAD.',
    pages: [{ head: 'Dear Ms. Sparrow,', text: 'I read your book. I think some of the things in it are happening to me. There is someone named Frank. I don\'t know who else to ask. Please write back, or let me come see you. - Donald Darko' }],
  },
  gascan: {
    name: 'Gas can',
    text: 'A red can, full, sloshing. Somebody left it by the garage.',
  },
  gun: {
    name: "Dad's pistol",
    text: 'From the box under the shoe rack in his father\'s closet. He doesn\'t know why he took it this time.',
  },
  earmuffs: {
    name: "Cherita's earmuffs",
    text: 'Pink. Still warm.',
  },
};

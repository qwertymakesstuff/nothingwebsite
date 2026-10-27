// Things Elias can carry. `relic` items can be equipped and raised; `doc` items can be read;
// `tape` items can be played on his Walkman.

export const ITEMS = {
  crucifix: {
    name: 'Seminary crucifix', icon: 'i_cross', relic: true,
    desc: 'Tin, worn smooth at the feet. They let you keep it when they asked you to leave.',
  },
  mara_tape: {
    name: "Mara's tape", icon: 'i_tape', tape: 'mara',
    desc: 'A C60 in a cracked case. No label. Your Walkman is in your coat.',
  },
  lighter: {
    name: 'Lighter', icon: 'i_lighter',
    desc: "Your father's. The hinge sticks. Enough fluid for now.",
  },
  notebook: {
    name: "Mara's notebook page", icon: 'i_page', doc: 'notebook',
    desc: 'Torn from a spiral notebook. Her handwriting, gone small the way it did when she was scared.',
  },
  hunter_note: {
    name: 'Folded note', icon: 'i_page', doc: 'hunter_note',
    desc: 'Pencil on the back of a feed receipt. Left in a deer stand.',
  },
  prayer_card: {
    name: 'Prayer card', icon: 'i_card', doc: 'prayer_card',
    desc: 'From the shrine bowl. Somebody kept correcting it.',
  },
  key_ring: {
    name: "Arne's key ring", icon: 'i_keys',
    desc: "Ruth's late husband's keys. One for the road gate, one for the lane up to St. Oran's.",
  },
  cemetery_key: {
    name: 'Cemetery key', icon: 'i_key',
    desc: 'Long, iron, warm from the stove it hung beside.',
  },
  vestry_key: {
    name: 'Vestry key', icon: 'i_key',
    desc: 'Small and green with age. It was in an urn on the Pike plot.',
  },
  page2: {
    name: 'Second notebook page', icon: 'i_page', doc: 'page2',
    desc: "Another page of Mara's. Damp. Found where nobody should have been able to leave it.",
  },
};

export const itemName = id => ITEMS[id]?.name || id;

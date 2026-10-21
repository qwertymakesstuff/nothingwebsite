// The two event decks. City Bulletins are public events that touch everyone;
// Business Opportunities happen to the player who drew them. Each card's apply()
// works only through the `ops` the engine hands it, so cards cannot bypass the rules.
import { ASSETS, DISTRICTS, CIRCUIT_BONUS } from './board.js';
import { ownedAssets, completedDistricts, totalLevels, alivePlayers, districtProps } from './rules.js';

const fx = (kind, extra) => ({ kind, ...extra });

export const CARDS = {
  // ---- City Bulletin ------------------------------------------------------------
  festival: {
    deck: 'bulletin', title: 'Waterfront Festival', requires: 'harbor',
    text: 'Lanterns line the docks. Old Harbor rents are +50% for 2 rounds.',
    apply: ({ ops }) => ops.addEffect(fx('districtRent', { district: 'harbor', mult: 1.5, rounds: 2, label: 'Waterfront Festival: Old Harbor rent +50%' })),
  },
  galleryNight: {
    deck: 'bulletin', title: 'Gallery Night', requires: 'arts',
    text: 'Crowds pour into the Arts District. Its rents are +50% for 2 rounds.',
    apply: ({ ops }) => ops.addEffect(fx('districtRent', { district: 'arts', mult: 1.5, rounds: 2, label: 'Gallery Night: Arts District rent +50%' })),
  },
  marketDay: {
    deck: 'bulletin', title: 'Grand Market Day', requires: 'market',
    text: 'Stalls spill into the streets. Market Quarter rents are +50% for 2 rounds.',
    apply: ({ ops }) => ops.addEffect(fx('districtRent', { district: 'market', mult: 1.5, rounds: 2, label: 'Grand Market Day: Market Quarter rent +50%' })),
  },
  tourism: {
    deck: 'bulletin', title: 'Tourism Surge', requires: 'skyline',
    text: 'Visitors book every view in town. Skyline Row rents are +25% for 3 rounds.',
    apply: ({ ops }) => ops.addEffect(fx('districtRent', { district: 'skyline', mult: 1.25, rounds: 3, label: 'Tourism Surge: Skyline Row rent +25%' })),
  },
  rentReview: {
    deck: 'bulletin', title: 'Midtown Rent Review', requires: 'midtown',
    text: 'The council caps office rents. Midtown rents are -25% for 2 rounds.',
    apply: ({ ops }) => ops.addEffect(fx('districtRent', { district: 'midtown', mult: 0.75, rounds: 2, label: 'Rent Review: Midtown rent -25%' })),
  },
  storm: {
    deck: 'bulletin', title: 'Storm Warning', requires: 'harbor',
    text: 'Shutters go up on the waterfront. Old Harbor rents are halved for 1 round.',
    apply: ({ ops }) => ops.addEffect(fx('districtRent', { district: 'harbor', mult: 0.5, rounds: 1, label: 'Storm Warning: Old Harbor rent halved' })),
  },
  transitExpansion: {
    deck: 'bulletin', title: 'Transit Expansion',
    text: 'New lines open. Stations and every property within 2 spaces of one charge +25% rent for 3 rounds.',
    apply: ({ ops }) => ops.addEffect(fx('nearTransit', { mult: 1.25, rounds: 3, label: 'Transit Expansion: +25% rent near stations' })),
  },
  taxHoliday: {
    deck: 'bulletin', title: 'Tax Holiday',
    text: 'The city waives the Harbor Levy and Luxury Assessment for 2 rounds.',
    apply: ({ ops }) => ops.addEffect(fx('taxHoliday', { rounds: 2, label: 'Tax Holiday: tax spaces are free' })),
  },
  inspection: {
    deck: 'bulletin', title: 'City Inspection',
    text: 'Building inspectors make their rounds. Every player pays $25 per development level they own.',
    apply: ({ st, ops }) => {
      for (const p of alivePlayers(st)) {
        const n = totalLevels(st, p.id);
        if (n) ops.charge(p.id, 'bank', 25 * n, `City Inspection (${n} level${n > 1 ? 's' : ''})`);
      }
    },
  },
  maintenance: {
    deck: 'bulletin', title: 'Maintenance Emergency',
    text: 'Old pipes burst under the big buildings. Pay $60 for each property you own at Apartments or Tower level.',
    apply: ({ st, ops }) => {
      for (const p of alivePlayers(st)) {
        const n = ownedAssets(st, p.id).filter(id => st.props[id].level >= 3).length;
        if (n) ops.charge(p.id, 'bank', 60 * n, `Maintenance Emergency (${n} building${n > 1 ? 's' : ''})`);
      }
    },
  },
  startupBoom: {
    deck: 'bulletin', title: 'Startup Boom', requires: 'innovation',
    text: 'Investors swarm Innovation Park. Owners collect $50 for each Innovation Park property they hold.',
    apply: ({ st, ops }) => {
      for (const p of alivePlayers(st)) {
        const n = districtProps(st, 'innovation').filter(id => st.props[id].owner === p.id).length;
        if (n) ops.credit(p.id, 50 * n, `Startup Boom (${n} propert${n > 1 ? 'ies' : 'y'})`);
      }
    },
  },
  grant: {
    deck: 'bulletin', title: 'Public Works Grant',
    text: 'The city rewards complete neighborhoods. Collect $150 for every district you own outright.',
    apply: ({ st, ops }) => {
      for (const p of alivePlayers(st)) {
        const n = completedDistricts(st, p.id).length;
        if (n) ops.credit(p.id, 150 * n, `Public Works Grant (${n} district${n > 1 ? 's' : ''})`);
      }
    },
  },
  bond: {
    deck: 'bulletin', title: 'Infrastructure Bond Matures',
    text: 'Every player collects $50.',
    apply: ({ st, ops }) => { for (const p of alivePlayers(st)) ops.credit(p.id, 50, 'Infrastructure Bond'); },
  },

  // ---- Business Opportunity -------------------------------------------------------
  consulting: {
    deck: 'opportunity', title: 'Consulting Contract',
    text: 'A harbor firm needs your advice. Collect $100.',
    apply: ({ pid, ops }) => ops.credit(pid, 100, 'Consulting Contract'),
  },
  angel: {
    deck: 'opportunity', title: 'Angel Investor',
    text: 'Someone believes in you. Collect $150.',
    apply: ({ pid, ops }) => ops.credit(pid, 150, 'Angel Investor'),
  },
  refund: {
    deck: 'opportunity', title: 'Permit Refund',
    text: 'The city overcharged you. Collect $50.',
    apply: ({ pid, ops }) => ops.credit(pid, 50, 'Permit Refund'),
  },
  launch: {
    deck: 'opportunity', title: 'Back to the Pier',
    text: `Advance to Launch Pier and collect $${CIRCUIT_BONUS}.`,
    apply: ({ ops, board }) => ops.advanceTo(board.indexOf.start),
  },
  express: {
    deck: 'opportunity', title: 'Catch the Express',
    text: 'Advance to the next transit station. If an opponent owns it, pay double rent; if nobody does, you may buy it.',
    apply: ({ st, pid, ops, board }) => {
      const pos = st.players.find(p => p.id === pid).position;
      const next = board.transitIndices.map(i => ({ i, d: (i - pos + board.size) % board.size || board.size }))
        .sort((a, b) => a.d - b.d)[0];
      ops.advanceTo(next.i, { rentMult: 2 });
    },
  },
  towerShowing: {
    deck: 'opportunity', title: 'Private Showing', requires: 'skyline',
    text: 'You are invited to view Meridian Tower. Advance there; collect the circuit bonus if you pass Launch Pier.',
    apply: ({ ops, board }) => ops.advanceTo(board.indexOf.meridian),
  },
  scout: {
    deck: 'opportunity', title: 'Location Scout',
    text: 'Advance to the next unowned property or station. If everything is owned, stay put.',
    apply: ({ st, pid, ops, board }) => {
      const pos = st.players.find(p => p.id === pid).position;
      for (let k = 1; k < board.size; k++) {
        const s = board.spaces[(pos + k) % board.size];
        if (ASSETS[s.id] && !st.props[s.id].owner) return ops.advanceTo((pos + k) % board.size);
      }
      ops.log('Every lot in the city is owned; you stay where you are.');
    },
  },
  backThree: {
    deck: 'opportunity', title: 'Wrong Turn',
    text: 'Go back 3 spaces.',
    apply: ({ ops }) => ops.moveBy(-3),
  },
  towed: {
    deck: 'opportunity', title: 'Parking Violation',
    text: 'Your car is towed. Go directly to the Impound Lot; do not collect the circuit bonus.',
    apply: ({ ops }) => ops.toImpound(),
  },
  waiver: {
    deck: 'opportunity', title: 'Tow Waiver',
    text: 'Keep this waiver. Use it to leave the Impound Lot for free, or trade it to another player.',
    apply: ({ ops }) => ops.giveWaiver(),
  },
  repairs: {
    deck: 'opportunity', title: 'Equipment Repairs',
    text: 'Pay $25 for each development level you own.',
    apply: ({ st, pid, ops }) => {
      const n = totalLevels(st, pid);
      if (n) ops.charge(pid, 'bank', 25 * n, `Equipment Repairs (${n} level${n > 1 ? 's' : ''})`);
      else ops.log('Nothing to repair.');
    },
  },
  ticket: {
    deck: 'opportunity', title: 'Delivery Fine',
    text: 'Your van blocked a loading zone. Pay $50.',
    apply: ({ pid, ops }) => ops.charge(pid, 'bank', 50, 'Delivery Fine'),
  },
  gala: {
    deck: 'opportunity', title: 'Networking Gala',
    text: 'You host the season\'s gala. Collect $20 from every other player.',
    apply: ({ st, pid, ops }) => {
      for (const p of alivePlayers(st)) if (p.id !== pid) ops.charge(p.id, pid, 20, 'Networking Gala');
    },
  },
  sponsorship: {
    deck: 'opportunity', title: 'Neighborhood Sponsorship',
    text: 'You sponsor the youth regatta. Pay every other player $25.',
    apply: ({ st, pid, ops }) => {
      for (const p of alivePlayers(st)) if (p.id !== pid) ops.charge(pid, p.id, 25, 'Neighborhood Sponsorship');
    },
  },
};
for (const [id, c] of Object.entries(CARDS)) c.id = id;

// card ids in a deck, leaving out cards about districts this board does not have
export function deckFor(deck, board) {
  return Object.values(CARDS)
    .filter(c => c.deck === deck && (!c.requires || board.districts[c.requires] || board.indexOf[c.requires] != null))
    .map(c => c.id);
}

export const DECK_NAMES = { bulletin: 'City Bulletin', opportunity: 'Business Opportunity' };
export const describeDistrict = d => DISTRICTS[d]?.name ?? d;

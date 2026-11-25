// Achievements. check(S) runs against the persistent save after every action; some are
// granted directly by the engine/encounters instead (check omitted). secret = hidden until earned.
import { NORMAL_FLOORS, ANOMALY_FLOORS, SECRET_FLOORS } from './floors.js';
import { LOST, EQUIPMENT } from './items.js';
import { CLUES } from './clues.js';
import { UPGRADES } from './upgrades.js';

const seen = (S, id) => (S.floorsSeen[id] || 0) > 0;
const count = o => Object.keys(o || {}).length;
const upMaxed = (S, kind) => UPGRADES.filter(u => u.kind === kind).every(u => (S.upgrades[u.id] || 0) >= u.max);

export const RARITY = {
  common: { label: 'Common', color: '#b8b2a6' },
  uncommon: { label: 'Uncommon', color: '#8fd18a' },
  rare: { label: 'Rare', color: '#6fb6ff' },
  epic: { label: 'Epic', color: '#c890ff' },
  legendary: { label: 'Legendary', color: '#ffc861' },
};

export const ACHIEVEMENTS = [
  // exploration
  { id: 'first_stop', name: 'First Stop', desc: 'Visit your first floor.', r: 'common', check: S => S.stats.floors >= 1 },
  { id: 'regular', name: 'Regular Customer', desc: 'Visit 25 floors.', r: 'common', check: S => S.stats.floors >= 25 },
  { id: 'frequent', name: 'Frequent Rider', desc: 'Visit 100 floors.', r: 'rare', check: S => S.stats.floors >= 100 },
  { id: 'resident', name: 'Permanent Resident', desc: 'Visit 250 floors.', r: 'epic', check: S => S.stats.floors >= 250 },
  { id: 'explorer', name: 'Room by Room', desc: 'Enter 100 rooms.', r: 'uncommon', check: S => S.stats.rooms >= 100 },
  { id: 'cartographer', name: 'Cartographer', desc: 'Discover 15 different floor types.', r: 'uncommon', check: S => count(S.floorsSeen) >= 15 },
  { id: 'directory', name: 'The Full Directory', desc: 'Discover every ordinary floor type.', r: 'epic', check: S => NORMAL_FLOORS.every(f => seen(S, f.id)) },
  { id: 'night_owl', name: 'Night Owl', desc: 'Make it through your first night.', r: 'common', check: S => S.stats.nightsDone >= 1 },
  { id: 'graveyard', name: 'Graveyard Shift', desc: 'Make it through 10 nights.', r: 'uncommon', check: S => S.stats.nightsDone >= 10 },
  { id: 'lifer', name: 'Lifer', desc: 'Make it through 40 nights.', r: 'epic', check: S => S.stats.nightsDone >= 40 },
  { id: 'marathon', name: 'Marathon', desc: 'Visit 15 floors in a single night.', r: 'rare', check: S => S.stats.bestFloorsNight >= 15 },
  // collecting
  { id: 'lost_property', name: 'Lost Property', desc: 'Find 10 hidden objects.', r: 'uncommon', check: S => count(S.lost) >= 10 },
  { id: 'hoarder', name: 'Magpie', desc: 'Find 25 hidden objects.', r: 'rare', check: S => count(S.lost) >= 25 },
  { id: 'lost_and_found', name: 'Lost and Found', desc: 'Find every piece of lost property.', r: 'legendary', check: S => LOST.every(l => S.lost[l.id]) },
  { id: 'first_clue', name: 'Something to Go On', desc: 'Find your first clue.', r: 'common', check: S => count(S.clues) >= 1 },
  { id: 'detective', name: 'Night Detective', desc: 'Find 18 clues.', r: 'rare', check: S => count(S.clues) >= 18 },
  { id: 'whole_story', name: 'The Whole Story', desc: 'Find every clue.', r: 'epic', check: S => CLUES.every(c => S.clues[c.id]) },
  { id: 'blueprint', name: 'Draughtsman', desc: 'Find a blueprint fragment.', r: 'uncommon', check: S => count(S.blueprints) >= 1 },
  { id: 'architect', name: 'The Architect\'s Wish', desc: 'Recover all five blueprint fragments.', r: 'epic', check: S => count(S.blueprints) >= 5 },
  { id: 'equipped', name: 'Fully Equipped', desc: 'Own every piece of equipment.', r: 'rare', check: S => EQUIPMENT.every(e => S.items[e]) },
  { id: 'piggy', name: 'Piggy Bank', desc: 'Bank $1,000 over all your nights.', r: 'uncommon', check: S => S.stats.banked >= 1000 },
  { id: 'tycoon', name: 'Building Tycoon', desc: 'Bank $10,000 over all your nights.', r: 'epic', check: S => S.stats.banked >= 10000 },
  { id: 'big_night', name: 'Big Night', desc: 'Bank $400 from a single night.', r: 'rare', check: S => S.stats.bestBank >= 400 },
  { id: 'token_jar', name: 'Token Jar', desc: 'Hold 10 brass tokens at once.', r: 'uncommon', check: S => S.tokens >= 10 },
  // rare encounters & anomalies
  { id: 'somethings_wrong', name: 'Something\'s Wrong', desc: 'Encounter your first anomaly.', r: 'uncommon', check: S => S.stats.anomalies >= 1 },
  { id: 'anomaly_hunter', name: 'Anomaly Hunter', desc: 'Discover 5 different anomaly floors.', r: 'rare', check: S => ANOMALY_FLOORS.filter(f => seen(S, f.id)).length >= 5 },
  { id: 'all_anomalies', name: 'Collector of the Uncanny', desc: 'Discover every anomaly floor.', r: 'legendary', secret: true, check: S => ANOMALY_FLOORS.every(f => seen(S, f.id)) },
  { id: 'not_supposed', name: 'Not Supposed to Be Here', desc: 'Discover an extremely rare floor.', r: 'legendary', secret: true, check: S => seen(S, 'home') || seen(S, 'blueprint') },
  { id: 'deja_vu', name: 'Déjà Vu', desc: 'Return to a floor that has changed since you left.', r: 'rare', check: S => S.stats.changed >= 1 },
  { id: 'familiar_face', name: 'Familiar Face', desc: 'Meet the Attendant.', r: 'uncommon', check: S => (S.people.attendant || 0) >= 1 },
  { id: 'old_friends', name: 'Old Friends', desc: 'Talk with the Attendant 6 times.', r: 'rare', check: S => (S.people.attendant || 0) >= 6 },
  { id: 'cat_person', name: 'Cat Person', desc: 'Pet the grey cat 5 times.', r: 'uncommon', check: S => (S.stats.catPets || 0) >= 5 },
  { id: 'adopted', name: 'Chosen', desc: 'Be adopted by the grey cat.', r: 'rare', secret: true },
  { id: 'wrong_number', name: 'Wrong Number', desc: 'Answer 10 telephone calls.', r: 'uncommon', check: S => (S.stats.phoneCalls || 0) >= 10 },
  { id: 'other_you', name: 'The Other You', desc: 'Meet your double.', r: 'epic', secret: true },
  { id: 'deed_holder', name: 'Deed Holder', desc: 'Buy a floor from the man who sells them.', r: 'rare', secret: true },
  { id: 'wishing_well', name: 'Wishful Thinking', desc: 'Throw $100 into wishing fountains.', r: 'rare', secret: true },
  { id: 'lights_out', name: 'Lights Out', desc: 'Find something on a dark floor without any light.', r: 'uncommon' },
  { id: 'social', name: 'Friend of the Building', desc: 'Meet 12 different people.', r: 'rare', check: S => count(S.people) >= 12 },
  { id: 'high_score', name: 'High Score', desc: 'Get a perfect game on "GOING UP!".', r: 'rare', secret: true },
  // puzzles
  { id: 'first_puzzle', name: 'Click', desc: 'Solve your first puzzle.', r: 'common', check: S => S.stats.puzzles >= 1 },
  { id: 'puzzler', name: 'Puzzler', desc: 'Solve 15 puzzles.', r: 'uncommon', check: S => S.stats.puzzles >= 15 },
  { id: 'mastermind', name: 'Master of Locks', desc: 'Solve 40 puzzles.', r: 'rare', check: S => S.stats.puzzles >= 40 },
  { id: 'all_types', name: 'Jack of All Locks', desc: 'Solve every kind of puzzle (keypad, fuses, chime, valves, cipher).', r: 'uncommon', check: S => ['keypad', 'fuses', 'chime', 'valves', 'cipher'].every(t => (S.stats.puzzleTypes || {})[t]) },
  { id: 'efficient', name: 'Efficient', desc: 'Solve a fuse box in the fewest possible moves.', r: 'rare' },
  { id: 'first_try', name: 'First Try', desc: 'Open 10 keypads without a single wrong code.', r: 'rare', check: S => (S.stats.keypadClean || 0) >= 10 },
  // progression
  { id: 'first_upgrade', name: 'Improvements', desc: 'Buy your first upgrade.', r: 'common', check: S => count(S.upgrades) >= 1 },
  { id: 'all_access', name: 'All Access', desc: 'Wire up all twelve floor buttons.', r: 'uncommon', check: S => (S.upgrades.buttons || 0) >= 2 },
  { id: 'enthusiast', name: 'Elevator Enthusiast', desc: 'Unlock every elevator upgrade.', r: 'epic', check: S => upMaxed(S, 'elevator') },
  { id: 'self_made', name: 'Self-Improvement', desc: 'Buy every personal upgrade.', r: 'epic', check: S => upMaxed(S, 'personal') },
  { id: 'secret_floor', name: 'Staff Only', desc: 'Visit a secret floor.', r: 'rare', check: S => SECRET_FLOORS.some(f => seen(S, f.id)) },
  { id: 'all_secrets', name: 'Behind the Walls', desc: 'Visit all four secret floors.', r: 'epic', check: S => SECRET_FLOORS.every(f => seen(S, f.id)) },
  { id: 'thirteenth', name: 'The Thirteenth Floor', desc: 'Discover Floor 13.', r: 'epic', check: S => seen(S, 'thirteen') },
  // endings
  { id: 'end_ground', name: 'Ground Floor', desc: 'Take the stairs home.', r: 'epic', secret: true, check: S => !!S.endings.ground },
  { id: 'end_cap', name: 'Going Up?', desc: 'Take the cap.', r: 'epic', secret: true, check: S => !!S.endings.cap },
  { id: 'end_roof', name: 'Floor Fourteen', desc: 'Give the building its roof.', r: 'legendary', secret: true, check: S => !!S.endings.roof },
  { id: 'end_hour', name: 'The Thirteenth Hour', desc: 'Meet the architect.', r: 'legendary', secret: true, check: S => !!S.endings.hour },
  { id: 'all_endings', name: 'Every Way Out', desc: 'See all four endings.', r: 'legendary', secret: true, check: S => count(S.endings) >= 4 },
  // difficult / misc
  { id: 'need_sit', name: 'Need a Sit Down', desc: 'Black out for the first time.', r: 'common', check: S => S.stats.blackouts >= 1 },
  { id: 'unflappable', name: 'Unflappable', desc: 'Finish a night having visited 12+ floors without composure ever dropping below half.', r: 'rare' },
  { id: 'witching', name: 'Witching Hour', desc: 'Step out of the lift at exactly 3:13 AM.', r: 'rare', secret: true },
  { id: 'speedrun', name: 'Express Service', desc: 'Reach Floor 13 within your first 12 nights.', r: 'legendary', check: S => seen(S, 'thirteen') && S.stats.first13Night > 0 && S.stats.first13Night <= 12 },
  { id: 'rare_variant', name: 'Limited Edition', desc: 'Find a gilded variant of a floor.', r: 'rare', check: S => (S.stats.gilded || 0) >= 1 },
];
export const ACH_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

// The campaign: twelve rent deadlines, each with a target and a number of spins, plus the
// landlord's notices that bend the rules for one deadline. Paying the twelfth (the Final Notice)
// wins the run.

import { RELIC_BY_ID } from './relics.js';

export const DEADLINES = [
  { rent: 20, spins: 4, title: 'Move-in Week' },
  { rent: 45, spins: 5, title: 'First of the Month' },
  { rent: 85, spins: 5, title: 'Leaky Faucet' },
  { rent: 140, spins: 6, title: 'Rate Review', notice: 'garage_sale' },
  { rent: 220, spins: 6, title: 'Summer Lease', notice: 'heatwave' },
  { rent: 330, spins: 7, title: 'Paper Thin Walls' },
  { rent: 480, spins: 7, title: 'Market Week', notice: 'market_day' },
  { rent: 680, spins: 8, title: 'Storm Season', notice: 'brownout' },
  { rent: 950, spins: 8, title: 'New Management' },
  { rent: 1300, spins: 9, title: 'Thin Ice', notice: 'noise' },
  { rent: 1750, spins: 9, title: 'Eviction Watch' },
  { rent: 2400, spins: 10, title: 'Final Notice', notice: 'final_notice', final: true },
];

const is = (ctx, c, tag) => ctx.is(c, tag);

// Notices: shown on the ledger before the deadline starts so the player can prepare.
export const NOTICES = {
  garage_sale: { name: 'Garage Sale', desc: 'The shop after this rent has everything 20% off.', shopDiscount: 0.2, good: true },
  heatwave: {
    name: 'Heat Wave', desc: 'Food spoils: food earns −1. Plants love it: plants earn +1.',
    earn(ctx, c) { if (is(ctx, c, 'food')) ctx.bonus(c, -1, null, 'Heat Wave'); if (is(ctx, c, 'plant')) ctx.bonus(c, 1, null, 'Heat Wave'); },
  },
  market_day: { name: 'Market Day', desc: 'Deliveries offer one extra choice this deadline.', deliveryChoices: 1, good: true },
  brownout: {
    name: 'Brown-out', desc: 'The power keeps dipping: appliances and lights earn −2.',
    earn(ctx, c) { if (is(ctx, c, 'appliance') || is(ctx, c, 'light')) ctx.bonus(c, -2, null, 'Brown-out'); },
  },
  noise: {
    name: 'Noise Complaint', desc: 'The neighbours complained: animals earn −1.',
    earn(ctx, c) { if (is(ctx, c, 'animal')) ctx.bonus(c, -1, null, 'Noise Complaint'); },
  },
  final_notice: { name: 'Final Notice', desc: 'The Landlord moves in: every spin he takes one random slot and earns −5.', landlord: true },
};

export const FINAL_DEADLINE = DEADLINES.length - 1;
export const noticeFor = d => NOTICES[DEADLINES[d]?.notice] || null;

export function rentMultiplier(relics = []) {
  return relics.reduce((m, id) => m * (RELIC_BY_ID[id]?.rentMult ?? 1), 1);
}

// The rent due for the run's current deadline, with relics, bribes and Loan Shark interest.
export function rentDue(run) {
  const d = DEADLINES[run.deadline];
  if (!d) return 0;
  const base = Math.round(d.rent * rentMultiplier(run.relics) * (1 - (run.rentDiscount || 0)));
  return Math.max(1, base) + Math.max(0, run.rentExtra || 0);
}

export function spinsFor(deadline) { return DEADLINES[deadline]?.spins ?? 0; }

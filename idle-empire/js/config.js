// Economy configuration: the tuning knobs in one place, so balancing never means
// editing the rules in economy.js. Building-specific numbers live in buildings.js.
export const ECONOMY = {
  clickBase: 1,           // crowns per click before any bonuses
  defaultGrowth: 1.15,    // price multiplier per copy owned, for buildings that don't set their own
  buyModes: [1, 10, 100, 'max'],
  defaultBuyMode: 1,
  maxPurchase: 1e6,       // most copies one Buy Max may buy at once
};

export const LOOP = {
  logicIntervalMs: 100,   // how often production is credited
  shopIntervalMs: 100,    // how often the shop re-renders
  titleIntervalMs: 1000,
  maxTickSeconds: 120,    // longest stretch credited in one tick (proper offline earnings come later)
};

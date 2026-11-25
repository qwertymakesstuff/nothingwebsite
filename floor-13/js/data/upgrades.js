// Upgrades bought from the elevator's service panel between nights with banked cash
// (and sometimes brass tokens). kind: 'elevator' or 'personal'.

export const UPGRADES = [
  // elevator
  { id: 'buttons', kind: 'elevator', name: 'Floor Buttons', max: 2, cost: [150, 450], tokens: [0, 1], desc: ['Wires up buttons 5–8.', 'Wires up buttons 9–12.'] },
  { id: 'directory', kind: 'elevator', name: 'Floor Directory', max: 1, cost: [200], desc: ['A brass directory plate shows what is on each floor tonight before you ride.'] },
  { id: 'express', kind: 'elevator', name: 'Express Motor', max: 2, cost: [180, 520], desc: ['Rides take 10 minutes instead of 15.', 'Rides take 6 minutes.'] },
  { id: 'night', kind: 'elevator', name: 'Longer Nights', max: 2, cost: [250, 700], tokens: [0, 2], desc: ['The building lets you stay until 6:45 AM.', 'Until 7:30 AM.'] },
  { id: 'lantern', kind: 'elevator', name: 'Cabin Lantern', max: 1, cost: [160], desc: ['A warm lamp in the car. Restore 6 composure every ride.'] },
  { id: 'speaker', kind: 'elevator', name: 'Cabin Speaker', max: 1, cost: [220], desc: ['The elevator hums a hint: buttons with a rare encounter waiting glow faintly.'] },
  { id: 'mirror', kind: 'elevator', name: 'Brass Mirror', max: 1, cost: [300], tokens: [2], desc: ['Strange floors are drawn to the mirror. Anomalies are twice as likely on RANDOM.'] },
  { id: 'bell', kind: 'elevator', name: 'Call Bell', max: 1, cost: [350], tokens: [1], desc: ['Ring it once a night to summon the Attendant into the car.'] },
  { id: 'hatch', kind: 'elevator', name: 'Service Hatch', max: 1, cost: [800], tokens: [3], desc: ['Opens the service keyhole. With the Override Key, the car can stop between floors.'] },
  // personal
  { id: 'shoes', kind: 'personal', name: 'Comfortable Shoes', max: 2, cost: [120, 380], desc: ['Moving between rooms takes 4 minutes instead of 5.', '3 minutes.'] },
  { id: 'nerves', kind: 'personal', name: 'Steady Nerves', max: 3, cost: [150, 400, 900], desc: ['+20 maximum composure.', '+40 maximum composure.', '+60 maximum composure.'] },
  { id: 'eye', kind: 'personal', name: 'Keen Eye', max: 2, cost: [200, 600], desc: ['Searches turn up more cash, and lost property shows up more often.', 'Even more.'] },
  { id: 'pockets', kind: 'personal', name: 'Deep Pockets', max: 1, cost: [260], desc: ['If you black out, you keep 75% of your pocket cash instead of 50%.'] },
  { id: 'haggle', kind: 'personal', name: 'Haggler', max: 1, cost: [300], desc: ['Shops, vending machines and the Salesman charge 20% less.'] },
  { id: 'thermos', kind: 'personal', name: 'Thermos of Tea', max: 1, cost: [140], desc: ['Start every night with a Chamomile Tea.'] },
  { id: 'notebook', kind: 'personal', name: 'Night Notebook', max: 1, cost: [180], desc: ['The floor map marks rooms that still have unsearched objects, and which rooms hide something worth finding.'] },
];
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

// Mission definitions as data. Places are references ('poi:<id>', 'cat:<category>', 'district:<name>', 'node:a,b', 'deck:a'),
// never coordinates, so moving a building never breaks a mission. givers: POI ids that offer it (empty = any giver).
export const DEFS = [
  { id: 'package_run',   type: 'delivery', title: 'PACKAGE RUN',  text: 'collect the package', from: 'district:industrial', to: 'cat:store',      need: false, givers: ['job_3', 'job_7'] },
  { id: 'dock_delivery', type: 'delivery', title: 'DOCK DELIVERY', text: 'pick up the crate',  from: 'cat:docks',           to: 'cat:supermarket', need: false, givers: ['job_2'] },
  { id: 'taxi_downtown', type: 'taxi',     title: 'TAXI FARE',    text: 'pick up the fare',    from: 'district:downtown',   to: 'cat:docks',       need: true,  givers: ['job_1', 'job_8'] },
  { id: 'taxi_suburb',   type: 'taxi',     title: 'TAXI FARE',    text: 'pick up the fare',    from: 'district:residential', to: 'cat:hospital',   need: true,  givers: ['job_5', 'job_6'] },
  { id: 'clothes_run',   type: 'delivery', title: 'STYLE RUN',    text: 'collect the order',   from: 'cat:clothing',        to: 'cat:safehouse',   need: false, givers: ['job_4'] },
  { id: 'downtown_race', type: 'race',     title: 'STREET RACE',  route: ['node:3,3', 'node:7,3', 'node:7,6', 'node:3,6', 'node:3,3'], limit: 70, reward: 600, need: true, givers: ['job_1', 'job_4', 'job_8'] },
  { id: 'highway_run',   type: 'race',     title: 'HIGHWAY RUN',  route: ['node:0,7', 'deck:3', 'deck:7', 'node:11,7'],                   limit: 60, reward: 800, need: true, givers: ['job_2', 'job_3', 'job_7'] }
];
export const defsFor = giverId => { const l = DEFS.filter(d => d.givers.includes(giverId)); return l.length ? l : DEFS; };

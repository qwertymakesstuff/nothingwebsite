// LAST EXIT: mission definitions (data). Dialogue lives in lines/*.js and is referenced by scene id; places are 'place:<name>' (places.js).
// Step types (see engine.js): scene, call, goto, drive, pickup, getcar, heat, ambush, protect, chase, wait, pay.
//   at: place ref   text: objective line   scene / radio: dialogue scene id (or a list)   car: tag of a mission vehicle
//   npcs: [{ id, at }] people to put in the world for this step    if: story condition (the step is skipped when false)
import './lines/index.js';

const M = (o) => o;
export const MISSION_LIST = [
  M({ id: 'M00', code: 'M00_ARRIVAL', title: 'ARRIVAL', desc: 'Port Alder at dusk. Almost no money, a car that shudders, and a garage on Third.', main: true, req: '', reward: 0,
    steps: [
      { t: 'call', scene: 'M00_VOICEMAIL', text: '', cp: false },
      { t: 'scene', scene: 'M00_REACT', cp: false },
      { t: 'goto', at: 'place:garage', text: 'Drive to Vale Auto on Third', radio: 'M00_RADIO', scene: ['M00_EDDIE'], npcs: [{ id: 'EDDIE', at: 'place:garage' }], radius: 11 }
    ], onDone: { set: { prologue_done: true }, next: 'M01' } }),

  M({ id: 'M01', code: 'M01_A_NEW_START', title: 'A NEW START', desc: 'Eddie needs a pickup delivered to the docks. Ordinary work, probably.', main: true, req: 'done:M00', reward: 200,
    start: { at: 'place:garage', label: 'Talk to Eddie' },
    steps: [
      { t: 'scene', scene: 'M01_GARAGE', npcs: [{ id: 'EDDIE', at: 'place:garage' }] },
      { t: 'scene', scene: 'M01_TRUCK' },
      { t: 'getcar', car: 'truck', carName: 'blue pickup', type: 'pickup', color: 0x2f5fb8, at: 'place:garage', text: 'Get into the blue pickup' },
      { t: 'drive', car: 'truck', carName: 'blue pickup', at: 'place:docks', text: 'Deliver the pickup to Walt Pruitt at the docks', radio: 'M01_CALL', scene: 'M01_DOCKS', npcs: [{ id: 'WALT', at: 'place:docks' }], radius: 12 },
      { t: 'goto', at: 'place:garage', text: 'Go back to Eddie', scene: 'M01_RETURN', radius: 11 }
    ],
    fail: [{ t: 'wrecked', car: 'truck', text: 'Eddie\'s pickup was destroyed' }, { t: 'abandon', car: 'truck', dist: 220, text: 'You left the pickup behind' }],
    onDone: { call: 'M01_TEXT', set: { has_room: true }, rel: { EDDIE: 1 } } }),

  M({ id: 'M02', code: 'M02_EASY_MONEY', title: 'EASY MONEY', desc: 'A car moved for Darius King\'s people. Mara shows the ropes.', main: true, req: 'done:M01', reward: 800,
    start: { at: 'place:garage', label: 'Eddie has someone to introduce' },
    steps: [
      { t: 'scene', scene: 'M02_MEET', npcs: [{ id: 'EDDIE', at: 'place:garage' }, { id: 'MARA', at: 'place:garage' }] },
      { t: 'goto', at: 'place:carpark', text: 'Follow Mara to the public car park', radio: 'M02_DRIVE', scene: 'M02_CARPARK', npcs: [{ id: 'MARA', at: 'place:carpark' }], radius: 14 },
      { t: 'getcar', car: 'sedan', carName: 'grey sedan', type: 'sedan', color: 0x8a9096, at: 'place:carpark', text: 'Take the grey sedan, plate ending 4471', radio: 'M02_FIND' },
      { t: 'drive', car: 'sedan', carName: 'grey sedan', at: 'place:depot', text: 'Deliver the sedan to the King Haulage depot', radio: 'M02_ROAD', scene: 'M02_DEPOT', npcs: [{ id: 'GUARD', at: 'place:depot' }, { id: 'JOJO', at: 'place:depot' }, { id: 'MARA', at: 'place:depot' }, { id: 'DARIUS', at: 'place:depot' }], radius: 12 },
      { t: 'goto', at: 'place:room', text: 'Head back to Eddie\'s back room', scene: 'M02_POST', radius: 9 }
    ],
    fail: [{ t: 'wrecked', car: 'sedan', text: 'The sedan was destroyed' }],
    onDone: { rel: { DARIUS: 1, MARA: 1 }, set: { met_darius: true } } }),

  M({ id: 'M03', code: 'M03_THE_WRONG_PACKAGE', title: 'THE WRONG PACKAGE', desc: 'Darius wants a case from a port warehouse. It was never meant to be there.', main: true, req: 'done:M02', reward: 600,
    start: { at: 'place:depot', label: 'Darius has a job' },
    steps: [
      { t: 'call', scene: 'M03_CALL', cp: false },
      { t: 'goto', at: 'place:warehouse', text: 'Go to Warehouse 14 at the port and find Walt', scene: 'M03_ARRIVE', npcs: [{ id: 'WALT', at: 'place:warehouse' }], radius: 12 },
      { t: 'pickup', at: 'place:yard', item: 'manifest', text: 'Find the sealed case behind the containers (rack nine)', scene: ['M03_MARKS', 'M03_FOUND'], radius: 14 },
      { t: 'heat', stars: 2, text: 'Lose the police', radio: 'M03_POLICE', hold: 4 },
      { t: 'goto', at: 'place:room', text: 'Get to Eddie\'s back room', scene: 'M03_SAFE', npcs: [{ id: 'MARA', at: 'place:room' }], radius: 9 },
      { t: 'call', scene: 'M03_AFTER', cp: false }
    ],
    onDone: { set: { has_manifest: true } } }),

  M({ id: 'M04', code: 'M04_NO_LOOSE_ENDS', title: 'NO LOOSE ENDS', desc: 'Someone has been following Mara. She has hidden a second piece of evidence at the cove.', main: true, req: 'done:M03', reward: 700,
    announce: 'M04_CALL', start: { at: 'place:westbeach', label: 'Meet Mara' },
    steps: [
      { t: 'scene', scene: 'M04_MEET', npcs: [{ id: 'MARA', at: 'place:westbeach' }] },
      { t: 'goto', at: 'place:cove', text: 'Drive to the cove', radio: 'M04_DRIVE', radius: 16 },
      { t: 'pickup', at: 'place:cove', item: 'bag', text: 'Search the lifeguard hut for Mara\'s bag', scene: 'M04_SEARCH', radius: 10 },
      { t: 'ambush', cars: 2, from: 'behind', stars: 0, text: 'Escape the ambush', radio: 'M04_ESCAPE', min: 14 },
      { t: 'goto', at: 'place:room', text: 'Reach Eddie\'s back room', scene: 'M04_SAFE', npcs: [{ id: 'MARA', at: 'place:room' }], radius: 9 }
    ],
    fail: [], onDone: {} }),

  M({ id: 'M05', code: 'M05_DIRTY_BADGE', title: 'DIRTY BADGE', desc: 'Detective Rowan offers a trade. Some of what he knows should not be known.', main: true, req: 'done:M04', reward: 500,
    announce: 'M05_CALL', start: { at: 'place:plaza', label: 'Meet Detective Rowan' },
    steps: [
      { t: 'scene', scene: 'M05_MEET', npcs: [{ id: 'ROWAN', at: 'place:plaza' }] },
      { t: 'goto', at: 'place:holding', text: 'Drive to the police holding yard', radio: 'M05_DRIVE', scene: ['M05_YARD', 'M05_TAPE', 'M05_DECIDE'], npcs: [{ id: 'ROWAN', at: 'place:holding' }], radius: 12 },
      { t: 'goto', at: 'place:garage', text: 'Show Eddie the photograph', scene: 'M05_EDDIE', npcs: [{ id: 'EDDIE', at: 'place:garage' }], radius: 11 },
      { t: 'goto', at: 'place:room', text: 'Talk it over with Mara', scene: 'M05_MARA', npcs: [{ id: 'MARA', at: 'place:room' }], radius: 9 }
    ],
    onDone: { rel: { EDDIE: -1 } } }),

  M({ id: 'M06', code: 'M06_THE_PEOPLE_WHO_PAY', title: 'THE PEOPLE WHO PAY', desc: 'Wharf Street, Alder Point, and a man who never raises his voice.', main: true, req: 'done:M05', reward: 1000,
    announce: 'M06_CALL', start: { at: 'place:mart', label: 'Meet Mara on Wharf Street' },
    steps: [
      { t: 'goto', at: 'place:mart', text: 'Meet Mara at Ng\'s Corner Mart', scene: 'M06_MART', npcs: [{ id: 'LUCILLE', at: 'place:mart' }, { id: 'MARA', at: 'place:mart' }], radius: 10 },
      { t: 'pickup', at: 'place:site', item: 'records', text: 'Find the property records at the Alder Point site', scene: 'M06_SITE', radius: 14 },
      { t: 'ambush', cars: 2, from: 'behind', stars: 0, text: 'Get away from the site', radio: 'M06_ALARM', min: 10 },
      { t: 'goto', at: 'place:tower', text: 'Attend the reception at Harbor Tower', scene: 'M06_EVENT', npcs: [{ id: 'SLOANE', at: 'place:tower' }, { id: 'MARA', at: 'place:tower' }], radius: 12 },
      { t: 'call', scene: 'M06_AFTER', cp: false },
      { t: 'goto', at: 'place:diner', text: 'Decide who gets the Alder Point files', scene: 'M06_CONTACT', radius: 12 },
      { t: 'scene', scene: 'M06_PRIYA', if: 'flag:priya_has_files', npcs: [{ id: 'PRIYA', at: 'place:diner' }] }
    ],
    onDone: {} }),

  M({ id: 'M07', code: 'M07_BURN_NOTICE', title: 'BURN NOTICE', desc: 'Darius has found out. The meeting is a trap.', main: true, req: 'done:M06', reward: 300,
    announce: 'M07_CALL', start: { at: 'place:carpark', label: 'Meet Darius\'s representative' },
    steps: [
      { t: 'goto', at: 'place:carpark', text: 'Meet Jojo at the public car park', scene: 'M07_REP', npcs: [{ id: 'JOJO', at: 'place:carpark' }], radius: 14 },
      { t: 'ambush', cars: 3, from: 'behind', stars: 2, text: 'Escape the trap', radio: ['M07_TRAP', 'M07_ESCAPE'], min: 14, if: '!flag:jojo_trusts' },
      { t: 'ambush', cars: 2, from: 'behind', stars: 2, text: 'Escape the trap', radio: ['M07_TRAP', 'M07_ESCAPE'], min: 12, if: 'flag:jojo_trusts' },
      { t: 'heat', stars: 0, hold: 3, text: 'Lose the police' },
      { t: 'call', scene: 'M07_CALLBACK', cp: false },
      { t: 'goto', at: 'place:room', text: 'Reach Eddie\'s back room', scene: ['M07_EDDIE', 'M07_MARA'], npcs: [{ id: 'EDDIE', at: 'place:room' }, { id: 'MARA', at: 'place:room' }], radius: 9 },
      { t: 'scene', scene: 'M07_DECIDE' }
    ],
    onDone: { set: { darius_hostile: true } } }),

  M({ id: 'M08', code: 'M08_THE_LAST_WITNESS', title: 'THE LAST WITNESS', desc: 'Walt kept a copy of the gate log. Darius will find him if you don\'t.', main: true, req: 'done:M07', reward: 1200,
    announce: 'M08_CALL', start: { at: 'place:lighthouse', label: 'Find Walt' },
    steps: [
      { t: 'goto', at: 'place:lighthouse', text: 'Find Walt at North Point Lighthouse', scene: 'M08_WALT', npcs: [{ id: 'WALT', at: 'place:lighthouse' }], radius: 14 },
      { t: 'protect', npc: 'WALT', npcFlag: 'walt_alive', cars: 3, at: 'place:lighthouse', text: 'Protect Walt', radio: 'M08_SIEGE', min: 10, npcHp: 100 },
      { t: 'scene', scene: 'M08_LIVES', if: 'flag:walt_alive' },
      { t: 'scene', scene: 'M08_DEAD', if: '!flag:walt_alive' },
      { t: 'scene', scene: 'M08_DECIDE', npcs: [{ id: 'MARA', at: 'place:lighthouse' }] },
      { t: 'heat', stars: 2, text: 'Lose the pursuit', radio: 'M08_RUN', hold: 3 }
    ],
    onDone: { set: { final_act: true } } }),

  M({ id: 'M09', code: 'M09_PORT_ALDER_BURNING', title: 'PORT ALDER BURNING', desc: 'The docks, the container, the people who made Port Alder what it is.', main: true, req: 'done:M08', reward: 0,
    announce: null, start: { at: 'place:garage', label: 'The last night' },
    steps: [
      { t: 'scene', scene: 'M09_ALLIES', npcs: [{ id: 'EDDIE', at: 'place:garage' }, { id: 'MARA', at: 'place:garage' }] },
      { t: 'goto', at: 'place:yard', text: 'Drive to the container yard', radio: 'M09_DRIVE', radius: 16 },
      { t: 'pickup', at: 'place:yard', item: 'cabinet', text: 'Find container PAC-4471 and take the records', scene: 'M09_YARD', radius: 12 },
      { t: 'ambush', cars: 2, from: 'behind', stars: 3, text: 'Fight your way out of the port', radio: ['M09_ALARM', 'M09_HOLD'], min: 14, if: 'rel:MARA>=TRUSTED' },                          // Mara trusts you: she keeps one car busy on the radio
      { t: 'ambush', cars: 4, from: 'behind', stars: 3, text: 'Fight your way out of the port', radio: ['M09_ALARM', 'M09_HOLD'], min: 18, if: 'rel:MARA<=DISTRUSTED' },                        // she does not: the crew has more cars
      { t: 'ambush', cars: 3, from: 'behind', stars: 3, text: 'Fight your way out of the port', radio: ['M09_ALARM', 'M09_HOLD'], min: 16, if: '!rel:MARA>=TRUSTED && !rel:MARA<=DISTRUSTED' },
      { t: 'goto', at: 'place:berth4', text: 'Confront Darius at Berth Four', scene: 'M09_DARIUS', npcs: [{ id: 'DARIUS', at: 'place:berth4' }, { id: 'JOJO', at: 'place:berth4', if: 'flag:jojo_trusts' }], radius: 14 },
      { t: 'chase', car: 'dcar', type: 'sports', color: 0x7a1f1f, at: 'place:berth4', text: 'Stop Darius before he escapes', radio: 'M09_FLEE' },
      { t: 'scene', scene: 'M09_DFATE', npcAtCar: { DARIUS: 'dcar' } },
      { t: 'scene', scene: 'M09_ROWAN', npcs: [{ id: 'ROWAN', at: 'player' }] },
      { t: 'goto', at: 'place:tower', text: 'Go to Harbor Tower: Sloane is waiting', scene: 'M09_SLOANE', npcs: [{ id: 'SLOANE', at: 'place:tower' }, { id: 'MARA', at: 'place:tower' }], radius: 12 },
      { t: 'call', scene: 'M09_EPI_A1', if: 'end:A', cp: false },
      { t: 'goto', at: 'place:garage', text: 'Go to the garage', scene: 'M09_EPI_A2', if: 'end:A', npcs: [{ id: 'EDDIE', at: 'place:garage' }], radius: 11 },
      { t: 'goto', at: 'place:pier', text: 'Meet Mara at the end of Harbor Pier', scene: 'M09_EPI_A3', if: 'end:A', npcs: [{ id: 'MARA', at: 'place:pier' }], radius: 12 },
      { t: 'call', scene: 'M09_EPI_B1', if: 'end:B', cp: false },
      { t: 'goto', at: 'place:garage', text: 'Go to the garage', scene: 'M09_EPI_B2', if: 'end:B', npcs: [{ id: 'EDDIE', at: 'place:garage' }], radius: 11 },
      { t: 'goto', at: 'place:tower', text: 'Go up to your new place', scene: 'M09_EPI_B3', if: 'end:B', radius: 12 },
      { t: 'call', scene: 'M09_EPI_C1', if: 'end:C', cp: false, world: 'burn' },
      { t: 'goto', at: 'place:garage', text: 'Go to the garage', scene: 'M09_EPI_C2', if: 'end:C', npcs: [{ id: 'EDDIE', at: 'place:garage' }], radius: 11 },
      { t: 'goto', at: 'place:jetty', text: 'Go to the end of the East Jetty', scene: 'M09_EPI_C3', if: 'end:C', npcs: [{ id: 'MARA', at: 'place:jetty' }], radius: 12 },
      { t: 'pay', amounts: { A: 2000, B: 50000, C: 500 }, cp: false }
    ],
    onDone: { set: { campaign_complete: true } } }),

  /* ---------------- optional chains ---------------- */
  M({ id: 'E01', code: 'E01_OLD_TICKETS', title: 'OLD TICKETS', chain: 'Eddie\'s garage', desc: 'Eddie kept every job ticket Danny filed. They are in a storage unit he cannot face.', req: 'done:M05', reward: 300,
    start: { at: 'place:garage', label: 'Eddie wants a favour' },
    steps: [
      { t: 'scene', scene: 'E01_ASK', npcs: [{ id: 'EDDIE', at: 'place:garage' }] },
      { t: 'pickup', at: 'place:warehouse3', item: 'tickets', text: 'Find the box in the Vale storage unit', scene: 'E01_UNIT', radius: 12 },
      { t: 'goto', at: 'place:garage', text: 'Bring the tickets back to Eddie', scene: 'E01_BACK', radius: 11 }
    ], onDone: { rel: { EDDIE: 1 }, set: { eddie_tickets: true } } }),
  M({ id: 'E02', code: 'E02_DANNYS_TRUCK', title: 'DANNY\'S TRUCK', chain: 'Eddie\'s garage', desc: 'Bring the blue pickup home.', req: 'done:E01', reward: 400, announce: 'E02_CALL', start: { at: 'place:docks', label: 'Collect the pickup from Walt' },
    steps: [
      { t: 'goto', at: 'place:docks', text: 'Pick up Danny\'s truck from Walt', scene: 'E02_WALT', npcs: [{ id: 'WALT', at: 'place:docks' }], radius: 12 },
      { t: 'getcar', car: 'dtruck', carName: 'blue pickup', type: 'pickup', color: 0x2f5fb8, at: 'place:docks', text: 'Get into the blue pickup' },
      { t: 'drive', car: 'dtruck', carName: 'blue pickup', at: 'place:garage', text: 'Drive the truck home to Eddie\'s garage', radio: 'E02_DRIVE', scene: 'E02_HOME', radius: 12 }
    ], fail: [{ t: 'wrecked', car: 'dtruck', text: 'Danny\'s truck was destroyed' }], onDone: { rel: { EDDIE: 1 }, set: { eddie_truck: true } } }),
  M({ id: 'E03', code: 'E03_SOMEONE_WHO_KNEW_HIM', title: 'SOMEONE WHO KNEW HIM', chain: 'Eddie\'s garage', desc: 'Not the docks, not the crew: the people who liked Danny.', req: 'done:E02', reward: 500, announce: 'E03_ASK', start: { at: 'place:mart', label: 'Visit Lucille Ng' },
    steps: [
      { t: 'goto', at: 'place:mart', text: 'Talk to Lucille Ng about Danny', scene: 'E03_LUCILLE', npcs: [{ id: 'LUCILLE', at: 'place:mart' }], radius: 10 },
      { t: 'goto', at: 'place:pier', text: 'Meet Eddie at Harbor Pier', scene: 'E03_PIER', npcs: [{ id: 'EDDIE', at: 'place:pier' }], radius: 14 }
    ], onDone: { set: { eddie_closure: true } } }),

  M({ id: 'R01', code: 'R01_CLEAN_MONEY', title: 'CLEAN MONEY', chain: 'Mara\'s escape plan', desc: 'A legal courier run, twelve hundred dollars, and a quarter of Mara\'s ticket out.', req: 'done:M04', reward: 1200, announce: 'R01_CALL', start: { at: 'place:dealer', label: 'Collect the lab samples' },
    steps: [
      { t: 'pickup', at: 'place:dealer', item: 'samples', text: 'Collect the lab samples at Harbor Motors' },
      { t: 'goto', at: 'place:hospital', text: 'Deliver the samples to St. Mary\'s', radio: 'R01_DRIVE', radius: 12 },
      { t: 'goto', at: 'place:garage', text: 'Meet Mara at the garage', scene: 'R01_DONE', npcs: [{ id: 'MARA', at: 'place:garage' }], radius: 11 }
    ], onDone: { set: { mara_savings: true } } }),
  M({ id: 'R02', code: 'R02_MATEO', title: 'MATEO', chain: 'Mara\'s escape plan', desc: 'Mara\'s brother will talk to a stranger.', req: 'done:R01 && done:M05', reward: 300, announce: 'R02_CALL', start: { at: 'place:park', label: 'Talk to Mateo' },
    steps: [{ t: 'goto', at: 'place:park', text: 'Find Mateo in the park', scene: 'R02_PARK', npcs: [{ id: 'MATEO', at: 'place:park' }], radius: 11 }], onDone: {} }),
  M({ id: 'R03', code: 'R03_THE_PLAN', title: 'THE PLAN', chain: 'Mara\'s escape plan', desc: 'Mara asks what you would do.', req: 'done:R02', reward: 600, start: { at: 'place:garage', label: 'Mara is waiting' },
    steps: [
      { t: 'scene', scene: 'R03_PLAN', npcs: [{ id: 'MARA', at: 'place:garage' }] },
      { t: 'goto', at: 'place:jetty', text: 'Take Mara to the East Jetty', radius: 14 }
    ], onDone: {} }),

  M({ id: 'O01', code: 'O01_INCONSISTENCIES', title: 'INCONSISTENCIES', chain: 'The honest officer', desc: 'A patrol officer says Rowan\'s reports do not match her notes.', req: 'done:M04', reward: 100, start: { at: 'place:hq', label: 'Officer Whitfield wants a word' },
    steps: [{ t: 'scene', scene: 'O01_MEET', npcs: [{ id: 'DANA', at: 'place:hq' }] }], onDone: { rel: { DANA: 1 } } }),
  M({ id: 'O02', code: 'O02_THREE_SITES', title: 'THREE SITES', chain: 'The honest officer', desc: 'Visit three addresses and compare them with the reports.', req: 'done:O01', reward: 300,
    steps: [
      { t: 'call', scene: 'O02_BRIEF', cp: false },
      { t: 'goto', at: 'place:mart', text: 'Check the Wharf Street shops', scene: 'O02_SITE1', radius: 12 },
      { t: 'goto', at: 'place:warehouse3', text: 'Check the old storage unit', scene: 'O02_SITE2', radius: 12 },
      { t: 'goto', at: 'place:warehouse', text: 'Check the Port Warehouse', scene: 'O02_SITE3', radius: 12 }
    ], start: { at: 'place:hq', label: 'Dana has three addresses' }, onDone: {} }),
  M({ id: 'O03', code: 'O03_THE_FILE', title: 'THE FILE', chain: 'The honest officer', desc: 'Help Dana build a case that can stand up.', req: 'done:O02', reward: 500, start: { at: 'place:hq', label: 'Dana is waiting' },
    steps: [{ t: 'goto', at: 'place:hq', text: 'Meet Officer Whitfield at HQ', scene: 'O03_FILE', npcs: [{ id: 'DANA', at: 'place:hq' }], radius: 11 }], onDone: { set: { dana_has_case: true } } }),

  M({ id: 'W01', code: 'W01_WINDOWS', title: 'WINDOWS', chain: 'The waterfront residents', desc: 'Two men and a van outside Ng\'s Corner Mart.', req: 'done:M06', reward: 400, announce: 'W01_CALL', start: { at: 'place:mart', label: 'Lucille needs help' },
    steps: [
      { t: 'goto', at: 'place:mart', text: 'Get to Ng\'s Corner Mart', radius: 12, npcs: [{ id: 'LUCILLE', at: 'place:mart' }] },
      { t: 'ambush', cars: 2, from: 'behind', stars: 0, text: 'Drive off the vandals', radio: 'W01_SIEGE', min: 10 },
      { t: 'goto', at: 'place:mart', text: 'Check on Lucille', scene: 'W01_DONE', radius: 10 }
    ], onDone: { set: { mart_saved: true } } }),
  M({ id: 'W02', code: 'W02_SIGNATURES', title: 'SIGNATURES', chain: 'The waterfront residents', desc: 'A petition against the buyout needs names.', req: 'done:W01', reward: 300, start: { at: 'place:mart', label: 'Lucille has a petition' },
    steps: [
      { t: 'scene', scene: 'W02_ASK', npcs: [{ id: 'LUCILLE', at: 'place:mart' }] },
      { t: 'goto', at: 'place:diner', text: 'Collect signatures at the diner', scene: 'W02_NEIGHBOUR', radius: 12 },
      { t: 'goto', at: 'place:plaza', text: 'Hand the petition to Priya at City Plaza', scene: 'W02_PLAZA', npcs: [{ id: 'PRIYA', at: 'place:plaza' }], radius: 12 }
    ], onDone: { set: { petition_filed: true } } }),
  M({ id: 'W03', code: 'W03_THE_PERMIT', title: 'THE PERMIT', chain: 'The waterfront residents', desc: 'A waiver on the Alder Point fence does not look right.', req: 'done:W02', reward: 500, announce: 'W03_ASK', start: { at: 'place:site', label: 'Photograph the permit' },
    steps: [
      { t: 'pickup', at: 'place:site', item: 'photo', text: 'Photograph the permit on the Alder Point fence', scene: 'W03_SITE', radius: 12 },
      { t: 'goto', at: 'place:diner', text: 'Show Priya the photograph', scene: 'W03_PRIYA', npcs: [{ id: 'PRIYA', at: 'place:diner' }], radius: 12 }
    ], onDone: { set: { waiver_forged: true } } }),

  M({ id: 'D01', code: 'D01_COLLECTIONS', title: 'COLLECTIONS', chain: 'Darius\'s crew', desc: 'Three shops, three envelopes. Jojo says nobody gets hurt.', req: 'done:M02', expires: 'done:M06', reward: 400, announce: 'D01_CALL', start: { at: 'place:depot', label: 'Jojo has a collection run' },
    steps: [
      { t: 'goto', at: 'place:mart', text: 'Collect from Ng\'s Corner Mart', radio: 'D01_STOP', radius: 10 },
      { t: 'goto', at: 'place:diner', text: 'Collect from the diner', radius: 10 },
      { t: 'goto', at: 'place:dealer', text: 'Collect from Harbor Motors', radius: 12 },
      { t: 'goto', at: 'place:depot', text: 'Bring the envelopes back to the depot', scene: 'D01_DONE', npcs: [{ id: 'JOJO', at: 'place:depot' }], radius: 12 }
    ], onDone: { set: { did_collections: true } } }),
  M({ id: 'D02', code: 'D02_BORROWED_CAR', title: 'BORROWED CAR', chain: 'Darius\'s crew', desc: 'A sports car from the dealership lot. Visible, loud and not yours.', req: 'done:D01', expires: 'done:M06', reward: 700, announce: 'D02_CALL', start: { at: 'place:dealer', label: 'The car Darius wants' },
    steps: [
      { t: 'getcar', car: 'stolen', carName: 'sports car', type: 'sports', color: 0xd0a020, at: 'place:dealer', text: 'Take the yellow sports car' },
      { t: 'heat', stars: 1, text: 'Lose the police', hold: 3 },
      { t: 'drive', car: 'stolen', carName: 'sports car', at: 'place:depot', text: 'Deliver the car to the depot', scene: 'D02_DONE', npcs: [{ id: 'DARIUS', at: 'place:depot' }], radius: 12 }
    ], fail: [{ t: 'wrecked', car: 'stolen', text: 'The car was destroyed' }], onDone: { set: { did_stolen_car: true } } }),
  M({ id: 'D03', code: 'D03_JOJOS_QUESTION', title: 'JOJO\'S QUESTION', chain: 'Darius\'s crew', desc: 'Jojo has something on his mind.', req: 'done:D02', expires: 'done:M06', reward: 0, start: { at: 'place:depot', label: 'Jojo wants a word' },
    steps: [{ t: 'goto', at: 'place:depot', text: 'Talk to Jojo at the depot', scene: 'D03_JOJO', npcs: [{ id: 'JOJO', at: 'place:depot' }], radius: 10 }], onDone: {} })
];
export const MISSIONS = Object.fromEntries(MISSION_LIST.map(m => [m.id, m]));
export const MAIN_ORDER = MISSION_LIST.filter(m => m.main).map(m => m.id);

/** hangout conversations: people who live in the world. Each has a place, a story window and the scenes they can say (first match wins, rotating). */
export const HANGOUTS = [
  { id: 'EDDIE', at: 'place:garage', req: 'done:M00', scenes: [{ s: 'H01_EDDIE6', req: 'flag:took_sloane_money && done:M06' }, { s: 'H01_EDDIE5', req: 'flag:eddie_closure' }, { s: 'H01_EDDIE4', req: 'done:M06 && !done:M08' }, { s: 'H01_EDDIE3', req: 'done:M02' }, { s: 'H01_EDDIE2', req: 'done:M01' }, { s: 'H01_EDDIE1', req: '' }] },
  { id: 'MARA', at: 'place:mara', req: 'done:M02', scenes: [{ s: 'H02_MARA4', req: 'rel:MARA<=DISTRUSTED' }, { s: 'H02_MARA3', req: 'rel:MARA>=TRUSTED' }, { s: 'H02_MARA5', req: 'done:R01' }, { s: 'H02_MARA2', req: 'done:M03' }, { s: 'H02_MARA1', req: '' }] },
  { id: 'WALT', at: 'place:docks', req: 'done:M01 && !done:M08', scenes: [{ s: 'H03_WALT2', req: 'done:M03' }, { s: 'H03_WALT1', req: '' }] },
  { id: 'LUCILLE', at: 'place:mart', req: 'done:M06', scenes: [{ s: 'H04_LUCILLE2', req: 'flag:mart_saved' }, { s: 'H04_LUCILLE1', req: '' }] },
  { id: 'DANA', at: 'place:hq', req: 'done:O01', scenes: [{ s: 'H05_DANA1', req: '' }] },
  { id: 'PRIYA', at: 'place:diner', req: 'done:M06', scenes: [{ s: 'H06_PRIYA1', req: '' }] },
  { id: 'JOJO', at: 'place:depot', req: 'done:M02 && !done:M07', scenes: [{ s: 'H07_JOJO1', req: '' }] },
  { id: 'DARIUS', at: 'place:depot', req: 'done:M02 && !done:M06', scenes: [{ s: 'H08_DARIUS1', req: '' }] },
  { id: 'ROWAN', at: 'place:hq', req: 'done:M05 && !done:M09', scenes: [{ s: 'H09_ROWAN1', req: '' }] },
  { id: 'MATEO', at: 'place:park', req: 'done:R01 && !done:M09', scenes: [{ s: 'H10_MATEO1', req: '' }] }
];

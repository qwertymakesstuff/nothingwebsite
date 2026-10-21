// Campaign days as data. Each day sets:
//   entrants   arrival order: authored ids, or 'gen' for a generated entrant
//   flawRate   chance a generated entrant carries a flaw
//   nations    relative weights for a generated entrant's nationality
//   purposes   relative weights for a foreign entrant's purpose (missing purposes weigh 1)
//   bulletin   the morning directive
// Which regulations apply is set by their own `from` / `until` days (data/regulations.js).
// Pay and penalties are in data/scoring.js.

const gen = n => Array(n).fill('gen');
const EVEN = { COR: 3, OSK: 2, VEL: 2, DRA: 2, KAL: 2 };

export const DAYS = [
  {
    day: 1, date: '1982-03-12', flawRate: 0.45, nations: EVEN,
    entrants: ['v_ilse_marek', 'gen', 'v_tomas_reyl', 'gen', 'v_anika_sorvald', 'gen', 'v_mikel_arnsen', 'gen', 'v_odessa_kain', 'gen', 'v_piotr_halden', 'gen'],
    bulletin: {
      title: 'Directive 1 · First shift',
      lines: [
        'Welcome to Checkpoint 9, officer. The regulations in force are listed under Rules.',
        'Check every paper against the rulebook and against the other papers. Use Compare fields when in doubt.',
      ],
    },
  },
  {
    day: 2, date: '1982-03-13', flawRate: 0.45, nations: EVEN, purposes: { Work: 4 }, entrants: gen(12),
    bulletin: {
      title: 'Directive 2 · Forged passports',
      lines: [
        'Passports from offices that do not exist are crossing the eastern road. Check the issuing office against Nations.',
        'The spring hiring season has begun. Foreign workers must now carry a Work Permit.',
      ],
    },
  },
  {
    day: 3, date: '1982-03-15', flawRate: 0.45, nations: EVEN, purposes: { Transit: 4 }, entrants: gen(13),
    bulletin: {
      title: 'Directive 3 · Seals and transit',
      lines: [
        'The forgers have improved. Compare the seal on every passport cover with the official seal of its nation.',
        'Through traffic to the western posts is rising. Entrants in transit must carry a Transit Pass.',
      ],
    },
  },
  {
    day: 4, date: '1982-03-16', flawRate: 0.5, nations: { ...EVEN, COR: 5 }, entrants: gen(13),
    bulletin: {
      title: 'Directive 4 · Papers in date',
      lines: [
        'Every paper an entrant presents must now be in date, not only the passport.',
        'By order of the Assembly, elderly citizens returning home are granted a year\'s grace on an expired passport.',
      ],
    },
  },
  {
    day: 5, date: '1982-03-17', flawRate: 0.5, nations: EVEN, entrants: gen(14),
    bulletin: {
      title: 'Directive 5 · Entry Permits',
      lines: [
        'From today every foreign entrant needs an Entry Permit issued by this Ministry.',
        'The purpose on the Entry Permit must match the purpose on the Entry Declaration.',
      ],
    },
  },
  {
    day: 6, date: '1982-03-18', flawRate: 0.5, nations: { ...EVEN, OSK: 6 }, purposes: { Transit: 3 }, entrants: gen(14),
    bulletin: {
      title: 'Directive 6 · Oskaria suspended',
      lines: [
        'After last night\'s shooting at the Tavrask crossing, entry of Oskarian nationals is suspended until further notice.',
        'Oskarians in transit to the western posts may still pass with the correct papers.',
      ],
    },
  },
  {
    day: 7, date: '1982-03-19', flawRate: 0.55, nations: EVEN, purposes: { Work: 3, Visit: 2 }, entrants: gen(14),
    bulletin: {
      title: 'Directive 7 · Length of stay',
      lines: [
        'Visitors are overstaying. No stay may exceed 30 days, unless the entrant comes to work or study.',
        'A Work Permit must cover the whole stay. Count the days from today.',
      ],
    },
  },
  {
    day: 8, date: '1982-03-20', flawRate: 0.55, nations: { ...EVEN, VEL: 5, DRA: 5 }, entrants: gen(14),
    bulletin: {
      title: 'Directive 8 · Skeld fever',
      lines: [
        'An outbreak of Skeld fever has been confirmed in northern Velsund and Dravenmark.',
        'Travellers of those nations must prove vaccination with a Health Certificate.',
      ],
    },
  },
  {
    day: 9, date: '1982-03-22', flawRate: 0.55, nations: { ...EVEN, KAL: 7 }, purposes: { 'Family visit': 4, Transit: 3 }, entrants: gen(15),
    bulletin: {
      title: 'Directive 9 · Kaltrin',
      lines: [
        'The suspension on Oskarian nationals is lifted.',
        'Fighting in southern Kaltrin has sent many across the mountains. Kaltrini nationals may enter only for a Family visit or in transit.',
      ],
    },
  },
  {
    day: 10, date: '1982-03-23', flawRate: 0.6, nations: EVEN, purposes: { Transit: 4 }, entrants: gen(16),
    bulletin: {
      title: 'Directive 10 · Port Kessel closed',
      lines: [
        'Port Kessel has closed to foreign traffic. No transit may name the Port Kessel route.',
        'Expect heavy traffic. Every rule in this book is in force.',
      ],
    },
  },
];

export const dayByNumber = n => DAYS.find(d => d.day === n) || null;
export const LAST_DAY = DAYS[DAYS.length - 1].day;

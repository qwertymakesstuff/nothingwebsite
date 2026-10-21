// Campaign days as data: the order entrants arrive in ('gen' marks a generated entrant),
// how often a generated entrant carries a flaw and the morning bulletin. Pay and penalties
// are in data/scoring.js.

export const DAYS = [
  {
    day: 1,
    date: '1982-03-12',
    entrants: ['v_ilse_marek', 'gen', 'v_tomas_reyl', 'gen', 'v_anika_sorvald', 'gen', 'v_mikel_arnsen', 'gen', 'v_odessa_kain', 'gen', 'v_piotr_halden', 'gen'],
    flawRate: 0.45,
    bulletin: {
      title: 'Directive 1 · First shift',
      lines: [
        'Welcome to Checkpoint 9, officer. The regulations in force are listed under Rules.',
        'Check every paper against the rulebook and against the other papers. Use Compare fields when in doubt.',
        'Forgers are active on the eastern road. Check seals and issuing offices on every passport.',
      ],
    },
  },
];

export const dayByNumber = n => DAYS.find(d => d.day === n) || null;

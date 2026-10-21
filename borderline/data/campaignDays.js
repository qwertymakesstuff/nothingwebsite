// Campaign days as data: the order entrants arrive in ('gen' marks a generated entrant),
// how often a generated entrant carries a flaw, what the Ministry pays and the morning bulletin.

export const DAYS = [
  {
    day: 1,
    date: '1982-03-12',
    wagePerEntrant: 5,
    entrants: ['v_ilse_marek', 'gen', 'v_tomas_reyl', 'gen', 'v_anika_sorvald', 'gen', 'v_mikel_arnsen', 'gen', 'v_odessa_kain', 'gen', 'v_piotr_halden', 'gen'],
    flawRate: 0.45,
    bulletin: {
      title: 'Directive 1 · Training shift',
      lines: [
        'Every entrant must present a passport.',
        'Corvennan citizens also carry a national Identity Card.',
        'Foreign entrants carry an Entry Declaration, plus a Work Permit if they come to work or a Transit Pass if they are passing through.',
        'Read each document and compare it with the entrant before deciding.',
        'Training rate: K5 for each entrant processed. Accuracy reviews begin after training.',
      ],
    },
  },
];

export const dayByNumber = n => DAYS.find(d => d.day === n) || null;

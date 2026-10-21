// Campaign days as data. Phase 1 has only the first shift: the order entrants arrive in,
// what the Ministry pays per entrant processed, and the morning bulletin shown on the desk.

export const DAYS = [
  {
    day: 1,
    date: '1982-03-12',
    wagePerEntrant: 5,
    entrants: ['v_ilse_marek', 'v_tomas_reyl', 'v_anika_sorvald', 'v_mikel_arnsen', 'v_odessa_kain', 'v_piotr_halden'],
    bulletin: {
      title: 'Directive 1 · Training shift',
      lines: [
        'Every entrant must present a passport.',
        'Foreign entrants also carry an Entry Declaration.',
        'Read each document and compare it with the entrant before deciding.',
        'Training rate: K5 for each entrant processed. Accuracy reviews begin after training.',
      ],
    },
  },
];

export const dayByNumber = n => DAYS.find(d => d.day === n) || null;

// Customers. `tier` decides when they start showing up (see TIERS in jobs.js); `trait` sets how
// they judge the work (see PERSONALITIES). Portraits are drawn procedurally from the name.

export const PERSONALITIES = {
  patient: { label: 'Patient', priceSens: 0.7, lateSens: 0.5, tip: 0.05, perf: 0.5, blurb: 'Happy to wait for a proper job.' },
  frugal: { label: 'Frugal', priceSens: 1.6, lateSens: 0.8, tip: 0, perf: 0.4, blurb: 'Counts every dollar on the invoice.' },
  picky: { label: 'Picky', priceSens: 1, lateSens: 1, tip: 0.05, perf: 1.4, blurb: 'Expects everything perfect, and checks.' },
  rushed: { label: 'In a hurry', priceSens: 0.6, lateSens: 1.8, tip: 0.08, perf: 0.6, blurb: 'Needs it back yesterday.' },
  friendly: { label: 'Friendly', priceSens: 0.8, lateSens: 0.7, tip: 0.12, perf: 0.6, blurb: 'Easy-going, tips for good work.' },
  techie: { label: 'Tech-savvy', priceSens: 1.1, lateSens: 0.9, tip: 0.06, perf: 1.2, blurb: 'Knows hardware. Notices temperatures and benchmarks.' },
};

export const CUSTOMERS = [
  { id: 'marta', name: 'Marta Okonkwo', trait: 'patient', tier: 1, about: 'Retired teacher who video-calls her grandchildren every Sunday.' },
  { id: 'dev', name: 'Dev Ramaswamy', trait: 'frugal', tier: 1, about: 'Engineering student living on instant noodles.' },
  { id: 'tilly', name: 'Tilly Park', trait: 'rushed', tier: 1, about: 'Fourteen, with a tournament this weekend. Her dad pays.' },
  { id: 'gus', name: 'Gus Abernathy', trait: 'friendly', tier: 1, about: 'Builds model railways and keeps the club newsletter on his PC.' },
  { id: 'priya', name: 'Priya Natarajan', trait: 'frugal', tier: 1, about: 'Freelance translator. Her laptop died; she wants a cheap desktop.' },
  { id: 'owen', name: 'Owen Achterberg', trait: 'techie', tier: 1, about: 'Reads hardware forums for fun. Will ask about your thermal paste.' },
  { id: 'sunny', name: 'Sunny Delacroix', trait: 'friendly', tier: 1, about: 'Runs the flower stall on the corner.' },
  { id: 'lou', name: 'Lou Brennan', trait: 'rushed', tier: 1, about: 'Delivery driver who streams at night.' },
  { id: 'ines', name: 'Ines Calder', trait: 'picky', tier: 1, about: 'Graphic designer with very particular opinions.' },
  { id: 'bea', name: 'Bea Thistlewood', trait: 'patient', tier: 1, about: 'Writes mystery novels. All her drafts live on one hard drive.' },
  { id: 'rafael', name: 'Rafael Moreno', trait: 'friendly', tier: 1, about: 'Father of three gamers. Brings cookies.' },
  { id: 'nadia', name: 'Nadia Volkov', trait: 'picky', tier: 2, biz: 'Volkov Accounting', about: 'Tax season is coming and her office PCs can\'t fail.' },
  { id: 'kip', name: 'Kip Hollis', trait: 'frugal', tier: 2, biz: 'Hollis Hardware', about: 'Third-generation hardware store owner. Hates waste.' },
  { id: 'amara', name: 'Dr. Amara Eze', trait: 'rushed', tier: 2, biz: 'Eze Family Dental', about: 'The appointment system runs on one computer.' },
  { id: 'mo', name: 'Mo Haddad', trait: 'friendly', tier: 2, biz: 'Cedar Café', about: 'Café owner; the till PC sits next to the espresso machine.' },
  { id: 'greta', name: 'Greta Lindqvist', trait: 'techie', tier: 2, biz: 'Lindqvist Architects', about: 'Renders buildings overnight. Hates fan noise.' },
  { id: 'zane', name: 'Zane Okafor', trait: 'techie', tier: 3, about: 'Streams as "PixelZane". Wants frames, and wants them quiet.' },
  { id: 'ruby', name: 'Ruby Tanaka', trait: 'picky', tier: 3, about: 'Case modder. Your work will appear on her channel.' },
  { id: 'felix', name: 'Felix Brandt', trait: 'rushed', tier: 3, about: 'Sim racer with a league race on Friday.' },
  { id: 'luca', name: 'Luca Moretti', trait: 'patient', tier: 3, about: '3D artist who renders animated shorts.' },
  { id: 'jun', name: 'Jun Park', trait: 'techie', tier: 3, about: 'Semi-pro esports player. Counts frames.' },
  { id: 'celeste', name: 'Celeste Whitmore', trait: 'picky', tier: 4, about: 'Music producer with a studio full of microphones.' },
  { id: 'victor', name: 'Victor Hale', trait: 'rushed', tier: 4, biz: 'Hale Ventures', about: 'CEO. Wants the best, today.' },
  { id: 'isadora', name: 'Isadora Quinn', trait: 'patient', tier: 4, about: 'Film editor working on a documentary.' },
  { id: 'marcus', name: 'Marcus Reid', trait: 'friendly', tier: 4, about: 'Full-time streamer with half a million followers.' },
  { id: 'northgate', name: 'Northgate School', trait: 'frugal', tier: 5, biz: 'Northgate School District', about: 'IT budget approved by committee.', org: true },
  { id: 'brightwell', name: 'Brightwell Clinic', trait: 'picky', tier: 5, biz: 'Brightwell Clinic', about: 'Patient records on ageing machines.', org: true },
  { id: 'halcyon', name: 'Halcyon Labs', trait: 'techie', tier: 5, biz: 'Halcyon Labs', about: 'Research lab running simulations around the clock.', org: true },
  { id: 'ledger', name: 'Ledger & Loom', trait: 'rushed', tier: 5, biz: 'Ledger & Loom Law', about: 'Law firm with a court deadline.', org: true },
];
export const CUSTOMER = Object.fromEntries(CUSTOMERS.map(c => [c.id, c]));

// Hand-authored entrants for the training shift. Each one carries structured documents;
// the desk renders exactly these fields, so what the player reads is what the game holds.
//   look: portrait parameters (see js/portrait.js)
//   documents: { type, ...fields }, rendered by js/documentRenderer.js

export const VISITORS = {
  v_ilse_marek: {
    id: 'v_ilse_marek',
    name: 'Ilse Marek',
    look: { skin: '#e2b896', hair: '#5a3a22', hairStyle: 'bun', coat: '#6b5a48', collar: '#d9d2c0' },
    lines: { greet: 'Good morning. I am coming home from my sister\'s in Brenna.', accepted: 'Thank you. It is good to be back.', rejected: 'But I live here...' },
    documents: [
      { type: 'passport', nation: 'COR', surname: 'MAREK', given: 'ILSE', sex: 'F', dob: '1951-06-02', issuedIn: 'Halvost', expires: '1985-01-19', number: 'CR-40118' },
    ],
  },
  v_tomas_reyl: {
    id: 'v_tomas_reyl',
    name: 'Tomas Reyl',
    look: { skin: '#c99a76', hair: '#2a2420', hairStyle: 'short', coat: '#3c4a5a', collar: '#e6e0d0', beard: true },
    lines: { greet: 'Papers. Here. I sell cloth in Halvost every spring.', accepted: 'Good, good. Business waits for no one.', rejected: 'You will regret this. My buyers will not.' },
    documents: [
      { type: 'passport', nation: 'OSK', surname: 'REYL', given: 'TOMAS', sex: 'M', dob: '1944-11-23', issuedIn: 'Mirn', expires: '1983-08-04', number: 'OK-2271-9' },
      { type: 'declaration', surname: 'REYL', given: 'TOMAS', nationality: 'OSK', passportNo: 'OK-2271-9', purpose: 'Business', duration: '14 days', destination: 'Halvost' },
    ],
  },
  v_anika_sorvald: {
    id: 'v_anika_sorvald',
    name: 'Anika Sorvald',
    look: { skin: '#f0d0b4', hair: '#c9a15a', hairStyle: 'long', coat: '#7a3b32', collar: '#efe8d8', glasses: true },
    lines: { greet: 'Hello! I start at the conservatory in Halvost next week.', accepted: 'Wonderful, thank you!', rejected: 'Is something wrong with my passport?' },
    documents: [
      { type: 'passport', nation: 'VEL', surname: 'SORVALD', given: 'ANIKA', sex: 'F', dob: '1962-02-14', issuedIn: 'Skeld', expires: '1981-12-01', number: 'VS-883104' },
      { type: 'declaration', surname: 'SORVALD', given: 'ANIKA', nationality: 'VEL', passportNo: 'VS-883104', purpose: 'Study', duration: '9 months', destination: 'Halvost' },
    ],
  },
  v_mikel_arnsen: {
    id: 'v_mikel_arnsen',
    name: 'Mikel Arnsen',
    look: { skin: '#d6a882', hair: '#7a5530', hairStyle: 'cap', coat: '#4a4a3a', collar: '#cfc8b4' },
    lines: { greet: 'The quarry at Ostrel is hiring. I have a cousin there.', accepted: 'Hah. Easier than I thought.', rejected: 'A spelling mistake? That is the clerk\'s fault, not mine.' },
    documents: [
      { type: 'passport', nation: 'DRA', surname: 'ARNSEN', given: 'MIKEL', sex: 'M', dob: '1957-09-30', issuedIn: 'Kolm', expires: '1986-04-11', number: 'DM-55-0712' },
      { type: 'declaration', surname: 'ARNSEN', given: 'MIKKEL', nationality: 'DRA', passportNo: 'DM-55-0712', purpose: 'Work', duration: '6 months', destination: 'Ostrel' },
    ],
  },
  v_odessa_kain: {
    id: 'v_odessa_kain',
    name: 'Odessa Kain',
    look: { skin: '#8a5a3c', hair: '#d8d4cc', hairStyle: 'scarf', coat: '#2f3f3a', collar: '#b9a77a' },
    lines: { greet: 'My grandson is getting married in Brenna. I would not miss it.', accepted: 'Bless you, young one.', rejected: 'Then I will wait here until you change your mind.' },
    documents: [
      { type: 'passport', nation: 'KAL', surname: 'KAIN', given: 'ODESSA', sex: 'F', dob: '1913-04-08', issuedIn: 'Sevan', expires: '1984-10-27', number: 'KT-01937' },
      { type: 'declaration', surname: 'KAIN', given: 'ODESSA', nationality: 'KAL', passportNo: 'KT-01937', purpose: 'Family visit', duration: '21 days', destination: 'Brenna' },
    ],
  },
  v_piotr_halden: {
    id: 'v_piotr_halden',
    name: 'Piotr Halden',
    look: { skin: '#e8c0a0', hair: '#3a2a1e', hairStyle: 'short', coat: '#5a4a3a', collar: '#e0dccc' },
    lines: { greet: 'Evening. Last bus from the east. My passport is in here somewhere... there.', accepted: 'Home before dark. Thank you.', rejected: 'You are sending a Corvennan away from Corvenna?' },
    documents: [
      { type: 'passport', nation: 'COR', surname: 'HALDEN', given: 'PIOTR', sex: 'M', dob: '1949-12-05', issuedIn: 'Ostrel', expires: '1983-03-02', number: 'CR-27756' },
    ],
  },
};

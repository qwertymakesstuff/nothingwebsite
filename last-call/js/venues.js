// The five venues. Style decides what generated guests wear, crowd decides why they came, and the
// palette and music feed the art and audio.

export const VENUES = {
  lantern: {
    id: 'lantern', name: 'The Lantern', tagline: 'Neighbourhood bar · est. 1974',
    blurb: 'A narrow, warm, sticky-floored local with a darts board and a karaoke machine older than you. Dee Okonjo has run it for thirty years.',
    style: 'casual', crowd: 'pub', wage: 70, tipMult: 1,
    palette: { bg: '#1a1210', glow: '#ffb347', accent: '#e8743b', sign: 'LANTERN' },
    music: { bpm: 96, root: 45, mode: 'pub' },
  },
  sump: {
    id: 'sump', name: 'The Sump', tagline: 'Underground music club',
    blurb: 'A basement under a tyre shop, all concrete, condensation and very loud guitars. Promoter Saffron Ibe books the bands; Kwame\'s firm runs the door.',
    style: 'club', crowd: 'club', wage: 85, tipMult: 0.8,
    palette: { bg: '#0d140f', glow: '#9dff5c', accent: '#47c26b', sign: 'THE SUMP' },
    music: { bpm: 140, root: 40, mode: 'punk' },
  },
  halcyon: {
    id: 'halcyon', name: 'Halcyon', tagline: 'Rooftop lounge · 31st floor',
    blurb: 'Velvet ropes, gold trim and a lift that hums jazz. Run by Victor Lark of Lark & Vane, who likes things smooth and expensive.',
    style: 'smart', crowd: 'lounge', wage: 95, tipMult: 1.6,
    palette: { bg: '#0e1418', glow: '#f2c46b', accent: '#4fd1c5', sign: 'HALCYON' },
    music: { bpm: 104, root: 50, mode: 'lounge' },
  },
  voltage: {
    id: 'voltage', name: 'Voltage Hall', tagline: 'Electronic music venue · 2,000 capacity',
    blurb: 'A converted power station with a sound system you feel in your teeth. Fast queues, wristbands and very long nights.',
    style: 'club', crowd: 'rave', wage: 100, tipMult: 0.9,
    palette: { bg: '#0a0b1a', glow: '#5cc8ff', accent: '#ff4fd8', sign: 'VOLTAGE' },
    music: { bpm: 128, root: 41, mode: 'techno' },
  },
  orchid: {
    id: 'orchid', name: 'The Orchid Room', tagline: 'Private members\' club',
    blurb: 'Behind an unmarked door: leather chairs, hushed voices, and a membership list older than the city council.',
    style: 'formal', crowd: 'members', wage: 115, tipMult: 1.4,
    palette: { bg: '#140c18', glow: '#d39bff', accent: '#9a5cc8', sign: 'ORCHID' },
    music: { bpm: 84, root: 43, mode: 'jazz' },
  },
};

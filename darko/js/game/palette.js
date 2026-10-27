// The whole game draws from this one restricted palette: cold suburban blues, a few warm
// lamp colours, skin and hair, and one red kept for things that matter.

export const C = {
  black: '#000000',
  ink: '#08070c',
  night: '#100f1a',
  deep: '#181728',
  slate: '#242338',
  dusk: '#34324c',
  grey: '#4c4964',
  fog: '#7c7894',
  mist: '#a8a3b8',
  bone: '#c9c3b6',
  white: '#ece6d6',

  skin: '#c69478',
  skinD: '#946450',
  hairBk: '#16110f',
  hairBr: '#4a3226',
  hairLt: '#7a5a3e',
  hairBl: '#bfa063',

  red: '#8e1f1f',
  redD: '#511313',
  amber: '#b88a3a',
  lamp: '#e6c46c',
  glow: '#f2e0a6',
  tv: '#8fb0cc',
  tvD: '#3d5672',

  green: '#2a3828',
  greenD: '#192217',
  greenL: '#3c4c34',
  wood: '#4e3727',
  woodD: '#2f2119',
  woodL: '#6c4e36',
  teal: '#2c4648',
  tealD: '#1c2e30',
  cream: '#8e8670',
  creamD: '#625c4c',
  brick: '#4c2a26',
  blue: '#26365a',
  blueD: '#182340',
  pink: '#9a5a6e',
  asphalt: '#1d1c24',
  concrete: '#4a4852',
  shadow: 'rgba(0,0,0,0.35)',
};

// darkness tint for the lighting pass: a cold blue-black, never pure black
export const NIGHT_TINT = [6, 6, 16];

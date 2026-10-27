// Who speaks and how they look. Looks feed drawPerson() in art.js: every figure is built from a
// few rectangles, so silhouettes (height, hair, hood) carry most of the character.

import { C } from './palette.js';

export const CAST = {
  donnie: {
    name: 'DONNIE', col: C.bone,
    look: { h: 18, skin: C.skin, hair: C.hairBk, style: 'messy', hood: true, top: C.slate, topD: C.deep, bottom: C.blueD, shoes: C.ink },
  },
  rose: {
    name: 'ROSE', col: '#c9a49a',
    look: { h: 17, skin: C.skin, hair: C.hairLt, style: 'bob', top: C.teal, topD: C.tealD, bottom: C.creamD, shoes: C.woodD },
  },
  eddie: {
    name: 'EDDIE', col: '#9fb0c8',
    look: { h: 19, skin: C.skin, hair: C.hairBr, style: 'receding', top: '#4f6584', topD: '#36475e', bottom: C.cream, shoes: C.woodD },
  },
  elizabeth: {
    name: 'ELIZABETH', col: '#c98c8c',
    look: { h: 17, skin: C.skin, hair: C.hairBk, style: 'long', top: C.red, topD: C.redD, bottom: C.blue, shoes: C.ink },
  },
  samantha: {
    name: 'SAMANTHA', col: '#d8b6c4',
    look: { h: 13, skin: C.skin, hair: C.hairBl, style: 'pony', top: C.pink, topD: '#6e3e4e', bottom: C.blue, shoes: C.bone },
  },
  callie: { name: 'CALLIE', col: C.mist },
  tv: { name: 'TV', col: C.tv },
  voice: { name: '...', col: C.mist },
};

export const speakerName = id => (CAST[id] ? CAST[id].name : String(id).toUpperCase());
export const speakerCol = id => (CAST[id] ? CAST[id].col : C.bone);

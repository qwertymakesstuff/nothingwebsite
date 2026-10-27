// Who speaks and how they look. Looks feed drawPerson() in art.js: every figure is built from a
// few rectangles, so silhouettes (height, hair, hood, glasses, a cap) carry most of the character.
// Frank is drawn by drawFrank() instead.

import { C } from './palette.js';

const look = (h, hair, style, top, topD, bottom, extra = {}) => ({ h, skin: C.skin, hair, style, top, topD, bottom, shoes: C.ink, ...extra });

export const CAST = {
  donnie: { name: 'DONNIE', col: C.bone, look: look(18, C.hairBk, 'messy', C.slate, C.deep, C.blueD, { hood: true }) },
  rose: { name: 'ROSE', col: '#c9a49a', look: look(17, C.hairLt, 'bob', C.teal, C.tealD, C.creamD, { shoes: C.woodD }) },
  eddie: { name: 'EDDIE', col: '#9fb0c8', look: look(19, C.hairBr, 'receding', '#4f6584', '#36475e', C.cream, { shoes: C.woodD }) },
  elizabeth: { name: 'ELIZABETH', col: '#c98c8c', look: look(17, C.hairBk, 'long', C.red, C.redD, C.blue) },
  samantha: { name: 'SAMANTHA', col: '#d8b6c4', look: look(13, C.hairBl, 'pony', C.pink, '#6e3e4e', C.blue, { shoes: C.bone }) },
  callie: { name: 'CALLIE', col: C.mist },

  frank: { name: 'FRANK', col: '#d8d4dc' },
  voice: { name: '...', col: C.mist },
  tv: { name: 'TV', col: C.tv },

  gretchen: { name: 'GRETCHEN', col: '#b49ad0', look: look(17, C.hairBk, 'long', '#3a2a4a', '#261c32', C.ink) },
  pomeroy: { name: 'MS. POMEROY', col: '#e0b080', look: look(17, C.hairBl, 'bob', '#7a4a3a', '#5a3428', C.creamD) },
  farmer: { name: 'MS. FARMER', col: '#e098b8', look: look(17, '#c8a050', 'bob', '#a05878', '#7a405a', '#a05878') },
  cunningham: { name: 'JIM CUNNINGHAM', col: '#d8c080', look: look(19, C.hairBr, 'short', '#8a7a5a', '#6a5c42', '#8a7a5a') },
  fisher: { name: 'DR. FISHER', col: '#a8c0a0', look: look(18, '#6a6a6a', 'receding', '#3a5a3a', '#2a422a', C.cream) },
  cole: { name: 'PRINCIPAL COLE', col: C.mist, look: look(19, '#5a5a5a', 'receding', C.grey, C.dusk, C.grey) },
  monnitoff: { name: 'DR. MONNITOFF', col: '#c0b090', look: look(18, C.hairBr, 'messy', '#5a4a3a', '#42362a', C.creamD, { glasses: true }) },
  thurman: { name: 'DR. THURMAN', col: '#d0c8c0', look: look(17, '#b8b0a8', 'bob', C.bone, C.cream, C.grey) },
  sparrow: { name: 'GRANDMA DEATH', col: '#c8c0c8', look: look(14, '#e0dcd8', 'bob', '#b8b0bc', '#8e8694', '#b8b0bc') },
  sean: { name: 'SEAN', col: '#b0c0a0', look: look(17, C.hairLt, 'messy', '#3a4a3a', '#2a362a', C.blue) },
  ronald: { name: 'RONALD', col: '#b8a8d0', look: look(16, C.hairBr, 'short', '#6a5a8a', '#4c4064', C.blue) },
  cherita: { name: 'CHERITA', col: '#d0a0b8', look: look(15, C.hairBk, 'bob', '#5a5a7a', '#40405a', C.blueD, { earmuffs: '#d080a0' }) },
  joanie: { name: 'JOANIE', col: '#b0d0b0', look: look(13, C.hairBr, 'pony', '#6a8a6a', '#4a644a', C.blue, { shoes: C.bone }) },
  emily: { name: 'EMILY', col: '#d0c0a0', look: look(12, C.hairBl, 'pony', '#8a6a4a', '#6a4e36', C.blue, { shoes: C.bone }) },
  officer: { name: 'POLICE OFFICER', col: '#8aa0c8', look: look(19, C.hairBk, 'short', '#22304a', '#141c2e', '#22304a', { cap: '#141c2e' }) },
  garland: { name: 'BOB GARLAND', col: C.mist, look: look(19, '#7a7a7a', 'short', '#18181e', '#0c0c10', '#18181e', { glasses: true }) },
  fireman: { name: 'FIREMAN', col: '#d8b860', look: look(19, C.hairBr, 'short', '#a88a2a', '#7a641e', '#4a4030', { cap: '#8a2020' }) },
  leroy: { name: 'LEROY', col: '#a0b0c0', look: look(18, '#3a3a3a', 'short', '#4a5a6a', '#36424e', '#4a5a6a', { skin: C.skinD }) },
  seth: { name: 'SETH', col: '#a0a0a0', look: look(19, C.hairBk, 'short', '#2a2a2a', '#1a1a1a', C.blueD) },
  ricky: { name: 'RICKY', col: '#c0a080', look: look(18, C.hairLt, 'messy', '#5a3a2a', '#40281c', C.blueD) },
  student: { name: 'STUDENT', col: C.fog, look: look(17, C.hairBr, 'short', '#4a5a7a', '#36425a', C.blueD) },
  student2: { name: 'STUDENT', col: C.fog, look: look(16, C.hairBl, 'long', '#7a4a5a', '#5a3442', C.creamD) },
};

export const speakerName = id => (CAST[id] ? CAST[id].name : String(id).toUpperCase());
export const speakerCol = id => (CAST[id] ? CAST[id].col : C.bone);

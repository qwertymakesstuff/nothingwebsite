// Harbor City style guide, as data. One place for the palette and proportions every generator draws from, so the city reads as one
// place: stylised low-poly, strong silhouettes, slightly worn. See gta/STYLE.md for the reasoning behind these numbers.
export const STYLE = {
  // building materials (hex): every facade colour comes from one of these families
  building: {
    concrete: [0xa8a8a2, 0x9a9ea4, 0xb4b0a4, 0x8e9298],
    plaster:  [0xd8cdb4, 0xc9d0c0, 0xe0c8a8, 0xb8c6d0, 0xd6b8b0],
    brick:    [0x9a5a44, 0x8a4a3a, 0xa8764f, 0x7a5a4a],
    stone:    [0xc4b9a0, 0xb8ae98, 0xa89f8c],
    glass:    [0x4a7a9a, 0x3f6f78, 0x5a6f8a, 0x2f4f6a],
    metal:    [0x8a949c, 0x7a8a84, 0x9a8a78, 0x7f8a96],
    trim:     0xd8d4c8, frame: 0x2a2f36, roof: 0x4a4a4c, roofAlt: [0x7a3a2a, 0x4a4a52, 0x5a3a28, 0x3a4a5a, 0x4f5a48]
  },
  // proportions in metres: a storey, the shop/ground floor, parapet and cornice heights
  scale: { floor: 3.2, ground: 4.2, parapet: .7, cornice: .4, door: 2.4, awning: 1.0 },
  road: { asphalt: '#34353a', line: '#e4e4e0', yellow: '#d8b84a', pavement: '#9a9a94', curb: 0xb2b2ac, curbH: .15 },
  veg: {
    leaf:  [0x3a7a3a, 0x4a8a3a, 0x2f6a35, 0x5a9a3f, 0x6a9a3a, 0x2f7a4a],
    autumn: [0xc08a2a, 0xb5622a],
    trunk: [0x5a3d22, 0x4a3320, 0x6a4a2a],
    grass: [0x4f8a45, 0x5f9a4a, 0x4a7a3a], palm: 0x3f8a40
  },
  water: { shallow: 0x58c8c0, deep: 0x15446e, sand: 0xe4d4a8, wetSand: 0xb8a67c, rock: 0x6a6a68 },
  props: { metal: 0x3a3d42, wood: 0x7a5a3a, paintRed: 0xc43228, safety: 0xf0701e, plastic: 0x3f5a46 },
  vehicles: { police: 0x1c2a4a },
  lights: { lamp: 0xffe2a0, window: 0xffd68a, sodium: 0xffc880 }
};
export const pickFrom = (arr, R) => arr[Math.floor(R() * arr.length)];

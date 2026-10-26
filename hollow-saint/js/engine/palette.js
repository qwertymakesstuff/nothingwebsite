// The whole game draws with these sixteen colours and nothing else. Every pixel in the
// framebuffer is an index into this table; lighting works by stepping indices down SHADE.

export const PALETTE = [
  '#000000', // 0  black
  '#0d0b10', // 1  near black
  '#1b1822', // 2  ink
  '#2d2a36', // 3  slate
  '#4a4654', // 4  ash
  '#77727f', // 5  stone
  '#b3adb4', // 6  pale
  '#e6e0d4', // 7  bone
  '#2a0808', // 8  dried blood
  '#6e0f12', // 9  blood
  '#c41e1e', // 10 red (used sparingly)
  '#121c14', // 11 deep forest
  '#23331f', // 12 moss
  '#4a3f22', // 13 dirt / tallow
  '#d9a84a', // 14 candle
  '#1d2f4a', // 15 cold blue
];

export const C = {
  BLACK: 0, NEAR: 1, INK: 2, SLATE: 3, ASH: 4, STONE: 5, PALE: 6, BONE: 7,
  DRIED: 8, BLOOD: 9, RED: 10, FOREST: 11, MOSS: 12, DIRT: 13, CANDLE: 14, COLD: 15,
};

// one step darker for each colour, used by the dithered lighting and the pause dimmer
export const SHADE = [0, 0, 1, 2, 3, 4, 5, 6, 0, 8, 9, 1, 11, 2, 13, 2];

export const TRANSPARENT = 255;

// palette as 32-bit RGBA words in the byte order ImageData expects on little-endian machines
export function palette32(pal = PALETTE) {
  return Uint32Array.from(pal, hex => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (255 << 24 | b << 16 | g << 8 | r) >>> 0;
  });
}

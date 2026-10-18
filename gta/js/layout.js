// Pure layout numbers for the city: a grid of N x N blocks separated by roads. No rendering in here.
export const N = 7, B = 40, RD = 14, P = B + RD, WORLD = N * P + RD, INSET = 3;
export const rc = k => k * P + RD / 2;               // centre line of road k
export const blockX = i => i * P + RD;
export const blockZ = j => j * P + RD;
export const PARKS = ['3,3', '1,1', '5,5'];
export const HOSPITAL = [5, 1];
export const STATION = [1, 5];
export const isPark = (i, j) => PARKS.includes(i + ',' + j);
// corners of the pavement ring around a block, c = 0..3 (top-left, top-right, bottom-right, bottom-left)
export const corner = (i, j, c) => {
  const sx = [-1, 1, 1, -1][c], sz = [-1, -1, 1, 1][c];
  return [blockX(i) + B / 2 + sx * (B / 2 - 1.5), blockZ(j) + B / 2 + sz * (B / 2 - 1.5)];
};

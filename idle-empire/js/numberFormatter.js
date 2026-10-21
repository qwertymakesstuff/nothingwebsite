// One place that turns a value into text, so every counter in the game reads the same way.
//   under 1,000      up to `decimals` decimals, trailing zeros dropped (0.1, 4.5, 999)
//   under 1,000,000  whole number with separators (12,345)
//   up to 1e66       three significant digits and a suffix (1.23 M, 45.6 B, 789 Qa)
//   beyond           scientific notation (1.23e70, 4.56e1234)
// Digits are always cut, never rounded up, so a counter never shows more than you have.
import BigNum from './bigNum.js';

export const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

function cut(n, decimals) {
  const f = 10 ** decimals;
  // the tiny relative nudge stops 0.3 showing as 0.29 because of binary floating point,
  // while 999.999999 still shows as 999
  return Math.floor(n * f * (1 + 1e-14)) / f;
}

function threeDigits(mantissa, extraZeros) {
  const n = mantissa * 10 ** extraZeros; // 1 <= n < 1000
  const decimals = n < 10 ? 2 : n < 100 ? 1 : 0;
  return cut(n, decimals).toFixed(decimals);
}

export function formatNumber(value, decimals = 1) {
  const x = BigNum.from(value);
  if (x.isZero()) return '0';
  if (x.sign() < 0) return '-' + formatNumber(x.neg(), decimals);
  const { m, e } = x.parts();
  if (e < 3) {
    const n = cut(x.toNumber(), decimals);
    return String(Number(n.toFixed(decimals)));
  }
  if (e < 6) return Math.floor(x.toNumber()).toLocaleString('en-US');
  const tier = Math.floor(e / 3);
  if (tier < SUFFIXES.length) return `${threeDigits(m, e - tier * 3)} ${SUFFIXES[tier]}`;
  return `${cut(m, 2).toFixed(2)}e${e}`;
}

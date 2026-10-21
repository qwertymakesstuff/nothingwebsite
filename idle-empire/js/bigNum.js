// BigNum: an immutable number that keeps working long past 1e308 (where plain
// JavaScript numbers become Infinity). Every amount of currency, cost and production
// in the game is a BigNum.
//
// Two storage forms, chosen automatically:
//   small  |value| < 1e300: e = 0 and m is the value itself, an ordinary double, so
//          everyday sums are exact (whole numbers stay whole up to 2^53, about 9e15)
//   large  m in [1, 10) and e >= 300: value = m x 10^e, precise to ~15 significant digits
// Adding a value more than MAX_DIGITS orders of magnitude smaller to a large one changes nothing.

const SMALL_LIMIT = 1e300;
const SMALL_EXP = 300;
const MAX_DIGITS = 17;

function pow10(n) {
  // 10 ** n without overflowing to Infinity / underflowing to 0 on the way
  if (n > 300) return 10 ** 300 * 10 ** (n - 300);
  if (n < -300) return 10 ** -300 * 10 ** (n + 300);
  return 10 ** n;
}

// scale by 10^n, dividing for negative n so 0.7 * 10 stays 7 (not 6.999...)
function scale(m, n) {
  return n >= 0 ? m * pow10(n) : m / pow10(-n);
}

export default class BigNum {
  constructor(mantissa = 0, exponent = 0) {
    let m = Number(mantissa);
    let e = Number(exponent);
    if (!Number.isFinite(m) || !Number.isFinite(e) || m === 0) {
      this.m = 0; this.e = 0; Object.freeze(this); return;
    }
    if (e === 0 && Math.abs(m) < SMALL_LIMIT) {
      this.m = m; this.e = 0; Object.freeze(this); return;
    }
    // fold any fractional part of the exponent into the mantissa, then normalise to [1, 10)
    const whole = Math.floor(e);
    if (whole !== e) { m *= 10 ** (e - whole); e = whole; }
    const shift = Math.floor(Math.log10(Math.abs(m)));
    m = scale(m, -shift); e += shift;
    // floating-point log10 can be off by one at exact powers of ten
    if (Math.abs(m) >= 10) { m /= 10; e += 1; } else if (Math.abs(m) < 1) { m *= 10; e -= 1; }
    if (e < SMALL_EXP) { m = scale(m, e); e = 0; }
    this.m = m; this.e = e;
    Object.freeze(this);
  }

  // Accepts a BigNum, a finite number, a string ("1234", "1.5e400") or a plain {m, e}.
  // Anything invalid (NaN, Infinity, garbage) becomes zero, so bad input can never poison the economy.
  static from(x) {
    if (x instanceof BigNum) return x;
    if (typeof x === 'number') return new BigNum(x, 0);
    if (typeof x === 'string') {
      const match = /^\s*(-?\d*\.?\d+)(?:e([+-]?\d+))?\s*$/i.exec(x);
      return match ? new BigNum(parseFloat(match[1]), match[2] ? parseInt(match[2], 10) : 0) : ZERO;
    }
    if (x && typeof x === 'object' && 'm' in x && 'e' in x) return new BigNum(x.m, x.e);
    return ZERO;
  }

  static fromLog10(l) {
    if (!Number.isFinite(l)) return ZERO;
    const e = Math.floor(l);
    return new BigNum(10 ** (l - e), e);
  }

  isSmall() { return this.e === 0; }
  isZero() { return this.m === 0; }
  sign() { return Math.sign(this.m); }
  neg() { return new BigNum(-this.m, this.e); }
  abs() { return this.m < 0 ? this.neg() : this; }

  // scientific parts {m in [1, 10), e} whatever the storage form (zero gives {0, 0})
  parts() {
    if (this.e !== 0 || this.m === 0) return { m: this.m, e: this.e };
    let e = Math.floor(Math.log10(Math.abs(this.m)));
    let m = scale(this.m, -e);
    if (Math.abs(m) >= 10) { m /= 10; e += 1; } else if (Math.abs(m) < 1) { m *= 10; e -= 1; }
    return { m, e };
  }
  log10() { return this.m > 0 ? Math.log10(this.m) + this.e : -Infinity; }

  add(other) {
    const b = BigNum.from(other);
    if (b.m === 0) return this;
    if (this.m === 0) return b;
    if (this.e === 0 && b.e === 0) return new BigNum(this.m + b.m, 0);
    const pa = this.parts(), pb = b.parts();
    const d = pa.e - pb.e;
    if (d > MAX_DIGITS) return this;
    if (d < -MAX_DIGITS) return b;
    return d >= 0 ? new BigNum(pa.m + scale(pb.m, -d), pa.e) : new BigNum(scale(pa.m, d) + pb.m, pb.e);
  }
  sub(other) { return this.add(BigNum.from(other).neg()); }
  mul(other) {
    const b = BigNum.from(other);
    if (this.e === 0 && b.e === 0) {
      const p = this.m * b.m;
      if (Number.isFinite(p)) return new BigNum(p, 0);
    }
    const pa = this.parts(), pb = b.parts();
    return new BigNum(pa.m * pb.m, pa.e + pb.e);
  }
  // dividing by zero gives zero instead of Infinity/NaN
  div(other) {
    const b = BigNum.from(other);
    if (b.m === 0) return ZERO;
    if (this.e === 0 && b.e === 0) {
      const q = this.m / b.m;
      if (Number.isFinite(q)) return new BigNum(q, 0);
    }
    const pa = this.parts(), pb = b.parts();
    return new BigNum(pa.m / pb.m, pa.e - pb.e);
  }
  // only defined for non-negative bases, which is all the economy needs
  pow(n) {
    if (n === 0) return ONE;
    if (this.m <= 0) return ZERO;
    if (this.e === 0) {
      const r = this.m ** n;
      if (Number.isFinite(r) && r < SMALL_LIMIT) return new BigNum(r, 0);
    }
    return BigNum.fromLog10(this.log10() * n);
  }

  // large values have no fractional digits left to remove
  floor() { return this.e === 0 ? new BigNum(Math.floor(this.m), 0) : this; }
  ceil() { return this.e === 0 ? new BigNum(Math.ceil(this.m), 0) : this; }

  cmp(other) {
    const b = BigNum.from(other);
    if (this.e === 0 && b.e === 0) return this.m === b.m ? 0 : this.m > b.m ? 1 : -1;
    const sa = Math.sign(this.m), sb = Math.sign(b.m);
    if (sa !== sb) return sa > sb ? 1 : -1;
    const pa = this.parts(), pb = b.parts();
    // same sign: a bigger exponent means bigger for positives and smaller for negatives
    if (pa.e !== pb.e) return (pa.e > pb.e ? 1 : -1) * sa;
    return pa.m === pb.m ? 0 : pa.m > pb.m ? 1 : -1;
  }
  eq(b) { return this.cmp(b) === 0; }
  gt(b) { return this.cmp(b) > 0; }
  gte(b) { return this.cmp(b) >= 0; }
  lt(b) { return this.cmp(b) < 0; }
  lte(b) { return this.cmp(b) <= 0; }

  static max(a, b) { a = BigNum.from(a); b = BigNum.from(b); return a.gte(b) ? a : b; }
  static min(a, b) { a = BigNum.from(a); b = BigNum.from(b); return a.lte(b) ? a : b; }

  // a plain number: the value itself while small, Infinity beyond ~1.8e308
  toNumber() {
    if (this.e === 0) return this.m;
    if (this.e > 308) return this.m > 0 ? Infinity : -Infinity;
    return scale(this.m, this.e);
  }
  // "12345", "0.1", "1e+21" or "1.5e400"; BigNum.from() reads every one of them back
  toString() { return this.e === 0 ? String(this.m) : `${this.m}e${this.e}`; }
  toJSON() { return this.toString(); }
}

export const ZERO = new BigNum(0, 0);
export const ONE = new BigNum(1, 0);

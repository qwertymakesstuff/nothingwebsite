import { Game, choice, roundRect, text } from '../assets/gamekit.js';
import { WORDS } from './words.js';

const W = 420, H = 610, T = 58, G = 8, TOP = 18, LEFT = (W - (5 * T + 4 * G)) / 2;
const ROWS_KB = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'];
const KEY_W = 36, KEY_H = 50, KEY_G = 5, KB_TOP = 442;
const COL = { absent: '#2b2b38', present: '#c9a227', correct: '#3f9a4a', empty: '#15151f', typed: '#15151f' };

const rank = { absent: 1, present: 2, correct: 3 };

/** Where every on-screen key is, shared by drawing and tapping. */
const KEYS = ROWS_KB.flatMap((row, r) => {
  const keys = [...row];
  const widths = keys.map((k) => (k === '+' || k === '-' ? KEY_W * 1.5 : KEY_W));
  const total = widths.reduce((a, b) => a + b, 0) + (keys.length - 1) * KEY_G;
  let x = (W - total) / 2;
  return keys.map((k, i) => { const key = { k, x, y: KB_TOP + r * (KEY_H + KEY_G), w: widths[i] }; x += widths[i] + KEY_G; return key; });
});

class Five extends Game {
  constructor() {
    super({
      slug: 'five', title: 'Five Letters', width: W, height: H, bg: '#0d0d14', scoreLabel: 'Points', typing: true,
      help: 'Guess the secret five-letter word in six tries. Green means right letter, right spot; gold means the letter is in the word but elsewhere; grey means it is not in the word. Type on your keyboard or tap the keys. Any five letters count as a guess. Fewer guesses, more points.',
      controls: { pointer: true },
    });
  }

  reset() {
    this.answer = choice(WORDS);
    this.guesses = []; // { word, marks[] }
    this.cur = '';
    this.flip = null;  // { row, t }
    this.msg = ''; this.msgT = 0;
    this.keyState = {};
    this.shake = 0;
  }

  press(code) {
    if (this.flip) return;
    if (/^Key[A-Z]$/.test(code)) this.type(code.slice(3).toLowerCase());
    else if (code === 'Backspace') this.cur = this.cur.slice(0, -1);
    else if (code === 'Enter') this.submit();
  }

  type(ch) { if (this.cur.length < 5) { this.cur += ch; this.sfx(420, 0.02, 'triangle', 0.03); } }

  pointer(type, x, y) {
    if (type !== 'down' || this.flip) return;
    const hit = KEYS.find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + KEY_H);
    if (hit) this.press(hit.k === '+' ? 'Enter' : hit.k === '-' ? 'Backspace' : `Key${hit.k.toUpperCase()}`);
  }

  say(m) { this.msg = m; this.msgT = 1.6; }

  submit() {
    if (this.cur.length < 5) { this.say('Not enough letters'); this.shake = 0.3; this.sfx(180, 0.1, 'sawtooth', 0.04); return; }
    const word = this.cur;
    const marks = Array(5).fill('absent');
    const left = [...this.answer];
    for (let i = 0; i < 5; i++) if (word[i] === this.answer[i]) { marks[i] = 'correct'; left[i] = null; }
    for (let i = 0; i < 5; i++) {
      if (marks[i] === 'correct') continue;
      const j = left.indexOf(word[i]);
      if (j >= 0) { marks[i] = 'present'; left[j] = null; }
    }
    this.guesses.push({ word, marks });
    this.cur = '';
    this.flip = { row: this.guesses.length - 1, t: 0 };
  }

  finishFlip() {
    const g = this.guesses.at(-1);
    [...g.word].forEach((ch, i) => { if (!this.keyState[ch] || rank[g.marks[i]] > rank[this.keyState[ch]]) this.keyState[ch] = g.marks[i]; });
    this.flip = null;
    if (g.word === this.answer) {
      const tries = this.guesses.length;
      this.setScore((7 - tries) * 100);
      this.sfx(880, 0.3, 'triangle', 0.06);
      this.gameOver(['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'][tries - 1]);
    } else if (this.guesses.length >= 6) {
      this.gameOver(`It was “${this.answer.toUpperCase()}”`, { won: false });
    }
  }

  update(dt) {
    this.msgT = Math.max(0, this.msgT - dt);
    this.shake = Math.max(0, this.shake - dt);
    if (this.flip) {
      this.flip.t += dt;
      if (this.flip.t >= 0.15 * 4 + 0.45) this.finishFlip();
    }
  }

  draw(ctx) {
    const shakeX = this.shake > 0 ? Math.sin(this.shake * 60) * 6 : 0;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const x = LEFT + c * (T + G) + (r === this.guesses.length ? shakeX : 0), y = TOP + r * (T + G);
        const guess = this.guesses[r];
        let fill = COL.empty, border = '#34344a', ch = '', scale = 1;
        if (guess) {
          ch = guess.word[c];
          let revealed = true;
          if (this.flip && this.flip.row === r) {
            const t = this.flip.t - c * 0.15;
            if (t < 0) revealed = false;
            scale = t < 0 ? 1 : t < 0.2 ? 1 - t / 0.2 : t < 0.4 ? (t - 0.2) / 0.2 : 1;
            if (t >= 0 && t < 0.2) revealed = false;
          }
          if (revealed) { fill = COL[guess.marks[c]]; border = fill; } else { border = '#555570'; }
        } else if (r === this.guesses.length) {
          ch = this.cur[c] || '';
          if (ch) border = '#7a7a96';
        }
        ctx.save(); ctx.translate(x + T / 2, y + T / 2); ctx.scale(1, Math.max(0.02, scale));
        ctx.fillStyle = fill; roundRect(ctx, -T / 2, -T / 2, T, T, 8); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke();
        if (ch) text(ctx, ch.toUpperCase(), 0, 2, { size: 30, color: '#fff' });
        ctx.restore();
      }
    }
    if (this.msgT > 0) { ctx.fillStyle = 'rgba(232,232,242,.95)'; roundRect(ctx, W / 2 - 100, 414, 200, 28, 8); ctx.fill(); text(ctx, this.msg, W / 2, 428, { size: 13, color: '#111' }); }
    for (const { k, x, y, w } of KEYS) {
      ctx.fillStyle = COL[this.keyState[k]] || '#3a3a4e';
      roundRect(ctx, x, y, w, KEY_H, 7); ctx.fill();
      text(ctx, k === '+' ? 'ENTER' : k === '-' ? '⌫' : k.toUpperCase(), x + w / 2, y + KEY_H / 2 + 1, { size: k === '+' ? 10 : 16, color: '#fff' });
    }
  }
}

new Five().mount();

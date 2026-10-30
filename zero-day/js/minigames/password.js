// PASSWORD CRACKING — a deduction puzzle (Mastermind-style). Guess the credential code.
// Each guess returns feedback: ● = right glyph in the right slot, ○ = right glyph wrong slot.
// Intel you gathered in recon and your Cracking Suite pre-reveal some slots. Wrong guesses are
// noisy and raise detection; run out of attempts and the stage fails.
import { frame, h, button, clear } from './util.js';

export function play(host, cfg, ctx) {
  return new Promise(resolve => {
    const { detect, sfx, op, derived } = ctx;
    const { codeLen, palette, secret } = cfg;
    let attempts = cfg.attempts;

    // Build the intel: pre-known slots from crack tier, a bonus slot for strong recon, +1 for a dump.
    const known = new Map();
    for (const pos of cfg.revealPositions) known.set(pos, secret[pos]);
    if (op.knownClues.length >= 3 && known.size < codeLen - 1) {
      for (let i = 0; i < codeLen; i++) if (!known.has(i)) { known.set(i, secret[i]); break; }
    }
    if (ctx.hasPrep('hintdump') && known.size < codeLen - 1) {
      for (let i = 0; i < codeLen; i++) if (!known.has(i)) { known.set(i, secret[i]); break; }
    }

    const guess = Array.from({ length: codeLen }, (_, i) => known.has(i) ? known.get(i) : null);
    let cursor = guess.findIndex(g => g == null);
    if (cursor < 0) cursor = 0;

    const { body, footer } = frame(host, {
      title: 'Credential Cracker', tag: 'PASSWORD',
      how: `Deduce the ${codeLen}-glyph code. ● right glyph & slot · ○ right glyph, wrong slot. Pre-known slots are locked from intel.`,
    });

    const status = h('p', { class: 'mg-status' });
    const current = h('div', { class: 'pw-current' });
    const paletteRow = h('div', { class: 'pw-palette' });
    const history = h('div', { class: 'pw-history' });
    body.append(status, current, paletteRow, history);

    function drawCurrent() {
      clear(current);
      for (let i = 0; i < codeLen; i++) {
        const locked = known.has(i);
        const slot = h('button', {
          class: 'pw-slot' + (i === cursor ? ' active' : '') + (locked ? ' locked' : ''),
          type: 'button', disabled: locked,
          onclick: () => { cursor = i; drawCurrent(); },
        }, guess[i] || '·');
        current.append(slot);
      }
      status.textContent = `Attempts left: ${attempts}`;
    }
    function drawPalette() {
      clear(paletteRow);
      palette.forEach(sym => paletteRow.append(h('button', {
        class: 'pw-key', type: 'button', onclick: () => place(sym),
      }, sym)));
      paletteRow.append(button('⌫', 'ghost', () => { if (!known.has(cursor)) { guess[cursor] = null; drawCurrent(); } }));
      paletteRow.append(button('Submit', 'primary', submit));
    }
    function place(sym) {
      if (known.has(cursor)) { advance(); }
      guess[cursor] = sym;
      sfx.key();
      advance();
      drawCurrent();
    }
    function advance() {
      let n = cursor;
      for (let step = 0; step < codeLen; step++) {
        n = (n + 1) % codeLen;
        if (!known.has(n) && guess[n] == null) { cursor = n; return; }
      }
      // all filled; keep cursor on first editable
      for (let i = 0; i < codeLen; i++) if (!known.has(i)) { cursor = i; return; }
    }

    function score(g) {
      let exact = 0, partial = 0;
      const s = secret.slice(), gg = g.slice();
      for (let i = 0; i < codeLen; i++) if (gg[i] === s[i]) { exact++; s[i] = gg[i] = null; }
      for (let i = 0; i < codeLen; i++) {
        if (gg[i] == null) continue;
        const j = s.indexOf(gg[i]);
        if (j >= 0) { partial++; s[j] = null; }
      }
      return { exact, partial };
    }

    function submit() {
      if (guess.some(g => g == null)) { ctx.toast('Fill every slot first.'); sfx.bad(); return; }
      const { exact, partial } = score(guess);
      const row = h('div', { class: 'pw-row' },
        h('div', { class: 'pw-glyphs' }, ...guess.map(g => h('span', { class: 'pw-g' }, g))),
        h('div', { class: 'pw-pegs' },
          ...Array.from({ length: exact }, () => h('span', { class: 'peg exact' }, '●')),
          ...Array.from({ length: partial }, () => h('span', { class: 'peg partial' }, '○')),
          ...Array.from({ length: codeLen - exact - partial }, () => h('span', { class: 'peg none' }, '·')),
        ),
      );
      history.prepend(row);

      if (exact === codeLen) {
        sfx.success();
        resolve({ success: true, note: `Cracked in ${cfg.attempts - attempts + 1} attempt(s).` });
        return;
      }
      attempts--;
      detect.add(4, 'rejected login attempt');
      sfx.bad();
      if (attempts <= 0) {
        resolve({ success: false, note: 'Account locked — out of attempts.' });
        return;
      }
      drawCurrent();
    }

    drawCurrent();
    drawPalette();
    if (known.size) ctx.toast(`Intel pre-filled ${known.size} slot(s).`);
  });
}

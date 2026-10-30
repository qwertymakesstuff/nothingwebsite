// RECON — probe a target's exposed surface to uncover clues. Facts you reveal here feed the
// password and social-engineering stages, so scanning well pays off later. One node may be a
// honeypot: scanning it nudges detection. Your Recon Scanner upgrade grants more scans.
import { frame, h, button, clear } from './util.js';

export function play(host, cfg, ctx) {
  return new Promise(resolve => {
    const { op, derived, detect, sfx } = ctx;
    const clues = op.clues;
    let scans = derived.reconClues + (ctx.hasPrep('hintdump') ? 1 : 0);
    const honeypotIdx = Math.floor(ctx.rng() * clues.length);
    const revealed = new Set();

    const { body, footer } = frame(host, {
      title: `Reconnaissance — ${op.target.name}`, tag: 'RECON',
      how: 'Click nodes to scan them. Revealed facts (pet names, years, affiliations) help you later. You have a limited number of scans. Avoid the honeypot.',
    });

    const status = h('p', { class: 'mg-status' });
    const grid = h('div', { class: 'recon-grid' });
    body.append(status, grid);

    function draw() {
      status.textContent = `Scans left: ${scans}  ·  Facts found: ${op.knownClues.length}`;
      clear(grid);
      clues.forEach((clue, i) => {
        const open = revealed.has(i);
        const card = h('button', {
          class: 'recon-node' + (open ? ' open' : '') + (open && clue.kind === 'fact' ? ' fact' : ''),
          type: 'button', disabled: open || scans <= 0,
          onclick: () => scan(i),
        });
        if (open) {
          card.append(h('span', { class: 'recon-icon' }, clue.kind === 'fact' ? '🔑' : (i === honeypotIdx ? '⚠' : '·')));
          card.append(h('span', { class: 'recon-text' }, clue.label));
        } else {
          card.append(h('span', { class: 'recon-icon' }, '▓'));
          card.append(h('span', { class: 'recon-text muted' }, `node_${String(i + 1).padStart(2, '0')}`));
        }
        grid.append(card);
      });
    }

    function scan(i) {
      if (revealed.has(i) || scans <= 0) return;
      revealed.add(i); scans--;
      const clue = clues[i];
      if (clue.kind === 'fact' && !op.knownClues.find(c => c.k === clue.k)) {
        op.knownClues.push(clue);
        sfx.reveal();
      } else if (i === honeypotIdx) {
        detect.add(6, 'tripped a honeypot during recon');
        sfx.bad();
      } else {
        sfx.tap();
      }
      draw();
      if (scans <= 0) finishBtn.classList.add('ready');
    }

    const finishBtn = button('Finish recon →', 'primary', () => {
      sfx.good();
      resolve({ success: true, note: `${op.knownClues.length} useful fact(s) gathered.` });
    });
    footer.append(finishBtn);
    draw();
  });
}

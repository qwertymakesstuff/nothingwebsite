// LOG CLEANUP — a memory puzzle. The system shows a sequence of log entries lighting up; repeat
// it exactly to overwrite your traces. Succeed and detection drops sharply, reducing the chance
// of a follow-up investigation. A slip just replays the sequence (small detection cost).
import { frame, h, button, clear, delay } from './util.js';

export function play(host, cfg, ctx) {
  return new Promise(resolve => {
    const { detect, sfx } = ctx;
    const pads = cfg.pads;
    const seq = Array.from({ length: cfg.length }, () => Math.floor(ctx.rng() * pads));
    let input = [], accepting = false, done = false, slips = 0;

    const { body, footer } = frame(host, {
      title: 'Log Scrubber', tag: 'LOGS',
      how: 'Memorise the highlighted order, then click the entries in the same sequence to wipe your trail.',
    });
    const status = h('p', { class: 'mg-status' });
    const grid = h('div', { class: 'fw-grid', style: { '--n': String(Math.ceil(Math.sqrt(pads))) } });
    body.append(status, grid);
    const padEls = [];
    for (let i = 0; i < pads; i++) {
      const el = h('button', { class: 'fw-pad log', type: 'button', disabled: true, onclick: () => press(i) }, `log_${i + 1}`);
      padEls.push(el); grid.append(el);
    }

    async function show() {
      accepting = false; padEls.forEach(p => p.disabled = true);
      status.textContent = 'Watch the sequence…';
      await delay(400);
      for (const s of seq) {
        if (done) return;
        padEls[s].classList.add('lit'); sfx.key();
        await delay(360); padEls[s].classList.remove('lit'); await delay(120);
      }
      if (done) return;
      accepting = true; input = []; padEls.forEach(p => p.disabled = false);
      status.textContent = `Repeat ${seq.length} entries (0/${seq.length})`;
    }

    function press(i) {
      if (!accepting || done) return;
      input.push(i);
      padEls[i].classList.add('press'); setTimeout(() => padEls[i].classList.remove('press'), 140);
      sfx.tap();
      const idx = input.length - 1;
      if (input[idx] !== seq[idx]) {
        slips++;
        detect.add(3, 'log scrub slipped');
        sfx.alarm();
        padEls[i].classList.add('err'); setTimeout(() => padEls[i].classList.remove('err'), 300);
        if (slips >= 4) { done = true; resolve({ success: false, note: 'Scrub failed — partial trail remains.' }); return; }
        setTimeout(show, 350);
        return;
      }
      status.textContent = `Repeat ${seq.length} entries (${input.length}/${seq.length})`;
      if (input.length === seq.length) {
        done = true;
        const cut = 24 + cfg.length * 2;
        detect.add(-cut, 'logs scrubbed', true);
        sfx.success();
        resolve({ success: true, note: `Traces wiped (−${cut}% detection).` });
      }
    }

    show();
  });
}

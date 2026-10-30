// FIREWALL BYPASS — a timed signal-routing puzzle. The firewall pulses a sequence across its
// nodes; echo it back in order. Each round adds one pulse. A wrong node trips the alarm and
// replays the round. Beat every round before the shared timer runs out. Processing Rig and the
// Overclock Chip buy you more time.
import { frame, h, button, clear, delay } from './util.js';

export function play(host, cfg, ctx) {
  return new Promise(resolve => {
    const { detect, sfx } = ctx;
    const pads = cfg.nodes;
    let time = cfg.time + (ctx.hasPrep('overclock') ? cfg.time * 0.4 : 0);
    const seq = [];
    let round = 0;
    let accepting = false;
    let input = [];
    let done = false;

    const { body, footer } = frame(host, {
      title: 'Firewall Bypass', tag: 'FIREWALL',
      how: 'Watch the pulse order, then click the nodes in the same order. Each round is one longer. Beat the timer.',
    });
    const status = h('p', { class: 'mg-status' });
    const bar = h('div', { class: 'timer-bar' }, h('span'));
    const grid = h('div', { class: 'fw-grid', style: { '--n': String(Math.ceil(Math.sqrt(pads))) } });
    body.append(status, bar, grid);
    const padEls = [];
    for (let i = 0; i < pads; i++) {
      const el = h('button', { class: 'fw-pad', type: 'button', disabled: true, onclick: () => press(i) });
      padEls.push(el); grid.append(el);
    }

    const total = time;
    const started = performance.now();
    const tick = setInterval(() => {
      if (done) return;
      const left = total - (performance.now() - started) / 1000;
      time = left;
      const pct = Math.max(0, left / total) * 100;
      bar.firstChild.style.width = pct + '%';
      bar.classList.toggle('low', pct < 30);
      status.textContent = `Round ${round}/${cfg.rounds}  ·  ${left.toFixed(1)}s`;
      if (left <= 2 && left > 1.95) sfx.tick();
      if (left <= 0) { finish(false, 'Timer expired — firewall held.'); }
    }, 80);

    function finish(ok, note) {
      if (done) return; done = true;
      clearInterval(tick);
      padEls.forEach(p => p.disabled = true);
      if (ok) sfx.success(); else sfx.fail();
      resolve({ success: ok, note });
    }

    async function flash(i, cls = 'lit') {
      padEls[i].classList.add(cls);
      sfx.key();
      await delay(Math.max(180, 420 - round * 20));
      padEls[i].classList.remove(cls);
      await delay(90);
    }

    async function playSeq() {
      accepting = false;
      padEls.forEach(p => p.disabled = true);
      status.textContent = `Round ${round + 1}/${cfg.rounds} — watch…`;
      await delay(400);
      for (const s of seq) { if (done) return; await flash(s); }
      if (done) return;
      accepting = true;
      input = [];
      padEls.forEach(p => p.disabled = false);
    }

    function press(i) {
      if (!accepting || done) return;
      input.push(i);
      padEls[i].classList.add('press');
      setTimeout(() => padEls[i].classList.remove('press'), 140);
      sfx.tap();
      const idx = input.length - 1;
      if (input[idx] !== seq[idx]) {
        detect.add(7, 'wrong firewall node');
        sfx.alarm();
        padEls[i].classList.add('err');
        setTimeout(() => padEls[i].classList.remove('err'), 300);
        // replay same round
        setTimeout(() => { if (!done) playSeq(); }, 350);
        return;
      }
      if (input.length === seq.length) {
        round++;
        if (round >= cfg.rounds) { finish(true, `Firewall bypassed with ${time.toFixed(1)}s to spare.`); return; }
        sfx.good();
        setTimeout(nextRound, 300);
      }
    }

    function nextRound() {
      if (done) return;
      seq.push(Math.floor(ctx.rng() * pads));
      playSeq();
    }

    footer.append(h('p', { class: 'mg-hint' }, 'The alarm only replays the round — wrong taps cost detection, not the run.'));
    nextRound();
  });
}

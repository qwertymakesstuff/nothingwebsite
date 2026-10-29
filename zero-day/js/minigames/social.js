// SOCIAL ENGINEERING — talk your way to access. Each line that references a fact you actually
// uncovered in recon lands cleanly; a right-sounding line you're only guessing at raises
// suspicion; a crude or obviously wrong line raises it a lot. Reason from your intel. Too much
// suspicion and they hang up.
import { frame, h, button, clear } from './util.js';

export function play(host, cfg, ctx) {
  return new Promise(resolve => {
    const { detect, sfx, op } = ctx;
    const known = new Set(op.knownClues.map(c => c.k));
    let step = 0, suspicion = 0, done = false;

    const { body, footer } = frame(host, {
      title: `Social Engineering — ${cfg.npc}`, tag: 'SOCIAL',
      how: 'Pick the reply that uses a fact you actually confirmed in recon. Bluffing works sometimes but raises suspicion; rude lines nearly always backfire.',
    });
    const meter = h('div', { class: 'soc-meter' }, h('span'));
    const label = h('p', { class: 'mg-status' });
    const convo = h('div', { class: 'soc-convo' });
    body.append(label, meter, convo);

    function drawMeter() {
      meter.firstChild.style.width = suspicion + '%';
      meter.classList.toggle('high', suspicion >= 60);
      label.textContent = `Suspicion: ${Math.round(suspicion)}%  ·  Step ${step + 1}/${cfg.steps.length}`;
    }

    function render() {
      clear(convo);
      const s = cfg.steps[step];
      convo.append(h('div', { class: 'soc-npc' }, s.prompt));
      const opts = h('div', { class: 'soc-opts' });
      // shuffle options so the "good" one isn't always first
      const order = s.options.map((o, i) => i).sort(() => ctx.rng() - 0.5);
      for (const oi of order) {
        const o = s.options[oi];
        opts.append(button(o.t, 'soc-opt', () => choose(o)));
      }
      convo.append(opts);
      drawMeter();
    }

    function choose(o) {
      if (done) return;
      let gain = 0, line = '';
      if (o.good && o.needs && known.has(o.needs)) { gain = 0; line = 'They relax — the detail checks out.'; sfx.good(); }
      else if (o.good && o.needs && !known.has(o.needs)) { gain = 18; line = 'Plausible, but you\'re guessing — they hesitate.'; sfx.tap(); }
      else if (o.good) { gain = 4; line = 'That lands, mostly.'; sfx.good(); }
      else if (o.rude) { gain = 40; line = 'Wrong move. They bristle.'; detect.add(5, 'social red flag'); sfx.bad(); }
      else { gain = 22; line = 'That rings false.'; sfx.bad(); }
      suspicion = Math.min(100, suspicion + gain);
      convo.append(h('div', { class: 'soc-you' }, '» ' + o.t), h('div', { class: 'soc-note' }, line));
      drawMeter();
      if (suspicion >= 100) { done = true; detect.add(8, 'blew the social pretext'); setTimeout(() => resolve({ success: false, note: `${cfg.npc} hung up.` }), 650); return; }
      step++;
      if (step >= cfg.steps.length) {
        done = true;
        const clean = suspicion < 40;
        if (clean) detect.add(-6, 'smooth pretext', true);
        sfx.success();
        setTimeout(() => resolve({ success: true, note: clean ? `${cfg.npc} handed over the access details, none the wiser.` : `${cfg.npc} coughed up access, but may report it later.` }), 650);
        return;
      }
      setTimeout(render, 700);
    }

    render();
  });
}

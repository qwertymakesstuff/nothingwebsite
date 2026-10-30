// DATA EXTRACTION — queue the files worth taking, then pull them. Your Data Vault caps how many
// GB you can stage. During transfer, every file still in flight radiates risk that steadily
// raises detection, so grabbing a few small high-value files is quieter than a giant haul.
// Stop any time: files already landed are yours to keep.
import { frame, h, button, clear } from './util.js';

export function play(host, cfg, ctx) {
  return new Promise(resolve => {
    const { detect, sfx } = ctx;
    const files = cfg.files;
    const storage = cfg.storage;
    const selected = new Set();
    let phase = 'select';

    const { body, footer } = frame(host, {
      title: 'Data Extraction', tag: 'EXTRACT',
      how: `Select files within your ${storage} GB vault, then transfer. In-flight files raise detection every second — land the risky ones first, then stop whenever you like.`,
    });
    const status = h('p', { class: 'mg-status' });
    const list = h('div', { class: 'ex-list' });
    body.append(status, list);

    const totals = () => {
      let gb = 0, val = 0, risk = 0;
      for (const f of files) if (selected.has(f.n)) { gb += f.g; val += f.v; risk += f.risk; }
      return { gb, val, risk };
    };

    function drawSelect() {
      const { gb, val, risk } = totals();
      status.innerHTML = `Vault: <b>${gb}/${storage} GB</b> · Value: <b>${val}</b> · Risk/s: <b>${(risk * 0.25).toFixed(1)}</b>`;
      clear(list);
      files.forEach(f => {
        const on = selected.has(f.n);
        const over = !on && totals().gb + f.g > storage;
        list.append(h('button', {
          class: 'ex-file' + (on ? ' on' : '') + (over ? ' over' : ''), type: 'button', disabled: over,
          onclick: () => { if (on) selected.delete(f.n); else selected.add(f.n); sfx.tap(); drawSelect(); },
        },
          h('span', { class: 'ex-check' }, on ? '☑' : '☐'),
          h('span', { class: 'ex-name' }, f.n, f.ev ? h('span', { class: 'ex-flag' }, ' ⚑') : null),
          h('span', { class: 'ex-meta' }, `${f.g}GB · val ${f.v} · risk ${f.risk}`),
        ));
      });
    }

    function startTransfer() {
      if (selected.size === 0) { ctx.toast('Select at least one file.'); sfx.bad(); return; }
      phase = 'transfer';
      clear(footer);
      const queue = files.filter(f => selected.has(f.n));
      const totalGb = queue.reduce((a, f) => a + f.g, 0);
      const perGbTime = Math.max(0.12, cfg.transferTime / Math.max(1, totalGb)); // seconds per GB
      const landed = [];
      let i = 0;
      let fileProgress = 0;
      let remainingRisk = queue.reduce((a, f) => a + f.risk, 0);

      clear(list);
      const bars = new Map();
      queue.forEach(f => {
        const bar = h('div', { class: 'ex-bar' }, h('span'));
        bars.set(f.n, bar);
        list.append(h('div', { class: 'ex-xfer' }, h('span', { class: 'ex-name' }, f.n), bar));
      });

      const stopBtn = button('Stop & secure landed', 'warn', stop);
      footer.append(stopBtn);

      const started = performance.now();
      let last = started;
      const iv = setInterval(() => {
        const now = performance.now();
        const dt = (now - last) / 1000; last = now;
        // detection from files still in flight
        detect.add(remainingRisk * 0.25 * dt, null, true);
        status.innerHTML = `Transferring… secured <b>${landed.length}/${queue.length}</b> · risk/s <b>${(remainingRisk * 0.25).toFixed(1)}</b>`;
        if (i < queue.length) {
          const f = queue[i];
          fileProgress += dt / (perGbTime * f.g);
          bars.get(f.n).firstChild.style.width = Math.min(100, fileProgress * 100) + '%';
          if (fileProgress >= 1) {
            landed.push(f.n);
            bars.get(f.n).classList.add('done');
            remainingRisk -= f.risk;
            sfx.good();
            i++; fileProgress = 0;
            if (i >= queue.length) { done(landed, true); }
          }
        }
      }, 60);

      function stop() { clearInterval(iv); done(landed, landed.length > 0); }
      function done(got, ok) {
        clearInterval(iv);
        commitExtracted(got);
        sfx[ok ? 'success' : 'bad']();
        resolve({ success: ok, note: ok ? `Pulled ${got.length} file(s).` : 'Nothing secured.', data: { extracted: got } });
      }
    }

    function commitExtracted(got) {
      ctx.op.extracted = ctx.op.extracted || [];
      for (const n of got) if (!ctx.op.extracted.includes(n)) ctx.op.extracted.push(n);
    }

    footer.append(button('Begin transfer →', 'primary', startTransfer));
    drawSelect();
  });
}

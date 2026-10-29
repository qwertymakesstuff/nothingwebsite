// The operation engine: sequences a target's stages, owns the detection meter and the trace
// countdown, applies consumables, and resolves with an outcome the game layer turns into rewards.
import { DETECT } from './config.js';
import { generateOp, SYMBOLS } from './generate.js';
import { seeded } from './rng.js';
import { h, clear, button, delay } from './minigames/util.js';
import * as recon from './minigames/recon.js';
import * as password from './minigames/password.js';
import * as netmap from './minigames/netmap.js';
import * as exploit from './minigames/exploit.js';
import * as firewall from './minigames/firewall.js';
import * as extract from './minigames/extract.js';
import * as logs from './minigames/logs.js';
import * as social from './minigames/social.js';

const GAMES = { recon, password, netmap, exploit, firewall, extract, logs, social };
const STAGE_LABEL = {
  recon: 'Recon', password: 'Password', netmap: 'Network', exploit: 'Exploit',
  firewall: 'Firewall', extract: 'Extract', logs: 'Logs', social: 'Social',
};

export function runOp(host, { target, contract }, env) {
  return new Promise(resolve => {
    const seed = target.id + '_' + Date.now() + '_' + Math.random();
    const op = generateOp(target, env.derived, seed);
    op.extracted = [];

    const prep = new Set(env.prep || []);
    const used = new Set();
    const hasPrep = id => prep.has(id) && !used.has(id);

    // ── Detection + trace ────────────────────────────────────────────────
    let detectVal = target.sec.startDetect;
    if (hasPrep('coldboot')) { detectVal = detectVal / 2; }
    let proxyArmed = hasPrep('proxy');
    let traceTimer = null, traceLeft = 0, traceTotal = 0, traceFrozen = false;
    let finished = false;

    const detect = {
      get: () => detectVal,
      add(amount, reason, silent) {
        if (finished) return;
        let amt = amount;
        if (amt > 0) {
          amt *= env.derived.detectMul;        // stealth upgrade
          if (proxyArmed) { amt *= 0.7; proxyArmed = false; env.toast('Bounce proxy softened that.'); }
        }
        detectVal = Math.max(0, Math.min(100, detectVal + amt));
        updateMeter();
        if (!silent && amt > 0 && reason) env.toast(`+${Math.round(amt)}% detection — ${reason}`, 'bad');
        if (reason && amt < 0 && !silent) env.toast(reason, 'good');
        if (detectVal >= DETECT.burned) bust('Detection maxed out.');
        else maybeTrace();
      },
    };

    function maybeTrace() {
      if (detectVal >= DETECT.hunted && !traceTimer && !finished) startTrace();
      if (detectVal < DETECT.hunted && traceTimer) stopTrace();
    }
    function startTrace() {
      if (hasPrep('tracescrub')) { used.add('tracescrub'); traceFrozen = true; env.toast('Trace scrubber engaged — trace frozen.', 'good'); }
      traceTotal = Math.max(18, (60 - target.sec.trace * 12)) * env.derived.timeFactor;
      traceLeft = traceTotal;
      traceBar.parentElement.hidden = false;
      let last = performance.now();
      traceTimer = setInterval(() => {
        if (finished) return;
        const now = performance.now(); const dt = (now - last) / 1000; last = now;
        if (!traceFrozen) traceLeft -= dt;
        const pct = Math.max(0, traceLeft / traceTotal) * 100;
        traceBar.style.width = pct + '%';
        traceLabel.textContent = `TRACE ${Math.max(0, traceLeft).toFixed(0)}s`;
        if (traceLeft <= 0) bust('The trace reached you.');
      }, 100);
    }
    function stopTrace() {
      clearInterval(traceTimer); traceTimer = null; traceFrozen = false;
      traceBar.parentElement.hidden = true;
    }

    // ── Chrome ───────────────────────────────────────────────────────────
    clear(host);
    const meter = h('div', { class: 'detect-fill' });
    const meterLabel = h('span', { class: 'detect-label' });
    const traceBar = h('span', { class: 'trace-fill' });
    const traceLabel = h('span', { class: 'trace-text' });
    const stagePills = h('div', { class: 'op-pills' });
    const mount = h('div', { class: 'op-mount' });

    const chrome = h('div', { class: 'op-view' },
      h('div', { class: 'op-top' },
        h('div', { class: 'op-id' },
          h('span', { class: 'op-name' }, target.name),
          h('span', { class: 'op-kind' }, `${target.kind} · Tier ${target.tier}`)),
        h('div', { class: 'op-detect' },
          h('div', { class: 'detect-bar' }, meter, meterLabel),
          h('div', { class: 'trace-wrap', hidden: true }, traceBar, traceLabel)),
        button('Abort', 'ghost abort-btn', () => confirmAbort()),
      ),
      stagePills,
      mount,
    );
    host.append(chrome);

    function updateMeter() {
      meter.style.width = detectVal + '%';
      meterLabel.textContent = `DETECTION ${Math.round(detectVal)}%`;
      meter.className = 'detect-fill' + (detectVal >= DETECT.hunted ? ' hunted' : detectVal >= DETECT.nervous ? ' nervous' : '');
    }
    updateMeter();

    function drawPills(activeIdx) {
      clear(stagePills);
      op.stages.forEach((st, i) => {
        stagePills.append(h('div', {
          class: 'op-pill' + (i < activeIdx ? ' done' : i === activeIdx ? ' active' : ''),
        }, `${i + 1}. ${STAGE_LABEL[st]}`));
      });
    }

    // ── Stage loop ───────────────────────────────────────────────────────
    let idx = 0;
    async function runStage() {
      if (finished) return;
      const stage = op.stages[idx];
      drawPills(idx);
      const stageRng = seeded(seed + '_' + stage + '_' + idx + '_' + Math.random());
      const ctx = {
        op, derived: env.derived, detect, sfx: env.sfx, rng: stageRng,
        hasPrep: id => { const ok = hasPrep(id); return ok; },
        toast: (m, k) => env.toast(m, k),
      };
      let result;
      try { result = await GAMES[stage].play(mount, op.cfg[stage], ctx); }
      catch (e) { console.error(e); result = { success: false, note: 'Stage crashed.' }; }
      if (finished) return;

      if (result.success) {
        idx++;
        if (idx >= op.stages.length) return succeed();
        await stageTransition(result.note, true);
        if (!finished) runStage();
      } else {
        await stageFailed(stage, result.note);
      }
    }

    function stageTransition(note, ok) {
      return new Promise(res => {
        clear(mount);
        mount.append(h('div', { class: 'op-interstitial ok' },
          h('div', { class: 'op-big' }, '✓ STAGE CLEARED'),
          note ? h('p', {}, note) : null,
          button('Continue →', 'primary', () => res()),
        ));
        env.sfx.good();
      });
    }

    function stageFailed(stage, note) {
      return new Promise(res => {
        clear(mount);
        const canContinue = detectVal < DETECT.burned;
        mount.append(h('div', { class: 'op-interstitial bad' },
          h('div', { class: 'op-big' }, '✕ STAGE FAILED'),
          note ? h('p', {}, note) : null,
          h('p', { class: 'muted' }, canContinue ? 'Retrying raises detection. Or abort and leave with what you have.' : 'Detection is critical — you must abort.'),
          h('div', { class: 'op-actions' },
            canContinue ? button('Retry stage (+8% detect)', 'warn', () => {
              detect.add(8, 'forced retry');
              // regenerate just this stage so it isn't memorised
              const fresh = generateOp(target, env.derived, seed + '_retry_' + idx + '_' + Math.random());
              op.cfg[stage] = fresh.cfg[stage];
              res(); if (!finished) runStage();
            }) : null,
            button('Abort operation', 'ghost', () => { res(); abort(); }),
          ),
        ));
        env.sfx.fail();
      });
    }

    function confirmAbort() {
      clear(mount);
      mount.append(h('div', { class: 'op-interstitial' },
        h('div', { class: 'op-big' }, 'Abort operation?'),
        h('p', { class: 'muted' }, 'You keep any files already extracted but forfeit the contract payout.'),
        h('div', { class: 'op-actions' },
          button('Yes, pull out', 'warn', () => abort()),
          button('Stay in', 'primary', () => runStage()),
        ),
      ));
    }

    function finish(outcome) {
      if (finished) return; finished = true;
      if (traceTimer) clearInterval(traceTimer);
      for (const id of prep) used.add(id); // all staged consumables are spent
      outcome.detect = detectVal;
      outcome.extracted = op.extracted.slice();
      outcome.usedWipe = prep.has('wipe');
      resolve(outcome);
    }
    function succeed() { env.sfx.success(); finish({ status: 'success' }); }
    function abort() { env.sfx.fail(); finish({ status: 'aborted' }); }
    function bust(reason) {
      if (finished) return;
      clear(mount);
      mount.append(h('div', { class: 'op-interstitial busted' },
        h('div', { class: 'op-big' }, '⚠ BURNED'),
        h('p', {}, reason),
        h('p', { class: 'muted' }, 'Security locked you out mid-operation.'),
        button('Face the consequences →', 'warn', () => finish({ status: 'busted', reason })),
      ));
      env.sfx.fail();
    }

    // Briefing then go.
    briefing();
    function briefing() {
      clear(mount);
      const loot = target.loot.map(l => h('li', {}, `${l.n} — val ${l.v}, ${l.g}GB, risk ${l.risk}${l.ev ? ' ⚑' : ''}`));
      mount.append(h('div', { class: 'op-brief' },
        h('p', { class: 'muted' }, target.blurb),
        contract ? h('div', { class: 'op-objective' },
          h('p', {}, h('b', {}, 'Objective: '), contract.objective.label),
          contract.bonus ? h('p', { class: 'bonus' }, h('b', {}, 'Bonus: '), contract.bonus.label) : null,
        ) : null,
        h('p', { class: 'op-stages-line' }, 'Stages: ' + op.stages.map(s => STAGE_LABEL[s]).join(' → ')),
        h('details', {}, h('summary', {}, 'Potential loot'), h('ul', { class: 'op-loot' }, ...loot)),
        prep.size ? h('p', { class: 'op-prep' }, 'Staged: ' + [...prep].join(', ')) : null,
        button('Begin operation →', 'primary', () => runStage()),
      ));
    }
  });
}

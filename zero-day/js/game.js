// The desktop shell for ZERO DAY: navigation, all screens, reward logic and the results flow.
import {
  getState, save, saveSoon, wipe, derived, repTier, addXp, addMoney, addRep,
  addEvidence, markCleared, pushInbox, xpProgress, unread,
} from './state.js';
import { CUR, DETECT, TIER_GATE, REP_TIERS } from './config.js';
import { TARGETS, TIERS, TARGET_BY_ID } from './targets.js';
import { refreshBoard } from './contracts.js';
import { UPGRADES, UPGRADE_BY_ID, CONSUMABLES, CONSUMABLE_BY_ID, upgradeCost, money } from './shop.js';
import { pollStory } from './story.js';
import { runOp } from './op.js';
import { sfx, setEnabled } from './audio.js';
import { h, clear, button } from './minigames/util.js';

let root, tab = 'home';

export function startGame(mount) {
  root = mount;
  const s = getState();
  setEnabled(s.settings.sound);
  document.getElementById('scanlines').style.display = s.settings.scanlines ? '' : 'none';
  if (s.settings.reduceMotion) document.body.classList.add('reduce-motion');
  if (!s.board || !s.board.length) s.board = refreshBoard(s);
  checkStory();
  render();
}

// ── Toasts ────────────────────────────────────────────────────────────────
export function toast(msg, kind = '') {
  const host = document.getElementById('toasts');
  const t = h('div', { class: 'toast ' + kind }, msg);
  host.append(t);
  setTimeout(() => t.classList.add('in'), 10);
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2600);
}

// ── Story polling ───────────────────────────────────────────────────────────
function checkStory() {
  const s = getState();
  const beats = pollStory(s);
  for (const b of beats) { pushInbox(b); }
  if (beats.length) { toast(`${beats.length} new message(s) in your inbox`, 'good'); save(); }
}

// ── Navigation ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'home', label: 'Terminal', icon: '▸' },
  { id: 'contracts', label: 'Contracts', icon: '≡' },
  { id: 'targets', label: 'Targets', icon: '◎' },
  { id: 'shop', label: 'Shop', icon: '$' },
  { id: 'inbox', label: 'Inbox', icon: '✉' },
  { id: 'stats', label: 'Stats', icon: '▤' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

function render() {
  const s = getState();
  clear(root);
  const d = derived(s);
  const xp = xpProgress(s);

  const topbar = h('header', { class: 'zd-top' },
    h('div', { class: 'zd-brand' }, h('span', { class: 'zd-logo' }, 'ZERO'), h('span', { class: 'zd-logo accent' }, 'DAY')),
    h('div', { class: 'zd-stats' },
      stat('WALLET', money(s.money)),
      stat('LEVEL', String(s.level), `${xp.have}/${xp.need} XP`),
      stat('REP', String(s.rep), repTier(s).name),
      stat('DETECT AVG', s.stats.hacks ? Math.round((s.stats.detected / Math.max(1, s.stats.hacks)) || 0) + '%' : '—'),
    ),
  );
  const xpbar = h('div', { class: 'zd-xpbar' }, h('span', { style: { width: xp.pct + '%' } }));

  const nav = h('nav', { class: 'zd-nav' },
    ...TABS.map(t => {
      const b = h('button', { class: 'zd-navbtn' + (tab === t.id ? ' active' : ''), type: 'button', onclick: () => { tab = t.id; sfx.tap(); render(); } },
        h('span', { class: 'nav-ic' }, t.icon), h('span', {}, t.label));
      if (t.id === 'inbox' && unread(s)) b.append(h('span', { class: 'badge' }, String(unread(s))));
      return b;
    }),
  );

  const screen = h('div', { class: 'zd-screen' });
  root.append(topbar, xpbar, h('div', { class: 'zd-body' }, nav, screen));

  ({ home: scrHome, contracts: scrContracts, targets: scrTargets, shop: scrShop, inbox: scrInbox, stats: scrStats, settings: scrSettings })[tab](screen);
}

function stat(label, val, sub) {
  return h('div', { class: 'zd-stat' }, h('span', { class: 'zd-stat-l' }, label), h('span', { class: 'zd-stat-v' }, val), sub ? h('span', { class: 'zd-stat-s' }, sub) : null);
}

// ── Screen: Terminal / home ───────────────────────────────────────────────
function scrHome(screen) {
  const s = getState();
  const tierName = repTier(s).name;
  const latest = s.inbox[0];
  const recommended = s.board.filter(c => canLaunch(s, c.targetId)).slice(0, 3);

  screen.append(
    h('div', { class: 'panel term-panel' },
      h('pre', { class: 'term-out' }, bootLines(s).join('\n')),
    ),
    h('div', { class: 'grid-2' },
      h('div', { class: 'panel' },
        h('h3', {}, 'Next moves'),
        recommended.length ? h('div', { class: 'mini-contracts' },
          ...recommended.map(c => h('button', { class: 'mini-contract', type: 'button', onclick: () => briefContract(c) },
            h('span', { class: 'mc-tier', style: { color: TIERS[c.tier].color } }, 'T' + c.tier),
            h('span', { class: 'mc-title' }, c.title),
            h('span', { class: 'mc-pay' }, money(c.reward)),
          )),
        ) : h('p', { class: 'muted' }, 'No contracts match your clearance. Raise reputation or level up.'),
        button('Open contract board →', 'ghost', () => { tab = 'contracts'; render(); }),
      ),
      h('div', { class: 'panel' },
        h('h3', {}, 'Latest transmission'),
        latest ? h('div', { class: 'home-mail' },
          h('p', { class: 'hm-from' }, latest.from, h('span', { class: 'hm-subj' }, ' — ' + latest.subj)),
          h('p', { class: 'hm-body' }, latest.body.split('\n')[0]),
          button('Read inbox →', 'ghost', () => { tab = 'inbox'; render(); }),
        ) : h('p', { class: 'muted' }, 'No messages yet.'),
      ),
    ),
  );
}

function bootLines(s) {
  return [
    `operator@zeroday:~$ whoami`,
    `  handle    : operator_${String(s.stats.hacks).padStart(3, '0')}`,
    `  clearance : ${repTier(s).name} (tier ${repTier(s).tier})`,
    `  rig       : CPU x${1 + s.upgrades.cpu} · crack x${1 + s.upgrades.crack} · stealth x${1 + s.upgrades.stealth}`,
    `  vault     : ${derived(s).storage} GB · prep slots: ${derived(s).prepSlots}`,
    `  record    : ${s.stats.hacks} clean / ${s.stats.fails} failed / ${s.stats.detected} burned`,
    `operator@zeroday:~$ _`,
  ];
}

// ── Screen: Contracts ───────────────────────────────────────────────────────
function scrContracts(screen) {
  const s = getState();
  screen.append(h('div', { class: 'scr-head' },
    h('h2', {}, 'Contract Board'),
    button('↻ Refresh board', 'ghost', () => { s.boardSeed = Math.floor(Math.random() * 1e9); s.board = refreshBoard(s); save(); render(); }),
  ));
  const list = h('div', { class: 'contract-list' });
  for (const c of s.board) {
    const unlocked = canLaunch(s, c.targetId);
    const t = TARGET_BY_ID[c.targetId];
    const cd = cooldownLeft(s, c.targetId);
    list.append(h('div', { class: 'contract-card' + (c.finale ? ' finale' : '') + (unlocked ? '' : ' locked') },
      h('div', { class: 'cc-top' },
        h('span', { class: 'cc-tier', style: { background: TIERS[c.tier].color + '22', color: TIERS[c.tier].color } }, `TIER ${c.tier} · ${TIERS[c.tier].name}`),
        h('span', { class: 'cc-client' }, 'client: ' + c.client),
      ),
      h('h3', { class: 'cc-title' }, c.title),
      h('p', { class: 'cc-desc' }, c.desc),
      h('div', { class: 'cc-obj' }, h('span', {}, '◉ ' + c.objective.label), c.bonus ? h('span', { class: 'cc-bonus' }, '★ ' + c.bonus.label + ` (+${money(c.bonus.pay)})`) : null),
      h('div', { class: 'cc-foot' },
        h('div', { class: 'cc-rewards' },
          h('span', { class: 'cc-pay' }, money(c.reward)),
          h('span', {}, `${c.xp} XP`), h('span', {}, `+${c.rep} rep`),
        ),
        cd > 0
          ? h('span', { class: 'cc-locked' }, `target cooling down (${cd} op${cd > 1 ? 's' : ''})`)
          : unlocked
            ? button('Launch →', 'primary', () => briefContract(c))
            : h('span', { class: 'cc-locked' }, lockReason(s, c.tier)),
      ),
    ));
  }
  screen.append(list);
}

function lockReason(s, tier) {
  const g = TIER_GATE[tier];
  const need = [];
  if (s.level < g.level) need.push(`Lvl ${g.level}`);
  if (s.rep < g.rep) need.push(`${g.rep} rep`);
  return 'needs ' + need.join(' + ');
}

// ── Screen: Targets ─────────────────────────────────────────────────────────
function scrTargets(screen) {
  const s = getState();
  screen.append(h('div', { class: 'scr-head' }, h('h2', {}, 'Target Directory'), h('p', { class: 'muted' }, 'Freelance any unlocked target (lower pay, no objective), or take a contract for the full reward.')));
  for (let tier = 1; tier <= 5; tier++) {
    const list = TARGETS.filter(t => t.tier === tier);
    const unlocked = tierUnlocked(s, tier);
    const grid = h('div', { class: 'target-grid' });
    for (const t of list) {
      const cleared = s.cleared.includes(t.id);
      const cd = cooldownLeft(s, t.id);
      grid.append(h('div', { class: 'target-card' + (unlocked ? '' : ' locked') },
        h('div', { class: 'tc-top' },
          h('span', { class: 'tc-name' }, t.name),
          h('span', { class: 'tc-diff' }, '◆'.repeat(t.diff) + '◇'.repeat(5 - t.diff)),
        ),
        h('span', { class: 'tc-kind' }, t.kind),
        h('p', { class: 'tc-blurb' }, t.blurb),
        h('div', { class: 'tc-tags' }, ...t.stages.map(st => h('span', { class: 'tc-tag' }, st))),
        h('div', { class: 'tc-foot' },
          h('span', { class: 'tc-reward' }, money(Math.round(t.reward * 0.6)), ' freelance'),
          cleared ? h('span', { class: 'tc-done' }, '✓ cleared') : null,
          cd > 0 ? h('span', { class: 'cc-locked' }, `cooldown ${cd}`)
            : unlocked ? button('Freelance', 'ghost', () => briefContract(null, t)) : h('span', { class: 'cc-locked' }, lockReason(s, tier)),
        ),
      ));
    }
    screen.append(h('div', { class: 'tier-block' },
      h('h3', { class: 'tier-head', style: { color: TIERS[tier].color } }, `Tier ${tier} — ${TIERS[tier].name}`, unlocked ? null : h('span', { class: 'tier-lock' }, ' 🔒 ' + lockReason(s, tier))),
      grid,
    ));
  }
}

// ── Screen: Shop ────────────────────────────────────────────────────────────
function scrShop(screen) {
  const s = getState();
  const d = derived(s);
  screen.append(h('div', { class: 'scr-head' }, h('h2', {}, 'Rig & Marketplace'), h('p', { class: 'muted' }, 'Wallet: ' + money(s.money))));

  // Upgrades
  const ug = h('div', { class: 'shop-grid' });
  for (const u of UPGRADES) {
    const lvl = s.upgrades[u.id];
    const cost = upgradeCost(u.id, lvl);
    ug.append(h('div', { class: 'shop-card' },
      h('div', { class: 'sc-top' }, h('span', { class: 'sc-name' }, u.name), h('span', { class: 'sc-lvl' }, `Lv ${lvl}/${u.max}`)),
      h('p', { class: 'sc-desc' }, u.desc),
      h('p', { class: 'sc-per' }, u.per),
      h('div', { class: 'sc-pips' }, ...Array.from({ length: u.max }, (_, i) => h('span', { class: 'pip' + (i < lvl ? ' on' : '') }))),
      cost == null ? h('span', { class: 'sc-max' }, 'MAX') :
        button(`Upgrade · ${money(cost)}`, 'primary' + (s.money < cost ? ' disabled' : ''), () => {
          if (s.money < cost) { toast('Not enough credits.', 'bad'); sfx.bad(); return; }
          addMoney(-cost); s.upgrades[u.id]++; sfx.cash(); toast(`${u.name} → Lv ${s.upgrades[u.id]}`, 'good'); save(); render();
        }),
    ));
  }
  screen.append(h('div', { class: 'panel' }, h('h3', {}, 'Hardware & Software'), ug));

  // Marketplace consumables
  const mg = h('div', { class: 'shop-grid' });
  for (const c of CONSUMABLES) {
    const owned = s.inventory[c.id] || 0;
    mg.append(h('div', { class: 'shop-card' },
      h('div', { class: 'sc-top' }, h('span', { class: 'sc-name' }, c.name), h('span', { class: 'sc-lvl' }, `×${owned}`)),
      h('p', { class: 'sc-desc' }, c.desc),
      button(`Buy · ${money(c.price)}`, 'primary' + (s.money < c.price ? ' disabled' : ''), () => {
        if (s.money < c.price) { toast('Not enough credits.', 'bad'); sfx.bad(); return; }
        addMoney(-c.price); s.inventory[c.id] = owned + 1; sfx.cash(); save(); render();
      }),
    ));
  }
  screen.append(h('div', { class: 'panel' }, h('h3', {}, 'Underground Marketplace'), h('p', { class: 'muted' }, 'One-shot kits. Stage them before an operation (below).'), mg));

  // Prep staging
  const prepBox = h('div', { class: 'prep-box' });
  renderPrep(prepBox);
  screen.append(h('div', { class: 'panel' }, h('h3', {}, `Prep Bench — ${s.prep.length}/${d.prepSlots} staged`), h('p', { class: 'muted' }, 'Staged kits are consumed on your next operation.'), prepBox));
}

function renderPrep(box) {
  const s = getState(); const d = derived(s);
  clear(box);
  const staged = h('div', { class: 'prep-staged' });
  if (!s.prep.length) staged.append(h('span', { class: 'muted' }, 'Nothing staged.'));
  s.prep.forEach((id, i) => staged.append(h('button', { class: 'prep-chip', type: 'button', title: 'unstage', onclick: () => { s.prep.splice(i, 1); save(); renderPrep(box); } }, CONSUMABLE_BY_ID[id].name, ' ✕')));
  const avail = h('div', { class: 'prep-avail' });
  for (const c of CONSUMABLES) {
    const owned = s.inventory[c.id] || 0;
    const stagedCount = s.prep.filter(x => x === c.id).length;
    const canStage = owned - stagedCount > 0 && s.prep.length < d.prepSlots;
    avail.append(h('button', { class: 'prep-add' + (canStage ? '' : ' disabled'), type: 'button', onclick: () => { if (!canStage) return; s.prep.push(c.id); sfx.tap(); save(); renderPrep(box); } },
      `+ ${c.name} (${owned - stagedCount})`));
  }
  box.append(staged, avail);
}

// ── Screen: Inbox ───────────────────────────────────────────────────────────
function scrInbox(screen) {
  const s = getState();
  screen.append(h('div', { class: 'scr-head' }, h('h2', {}, 'Inbox')));
  if (!s.inbox.length) { screen.append(h('p', { class: 'muted' }, 'Empty.')); return; }
  const list = h('div', { class: 'mail-list' });
  for (const m of s.inbox) {
    const item = h('details', { class: 'mail' + (m.read ? '' : ' unread'), onclick: () => { if (!m.read) { m.read = true; saveSoon(); setTimeout(render, 50); } } },
      h('summary', {},
        h('span', { class: 'mail-from' }, m.from),
        h('span', { class: 'mail-subj' }, m.subj),
        m.read ? null : h('span', { class: 'mail-dot' }),
      ),
      h('pre', { class: 'mail-body' }, m.body),
    );
    list.append(item);
  }
  screen.append(list);
}

// ── Screen: Stats ───────────────────────────────────────────────────────────
function scrStats(screen) {
  const s = getState();
  const st = s.stats;
  screen.append(h('div', { class: 'scr-head' }, h('h2', {}, 'Statistics')));
  screen.append(h('div', { class: 'stat-grid' },
    bigStat('Successful hacks', st.hacks),
    bigStat('Failed operations', st.fails),
    bigStat('Times burned', st.detected),
    bigStat('Aborted', st.aborts),
    bigStat('Clean (silent) runs', st.cleanRuns),
    bigStat('Total earned', money(st.earned)),
    bigStat('Total spent', money(st.spent)),
    bigStat('Targets cleared', s.cleared.filter(c => TARGET_BY_ID[c]).length + '/' + TARGETS.length),
  ));
  // evidence
  const evKeys = Object.keys(s.evidence);
  if (evKeys.length) {
    screen.append(h('div', { class: 'panel' }, h('h3', {}, 'Evidence collected'),
      h('div', { class: 'ev-tags' }, ...evKeys.map(k => h('span', { class: 'ev-tag' }, `${k} ×${s.evidence[k]}`)))));
  }
  // history
  screen.append(h('div', { class: 'panel' }, h('h3', {}, 'Mission history'),
    s.history.length
      ? h('div', { class: 'hist-list' }, ...s.history.slice(0, 20).map(hst => h('div', { class: 'hist-row ' + hst.status },
        h('span', { class: 'hist-name' }, hst.target),
        h('span', { class: 'hist-status' }, hst.status),
        h('span', { class: 'hist-pay' }, (hst.money >= 0 ? '+' : '') + money(hst.money)),
        h('span', { class: 'hist-det' }, Math.round(hst.detect) + '%'),
      )))
      : h('p', { class: 'muted' }, 'No operations yet.')));
}
function bigStat(label, val) { return h('div', { class: 'big-stat' }, h('span', { class: 'bs-v' }, String(val)), h('span', { class: 'bs-l' }, label)); }

// ── Screen: Settings ────────────────────────────────────────────────────────
function scrSettings(screen) {
  const s = getState();
  screen.append(h('div', { class: 'scr-head' }, h('h2', {}, 'Settings')));
  const box = h('div', { class: 'panel settings-box' },
    toggle('Sound effects', s.settings.sound, v => { s.settings.sound = v; setEnabled(v); save(); }),
    toggle('Scanlines / CRT', s.settings.scanlines, v => { s.settings.scanlines = v; document.getElementById('scanlines').style.display = v ? '' : 'none'; save(); }),
    toggle('Reduce motion', s.settings.reduceMotion, v => { s.settings.reduceMotion = v; document.body.classList.toggle('reduce-motion', v); save(); }),
  );
  screen.append(box);
  screen.append(h('div', { class: 'panel danger' },
    h('h3', {}, 'Danger zone'),
    h('p', { class: 'muted' }, 'Wipes all progress on this device. Cannot be undone.'),
    button('Erase save & restart', 'warn', () => {
      if (confirm('Erase all ZERO DAY progress on this device?')) { wipe(); tab = 'home'; startGame(root); toast('Save erased.', 'bad'); }
    }),
  ));
  screen.append(h('p', { class: 'muted foot-note' }, 'ZERO DAY is a work of fiction. Every "system", target and technique here is an invented puzzle. Nothing connects to real computers, networks or accounts.'));
}
function toggle(label, val, onChange) {
  const input = h('input', { type: 'checkbox', onchange: e => onChange(e.target.checked) });
  input.checked = val;
  return h('label', { class: 'zd-toggle' }, input, h('span', {}, label));
}

// ── Unlock / cooldown helpers ─────────────────────────────────────────────
function tierUnlocked(s, tier) { const g = TIER_GATE[tier]; return s.rep >= g.rep && s.level >= g.level; }
function canLaunch(s, targetId) { const t = TARGET_BY_ID[targetId]; return t && tierUnlocked(s, t.tier) && cooldownLeft(s, targetId) === 0; }
function cooldownLeft(s, targetId) { return (s.cooldowns && s.cooldowns[targetId]) || 0; }

// ── Launch an operation ─────────────────────────────────────────────────────
function briefContract(contract, targetOverride) {
  const s = getState();
  const target = targetOverride || TARGET_BY_ID[contract.targetId];
  s.activeContract = contract || null;
  const app = root;
  clear(app);
  const opHost = h('div', { class: 'op-host' });
  app.append(opHost);
  sfx.reveal();

  runOp(opHost, { target, contract }, {
    derived: derived(s), sfx, toast,
    prep: s.prep.slice(),
  }).then(outcome => {
    // consume staged prep
    for (const id of s.prep) if ((s.inventory[id] || 0) > 0) s.inventory[id]--;
    s.prep = [];
    applyOutcome(contract, target, outcome);
  });
}

// ── Rewards & consequences ──────────────────────────────────────────────────
function applyOutcome(contract, target, outcome) {
  const s = getState();
  const result = { lines: [], money: 0, xp: 0, rep: 0, status: outcome.status, leveled: 0 };
  const base = contract ? contract.reward : Math.round(target.reward * 0.6);
  const baseXp = contract ? contract.xp : target.xp;
  const baseRep = contract ? contract.rep : target.rep;
  const extracted = outcome.extracted || [];
  const lootValue = target.loot.filter(l => extracted.includes(l.n)).reduce((a, l) => a + l.v, 0);

  // Evidence tags from any flagged file pulled.
  for (const l of target.loot) if (extracted.includes(l.n) && l.ev) addEvidence(l.ev);

  if (outcome.status === 'success') {
    s.stats.hacks++;
    markCleared(target.id);
    if (contract) markCleared(contract.id + ':done');

    // Objective evaluation.
    let objMet = true;
    if (contract) {
      const o = contract.objective;
      if (o.kind === 'grab') objMet = extracted.includes(o.file);
      else if (o.kind === 'evidence' || o.anyEvidence) objMet = target.loot.some(l => extracted.includes(l.n) && l.ev);
      else if (o.kind === 'stealth') objMet = outcome.detect <= o.maxDetect;
      else objMet = true;
    }
    const payFactor = objMet ? 1 : 0.4;
    result.money += Math.round(base * payFactor);
    result.xp += Math.round(baseXp * (objMet ? 1 : 0.5));
    result.rep += Math.round(baseRep * (objMet ? 1 : 0.4));
    result.lines.push(objMet ? '◉ Objective met.' : '◉ Objective missed — partial pay.');

    // Loot resale (fence) value.
    const fence = Math.round(lootValue * 0.5);
    if (fence) { result.money += fence; result.lines.push(`⚑ Fenced ${extracted.length} file(s) for ${money(fence)}.`); }

    // Bonus objective.
    if (contract && contract.bonus) {
      let bMet = false;
      if (contract.bonus.kind === 'stealth') bMet = outcome.detect <= contract.bonus.maxDetect;
      else if (contract.bonus.kind === 'fullHaul') bMet = target.loot.every(l => extracted.includes(l.n));
      else if (contract.bonus.kind === 'extraEvidence') bMet = target.loot.some(l => extracted.includes(l.n) && l.ev);
      if (bMet) { result.money += contract.bonus.pay; result.rep += 8; result.lines.push(`★ Bonus met (+${money(contract.bonus.pay)}, +8 rep).`); }
    }

    // Clean / silent run.
    if (outcome.detect < 15) { s.stats.cleanRuns++; result.rep += 6; result.lines.push('👻 Silent run (+6 rep).'); }

    s.stats.detected += outcome.detect;
    sfx.cash();
  } else if (outcome.status === 'aborted') {
    s.stats.aborts++;
    s.stats.fails++;
    const fence = Math.round(lootValue * 0.4);
    if (fence) { result.money += fence; result.lines.push(`Salvaged ${money(fence)} from files pulled before aborting.`); }
    result.lines.push('Operation aborted — no contract payout.');
    s.stats.detected += outcome.detect;
  } else { // busted
    s.stats.fails++;
    s.stats.detected += outcome.detect;
    const fine = Math.min(s.money, Math.round(base * 0.35 * (1 + target.tier * 0.15)));
    result.money -= fine;
    result.lines.push(`⚠ Burned. Fine of ${money(fine)} and the contract is void.`);
    if (outcome.usedWipe) { result.lines.push('🔥 Panic Wipe absorbed the reputation hit.'); }
    else { const rl = target.tier * 4; result.rep -= rl; result.lines.push(`Reputation −${rl}.`); }
    // Target cooldown.
    s.cooldowns = s.cooldowns || {};
    s.cooldowns[target.id] = 2;
    result.lines.push(`${target.name} is now watching for you (cooldown: 2 operations).`);
  }

  // Apply.
  addMoney(result.money);
  result.leveled = addXp(result.xp);
  addRep(result.rep);

  // Decrement cooldowns on every completed op (except the one just set).
  if (s.cooldowns) for (const k of Object.keys(s.cooldowns)) { if (k !== target.id || outcome.status !== 'busted') s.cooldowns[k] = Math.max(0, s.cooldowns[k] - 1); if (s.cooldowns[k] === 0) delete s.cooldowns[k]; }

  // History.
  s.history.unshift({ target: target.name, status: outcome.status, money: result.money, detect: outcome.detect, ts: Date.now() });
  if (s.history.length > 60) s.history.length = 60;

  s.activeContract = null;
  s.board = refreshBoard(s);
  checkStory();
  save();
  showResults(target, contract, outcome, result);
}

// ── Results screen ──────────────────────────────────────────────────────────
function showResults(target, contract, outcome, result) {
  const s = getState();
  clear(root);
  const statusLabel = { success: 'OPERATION COMPLETE', aborted: 'OPERATION ABORTED', busted: 'OPERATION BURNED' }[outcome.status];
  const panel = h('div', { class: 'results results-' + outcome.status },
    h('div', { class: 'res-head' }, h('h1', {}, statusLabel), h('p', { class: 'muted' }, target.name)),
    h('div', { class: 'res-grid' },
      resLine('Payout', (result.money >= 0 ? '+' : '') + money(result.money)),
      resLine('XP', '+' + result.xp),
      resLine('Reputation', (result.rep >= 0 ? '+' : '') + result.rep),
      resLine('Final detection', Math.round(outcome.detect) + '%'),
      resLine('Files extracted', (outcome.extracted || []).length),
    ),
    result.leveled ? h('div', { class: 'res-levelup' }, `▲ LEVEL UP — now level ${s.level}!`) : null,
    h('ul', { class: 'res-notes' }, ...result.lines.map(l => h('li', {}, l))),
    (outcome.extracted && outcome.extracted.length) ? h('details', { class: 'res-files' }, h('summary', {}, 'Extracted files'), h('ul', {}, ...outcome.extracted.map(f => h('li', {}, f)))) : null,
    button('Back to terminal →', 'primary', () => { tab = 'home'; startGame(root); }),
  );
  if (result.leveled) sfx.level();
  root.append(panel);
}
function resLine(l, v) { return h('div', { class: 'res-cell' }, h('span', { class: 'rc-l' }, l), h('span', { class: 'rc-v' }, String(v))); }

// Turns a target into a concrete, solvable operation: the ordered stages plus the data each
// minigame needs, all derived from a seed so a given op is reproducible. Difficulty comes from
// the target's security profile and tier (more layers, tighter timers, more traps), not inflated
// numbers. Player upgrades (derived stats) loosen timers, add hints and reveal traps.
import { seeded, rngInt, rngPick, rngShuffle, rngSample } from './rng.js';

export const SYMBOLS = ['▲', '◆', '●', '■', '✦', '⬟', '⬢', '✚'];

// Recon clue pool, themed loosely by persona. Some clues feed the password game (credential),
// some feed social engineering (fact), some are flavor/noise.
function buildClues(target, rng) {
  const p = target.persona;
  const nameFirst = p.name.replace(/^[^:]+:\s*/, '').split(' ')[0];
  const clues = [
    { kind: 'fact', k: 'pet', label: `Pet / handle: "${p.pet}"`, val: p.pet },
    { kind: 'fact', k: 'year', label: `Significant year: ${p.year}`, val: String(p.year) },
    { kind: 'fact', k: 'team', label: `Affiliation: ${p.team}`, val: p.team },
    { kind: 'fact', k: 'name', label: `Goes by: ${nameFirst}`, val: nameFirst },
    { kind: 'flavor', label: `Open service: port ${rngInt(rng, 20, 9000)} (${rngPick(rng, ['legacy ftp', 'print spool', 'smart-home hub', 'backup daemon', 'chat relay', 'remote desktop'])})` },
    { kind: 'flavor', label: `Reused email on ${rngInt(rng, 2, 7)} breached lists (fictional)` },
    { kind: 'flavor', label: `Last seen online: ${rngInt(rng, 1, 59)} min ago` },
  ];
  return rngShuffle(rng, clues);
}

// Password / credential puzzle = Mastermind over a short code. Recon "credential" clues and the
// cracking suite pre-reveal positions, keeping it fair as codes get longer at higher tiers.
function buildPassword(target, rng, derived) {
  const codeLen = Math.min(5, 3 + Math.floor(target.tier / 2));   // 3..5
  const palette = SYMBOLS.slice(0, Math.min(8, 4 + target.tier)); // 5..8 symbols
  const secret = Array.from({ length: codeLen }, () => rngPick(rng, palette));
  const attempts = Math.max(5, 9 - target.tier) + (derived ? Math.min(2, derived.hintTier - 1) : 0);
  // Pre-revealed positions: more with higher crack tier, fewer at higher target tiers.
  const freebies = Math.max(0, (derived ? derived.hintTier - 1 : 0) - Math.max(0, target.tier - 2));
  const revealPositions = rngSample(rng, secret.map((_, i) => i), Math.min(codeLen - 1, freebies));
  return { codeLen, palette, secret, attempts, revealPositions };
}

// Network map: a grid with an entry and a goal; some nodes are monitored traps. Net Analyzer
// pre-reveals a few. Higher tiers = bigger grid, more traps.
function buildNetmap(target, rng, derived) {
  const size = Math.min(7, 4 + Math.floor(target.tier / 1.5)); // 4..7
  const cells = size * size;
  const entry = 0;
  const goal = cells - 1;
  const trapCount = Math.round(cells * (0.14 + target.tier * 0.03));
  const candidates = [];
  for (let i = 0; i < cells; i++) if (i !== entry && i !== goal) candidates.push(i);
  const traps = new Set(rngSample(rng, candidates, Math.min(trapCount, candidates.length - size)));
  // Guarantee at least one trap-free path exists: carve a simple L-path and clear it.
  const path = new Set();
  let r = 0, c = 0;
  path.add(0);
  while (c < size - 1) { c++; path.add(r * size + c); }
  while (r < size - 1) { r++; path.add(r * size + c); }
  for (const idx of path) traps.delete(idx);
  const revealed = new Set(rngSample(rng, [...traps], Math.min(traps.size, derived ? derived.netReveal : 0)));
  return { size, entry, goal, traps: [...traps], revealed: [...revealed] };
}

// Exploit matching: match vulnerability cards to system cards sharing a compatible tag.
function buildExploit(target, rng) {
  const tags = ['buffer', 'auth', 'inject', 'crypto', 'race', 'config', 'memory', 'parser'];
  const n = Math.min(6, 2 + target.tier);
  const chosen = rngSample(rng, tags, n);
  const systems = chosen.map((t, i) => ({ id: 'sys' + i, name: SYS_NAMES[i % SYS_NAMES.length], tag: t }));
  const exploits = rngShuffle(rng, chosen.map((t, i) => ({ id: 'exp' + i, name: EXP_NAMES[i % EXP_NAMES.length], tag: t })));
  // decoys at higher tiers: extra exploit cards that match nothing
  const decoyCount = Math.max(0, target.tier - 2);
  const decoyTags = tags.filter(t => !chosen.includes(t));
  for (let i = 0; i < decoyCount && i < decoyTags.length; i++) {
    exploits.push({ id: 'dec' + i, name: EXP_NAMES[(n + i) % EXP_NAMES.length], tag: decoyTags[i], decoy: true });
  }
  return { systems, exploits: rngShuffle(rng, exploits) };
}
const SYS_NAMES = ['AuthGate', 'FileVault', 'MailRelay', 'KernelCore', 'WebFront', 'DataSilo', 'KeyStore', 'LogSink'];
const EXP_NAMES = ['NullStride', 'PassKey', 'SQLoop', 'HashRip', 'TimeSkew', 'MisConf', 'HeapWalk', 'TokenBreak'];

// Firewall bypass: a sequence-routing puzzle. Reproduce a growing signal sequence before the
// timer; wrong input resets the round. Higher tiers = longer sequences, tighter time.
function buildFirewall(target, rng, derived) {
  const nodes = Math.min(9, 4 + target.tier);
  const rounds = Math.min(6, 2 + target.tier);
  const base = 16 - target.tier * 1.4;                  // seconds, before upgrades/timeMul
  const time = Math.max(6, base * (target.sec.timeMul) * (derived ? derived.timeFactor : 1));
  return { nodes, rounds, time };
}

// Data extraction: pick files to pull within storage + a transfer timer; risk accrues detection.
function buildExtract(target, rng, derived) {
  const storage = derived ? derived.storage : 60;
  const transferTime = Math.max(14, (28 - target.tier * 1.5) * (target.sec.timeMul) * (derived ? derived.timeFactor : 1));
  return { files: target.loot.map(f => ({ ...f })), storage, transferTime };
}

// Log cleanup: Simon-style memory. Repeat an increasing colour/glyph sequence.
function buildLogs(target, rng) {
  const pads = Math.min(6, 3 + Math.floor(target.tier / 1.5));
  const length = Math.min(9, 3 + target.tier);
  return { pads, length };
}

// Social engineering: a short dialogue tree. Correct options reference facts the player should
// have gathered in recon; wrong/guessed options raise suspicion. Not pure luck — the clues matter.
function buildSocial(target, rng) {
  const p = target.persona;
  const nameFirst = p.name.replace(/^[^:]+:\s*/, '').split(' ')[0];
  const steps = [
    {
      prompt: `${nameFirst} answers warily: "Who is this?"`,
      options: [
        { t: `"IT support — I have a ticket under ${p.team}."`, needs: 'team', good: true },
        { t: `"It's your bank."`, good: false },
        { t: `"Does it matter? Just verify your account."`, good: false, rude: true },
      ],
    },
    {
      prompt: `"Prove it. What's on file for me?"`,
      options: [
        { t: `"Our record shows the handle '${p.pet}' — that you?"`, needs: 'pet', good: true },
        { t: `"We don't share that over the phone."`, good: false },
        { t: `"Your social security number, obviously."`, good: false, rude: true },
      ],
    },
    {
      prompt: `"...okay. What do you need?"`,
      options: [
        { t: `"Confirm the reset code we sent — this is routine since ${p.year}."`, needs: 'year', good: true },
        { t: `"Just read me your password."`, good: false, rude: true },
        { t: `"Nothing, sorry to bother you."`, good: false },
      ],
    },
  ];
  // higher tiers add a distrust step
  if (target.tier >= 3) {
    steps.push({
      prompt: `"My manager's here. Say again who you are?"`,
      options: [
        { t: `"${nameFirst}, right? Ask them to check the ${p.team} queue."`, needs: 'name', good: true },
        { t: `"Put them on, I'll yell at them."`, good: false, rude: true },
        { t: `[hang up]`, good: false },
      ],
    });
  }
  return { npc: nameFirst, steps };
}

const BUILDERS = {
  recon: () => null, // recon uses op.clues directly
  password: buildPassword,
  netmap: buildNetmap,
  exploit: buildExploit,
  firewall: buildFirewall,
  extract: buildExtract,
  logs: buildLogs,
  social: buildSocial,
};

export function generateOp(target, derived, seedKey) {
  const rng = seeded(seedKey || (target.id + '_' + Date.now()));
  const clues = buildClues(target, rng);
  const op = {
    target,
    seed: seedKey,
    clues,                 // full clue pool
    knownClues: [],        // filled by recon (facts the player uncovered)
    stages: target.stages.slice(),
    cfg: {},
  };
  for (const stage of target.stages) {
    const b = BUILDERS[stage];
    op.cfg[stage] = b ? b(target, rng, derived) : null;
  }
  return op;
}

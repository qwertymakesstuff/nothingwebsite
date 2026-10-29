import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../../zero-day/js/', import.meta.url);
const load = f => import(new URL(f, dir));
const { TARGETS, TARGET_BY_ID, TIERS } = await load('targets.js');
const { generateOp } = await load('generate.js');
const { STORY, pollStory } = await load('story.js');
const { UPGRADES, CONSUMABLES, upgradeCost } = await load('shop.js');
const { refreshBoard } = await load('contracts.js');
const { freshState, derived } = await load('state.js');
const { TIER_GATE, xpForLevel } = await load('config.js');

const STAGES = ['recon', 'password', 'netmap', 'exploit', 'firewall', 'extract', 'logs', 'social'];
const DERIVED = { timeFactor: 1, hintTier: 1, detectMul: 1, storage: 60, reconClues: 1, netReveal: 0, prepSlots: 1 };

test('every zero-day module has valid syntax', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) f.isDirectory() ? walk(path.join(d, f.name)) : f.name.endsWith('.js') && files.push(path.join(d, f.name)); };
  walk(dir.pathname);
  assert.ok(files.length >= 18, `expected many modules, got ${files.length}`);
  for (const f of files) {
    const r = spawnSync(process.execPath, ['--check', f]);
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

test('30+ unique targets across all five tiers', () => {
  assert.ok(TARGETS.length >= 30, `need >=30 targets, have ${TARGETS.length}`);
  assert.equal(new Set(TARGETS.map(t => t.id)).size, TARGETS.length, 'target ids unique');
  for (let tier = 1; tier <= 5; tier++) assert.ok(TARGETS.some(t => t.tier === tier), `tier ${tier} populated`);
});

test('each target is well-formed and uses valid stages', () => {
  const used = new Set();
  for (const t of TARGETS) {
    assert.ok(t.stages.length >= 2, `${t.id} >=2 stages`);
    for (const s of t.stages) { assert.ok(STAGES.includes(s), `${t.id} bad stage ${s}`); used.add(s); }
    assert.ok(t.loot.length >= 1, `${t.id} has loot`);
    assert.ok(t.reward > 0 && t.xp > 0 && t.rep > 0, `${t.id} positive rewards`);
    assert.ok(t.diff >= 1 && t.diff <= 5, `${t.id} difficulty 1..5`);
  }
  assert.equal(used.size, 8, 'all 8 minigames are used somewhere');
});

test('difficulty scales with tier (timers tighten, security hardens)', () => {
  const avgTime = tier => { const ts = TARGETS.filter(t => t.tier === tier); return ts.reduce((a, t) => a + t.sec.timeMul, 0) / ts.length; };
  const avgTough = tier => { const ts = TARGETS.filter(t => t.tier === tier); return ts.reduce((a, t) => a + t.sec.toughness, 0) / ts.length; };
  assert.ok(avgTime(1) > avgTime(5), 'tier 5 timers tighter than tier 1');
  assert.ok(avgTough(5) >= avgTough(1), 'tier 5 at least as tough');
  const avgStages = tier => { const ts = TARGETS.filter(t => t.tier === tier); return ts.reduce((a, t) => a + t.stages.length, 0) / ts.length; };
  assert.ok(avgStages(5) > avgStages(1), 'elite ops combine more stages than individual ops');
});

test('generated operations are always solvable', () => {
  for (const t of TARGETS) {
    const op = generateOp(t, DERIVED, t.id + '_seed');
    for (const st of t.stages) {
      const cfg = op.cfg[st];
      if (st === 'password') {
        assert.equal(cfg.secret.length, cfg.codeLen);
        assert.ok(cfg.secret.every(x => cfg.palette.includes(x)), `${t.id} pw in palette`);
        assert.ok(cfg.attempts >= 3, `${t.id} enough attempts`);
      }
      if (st === 'netmap') {
        assert.ok(!cfg.traps.includes(cfg.entry) && !cfg.traps.includes(cfg.goal), `${t.id} endpoints clear`);
        const n = cfg.size, trap = new Set(cfg.traps), seen = new Set([cfg.entry]), q = [cfg.entry];
        let reach = false;
        while (q.length) {
          const c = q.shift(); if (c === cfg.goal) { reach = true; break; }
          const r = Math.floor(c / n), cc = c % n, nb = [];
          if (r > 0) nb.push(c - n); if (r < n - 1) nb.push(c + n); if (cc > 0) nb.push(c - 1); if (cc < n - 1) nb.push(c + 1);
          for (const x of nb) if (!seen.has(x) && !trap.has(x)) { seen.add(x); q.push(x); }
        }
        assert.ok(reach, `${t.id} netmap has a trap-free path`);
      }
      if (st === 'exploit') assert.ok(cfg.systems.every(s => cfg.exploits.some(e => e.tag === s.tag && !e.decoy)), `${t.id} every system matchable`);
      if (st === 'firewall') assert.ok(cfg.time >= 5 && cfg.rounds >= 2, `${t.id} firewall sane`);
      if (st === 'extract') assert.ok(cfg.files.some(f => f.g <= cfg.storage), `${t.id} a file fits the vault`);
      if (st === 'logs') assert.ok(cfg.length >= 3 && cfg.pads >= 3, `${t.id} logs sane`);
      if (st === 'social') assert.ok(cfg.steps.length >= 3 && cfg.steps.every(s => s.options.some(o => o.good)), `${t.id} social winnable`);
    }
  }
});

test('upgrades have coherent cost tables', () => {
  for (const u of UPGRADES) {
    assert.equal(u.costs.length, u.max, `${u.id} cost count matches max`);
    assert.ok(upgradeCost(u.id, 0) > 0, `${u.id} has a level-0 cost`);
    assert.equal(upgradeCost(u.id, u.max), null, `${u.id} is capped at max`);
    for (let i = 1; i < u.costs.length; i++) assert.ok(u.costs[i] > u.costs[i - 1], `${u.id} costs rise`);
  }
  assert.ok(CONSUMABLES.length >= 5, 'marketplace stocked');
});

test('story has triggered beats including the VEILCORP arc', () => {
  assert.ok(STORY.length >= 8, 'enough story beats');
  assert.ok(STORY.every(b => typeof b.when === 'function'), 'beats are gated by triggers');
  assert.ok(STORY.some(b => b.id === 'veil-reveal'), 'finale beat exists');
  const s = freshState();
  const intro = pollStory(s);
  assert.ok(intro.some(b => b.id === 'intro'), 'intro unlocks immediately');
});

test('contract board only offers unlocked tiers and is non-empty at start', () => {
  const s = freshState();
  const board = refreshBoard(s);
  assert.ok(board.length >= 4, 'board populated for a beginner');
  for (const c of board) {
    const g = TIER_GATE[c.tier];
    assert.ok(s.rep >= g.rep && s.level >= g.level, `offered contract tier ${c.tier} is actually unlocked`);
  }
  // higher-level operator sees higher tiers
  s.level = 20; s.rep = 1500;
  const board2 = refreshBoard(s);
  assert.ok(board2.some(c => c.tier >= 4), 'elite operator sees high-tier work');
});

test('xp curve climbs with level', () => {
  assert.ok(xpForLevel(2) > xpForLevel(1), 'xp requirement grows');
  assert.ok(xpForLevel(10) > xpForLevel(5), 'later levels cost more');
});

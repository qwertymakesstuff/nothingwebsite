// The contract board. Mixes handcrafted, story-driven jobs with procedurally assembled ones.
// A contract wraps a target with a client, a motive, an objective and multiple possible outcomes.
import { TARGETS, TARGET_BY_ID } from './targets.js';
import { TIER_GATE } from './config.js';
import { seeded, rngPick, rngInt, rngShuffle, uid } from './rng.js';

// Mission templates. objective kinds:
//   complete  — just finish the operation
//   grab      — pull a specific loot file (matched by evidence tag or name fragment)
//   stealth   — finish with detection under a threshold
//   evidence  — pull any file carrying an evidence tag
const TEMPLATES = [
  { key: 'recover', verb: 'Recover deleted files', obj: 'complete',
    desc: t => `A client says ${t.persona.name.replace(/^[^:]+:\s*/, '')} trashed files they're owed. Get in, pull what's recoverable, get out.`,
    clients: ['a freelance client', 'an ex-business partner', 'an estranged relative'] },
  { key: 'misconduct', verb: 'Find evidence of misconduct', obj: 'evidence',
    desc: t => `A whistleblower wants proof of wrongdoing inside ${t.name}. Bring back anything that would hold up.`,
    clients: ['an investigative journalist', 'a disgruntled insider', 'a watchdog group'] },
  { key: 'research', verb: 'Retrieve stolen research', obj: 'grab',
    desc: t => `Research that belongs to our client ended up on ${t.name}'s systems. Take it back.`,
    clients: ['a rival lab', 'the original inventor', 'a venture fund'] },
  { key: 'scam', verb: 'Expose a scam operation', obj: 'evidence',
    desc: t => `${t.name} is suspected of running a fictional scam. Surface the paper trail.`,
    clients: ['a victims\' collective', 'a consumer reporter', 'an anonymous tip line'] },
  { key: 'account', verb: 'Recover a lost account', obj: 'complete',
    desc: t => `Our client lost access to their own data held by ${t.name}. Get them back in.`,
    clients: ['a locked-out user', 'a small creator', 'a retiree'] },
  { key: 'investigate', verb: 'Investigate a suspicious company', obj: 'evidence',
    desc: t => `Someone is paying to know what ${t.name} is really doing. Quiet look, hard proof.`,
    clients: ['a short-seller', 'a regulator (off the books)', 'a competitor'] },
  { key: 'secrets', verb: 'Steal corporate secrets', obj: 'grab',
    desc: t => `A questionable client wants ${t.name}'s crown jewels. No questions, big pay.`,
    clients: ['an unnamed buyer', 'a foreign firm', 'a broker who won\'t say'] },
  { key: 'infiltration', verb: 'High-risk infiltration', obj: 'stealth',
    desc: t => `Deep job on ${t.name}. In and out without tripping a single alarm. The pay reflects the risk.`,
    clients: ['a syndicate contact', 'a very private principal', 'SIGNAL directly'] },
];

function tierUnlocked(state, tier) {
  const g = TIER_GATE[tier];
  return state.rep >= g.rep && state.level >= g.level;
}

function eligibleTargets(state) {
  return TARGETS.filter(t => tierUnlocked(state, t.tier));
}

// Build one contract from a target + template, deterministic from seed.
function makeContract(target, template, state, seedKey) {
  const rng = seeded(seedKey);
  const client = rngPick(rng, template.clients);
  const payMult = 1 + (rng() * 0.5 - 0.1);            // 0.9 .. 1.4
  const bonusMult = 0.35 + rng() * 0.35;              // bonus objective pay share
  const base = Math.round(target.reward * payMult);

  // Pick a concrete objective.
  let objective = { kind: template.obj, label: '', bonus: false };
  const evLoot = target.loot.filter(l => l.ev);
  if (template.obj === 'grab') {
    const pick = evLoot.length ? rngPick(rng, evLoot) : rngPick(rng, target.loot);
    objective.file = pick.n; objective.label = `Extract ${pick.n}`;
  } else if (template.obj === 'evidence') {
    objective.label = evLoot.length ? 'Extract any flagged file' : 'Pull anything incriminating';
    objective.anyEvidence = true;
  } else if (template.obj === 'stealth') {
    objective.maxDetect = target.tier >= 4 ? 55 : 40;
    objective.label = `Finish under ${objective.maxDetect}% detection`;
  } else {
    objective.label = 'Complete the operation';
  }

  // A secondary bonus objective for extra reward and alternate outcomes.
  const bonusKinds = ['stealthBonus', 'fullHaul', 'extraEvidence'];
  const bk = rngPick(rng, bonusKinds);
  let bonus = null;
  if (bk === 'stealthBonus' && template.obj !== 'stealth') {
    bonus = { kind: 'stealth', maxDetect: 30, label: 'Bonus: stay under 30% detection', pay: Math.round(base * bonusMult) };
  } else if (bk === 'fullHaul') {
    bonus = { kind: 'fullHaul', label: 'Bonus: extract every file', pay: Math.round(base * bonusMult) };
  } else if (bk === 'extraEvidence' && evLoot.length) {
    bonus = { kind: 'extraEvidence', label: 'Bonus: pull a flagged file', pay: Math.round(base * bonusMult) };
  }

  return {
    id: 'ct_' + uid(),
    targetId: target.id,
    title: `${template.verb} — ${target.name}`,
    verb: template.verb,
    tmpl: template.key,
    client,
    desc: template.desc(target),
    objective,
    bonus,
    reward: base,
    xp: target.xp,
    rep: target.rep,
    tier: target.tier,
    handcrafted: false,
  };
}

// Handcrafted, always-available story contracts (once their target is unlocked).
function handcrafted(state) {
  const out = [];
  const add = (id, cond, build) => { if (cond) out.push(build()); };

  if (TARGET_BY_ID['biz-mistral'] && tierUnlocked(state, 2)) {
    out.push({
      id: 'ct_story_mistral', targetId: 'biz-mistral', handcrafted: true, tier: 2,
      title: 'Follow the invoices — Mistral Accounting',
      verb: 'Investigate', tmpl: 'investigate', client: '??? (encrypted)',
      desc: 'An anonymous source insists Mistral\'s books hide who really pays the board. Pull the client ledgers and any invoice that doesn\'t belong.',
      objective: { kind: 'grab', file: 'veilcorp_invoice.pdf', label: 'Extract veilcorp_invoice.pdf', anyEvidence: false },
      bonus: { kind: 'fullHaul', label: 'Bonus: extract every file', pay: 180 },
      reward: Math.round(TARGET_BY_ID['biz-mistral'].reward * 1.3), xp: 200, rep: 20,
    });
  }
  if (TARGET_BY_ID['elite-veilcorp'] && tierUnlocked(state, 5)) {
    out.push({
      id: 'ct_story_veilcorp', targetId: 'elite-veilcorp', handcrafted: true, tier: 5, finale: true,
      title: '★ THE BOARD ITSELF — VEILCORP',
      verb: 'Infiltrate', tmpl: 'infiltration', client: 'yourself',
      desc: 'The job SIGNAL told you never to take. Pull the ledger of every brokered job and the Architect\'s key. Finish this and the board is yours to end.',
      objective: { kind: 'grab', file: 'the_architect.key', label: 'Extract the_architect.key' },
      bonus: { kind: 'extraEvidence', label: 'Bonus: pull the ledger of jobs too', pay: 1400 },
      reward: TARGET_BY_ID['elite-veilcorp'].reward, xp: 1200, rep: 160,
    });
  }
  return out;
}

// Regenerate the board. Keeps accepted contracts; fills the rest up to a cap.
export function refreshBoard(state) {
  const cap = 6 + Math.min(4, Math.floor(state.level / 4));
  const accepted = state.activeContract ? [state.activeContract] : [];
  const keepIds = new Set(accepted.map(c => c.id));

  const hand = handcrafted(state).filter(c => !state.cleared.includes(c.id + ':done') && !keepIds.has(c.id));
  const board = [...hand];

  const elig = eligibleTargets(state);
  const rng = seeded('board_' + state.boardSeed + '_' + state.level + '_' + state.rep);
  const shuffled = rngShuffle(rng, elig);
  let i = 0;
  while (board.length < cap && i < shuffled.length * 3) {
    const target = shuffled[i % shuffled.length];
    const tmpl = rngPick(rng, TEMPLATES);
    // avoid stealth template on the very first tier for teaching clarity
    if (target.tier === 1 && tmpl.key === 'infiltration') { i++; continue; }
    const c = makeContract(target, tmpl, state, 'c_' + state.boardSeed + '_' + i + '_' + target.id);
    if (!board.some(b => b.targetId === c.targetId && b.tmpl === c.tmpl)) board.push(c);
    i++;
  }
  return board;
}

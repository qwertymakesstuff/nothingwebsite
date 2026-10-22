// The deterministic judge. Given a customer and the situation at the moment of the decision, it
// runs every active rule and says whether they should have been admitted, and why.

import { RULES } from './rules.js';

export function evaluate(customer, ctx) {
  const checks = ctx.rules.map(({ id, params }) => {
    const r = RULES[id].check(customer, ctx, params);
    return { id, title: RULES[id].title, cite: RULES[id].cite, ...r };
  });
  const violations = checks.filter(c => !c.pass);
  return { admit: violations.length === 0, checks, violations: violations.map(v => v.id) };
}

// Judge a decision: verdict is 'admit' or 'refuse'; reason is a rule id (or null) for refusals.
export function judge(customer, ctx, verdict, reason = null) {
  const ev = evaluate(customer, ctx);
  const correct = (verdict === 'admit') === ev.admit;
  const citationCorrect = verdict === 'refuse' && correct && reason != null && ev.violations.includes(reason);
  return { ...ev, verdict, reason, correct, citationCorrect };
}

// A short headline and supporting lines the player sees on the decision slip.
export function explain(j, name) {
  const failed = j.checks.filter(c => !c.pass);
  if (j.correct && j.verdict === 'admit') {
    return { tone: 'good', headline: `Correct — ${name} was good to go.`, lines: j.checks.filter(c => !c.na).map(c => `✓ ${c.title}: ${c.detail}`) };
  }
  if (j.correct) {
    const lines = failed.map(c => `✗ ${c.title}: ${c.detail}`);
    if (j.reason && !j.citationCorrect) lines.push(`You cited "${(j.checks.find(c => c.id === j.reason) ?? { cite: j.reason }).cite}", which wasn't the problem — no citation bonus.`);
    if (j.citationCorrect) lines.push('Right reason cited: citation bonus.');
    return { tone: 'good', headline: `Correct — ${name} had to be refused.`, lines };
  }
  if (j.verdict === 'admit') {
    return { tone: 'bad', headline: `Mistake — you let ${name} in.`, lines: failed.map(c => `✗ ${c.title}: ${c.detail}`) };
  }
  return { tone: 'bad', headline: `Mistake — ${name} should have been admitted.`, lines: ['Every rule passed:', ...j.checks.filter(c => !c.na).map(c => `✓ ${c.title}: ${c.detail}`)] };
}

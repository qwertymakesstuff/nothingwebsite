// Judges a stamp against the rules engine and works out pay, warnings and fines.
//   assess(visitor, decision, { regulations, date }, priorDecisions) → decision record
// The record is everything the game keeps about the decision: it is stored once, in the
// shift, and money, reports and the log all read from it.
import { SCORING } from '../data/scoring.js';
import { REGULATIONS_BY_ID } from '../data/regulations.js';
import { evaluate } from './rulesEngine.js';

export const warningsUsed = decisions => decisions.filter(d => d.citation?.level === 'warning').length;

export function assess(visitor, decision, ctx, priorDecisions = [], scoring = SCORING) {
  const result = evaluate(visitor, ctx.regulations, ctx);
  const correct = decision === result.verdict;
  const violations = result.violations.map(v => ({ rule: v.rule, topic: v.topic, message: v.message, evidence: v.evidence }));
  const record = {
    visitorId: visitor.id,
    decision,
    verdict: result.verdict,
    correct,
    violations,
    notes: result.checks.filter(c => c.note && c.passed && !c.note.startsWith('Not applicable')).map(c => c.note),
    pay: correct ? scoring.wage : 0,
    fine: 0,
    citation: null,
  };
  if (correct) return record;

  const serious = decision === 'accept' && violations.some(v => scoring.seriousTopics.includes(v.topic));
  const warning = !serious && warningsUsed(priorDecisions) < scoring.warningsPerShift;
  const rules = [...new Set(violations.map(v => v.rule))];
  record.citation = {
    level: warning ? 'warning' : 'fine',
    serious,
    amount: warning ? 0 : serious ? scoring.seriousFine : scoring.fine,
    // what the officer got wrong, in the Ministry's words
    reason: decision === 'accept'
      ? `Entry granted in violation of regulations: ${violations.map(v => v.message).join(' ')}`
      : `Entry denied to an entrant whose papers were in order.${record.notes.length ? ` ${record.notes.join(' ')}` : ''}`,
    rules: rules.map(id => ({ id, text: REGULATIONS_BY_ID[id]?.text || id })),
  };
  record.fine = record.citation.amount;
  return record;
}

// a shift's performance, from its decision records
export function shiftReport(decisions) {
  const correct = decisions.filter(d => d.correct).length;
  const sum = key => decisions.reduce((a, d) => a + d[key], 0);
  return {
    processed: decisions.length,
    correct,
    mistakes: decisions.length - correct,
    warnings: warningsUsed(decisions),
    fined: decisions.filter(d => d.fine > 0).length,
    wages: sum('pay'),
    fines: sum('fine'),
    net: sum('pay') - sum('fine'),
    accuracy: decisions.length ? Math.round((correct / decisions.length) * 100) : 0,
    granted: decisions.filter(d => d.decision === 'accept').length,
  };
}

// Story conditions used by shifts, incidents, scenes and choices. A condition is plain data:
//   { flag: 'x' }                 flag is truthy
//   { flag: 'x', eq: 'kwame' }    flag equals a value
//   { flag: 'x', gte: 2 }         numeric flag at least
//   { outcome: 'decoy', correct: true }   how a story guest was handled
//   { all: [...] } { any: [...] } { not: {...} }
//   { money: { gte: 50 } }  { upgrade: 'uv-torch' }
// Undefined means "always".

export function testCondition(cond, flags = {}, player = null) {
  if (cond == null) return true;
  if (cond.all) return cond.all.every(c => testCondition(c, flags, player));
  if (cond.any) return cond.any.some(c => testCondition(c, flags, player));
  if (cond.not) return !testCondition(cond.not, flags, player);
  if (cond.flag) {
    const v = flags[cond.flag];
    if ('eq' in cond) return v === cond.eq;
    if ('gte' in cond) return (Number(v) || 0) >= cond.gte;
    return !!v;
  }
  if (cond.outcome) {
    const o = flags.outcomes?.[cond.outcome];
    if (!o) return cond.missing === true;
    if ('correct' in cond) return o.correct === cond.correct;
    if ('verdict' in cond) return o.verdict === cond.verdict;
    return true;
  }
  if (cond.money) return player ? player.money >= (cond.money.gte ?? -Infinity) : false;
  if (cond.upgrade) return player ? player.owned.includes(cond.upgrade) : false;
  return true;
}

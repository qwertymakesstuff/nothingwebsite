// Pay and penalties. Each decision is checked against the rules engine's verdict.
export const SCORING = {
  wage: 5,                 // paid for each correct decision
  warningsPerShift: 2,     // the first mistakes in a shift bring a warning and no fine
  fine: 5,                 // each ordinary mistake once the warnings are used up
  seriousFine: 10,         // admitting an entrant on forged papers: fined at once, never a warning
  seriousRules: ['passport-issuer', 'passport-seal'],
};

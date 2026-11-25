# Opponent strength calibration

**Rule: an opponent's rating must come from how the engine is actually configured, never from a
label.** This file records how the ratings were measured and how far they can be trusted. The
raw match data is in [`AI_CALIBRATION.json`](AI_CALIBRATION.json). To reproduce it, run
`npm run calibrate -w @rookery/ai` (see the modes in `packages/ai/scripts/calibrate.test.ts`).

## The scale

| Range | How strength is produced | Where the rating comes from |
| --- | --- | --- |
| 1320–3190 | Stockfish's `UCI_LimitStrength` / `UCI_Elo`, 0.7 s per move | Stockfish's own calibration (CCRL 40/4 scale, about 1 s per move) |
| Full strength (Corvus, Custom "max") | Unrestricted Stockfish 19 lite, 1.5 s per move | Shown as "3000+". Far above any human; not measured here. |
| Below 1320 | Our sampled weakening (`strength.ts`), driven by one skill value from 0 to 1 | Measured in engine games, anchored to Stockfish UCI_Elo 1320 |

All measurements used the same engine build as the website (Stockfish 19 lite WASM), run in Node.
The anchor searched for 0.7 s per move, the same budget as the 1320+ opponents. Games started from
the first four plies of 22 catalogue openings, alternating colours, and were played to the end;
games still going after 220 plies were adjudicated by a depth-14 evaluation.

## Measurements (24 games per match)

| Skill | Opponent | Score | Implied rating |
| --- | --- | --- | --- |
| 1.00 | Stockfish 1320 | 47.9% | 1306 |
| 0.95 | Stockfish 1320 | 62.5% | 1409 |
| 0.90 | Stockfish 1320 | 37.5% | 1231 |
| 0.85 | Stockfish 1320 | 25.0% | 1129 |
| 0.85 | skill 0.90 (1231) | 39.6% | 1158 |
| 0.80 | Stockfish 1320 | 18.8% | 1065 |
| 0.80 | skill 0.85 (1158) | 29.2% | 1004 |
| 0.75 | skill 0.80 (1065) | 20.8% | 833 |
| 0.70 | skill 0.75 | 14.6% | 526 |
| 0.65 | skill 0.70 | 33.3% | 406 |
| 0.65 | skill 0.80 (1065) | 2.1% | 461* |
| 0.60 | skill 0.65 | 29.2% | 252 |

\* A score near 0% only gives a bound, so this row counts for less.

**Fitted table (`SAMPLE_CALIBRATION`):**

| Skill | 0.60 | 0.65 | 0.70 | 0.75 | 0.80 | 0.85 | 0.90 | 0.95 | 1.00 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rating | 250 | 405 | 500 | 805 | 1035 | 1145 | 1230 | 1320 | 1360 |

How the fit was made:
- Where both methods measured a point (against Stockfish, and against a neighbouring skill), the two
  results were averaged.
- The ladder below 0.8 was shifted to match.
- The noisy pair at 0.95 and 1.0 was pooled, so the table always rises with skill.

The opponents below 1320 therefore play at these skills:

| Opponent | Target | Skill |
| --- | --- | --- |
| Pip | 300 | 0.62 |
| Marlow | 550 | 0.71 |
| Juniper | 720 | 0.74 |
| Theo | 900 | 0.77 |
| Rosa | 1050 | 0.81 |
| Benedict | 1220 | 0.90 |

## Validation: real opponents, with personality, head to head (24 games each)

| Match | Expected from ratings | Actual |
| --- | --- | --- |
| Juniper (720) vs Marlow (550) | 72.7% | 70.8% |
| Rosa (1050) vs Theo (900) | 70.3% | 79.2% |
| Theo (900) vs Juniper (720) | 73.8% | 60.4% |
| Benedict (1220) vs Rosa (1050) | 72.7% | 91.7% |
| Marlow (550) vs Pip (300)† | 80.8% | 85.4% |

† Measured before the style window was narrowed (see below).

The stronger opponent won every pairing. Every result is within about two standard errors (one
standard error is about 9 percentage points at 24 games). Benedict vs Rosa is the largest gap, about
150 Elo wider than the ratings predict.

## What changed because of calibration

- **The first guessed table was badly wrong.** The model is much steeper than expected: skill 0.5
  was far below any real player. All opponents now sit between skill 0.6 and 0.9.
- **Personality was distorting strength.** With a 56-centipawn style window, Rosa (aggressive, high
  risk) lost 24–0 to Benedict. The weak model's window is now 15–40 cp, so style chooses between
  similar moves rather than weakening the opponent.
- **Search explosions.** One depth-limited search ran for 40 s (23.7M nodes) in a sharp position.
  Sampled searches are now capped at 400k nodes, under a second, without making strength depend on
  device speed.

## Limits, stated plainly

- Ratings below 1320 are on Stockfish's CCRL-based scale. That isn't the same as FIDE, Chess.com or
  Lichess ratings, though it is broadly similar at club level.
- 24 games per match gives roughly ±80 Elo uncertainty per point. More games would tighten it; the
  harness supports any number (`GAMES=100`).
- Ratings of 1320 and above trust Stockfish's own calibration. That was made with the full network
  at a longer time control. The lite network at 0.7 s is likely somewhat weaker at the top end, so
  the master-tier ratings are probably slightly optimistic.
- When players have rated games against opponents (later stages), real results should replace these
  estimates.

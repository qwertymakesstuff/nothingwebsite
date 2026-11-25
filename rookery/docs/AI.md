# Computer opponents

Everything lives in `packages/ai`, which has no UI code. The website (`apps/web`) runs it with
Stockfish in a Web Worker; the tests and the calibration script run the same code in Node.

```
personas/*.json ──► PersonaSchema (zod) ──► ROSTER
                                              │
strength.elo ──► strength.ts ──► engine settings (UCI_Elo / depth / sampling)
personality  ──► select.ts   ──► choose between moves the strength model allows
openings     ──► book.ts     ──► book moves while a favourite line matches
dialogue     ──► dialogue.ts ──► chat reactions to game events
                       ▼
               brain.ts (BotBrain) ◄──► engine.ts (UciEngine) ◄──► Stockfish (Worker or Node)
```

**Personality is kept separate from the engine.** The engine and the strength model decide which
moves are acceptable. Personality (aggression, risk, mistake timing, openings, chat) only chooses
between them, inside a "style window" measured in centipawns. That window is a few centipawns for
masters and up to about 120 for beginners, so style never makes an opponent much stronger or weaker
than its rating.

## Adding an opponent

1. Copy any file in `packages/ai/src/personas/`, for example `theo.json`, and edit it. Every field is
   documented in `packages/ai/src/schema.ts`.
2. Add one import and one array entry in `packages/ai/src/personas/index.ts`.

That's all. The opponent appears on the Computer page in the right tier, with its portrait,
strength description, personality meters, favourite openings, chat and history. An invalid file
fails the build with a message naming the opponent and the field. To add an opening, add one line
to `packages/ai/src/openings.ts`; the tests check every line is legal.

| Field | Meaning |
| --- | --- |
| `strength.elo` | Target rating (200–3190) or `"max"`. Mapped to engine settings by `strength.ts`. |
| `strength.movetimeMs` | Optional: search time per move for Stockfish-limited levels (default 700 ms). |
| `personality.aggression` | 0–1. Prefers checks, captures, pawn storms and approaching the enemy king. |
| `personality.risk` | 0–1. Low = trades down when ahead and castles early; high = keeps tension. |
| `personality.mistakePhases` | Where mistakes cluster (opening / middlegame / endgame weights). The overall rate comes from strength. |
| `personality.resign` | `{ belowCp, moves }`: resigns after `moves` consecutive evaluations below `belowCp`. `null` = never. |
| `personality.acceptDrawWithinCp` | Accepts draw offers after move 20 when roughly level (or when worse). `null` = never. |
| `personality.thinking` | Human-like pause range before moving (scaled by Settings → Computer opponents → Move speed). |
| `openings.white/black` | Favourite lines (ids from `openings.ts`) with weights; `fidelity` = chance of following them. |
| `dialogue.*` | Lines per event (`greeting` required). See `DIALOGUE_EVENTS` in `schema.ts`. |

## How strength works

| Target rating | Engine behaviour |
| --- | --- |
| `"max"` | Stockfish at full strength, 1.5 s per move. |
| 1320–3190 | Stockfish's own strength limiter (`UCI_LimitStrength` + `UCI_Elo`), 0.7 s per move. Stockfish calibrates this scale against CCRL 40/4 at roughly one-second searches. |
| below 1320 | Stockfish's limiter stops at 1320, so we weaken it ourselves. A shallow multi-line search finds up to 24 candidate moves. The move is then sampled with a softmax over how much each candidate loses, plus occasional deliberate mistakes and random moves. One "skill" value from 0 to 1 sets all of these. |

The rating→skill table (`SAMPLE_CALIBRATION` in `strength.ts`) comes from measured games, not
guesses. `npm run calibrate -w @rookery/ai` plays the sampled model against Stockfish's UCI_Elo
1320, and in a ladder of neighbouring skills, then records the results in `AI_CALIBRATION.json`.
See `AI_CALIBRATION.md` for the latest measurements and their limits.

## In the browser

- `apps/web/lib/engine/browserEngine.ts` creates the shared Worker on first use (about 1.9 MB,
  cached afterwards). Pages that don't need an engine never load it.
- `apps/web/lib/useBotGame.ts` runs a game:
  - the turn flow, with any engine work cancelled when the game changes;
  - clocks, takebacks, draw offers and resignation (yours or the opponent's);
  - recognising checkmate, stalemate, insufficient material, threefold repetition, the fifty-move
    rule and time-outs;
  - chat reactions, and saving the finished game to history.
- History is stored in this browser (`lib/botHistory.ts`) until accounts exist (Stage 2).
- Settings → Computer opponents: move speed, opponent chat, engine information, and a live engine
  test.

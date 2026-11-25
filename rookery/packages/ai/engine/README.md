# Stockfish engine (vendored)

| File | What |
| --- | --- |
| `stockfish-19-lite-single.js` / `.wasm` | Stockfish 19 "lite, single-threaded" WebAssembly build |
| `COPYING.txt` | GNU General Public License v3 (the engine's licence) |

- Source: npm package `stockfish@19.0.1` (Stockfish.js by Nathan Rugg, https://github.com/nmrugg/stockfish.js,
  tag v19.0.1), based on Stockfish 19 (https://github.com/official-stockfish/Stockfish).
- Licence: GPL-3.0. The files are redistributed unmodified. The corresponding source is at the two
  repositories above, pinned to the versions given.
- Why this build: it's about 1.9 MB, runs in any modern browser without cross-origin isolation, and
  is far stronger than any human even at a fraction of its full strength.

The website copies these files to `/engine/` at build time (`apps/web/scripts/copy-engine.mjs`) and
runs them in a Web Worker. The tests and the calibration script run the same files in Node.

To upgrade, replace both files with the same pair from a newer `stockfish` npm release, update
this README and `ENGINE_INFO` in `src/engine.ts`, then rerun `npm run calibrate -w @rookery/ai`.

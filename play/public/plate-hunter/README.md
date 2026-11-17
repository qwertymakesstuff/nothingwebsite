# PLATE HUNTER

A standalone collecting game for `play.missing.website/plate-hunter/`. It is plain HTML, CSS and ES modules with no dependencies or backend. Progress is versioned under the isolated `plate-hunter:save` localStorage key.

## Artwork

All 15 plate backgrounds and the arcade banner are original SVG artwork created for this game. They use fictionalized regional styling and do not reproduce official seals, agency marks, or a state's exact issued plate. Registration text is a separate responsive HTML layer so the blank artwork is reused for every roll. No remote plate art is loaded at runtime.

During asset research, Wikimedia Commons' [Blank License Plate Shape.svg](https://commons.wikimedia.org/wiki/File:Blank_License_Plate_Shape.svg) was identified as public domain (author credited on the file page as Superm401). It is not embedded in the game; the silhouette was used only as general reference for the original drawings.

## Structure

- `js/config.js`: odds, plate designs, specials, upgrades and achievements
- `js/generation.js`: registration and rarity generation
- `js/progression.js`: collection, sales, rewards, stats and upgrades
- `js/save.js`: versioned local save and migration
- `js/plate.js`: responsive plate renderer
- `js/app.js`: screen UI, navigation and input handling
- `css/game.css`: isolated game styling
- `assets/plates/`: local SVG templates

The game is local-only. Global leaderboard/account sync is not available in the arcade's static architecture.

# Checkmate Club asset library

Every image listed in `manifest.json` was requested from the **ForgeGUI** connector (style identity
“Checkmate Club — tabletop lounge”, `5dc76942-…`, version 1: walnut, green felt, ivory, ebony and
aged brass; soft upper-left light; no text, logos or watermarks). Nothing here is stock art.

## Status

- **32 generated**: ForgeGUI returned an image for the job; its URL is in the manifest.
- **8 outcome unknown**: the felt texture, black chip, diamond pip and five chess pieces (black
  pawn, bishop and rook; white knight and bishop). ForgeGUI could not confirm these jobs after a
  worker interruption. Per ForgeGUI's guidance they were **not regenerated**. The fetch script
  checks whether an image exists anyway.
- **0 downloaded so far**: this project's build environment could not reach the ForgeGUI storage
  host (`azyjlkhpdgafuobyxoax.supabase.co`), so no image files are committed yet. The game runs on
  procedural fallbacks until they are.

## Getting the files

```
python3 tools/checkmate-assets/fetch.py
```

The script downloads each image, trims transparent margins on cut-outs, resizes it to the size
below, saves WebP, and records width, height, bytes and alpha in `manifest.json`. The game picks
the files up automatically on the next load.

## Sets and fallbacks

Sets are used **all or nothing** (`manifest.sets`), so a game never mixes generated and drawn art:

| Set | Members | Fallback while incomplete |
| --- | --- | --- |
| `chess.pieces` | 12 pieces | Original SVG Staunton pieces (`js/games/chess/pieces.js`) |
| `board.textures` | maple, walnut | Flat board-theme colours |
| `cards.suits` | 4 pips | Unicode suit symbols, text presentation |
| `cards.courts` | king, queen, jack portraits | Framed rank letter and suit |
| `chips` | 1, 5, 10, 25, 100 | CSS chips with edge spots |

Card backs, backgrounds, game icons and decorations are used individually; their fallbacks are the
CSS patterns and gradients already in `css/style.css`.

## Files, formats and intended use

| Group | Files | Source format → shipped | Target size | Use |
| --- | --- | --- | --- | --- |
| Chess pieces | `chess/{white,black}-{king,queen,rook,bishop,knight,pawn}.webp` | transparent PNG cut-out → trimmed WebP with alpha | fit 256 px | Board pieces, captured-piece strip, promotion dialog |
| Textures | `textures/{maple,walnut,felt-green}.webp` | opaque 16:9 → WebP | fit 1024 px | Light/dark squares (SVG pattern), card-table felt |
| Card backs | `cards/back-{oxblood,midnight}.webp` | opaque square → WebP | fit 512 px | Card backs (Settings → Cards) |
| Suit pips | `cards/suit-{spade,heart,diamond,club}.webp` | transparent cut-out → trimmed WebP | fit 128 px | Card pips and corner indices |
| Court portraits | `cards/court-{king,queen,jack}.webp` | opaque square → WebP | fit 512 px | Shared portrait panel on every K, Q and J (rank and suit are drawn by code) |
| Chips | `chips/chip-{ivory,red,blue,green,black}.webp` | transparent cut-out → trimmed WebP | fit 192 px | Chips 1/5/10/25/100; values are drawn by code |
| Backgrounds | `backgrounds/{library,hero-lounge,chess-room}.webp` | opaque 16:9 → WebP | fit 1600 px | Page background, menu illustration, chess backdrop |
| Game icons | `icons/{chess,poker,blackjack,solitaire}.webp` | opaque square → WebP | fit 512 px | Library and menu tiles |
| Decoration | `ui/{divider,corner,medallion,dealer-button}.webp` | transparent cut-out → trimmed WebP | fit 256–640 px | Heading rule, frame corners, achievement badges (Stage 10), poker dealer button (Stage 6) |

Cards are not stored as 52 separate images: faces are composed from the reusable pips and portraits
plus rank text, so they stay sharp at every size.

# Elemental (`/elemental/`)

An original element-combining discovery game. Start with air, water, earth and fire, drag them
onto the workspace, and drop one onto another to discover something new: 397 elements and 484
recipes across nature, weather, space, life, food, science, technology, fantasy, everyday objects
and some silly ones. Plain HTML, CSS and ES modules, no build step, no dependencies, no asset
files (icons are emoji, sounds are synthesised with WebAudio).

## Playing

- Drag an element from your list onto the workspace, or click / tap it to place it.
- Drop one element onto another to combine them, or click one and then the other.
- A new discovery joins your list for good, with a discovery card. Making something you already
  have just tells you so (and notes a new recipe if you found another way to make it).
- When two elements don't combine, the dragged one flies back where it came from. Nothing is lost.
- Most recipes work either way round. A few are ordered ("Horse dropped onto Human") and only work
  in that direction; the reverse drop can make something else.
- Double-click a workspace element to copy it; drag it back to the list or press Delete to remove it.
- ★ marks a final element: nothing uses it as an ingredient.
- Undo (Ctrl+Z) and Clear act on the workspace only. Discoveries are never undone.
- Shortcuts: `/` search, `H` hint, `Ctrl+Z` undo, `Esc` deselect / close.

On touch screens the element list scrolls, so tapping an element places it; dragging and combining
happen on the workspace.

**Hints** always point at something you can make right now with what you already have, and stay on
the same target until you make it. A hint starts by naming only the category of the result; each
"reveal" goes one step further: one ingredient, then both (and the drop direction for ordered
recipes), then the result's name. "Different hint" swaps the target for free. Once everything is discovered, hints
point at recipes you haven't used yet. The encyclopedia can also reveal a recipe for any single
undiscovered element.

**Encyclopedia**: every element by category, undiscovered ones as `???`. A discovered element shows
its description, when and how it was first made, every recipe that makes it (unfound ones as
`? + ?`) and what it is used in.

**Stats**: discoveries, completion, recipes found, final elements, combinations tried / successful
/ failed, repeat discoveries, hints used and per-category progress.

## Saving

Progress saves to `localStorage` after every change (`elemental.progress.v1`), the workspace layout
separately (`elemental.workspace.v1`), and settings (`elemental.settings.v1`). Menu → Save data
downloads a JSON save or copies it to the clipboard; Menu → Import loads a file or pasted text.
Imported saves are validated: unknown elements and recipes are dropped, the four starting elements
are always present, bad numbers are reset, and saves for another game or a newer version are
refused with a message. If storage is unavailable the game keeps running and says so once.

## Files

| File | Job |
| --- | --- |
| `index.html` | page shell: header, workspace, inventory, hint popover, discovery card, modal |
| `css/style.css` | theme tokens (light and dark), layout (side-by-side, stacked under 720 px), animations |
| `data/recipes.js` | the database: `STARTING`, `CATEGORIES`, `ELEMENTS` (id, name, icon, category, description), `RECIPES` |
| `js/engine.js` | rules, pure: recipe lookup, discovery, hints, search and sort, stats, save parsing, data validation |
| `js/workspace.js` | the workspace model, pure: place, move, combine, remove, clear, undo |
| `js/storage.js` | guarded `localStorage` access |
| `js/main.js` | UI controller: rendering, pointer drag and drop, click-to-combine, discovery card, hints, shortcuts |
| `js/views.js` | encyclopedia, statistics, and the save / settings / help menu |
| `js/sound.js` | synthesised sound effects |

### Adding content

Add elements to `ELEMENTS` and recipes to `RECIPES` in `data/recipes.js`; nothing else changes.
`[a, b, result]` works either way round; `{ a, b, result, ordered: true }` only when `a` is dropped
onto `b`. Never rename an element id (saves refer to them). The tests run `validateData`, which
rejects unknown ids, a pair used twice, an ordered recipe that clashes with an unordered one,
recipes that make a starting element, and any element that can't be reached from the starting four.

## Tests

`node --test tests/music/elemental.test.mjs` covers the data (at least 200 recipes, all reachable),
order-independent and ordered recipes, new vs duplicate discoveries, invalid combinations leaving
progress untouched, completing the whole game, search and sorting, hint levels and stability,
save round-trips through `localStorage`, rejecting and cleaning tampered imports, and workspace undo.

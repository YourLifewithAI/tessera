# Hacking Tessera

A short tour through the code so you can mod it confidently.

The whole project is vanilla HTML, CSS, and JavaScript. No framework. No build step. No npm. Open a text editor, edit a file, refresh the browser, see the change. That's the loop.

## File map

| File | What's in it |
|---|---|
| `index.html` | Page shell. Loads CSS and three JS files. |
| `style.css` | Everything visual. CSS variables at the top of `:root` are the theme tokens. |
| `game.js` | The whole game: state object, render functions per screen, event handlers, tick loop. |
| `data/tiles.js` | The nine tile definitions and headline templates. Pure data — mod freely. |
| `data/states.js` | The 50 state sentiment profiles. Pure data — mod freely. |
| `tiles/*.svg` | One SVG per tile. Replace any file with your own art; the game picks it up automatically. |
| `icon.svg` | App icon / favicon. |
| `DESIGN.md` | The design doc. Read this before modding mechanics. |

## The game in 60 seconds

`game.js` is an immediate-mode-ish state machine with three screens:

1. **STATE_SELECT** — grid of 50 state buttons. Click one to start.
2. **GAME_BOARD** — top HUD, terrain grid in the middle, tile tray on the right, reaction popup along the bottom.
3. **WIN** — full-screen overlay shown when the first Tessera completes.

State lives in a single `state` object near the top of `game.js`. When something changes, the relevant render function (e.g., `renderHud`, `renderTray`) replaces a piece of the DOM. The whole tree is small enough that this is fast.

The tick loop runs while on the game board: every 2 seconds, `tick()` recomputes resources from placed tiles, applies penalties if housing is starving for power or food, and checks for Tessera completion.

`window.Tessera` is exposed in DevTools — useful for debugging. Open the console and type `Tessera.state` to inspect.

## Common mods

### Reskin the whole game (no code knowledge needed)

Open `style.css`. The top of the file is a `:root` block with all color tokens as CSS variables. Change a few values, save, refresh.

- `--bg`, `--panel`, `--text`, `--accent` — overall theme
- `--terrain-rural`, `--terrain-urban`, etc. — map look
- `--ok`, `--bad` — feedback colors

You can also drop a single `theme-override.css` after the existing stylesheet link in `index.html` to keep your changes separate.

### Replace tile art

Each tile's art is one SVG file in `tiles/`. The path is set per tile in `data/tiles.js` via the `art` property (default `tiles/<id>.svg`). To replace:

1. Make your SVG (any tool: Figma, Illustrator, Inkscape, hand-coded).
2. Save it as `tiles/<id>.svg` (overwriting the placeholder).
3. Refresh.

Aspect ratio should be 1:1. The game renders SVGs at 56×56 in the tray and 36×36 on the board. Design clear at small sizes.

### Add a new tile

Open `data/tiles.js`. Add an entry to the `window.TILES` object:

```js
my_new_tile: {
  name: "My New Tile",
  subtitle: "What it does",
  layer: "Closed Loops",          // must be one of the six, or "Coordination"
  cost: 40, capex: 40,             // capex is the new alias; either works
  baseGoodwill: 3,
  sentimentKey: "enviro",          // which state score modulates this
  color: "#3DA75C",
  art: "tiles/my_new_tile.svg",    // make this file too
  power: -2, water: 5, compute: 0, food: 0,
  cyclesPerTick: 0,
  description: "Short flavor sentence.",
},
```

Add headlines for it in `window.HEADLINES` (same file). Done — the tray renders it automatically.

### Add the v0.1 economic fields to a tile

All optional, defaults to 0. Add as many as make sense for your tile. The fields and their units:

```js
opex: 2,                  // recurring operating drain   (Cycles/quarter)
revenue: 6,               // recurring output sold       (Cycles/quarter)
jobsConstruction: 200,    // one-time build labor        (person-quarters)
jobsOps: 40,              // permanent operating jobs    (headcount)
emissionsPerTick: -1,     // net carbon (negative = avoided)  (kt CO2e/quarter)
waterDrawPerTick: 2,      // net regional water draw     (ML/quarter)
```

Picking numbers: aim for relative magnitudes that match real-world references (EIA for emissions, BLS for jobs, NRC/DOE for energy capex). Cite your source in a comment. The existing tiles do this — copy the pattern.

A few rules of thumb:
- Net `revenue − opex` should usually fall in `−2 … +8` Cycles/quarter. Larger and the tile dominates; smaller and it's invisible.
- `emissionsPerTick` typically `−8 … +5`. Negative for displacement (clean power), positive for industrial process.
- `waterDrawPerTick` typically `−3 … +8`. Negative for closed-loop net producers (vertical farm).

If your tile has revenue, it will benefit from the TFP boost when placed near a Coordination Node or Civic Center (+5% per neighbor within Tessera radius, capped at +25%).

### Add a new layer

The six layers are: `Power`, `Silicon`, `Materials`, `Robotics`, `Closed Loops`, `Life`. Plus `Coordination`.

To add a seventh (say, `Resilience`):
1. Add at least one tile with `"layer": "Resilience"` in `data/tiles.js`.
2. Edit `game.js` → the `NEEDED_LAYERS` constant near the top. Add `"Resilience"`.
3. Reconsider the Tessera definition in `DESIGN.md`. The six layers are canonical per Ben's doc — adding one is an opinionated choice. Document why in your fork.

### Refine a state's sentiment

Open `data/states.js`. Each state is one line. Bump the five scores (`nuclear`, `data_center`, `density`, `enviro`, `fed_trust`) on a -2 to +2 scale. Optionally change `flavor_paper` to a real local paper for that state. Optionally tune `terrain_bias` to make the generated map feel more like that state (more `rural` for Wyoming, more `urban` for New Jersey, etc.).

### Replace the procedural map with a real one

`game.js` → `generateTerrain(stateCode)` is the only place terrain comes from. Replace it with whatever you want:
- A fetch to OpenStreetMap → assign each grid cell a terrain type based on the dominant land-use polygon
- A pre-rendered map image with color-coded pixels for terrain types
- A real lat/lng + bounding box flow using a tile-map service like MapTiler or Mapbox

The board is `BOARD_W × BOARD_H` cells (defaults 20×16). Change those constants at the top of `game.js`.

### Change the win condition

`checkTesserae()` in `game.js`. Currently: `goodwill >= 0` plus all six layers within squared-distance 25 (radius 5) of a Coordination Node. Make it harder by requiring sustained Goodwill for N ticks. Make it easier by lowering the layer requirement. Make it richer by also requiring resource surpluses.

### Change the tick rate

`const TICK_MS = 2000;` at the top of `game.js`. Bigger = slower.

### Make it turn-based instead of real-time

Remove the `setInterval(tick, TICK_MS)` in `startGame`. Add an "End Turn" button somewhere in the HUD that calls `tick()` once. The simulation already works one tick at a time.

## Architecture decisions you might want to undo

- **Single-file game logic.** All of `game.js` is one IIFE. Easy to read end-to-end at v0 size (~450 lines); split into modules when it grows. ES modules require a static server (`file://` blocks them), so we kept globals for now.
- **Re-render-on-mutation.** Each change replaces a chunk of DOM rather than diffing. Fine at this scale. Migrate to a virtual-DOM library (Mithril, Preact) if you outgrow it.
- **No save / load.** Easy to add: serialize `state` to JSON, drop it in `localStorage`. Restore on load.
- **No audio.** Add an `Audio` element and trigger on placement / reactions / Tessera completion.
- **No mobile layout.** The game targets ≥ 1100px wide. A reflow for phone/tablet would be a great contribution.

## Testing

There are no tests. The game is small enough that you can read it end-to-end in 20 minutes. If you add tests, keep them framework-free (or use one of the tiny `<script>`-only assertion libraries) so the no-build-step ethos stays intact.

## Hosting your fork

The easiest path is GitHub Pages:
1. Fork the repo.
2. Settings → Pages → Source: deploy from branch `main` / root.
3. Your fork is now at `https://<your-handle>.github.io/<repo>/`.

itch.io also works: zip the folder, upload as HTML5 project, mark the root index. Free and fast.

## Questions?

Open an issue, post in your fork, or DM Ben. The point is to see what *you* would build.

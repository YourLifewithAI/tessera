# Contributing to Tessera

This is meant to be forked. Hard.

The Tessera and the Arcology are real ideas dressed up as a game. The game's job is to make those ideas easier to imagine. Every fork — every reskin, every new mechanic, every state profile someone refines with real polling data, every UI that makes the board feel lived-in — pulls the idea a little further out of "weird thought experiment" and a little closer to "thing people argue about at dinner."

So: fork it. Make it weirder. Make it prettier. Make it harder. Make it easier. Bring it back to show us what you did.

## What we want forks to do

**Easy wins (no JavaScript knowledge required):**
- **Replace tile art.** Open `tiles/`. Each tile is one SVG file. Drop in your own art (Figma, Illustrator, Inkscape, ProCreate exports, AI-generated, hand-drawn). The game picks them up automatically.
- **Reskin via CSS.** Open `style.css`. The top of the file has CSS variables for every color in the game. Change a few values, save, refresh. Done.
- **Refine state sentiment profiles.** Open `data/states.js`. Each state is one line of editable numbers. Bring better polling data and tune them.
- **Add more headlines.** Open `data/tiles.js` and add to the `HEADLINES` object. The world feels richer the more variety there is.
- **Localize.** Translate the strings in `data/tiles.js`, `data/states.js`, and `game.js`. The Arcology is a global idea.

**Balance forks (zero JS, just edit numbers):**
Strategic qualities of every tile are exposed as plain data in `data/tiles.js`. You can rebalance the entire economy without writing a line of code. Each tile is editable on these axes:
- `cost` — Cycles to place
- `baseGoodwill` — community reaction before state modulation
- `sentimentKey` — which state score (`nuclear`, `data_center`, `density`, `enviro`, `fed_trust`) modulates this tile
- `power`, `compute`, `water`, `food` — per-tick resource flow (negative = consumes)
- `cyclesPerTick` — passive income while placed
- `layer` — which of the six Tessera layers this satisfies

Example: think SMRs should be even more controversial? Change `baseGoodwill: -15` to `-25` in the `smr` entry. Done — the game is harder everywhere, but Texas/Wyoming/Tennessee still tolerate it because their `nuclear` scores amplify it back up. Think vertical farms should produce more food? Bump `food: 20` to `40`. The whole simulation is one open dictionary.

Other balance levers in `game.js`:
- `TICK_MS` — pace of the game
- `TESSERA_RADIUS_SQ` — how spread out a Tessera can be
- The `1.0 + (s * 0.35)` line in `tryPlace()` — how aggressively state sentiment amplifies goodwill swings
- Starting resources in `startGame()`

**Bigger swings (some JS):**
- **Add new tile types.** Edit `data/tiles.js`. See [HACKING.md](HACKING.md) for the recipe.
- **Replace procedural maps with real OSM-derived community maps.** `game.js` → `generateTerrain()` is the only place to change. Pick your favorite town. Build the importer.
- **Visual overhaul.** Replace the DOM-based renderer with Canvas / WebGL / pixi.js. Or keep the DOM but add CSS animations for placements, ripples for reactions, particle effects for Tessera completion.
- **Hex grid instead of square.**
- **Multi-Tessera campaigns.** Win Texas, unlock New York with carried-over Goodwill.
- **Arcology emergence.** After N completed Tesserae in proximity, the camera zooms out, the board re-tiles, and the last three layers (Closed Loops / Life / Coordination) gain new affordances.
- **Negotiation mini-games.** Town halls, op-eds, community-benefits agreements with real trade-offs.
- **Mobile layout.**
- **Audio.** Soundtrack, SFX on placement, voice acting on headlines.
- **Save / load via `localStorage`.**

**Deep swings:**
- **A federated-AI coordination layer** that actually simulates Climate / Flow / Provision / Harmony / Growth / Memory negotiating with each other. The most thesis-real piece of the game; also the hardest.
- **Wire it to the Arcology MCP** so tile parameters are sourced from the real engineering knowledge base.
- **A "real world" mode** that pulls live data — current electricity prices, real moratorium activity, this week's NRC decisions — and adjusts.
- **Multiplayer.** Two planners on the same board.

## Fork the *concept*, not just the code

You don't have to use JavaScript. The Tessera idea, the six layers, the social-license mechanic, the state sentiment model — those are the actual contribution. The web implementation is just one way to render them.

**Strongly encouraged engine forks:**
- **Godot 4 / GDScript** — best fit if you want to grow the simulation into something substantial. (We actually built a Godot version first; it lived for about an hour before we pivoted to web for shareability. The patterns transfer cleanly.)
- **Unity / C#** — if you want polished 3D, isometric views, or platform exports.
- **Unreal / Blueprint** — for the photoreal "what would a Tessera actually look like" version.
- **Bevy / Rust** — for the people who insist on Rust.
- **Pygame / Python** — easiest to teach with; great for classrooms.
- **Tabletop.** No engine at all. Print the tiles on cardstock. Write the state profiles on index cards. Play with friends around a table. This might be the truest form of the game.

**How concept-forks work:**
1. Read `DESIGN.md` for the spec.
2. Port `data/tiles.js` and `data/states.js` to your engine's preferred format. They're just dictionaries.
3. Implement the placement loop, sentiment modulation, and Tessera detection. Each is one short function in `game.js` — translate the logic.
4. Render however your engine likes.
5. License your fork however you like. MIT means we don't care.
6. Tag it the same way (`#tessera-game`, `#arcology-game`) so others can find your version.

The world doc (`A New Town, Built Whole`) is the constitutional source. The mechanics doc (`DESIGN.md`) is engine-agnostic. The data files are easy translations. Everything else is style.

## How to share back

This isn't a project that needs PRs. It's a project that wants forks. The point is to see what *you* would build.

- **Post your fork.** Host it on GitHub Pages (free, two clicks), itch.io (also free), Neocities, anywhere.
- **Tag it** `#tessera-game` or `#arcology-game` so others can find it.
- **Write about it.** If you change something interesting, post a one-paragraph explanation. Send Ben the link.
- **Don't ask permission.** Just build.

If you want your changes upstreamed into this canonical repo, open a PR — but understand the bar is "does this serve the v0 thesis cleanly?" Most contributions will live more usefully as their own forks.

## Hosting your fork on GitHub Pages

1. Fork this repo.
2. Settings → Pages → Source: deploy from `main` branch, `/ (root)`.
3. Your fork lives at `https://<your-username>.github.io/<repo-name>/`.

Zero config, free, automatic.

## Code conventions

- Vanilla JavaScript. No framework. No build step. No npm.
- 2-space indentation.
- `camelCase` for functions and variables, `SCREAMING_SNAKE` for constants.
- Comments at section boundaries (`// === SECTION ===`).
- Data is separate from logic. `data/tiles.js` and `data/states.js` are pure data; forkers should be able to mod them without touching `game.js`.

## What's deliberately missing from v0

See `DESIGN.md` § "What v0 deliberately doesn't have." If you want to build any of those things, that *is* the invitation.

## License

MIT. Use it however. The world doc ("A New Town, Built Whole") is Ben's writing — same MIT terms apply unless he says otherwise.

## Code of conduct

Be kind. Argue about ideas, not people. Don't punch down. If someone forks Tessera into something you find ugly, build a better fork instead of fighting.

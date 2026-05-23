# Tessera

*A board-game-feel city-builder about the Tessera and the Arcology.*

> **This is meant to be forked.** Open source, MIT, no gatekeeping. The Tessera is a real idea dressed up as a game; the game's job is to make the idea easier to imagine. If you build a better version, a prettier version, a weirder version — bring it back so others can see it. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## How to play

**Easiest way:** open `index.html` in any modern browser. Double-click the file. The game runs.

**On the web:** if a fork is hosted on GitHub Pages or itch.io, just click the link. No install.

**Local development:** if your browser doesn't like `file://` for some reason, run a one-line static server:
```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

That's it. No npm. No build step. No framework. No download other than the source.

## What this is

You pick a US state. You get a community board calibrated to that state's profile — Texas reads rural and tolerant of reactors, Vermont reads green and allergic to data centers, Virginia loves the SMR but is currently filing moratoriums against the data center. You place tiles: SMR, solar+battery, data center, chip fab, mass-timber housing, vertical farm, robotics factory, civic center, coordination node. Each placement triggers a community reaction calibrated to that state. Build enough trust and balance to complete your first Tessera — the seven-layer neighborhood that, eventually, mosaics into the Arcology.

It is small. It is opinionated. It is meant to grow.

## The Tessera

A Tessera is a single, full-stack community made of six layers plus a coordination layer:

1. **Power** — SMR + solar + grid batteries, behind-the-meter
2. **Silicon** — colocated data center + mature-node fab
3. **Materials** — mass timber, modular construction, AI-run ops
4. **Robotics** — wheeled, quadruped, gantry bots (no humanoids yet)
5. **Closed Loops** — water recycle, anaerobic digester, vertical farm
6. **Life** — modular housing, schools, clinics, walkable transit, public art
7. **Coordination** — federated facility AI + community-benefits governance

Source: Ben Corpron, *A New Town, Built Whole* (May 2026). See `DESIGN.md` for the v0 mapping from layers to tiles.

## Controls

- **Mouse** — click a tile in the tray on the right, then click a cell on the board to place it.
- **Right-click / Esc** — deselect the current tile.
- **R** — restart with the same state.
- **B** — back to the state picker.
- **Enter** (on win screen) — pick a new state.

## v0 status

Playable. State select → board → place tiles → community reacts → complete one Tessera → win. Nine tile types. Fifty state profiles. Procedural state-flavored maps. SVG tile art that artists can swap freely.

Deliberately missing (these are *invitations*, see `CONTRIBUTING.md`):
- Real OSM-derived community maps
- Multi-Tessera campaigns
- Full Arcology emergence (the long game)
- Negotiation mini-games for town halls and CBAs
- Sound, animation, particle effects
- Save / load

## File layout

```
index.html         — open this in a browser
style.css          — colors, layout, typography (most reskinning happens here)
game.js            — game logic (state machine, render, input, tick)
data/tiles.js      — the nine tile types
data/states.js     — fifty state sentiment profiles
tiles/             — SVG art per tile (drop in replacements freely)
icon.svg           — app icon / favicon
DESIGN.md          — the design doc
CONTRIBUTING.md    — what kinds of forks are welcome
HACKING.md         — how the code is structured + common mod recipes
LICENSE            — MIT
```

## A note from the author

I'm building this because the Arcology is a serious idea that nobody has seen the whole shape of. The pieces — SMRs, fabs, vertical farms, mass-timber housing, federated facility AI — exist. The integration doesn't. The Tessera is what the integration looks like at neighborhood scale. The Arcology is what it looks like at city scale.

A game won't build the thing. But a game that's been forked a hundred times, in a hundred different visual styles, with a hundred different mechanics, by a hundred different people, *will* make the thing easier to argue about — and the thing won't get built until enough people can argue about it credibly.

So: fork it. Make it prettier than mine.

— Ben Corpron

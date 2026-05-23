# Tessera — Design Doc

*A board-game-feel city-builder where you place the seven-layer Tessera into real American communities, fighting (or earning) social license one town hall meeting at a time.*

---

## North Star

You are a planner trying to convince an American community to host a Tessera — a full-stack neighborhood with its own reactor, fab, data center, robotics line, closed loops, and modular housing. The infrastructure is the easy part. **The hard part is the community.** Every tile you place triggers a reaction calibrated to the state you picked. Build trust by leading with housing, schools, and parks. Drop an SMR next to an elementary school in a moratorium state and you lose your social license overnight.

The win for v0 is your first complete Tessera. The long game (v1+) is mosaicking enough Tesserae into a full Arcology.

---

## The Tessera (canonical)

A Tessera is **a single, full-stack community** made of six layers plus a coordination layer. Source: *A New Town, Built Whole* (Ben Corpron, May 2026).

| Layer | What it is | Tile examples in v0 |
|---|---|---|
| **1. Power** | SMR + solar + grid batteries, behind-the-meter | SMR, Solar+Battery Array |
| **2. Silicon** | Data center + mature-node fab (not cutting edge) | Data Center, Chip Fab |
| **3. Materials** | Mass timber, modular construction, AI-run ops | Mass Timber Housing |
| **4. Robotics** | Wheeled bots, quadrupeds, gantries — *no humanoids in Tessera era* | Robotics Factory |
| **5. Closed Loops** | Water recycle (50–60%), digester biogas, vertical farm | Vertical Farm, Water/Waste Plant |
| **6. Life** | Modular housing (everyone same sq ft), schools, clinics, parks, transit | Civic Center |
| **+ Coordination** | Federated AI (Climate/Flow/Provision/Harmony/Growth/Memory) + community-benefits governance | Coordination Node |

A Tessera completes when a contiguous cluster contains **at least one tile from each of the six layers** AND a **Coordination Node** within radius AND **Goodwill ≥ 0**. The Coordination Node is what turns a pile of infrastructure into a Tessera.

---

## v0 Game Loop

1. **Title → State Select.** Pick any of the 50 US states. Sentiment profile loads.
2. **Community Board.** A 20×16 grid generated to feel like a community in that state. Terrain types (Urban / Suburban / Rural / Industrial / Riverfront / Highway / Park / Existing Civic) determine what can go where.
3. **Tile Tray.** Nine tile types on the side. Click to select. Each shows cost (Cycles), goodwill delta (varies by state), and resource effects.
4. **Place Tile.** Click an eligible cell. Tile renders. Cycles deduct. A reaction fires:
   - Goodwill shifts by `base_delta * state_sentiment_modifier * adjacency_penalty`.
   - A flavor message appears ("**Burleson Tribune**: 'New reactor proposal draws standing-room crowd.'").
5. **Tick.** Every 2 seconds: resources update from placed tiles. Imbalance (no power, no water, no food) drains goodwill and stalls population growth.
6. **Tessera Forms.** Cluster check fires after every placement. When the 6-layer + Coordination condition is met, **Tessera Complete** banner fires. v0 win.

---

## State Sentiment Model

Each state has a profile with five scores (-2 to +2):

| Score | What it modulates |
|---|---|
| `nuclear` | Goodwill delta from SMR placement |
| `data_center` | Goodwill delta from Data Center / Fab |
| `density` | Goodwill from Mass Timber Housing (high density) |
| `enviro` | Goodwill from Vertical Farm / Closed Loops |
| `fed_trust` | Goodwill from anything that looks federal-program-funded (Civic, Coordination Node) |

Profiles are hand-encoded from real data:
- **Data Center Watch** moratorium tracker (PA, VA pushback; TX, AZ tolerant)
- **Quinnipiac AI Trust Poll, Mar 2026** (younger Americans warier; rural/urban split)
- **NRC SMR licensing posture** and state-level nuclear acceptance (TN, WY, TX permissive; CA, NY restrictive)
- **Housing density tolerance** from state YIMBY/zoning indicators
- **Federal trust** as a rough rural-urban / partisan composite

These are *gestural* profiles for v0, not policy science. Refine with real survey microdata in v1+.

---

## Tile Catalog (v0)

| Tile | Layer | Cost (Cycles) | Base Goodwill | Notes |
|---|---|---|---|---|
| SMR | Power | 80 | -15 | Heavily modulated by `nuclear`. Required for full Tessera. |
| Solar+Battery | Power | 25 | +2 | Low-controversy power. Doesn't fully replace SMR for big loads. |
| Data Center | Silicon | 60 | -8 | Heavily modulated by `data_center`. |
| Chip Fab | Silicon | 70 | -3 | Creates manufacturing jobs — softer reaction than data center. |
| Mass Timber Housing | Life/Materials | 30 | +5 / -5 | Positive in pro-density states, negative in NIMBY states. |
| Robotics Factory | Robotics | 50 | -4 | Modulated by job-displacement concern. |
| Vertical Farm | Closed Loops | 35 | +6 | Modulated by `enviro`. Quietly popular. |
| Civic Center | Life | 40 | +12 | Schools, clinics, parks. Always goodwill-positive. Lead with this. |
| Coordination Node | Coordination | 100 | -2 | Required to complete a Tessera. Modulated by `fed_trust`. |

**Cycles regen:** see "Economic substrate" below. Cycles are now redefined as *quarterly community-investable capital*; tiles draw capex, accrue opex, and produce revenue.

**Starting resources:** 250 Cycles, 50 Goodwill, 0 of everything else.

---

## Economic substrate (v0.1)

The foundation pass adds an explicit economic layer beneath the social-license game. The thesis remains: **the hard part is the community.** Economics is a means of making lived experience and regional spillover legible — not the new win condition.

### Cycles, redefined

A Cycle is one unit of quarterly community-investable capital. A tick now anchors to one calendar quarter (`TICK_MS = 4000`, `TICKS_PER_YEAR = 4`); the HUD shows `Year N · Q M`. The old "Cycles regen" rule is replaced by the cash flow:

> `Δcycles = round(Σ tile.revenue × TFP − Σ tile.opex)`

Existing forks keep working: `cyclesPerTick` is read as a fallback for `revenue`, and `cost` is read as a fallback for `capex`.

### Per-tile fields (all optional, 0 defaults)

| Field | Meaning |
|---|---|
| `capex` | one-time placement cost (Cycles) |
| `opex` | recurring operating drain (Cycles/quarter) |
| `revenue` | recurring output sold (Cycles/quarter) |
| `jobsConstruction` | one-time build labor |
| `jobsOps` | permanent operating jobs |
| `emissionsPerTick` | net carbon flow, kt CO₂e/quarter (negative = avoided) |
| `waterDrawPerTick` | net regional water draw, ML/quarter |

Numbers in `data/tiles.js` are gestural but defensible — citations to EIA, BLS, NRC, DOE are inline in the file.

### Total-factor productivity (TFP)

Each revenue-producing tile gets a 5% revenue multiplier per **Coordination Node or Civic Center** within the Tessera radius (5 tiles), capped at 1.25×. This is the model's hook for the agglomeration claim in *A New Town, Built Whole*: federated AI plus civic infrastructure makes the whole block more productive.

### New goodwill rules (with reasons)

Every goodwill change now surfaces its cause in the reaction popup. The two new rules:

- **Emissions rule.** If `cumulativeEmissions / yearsElapsed > state.emissionsCap` (default 120 kt/yr; see `data/states.js` for the strict and permissive states): −1 goodwill/tick with the message *"Emissions outpacing the state cap. Neighbors are organizing."*
- **Jobs rule.** If `jobsOps ≥ 0.5 × population` and goodwill < 100: +1 goodwill per game-year (not per tick) with the message *"Strong local employment — community supports the project."*

### Accumulators vs rates

`cumulativeEmissions` and `cumulativeWaterDraw` grow unboundedly. **Rules always compare against a rate** (`cumulative / yearsElapsed`), never the raw stock. This keeps long sessions winnable and lets the next pass show "this Tessera has emitted N kt since groundbreaking" without that number becoming a doom counter.

### What this enables next

The next two passes — lived-experience and regional spillover — read from these fields without further schema change. A `state.policies = {}` hook is reserved for a v0.2 policy layer (community-benefit agreements, PILOTs, zoning) that will sit between tiles and outcomes as multipliers.

---

## Win Condition (v0)

- One Tessera complete (all 6 layers in a 5-tile-radius cluster + Coordination Node)
- Goodwill ≥ 0 sustained for 5 ticks after completion
- Show **TESSERA COMPLETE** banner with state, Cycles spent, Goodwill, time-to-complete

v1+: Multi-Tessera chains. Arcology emergence. Real OSM maps. Federated-AI governance UI.

---

## What v0 deliberately doesn't have

- **Real OSM maps.** Procedural state-flavored maps stand in. Real maps are v1+ — they require tile servers, geocoding, and a lot of engineering for diminishing v0 returns. The sentiment layer is where the actual game is.
- **Humanoid robots.** Per Ben's doc, Tessera era is task-specific bots. No humanoids until Arcology era.
- **Full Arcology emergence.** First Tessera is the v0 win. Arcology is the v1 stretch.
- **Save/load.** Sessions are short. Add later.
- **Sound/music.** Add later.
- **Multiplayer / replay.** Way later, if ever.

---

## Architecture

```
D:\Ben's Game\Ben's Game\
├── index.html        # entry point — open in any modern browser
├── style.css         # palette, layout, typography (most reskins live here)
├── game.js           # state machine + render + input + tick loop
├── data/
│   ├── tiles.js      # 9 tile definitions + headline pool
│   └── states.js     # 50 state sentiment profiles
├── tiles/            # SVG art per tile (swap freely)
├── icon.svg
├── README.md         # how to run
├── DESIGN.md         # this file
├── CONTRIBUTING.md   # what kinds of forks are welcome
├── HACKING.md        # how the code is structured + common mod recipes
└── LICENSE
```

Vanilla JS. No framework, no build step. `index.html` loads `data/tiles.js`, `data/states.js`, then `game.js`; the IIFE in `game.js` bootstraps the state-select screen on `DOMContentLoaded`. When the game grows, split `game.js` into per-screen modules.

---

## Open design questions (for Ben)

1. **Failure state.** If Goodwill hits -50, do you lose? Or does construction halt? Or does the community vote you out (animation, restart)?
2. **Tile rotation / variants.** Carcassonne tiles have edges that must match. Should ours? Or is the "qualities" mechanic enough?
3. **Time pressure.** Real-time ticks, or turn-based? v0 is real-time with slow ticks. Turn-based may fit board-game feel better.
4. **Multi-state campaigns.** Once you complete a Tessera in one state, do you unlock another?
5. **Real maps.** Push to v1 or do them earlier? They're a heavy lift but they're the thesis-most-real version.

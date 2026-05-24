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
2. **Place Select** *(if places exist for the state)*. Pick a county; per-city sentiment, expressed needs and concerns, and a "how we got here" history load.
3. **Sponsor Select.** Pick a knockoff hyperscaler. Their annual capex becomes your starting budget; their public reputation seeds your goodwill.
4. **Community Board.** A 20×16 grid generated to feel like a community in that state. Terrain types (Urban / Suburban / Rural / Industrial / Riverfront / Highway / Park / Existing Civic) determine what can go where.
5. **Tile Tray.** Nine tile types on the side. Click to select. Each shows capex in dollars, goodwill delta (varies by state), and resource effects.
6. **Place Tile.** Click an eligible cell. Tile renders. Budget deducts. A reaction fires:
   - Goodwill shifts by `base_delta * state_sentiment_modifier * adjacency_penalty`, plus a per-city needs/concerns layer when a place is loaded.
   - A flavor message appears ("**Burleson Tribune**: 'New reactor proposal draws standing-room crowd.'").
7. **Tick.** Every 2 seconds (= one calendar quarter): tile revenue (in dollars) hits the budget, opex drains it. Imbalance (no power, no water, no food) drains goodwill and stalls population growth.
8. **Tessera Forms.** Cluster check fires after every placement. When the 6-layer + Coordination condition is met, **Tessera Complete** banner fires. v0 win.

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

## Tile Catalog (v0.3 — dollars)

| Tile | Layer | Capex | Base Goodwill | Notes |
|---|---|---|---|---|
| SMR | Power | $4B | -15 | Heavily modulated by `nuclear`. Required for full Tessera. |
| Solar+Battery | Power | $150M | +2 | Low-controversy power. Doesn't fully replace SMR for big loads. |
| Data Center | Silicon | $2.5B | -8 | Heavily modulated by `data_center`. |
| Chip Fab | Silicon | $3.5B | -3 | Creates manufacturing jobs — softer reaction than data center. |
| Mass Timber Housing | Life/Materials | $200M | +5 / -5 | Positive in pro-density states, negative in NIMBY states. |
| Robotics Factory | Robotics | $800M | -4 | Modulated by job-displacement concern. |
| Vertical Farm | Closed Loops | $80M | +6 | Modulated by `enviro`. Quietly popular. |
| Civic Center | Life | $250M | +12 | Schools, clinics, parks. Always goodwill-positive. Lead with this. |
| Coordination Node | Coordination | $400M | -2 | Required to complete a Tessera. Modulated by `fed_trust`. |

Capex anchors to publicly reported costs (NuScale SMR module band, hyperscale datacenter module costs, mature-node fab references, multifamily timber construction per-unit costs). See `data/tiles.js` header for source list.

**Budget regen:** see "Economic substrate" below. Each tile draws capex on placement; opex and revenue flow each quarter; the budget grows or shrinks accordingly.

**Starting resources:** sponsor-determined budget ($35B–$110B), 50 ± sponsor goodwill modifier, 0 of everything else.

---

## Place data (v0.2)

Tessera baseline data is anchored to **January 1, 2025**. A play session represents the present (**Q2 2026**). The Jan 2025 → present stretch is *backstory* — applied as a stream of dated updates with `reason` strings to derive the player's starting state. Players see "how we got here" before they ever place a tile.

### What we ship vs. what forks supply

We ship the **schema** and the **adapter contract**, plus one demo place (Burleson County, TX) so the game runs out of the box. We do not ship comprehensive per-place data. Forks populate places one of two ways:

1. **Local subscription pattern.** Drop a JS file in `data/places/` that registers itself on `window.TesseraPlaces`. Add a `<script>` tag in `index.html`. The default adapter picks it up. This is the path for hand-curated data or for shipping a data pack alongside a fork.
2. **Custom adapter.** Replace `window.TesseraData` with any object implementing the three contract methods (see below). Fetch from a real API with the player's own key, read from IndexedDB, pull from a subscription feed — whatever the fork wants.

Either way, sensitive data and API keys stay on the player's machine. The base repo ships no keys.

### Adapter contract

```js
// Any object on window.TesseraData with these three methods:
listPlaces():        Array<{ id, displayName, state, county }>
getBaseline(placeId): BaselineRecord | null   // Jan 2025 snapshot
getUpdates(placeId):  Array<UpdateRecord>     // chronological
```

The shipped scaffold also provides `derivePresent(placeId, asOfDate)` which applies updates in order to the baseline and returns `{ present, appliedUpdates }`.

### Data model (county + city)

Each place is a **county** carrying macro-level data (demographics, generation mix, water, traffic, existing data centers and large industrial sites) with a list of **cities** under it carrying the felt-experience data (per-city sentiment, expressed needs, expressed concerns, adjacencies). The Tessera is conceptually built *in* a city; adjacent cities feel the spillover.

- **Sentiment** is a distribution per topic: `{ for, against, dontKnow }` summing to 1.0. Topics align with tile ids (`smr`, `datacenter`, `fab`, `robotics`, `housing`, `farm`, `civic`, `coordination`). The 3-category form replaces the −2..+2 state scalar at the city level; the scalar still drives the headline modifier as a fallback when no place is loaded.
- **Expressed needs** name `addressedBy: [tileId, ...]` — placing one of those tiles is what would address the need. Priority is `low | medium | high`.
- **Expressed concerns** name `triggeredBy: [tileId, ...]` — placing one of those tiles is what would set the concern off.

### City needs/concerns rule (the spillover mechanic)

When the player places a tile, every city in the loaded place reacts:

- For each expressed **need** addressed: `+priority` to goodwill (low=+1, medium=+2, high=+3).
- For each expressed **concern** triggered: `-priority` to goodwill.
- Active city contributes at weight **1.0**. Other cities (spillover) at **0.4**.

The reaction popup names which cities reacted and why ("Caldwell: addresses healthcare access (+3) · Snook: triggers water draw (-1)"). The active city defaults to the county seat; the player switches it by clicking a city chip in the place-context panel.

### Updates stream

Each `UpdateRecord` carries `date` (YYYY-MM), `scope` (`"county"` or `"city:<id>"`), `field` (dotted path), one of `{ change | set | add }`, and a `reason` string. The reason is the most important field — it's what tells the player why the world they're inheriting looks the way it does. Examples in `data/places/tx-burleson.js`.

### What this does NOT do yet

- No per-tick mutation of place sentiment from gameplay (placement updates goodwill but not the underlying `sentiment.{topic}` distributions). A v0.3 pass can feed gameplay events back into the place record.
- No animated "how we got here" timeline scrub. The history panel is a static list, expandable from the place-context bar.
- No multi-place gameplay. One place per session.
- No persistence between sessions.

---

## Research tree (v0.4)

A 15-node tech tree sits behind a button in the HUD. The thesis stays: **the hard part is the community.** Most research nodes are levers on community-friction (softening specific concerns, amplifying specific needs); a few tune economics; four unlock new tile types.

### Mechanics

- **One research at a time.** Picking a node deducts its `costM` from the sponsor budget immediately and starts a per-quarter timer. Cancel before completion = no refund.
- **Prereqs are explicit.** Each node lists `prereqs: [id, ...]`. Locked nodes cannot be started; completing a prereq unlocks downstream nodes.
- **Sponsor starting research.** Each sponsor begins with 1 node already completed reflecting their bias (MWS / xAGI start with `closed_loop_cooling`; Mikrohard with `modular_smr`; Moogle with `chips_apprenticeship`; Beta with `pilot_template`; Hortacle with `process_water_recycling`).
- **Effects apply live.** `tile_field_mult` / `_add` modify capex, opex, revenue, emissions, water draw for placements *and* the tray display. `concern_softener` / `need_amplifier` scale priority weights in the city needs/concerns scoring rule (e.g., "Closed-Loop DC Cooling" multiplies Caldwell's water-draw concern by 0.5 specifically for datacenters). `tile_goodwill_add` shifts baseGoodwill (positive values soften the malus). `global_capex_mult` and `layer_field_mult` scope globally or to a layer.
- **Tile unlocks** live as `unlockedBy: "<research_id>"` on the tile def. The tray hides the tile until research completes. Four ship: Geothermal Loop (Power), Algae Bioreactor (Closed Loops), Humanoid Pilot Line (Robotics), Federated Training Cluster (Coordination).

### The 15-node tree

| Category | Nodes |
|---|---|
| **Power** | Modular SMR Standard Design → SMR Community-Benefits Standard · Enhanced Geothermal Pilot *(unlocks Geothermal Loop)* |
| **Water** | Closed-Loop DC Cooling Retrofit → Liquid-Cooled Compute Modules · Fab Process-Water Recycling → Algae Bioreactor Loop *(unlocks Algae Bioreactor)* |
| **Workforce** | CHIPS Apprenticeship Pipeline · Robotics Trade-School Partnership → Humanoid Production Pilot *(unlocks Humanoid Pilot Line)* |
| **Community** | PILOT Agreement Template → Community Benefits Agreement Playbook → PACE Clean-Energy Financing |
| **Efficiency** | Modular Construction Pipeline · *(also under Community)* CBA Playbook → Federated AI Training Cluster *(unlocks Federated Training Cluster)* |

Costs range $80M–$500M, durations 2–6 quarters. Each node carries a `realWorld` field naming the analog that inspired it (NuScale VOYGR, TSMC AZ water recycling, Maricopa-TSMC apprenticeship pact, Fervo Cape Station, etc.).

### What this does NOT do yet

- No research-cost discounts per sponsor focus (the chosen "starting research" path was kept simple).
- No mid-game node insertion or branching by place — every place sees the same tree.
- No save/load. Pre-completed nodes are recomputed from the sponsor each `startGame`.
- New-tile art is placeholder (reuses the closest existing SVG). v0.5: real art.

---

## Economic substrate (v0.3 — dollars)

The economic layer sits beneath the social-license game. The thesis remains: **the hard part is the community.** Economics makes lived experience and regional spillover legible — it is not the new win condition.

### Money is dollars

All monetary values are stored as **millions of US dollars** and formatted at display time (`$X.XB` / `$XXXM`). One tick is one calendar quarter (`TICK_MS = 4000`, `TICKS_PER_YEAR = 4`); the HUD shows `Year N · Q M`. Each quarter:

> `Δbudget = round(Σ tile.revenue × TFP − Σ tile.opex)`

Capex anchors to publicly reported real-world project costs: NuScale/X-energy SMR module (~$4B), hyperscale datacenter module (~$2.5B), mature-node fab (~$3.5B), multifamily timber midrise (~$200M), etc. Revenue is tuned for 3–6 year payback before TFP, so cash flow matters but does not trivialize the sponsor budget.

### Sponsor (knockoff hyperscaler) seeds the budget

The player picks a sponsor at game start. Each sponsor brings:
- A **starting budget** equal to roughly one year of that hyperscaler's real annual capex ($35B–$110B).
- A **starting goodwill modifier** (e.g. xAGI −10 for move-fast reputation, Moogle +2 for civic halo).
- A **paper of record** that shows up in headlines (e.g. "MWS All-Hands Memo").

Sponsors are defined in `data/sponsors.js`. Six ship: MWS, Mikrohard Azurr, Moogle Cloud, Beta Platforms, xAGI, Hortacle Cloud. Forks edit budgets, add sponsors, or replace the lineup wholesale.

### Per-tile fields (all optional, 0 defaults)

| Field | Meaning | Units |
|---|---|---|
| `capex` | one-time placement cost | $M |
| `opex` | recurring operating drain | $M/quarter |
| `revenue` | recurring output sold | $M/quarter |
| `jobsConstruction` | one-time build labor | person-quarters |
| `jobsOps` | permanent operating jobs | headcount |
| `emissionsPerTick` | net carbon flow (negative = avoided) | kt CO₂e/quarter |
| `waterDrawPerTick` | net regional water draw (negative = produced) | ML/quarter |

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
- Show **TESSERA COMPLETE** banner with state, budget remaining, Goodwill, time-to-complete

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

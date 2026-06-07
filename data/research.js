// ===============================================================
// Research catalog (v0.4)
//
// Each node has: id, name, category, description, costM (research
// budget in millions), durationQuarters, prereqs, col/row (grid
// position for the visual graph), effects, realWorld (source/anchor).
//
// EFFECT TYPES (applied via getEffectiveTile / city scoring):
//
//   tile_field_mult       — multiply a numeric field on a tile def
//                           { tileId, field, factor }
//   tile_field_add        — add to a numeric field on a tile def
//                           { tileId, field, delta }
//   tile_goodwill_add     — add to a tile's baseGoodwill (typically + to soften malus)
//                           { tileId, delta }
//   layer_field_mult      — multiply a field on every tile in a layer
//                           { layer, field, factor }
//   global_capex_mult     — multiply capex on every tile
//                           { factor }
//   global_goodwill_floor_add — raise negative baseGoodwill toward 0 by delta
//                           { delta }
//   concern_softener      — scale a city's concern priority when the tile is placed
//                           { tileId, issueMatch (substring; optional), factor }
//   need_amplifier        — scale a city's need-addressed priority
//                           { tileId, issueMatch (substring; optional), factor }
//
// Tile unlocks are NOT effects — they live on the tile def itself as
// `unlockedBy: "<research_id>"`. The tray filters tiles by
// isTileUnlocked().
//
// Forks: edit costs, add nodes, rework the graph. To add a node, give
// it a fresh col/row and update prereqs; the renderer picks it up.
// ===============================================================

window.RESEARCH = {

  // ----------------------- Power -----------------------
  modular_smr: {
    id: "modular_smr",
    name: "Modular SMR Standard Design",
    category: "Power",
    description: "Factory-built reactor modules with NRC standard design certification; cuts on-site construction 15%.",
    costM: 200, durationQuarters: 4, prereqs: [], col: 0, row: 0,
    effects: [
      { type: "tile_field_mult", tileId: "smr", field: "capex", factor: 0.85 },
    ],
    realWorld: "NuScale VOYGR-12 / X-energy Xe-100 standardization push.",
  },
  smr_cba: {
    id: "smr_cba",
    name: "SMR Community-Benefits Standard",
    category: "Power",
    description: "Standard CBA template: local hiring, water-rights covenants, dual-use heat agreements. Softens water concerns; +5 to base goodwill.",
    costM: 150, durationQuarters: 3, prereqs: ["modular_smr"], col: 1, row: 0,
    effects: [
      { type: "tile_goodwill_add", tileId: "smr", delta: 5 },
      { type: "concern_softener", tileId: "smr", issueMatch: "water", factor: 0.6 },
    ],
    realWorld: "TVA Clinch River / Energy Northwest CBA templates.",
  },
  geothermal: {
    id: "geothermal",
    name: "Enhanced Geothermal Pilot",
    category: "Power",
    description: "Unlocks the Geothermal Loop tile — quiet baseload, no water draw, broadly popular.",
    costM: 400, durationQuarters: 6, prereqs: [], col: 2, row: 0,
    effects: [],
    realWorld: "Fervo Energy Cape Station NV (2024); Eavor Loop AB (2023).",
  },

  // ----------------------- Water -----------------------
  closed_loop_cooling: {
    id: "closed_loop_cooling",
    name: "Closed-Loop DC Cooling Retrofit",
    category: "Water",
    description: "Air-cooled and recirculating-water datacenter designs; cuts process water 60%; softens local water concerns.",
    costM: 300, durationQuarters: 4, prereqs: [], col: 0, row: 1,
    effects: [
      { type: "tile_field_mult", tileId: "datacenter", field: "waterDrawPerTick", factor: 0.4 },
      { type: "concern_softener", tileId: "datacenter", issueMatch: "water", factor: 0.5 },
    ],
    realWorld: "Microsoft Goodyear AZ (2024); Meta Eagle Mountain UT (2023).",
  },
  liquid_cooled_compute: {
    id: "liquid_cooled_compute",
    name: "Liquid-Cooled Compute Modules",
    category: "Water",
    description: "Higher-density GPU pods on liquid cooling loops; -10% datacenter capex per MW, +15% revenue.",
    costM: 400, durationQuarters: 5, prereqs: ["closed_loop_cooling"], col: 1, row: 1,
    effects: [
      { type: "tile_field_mult", tileId: "datacenter", field: "capex", factor: 0.9 },
      { type: "tile_field_mult", tileId: "datacenter", field: "revenue", factor: 1.15 },
    ],
    realWorld: "Nvidia GB200 NVL72; CoolIT CHx series.",
  },
  process_water_recycling: {
    id: "process_water_recycling",
    name: "Fab Process-Water Recycling",
    category: "Water",
    description: "Ultra-pure water recycling for chip fabs; cuts fab water draw 50%; softens fab water concerns.",
    costM: 200, durationQuarters: 4, prereqs: [], col: 0, row: 2,
    effects: [
      { type: "tile_field_mult", tileId: "fab", field: "waterDrawPerTick", factor: 0.5 },
      { type: "concern_softener", tileId: "fab", issueMatch: "water", factor: 0.5 },
    ],
    realWorld: "TSMC AZ recycling (~65%); Intel Ocotillo similar program.",
  },
  algae_carbon_loop: {
    id: "algae_carbon_loop",
    name: "Algae Bioreactor Loop",
    category: "Water",
    description: "Unlocks the Algae Bioreactor tile — net-negative emissions, net-positive water.",
    costM: 350, durationQuarters: 5, prereqs: ["process_water_recycling"], col: 1, row: 2,
    effects: [],
    realWorld: "Brilliant Planet biomass sequestration (Morocco, 2024).",
  },

  // ----------------------- Workforce -----------------------
  chips_apprenticeship: {
    id: "chips_apprenticeship",
    name: "CHIPS Apprenticeship Pipeline",
    category: "Workforce",
    description: "Community-college partnerships for fab technicians; strengthens fab 'jobs near home' appeal; +2 to base goodwill.",
    costM: 100, durationQuarters: 3, prereqs: [], col: 0, row: 3,
    effects: [
      { type: "need_amplifier", tileId: "fab", issueMatch: "jobs", factor: 1.5 },
      { type: "need_amplifier", tileId: "fab", issueMatch: "young people", factor: 1.5 },
      { type: "tile_goodwill_add", tileId: "fab", delta: 2 },
    ],
    realWorld: "Maricopa CC + TSMC AZ (2023); Blinn College + Samsung Taylor.",
  },
  robotics_trade_school: {
    id: "robotics_trade_school",
    name: "Robotics Trade-School Partnership",
    category: "Workforce",
    description: "Direct-hire pipeline for robotics technicians; strengthens jobs appeal; +2 to base goodwill.",
    costM: 150, durationQuarters: 3, prereqs: [], col: 1, row: 3,
    effects: [
      { type: "need_amplifier", tileId: "robotics", issueMatch: "jobs", factor: 1.5 },
      { type: "tile_goodwill_add", tileId: "robotics", delta: 2 },
    ],
    realWorld: "Boston Dynamics + Hartford CC; Agility + Oregon trade schools.",
  },
  humanoid_pilot: {
    id: "humanoid_pilot",
    name: "Humanoid Production Pilot",
    category: "Workforce",
    description: "Unlocks the Humanoid Pilot Line tile — high revenue, loud displacement concerns.",
    costM: 500, durationQuarters: 6, prereqs: ["robotics_trade_school"], col: 2, row: 3,
    effects: [],
    realWorld: "Figure AI + BMW (2024); Apptronik Apollo at Mercedes.",
  },

  // ----------------------- Community -----------------------
  pilot_template: {
    id: "pilot_template",
    name: "PILOT Agreement Template",
    category: "Community",
    description: "Payment-in-lieu-of-taxes agreement with municipal schools; softens housing 'school capacity' concerns 60%.",
    costM: 80, durationQuarters: 2, prereqs: [], col: 0, row: 4,
    effects: [
      { type: "concern_softener", tileId: "housing", issueMatch: "school", factor: 0.4 },
    ],
    realWorld: "Loudoun County VA PILOT framework (2023).",
  },
  cba_playbook: {
    id: "cba_playbook",
    name: "Community Benefits Agreement Playbook",
    category: "Community",
    description: "Standard CBA negotiation playbook; raises all negative baseGoodwill by 1 toward 0.",
    costM: 200, durationQuarters: 4, prereqs: ["pilot_template"], col: 1, row: 4,
    effects: [
      { type: "global_goodwill_floor_add", delta: 1 },
    ],
    realWorld: "Jobs to Move America CBA toolkit; LA Metro CBA framework.",
  },
  pace_financing: {
    id: "pace_financing",
    name: "PACE Clean-Energy Financing",
    category: "Community",
    description: "Property-Assessed Clean Energy long-term financing; -10% capex on all Power-layer tiles.",
    costM: 250, durationQuarters: 4, prereqs: ["cba_playbook"], col: 2, row: 4,
    effects: [
      { type: "layer_field_mult", layer: "Power", field: "capex", factor: 0.9 },
    ],
    realWorld: "PACENation directory; ~40 states offer C-PACE.",
  },

  // ----------------------- Efficiency -----------------------
  modular_construction: {
    id: "modular_construction",
    name: "Modular Construction Pipeline",
    category: "Efficiency",
    description: "Factory-built modules across all on-site construction; -8% capex globally.",
    costM: 500, durationQuarters: 6, prereqs: [], col: 0, row: 5,
    effects: [
      { type: "global_capex_mult", factor: 0.92 },
    ],
    realWorld: "Veev / Boklok / Factory_OS (post-Katerra generation).",
  },
  federated_training: {
    id: "federated_training",
    name: "Federated AI Training Cluster",
    category: "Efficiency",
    description: "Unlocks the Federated Training Cluster tile — Coordination amplifier with extra TFP weight.",
    costM: 500, durationQuarters: 6, prereqs: ["cba_playbook"], col: 2, row: 5,
    effects: [],
    realWorld: "OpenMined / Flower; Apple-Google DP collaboration.",
  },
};

// Layout helpers used by the renderer.
window.RESEARCH_GRID = {
  cols: 3, rows: 6,
  cardWidth: 220, cardHeight: 96,
  colGap: 32, rowGap: 28,
  paddingX: 24, paddingY: 24,
};
window.RESEARCH_CATEGORIES = ["Power", "Water", "Workforce", "Community", "Efficiency"];

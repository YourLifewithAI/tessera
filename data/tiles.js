// ===============================================================
// Tile catalog
// One entry per layer of the Tessera (six layers + Coordination).
// Layer values MUST be one of:
//   Power, Silicon, Materials, Robotics, Closed Loops, Life, Coordination
// To add a tile: add an entry here. The tray renders from this object.
// To swap art: drop a new SVG at the `art` path (default tiles/<id>.svg).
//
// ---------------------------------------------------------------
// v0.3 economic substrate — dollars edition.
//
// All monetary values are in MILLIONS OF DOLLARS (US$). The game
// formats them at the boundary: $250M, $1.5B, etc. Per-tick fields
// are dollars per QUARTER (the tick is one calendar quarter).
//
//   capex             — one-time placement cost                       $M
//   opex              — recurring operating drain                     $M / quarter
//   revenue           — recurring output sold                         $M / quarter
//   jobsConstruction  — one-time build labor (decays over ~8 qtrs)    person-quarters
//   jobsOps           — permanent operating jobs                      headcount
//   emissionsPerTick  — net carbon flow (negative = avoided)          kt CO2e / quarter
//   waterDrawPerTick  — net regional water draw (negative = produced) ML / quarter
//
// Capex calibration (gestural — real projects vary 2-3x):
//   SMR:        ~$4B  — NuScale/X-energy 60-100 MW module band
//   Datacenter: ~$2.5B — large hyperscale module, 50-100 MW IT load
//   Chip Fab:   ~$3.5B — mature/trailing-edge fab (sensors, power)
//   Robotics:   ~$800M — new manufacturing facility
//   Coordination: ~$400M — federated AI ops + community-benefits office
//   Civic:      ~$250M — school + clinic + park, mid-size town
//   Housing:    ~$200M — ~250-unit mass-timber midrise
//   Solar:      ~$150M — 80 MW PV + 40 MWh battery
//   Vertical farm: ~$80M — industrial CEA + closed-loop systems
//
// Revenue calibration: tuned for ~3-6 year payback before TFP boost,
// so cash flow matters but doesn't trivialize the budget.
//
// Sources (gestural calibration, not policy-grade):
//   SMR:        NRC SMR licensing dockets; NREL ATB 2024; DOE NE-1
//   Chip Fab:   BLS NAICS 3344; CHIPS Act fab employment estimates
//   Datacenter: Uptime Institute; LBNL data center energy reports
//   Solar:      NREL utility-scale PV cost & employment models
//   Housing:    BLS construction trades + multifamily property mgmt
//   Civic:      BLS public-sector (NAICS 6111 schools, 6211 ambulatory)
//   Emissions:  EPA eGRID 2024; EIA AEO 2025
// ===============================================================

window.TILES = {
  civic: {
    name: "Civic Center",
    subtitle: "School + clinic + park",
    layer: "Life",
    capex: 250,                          // $250M
    opex: 5, revenue: 0,                 // public asset; cost center
    jobsConstruction: 200, jobsOps: 60,
    emissionsPerTick: 0, waterDrawPerTick: 0,
    baseGoodwill: 12,
    sentimentKey: "fed_trust",
    color: "#2EC9E3",
    art: "tiles/civic.svg",
    power: -2, water: -1, compute: 0, food: 0,
    description: "Schools, clinics, parks, transit. Lead with this. It is the social-license generator.",
  },
  housing: {
    name: "Mass Timber Housing",
    subtitle: "Modular timber midrise",
    layer: "Materials",
    capex: 200,                          // $200M (~250 units, ~$800k/unit)
    opex: 5, revenue: 20,                // rents net of operating costs
    jobsConstruction: 150, jobsOps: 8,
    emissionsPerTick: 1, waterDrawPerTick: 4,
    baseGoodwill: 0,
    sentimentKey: "density",
    color: "#BC8E5C",
    art: "tiles/housing.svg",
    power: -5, water: -2, compute: 0, food: -2,
    description: "Houses ~250 residents. Pays back from rents once occupied. Goodwill varies sharply by state.",
  },
  farm: {
    name: "Vertical Farm",
    subtitle: "Greens, herbs, mushrooms, fish",
    layer: "Closed Loops",
    capex: 80,                           // $80M
    opex: 3, revenue: 10,                // produce sales + waste-loop credits
    jobsConstruction: 80, jobsOps: 25,
    emissionsPerTick: -1, waterDrawPerTick: -3,
    baseGoodwill: 6,
    sentimentKey: "enviro",
    color: "#299E8E",
    art: "tiles/farm.svg",
    power: -5, water: 8, compute: 0, food: 20,
    description: "Closes the food + water loops. Quietly popular almost everywhere.",
  },
  solar: {
    name: "Solar+Battery",
    subtitle: "PV array + grid battery",
    layer: "Power",
    capex: 150,                          // $150M (~80 MW PV + storage)
    opex: 1, revenue: 8,                 // modest power sold to grid
    jobsConstruction: 50, jobsOps: 5,
    emissionsPerTick: -2, waterDrawPerTick: 0,
    baseGoodwill: 2,
    sentimentKey: "enviro",
    color: "#FFD84A",
    art: "tiles/solar.svg",
    power: 18, water: 0, compute: 0, food: 0,
    description: "Quiet, popular, modest output. Stacks well with SMR. Cannot fully replace one.",
  },
  smr: {
    name: "SMR",
    subtitle: "Small Modular Reactor",
    layer: "Power",
    capex: 4000,                         // $4B (NuScale/X-energy module band)
    opex: 15, revenue: 30,               // surplus power to grid; net +$60M/yr
    jobsConstruction: 1200, jobsOps: 180,
    emissionsPerTick: -8, waterDrawPerTick: 6,
    baseGoodwill: -15,
    sentimentKey: "nuclear",
    color: "#F4A361",
    art: "tiles/smr.svg",
    power: 100, water: -2, compute: 0, food: 0,
    description: "100 MW behind-the-meter nuclear. Hardest sell. Needs a 2-tile buffer from housing/civic.",
  },
  fab: {
    name: "Chip Fab",
    subtitle: "Mature-node fab (sensors, power electronics)",
    layer: "Silicon",
    capex: 3500,                         // $3.5B (mature-node fab)
    opex: 40, revenue: 80,               // net +$160M/yr per fab
    jobsConstruction: 800, jobsOps: 350,
    emissionsPerTick: 3, waterDrawPerTick: 8,
    baseGoodwill: -3,
    sentimentKey: "data_center",
    color: "#527E9E",
    art: "tiles/fab.svg",
    power: -30, water: -2, compute: 0, food: 0,
    description: "Not cutting-edge silicon. CHIPS-supported sensors and power chips. Strong job-creator.",
  },
  datacenter: {
    name: "Data Center",
    subtitle: "Liquid-cooled AI compute",
    layer: "Silicon",
    capex: 2500,                         // $2.5B (hyperscale module, 50-100 MW IT load)
    opex: 50, revenue: 120,              // net +$280M/yr per module
    jobsConstruction: 200, jobsOps: 120,
    emissionsPerTick: 4, waterDrawPerTick: 3,
    baseGoodwill: -8,
    sentimentKey: "data_center",
    color: "#7B2CBF",
    art: "tiles/datacenter.svg",
    power: -40, water: -1, compute: 30, food: 0,
    description: "Consumes power, sells intelligence. Real local pushback in 2026 — see DESIGN.md.",
  },
  robotics: {
    name: "Robotics Factory",
    subtitle: "Wheeled, quadruped, gantry bots",
    layer: "Robotics",
    capex: 800,                          // $800M
    opex: 20, revenue: 40,               // robot sales; net +$80M/yr
    jobsConstruction: 400, jobsOps: 200,
    emissionsPerTick: 1, waterDrawPerTick: 1,
    baseGoodwill: -4,
    sentimentKey: "data_center",
    color: "#666E8C",
    art: "tiles/robotics.svg",
    power: -10, water: 0, compute: 0, food: 0,
    description: "Builds the robots that build the Tessera. No humanoids yet — those wait for Arcology era.",
  },
  coordination: {
    name: "Coordination Node",
    subtitle: "Federated AI + community-benefits office",
    layer: "Coordination",
    capex: 400,                          // $400M
    opex: 10, revenue: 0,                // governance is a cost center; value is the TFP boost
    jobsConstruction: 100, jobsOps: 40,
    emissionsPerTick: 0, waterDrawPerTick: 0,
    baseGoodwill: -2,
    sentimentKey: "fed_trust",
    color: "#EBC96A",
    art: "tiles/coordination.svg",
    power: -3, water: 0, compute: -5, food: 0,
    description: "Runs Climate, Flow, Provision, Harmony, Growth, Memory. Required to complete a Tessera.",
  },

  // ----- v0.4 research-unlocked tiles -----
  // These do not appear in the tray until the listed research is complete.
  // Art reuses the closest existing SVG until proper art lands.

  geothermal: {
    name: "Geothermal Loop",
    subtitle: "Closed-loop deep geothermal baseload",
    layer: "Power",
    capex: 600,                          // $600M (midway between solar and SMR)
    opex: 5, revenue: 12,                // net +$28M/yr; quiet baseload
    jobsConstruction: 200, jobsOps: 30,
    emissionsPerTick: -3, waterDrawPerTick: 0,
    baseGoodwill: 6,
    sentimentKey: "enviro",
    color: "#A0522D",
    art: "tiles/solar.svg",              // placeholder
    power: 30, water: 0, compute: 0, food: 0,
    unlockedBy: "geothermal",
    description: "Quiet, popular baseload. Drilling-cost dependent. Stacks with SMR, doesn't replace it.",
  },
  algae_bioreactor: {
    name: "Algae Bioreactor",
    subtitle: "Net-negative emissions, net-positive water",
    layer: "Closed Loops",
    capex: 150,
    opex: 4, revenue: 6,
    jobsConstruction: 60, jobsOps: 15,
    emissionsPerTick: -4, waterDrawPerTick: -5,
    baseGoodwill: 8,
    sentimentKey: "enviro",
    color: "#52B788",
    art: "tiles/farm.svg",               // placeholder
    power: -3, water: 12, compute: 0, food: 0,
    unlockedBy: "algae_carbon_loop",
    description: "Carbon sequestration plus biomass byproducts. Pairs with vertical farm.",
  },
  humanoid_pilot: {
    name: "Humanoid Pilot Line",
    subtitle: "First-gen humanoid assembly",
    layer: "Robotics",
    capex: 1200,
    opex: 30, revenue: 80,
    jobsConstruction: 300, jobsOps: 150,
    emissionsPerTick: 1, waterDrawPerTick: 0,
    baseGoodwill: -8,
    sentimentKey: "data_center",
    color: "#3B3F5C",
    art: "tiles/robotics.svg",           // placeholder
    power: -15, water: 0, compute: -10, food: 0,
    unlockedBy: "humanoid_pilot",
    description: "High revenue; loud displacement concerns. The Arcology-era preview.",
  },
  federated_training: {
    name: "Federated Training Cluster",
    subtitle: "Privacy-preserving distributed training",
    layer: "Coordination",
    capex: 600,
    opex: 8, revenue: 0,
    jobsConstruction: 80, jobsOps: 35,
    emissionsPerTick: 0, waterDrawPerTick: 0,
    baseGoodwill: 2,
    sentimentKey: "fed_trust",
    color: "#D4A24C",
    art: "tiles/coordination.svg",       // placeholder
    power: -4, water: 0, compute: 8, food: 0,
    unlockedBy: "federated_training",
    description: "Coordination amplifier with extra weight in TFP. Stacks with Coordination Node.",
  },
};

// ---------------------------------------------------------------
// Headlines — flavor text for the community reaction popup.
// Forkers: add more here. The more headlines, the richer the world feels.
// ---------------------------------------------------------------

window.HEADLINES = {
  smr: [
    "%s: 'Reactor siting hearing draws standing-room crowd' (%+d goodwill)",
    "%s: 'SMR approval contingent on community-benefits package' (%+d)",
    "%s: 'Behind-the-meter nuclear debated at city hall' (%+d)",
  ],
  solar: [
    "%s: 'Solar+battery array breaks ground; few objections' (%+d)",
    "%s: 'Local farm leases land for grid storage' (%+d)",
  ],
  datacenter: [
    "%s: 'Data center vote scheduled; opposition organizes' (%+d)",
    "%s: 'Water-use disclosures requested for AI compute hub' (%+d)",
  ],
  fab: [
    "%s: 'Chip fab cleared on jobs; environmental review next' (%+d)",
    "%s: 'Trade school signs apprenticeship pact with fab' (%+d)",
  ],
  housing: [
    "%s: 'Mass-timber midrise application reviewed' (%+d)",
    "%s: 'New housing welcomed by tradespeople, contested by neighbors' (%+d)",
  ],
  robotics: [
    "%s: 'Robotics line announced; trade school partnership signed' (%+d)",
    "%s: 'Job-displacement panel scheduled for next week' (%+d)",
  ],
  farm: [
    "%s: 'Vertical farm groundbreaking; rooftop greens within months' (%+d)",
    "%s: 'Anaerobic digester to close the waste loop' (%+d)",
  ],
  civic: [
    "%s: 'New school + clinic + park welcomed by neighborhood' (%+d)",
    "%s: 'Mayor cuts ribbon on community center' (%+d)",
  ],
  coordination: [
    "%s: 'Coordination Node opens; first community council seats announced' (%+d)",
    "%s: 'Federated facility AI online; residents pilot the personal Agent' (%+d)",
  ],
};

window.headlineFor = function(tileId, delta, paper) {
  const arr = window.HEADLINES[tileId] || ["%s: 'New construction announced' (%+d)"];
  const tpl = arr[Math.floor(Math.random() * arr.length)];
  const signed = (delta >= 0 ? "+" : "") + delta;
  return tpl.replace("%s", paper).replace("%+d", signed);
};

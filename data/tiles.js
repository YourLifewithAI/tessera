// ===============================================================
// Tile catalog
// One entry per layer of the Tessera (six layers + Coordination).
// Layer values MUST be one of:
//   Power, Silicon, Materials, Robotics, Closed Loops, Life, Coordination
// To add a tile: add an entry here. The tray renders from this object.
// To swap art: drop a new SVG at the `art` path (default tiles/<id>.svg).
// ===============================================================

window.TILES = {
  civic: {
    name: "Civic Center",
    subtitle: "School + clinic + park",
    layer: "Life",
    cost: 40,
    baseGoodwill: 12,
    sentimentKey: "fed_trust",
    color: "#2EC9E3",
    art: "tiles/civic.svg",
    power: -2, water: -1, compute: 0, food: 0,
    cyclesPerTick: 0,
    description: "Schools, clinics, parks, transit. Lead with this. It is the social-license generator.",
  },
  housing: {
    name: "Mass Timber Housing",
    subtitle: "Modular timber midrise",
    layer: "Materials",
    cost: 30,
    baseGoodwill: 0,
    sentimentKey: "density",
    color: "#BC8E5C",
    art: "tiles/housing.svg",
    power: -5, water: -2, compute: 0, food: -2,
    cyclesPerTick: 5,
    description: "Houses ~250 residents. Cycles flow once people live here. Goodwill varies sharply by state.",
  },
  farm: {
    name: "Vertical Farm",
    subtitle: "Greens, herbs, mushrooms, fish",
    layer: "Closed Loops",
    cost: 35,
    baseGoodwill: 6,
    sentimentKey: "enviro",
    color: "#299E8E",
    art: "tiles/farm.svg",
    power: -5, water: 8, compute: 0, food: 20,
    cyclesPerTick: 0,
    description: "Closes the food + water loops. Quietly popular almost everywhere.",
  },
  solar: {
    name: "Solar+Battery",
    subtitle: "PV array + grid battery",
    layer: "Power",
    cost: 25,
    baseGoodwill: 2,
    sentimentKey: "enviro",
    color: "#FFD84A",
    art: "tiles/solar.svg",
    power: 18, water: 0, compute: 0, food: 0,
    cyclesPerTick: 0,
    description: "Quiet, popular, modest output. Stacks well with SMR. Cannot fully replace one.",
  },
  smr: {
    name: "SMR",
    subtitle: "Small Modular Reactor",
    layer: "Power",
    cost: 80,
    baseGoodwill: -15,
    sentimentKey: "nuclear",
    color: "#F4A361",
    art: "tiles/smr.svg",
    power: 100, water: -2, compute: 0, food: 0,
    cyclesPerTick: 0,
    description: "100 MW behind-the-meter nuclear. Hardest sell. Needs a 2-tile buffer from housing/civic.",
  },
  fab: {
    name: "Chip Fab",
    subtitle: "Mature-node fab (sensors, power electronics)",
    layer: "Silicon",
    cost: 70,
    baseGoodwill: -3,
    sentimentKey: "data_center",
    color: "#527E9E",
    art: "tiles/fab.svg",
    power: -30, water: -2, compute: 0, food: 0,
    cyclesPerTick: 2,
    description: "Not cutting-edge silicon. CHIPS-supported sensors and power chips. Strong job-creator.",
  },
  datacenter: {
    name: "Data Center",
    subtitle: "Liquid-cooled AI compute",
    layer: "Silicon",
    cost: 60,
    baseGoodwill: -8,
    sentimentKey: "data_center",
    color: "#7B2CBF",
    art: "tiles/datacenter.svg",
    power: -40, water: -1, compute: 30, food: 0,
    cyclesPerTick: 1,
    description: "Consumes power, sells intelligence. Real local pushback in 2026 — see DESIGN.md.",
  },
  robotics: {
    name: "Robotics Factory",
    subtitle: "Wheeled, quadruped, gantry bots",
    layer: "Robotics",
    cost: 50,
    baseGoodwill: -4,
    sentimentKey: "data_center",
    color: "#666E8C",
    art: "tiles/robotics.svg",
    power: -10, water: 0, compute: 0, food: 0,
    cyclesPerTick: 0,
    description: "Builds the robots that build the Tessera. No humanoids yet — those wait for Arcology era.",
  },
  coordination: {
    name: "Coordination Node",
    subtitle: "Federated AI + community-benefits office",
    layer: "Coordination",
    cost: 100,
    baseGoodwill: -2,
    sentimentKey: "fed_trust",
    color: "#EBC96A",
    art: "tiles/coordination.svg",
    power: -3, water: 0, compute: -5, food: 0,
    cyclesPerTick: 0,
    description: "Runs Climate, Flow, Provision, Harmony, Growth, Memory. Required to complete a Tessera.",
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

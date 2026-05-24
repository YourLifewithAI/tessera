// ===============================================================
// Sponsor catalog (v0.3)
//
// The player picks a knockoff hyperscaler at game start. Each sponsor
// brings a starting budget (in millions of dollars), a name that shows
// up in the HUD and headlines, and a small starting-goodwill modifier
// reflecting their public reputation as of Q2 2026.
//
// Numbers are calibrated to publicly reported 2025 annual capex; we
// give the player roughly one year's capex to spend on Tessera-scale
// projects. Real sources:
//   - AWS:    ~$110B annual capex (Amazon 2025 guidance)
//   - Azure:  ~$80-90B (Microsoft FY25 capex)
//   - Google: ~$75-85B (Alphabet 2025 guidance)
//   - Meta:   ~$60-70B (Meta 2025 capex band)
//   - Oracle: ~$25-35B (Oracle FY25 capex)
//   - xAI:    ~$30-50B (private estimates; aggressive AI buildout)
//
// Forks: edit budgets, add sponsors, replace names. To add a sponsor,
// register an entry on window.SPONSORS keyed by id and add a button
// in the sponsor-select screen (it renders the registry automatically).
// ===============================================================

window.SPONSORS = {
  mws: {
    id: "mws",
    name: "Mazon Web Services",
    shortName: "MWS",
    knockoffOf: "AWS",
    startingBudgetM: 110000,        // $110B
    startingGoodwill: 0,
    flavor: "The cloud everyone already runs on. Big checkbook, big footprint.",
    focus: ["datacenter", "robotics"],
    paper: "MWS All-Hands Memo",
  },
  mikrohard: {
    id: "mikrohard",
    name: "Mikrohard Azurr",
    shortName: "Azurr",
    knockoffOf: "Microsoft Azure",
    startingBudgetM: 90000,         // $90B
    startingGoodwill: -5,           // Loudoun-style moratorium hangover
    flavor: "Enterprise to the bone. SMR-curious. Walking back a year of negative water-use coverage.",
    focus: ["smr", "datacenter"],
    paper: "Azurr Quarterly Brief",
  },
  moogle: {
    id: "moogle",
    name: "Moogle Cloud",
    shortName: "Moogle",
    knockoffOf: "Google Cloud",
    startingBudgetM: 80000,         // $80B
    startingGoodwill: +2,           // research-and-civic brand halo
    flavor: "Research-forward. Spends on civic projects. Slightly slower to ship.",
    focus: ["fab", "civic"],
    paper: "Moogle Research Blog",
  },
  beta: {
    id: "beta",
    name: "Beta Platforms",
    shortName: "Beta",
    knockoffOf: "Meta",
    startingBudgetM: 65000,         // $65B
    startingGoodwill: -5,           // social-trust crisis residue
    flavor: "Pivoted from social to ambient compute. Strong in housing, robotics, coordination.",
    focus: ["housing", "robotics", "coordination"],
    paper: "Beta Newsroom",
  },
  xagi: {
    id: "xagi",
    name: "xAGI",
    shortName: "xAGI",
    knockoffOf: "xAI / OpenAI",
    startingBudgetM: 40000,         // $40B
    startingGoodwill: -10,          // move-fast reputation, public spats
    flavor: "Move fast, break neighborhoods. Aggressive compute buildout, allergic to community input.",
    focus: ["datacenter", "smr"],
    paper: "xAGI Press Release",
  },
  hortacle: {
    id: "hortacle",
    name: "Hortacle Cloud",
    shortName: "Hortacle",
    knockoffOf: "Oracle",
    startingBudgetM: 35000,         // $35B
    startingGoodwill: 0,
    flavor: "Scrappy by hyperscaler standards. Database roots, fab-friendly, sharp elbows.",
    focus: ["fab", "datacenter"],
    paper: "Hortacle Investor Update",
  },
};

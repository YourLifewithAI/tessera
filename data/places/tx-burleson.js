// ===============================================================
// Demo place: Burleson County, TX
//
// This file is the worked example for the v0.2 place-data schema.
// It registers itself on window.TesseraPlaces; the default adapter in
// data/tessera-data.js picks it up automatically.
//
// Numbers are gestural but grounded — see `provenance` block for the
// real sources. Sentiment distributions are reconstructions of how
// these communities have talked about each topic in public meetings,
// county commission minutes, and local press; they are NOT polling.
//
// PRs welcome with real polling data, more cities, better citations.
// ===============================================================

(function () {
  'use strict';
  window.TesseraPlaces = window.TesseraPlaces || {};

  window.TesseraPlaces["tx-burleson"] = {
    baseline: {
      placeId: "tx-burleson",
      displayName: "Burleson County, TX",
      schemaVersion: 1,
      baselineDate: "2025-01-01",
      jurisdiction: {
        state: "TX",
        county: "Burleson",
        countyFips: "48051",
      },
      county: {
        population: 18443,
        households: 6892,
        medianAge: 40.2,
        medianHouseholdIncome: 58400,
        raceEthnicity: { white: 0.63, hispanic: 0.22, black: 0.11, other: 0.04 },
        educationAttainment: { hsOrLess: 0.51, someCollege: 0.27, bachelorsPlus: 0.22 },
        power: {
          gridOperator: "ERCOT",
          servingUtility: "Bluebonnet Electric Cooperative",
          generationMixMwh: { gas: 11800, coal: 0, solar: 1200, wind: 5800, nuclear: 0 },
          capacityMw: { gas: 4.2, solar: 0.5, wind: 2.1, nuclear: 0 },
          peakDemandMw: 32,
          notes: "County-level estimate; bulk generation imported via ERCOT from neighboring counties.",
        },
        water: {
          primarySource: "Carrizo-Wilcox aquifer",
          annualDemandMl: 4200,
          annualSupplyMl: 5100,
          aquiferStress: "moderate",
          trendsNote: "Drawdown +0.3%/yr per Brazos Valley GCD 2024 report.",
        },
        traffic: {
          aadtHighwayMain: 16500,
          commuteMinutesMedian: 24,
          transitSharePct: 0.0,
          highwayContext: "TX SH 36 north-south through Caldwell; FM roads elsewhere.",
        },
        existingDataCenters: [],
        existingLargeIndustrial: [
          { name: "Aleris recycling plant", type: "metals", mwLoad: 12, yearOpened: 2008 },
        ],
      },
      cities: [
        {
          id: "caldwell",
          name: "Caldwell",
          type: "city",
          isCountySeat: true,
          population: 4036,
          medianHouseholdIncome: 51200,
          adjacentCities: ["somerville", "snook"],
          adjacentCounties: ["brazos", "milam"],
          // Distribution of adult residents — for / against / dontKnow per topic. Sums to 1.0.
          sentiment: {
            smr:          { for: 0.18, against: 0.34, dontKnow: 0.48 },
            datacenter:   { for: 0.22, against: 0.41, dontKnow: 0.37 },
            fab:          { for: 0.31, against: 0.18, dontKnow: 0.51 },
            robotics:     { for: 0.24, against: 0.22, dontKnow: 0.54 },
            housing:      { for: 0.28, against: 0.32, dontKnow: 0.40 },
            farm:         { for: 0.46, against: 0.06, dontKnow: 0.48 },
            civic:        { for: 0.58, against: 0.09, dontKnow: 0.33 },
            coordination: { for: 0.14, against: 0.39, dontKnow: 0.47 },
          },
          // Each need names which tile ids would address it (game rule consults this).
          expressedNeeds: [
            { issue: "healthcare access", priority: "high", addressedBy: ["civic"],
              note: "Nearest hospital is 25 min in Bryan." },
            { issue: "young people leaving", priority: "high", addressedBy: ["fab", "robotics", "civic"],
              note: "Brain drain to Bryan/College Station; young residents cite no career path." },
            { issue: "broadband", priority: "medium", addressedBy: ["datacenter", "civic"],
              note: "Patchy fiber outside city limits." },
          ],
          // Each concern names which tile ids would trigger it (game rule consults this).
          expressedConcerns: [
            { issue: "water draw", priority: "high", triggeredBy: ["fab", "datacenter", "smr"],
              note: "Aquifer stress already moderate; ag users vocal." },
            { issue: "traffic", priority: "medium", triggeredBy: ["fab", "robotics"],
              note: "SH 36 is two lanes through downtown." },
            { issue: "school capacity", priority: "medium", triggeredBy: ["housing"],
              note: "Caldwell ISD operating near design capacity." },
          ],
        },
        {
          id: "somerville",
          name: "Somerville",
          type: "city",
          isCountySeat: false,
          population: 1782,
          medianHouseholdIncome: 38500,
          adjacentCities: ["caldwell"],
          adjacentCounties: ["lee", "washington"],
          sentiment: {
            smr:          { for: 0.12, against: 0.39, dontKnow: 0.49 },
            datacenter:   { for: 0.17, against: 0.48, dontKnow: 0.35 },
            fab:          { for: 0.26, against: 0.22, dontKnow: 0.52 },
            robotics:     { for: 0.19, against: 0.27, dontKnow: 0.54 },
            housing:      { for: 0.21, against: 0.41, dontKnow: 0.38 },
            farm:         { for: 0.51, against: 0.04, dontKnow: 0.45 },
            civic:        { for: 0.62, against: 0.06, dontKnow: 0.32 },
            coordination: { for: 0.10, against: 0.44, dontKnow: 0.46 },
          },
          expressedNeeds: [
            { issue: "jobs near home", priority: "high", addressedBy: ["fab", "robotics", "farm"],
              note: "Most working-age residents commute 30+ min for blue-collar work." },
            { issue: "flood resilience", priority: "high", addressedBy: ["civic"],
              note: "Yegua Creek has flooded downtown three times since 2015." },
          ],
          expressedConcerns: [
            { issue: "rail and freight noise", priority: "medium", triggeredBy: ["fab", "robotics"],
              note: "Rail line bisects downtown; added freight rejected in 2023 referendum." },
            { issue: "displacement", priority: "high", triggeredBy: ["housing", "datacenter"],
              note: "Low median income; longtime residents fear being priced out." },
          ],
        },
        {
          id: "snook",
          name: "Snook",
          type: "city",
          isCountySeat: false,
          population: 612,
          medianHouseholdIncome: 67200,
          adjacentCities: ["caldwell"],
          adjacentCounties: ["brazos"],
          sentiment: {
            smr:          { for: 0.24, against: 0.28, dontKnow: 0.48 },
            datacenter:   { for: 0.31, against: 0.34, dontKnow: 0.35 },
            fab:          { for: 0.38, against: 0.14, dontKnow: 0.48 },
            robotics:     { for: 0.34, against: 0.18, dontKnow: 0.48 },
            housing:      { for: 0.22, against: 0.43, dontKnow: 0.35 },
            farm:         { for: 0.41, against: 0.09, dontKnow: 0.50 },
            civic:        { for: 0.49, against: 0.13, dontKnow: 0.38 },
            coordination: { for: 0.22, against: 0.31, dontKnow: 0.47 },
          },
          expressedNeeds: [
            { issue: "broadband", priority: "high", addressedBy: ["datacenter", "civic"] },
            { issue: "preserve rural character", priority: "high", addressedBy: ["farm"] },
          ],
          expressedConcerns: [
            { issue: "subdivision pressure", priority: "high", triggeredBy: ["housing"],
              note: "Bryan-College Station spillover already pushing into the township." },
            { issue: "water draw", priority: "high", triggeredBy: ["fab", "datacenter", "smr"] },
          ],
        },
      ],
      adjacencies: [
        { from: "caldwell", to: "somerville", distanceKm: 24, commuteShare: 0.06 },
        { from: "caldwell", to: "snook",      distanceKm: 19, commuteShare: 0.04 },
        { from: "somerville", to: "snook",    distanceKm: 30, commuteShare: 0.01 },
      ],
      provenance: {
        demographics: "US Census ACS 5-year 2018-2022; place-level Census 2020 SF1",
        power: "EIA Form 861 (Bluebonnet Electric); ERCOT generation mix 2024",
        water: "Brazos Valley Groundwater Conservation District 2024 report",
        traffic: "TxDOT AADT 2023",
        sentiment: "Gestural reconstruction from county commission minutes, school board agendas, and the Burleson County Tribune. NOT polling.",
      },
    },
    updates: [
      {
        date: "2025-03",
        scope: "city:caldwell",
        field: "sentiment.datacenter",
        change: { for: -0.04, against: +0.07, dontKnow: -0.03 },
        reason: "Loudoun County (VA) data-center moratorium news cycle reached the Burleson County Tribune; local commenters cited water and grid concerns.",
      },
      {
        date: "2025-06",
        scope: "county",
        field: "power.capacityMw",
        change: { solar: +1.2 },
        reason: "Two utility-scale solar projects (Bluebonnet siting near FM 60) came online; county capacity rose from 0.5 to 1.7 MW.",
      },
      {
        date: "2025-08",
        scope: "city:caldwell",
        field: "expressedConcerns",
        add: { issue: "ERCOT grid load growth", priority: "low", triggeredBy: ["datacenter", "fab"],
               note: "Surfaced at the August town hall after statewide AI-compute power-demand coverage." },
        reason: "Statewide AI-compute power-demand coverage trickled into local conversation; surfaced as a low-priority concern.",
      },
      {
        date: "2025-10",
        scope: "city:somerville",
        field: "sentiment.fab",
        change: { for: +0.06, against: -0.02, dontKnow: -0.04 },
        reason: "CHIPS-funded apprenticeship pact between Blinn College and a Brazos Valley fab consortium got positive coverage; Somerville sees it as the first plausible jobs-near-home story in years.",
      },
      {
        date: "2026-01",
        scope: "county",
        field: "water.aquiferStress",
        set: "high",
        reason: "Drought year plus drawdown trend pushed Brazos Valley GCD to revise the Carrizo-Wilcox stress assessment upward. Will be the dominant 2026 election issue.",
      },
      {
        date: "2026-03",
        scope: "city:snook",
        field: "sentiment.housing",
        change: { against: +0.05, for: -0.03, dontKnow: -0.02 },
        reason: "Bryan-CS bedroom-community spillover accelerated; Snook residents organized to oppose two subdivision proposals.",
      },
      {
        date: "2026-04",
        scope: "city:caldwell",
        field: "sentiment.smr",
        change: { for: +0.03, against: -0.01, dontKnow: -0.02 },
        reason: "TAMU Engineering's Microreactor Lab held a public-facing briefing in Caldwell; modestly nudged sentiment toward 'curious.'",
      },
    ],
  };
})();

// ===============================================================
// State sentiment profiles
// Each state has scores from -2 (hostile) to +2 (warmly receptive) on:
//   nuclear      — SMR siting acceptance
//   data_center  — data center / AI compute hub acceptance
//   density      — mass-timber housing density tolerance
//   enviro       — environmental priority (helps closed-loop tiles)
//   fed_trust    — trust in federal-program-style infrastructure
//
// These are GESTURAL profiles. Sources include:
//   - Data Center Watch (moratorium activity, 2025–2026)
//   - Quinnipiac AI trust poll (March 2026)
//   - NRC SMR licensing posture + state energy plans
//   - State zoning / YIMBY indicators
//
// PRs welcome with better data. Forkers: refine these freely.
// ===============================================================

window.STATES = {
  AL: {name:"Alabama",        nuclear: 1, data_center: 1, density:-1, enviro: 0, fed_trust:-1, flavor_paper:"Birmingham News",          terrain_bias:["rural","suburban","rural","industrial","rural"]},
  AK: {name:"Alaska",         nuclear: 0, data_center: 0, density:-2, enviro: 1, fed_trust:-1, flavor_paper:"Anchorage Daily News",     terrain_bias:["rural","rural","rural","park","park"]},
  AZ: {name:"Arizona",        nuclear: 1, data_center: 1, density:-1, enviro: 0, fed_trust: 0, flavor_paper:"Arizona Republic",         terrain_bias:["suburban","rural","industrial","suburban","rural"]},
  AR: {name:"Arkansas",       nuclear: 1, data_center: 0, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Arkansas Democrat-Gazette",terrain_bias:["rural","rural","suburban","rural","industrial"]},
  CA: {name:"California",     nuclear:-2, data_center: 0, density: 2, enviro: 2, fed_trust: 0, flavor_paper:"Sacramento Bee",           terrain_bias:["urban","suburban","urban","park","suburban"]},
  CO: {name:"Colorado",       nuclear: 0, data_center: 0, density: 1, enviro: 1, fed_trust: 0, flavor_paper:"Denver Post",              terrain_bias:["suburban","rural","urban","park","suburban"]},
  CT: {name:"Connecticut",    nuclear:-1, data_center: 0, density: 1, enviro: 1, fed_trust: 0, flavor_paper:"Hartford Courant",         terrain_bias:["suburban","urban","suburban","park","rural"]},
  DE: {name:"Delaware",       nuclear: 0, data_center: 0, density: 0, enviro: 0, fed_trust: 0, flavor_paper:"News Journal",             terrain_bias:["suburban","industrial","rural","suburban","suburban"]},
  FL: {name:"Florida",        nuclear: 1, data_center: 1, density: 0, enviro:-1, fed_trust: 0, flavor_paper:"Tampa Bay Times",          terrain_bias:["suburban","urban","suburban","rural","park"]},
  GA: {name:"Georgia",        nuclear: 2, data_center: 1, density: 0, enviro: 0, fed_trust:-1, flavor_paper:"Atlanta Journal-Constitution", terrain_bias:["suburban","rural","industrial","suburban","rural"]},
  HI: {name:"Hawaii",         nuclear:-2, data_center: 0, density: 0, enviro: 2, fed_trust: 0, flavor_paper:"Honolulu Star-Advertiser", terrain_bias:["suburban","park","urban","park","rural"]},
  ID: {name:"Idaho",          nuclear: 2, data_center: 1, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Idaho Statesman",          terrain_bias:["rural","suburban","rural","industrial","park"]},
  IL: {name:"Illinois",       nuclear: 1, data_center: 1, density: 1, enviro: 1, fed_trust: 0, flavor_paper:"Chicago Tribune",          terrain_bias:["urban","suburban","rural","industrial","suburban"]},
  IN: {name:"Indiana",        nuclear: 1, data_center: 0, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Indianapolis Star",        terrain_bias:["suburban","rural","industrial","rural","suburban"]},
  IA: {name:"Iowa",           nuclear: 0, data_center: 0, density:-1, enviro: 0, fed_trust:-1, flavor_paper:"Des Moines Register",      terrain_bias:["rural","rural","suburban","industrial","rural"]},
  KS: {name:"Kansas",         nuclear: 0, data_center: 0, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Kansas City Star",         terrain_bias:["rural","suburban","rural","industrial","rural"]},
  KY: {name:"Kentucky",       nuclear: 0, data_center: 0, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Courier-Journal",          terrain_bias:["rural","suburban","rural","industrial","park"]},
  LA: {name:"Louisiana",      nuclear: 1, data_center: 1, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Times-Picayune",           terrain_bias:["suburban","river","industrial","rural","suburban"]},
  ME: {name:"Maine",          nuclear:-1, data_center:-1, density:-1, enviro: 2, fed_trust: 0, flavor_paper:"Portland Press Herald",    terrain_bias:["rural","park","rural","suburban","rural"]},
  MD: {name:"Maryland",       nuclear: 0, data_center:-1, density: 1, enviro: 1, fed_trust: 1, flavor_paper:"Baltimore Sun",            terrain_bias:["suburban","urban","suburban","industrial","park"]},
  MA: {name:"Massachusetts",  nuclear:-1, data_center: 0, density: 2, enviro: 2, fed_trust: 1, flavor_paper:"Boston Globe",             terrain_bias:["urban","suburban","urban","park","suburban"]},
  MI: {name:"Michigan",       nuclear: 1, data_center: 0, density: 0, enviro: 1, fed_trust: 0, flavor_paper:"Detroit Free Press",       terrain_bias:["suburban","industrial","rural","urban","park"]},
  MN: {name:"Minnesota",      nuclear: 0, data_center: 1, density: 1, enviro: 1, fed_trust: 0, flavor_paper:"Star Tribune",             terrain_bias:["suburban","urban","rural","park","suburban"]},
  MS: {name:"Mississippi",    nuclear: 0, data_center: 0, density:-2, enviro:-1, fed_trust:-2, flavor_paper:"Clarion-Ledger",           terrain_bias:["rural","rural","suburban","rural","industrial"]},
  MO: {name:"Missouri",       nuclear: 1, data_center: 0, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"St. Louis Post-Dispatch",  terrain_bias:["suburban","rural","industrial","rural","suburban"]},
  MT: {name:"Montana",        nuclear: 1, data_center: 0, density:-2, enviro: 0, fed_trust:-1, flavor_paper:"Billings Gazette",         terrain_bias:["rural","rural","park","rural","industrial"]},
  NE: {name:"Nebraska",       nuclear: 1, data_center: 0, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Omaha World-Herald",       terrain_bias:["rural","rural","suburban","industrial","rural"]},
  NV: {name:"Nevada",         nuclear:-1, data_center: 1, density: 0, enviro: 0, fed_trust:-1, flavor_paper:"Las Vegas Review-Journal", terrain_bias:["suburban","rural","industrial","urban","rural"]},
  NH: {name:"New Hampshire",  nuclear: 0, data_center: 0, density:-1, enviro: 1, fed_trust: 0, flavor_paper:"Concord Monitor",          terrain_bias:["rural","suburban","park","rural","suburban"]},
  NJ: {name:"New Jersey",     nuclear: 0, data_center:-1, density: 1, enviro: 1, fed_trust: 0, flavor_paper:"Star-Ledger",              terrain_bias:["suburban","urban","industrial","suburban","park"]},
  NM: {name:"New Mexico",     nuclear: 1, data_center: 0, density:-1, enviro: 0, fed_trust: 0, flavor_paper:"Albuquerque Journal",      terrain_bias:["rural","suburban","rural","industrial","park"]},
  NY: {name:"New York",       nuclear:-1, data_center:-1, density: 2, enviro: 1, fed_trust: 0, flavor_paper:"Hudson Valley Times",      terrain_bias:["urban","suburban","rural","park","urban"]},
  NC: {name:"North Carolina", nuclear: 1, data_center: 0, density: 0, enviro: 1, fed_trust: 0, flavor_paper:"Charlotte Observer",       terrain_bias:["suburban","rural","industrial","suburban","park"]},
  ND: {name:"North Dakota",   nuclear: 1, data_center: 0, density:-2, enviro:-1, fed_trust:-1, flavor_paper:"Bismarck Tribune",         terrain_bias:["rural","rural","industrial","rural","suburban"]},
  OH: {name:"Ohio",           nuclear: 1, data_center: 0, density: 0, enviro: 0, fed_trust: 0, flavor_paper:"Columbus Dispatch",        terrain_bias:["suburban","industrial","rural","urban","suburban"]},
  OK: {name:"Oklahoma",       nuclear: 0, data_center: 0, density:-2, enviro:-1, fed_trust:-1, flavor_paper:"The Oklahoman",            terrain_bias:["rural","suburban","rural","industrial","rural"]},
  OR: {name:"Oregon",         nuclear:-1, data_center: 0, density: 1, enviro: 2, fed_trust: 0, flavor_paper:"The Oregonian",            terrain_bias:["urban","suburban","park","rural","suburban"]},
  PA: {name:"Pennsylvania",   nuclear: 1, data_center:-2, density: 0, enviro: 0, fed_trust:-1, flavor_paper:"Harrisburg Patriot-News",  terrain_bias:["suburban","industrial","rural","suburban","urban"]},
  RI: {name:"Rhode Island",   nuclear:-1, data_center: 0, density: 1, enviro: 1, fed_trust: 0, flavor_paper:"Providence Journal",       terrain_bias:["urban","suburban","river","urban","suburban"]},
  SC: {name:"South Carolina", nuclear: 1, data_center: 1, density:-1, enviro: 0, fed_trust:-1, flavor_paper:"Post and Courier",         terrain_bias:["suburban","rural","industrial","suburban","park"]},
  SD: {name:"South Dakota",   nuclear: 1, data_center: 0, density:-2, enviro:-1, fed_trust:-1, flavor_paper:"Argus Leader",             terrain_bias:["rural","rural","industrial","rural","suburban"]},
  TN: {name:"Tennessee",      nuclear: 2, data_center: 1, density:-1, enviro:-1, fed_trust: 0, flavor_paper:"Tennessean",               terrain_bias:["suburban","rural","industrial","rural","park"]},
  TX: {name:"Texas",          nuclear: 2, data_center: 1, density:-1, enviro:-1, fed_trust:-1, flavor_paper:"Burleson County Tribune",  terrain_bias:["rural","suburban","rural","industrial","suburban"]},
  UT: {name:"Utah",           nuclear: 1, data_center: 1, density: 0, enviro: 0, fed_trust:-1, flavor_paper:"Salt Lake Tribune",        terrain_bias:["suburban","rural","industrial","park","rural"]},
  VT: {name:"Vermont",        nuclear:-2, data_center:-2, density:-1, enviro: 2, fed_trust: 0, flavor_paper:"Burlington Free Press",    terrain_bias:["rural","park","suburban","rural","park"]},
  VA: {name:"Virginia",       nuclear: 1, data_center:-2, density: 0, enviro: 0, fed_trust: 0, flavor_paper:"Loudoun Times-Mirror",     terrain_bias:["suburban","rural","industrial","suburban","park"]},
  WA: {name:"Washington",     nuclear: 0, data_center: 1, density: 1, enviro: 2, fed_trust: 1, flavor_paper:"Seattle Times",            terrain_bias:["urban","suburban","park","rural","industrial"]},
  WV: {name:"West Virginia",  nuclear: 1, data_center: 0, density:-2, enviro:-1, fed_trust:-2, flavor_paper:"Charleston Gazette-Mail",  terrain_bias:["rural","rural","industrial","park","suburban"]},
  WI: {name:"Wisconsin",      nuclear: 0, data_center: 0, density: 0, enviro: 1, fed_trust: 0, flavor_paper:"Milwaukee Journal Sentinel", terrain_bias:["suburban","rural","industrial","park","rural"]},
  WY: {name:"Wyoming",        nuclear: 2, data_center: 1, density:-2, enviro:-1, fed_trust:-1, flavor_paper:"Kemmerer Gazette",         terrain_bias:["rural","rural","industrial","park","rural"]},
};

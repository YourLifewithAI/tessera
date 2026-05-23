// ===============================================================
// Tessera — game logic (vanilla JS, no framework, no build step)
//
// Architecture:
//   - `state` object: all mutable game state
//   - render functions per screen: renderStateSelect, renderGameBoard, renderWin
//   - event handlers wired on each render (simplest correct approach)
//   - tick loop via setInterval while on the board
//
// To mod the game: most logic is here. Data is in data/tiles.js + data/states.js.
// ===============================================================

(function () {
  'use strict';

  // ----- Constants -----
  const BOARD_W = 20;
  const BOARD_H = 16;
  const TICK_MS = 4000;
  const TICKS_PER_YEAR = 4; // 1 tick = 1 quarter; one game-year ≈ 16s of real time
  const TESSERA_RADIUS_SQ = 25; // radius 5 squared
  const NEEDED_LAYERS = ["Power", "Silicon", "Materials", "Robotics", "Closed Loops", "Life"];
  const REACTION_FADE_MS = 5000;
  const STABILIZATION_TICKS = 5; // per DESIGN.md: Goodwill ≥ 0 sustained for N ticks after formation

  // ----- Economic constants (v0.1 foundation) -----
  // Cycles ≈ quarterly community-investable capital (per DESIGN.md).
  // Emissions are kt CO2e/quarter; cumulative compared against a per-year rate.
  const STATE_DEFAULT_EMISSIONS_CAP = 120; // kt CO2e/year if state has no override
  const TFP_PER_AMPLIFIER = 0.05;          // each adjacent Coordination/Civic boosts revenue 5%
  const TFP_CAP = 1.25;                    // hard ceiling on TFP multiplier
  const JOBS_GOODWILL_THRESHOLD = 0.5;     // jobsOps / population to trigger jobs bonus

  // ----- State -----
  const state = {
    screen: 'STATE_SELECT', // 'STATE_SELECT' | 'GAME_BOARD' | 'WIN'
    selectedStateCode: '',
    terrain: [],                // 2D array [y][x] of terrain string
    placed: {},                 // "x,y" -> tile id
    existingCivic: {},          // "x,y" -> true (existing civic features, unplaceable)
    cycles: 250,
    goodwill: 50,
    power: 0,
    compute: 0,
    water: 0,
    food: 0,
    population: 0,
    selectedTileId: '',
    hoverStateCode: null,
    tesseraeComplete: 0,
    countedCoordCells: {},       // "x,y" -> true (already-won coord nodes)
    pendingTesserae: {},         // "x,y" -> { ticksRemaining, cluster } (forming, not yet locked)
    lastTesseraCells: {},        // "x,y" -> true (cluster to outline on board)
    reaction: null,              // { msg, tone, id }
    reactionTimerHandle: null,
    tickHandle: null,
    gameStartMs: 0,
    // ----- v0.1 economic substrate -----
    tickCount: 0,                // ticks since startGame; year/quarter derived
    cumulativeEmissions: 0,      // kt CO2e since groundbreaking
    cumulativeWaterDraw: 0,      // ML since groundbreaking
    jobsOps: 0,                  // current operating headcount across all tiles
    lastJobsBonusYear: -1,       // jobs-rule fires at most once per game-year
    policies: {},                // placeholder hook for the next pass (CBAs, PILOTs, zoning)
  };

  // ----- DOM root -----
  const app = document.getElementById('app');

  // ===============================================================
  // Helpers
  // ===============================================================

  function key(x, y) { return x + ',' + y; }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function squaredDistance(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }

  function setReaction(msg, tone) {
    state.reaction = { msg, tone, id: Math.random() };
    if (state.reactionTimerHandle) clearTimeout(state.reactionTimerHandle);
    const myId = state.reaction.id;
    state.reactionTimerHandle = setTimeout(() => {
      if (state.reaction && state.reaction.id === myId) {
        state.reaction = null;
        if (state.screen === 'GAME_BOARD') renderGameBoard();
      }
    }, REACTION_FADE_MS);
  }

  // ===============================================================
  // Game start / reset
  // ===============================================================

  function startGame(stateCode) {
    state.selectedStateCode = stateCode;
    state.screen = 'GAME_BOARD';
    state.placed = {};
    state.existingCivic = {};
    state.countedCoordCells = {};
    state.pendingTesserae = {};
    state.lastTesseraCells = {};
    state.selectedTileId = '';
    state.cycles = 250;
    state.goodwill = 50;
    state.power = 0; state.compute = 0; state.water = 0; state.food = 0;
    state.population = 0;
    state.tesseraeComplete = 0;
    state.reaction = null;
    state.gameStartMs = Date.now();
    state.tickCount = 0;
    state.cumulativeEmissions = 0;
    state.cumulativeWaterDraw = 0;
    state.jobsOps = 0;
    state.lastJobsBonusYear = -1;
    state.policies = {};
    generateTerrain(stateCode);
    const sName = window.STATES[stateCode].name;
    setReaction(`Welcome to ${sName}. Lead with civic and housing; build trust before you site the reactor.`, 'accent');
    if (state.tickHandle) clearInterval(state.tickHandle);
    state.tickHandle = setInterval(tick, TICK_MS);
    renderGameBoard();
  }

  function backToStateSelect() {
    state.screen = 'STATE_SELECT';
    state.selectedTileId = '';
    if (state.tickHandle) { clearInterval(state.tickHandle); state.tickHandle = null; }
    renderStateSelect();
  }

  function generateTerrain(stateCode) {
    const biases = window.STATES[stateCode].terrain_bias || ['rural','suburban','urban','industrial','park'];
    state.terrain = [];
    for (let y = 0; y < BOARD_H; y++) {
      const row = [];
      for (let x = 0; x < BOARD_W; x++) {
        row.push(biases[Math.floor(Math.random() * biases.length)]);
      }
      state.terrain.push(row);
    }
    // River
    const ry = 4 + Math.floor(Math.random() * (BOARD_H - 8));
    for (let x = 0; x < BOARD_W; x++) state.terrain[ry][x] = 'river';
    // Highway
    const rx = 6 + Math.floor(Math.random() * (BOARD_W - 12));
    for (let y = 0; y < BOARD_H; y++) {
      if (state.terrain[y][rx] !== 'river') state.terrain[y][rx] = 'highway';
    }
    // Existing civic features (unplaceable)
    let placed = 0, tries = 0;
    while (placed < 3 && tries < 60) {
      tries++;
      const cx = Math.floor(Math.random() * BOARD_W);
      const cy = Math.floor(Math.random() * BOARD_H);
      const t = state.terrain[cy][cx];
      if (t !== 'river' && t !== 'highway' && t !== 'civic') {
        state.terrain[cy][cx] = 'civic';
        state.existingCivic[key(cx, cy)] = true;
        placed++;
      }
    }
  }

  // ===============================================================
  // Placement
  // ===============================================================

  function tryPlace(x, y) {
    const k = key(x, y);
    if (state.placed[k]) {
      setReaction("Already a tile here.", 'bad');
      renderGameBoard();
      return;
    }
    const t = state.terrain[y][x];
    if (t === 'river' || t === 'highway' || t === 'civic') {
      const label = { river:'a river', highway:'a highway', civic:'an existing civic feature' }[t];
      setReaction(`Can't build on ${label}.`, 'bad');
      renderGameBoard();
      return;
    }
    const tileId = state.selectedTileId;
    const def = window.TILES[tileId];
    const capex = def.capex ?? def.cost ?? 0;
    if (state.cycles < capex) {
      setReaction(`Not enough Cycles (need ${capex}).`, 'bad');
      renderGameBoard();
      return;
    }
    // SMR buffer: 2-tile radius from housing/civic
    if (tileId === 'smr') {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          const nk = key(nx, ny);
          if (state.placed[nk] === 'housing' || state.placed[nk] === 'civic') {
            setReaction("SMRs need a 2-tile buffer from housing/civic.", 'bad');
            renderGameBoard();
            return;
          }
          if (state.existingCivic[nk]) {
            setReaction("SMRs need a 2-tile buffer from existing civic features.", 'bad');
            renderGameBoard();
            return;
          }
        }
      }
    }
    // Place
    state.placed[k] = tileId;
    state.cycles -= capex;
    // Goodwill modulated by state sentiment.
    // Pro-sentiment states should AMPLIFY positive base goodwill (civic in WA is even better)
    // AND DAMPEN negative base goodwill (SMR in TX hurts less).
    // Anti-sentiment states do the opposite.
    let modifier = 1.0;
    const sKey = def.sentimentKey || '';
    if (sKey && window.STATES[state.selectedStateCode][sKey] != null) {
      const s = window.STATES[state.selectedStateCode][sKey];
      modifier = def.baseGoodwill >= 0
        ? 1.0 + (s * 0.35)   // positive sentiment amplifies a good thing
        : 1.0 - (s * 0.35);  // positive sentiment dampens a bad thing
    }
    let delta = Math.round(def.baseGoodwill * modifier);
    if (def.baseGoodwill !== 0 && delta === 0) {
      delta = def.baseGoodwill > 0 ? 1 : -1;
    }
    state.goodwill = clamp(state.goodwill + delta, -100, 200);
    const paper = window.STATES[state.selectedStateCode].flavor_paper || "Local Herald";
    const headline = window.headlineFor(tileId, delta, paper);
    setReaction(headline, delta >= 0 ? 'ok' : 'bad');
    checkTesserae();
    renderGameBoard();
  }

  // ===============================================================
  // Tick
  // ===============================================================

  function tick() {
    if (state.screen !== 'GAME_BOARD') return;
    state.tickCount++;
    let dp = 0, dc = 0, dw = 0, df = 0, housingCount = 0;
    let opex = 0, baseRevenue = 0, boostedRevenue = 0;
    let jobsOps = 0, emissions = 0, waterDraw = 0;
    // Index amplifier tiles (Coordination + Civic) for the TFP boost.
    const amplifiers = [];
    for (const k of Object.keys(state.placed)) {
      const id = state.placed[k];
      if (id === 'coordination' || id === 'civic') {
        const [ax, ay] = k.split(',').map(Number);
        amplifiers.push([ax, ay]);
      }
    }
    for (const k of Object.keys(state.placed)) {
      const def = window.TILES[state.placed[k]];
      if (!def) continue;
      dp += def.power || 0;
      dc += def.compute || 0;
      dw += def.water || 0;
      df += def.food || 0;
      opex += def.opex || 0;
      jobsOps += def.jobsOps || 0;
      emissions += def.emissionsPerTick || 0;
      waterDraw += def.waterDrawPerTick || 0;
      if (state.placed[k] === 'housing') housingCount++;
      // Revenue with TFP: count amplifiers within Tessera radius of this tile.
      const tileRevenue = def.revenue ?? def.cyclesPerTick ?? 0;
      if (tileRevenue !== 0) {
        const [tx, ty] = k.split(',').map(Number);
        let count = 0;
        for (const [ax, ay] of amplifiers) {
          if (ax === tx && ay === ty) continue;
          if (squaredDistance(tx, ty, ax, ay) <= TESSERA_RADIUS_SQ) count++;
        }
        const tfp = Math.min(TFP_CAP, 1 + count * TFP_PER_AMPLIFIER);
        baseRevenue += tileRevenue;
        boostedRevenue += tileRevenue * tfp;
      }
    }
    state.power = dp;
    state.compute = dc;
    state.water = dw;
    state.food = df;
    state.cycles += Math.round(boostedRevenue - opex);
    state.population = housingCount * 250;
    state.jobsOps = jobsOps;
    state.cumulativeEmissions += emissions;
    state.cumulativeWaterDraw += waterDraw;
    // Penalties when housing is starving
    if (housingCount > 0) {
      if (state.power < 0) {
        state.goodwill = clamp(state.goodwill - 2, -100, 200);
        setReaction("Brownouts. Goodwill -2.", 'bad');
      }
      if (state.food < housingCount && state.food < 5) {
        state.goodwill = clamp(state.goodwill - 1, -100, 200);
        setReaction("Food shortages. Add a vertical farm. Goodwill -1.", 'bad');
      }
    }
    // Emissions rate rule: penalize if cumulative/year exceeds the state cap.
    // Use yearsElapsed = tickCount / TICKS_PER_YEAR, floored to at least 0.25
    // so a single bad quarter doesn't immediately trip the rule.
    const yearsElapsed = Math.max(0.25, state.tickCount / TICKS_PER_YEAR);
    const sObj = window.STATES[state.selectedStateCode] || {};
    const emCap = sObj.emissionsCap ?? STATE_DEFAULT_EMISSIONS_CAP;
    if (state.cumulativeEmissions / yearsElapsed > emCap) {
      state.goodwill = clamp(state.goodwill - 1, -100, 200);
      setReaction("Emissions outpacing the state cap. Neighbors are organizing. Goodwill -1.", 'bad');
    }
    // Jobs rule: strong local employment lifts goodwill, at most once per year.
    const currentYear = Math.floor(state.tickCount / TICKS_PER_YEAR);
    if (state.population > 0
        && state.jobsOps >= state.population * JOBS_GOODWILL_THRESHOLD
        && state.goodwill < 100
        && currentYear > state.lastJobsBonusYear) {
      state.goodwill = clamp(state.goodwill + 1, -100, 200);
      state.lastJobsBonusYear = currentYear;
      setReaction("Strong local employment — community supports the project. Goodwill +1.", 'ok');
    }
    if (state.goodwill <= -50) {
      setReaction("Goodwill collapsed. Moratorium likely. Press B for a different state, R to restart.", 'bad');
    }
    // Pending tessera stabilization (DESIGN.md win condition).
    // Any pending must hold Goodwill ≥ 0 for STABILIZATION_TICKS ticks. If it
    // drops below zero, the candidate dissipates and must reform.
    let pendingFailed = false;
    for (const pk of Object.keys(state.pendingTesserae)) {
      if (state.goodwill < 0) {
        delete state.pendingTesserae[pk];
        state.lastTesseraCells = {};
        pendingFailed = true;
        setReaction("Stabilization failed — Goodwill dropped below zero. The Tessera dissipates.", 'bad');
        continue;
      }
      state.pendingTesserae[pk].ticksRemaining--;
      if (state.pendingTesserae[pk].ticksRemaining <= 0) {
        state.countedCoordCells[pk] = true;
        state.tesseraeComplete++;
        state.lastTesseraCells = state.pendingTesserae[pk].cluster;
        delete state.pendingTesserae[pk];
        state.screen = 'WIN';
        if (state.tickHandle) { clearInterval(state.tickHandle); state.tickHandle = null; }
        renderWin();
        return;
      } else {
        const n = state.pendingTesserae[pk].ticksRemaining;
        setReaction(`Stabilizing… ${n} more tick${n === 1 ? '' : 's'} to lock the Tessera in.`, 'ok');
      }
    }
    checkTesserae();
    if (pendingFailed) {
      renderGameBoard();
    } else {
      renderHud();
      renderTray();
      renderReaction();
    }
  }

  // ===============================================================
  // Tessera check
  // ===============================================================

  function checkTesserae() {
    // Find a Coordination Node not yet credited and not already stabilizing.
    // If its radius-5 cluster covers all six layers and goodwill ≥ 0, enter
    // the stabilization window. tick() finishes the job.
    for (const k of Object.keys(state.placed)) {
      if (state.placed[k] !== 'coordination') continue;
      if (state.countedCoordCells[k]) continue;
      if (state.pendingTesserae[k]) continue;
      const [cx, cy] = k.split(',').map(Number);
      const foundLayers = {};
      const cluster = { [k]: true };
      for (const ck of Object.keys(state.placed)) {
        const [ox, oy] = ck.split(',').map(Number);
        if (squaredDistance(ox, oy, cx, cy) <= TESSERA_RADIUS_SQ) {
          foundLayers[window.TILES[state.placed[ck]].layer] = true;
          cluster[ck] = true;
        }
      }
      const allFound = NEEDED_LAYERS.every(l => foundLayers[l]);
      if (allFound && state.goodwill >= 0) {
        state.pendingTesserae[k] = { ticksRemaining: STABILIZATION_TICKS, cluster };
        state.lastTesseraCells = cluster;
        setReaction(`Tessera forming — hold Goodwill ≥ 0 for ${STABILIZATION_TICKS} ticks to lock it in.`, 'accent');
        return;
      }
    }
  }

  // ===============================================================
  // Rendering
  // ===============================================================

  function clearApp() { app.innerHTML = ''; }

  // ----- State select -----
  function renderStateSelect() {
    clearApp();
    const screen = el('div', 'screen-state-select');
    screen.appendChild(el('h1', 'title', 'TESSERA'));
    screen.appendChild(el('p', 'subtitle', 'Build the seven-layer neighborhood. Mosaic the Arcology.'));
    screen.appendChild(el('p', 'cta', 'Pick a state to host your Tessera.'));

    const grid = el('div', 'state-grid');
    for (const code of Object.keys(window.STATES)) {
      const s = window.STATES[code];
      const btn = el('button', 'state-btn');
      btn.appendChild(el('span', 'state-code', code));
      btn.appendChild(el('span', 'state-name', s.name));
      const bars = el('div', 'state-bars');
      for (const key of ['nuclear', 'data_center', 'density', 'enviro', 'fed_trust']) {
        const v = s[key] || 0;
        const bar = el('div', 'state-bar ' + (v > 0 ? 'pos' : v < 0 ? 'neg' : ''));
        const mag = Math.abs(v);
        if (mag === 0) bar.appendChild(el('div', 'pip'));
        else for (let i = 0; i < mag; i++) bar.appendChild(el('div', 'pip'));
        bars.appendChild(bar);
      }
      btn.appendChild(bars);
      btn.addEventListener('mouseenter', () => { state.hoverStateCode = code; updateStateDetail(); });
      btn.addEventListener('focus', () => { state.hoverStateCode = code; updateStateDetail(); });
      btn.addEventListener('click', () => startGame(code));
      grid.appendChild(btn);
    }
    screen.appendChild(grid);

    const detail = el('div', 'state-detail');
    detail.id = 'state-detail';
    detail.innerHTML = '<h2 style="color: var(--dim); font-weight: 400;">Hover or focus a state to preview its sentiment profile.</h2>';
    screen.appendChild(detail);

    screen.appendChild(el('div', 'state-footer', 'Each state\'s profile shapes how the community reacts to each tile. Hover the buttons above to see sentiment bars: green is receptive, red is hostile.'));

    app.appendChild(screen);
  }

  function updateStateDetail() {
    const detail = document.getElementById('state-detail');
    if (!detail || !state.hoverStateCode) return;
    const s = window.STATES[state.hoverStateCode];
    detail.innerHTML = '';
    detail.appendChild(el('h2', '', `${state.hoverStateCode} — ${s.name}`));
    const scores = el('div', 'scores',
      `Nuclear: ${signed(s.nuclear)}   Data centers: ${signed(s.data_center)}   ` +
      `Density: ${signed(s.density)}   Environment: ${signed(s.enviro)}   ` +
      `Federal trust: ${signed(s.fed_trust)}`);
    detail.appendChild(scores);
    detail.appendChild(el('div', 'paper', `Local paper: ${s.flavor_paper}`));
  }

  // ----- Game board -----
  function renderGameBoard() {
    clearApp();
    const screen = el('div', 'screen-game-board');
    screen.id = 'screen-game-board';
    screen.appendChild(buildHud());
    screen.appendChild(buildBoard());
    screen.appendChild(buildTray());
    screen.appendChild(buildSelectedDesc());
    screen.appendChild(buildReaction());
    app.appendChild(screen);
  }

  function buildHud() {
    const hud = el('div', 'hud');
    hud.id = 'hud';
    const s = window.STATES[state.selectedStateCode];
    const block = el('div', 'state-name-block');
    block.appendChild(el('span', 'state-name-line', `${state.selectedStateCode} — ${s.name}`));
    block.appendChild(el('span', 'paper-line', s.flavor_paper));
    hud.appendChild(block);
    // Resource tones: green if you're in surplus, red if in deficit, neutral otherwise.
    const housingCount = Object.values(state.placed).filter(id => id === 'housing').length;
    const powerTone = state.power < 0 ? 'bad' : (state.power > 0 ? 'ok' : null);
    const waterTone = state.water < 0 ? 'bad' : (state.water > 0 ? 'ok' : null);
    const foodTone  = housingCount === 0
      ? null
      : (state.food < housingCount && state.food < 5 ? 'bad' : 'ok');
    // Time anchor: 1 tick = 1 quarter. Year 1 · Q1 at tick 0.
    const year = Math.floor(state.tickCount / TICKS_PER_YEAR) + 1;
    const quarter = (state.tickCount % TICKS_PER_YEAR) + 1;
    // Emissions tone: green if net-avoided, red if exceeding rate cap, neutral otherwise.
    const yearsElapsed = Math.max(0.25, state.tickCount / TICKS_PER_YEAR);
    const emCap = s.emissionsCap ?? STATE_DEFAULT_EMISSIONS_CAP;
    const emRate = state.cumulativeEmissions / yearsElapsed;
    const emTone = state.cumulativeEmissions < 0 ? 'ok'
                 : (emRate > emCap ? 'bad' : null);
    hud.appendChild(stat('Cycles',   state.cycles,           'accent', 'Quarterly community-investable capital. Capex draws it down; revenue and rents replenish.'));
    hud.appendChild(stat('Goodwill', signed(state.goodwill), state.goodwill >= 0 ? 'ok' : 'bad', 'Community trust. Drops below 0 and Tessera candidates dissipate. Reaches −50 and a moratorium looms.'));
    hud.appendChild(stat('Power',    signed(state.power),    powerTone, 'Net MW across all tiles. Negative + housing = brownouts (−2 goodwill/tick).'));
    hud.appendChild(stat('Compute',  state.compute,          null,      'AI compute output. Not yet spent — sets up v1+ economy.'));
    hud.appendChild(stat('Water',    signed(state.water),    waterTone, 'Net water balance. Farms produce, housing/civic consume.'));
    hud.appendChild(stat('Food',     state.food,             foodTone,  'Food output. Must meet population or housing starves (−1 goodwill/tick).'));
    hud.appendChild(stat('Pop',      state.population,       null,      '~250 residents per Mass Timber Housing tile.'));
    hud.appendChild(stat('Jobs',     state.jobsOps,          null,      `Operating jobs across all tiles. ≥${Math.round(JOBS_GOODWILL_THRESHOLD * 100)}% of pop triggers a yearly goodwill bonus.`));
    hud.appendChild(stat('Emissions', state.cumulativeEmissions, emTone, `Cumulative kt CO2e since groundbreaking. State cap: ${emCap} kt/yr; current rate: ${Math.round(emRate)} kt/yr.`));
    hud.appendChild(stat('Year',     `${year} · Q${quarter}`, 'accent', `1 tick = 1 quarter. ${TICKS_PER_YEAR} ticks/year.`));
    hud.appendChild(stat('Tesserae', state.tesseraeComplete, 'accent',  'Completed Tesserae this session.'));
    const hints = el('div', 'hints');
    hints.innerHTML = '<div>R: restart · B: back · Esc/RClick: deselect</div>'
                    + `<div>Tick every ${TICK_MS / 1000}s (= 1 quarter). Place tiles to grow.</div>`;
    hud.appendChild(hints);
    return hud;
  }

  function renderHud() {
    const old = document.getElementById('hud');
    if (!old) return;
    old.replaceWith(buildHud());
  }

  function stat(label, value, tone, title) {
    const w = el('div', 'stat');
    if (title) w.title = title;
    w.appendChild(el('span', 'stat-label', label));
    const v = el('span', 'stat-value' + (tone ? ' ' + tone : ''), String(value));
    w.appendChild(v);
    return w;
  }

  const TERRAIN_INFO = {
    rural:      { name: 'Rural',      build: true,  hint: 'open land, accepts any tile' },
    suburban:   { name: 'Suburban',   build: true,  hint: 'low-density mixed use' },
    urban:      { name: 'Urban',      build: true,  hint: 'dense existing fabric' },
    industrial: { name: 'Industrial', build: true,  hint: 'zoned for heavy work' },
    park:       { name: 'Park',       build: true,  hint: 'green space, buildable but watch goodwill' },
    river:      { name: 'River',      build: false, hint: 'cannot build' },
    highway:    { name: 'Highway',    build: false, hint: 'cannot build' },
    civic:      { name: 'Existing civic', build: false, hint: 'existing school/clinic/park — cannot build over' },
  };

  function buildBoard() {
    const wrap = el('div', 'board-wrap');
    const board = el('div', 'board');
    board.id = 'board';
    for (let y = 0; y < BOARD_H; y++) {
      for (let x = 0; x < BOARD_W; x++) {
        const t = state.terrain[y][x];
        const k = key(x, y);
        const cell = el('div', 't-' + t + ' cell');
        cell.dataset.x = x; cell.dataset.y = y;
        const tInfo = TERRAIN_INFO[t] || { name: t, build: true, hint: '' };
        let titleParts = [tInfo.name];
        if (t === 'river' || t === 'highway') cell.classList.add('locked');
        if (state.existingCivic[k]) {
          cell.classList.add('locked');
          const dot = el('div', 'civic-marker');
          cell.appendChild(dot);
          titleParts = ['Existing civic feature'];
        }
        if (state.placed[k]) {
          cell.classList.add('has-tile');
          const def = window.TILES[state.placed[k]];
          const img = document.createElement('img');
          img.className = 'tile-art';
          img.src = def.art;
          img.alt = def.name;
          img.draggable = false;
          cell.appendChild(img);
          if (state.lastTesseraCells[k]) {
            cell.classList.add('in-tessera');
          }
          titleParts = [`${def.name} (on ${tInfo.name.toLowerCase()})`];
        } else if (tInfo.hint) {
          titleParts.push(tInfo.hint);
        }
        cell.title = titleParts.join(' · ');
        cell.addEventListener('click', () => {
          if (!state.selectedTileId) return;
          tryPlace(x, y);
        });
        board.appendChild(cell);
      }
    }
    wrap.appendChild(board);
    wrap.appendChild(buildLegend());
    return wrap;
  }

  function buildLegend() {
    const legend = el('div', 'legend');
    legend.appendChild(el('span', 'legend-title', 'Map key'));
    const order = ['rural', 'suburban', 'urban', 'industrial', 'park', 'river', 'highway', 'civic'];
    for (const t of order) {
      const info = TERRAIN_INFO[t];
      const item = el('div', 'legend-item' + (info.build ? '' : ' locked'));
      item.title = info.hint;
      const swatch = el('span', 't-' + t + ' legend-swatch' + (t === 'civic' ? ' has-marker' : ''));
      item.appendChild(swatch);
      item.appendChild(el('span', 'legend-name', info.name));
      legend.appendChild(item);
    }
    return legend;
  }

  function buildTray() {
    const wrap = el('div', 'tray-wrap');
    wrap.id = 'tray-wrap';
    wrap.appendChild(el('div', 'tray-label', 'TILE TRAY  ·  click to select, click board to place'));
    const tray = el('div', 'tray');
    for (const id of Object.keys(window.TILES)) {
      const def = window.TILES[id];
      const sKey = def.sentimentKey || '';
      let modifier = 1.0;
      if (sKey && state.selectedStateCode && window.STATES[state.selectedStateCode][sKey] != null) {
        const s = window.STATES[state.selectedStateCode][sKey];
        modifier = def.baseGoodwill >= 0 ? 1.0 + (s * 0.35) : 1.0 - (s * 0.35);
      }
      const projected = Math.round(def.baseGoodwill * modifier);
      const capex = def.capex ?? def.cost ?? 0;
      const affordable = state.cycles >= capex;
      const jobsOps = def.jobsOps || 0;
      const emPerTick = def.emissionsPerTick || 0;
      const row = el('button', 'tray-tile' + (state.selectedTileId === id ? ' selected' : '') + (affordable ? '' : ' unaffordable'));
      const icon = document.createElement('img');
      icon.className = 'tile-icon';
      icon.src = def.art;
      icon.alt = def.name;
      icon.draggable = false;
      row.appendChild(icon);
      const body = el('div', 'tile-body');
      body.appendChild(el('div', 'tile-name', def.name));
      const meta = el('div', 'tile-meta');
      meta.innerHTML = `${capex}C · base <span class="${def.baseGoodwill >= 0 ? 'gw-pos' : 'gw-neg'}">${signed(def.baseGoodwill)}</span>` +
                       ` · here <span class="${projected >= 0 ? 'gw-pos' : 'gw-neg'}">${signed(projected)}</span> · ${def.layer}` +
                       ` · J${jobsOps} · E${signed(emPerTick)}`;
      body.appendChild(meta);
      row.appendChild(body);
      row.addEventListener('click', () => {
        state.selectedTileId = (state.selectedTileId === id) ? '' : id;
        renderTray();
        renderSelectedDesc();
      });
      tray.appendChild(row);
    }
    wrap.appendChild(tray);
    return wrap;
  }

  function renderTray() {
    const old = document.getElementById('tray-wrap');
    if (!old) return;
    old.replaceWith(buildTray());
  }

  function buildSelectedDesc() {
    const wrap = el('div', 'selected-tile-desc' + (state.selectedTileId ? '' : ' empty'));
    wrap.id = 'selected-tile-desc';
    if (!state.selectedTileId) {
      wrap.appendChild(el('div', 'name', 'No tile selected. Click a tile in the tray to begin.'));
    } else {
      const def = window.TILES[state.selectedTileId];
      const name = el('div', 'name', `${def.name}  —  ${def.subtitle}`);
      name.style.color = def.color;
      wrap.appendChild(name);
      wrap.appendChild(el('div', 'desc', def.description));
    }
    return wrap;
  }

  function renderSelectedDesc() {
    const old = document.getElementById('selected-tile-desc');
    if (!old) return;
    old.replaceWith(buildSelectedDesc());
  }

  function buildReaction() {
    const wrap = el('div', 'reaction-wrap');
    wrap.id = 'reaction-wrap';
    if (state.reaction) {
      const r = el('div', 'reaction ' + (state.reaction.tone || ''), state.reaction.msg);
      wrap.appendChild(r);
    } else {
      const r = el('div', 'reaction empty', '— waiting for action —');
      wrap.appendChild(r);
    }
    return wrap;
  }

  function renderReaction() {
    const old = document.getElementById('reaction-wrap');
    if (!old) return;
    old.replaceWith(buildReaction());
  }

  // ----- Win overlay -----
  function renderWin() {
    // Keep board visible underneath; layer the overlay on top.
    renderGameBoard();
    const screen = document.getElementById('screen-game-board') || app;
    const overlay = el('div', 'win-overlay');
    overlay.appendChild(el('h2', 'win-title', 'TESSERA COMPLETE'));
    const sName = window.STATES[state.selectedStateCode].name;
    overlay.appendChild(el('p', 'win-sub', `${sName}. Six layers in place. Coordination online.`));
    overlay.appendChild(el('p', 'win-flav', 'The mosaic begins. The Arcology is one Tessera closer.'));
    const elapsed = Math.floor((Date.now() - state.gameStartMs) / 1000);
    overlay.appendChild(el('p', 'win-stats', `Goodwill: ${signed(state.goodwill)}    Cycles remaining: ${state.cycles}    Time: ${elapsed}s`));
    const cta = el('div', 'win-cta');
    cta.innerHTML = 'Press <span class="key">Enter</span> or click anywhere to pick a new state.';
    overlay.appendChild(cta);
    overlay.addEventListener('click', backToStateSelect);
    screen.appendChild(overlay);
  }

  // ===============================================================
  // DOM helpers
  // ===============================================================

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function signed(v) { return (v >= 0 ? '+' : '') + v; }

  // ===============================================================
  // Global input
  // ===============================================================

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.selectedTileId) {
        state.selectedTileId = '';
        if (state.screen === 'GAME_BOARD') { renderTray(); renderSelectedDesc(); }
      }
    } else if (e.key === 'r' || e.key === 'R') {
      if (state.screen !== 'STATE_SELECT' && state.selectedStateCode) {
        startGame(state.selectedStateCode);
      }
    } else if (e.key === 'b' || e.key === 'B') {
      if (state.screen !== 'STATE_SELECT') backToStateSelect();
    } else if (e.key === 'Enter') {
      if (state.screen === 'WIN') backToStateSelect();
    }
  });

  // Right-click to deselect
  document.addEventListener('contextmenu', (e) => {
    if (state.screen === 'GAME_BOARD' && state.selectedTileId) {
      e.preventDefault();
      state.selectedTileId = '';
      renderTray();
      renderSelectedDesc();
    }
  });

  // ===============================================================
  // Bootstrap
  // ===============================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderStateSelect);
  } else {
    renderStateSelect();
  }

  // Expose for debugging from DevTools console
  window.Tessera = { state, startGame, backToStateSelect, tick, checkTesserae };
})();

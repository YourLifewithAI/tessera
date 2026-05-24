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
  const TICK_MS = 4000;                  // legacy alias = NORMAL speed
  const TICKS_PER_YEAR = 4;              // 1 tick = 1 quarter
  // v0.5 time controls — SimCity-style pause + 3 speeds.
  const SPEED_MS = { PAUSED: 0, SLOW: 8000, NORMAL: 4000, FAST: 1000 };
  const SPEED_ORDER = ['PAUSED', 'SLOW', 'NORMAL', 'FAST'];
  const SPEED_LABEL = { PAUSED: '◼', SLOW: '▶', NORMAL: '▶▶', FAST: '▶▶▶' };
  const SPEED_NAME  = { PAUSED: 'Paused', SLOW: 'Slow (8s/quarter)', NORMAL: 'Normal (4s)', FAST: 'Fast (1s)' };
  const TESSERA_RADIUS_SQ = 25; // radius 5 squared
  const NEEDED_LAYERS = ["Power", "Silicon", "Materials", "Robotics", "Closed Loops", "Life"];
  const REACTION_FADE_MS = 5000;
  const STABILIZATION_TICKS = 5; // per DESIGN.md: Goodwill ≥ 0 sustained for N ticks after formation

  // ----- Economic constants (v0.3 dollars) -----
  // All money is stored in millions of dollars; format at display time.
  // Emissions are kt CO2e/quarter; cumulative compared against a per-year rate.
  const STATE_DEFAULT_EMISSIONS_CAP = 120; // kt CO2e/year if state has no override
  const TFP_PER_AMPLIFIER = 0.05;          // each adjacent Coordination/Civic boosts revenue 5%
  const TFP_CAP = 1.25;                    // hard ceiling on TFP multiplier
  const JOBS_GOODWILL_THRESHOLD = 0.5;     // jobsOps / population to trigger jobs bonus

  // ----- State -----
  const state = {
    screen: 'STATE_SELECT', // 'STATE_SELECT' | 'PLACE_SELECT' | 'SPONSOR_SELECT' | 'GAME_BOARD' | 'WIN'
    selectedStateCode: '',
    terrain: [],                // 2D array [y][x] of terrain string
    placed: {},                 // "x,y" -> tile id
    existingCivic: {},          // "x,y" -> true (existing civic features, unplaceable)
    dollars: 80000,                  // budget in $M (set per sponsor on startGame)
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
    // v0.5 time controls
    speed: 'NORMAL',                 // one of SPEED_ORDER
    speedBeforeAutoPause: '',        // restored when an auto-pause source closes
    autoPaused: false,
    // ----- v0.1 economic substrate -----
    tickCount: 0,                // ticks since startGame; year/quarter derived
    cumulativeEmissions: 0,      // kt CO2e since groundbreaking
    cumulativeWaterDraw: 0,      // ML since groundbreaking
    jobsOps: 0,                  // current operating headcount across all tiles
    lastJobsBonusYear: -1,       // jobs-rule fires at most once per game-year
    policies: {},                // placeholder hook for the next pass (CBAs, PILOTs, zoning)
    // ----- v0.2 place data -----
    placeId: '',                 // selected place id, or '' for state-only flow
    placeData: null,             // { present, appliedUpdates } from TesseraData.derivePresent
    activeCityId: null,          // city where the Tessera is "being built" (county seat by default)
    // ----- v0.3 sponsor -----
    sponsorId: '',               // knockoff hyperscaler id (see data/sponsors.js)
    sponsor: null,               // resolved sponsor record (or null if state-only flow)
    // ----- v0.4 research -----
    research: {
      completed: {},             // { researchId: true }
      inProgressId: '',          // currently funded research, or '' if idle
      ticksRemaining: 0,         // quarters left on in-progress research
    },
    researchPanelOpen: false,    // modal toggle
    // ----- v0.7 mobile UX -----
    highlightedCellXY: null,     // { x, y } | null — cell tapped on mobile
    mobileSheet: '',             // '' | 'build' | 'place' | 'menu' (research uses its own overlay)
    boardScroll: { x: 0, y: 0 }, // .board-wrap scrollLeft/scrollTop — persisted across rebuilds
    reactionCards: [],           // [{ id, msg, tone }] — floating cards on mobile board
  };

  // ----- DOM root -----
  const app = document.getElementById('app');

  // ===============================================================
  // Helpers
  // ===============================================================

  function key(x, y) { return x + ',' + y; }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ===== v0.5 time controls =====
  function setSpeed(s) {
    if (!(s in SPEED_MS)) return;
    state.speed = s;
    if (state.tickHandle) { clearInterval(state.tickHandle); state.tickHandle = null; }
    if (s !== 'PAUSED' && state.screen === 'GAME_BOARD') {
      state.tickHandle = setInterval(tick, SPEED_MS[s]);
    }
    // If the user manually changes speed while auto-paused, clear that bookkeeping.
    if (s !== 'PAUSED') state.autoPaused = false;
    if (state.screen === 'GAME_BOARD') renderHud();
  }
  function togglePause() {
    if (state.screen !== 'GAME_BOARD') return;
    if (state.speed === 'PAUSED') {
      setSpeed(state.speedBeforeAutoPause || 'NORMAL');
      state.speedBeforeAutoPause = '';
    } else {
      state.speedBeforeAutoPause = state.speed;
      setSpeed('PAUSED');
    }
  }
  function autoPause() {
    if (state.screen !== 'GAME_BOARD') return;
    if (state.speed === 'PAUSED') return;        // already paused; nothing to restore later
    state.speedBeforeAutoPause = state.speed;
    state.autoPaused = true;
    setSpeed('PAUSED');
    state.autoPaused = true;                     // setSpeed clears this; re-set
  }
  function autoResume() {
    if (!state.autoPaused) return;               // user took manual control; don't override
    const prev = state.speedBeforeAutoPause || 'NORMAL';
    state.speedBeforeAutoPause = '';
    state.autoPaused = false;
    setSpeed(prev);
  }

  // ===== v0.4 research helpers =====
  // getEffectiveTile(tileId) returns a clone of the tile def with all
  // completed-research effects applied (capex/opex/revenue/goodwill/etc.).
  // Called per placement and per tray render — keep it cheap.
  function getEffectiveTile(tileId) {
    const base = window.TILES && window.TILES[tileId];
    if (!base) return null;
    const def = Object.assign({}, base);
    const completed = state.research && state.research.completed || {};
    const RES = window.RESEARCH || {};
    for (const rid of Object.keys(completed)) {
      const r = RES[rid]; if (!r) continue;
      for (const e of (r.effects || [])) {
        if (e.type === 'tile_field_mult' && e.tileId === tileId) {
          def[e.field] = (def[e.field] || 0) * e.factor;
        } else if (e.type === 'tile_field_add' && e.tileId === tileId) {
          def[e.field] = (def[e.field] || 0) + e.delta;
        } else if (e.type === 'tile_goodwill_add' && e.tileId === tileId) {
          def.baseGoodwill = (def.baseGoodwill || 0) + e.delta;
        } else if (e.type === 'layer_field_mult' && e.layer === base.layer) {
          def[e.field] = (def[e.field] || 0) * e.factor;
        } else if (e.type === 'global_capex_mult') {
          def.capex = (def.capex || 0) * e.factor;
        } else if (e.type === 'global_goodwill_floor_add') {
          if ((def.baseGoodwill || 0) < 0) {
            def.baseGoodwill = Math.min(0, (def.baseGoodwill || 0) + e.delta);
          }
        }
      }
    }
    // Tidy floats so $4000 * 0.85 = $3400 (not 3399.9999...).
    if (def.capex != null) def.capex = Math.round(def.capex);
    if (def.opex != null) def.opex = Math.round(def.opex * 10) / 10;
    if (def.revenue != null) def.revenue = Math.round(def.revenue * 10) / 10;
    if (def.waterDrawPerTick != null) def.waterDrawPerTick = Math.round(def.waterDrawPerTick * 10) / 10;
    if (def.emissionsPerTick != null) def.emissionsPerTick = Math.round(def.emissionsPerTick * 10) / 10;
    if (def.baseGoodwill != null) def.baseGoodwill = Math.round(def.baseGoodwill);
    return def;
  }

  // isTileUnlocked(tileId) — true if the tile has no unlock requirement
  // or the requirement has been researched.
  function isTileUnlocked(tileId) {
    const base = window.TILES && window.TILES[tileId];
    if (!base || !base.unlockedBy) return true;
    return !!(state.research && state.research.completed && state.research.completed[base.unlockedBy]);
  }

  // Concern/need scoring multipliers from completed research.
  function concernSoftenerFactor(tileId, issue) {
    let factor = 1;
    const completed = state.research && state.research.completed || {};
    const RES = window.RESEARCH || {};
    const needle = (issue || '').toLowerCase();
    for (const rid of Object.keys(completed)) {
      const r = RES[rid]; if (!r) continue;
      for (const e of (r.effects || [])) {
        if (e.type !== 'concern_softener' || e.tileId !== tileId) continue;
        if (!e.issueMatch || needle.indexOf(e.issueMatch.toLowerCase()) !== -1) {
          factor *= e.factor;
        }
      }
    }
    return factor;
  }
  function needAmplifierFactor(tileId, issue) {
    let factor = 1;
    const completed = state.research && state.research.completed || {};
    const RES = window.RESEARCH || {};
    const needle = (issue || '').toLowerCase();
    for (const rid of Object.keys(completed)) {
      const r = RES[rid]; if (!r) continue;
      for (const e of (r.effects || [])) {
        if (e.type !== 'need_amplifier' || e.tileId !== tileId) continue;
        if (!e.issueMatch || needle.indexOf(e.issueMatch.toLowerCase()) !== -1) {
          factor *= e.factor;
        }
      }
    }
    return factor;
  }

  // Research lifecycle.
  function researchStatus(rid) {
    if (state.research.completed[rid]) return 'completed';
    if (state.research.inProgressId === rid) return 'in_progress';
    const r = window.RESEARCH[rid];
    if (!r) return 'locked';
    for (const p of (r.prereqs || [])) {
      if (!state.research.completed[p]) return 'locked';
    }
    return 'available';
  }
  function canAffordResearch(rid) {
    const r = window.RESEARCH[rid]; if (!r) return false;
    return state.dollars >= (r.costM || 0);
  }
  function startResearch(rid) {
    const r = window.RESEARCH[rid]; if (!r) return;
    if (researchStatus(rid) !== 'available') return;
    if (!canAffordResearch(rid)) return;
    // If something else is in progress, refuse — one at a time.
    if (state.research.inProgressId) return;
    state.dollars -= (r.costM || 0);
    state.research.inProgressId = rid;
    state.research.ticksRemaining = r.durationQuarters || 1;
  }
  function cancelResearch() {
    // No refund — funding sunk into the program.
    state.research.inProgressId = '';
    state.research.ticksRemaining = 0;
  }

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
        if (state.screen === 'GAME_BOARD') renderReaction();
      }
    }, REACTION_FADE_MS);
    // v0.7: also push a floating card for the mobile board overlay.
    pushReactionCard(msg, tone);
  }

  // v0.7: floating reaction-card stack rendered over the board on mobile.
  // setReaction always pushes one; the stack is hidden via CSS on desktop.
  function pushReactionCard(msg, tone) {
    const id = Math.random();
    state.reactionCards.push({ id, msg, tone });
    while (state.reactionCards.length > 3) state.reactionCards.shift();
    renderReactionOverlay();
    setTimeout(() => {
      state.reactionCards = state.reactionCards.filter(c => c.id !== id);
      renderReactionOverlay();
    }, 4000);
  }

  function isMobile() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches);
  }

  // ===============================================================
  // Game start / reset
  // ===============================================================

  function startGame(stateCode, placeId, sponsorId) {
    state.selectedStateCode = stateCode;
    state.screen = 'GAME_BOARD';
    state.placed = {};
    state.existingCivic = {};
    state.countedCoordCells = {};
    state.pendingTesserae = {};
    state.lastTesseraCells = {};
    state.selectedTileId = '';
    state.highlightedCellXY = null;
    state.boardScroll = { x: 0, y: 0 };
    // Sponsor seeds budget and starting goodwill.
    state.sponsorId = sponsorId || '';
    state.sponsor = (sponsorId && window.SPONSORS) ? (window.SPONSORS[sponsorId] || null) : null;
    state.dollars = state.sponsor ? state.sponsor.startingBudgetM : 25000;  // $25B fallback
    state.goodwill = 50 + (state.sponsor ? (state.sponsor.startingGoodwill || 0) : 0);
    // Research: sponsor's starting nodes are pre-completed.
    state.research = { completed: {}, inProgressId: '', ticksRemaining: 0 };
    if (state.sponsor && Array.isArray(state.sponsor.startingResearch)) {
      for (const rid of state.sponsor.startingResearch) {
        if (window.RESEARCH && window.RESEARCH[rid]) state.research.completed[rid] = true;
      }
    }
    state.researchPanelOpen = false;
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
    state.placeId = placeId || '';
    state.placeData = null;
    state.activeCityId = null;
    if (placeId && window.TesseraData) {
      try {
        const result = window.TesseraData.derivePresent(placeId, '2026-05-01');
        if (result) {
          state.placeData = result;
          const seat = (result.present.cities || []).find(c => c.isCountySeat)
                    || (result.present.cities || [])[0];
          if (seat) state.activeCityId = seat.id;
        }
      } catch (e) {
        console.warn('TesseraData.derivePresent failed', e);
      }
    }
    generateTerrain(stateCode);
    const sName = window.STATES[stateCode].name;
    setReaction(`Welcome to ${sName}. Lead with civic and housing; build trust before you site the reactor.`, 'accent');
    state.speed = 'NORMAL';
    state.speedBeforeAutoPause = '';
    state.autoPaused = false;
    setSpeed('NORMAL');
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
    const def = getEffectiveTile(tileId);
    const capex = def.capex ?? def.cost ?? 0;
    if (state.dollars < capex) {
      setReaction(`Not enough budget — ${def.name} costs ${formatDollars(capex)}.`, 'bad');
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
    state.dollars -= capex;
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
    // v0.2 city needs/concerns layer (only when a place is loaded).
    const cityResult = applyCityNeedsRule(tileId);
    delta += cityResult.delta;
    state.goodwill = clamp(state.goodwill + delta, -100, 200);
    const paper = window.STATES[state.selectedStateCode].flavor_paper || "Local Herald";
    let headline = window.headlineFor(tileId, delta, paper);
    if (cityResult.fragments.length) {
      headline += ' — ' + cityResult.fragments.join(' · ');
    }
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
    // Research progress.
    if (state.research.inProgressId && state.research.ticksRemaining > 0) {
      state.research.ticksRemaining -= 1;
      if (state.research.ticksRemaining <= 0) {
        const rid = state.research.inProgressId;
        const r = window.RESEARCH[rid];
        state.research.completed[rid] = true;
        state.research.inProgressId = '';
        state.research.ticksRemaining = 0;
        if (r) setReaction(`Research complete: ${r.name}.`, 'ok');
      }
    }
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
      const def = getEffectiveTile(state.placed[k]);
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
      const tileRevenue = def.revenue || 0;
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
    state.dollars += Math.round(boostedRevenue - opex);
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
      btn.addEventListener('click', () => {
        state.selectedStateCode = code;
        state.placeId = '';
        const places = (window.TesseraData && window.TesseraData.listPlacesForState)
          ? window.TesseraData.listPlacesForState(code) : [];
        if (places.length > 0) {
          state.screen = 'PLACE_SELECT';
          renderPlaceSelect(places);
        } else {
          goToSponsorSelect();
        }
      });
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

  // ----- Place select -----
  function renderPlaceSelect(places) {
    clearApp();
    const screen = el('div', 'screen-place-select');
    const sName = window.STATES[state.selectedStateCode].name;
    screen.appendChild(el('h1', 'title', sName.toUpperCase()));
    screen.appendChild(el('p', 'subtitle', 'Pick a place to host your Tessera.'));
    screen.appendChild(el('p', 'cta', 'County data shapes economics. City data shapes who lives nearby and how they feel about it.'));

    const grid = el('div', 'place-grid');
    for (const p of places) {
      const btn = el('button', 'place-btn');
      btn.appendChild(el('span', 'place-name', p.displayName));
      const baseline = window.TesseraData.getBaseline(p.id);
      const cityCount = baseline && baseline.cities ? baseline.cities.length : 0;
      const pop = baseline && baseline.county ? baseline.county.population : null;
      const meta = `${cityCount} cities · pop ${pop ? pop.toLocaleString() : '—'} · baseline ${baseline ? baseline.baselineDate : '?'}`;
      btn.appendChild(el('span', 'place-meta', meta));
      btn.addEventListener('click', () => { state.placeId = p.id; goToSponsorSelect(); });
      grid.appendChild(btn);
    }
    screen.appendChild(grid);

    const skip = el('button', 'place-skip', `Play ${sName} without a specific place (state-level sentiment only)`);
    skip.addEventListener('click', () => { state.placeId = ''; goToSponsorSelect(); });
    screen.appendChild(skip);

    const back = el('button', 'place-back', '← Back to state picker');
    back.addEventListener('click', () => { state.screen = 'STATE_SELECT'; renderStateSelect(); });
    screen.appendChild(back);

    screen.appendChild(el('div', 'state-footer', 'Place data is loaded via the TesseraData adapter. Forkers: drop a JS file in data/places/ or wire up a custom adapter. See HACKING.md.'));

    app.appendChild(screen);
  }

  // ----- Sponsor select (hyperscaler picker) -----
  function goToSponsorSelect() {
    state.screen = 'SPONSOR_SELECT';
    renderSponsorSelect();
  }

  function renderSponsorSelect() {
    clearApp();
    const screen = el('div', 'screen-sponsor-select');
    screen.appendChild(el('h1', 'title', 'YOUR SPONSOR'));
    screen.appendChild(el('p', 'subtitle', 'A hyperscaler is bankrolling this Tessera. Their budget is your budget. Their reputation is your goodwill floor.'));

    const grid = el('div', 'sponsor-grid');
    const sponsors = window.SPONSORS ? Object.values(window.SPONSORS) : [];
    // Sort by budget descending so the flush options lead.
    sponsors.sort((a, b) => b.startingBudgetM - a.startingBudgetM);
    for (const s of sponsors) {
      const btn = el('button', 'sponsor-btn');
      const head = el('div', 'sponsor-head');
      head.appendChild(el('span', 'sponsor-name', s.name));
      head.appendChild(el('span', 'sponsor-shortname', `(${s.shortName})`));
      btn.appendChild(head);
      const stats = el('div', 'sponsor-stats');
      stats.appendChild(el('span', 'sponsor-budget', formatDollars(s.startingBudgetM)));
      const gw = s.startingGoodwill || 0;
      const gwSpan = el('span', 'sponsor-gw' + (gw < 0 ? ' bad' : gw > 0 ? ' ok' : ' dim'),
        `goodwill ${gw >= 0 ? '+' : ''}${gw}`);
      stats.appendChild(gwSpan);
      const focus = (s.focus || []).map(t => {
        const def = window.TILES[t];
        return def ? def.name : t;
      }).join(' · ');
      if (focus) stats.appendChild(el('span', 'sponsor-focus', focus));
      btn.appendChild(stats);
      btn.appendChild(el('p', 'sponsor-flavor', s.flavor || ''));
      btn.appendChild(el('div', 'sponsor-knockoff', `knockoff of ${s.knockoffOf}`));
      btn.addEventListener('click', () => {
        startGame(state.selectedStateCode, state.placeId || null, s.id);
      });
      grid.appendChild(btn);
    }
    screen.appendChild(grid);

    const back = el('button', 'place-back', '← Back');
    back.addEventListener('click', () => {
      // Bounce back to the previous screen.
      const places = (window.TesseraData && window.TesseraData.listPlacesForState)
        ? window.TesseraData.listPlacesForState(state.selectedStateCode) : [];
      if (places.length > 0) {
        state.screen = 'PLACE_SELECT';
        renderPlaceSelect(places);
      } else {
        state.screen = 'STATE_SELECT';
        renderStateSelect();
      }
    });
    screen.appendChild(back);

    screen.appendChild(el('div', 'state-footer', 'Budgets are calibrated to publicly reported 2025 annual capex. See data/sponsors.js to edit or add knockoffs.'));

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
    const screen = el('div', 'screen-game-board' + (state.placeData ? ' with-place' : ''));
    screen.id = 'screen-game-board';
    screen.appendChild(buildHud());
    screen.appendChild(buildBoard());
    screen.appendChild(buildTray());
    screen.appendChild(buildSelectedDesc());
    screen.appendChild(buildReaction());
    if (state.placeData) screen.appendChild(buildPlaceContext());
    // v0.7: mobile-only bottom nav, last in DOM. Hidden on desktop via CSS.
    screen.appendChild(buildMobileNav());
    app.appendChild(screen);
    // Apply persisted zoom (or platform default).
    applyCellPx(getCurrentCellPx());
    restoreBoardScroll();
  }

  // Restore the user's pan position from state. Runs after any DOM op that
  // could touch .board-wrap (full rebuild, cell-details swap, etc.). Uses
  // rAF so layout has settled before we set scrollLeft/scrollTop.
  function restoreBoardScroll() {
    if (!state.boardScroll.x && !state.boardScroll.y) return;
    const wrap = document.getElementById('board-wrap');
    if (!wrap) return;
    requestAnimationFrame(() => {
      wrap.scrollLeft = state.boardScroll.x;
      wrap.scrollTop = state.boardScroll.y;
    });
  }

  function buildHud() {
    const hud = el('div', 'hud');
    hud.id = 'hud';
    const s = window.STATES[state.selectedStateCode];
    const block = el('div', 'state-name-block');
    const placeBit = (state.placeData && state.placeData.present)
      ? ` · ${state.placeData.present.displayName}`
      : '';
    const sponsorBit = state.sponsor ? `${state.sponsor.shortName} @ ` : '';
    block.appendChild(el('span', 'state-name-line', `${sponsorBit}${state.selectedStateCode} — ${s.name}${placeBit}`));
    block.appendChild(el('span', 'paper-line', state.sponsor ? state.sponsor.paper : s.flavor_paper));
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
    hud.appendChild(stat('Budget',   formatDollars(state.dollars), 'accent', 'Sponsor capital remaining. Capex draws it down; tile revenue (less opex) replenishes it each quarter.'));
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
    // Research stat — clickable; opens the research panel.
    const inProg = state.research.inProgressId ? window.RESEARCH[state.research.inProgressId] : null;
    const researchLabel = inProg
      ? `${inProg.name.length > 24 ? inProg.name.slice(0, 22) + '…' : inProg.name} · ${state.research.ticksRemaining}q`
      : `${Object.keys(state.research.completed).length} done · open ▸`;
    const researchTone = inProg ? 'accent' : null;
    const researchTip = inProg
      ? `Researching: ${inProg.name}. ${state.research.ticksRemaining} quarter(s) remaining. Click to open the research panel.`
      : 'Click to open the research panel and pick a tech node.';
    const researchStat = stat('Research', researchLabel, researchTone, researchTip);
    researchStat.classList.add('clickable');
    researchStat.addEventListener('click', openResearchPanel);
    hud.appendChild(researchStat);
    // Speed control — pause + 3 speeds, SimCity-style.
    const speedWrap = el('div', 'speed-control');
    speedWrap.title = 'Time controls. Space toggles pause. 1/2/3 set Slow/Normal/Fast.';
    for (const s of SPEED_ORDER) {
      const b = el('button', 'speed-btn' + (state.speed === s ? ' active' : '') + (s === 'PAUSED' ? ' pause' : ''));
      b.textContent = SPEED_LABEL[s];
      b.title = SPEED_NAME[s];
      b.addEventListener('click', (e) => { e.stopPropagation(); setSpeed(s); });
      speedWrap.appendChild(b);
    }
    if (state.speed === 'PAUSED') speedWrap.classList.add('is-paused');
    hud.appendChild(speedWrap);
    const hints = el('div', 'hints');
    const tickSeconds = state.speed === 'PAUSED' ? 'paused' : (SPEED_MS[state.speed] / 1000) + 's';
    hints.innerHTML = '<div>Space: pause · 1/2/3: speeds · R: restart · B: back</div>'
                    + `<div>1 tick = 1 quarter (currently ${tickSeconds}).</div>`;
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
    wrap.id = 'board-wrap';
    const board = el('div', 'board');
    board.id = 'board';
    const hl = state.highlightedCellXY;
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
        if (hl && hl.x === x && hl.y === y) {
          cell.classList.add('highlighted');
          const badge = el('div', 'cell-badge');
          cell.appendChild(badge);
        }
        cell.title = titleParts.join(' · ');
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isMobile()) {
            if (state.selectedTileId) {
              tryPlace(x, y);
              state.selectedTileId = '';  // disarm after place
              return;
            }
            selectCell(x, y);
            return;
          }
          if (!state.selectedTileId) return;
          tryPlace(x, y);
        });
        board.appendChild(cell);
      }
    }
    // Legend pinned ABOVE the board on both platforms (mobile + desktop).
    wrap.appendChild(buildLegend());
    wrap.appendChild(board);
    attachZoomControls(wrap);
    // Mobile-only overlays — hidden via CSS on desktop.
    wrap.appendChild(buildReactionOverlay());
    wrap.appendChild(buildCellDetails());
    // Persist scroll position across any DOM rebuild. The listener keeps
    // state.boardScroll in sync with the user's pan; renderGameBoard and
    // selection updates restore from state so iOS Safari quirks can't
    // jump the view back to the load position.
    wrap.addEventListener('scroll', () => {
      state.boardScroll.x = wrap.scrollLeft;
      state.boardScroll.y = wrap.scrollTop;
    }, { passive: true });
    // Tap-away on the board-wrap clears cell selection.
    wrap.addEventListener('click', (e) => {
      if (!isMobile()) return;
      // Only clear if the click is on the board-wrap padding, not a cell or overlay child.
      if (e.target === wrap || e.target === board) {
        clearCellSelection();
      }
    });
    return wrap;
  }

  // Surgical highlight update: toggle the .highlighted class + .cell-badge on the
  // single affected cell. Avoids any board rebuild so the user's scroll position
  // inside .board-wrap is preserved when they tap around the map.
  function updateCellHighlight() {
    const board = document.getElementById('board');
    if (!board) return;
    const prev = board.querySelector('.cell.highlighted');
    if (prev) {
      prev.classList.remove('highlighted');
      const oldBadge = prev.querySelector('.cell-badge');
      if (oldBadge) oldBadge.remove();
    }
    const hl = state.highlightedCellXY;
    if (!hl) return;
    const next = board.querySelector('.cell[data-x="' + hl.x + '"][data-y="' + hl.y + '"]');
    if (next) {
      next.classList.add('highlighted');
      next.appendChild(el('div', 'cell-badge'));
    }
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

  // ===============================================================
  // v0.7 — Mobile-first interaction (cell-first, bottom nav, sheets)
  // ===============================================================

  function selectCell(x, y) {
    const hl = state.highlightedCellXY;
    if (hl && hl.x === x && hl.y === y) {
      state.highlightedCellXY = null;
    } else {
      state.highlightedCellXY = { x, y };
    }
    updateCellHighlight();
    renderCellDetails();
    renderMobileNav();
    restoreBoardScroll();
  }

  function clearCellSelection() {
    if (!state.highlightedCellXY) return;
    state.highlightedCellXY = null;
    updateCellHighlight();
    renderCellDetails();
    renderMobileNav();
    restoreBoardScroll();
  }

  // Tooltip-style popover anchored next to the highlighted cell. Hidden when
  // nothing is selected. Replaces the old bottom-pinned strip.
  function buildCellDetails() {
    const wrap = el('div', 'cell-details');
    wrap.id = 'cell-details';
    const hl = state.highlightedCellXY;
    if (!hl) {
      wrap.classList.add('hidden');
      return wrap;
    }
    const { x, y } = hl;
    const k = key(x, y);
    const t = state.terrain[y][x];
    const tInfo = TERRAIN_INFO[t] || { name: t, hint: '' };
    const tileId = state.placed[k];
    const isCivic = !!state.existingCivic[k];
    let title, meta;
    if (tileId) {
      const def = getEffectiveTile(tileId);
      title = `${def.name}  ·  (${x}, ${y})`;
      const capex = def.capex ?? def.cost ?? 0;
      meta = `${formatDollars(capex)} built · J${def.jobsOps || 0} · E${signed(def.emissionsPerTick || 0)} · ${def.layer}`;
    } else if (isCivic) {
      title = `Existing civic  ·  (${x}, ${y})`;
      meta = 'Cannot build — pre-existing community asset.';
    } else {
      title = `${tInfo.name}  ·  (${x}, ${y})`;
      meta = tInfo.build
        ? (tInfo.hint || 'Tap Build to place a tile here.')
        : (tInfo.hint || 'Cannot build on this terrain.');
    }
    wrap.appendChild(el('div', 'cd-title', title));
    wrap.appendChild(el('div', 'cd-meta', meta));
    const close = el('button', 'cd-close', '×');
    close.title = 'Clear selection';
    close.addEventListener('click', (e) => { e.stopPropagation(); clearCellSelection(); });
    wrap.appendChild(close);
    // Position to the cell after the next paint, once the popover is in
    // the DOM and we can measure its size.
    requestAnimationFrame(() => positionCellDetailsToCell(wrap, x, y));
    return wrap;
  }

  function renderCellDetails() {
    const old = document.getElementById('cell-details');
    if (!old) return;
    old.replaceWith(buildCellDetails());
  }

  // Place the cell-details popover next to the highlighted cell, in the
  // board-wrap scroll-content coord space so it pans with the cell. Falls
  // back to placing above the cell when there's no room below; clamps to
  // stay within the scroll content horizontally.
  function positionCellDetailsToCell(wrap, x, y) {
    if (!wrap.isConnected) return;
    const cell = document.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
    const boardWrap = document.getElementById('board-wrap');
    if (!cell || !boardWrap) return;
    const cellRect = cell.getBoundingClientRect();
    const wrapRect = boardWrap.getBoundingClientRect();
    const cellLeft = cellRect.left - wrapRect.left + boardWrap.scrollLeft;
    const cellTop = cellRect.top - wrapRect.top + boardWrap.scrollTop;
    const cellH = cellRect.height;
    const popH = wrap.offsetHeight || 70;
    const popW = wrap.offsetWidth || 220;
    let top = cellTop + cellH + 6;
    if (top + popH > boardWrap.scrollHeight - 4) {
      top = Math.max(4, cellTop - popH - 6);
    }
    let left = cellLeft;
    if (left + popW > boardWrap.scrollWidth - 4) {
      left = boardWrap.scrollWidth - popW - 4;
    }
    if (left < 4) left = 4;
    wrap.style.left = left + 'px';
    wrap.style.top = top + 'px';
  }

  // Floating reaction-card stack on the mobile board. Each card is auto-dismissed
  // from pushReactionCard()'s setTimeout; this just renders the current list.
  function buildReactionOverlay() {
    const overlay = el('div', 'reaction-overlay');
    overlay.id = 'reaction-overlay';
    for (const c of state.reactionCards) {
      const card = el('div', 'reaction-card ' + (c.tone || ''));
      card.textContent = c.msg;
      card.addEventListener('click', () => {
        state.reactionCards = state.reactionCards.filter(x => x.id !== c.id);
        renderReactionOverlay();
      });
      overlay.appendChild(card);
    }
    return overlay;
  }

  function renderReactionOverlay() {
    const old = document.getElementById('reaction-overlay');
    if (!old) return;
    old.replaceWith(buildReactionOverlay());
  }

  // Zoom +/- floating in the top-right of the board area. localStorage-persisted.
  // Both platforms; clamps 22-60px. Inline --cell on :root drives mobile size too,
  // since v0.7 dropped the mobile clamp() rule in favor of a JS-driven default.
  function attachZoomControls(wrap) {
    const controls = el('div', 'zoom-controls');
    controls.id = 'zoom-controls';
    const minus = el('button', 'zoom-btn', '−');
    minus.title = 'Zoom out';
    minus.addEventListener('click', (e) => { e.stopPropagation(); changeZoom(-4); });
    const plus = el('button', 'zoom-btn', '+');
    plus.title = 'Zoom in';
    plus.addEventListener('click', (e) => { e.stopPropagation(); changeZoom(+4); });
    controls.appendChild(minus);
    controls.appendChild(plus);
    wrap.appendChild(controls);
  }

  function getCurrentCellPx() {
    // Either the persisted/explicit value, or a sensible default per platform.
    const stored = parseInt(localStorage.getItem('tessera.cellPx') || '', 10);
    if (stored >= 22 && stored <= 60) return stored;
    if (isMobile()) {
      // Default to finger-tap-sized cells; board scrolls horizontally.
      // User can zoom out to ~22 to see the whole board at once.
      return 40;
    }
    return 38;
  }

  function applyCellPx(px) {
    document.documentElement.style.setProperty('--cell', px + 'px');
  }

  function changeZoom(delta) {
    const cur = getCurrentCellPx();
    const next = clamp(cur + delta, 22, 60);
    if (next === cur) return;
    localStorage.setItem('tessera.cellPx', String(next));
    applyCellPx(next);
  }

  // Persistent 4-button nav at the bottom on mobile. Hidden via CSS on desktop.
  function buildMobileNav() {
    const nav = el('div', 'mobile-nav');
    nav.id = 'mobile-nav';
    const hl = state.highlightedCellXY;
    const hlEmpty = hl && !state.placed[key(hl.x, hl.y)] && !state.existingCivic[key(hl.x, hl.y)]
                    && state.terrain[hl.y][hl.x] !== 'river' && state.terrain[hl.y][hl.x] !== 'highway';
    const items = [
      { id: 'build',    icon: '⌂', label: 'Build',    glow: !!hlEmpty },
      { id: 'research', icon: '⚗', label: 'Research' },
      { id: 'place',    icon: '◉', label: 'Place',    disabled: !state.placeData },
      { id: 'menu',     icon: '≡', label: 'Menu' },
    ];
    for (const it of items) {
      const btn = el('button', 'mnav-btn' + (it.glow ? ' glow' : '') + (it.disabled ? ' disabled' : ''));
      btn.dataset.nav = it.id;
      if (it.disabled) btn.disabled = true;
      btn.appendChild(el('span', 'mnav-icon', it.icon));
      btn.appendChild(el('span', 'mnav-label', it.label));
      btn.addEventListener('click', () => openMobileSheet(it.id));
      nav.appendChild(btn);
    }
    return nav;
  }

  function renderMobileNav() {
    const old = document.getElementById('mobile-nav');
    if (!old) return;
    old.replaceWith(buildMobileNav());
    renderCellDetails();
  }

  // Generic bottom-sheet overlay. Only one sheet open at a time.
  function openSheet(opts) {
    closeSheet();
    const backdrop = el('div', 'sheet-backdrop');
    backdrop.id = 'sheet-backdrop';
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeSheet(); });
    const sheet = el('div', 'sheet');
    const header = el('div', 'sheet-header');
    header.appendChild(el('span', 'sheet-title', opts.title || ''));
    const closeBtn = el('button', 'sheet-close', '×');
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', closeSheet);
    header.appendChild(closeBtn);
    sheet.appendChild(header);
    const body = el('div', 'sheet-body');
    if (opts.content) body.appendChild(opts.content);
    sheet.appendChild(body);
    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);
  }

  function closeSheet() {
    const sb = document.getElementById('sheet-backdrop');
    if (sb) sb.remove();
    state.mobileSheet = '';
  }

  function openMobileSheet(kind) {
    if (kind === 'research') {
      openResearchPanel();
      return;
    }
    if (kind === 'build')   { state.mobileSheet = 'build'; openBuildSheet(); return; }
    if (kind === 'place')   { state.mobileSheet = 'place'; openPlaceSheet(); return; }
    if (kind === 'menu')    { state.mobileSheet = 'menu';  openMenuSheet();  return; }
  }

  function openBuildSheet() {
    const hl = state.highlightedCellXY;
    const tray = buildTray({
      onPick: (id) => {
        closeSheet();
        if (hl) {
          state.selectedTileId = id;
          state.highlightedCellXY = null;
          tryPlace(hl.x, hl.y);
          state.selectedTileId = '';
        } else {
          // No cell selected — arm the tile so the next cell tap places it.
          state.selectedTileId = id;
          setReaction(`${window.TILES[id].name} armed. Tap a cell to place.`, 'accent');
        }
      },
    });
    const title = hl ? `Build at (${hl.x}, ${hl.y})` : 'Build  ·  tap a cell after picking';
    openSheet({ title, content: tray });
  }

  function openPlaceSheet() {
    if (!state.placeData) {
      const empty = el('div', 'sheet-empty', 'No place data loaded for this state. Pick a place at start to enable this panel.');
      openSheet({ title: 'Place', content: empty });
      return;
    }
    openSheet({ title: 'Place', content: buildPlaceContext() });
  }

  function openMenuSheet() {
    const body = el('div', 'menu-sheet');
    // Speed control
    body.appendChild(el('div', 'menu-section-label', 'TIME'));
    const speeds = el('div', 'menu-speed-row');
    for (const s of SPEED_ORDER) {
      const b = el('button', 'menu-speed-btn' + (state.speed === s ? ' active' : ''));
      b.textContent = SPEED_LABEL[s] + ' ' + SPEED_NAME[s].split(' ')[0];
      b.title = SPEED_NAME[s];
      b.addEventListener('click', () => {
        setSpeed(s);
        // re-render the menu so the active button updates
        openMenuSheet();
      });
      speeds.appendChild(b);
    }
    body.appendChild(speeds);
    // Restart / Back
    body.appendChild(el('div', 'menu-section-label', 'GAME'));
    const actions = el('div', 'menu-actions-row');
    const restart = el('button', 'menu-action-btn', 'Restart this run');
    restart.addEventListener('click', () => {
      closeSheet();
      startGame(state.selectedStateCode, state.placeId || null, state.sponsorId || null);
    });
    const back = el('button', 'menu-action-btn', 'Back to state select');
    back.addEventListener('click', () => {
      closeSheet();
      backToStateSelect();
    });
    actions.appendChild(restart);
    actions.appendChild(back);
    body.appendChild(actions);
    // Info
    body.appendChild(el('div', 'menu-section-label', 'INFO'));
    body.appendChild(el('div', 'menu-info', 'Tessera — civic-tech idle/builder. Open-source at github.com/yourlifewithai/tessera.'));
    openSheet({ title: 'Menu', content: body });
  }

  function buildTray(opts) {
    opts = opts || {};
    const wrap = el('div', 'tray-wrap');
    wrap.id = 'tray-wrap';
    if (!opts.onPick) {
      wrap.appendChild(el('div', 'tray-label', 'TILE TRAY  ·  click to select, click board to place'));
    }
    const tray = el('div', 'tray');
    for (const id of Object.keys(window.TILES)) {
      if (!isTileUnlocked(id)) continue;     // gated by research
      const def = getEffectiveTile(id);
      const sKey = def.sentimentKey || '';
      let modifier = 1.0;
      if (sKey && state.selectedStateCode && window.STATES[state.selectedStateCode][sKey] != null) {
        const s = window.STATES[state.selectedStateCode][sKey];
        modifier = def.baseGoodwill >= 0 ? 1.0 + (s * 0.35) : 1.0 - (s * 0.35);
      }
      const projected = Math.round(def.baseGoodwill * modifier);
      const capex = def.capex ?? def.cost ?? 0;
      const affordable = state.dollars >= capex;
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
      meta.innerHTML = `${formatDollars(capex)} · base <span class="${def.baseGoodwill >= 0 ? 'gw-pos' : 'gw-neg'}">${signed(def.baseGoodwill)}</span>` +
                       ` · here <span class="${projected >= 0 ? 'gw-pos' : 'gw-neg'}">${signed(projected)}</span> · ${def.layer}` +
                       ` · J${jobsOps} · E${signed(emPerTick)}`;
      body.appendChild(meta);
      row.appendChild(body);
      row.addEventListener('click', () => {
        if (opts.onPick) {
          opts.onPick(id);
          return;
        }
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

  // ----- Place context panel (v0.2) -----
  function buildPlaceContext() {
    const wrap = el('div', 'place-context');
    wrap.id = 'place-context';
    if (!state.placeData) return wrap;
    const present = state.placeData.present;
    const updates = state.placeData.appliedUpdates || [];
    const header = el('div', 'pc-header');
    header.appendChild(el('span', 'pc-title', present.displayName));
    header.appendChild(el('span', 'pc-sub',
      ` · pop ${present.county.population.toLocaleString()}` +
      ` · ${present.cities.length} cities` +
      ` · ${updates.length} updates since ${present.baselineDate}`));
    wrap.appendChild(header);
    // City row — one chip per city; active city is highlighted; click to switch.
    const cityRow = el('div', 'pc-cities');
    for (const c of present.cities) {
      const isActive = c.id === state.activeCityId;
      const chip = el('button', 'pc-city' + (isActive ? ' active' : ''));
      chip.innerHTML = `<b>${c.name}</b><br><span class="pc-pop">${c.population.toLocaleString()}</span>`;
      chip.title = needsConcernsTooltip(c);
      chip.addEventListener('click', () => {
        state.activeCityId = c.id;
        const old = document.getElementById('place-context');
        if (old) old.replaceWith(buildPlaceContext());
      });
      cityRow.appendChild(chip);
    }
    wrap.appendChild(cityRow);
    // History strip — collapsed by default. Click to expand.
    const histToggle = el('button', 'pc-history-toggle', `▸ How we got here (${updates.length} updates)`);
    const hist = el('div', 'pc-history');
    hist.style.display = 'none';
    for (const u of updates) {
      const row = el('div', 'pc-history-row');
      row.appendChild(el('span', 'pc-date', u.date));
      row.appendChild(el('span', 'pc-scope', u.scope || 'place'));
      row.appendChild(el('span', 'pc-field', u.field));
      row.appendChild(el('span', 'pc-reason', u.reason || ''));
      hist.appendChild(row);
    }
    histToggle.addEventListener('click', () => {
      const open = hist.style.display !== 'none';
      hist.style.display = open ? 'none' : 'block';
      histToggle.textContent = (open ? '▸' : '▾') + ` How we got here (${updates.length} updates)`;
    });
    wrap.appendChild(histToggle);
    wrap.appendChild(hist);
    return wrap;
  }

  function needsConcernsTooltip(c) {
    const lines = [c.name];
    if (c.expressedNeeds && c.expressedNeeds.length) {
      lines.push('Needs:');
      for (const n of c.expressedNeeds) lines.push(`  · ${n.issue} (${n.priority})`);
    }
    if (c.expressedConcerns && c.expressedConcerns.length) {
      lines.push('Concerns:');
      for (const k of c.expressedConcerns) lines.push(`  · ${k.issue} (${k.priority})`);
    }
    return lines.join('\n');
  }

  // ----- City needs/concerns rule (v0.2) -----
  //
  // When a tile is placed, every city in the loaded place reacts:
  //   - +priority bonus if the tile addresses a city's expressed need
  //   - -priority penalty if the tile triggers a city's expressed concern
  // The active city is weighted 1.0; other cities (spillover) at 0.4.
  // Priority weights: low=1, medium=2, high=3.
  // Returns { delta, fragments } where fragments is an array of short
  // human-readable strings to append to the placement reaction.
  function applyCityNeedsRule(tileId) {
    const out = { delta: 0, fragments: [] };
    if (!state.placeData) return out;
    const present = state.placeData.present;
    const cities = present.cities || [];
    const pri = { low: 1, medium: 2, high: 3 };
    for (const c of cities) {
      const weight = (c.id === state.activeCityId) ? 1.0 : 0.4;
      let cityDelta = 0;
      const reasons = [];
      for (const n of (c.expressedNeeds || [])) {
        if (n.addressedBy && n.addressedBy.indexOf(tileId) !== -1) {
          const bump = (pri[n.priority] || 1) * needAmplifierFactor(tileId, n.issue);
          cityDelta += bump;
          reasons.push(`addresses ${n.issue}`);
        }
      }
      for (const k of (c.expressedConcerns || [])) {
        if (k.triggeredBy && k.triggeredBy.indexOf(tileId) !== -1) {
          const drag = (pri[k.priority] || 1) * concernSoftenerFactor(tileId, k.issue);
          cityDelta -= drag;
          reasons.push(`triggers ${k.issue}`);
        }
      }
      const weighted = Math.round(cityDelta * weight);
      if (weighted !== 0) {
        out.delta += weighted;
        out.fragments.push(`${c.name}: ${reasons.join(', ')} (${signed(weighted)})`);
      }
    }
    return out;
  }

  // ----- Research panel (v0.4) -----
  function openResearchPanel() {
    state.researchPanelOpen = true;
    autoPause();                                 // freeze the world while the player thinks
    renderResearchPanel();
  }
  function closeResearchPanel() {
    state.researchPanelOpen = false;
    const old = document.getElementById('research-overlay');
    if (old) old.remove();
    autoResume();
  }
  function renderResearchPanel() {
    const existing = document.getElementById('research-overlay');
    if (existing) existing.remove();
    const RES = window.RESEARCH || {};
    const baseG = window.RESEARCH_GRID || { cols: 3, rows: 6, cardWidth: 220, cardHeight: 96, colGap: 32, rowGap: 28, paddingX: 24, paddingY: 24 };
    // On narrow viewports, cards include an inline description and need more height to avoid overlap with the row below.
    const isNarrow = window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
    const G = isNarrow ? Object.assign({}, baseG, { cardHeight: 156 }) : baseG;
    const innerW = G.cols * G.cardWidth + (G.cols - 1) * G.colGap + 2 * G.paddingX;
    const innerH = G.rows * G.cardHeight + (G.rows - 1) * G.rowGap + 2 * G.paddingY;

    const overlay = el('div', 'research-overlay');
    overlay.id = 'research-overlay';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeResearchPanel(); });

    const panel = el('div', 'research-panel');
    const header = el('div', 'research-header');
    header.appendChild(el('h2', 'research-title', 'RESEARCH'));
    const sub = el('div', 'research-sub');
    sub.textContent = `Budget ${formatDollars(state.dollars)} · ${Object.keys(state.research.completed).length} of ${Object.keys(RES).length} researched`;
    header.appendChild(sub);
    const closeBtn = el('button', 'research-close', '×');
    closeBtn.addEventListener('click', closeResearchPanel);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // In-progress banner.
    const inProg = state.research.inProgressId ? RES[state.research.inProgressId] : null;
    if (inProg) {
      const banner = el('div', 'research-inprogress');
      const total = inProg.durationQuarters || 1;
      const done = total - state.research.ticksRemaining;
      const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
      banner.innerHTML = `<div class="rip-title">In progress: <b>${inProg.name}</b> · ${state.research.ticksRemaining} of ${total} quarters left</div>` +
        `<div class="rip-bar"><div class="rip-fill" style="width:${pct}%"></div></div>`;
      const cancel = el('button', 'rip-cancel', 'Cancel (no refund)');
      cancel.addEventListener('click', () => { cancelResearch(); renderResearchPanel(); renderHud(); });
      banner.appendChild(cancel);
      panel.appendChild(banner);
    } else {
      const banner = el('div', 'research-idle', 'No research in progress. Pick an available node.');
      panel.appendChild(banner);
    }

    // The graph: SVG edges layer + absolutely-positioned node cards.
    const board = el('div', 'research-board');
    board.style.width = innerW + 'px';
    board.style.height = innerH + 'px';

    // SVG edges.
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'research-edges');
    svg.setAttribute('width', innerW);
    svg.setAttribute('height', innerH);
    // Arrowhead marker.
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'rsh-arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8'); marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6'); marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const arrow = document.createElementNS(svgNS, 'path');
    arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    arrow.setAttribute('class', 'rsh-arrowhead');
    marker.appendChild(arrow);
    defs.appendChild(marker);
    svg.appendChild(defs);

    function cardCenter(col, row) {
      return {
        x: G.paddingX + col * (G.cardWidth + G.colGap) + G.cardWidth / 2,
        y: G.paddingY + row * (G.cardHeight + G.rowGap) + G.cardHeight / 2,
      };
    }
    function cardRight(col, row) {
      const c = cardCenter(col, row);
      return { x: c.x + G.cardWidth / 2, y: c.y };
    }
    function cardLeft(col, row) {
      const c = cardCenter(col, row);
      return { x: c.x - G.cardWidth / 2, y: c.y };
    }
    for (const rid of Object.keys(RES)) {
      const r = RES[rid];
      for (const pid of (r.prereqs || [])) {
        const p = RES[pid]; if (!p) continue;
        const a = cardRight(p.col, p.row);
        const b = cardLeft(r.col, r.row);
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        const status = researchStatus(rid);
        line.setAttribute('class', 'research-edge ' + status);
        line.setAttribute('marker-end', 'url(#rsh-arrow)');
        svg.appendChild(line);
      }
    }
    board.appendChild(svg);

    // Nodes.
    for (const rid of Object.keys(RES)) {
      const r = RES[rid];
      const status = researchStatus(rid);
      const affordable = canAffordResearch(rid);
      const blockedByOther = !!state.research.inProgressId && status === 'available';
      const card = el('button', 'research-node ' + status + (blockedByOther ? ' blocked' : '') + (status === 'available' && !affordable ? ' broke' : ''));
      card.style.left = (G.paddingX + r.col * (G.cardWidth + G.colGap)) + 'px';
      card.style.top  = (G.paddingY + r.row * (G.cardHeight + G.rowGap)) + 'px';
      card.style.width = G.cardWidth + 'px';
      card.style.height = G.cardHeight + 'px';

      const head = el('div', 'rn-head');
      head.appendChild(el('span', 'rn-cat', r.category));
      head.appendChild(el('span', 'rn-status', statusLabel(status)));
      card.appendChild(head);
      card.appendChild(el('div', 'rn-name', r.name));
      const meta = el('div', 'rn-meta');
      meta.textContent = `${formatDollars(r.costM)} · ${r.durationQuarters}q`;
      if (r.prereqs && r.prereqs.length) {
        const names = r.prereqs.map(p => RES[p] ? RES[p].name : p);
        meta.textContent += ` · req: ${names.join(', ')}`;
      }
      card.appendChild(meta);
      if (r.description) card.appendChild(el('div', 'rn-desc', r.description));

      // Tooltip with description + effects + real-world note.
      const tip = [r.description];
      if (r.effects && r.effects.length) tip.push('Effects:');
      for (const e of (r.effects || [])) tip.push('  · ' + describeEffect(e));
      // List unlocked tiles.
      for (const tid of Object.keys(window.TILES || {})) {
        if (window.TILES[tid].unlockedBy === rid) tip.push(`  · unlocks tile: ${window.TILES[tid].name}`);
      }
      if (r.realWorld) tip.push('Real world: ' + r.realWorld);
      card.title = tip.join('\n');

      card.addEventListener('click', () => {
        if (status === 'available' && affordable && !blockedByOther) {
          startResearch(rid);
          renderResearchPanel();
          renderHud();
        } else if (status === 'in_progress') {
          // No-op; cancel is on the banner.
        }
      });
      board.appendChild(card);
    }

    panel.appendChild(board);

    // Legend.
    const legend = el('div', 'research-legend');
    legend.innerHTML = '<span class="rl available">available</span>' +
                       '<span class="rl in_progress">in progress</span>' +
                       '<span class="rl completed">researched</span>' +
                       '<span class="rl locked">locked</span>' +
                       '<span class="rl-note">One research at a time. Costs deduct on start. No refund on cancel.</span>';
    panel.appendChild(legend);

    overlay.appendChild(panel);
    app.appendChild(overlay);
  }
  function statusLabel(s) {
    if (s === 'completed') return '✓';
    if (s === 'in_progress') return '⏳';
    if (s === 'locked') return '🔒';
    return '+';
  }
  function describeEffect(e) {
    if (e.type === 'tile_field_mult') return `${e.tileId} ${e.field} ×${e.factor}`;
    if (e.type === 'tile_field_add') return `${e.tileId} ${e.field} ${signed(e.delta)}`;
    if (e.type === 'tile_goodwill_add') return `${e.tileId} baseGoodwill ${signed(e.delta)}`;
    if (e.type === 'layer_field_mult') return `${e.layer} layer ${e.field} ×${e.factor}`;
    if (e.type === 'global_capex_mult') return `all tiles capex ×${e.factor}`;
    if (e.type === 'global_goodwill_floor_add') return `all negative baseGoodwill +${e.delta} (toward 0)`;
    if (e.type === 'concern_softener') return `softens ${e.tileId} concerns matching "${e.issueMatch || '(all)'}" ×${e.factor}`;
    if (e.type === 'need_amplifier') return `amplifies ${e.tileId} need-fit matching "${e.issueMatch || '(all)'}" ×${e.factor}`;
    return e.type;
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
    overlay.appendChild(el('p', 'win-stats', `Goodwill: ${signed(state.goodwill)}    Budget remaining: ${formatDollars(state.dollars)}    Time: ${elapsed}s`));
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

  // Format a dollar amount stored in MILLIONS. Returns "$X.XB" / "$XXXM" / "$XXM".
  // Negative amounts get a leading minus inside the dollar sign: "-$1.2B".
  function formatDollars(millions) {
    if (millions == null || isNaN(millions)) return '$—';
    const neg = millions < 0 ? '-' : '';
    const abs = Math.abs(millions);
    if (abs >= 1000) {
      // Always 1 decimal at the B scale so $250M deductions remain visible
      // against a $110B budget ($110.0B → $109.8B).
      return `${neg}$${(abs / 1000).toFixed(1)}B`;
    }
    return `${neg}$${Math.round(abs)}M`;
  }
  // Signed dollar delta: "+$5M", "-$120M", "+$1.2B".
  function signedDollars(millions) {
    if (millions === 0) return '$0';
    const sign = millions > 0 ? '+' : '-';
    return sign + formatDollars(Math.abs(millions)).replace(/^-?\$/, '$');
  }

  // ===============================================================
  // Global input
  // ===============================================================

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.researchPanelOpen) { closeResearchPanel(); return; }
      if (document.getElementById('sheet-backdrop')) { closeSheet(); return; }
      if (state.highlightedCellXY) { clearCellSelection(); return; }
      if (state.selectedTileId) {
        state.selectedTileId = '';
        if (state.screen === 'GAME_BOARD') { renderTray(); renderSelectedDesc(); }
      }
    } else if (e.key === ' ' && state.screen === 'GAME_BOARD') {
      e.preventDefault();
      togglePause();
    } else if (e.key === '1' && state.screen === 'GAME_BOARD') {
      setSpeed('SLOW');
    } else if (e.key === '2' && state.screen === 'GAME_BOARD') {
      setSpeed('NORMAL');
    } else if (e.key === '3' && state.screen === 'GAME_BOARD') {
      setSpeed('FAST');
    } else if (e.key === 'r' || e.key === 'R') {
      if (state.screen !== 'STATE_SELECT' && state.selectedStateCode) {
        startGame(state.selectedStateCode, state.placeId || null, state.sponsorId || null);
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

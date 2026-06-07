// ===============================================================
// Place data scaffold (v0.2)
//
// Tessera baseline data anchors to January 1, 2025. A play session
// represents the present (Q2 2026). The Jan 2025 -> present stretch
// is BACKSTORY — applied as a stream of dated updates to derive the
// player's starting state. We ship the SCHEMA and the ADAPTER
// CONTRACT, not comprehensive data. Forkers populate places by:
//
//   1. Writing a JS file under data/places/ that registers itself on
//      window.TesseraPlaces (the "local subscription" pattern), or
//   2. Replacing window.TesseraData with a custom adapter (fetch from
//      an API with their own key, read from IndexedDB, pull from a
//      subscription feed).
//
// ADAPTER CONTRACT — any object on window.TesseraData implementing:
//   listPlaces():        Array<{id, displayName, state, county}>
//   getBaseline(placeId): BaselineRecord | null
//   getUpdates(placeId):  Array<UpdateRecord>   (chronological)
//
// SCHEMA — see DESIGN.md "Place data (v0.2)" and the worked example
// in data/places/tx-burleson.js for the full reference.
// ===============================================================

(function () {
  'use strict';

  // Registry that individual place files plug themselves into.
  window.TesseraPlaces = window.TesseraPlaces || {};

  // Default adapter — reads from window.TesseraPlaces.
  const defaultAdapter = {
    listPlaces() {
      return Object.values(window.TesseraPlaces).map(p => ({
        id: p.baseline.placeId,
        displayName: p.baseline.displayName,
        state: p.baseline.jurisdiction.state,
        county: p.baseline.jurisdiction.county,
      }));
    },
    getBaseline(placeId) {
      const p = window.TesseraPlaces[placeId];
      return p ? deepClone(p.baseline) : null;
    },
    getUpdates(placeId) {
      const p = window.TesseraPlaces[placeId];
      return p ? (p.updates || []).slice() : [];
    },
  };

  // We do not overwrite an existing custom adapter.
  window.TesseraData = window.TesseraData || defaultAdapter;

  // derivePresent(placeId, asOfDate?) — applies updates in date order
  // up to the cutoff. Returns { present, appliedUpdates }. The game
  // calls this when a player picks a place; the result is the
  // starting state of gameplay.
  window.TesseraData.derivePresent = function (placeId, asOfDate) {
    const baseline = this.getBaseline(placeId);
    if (!baseline) return null;
    const updates = this.getUpdates(placeId) || [];
    const cutoff = asOfDate || "2026-05-01";
    const present = baseline;            // already cloned by getBaseline
    const applied = [];
    for (const u of updates) {
      if (u.date && u.date > cutoff) break;
      try {
        applyUpdate(present, u);
        applied.push(u);
      } catch (e) {
        console.warn("TesseraData: skipping update", u, e.message);
      }
    }
    present.derivedAt = cutoff;
    return { present, appliedUpdates: applied };
  };

  // listPlacesForState(stateCode) — convenience for the place picker.
  window.TesseraData.listPlacesForState = function (stateCode) {
    return this.listPlaces().filter(p => p.state === stateCode);
  };

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  // applyUpdate mutates `state` in place per the update record.
  // Update shapes (one of):
  //   { date, scope, field, change: { key: +delta, ... } }   numeric add
  //   { date, scope, field, set: anyValue }                  absolute set
  //   { date, scope, field, add: anyValue }                  push to array
  // scope: "county" | "city:<id>" | omitted (= place root)
  // field: dotted path beneath the scope target.
  function applyUpdate(state, u) {
    let target = state;
    if (u.scope && u.scope.indexOf("city:") === 0) {
      const cityId = u.scope.slice(5);
      target = (state.cities || []).find(c => c.id === cityId);
      if (!target) throw new Error("city not found: " + cityId);
    } else if (u.scope === "county") {
      target = state.county;
      if (!target) throw new Error("county block missing on baseline");
    }
    if (!u.field) throw new Error("update missing 'field'");
    const path = u.field.split('.');
    const leaf = path.pop();
    let cur = target;
    for (const seg of path) {
      if (cur == null) throw new Error("path missing: " + u.field);
      cur = cur[seg];
    }
    if (cur == null) throw new Error("path missing: " + u.field);
    if (u.change) {
      const node = cur[leaf];
      if (node == null || typeof node !== 'object') {
        throw new Error("'change' requires object node at " + u.field);
      }
      for (const k of Object.keys(u.change)) {
        node[k] = (node[k] || 0) + u.change[k];
      }
    } else if (u.set !== undefined) {
      cur[leaf] = u.set;
    } else if (u.add !== undefined) {
      if (!Array.isArray(cur[leaf])) cur[leaf] = [];
      cur[leaf].push(u.add);
    } else {
      throw new Error("update needs 'change', 'set', or 'add'");
    }
  }
})();

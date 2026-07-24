# Slice: read-through-forecast-cache — Dispatch plan

**Slice spec:** `projects/poi-forecast-cache/slices/read-through-forecast-cache/spec.md`

## Dispatch plan

### Dispatch 1: cache-table-contract

- **Outcome:** The `PoiForecast` model (per spec's chosen design: `poiId` PK with `onDelete: Cascade` relation to `Poi`, `model`, `hourly Json`, `fetchedAt`, `staleAt`) exists in `src/prisma/contract.prisma`; `prisma-next contract emit` is clean and the regenerated `contract.json`/`contract.d.ts` are committed; the migration is planned via the standard PN flow and applied to the dev database; `nix develop -c bun run build` passes.
- **Builds on:** The spec's chosen design. **Precondition:** live `DATABASE_URL` (open question 1 — operator-provided; the contract/emit portion proceeds without it, the apply step blocks on it).
- **Hands to:** A queryable `db.orm.public.PoiForecast` lane with the exact emitted field types recorded in the dispatch report (dispatch 3 consumes these).
- **Focus:** Contract + migration only. No runtime code, no consumers. If PSL `Json` is rejected (spec open question 2), apply the `String` fallback and report it.

### Dispatch 2: model-clock-module

- **Outcome:** `src/services/model-clock.ts` exists exporting (a) covering-model attribution by domain BBOX in D2 → EU → global order with the constants from the verified `meta.json` values, and (b) per-model `staleAt` computation from `last_run_availability_time + update_interval_seconds` with the ~10 min grace path when a re-check shows no new run; ≤ 3 meta fetches per request cycle; `nix develop -c bun run build` passes; attribution spot-checked against at least three known points (in-D2, in-EU-only, outside-both) with the check recorded in the dispatch report.
- **Builds on:** The spec's chosen design only — independent of dispatch 1 (parallel-eligible; no DB dependency).
- **Hands to:** A named, typed module surface (exact export signatures in the dispatch report) that dispatch 3 imports.
- **Focus:** Pure clock/attribution logic + meta fetching. No DB access, no weather-service edits.

### Dispatch 3: read-through-wiring

- **Outcome:** The `/api/pois` GET path is read-through-cached per the spec: fresh rows (`now < staleAt` AND same-UTC-day `fetchedAt`) summarize from cached `hourly`; stale/missing POIs refetch in one batched call and upsert; both degradation directions work (DB error → direct fetch; upstream failure + present rows → serve them); one log line per refresh decision; response shape unchanged; `nix develop -c bun run build` passes; the manual verification log (two consecutive GETs showing second-call cache hit; post-truncate cold path) is produced and attached to the dispatch report.
- **Builds on:** **Non-linear:** dispatch 1's `PoiForecast` lane AND dispatch 2's module surface (both hand-offs required; neither alone suffices).
- **Hands to:** Slice DoD met — all six project-DoD conditions + the manual verification log (slice carries the full project DoD; single-slice project).
- **Focus:** `src/services/weather-service.ts` + `src/app/api/pois/route.ts` wiring and the edge-case dispositions from the spec table (meta-endpoint-down grace, response-count-mismatch skip-upsert). Out: contract changes, UI, DELETE route.

### Dispatch 4: migration-package _(added post-PR-open by operator decision, 2026-07-10)_

- **Outcome:** A committed Prisma Next migration package under `migrations/` representing the main → branch contract transition (create `poiForecast`), generated via the standard PN migration flow (`migration plan` / `migration new` per `.agents/skills/prisma-next-migrations/SKILL.md`); `prisma-next migration status` reports clean (the already-updated dev DB recognizes the migration as applied — via the flow PN prescribes for a DB that already matches the destination, e.g. sign/resolve, no manual DDL); `nix develop -c bun run build` passes.
- **Builds on:** D1's applied contract state (the dev DB already carries the target schema via `db update`; the migration must reconcile with, not re-apply over, that state).
- **Hands to:** Slice DoD unchanged plus a replayable migration history for non-dev environments — closes the reviewer's D1 item-for-user ("no migration package").
- **Focus:** `migrations/**` + any ref artefacts the PN flow writes. Out: contract source (unchanged), all runtime code.

### Dispatch 5: comment-trim _(added post-PR-open by operator decision, 2026-07-10)_

- **Outcome:** Comments added by this PR in hand-authored files are trimmed to only those explaining genuinely non-obvious decisions. Removed: (a) doc comments narrating implementation step-by-step; (b) references to transient artifacts, specs, or overruled decisions; (c) restatements of how TypeScript or third-party libraries work; (d) line comments merely describing the next line. Generated / hash-pinned files (`contract.json`, `contract.d.ts`, `migrations/**`) untouched.
- **Builds on:** D1–D4's committed code.
- **Hands to:** Slice DoD unchanged; a leaner review surface.
- **Focus:** `src/prisma/contract.prisma`, `src/services/model-clock.ts`, `src/services/weather-service.ts` — comment lines only; no behavioural edits.

### Dispatch 6: services-repositories-split _(added post-PR-open by operator decision, 2026-07-10)_

- **Outcome:** The forecast path is decomposed per the amended slice spec § Chosen design (3): `ForecastSource` interface; `OpenMeteoForecastRepository` (dumb API repo); `ForecastCacheRepository` interface + PN implementation (dumb CRUD, throws on failure); `CachedForecastSource` (availability policy: freshness, grace, serve-priority, degradation, decision log) implementing `ForecastSource`; `WeatherService` reduced to meteorology over an injected `ForecastSource`. Dependencies on interfaces only; concrete wiring at one composition point; route call-site contract and all behaviour unchanged. DataLoader explicitly rejected (operator decision); in-flight singleflight dedup recorded as follow-up, not in scope.
- **Builds on:** D3/D5's committed wiring (behavioural contract) + D1's lane + D2's clock.
- **Hands to:** Slice DoD unchanged; a layered, stub-testable forecast path.
- **Focus:** `src/services/**` + new `src/repositories/**` (layout implementer's call); comment discipline per D5 R2's telegraphic bar. Out: route, contract, migrations, behaviour changes.

### Dispatch 7: pr-review-fixes _(added 2026-07-10; operator's GitHub review on PR #1)_

- **Outcome:** All six operator review comments addressed in code: (1) `PoiForecast.model` becomes a PSL enum; (2) BBOX provenance documented explicitly on `MODEL_DOMAINS` (values from each model's meta.json `crs_wkt` BBOX); (3) the `bbox: null` sentinel entry removed — `coveringModel` ends with the global fallback return instead; (4) ES `#private` names replace TS `private` across PR-added classes; (5) `partitionByFreshness` no longer accepts `null` rows (shell passes `rows ?? []`); (6) branded `PoiId` type used for POI ids across the PR-added forecast path, cast only at boundaries. Behaviour unchanged; contract change flows through emit + migration history + dev DB.
- **Builds on:** D1–D6's committed state, incl. D4's migration graph (a new edge migration will extend it).
- **Hands to:** Slice DoD unchanged; review comments each resolvable by the operator.
- **Focus:** the six comments only. No GitHub interactions (operator law: no replies on his behalf).

### Dispatch 8: model-clock-persistence _(added 2026-07-10; operator decision after design discussion)_

- **Outcome:** Per spec § Chosen design (2b): `ModelRun` clock table added, `PoiForecast.staleAt` dropped (migration extends the graph); `ModelMetaConnector` interface with an Open-Meteo HTTP repository and a cached connector over the clock table; `ModelClock` reduced to pure staleness derivation over the injected connector (`ModelStaleness` gains `availableAt`); `CachedForecastSource` freshness = per-model staleAt + per-POI run currency (`fetchedAt >= availableAt`) + same-UTC-day; per-POI `extendStaleAt` path removed. Behaviour contract preserved (decision log, degradation directions, grace cadence ~10 min).
- **Builds on:** D6/D7's architecture + migration graph.
- **Hands to:** Slice DoD unchanged; clock state persisted per model (cross-request memory; one-row grace).
- **Focus:** contract + migration, `src/repositories/**`, `src/services/model-clock.ts`, `src/services/cached-forecast-source.ts`. Out: route, UI, singleflight (still follow-up).

## Sizing

Dispatch-INVEST: all eight pass (D7 = M — six bounded review fixes; D8 = L — contract change + two new connector seams + policy rework, but one coherent outcome) (D5 = S — mechanical editorial pass; D6 = M — structural refactor with pinned interfaces and behaviour-preservation gates). D1 = S (surgical substrate change), D2 = M (self-contained module with external-API contract), D3 = M (consumer wiring + degradation paths + manual QA gate), D4 = S (mechanical PN-CLI flow with a documented reconcile step). Non-linearity is confined to D3's dual dependency, surfaced above.

## Open items

- [x] Dev `DATABASE_URL` — provided by operator 2026-07-10; consumed by D1/D3.
- [x] D4 note: dev DB already matches the destination contract (D1's `db update`); the migration package must be reconciled (sign/resolve), not blindly re-applied. — done (`31c40ac`).
- [ ] Follow-up candidate (out of scope): in-flight singleflight dedup in `CachedForecastSource`/`ModelClock` for concurrent-request coalescing (DataLoader evaluated and rejected 2026-07-10 — identity cache conflicts with run-based freshness).

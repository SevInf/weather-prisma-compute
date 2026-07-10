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

## Sizing

Dispatch-INVEST: all three pass. D1 = S (surgical substrate change), D2 = M (self-contained module with external-API contract), D3 = M (consumer wiring + degradation paths + manual QA gate). Non-linearity is confined to D3's dual dependency, surfaced above.

## Open items

- [ ] Dev `DATABASE_URL` (no `.env` in worktree; no Postgres in flake or on host) — operator to provide/confirm before D1's apply step and D3's manual verification.

# Slice: read-through-forecast-cache

Parent project `projects/poi-forecast-cache/`. Outcome: `GET /api/pois` serves forecasts from a per-POI Postgres cache, fetching upstream only when a POI's covering ICON model has a new run due.

## At a glance

Adds a `PoiForecast` cache model to the Prisma Next contract, a model-clock module that attributes each POI to its covering DWD ICON model (D2 → EU → global by domain BBOX) and computes per-model `staleAt` from Open-Meteo `meta.json`, and read-through wiring in the `/api/pois` GET path. Unblocks project close (single-slice project).

## Chosen design

Three surfaces, one data flow (settled in the project spec; restated here as the working contract):

**1. Contract model** — `src/prisma/contract.prisma` gains:

```prisma
model PoiForecast {
  poiId     Int      @id
  poi       Poi      @relation(fields: [poiId], references: [id], onDelete: Cascade)
  model     String   // covering model slug: "dwd_icon_d2" | "dwd_icon_eu" | "dwd_icon"
  hourly    Json     // raw HourlyBlock as returned by Open-Meteo (time + 5 series)
  fetchedAt DateTime // when the forecast was fetched (drives UTC-rollover invalidation)
  staleAt   DateTime // last_run_availability_time + update_interval_seconds (or grace ext.)
}
```

One row per POI (`poiId` is the PK); `onDelete: Cascade` because `DELETE /api/pois/[id]` exists today. Exact field spelling may flex at dispatch time within PSL's supported surface (e.g. if `Json` needs a different lowering) — shape and keying may not.

**2. Model-clock module** — `src/services/model-clock.ts` (name negotiable):

- `coveringModel(lat, lng)` → first of D2 (BBOX 43.18/−3.94/58.08/20.34) → EU (29.5/−23.5/70.5/62.5) → global whose box contains the point; constants hardcoded from the verified `meta.json` values, with a comment pointing at the endpoints.
- `nextStaleAt(model)` → fetches `https://api.open-meteo.com/data/<model>/static/meta.json`, returns `(last_run_availability_time + update_interval_seconds) * 1000` as a Date. Grace path: when a re-check shows no new run (late run), returns `now + ~10 min` **marked as grace-extended** (e.g. `{staleAt, graceExtended}`), so consumers can distinguish a real next-run instant from a grace extension. Per the project spec, grace-extended results must extend existing rows' `staleAt` *instead of* triggering an upstream forecast refetch (refetch only when rows are missing). _(Amended after D3 R1: the original surface returned a bare Date, which made late-run grace indistinguishable from a new-run instant and caused forecast refetches every grace window — reviewer finding F1.)_
- Meta fetches are per-model, batched per request cycle (at most 3 upstream meta calls even with many POIs).

**2b. Per-model clock persistence** — _amended 2026-07-10 (operator decision, D8): `staleAt` is a per-model fact and moves out of `PoiForecast` into a per-model clock table, with the clock path mirroring the forecast path's connector architecture._

- Contract: new `ModelRun` model — `model IconModel @id`, `availableAt DateTime` (run availability instant), `updateIntervalSeconds Int`, `checkedAt DateTime` (last upstream consult). `PoiForecast` **drops `staleAt`** (keeps `model`, `hourly`, `fetchedAt`).
- `ModelMetaConnector` (interface): raw per-model meta access — `fetchMeta(model) → {availableAt, updateIntervalSeconds} | null`. Implemented by an Open-Meteo HTTP repository (no policy).
- `ModelRunRepository` (interface + PN implementation): dumb CRUD on the clock table; throws on DB failure.
- **Cached connector** implementing `ModelMetaConnector`: reads clock rows; a row is current while `availableAt + interval > now`, or while `checkedAt` is within the ~10 min re-check window (late-run throttle); otherwise delegates to the HTTP connector and upserts. Upstream failure with a row present → serve the stale row; no row → null.
- `ModelClock` service: pure staleness derivation over the injected connector — same `ModelRunClock` interface to consumers; `ModelStaleness` gains `availableAt` so the forecast path can check run currency.
- Freshness rule becomes: `now < model staleAt` (per-model) AND `poi.fetchedAt >= model.availableAt` (run currency — heals partial-write divergence) AND same-UTC-day (unchanged). Grace becomes a clock-table concern (checkedAt throttle); the per-POI `extendStaleAt` write path dies.

**3. Read-through wiring** — _amended 2026-07-10 (operator decision, in-PR refactor): the wiring is decomposed into a services/repositories architecture; the original inline shape below described D3's first landing and remains the behavioural contract._ Layering (dependencies on interfaces only, composition via module singletons):

- `ForecastSource` (interface): `hourlyBlocks(points: {id, latitude, longitude}[]) → Promise<Map<number, HourlyBlock> | null>`.
- `OpenMeteoForecastRepository` implements `ForecastSource`: the single batched HTTP call; count-mismatch/failure → `null`; no policy.
- `ForecastCacheRepository` (interface + PN implementation): dumb CRUD — `findByPoiIds`, `upsertMany`, `extendStaleAt`; throws on DB failure (callers own degradation).
- `CachedForecastSource` implements `ForecastSource` (the "cached repository" kind): composes `ForecastCacheRepository` + upstream `ForecastSource` + `ModelClock`; owns availability policy — freshness rule, grace, serve-priority, degradation, the decision log line.
- `WeatherService`: meteorology only (summarize/fog/beauty) over an injected `ForecastSource`; `getForecasts(pois) → Map<id, PoiForecast>` call-site contract unchanged.

Behavioural contract (unchanged by the refactor):

- Load cache rows for the requested POI ids in one query.
- A row is **fresh** iff `now < staleAt` **and** `fetchedAt` is on the same UTC day as `now` (rollover invalidation).
- Fresh rows → `summarize` from cached `hourly` (existing per-request derivation, unchanged).
- Stale/missing POIs → one batched Open-Meteo fetch (existing multi-location syntax), then upsert rows with fresh `staleAt` per each POI's covering model.
- Degradation: DB errors on read/write → log + proceed with direct fetch (never worse than today); upstream fetch failure with expired-but-present rows → serve the expired rows (better than today's empty map).
- Log one line per refresh decision (`cache hit all` / `refreshed n POIs`) so DoD observability holds.

## Coherence rationale

The cache table, its clock, and its single consumer land together: a reviewer holds the whole read-through path (schema → staleness rule → route behaviour) in one sitting, and rollback is one revert. Splitting would strand a table or a module with no consumer.

## Scope

**In:** `src/prisma/contract.prisma` (+ emitted artefacts + migration), `src/services/model-clock.ts` (new; re-opened in D3 R2 for the F1 grace-flag surface + F2 constant export), `src/services/weather-service.ts`, `src/app/api/pois/route.ts` (wiring only, response shape unchanged), migration under `migrations/`.

**Out:** everything in the project spec's non-goals (HTTP/CDN caching, generic cache framework, sun-time caching, unlogged tables, UI); `DELETE /api/pois/[id]` behaviour (cascade handles cleanup); tests-infrastructure standup beyond what the change itself needs.

## Pre-investigated edge cases

| Edge case | Disposition | Notes |
| --------- | ----------- | ----- |
| POI sunrise slips past cached 2-day window across UTC midnight | Handled by design | UTC-day-rollover invalidation (fresh = same UTC day) — settled in project spec |
| Next model run late vs `update_interval_seconds` estimate | Handled by design | Grace re-check ~10 min — settled in project spec |
| Open-Meteo meta endpoint down but forecast endpoint up | Degrade | Treat as "no new run": serve existing rows under grace, refetch forecasts only if rows missing |
| Multi-location response count mismatch (existing guard in `weather-service`) | Keep guard | On mismatch, skip upserts entirely — never cache misaligned data |

## Slice-specific done conditions

- [ ] The six project-DoD conditions in `projects/poi-forecast-cache/spec.md` hold (single-slice project — the slice carries the full project DoD).
- [ ] Manual verification log attached to the PR: two consecutive `GET /api/pois` calls showing `cache hit` on the second; one call after truncating the table showing the cold path.

## Open Questions

1. _No `.env` in the worktree (only `.env.example`); the migration + manual-verification steps need a live `DATABASE_URL`._ Working position: operator provides/confirms a dev database before the migration dispatch runs; the code dispatches don't block on it.
2. _Does PSL `Json` lower cleanly in PN 0.14.0?_ Working position: assumed yes; if the interpreter rejects it, fall back to `String` carrying JSON text (shape-compatible, revisit later). Dispatch-time discovery amends this spec per I12 only if the fallback also fails.

## References

- Parent project: `projects/poi-forecast-cache/spec.md`
- Linear issue: n/a (repo not tracked in Linear — `drive/spec/README.md`)
- Open-Meteo meta endpoints: `https://api.open-meteo.com/data/{dwd_icon_d2,dwd_icon_eu,dwd_icon}/static/meta.json`

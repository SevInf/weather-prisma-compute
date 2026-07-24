# poi-forecast-cache — Plan

**Spec:** `projects/poi-forecast-cache/spec.md`
**Linear Project:** n/a (repo not tracked in Linear — see `drive/plan/README.md`)

## At a glance

A single-slice project: the cache table, the per-model clock logic, and the read-through wiring land together as one reviewable PR. Splitting was considered and rejected — a standalone "model-clock service" slice would fail slice-INVEST's _Valuable_ test (pure preparation, no user-visible gain).

## Composition

### Stack (deliver in order)

1. **Slice `read-through-forecast-cache`** — Linear: n/a
   - **Outcome:** `GET /api/pois` serves forecasts from a per-POI Postgres cache; Open-Meteo forecast calls happen only when a POI's covering model (attributed by domain BBOX, D2 → EU → global) has a new run due per its `meta.json` clock. Cold or truncated cache behaves exactly like today's uncached path.
   - **Builds on:** None.
   - **Hands to:** Project close. Stable state: a `PoiForecastCache` (name negotiable) model in `src/prisma/contract.prisma` + applied migration; a model-attribution/staleness module; `weather-service`/route wired read-through with the grace re-check (~10 min), UTC-day-rollover invalidation, and both graceful-degradation directions (cache unreachable → direct fetch; provider down + warm cache → serve cached), observable via service logs.
   - **Focus:** Everything in the spec's cross-cutting requirements. Deliberately out of scope (spec non-goals): HTTP/CDN caching, generic cache frameworks, sun-time caching, UI changes, unlogged tables / out-of-band DDL.

## Dependencies (external)

- [x] Open-Meteo per-model metadata endpoints (`/data/{dwd_icon_d2,dwd_icon_eu,dwd_icon}/static/meta.json`) — verified live 2026-07-10; all three expose `crs_wkt` BBOX + `update_interval_seconds`.
- [x] Prisma Next 0.14.0 contract → emit → migration flow — in place (`prisma-next.config.ts`, `src/prisma/`).

## Sequencing rationale

Single slice — no sequencing. Dispatch-level decomposition happens at slice pickup via `drive-plan-slice`.

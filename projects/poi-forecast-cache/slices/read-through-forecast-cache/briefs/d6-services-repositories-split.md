# Brief: D6 services-repositories-split

## Task

Decompose the forecast path per the amended slice spec § Chosen design (3) — services vs repositories, dependencies on interfaces only, zero behaviour change:

- `ForecastSource` (interface): `hourlyBlocks(points: { id: number; latitude: number; longitude: number }[]): Promise<Map<number, HourlyBlock> | null>`.
- `OpenMeteoForecastRepository` implements `ForecastSource`: the single batched HTTP call (current `fetchHourlyBlocks` + `buildRequestUrl` logic); count-mismatch/failure → `null`; no policy.
- `ForecastCacheRepository` (interface) + PN-backed implementation: dumb CRUD — `findByPoiIds(ids)`, `upsertMany(rows)`, `extendStaleAt(poiIds, until)`; **throws** on DB failure (no catching, no logging — callers own degradation).
- `CachedForecastSource` implements `ForecastSource`: composes `ForecastCacheRepository` + an upstream `ForecastSource` + the model clock; owns ALL availability policy — freshness rule (`now < staleAt` AND same-UTC-day `fetchedAt`), grace (extend-don't-refetch), serve-priority (fresh → fetched → expired), degradation both directions, the one decision log line.
- `WeatherService`: meteorology only (summarize/fog/beauty + sun-target plumbing) over an injected `ForecastSource`; public `getForecasts(pois: ForecastInput[]): Promise<Map<number, PoiForecast>>` contract unchanged (route untouched).
- `ModelClock`: extract a minimal interface for what `CachedForecastSource` consumes; existing class satisfies it.

Wiring: one composition point via module singletons (match the `db.ts` house pattern); classes take dependencies via constructor, typed as interfaces (`import type` where possible). File layout your call (suggested: `src/repositories/` for the two repos, interfaces co-located or in `src/services/forecast-source.ts` — report the layout).

## Scope

**In:** `src/services/**`, new `src/repositories/**`. **Out:** `src/app/**` (route byte-untouched), `src/prisma/**`, `migrations/**`, behaviour of any kind (log line text included), new dependencies. DataLoader rejected by operator — do not introduce; no singleflight (follow-up ledger).

## Completed when

- [ ] `WeatherService` contains no persistence/fetch/policy code; repos contain no policy; `CachedForecastSource` contains no meteorology. No concrete-class imports across the seams (verify: `rg` the imports; type-only for interfaces).
- [ ] `nix develop -c bun run build` passes.
- [ ] Behaviour-preservation gates recorded in the report: (1) dev-server smoke — two GETs → `refreshed N of N` then `all N fresh`, response shape equal; (2) cold path after clearing rows; (3) grace check — now **stub-based against the interfaces** (no `globalThis.fetch` patching): stub clock returning `graceExtended: true` + stub upstream that counts calls → 0 upstream calls, staleAt extended.
- [ ] Comment discipline: D5 R2's telegraphic bar; moved code carries its surviving comments, no new prose.
- [ ] Report: final file layout, per-file line counts, and `getForecasts`'s new line count.

## Standing instruction

Stay focused on the goal; control scope. This is a refactor: if you discover the existing behaviour is *wrong* somewhere, HALT and surface — do not fix silently.

## Operational metadata

- **Model tier:** mid. **Time-box:** 60 min.
- **Halt conditions:** any observable behaviour change needed to complete; route/response shape change; new dependency needed; existing-behaviour bug discovered.

# Brief: D8 model-clock-persistence

## Task

Implement spec § Chosen design (2b): move staleness to a per-model persisted clock with the connector architecture, keeping per-POI `fetchedAt` for run currency + UTC rollover.

1. **Contract:** add `ModelRun` — `model IconModel @id`, `availableAt DateTime`, `updateIntervalSeconds Int`, `checkedAt DateTime`. Drop `staleAt` from `PoiForecast`. Emit; extend the migration graph (new edge from current hash; the `staleAt` column drop on disposable cache data is authorized — nothing else destructive); apply via PN CLI; `migration status` clean. Watch for the FK-index re-plan gotcha (learnings #11) — hand-prune via the sanctioned flow if it reappears.
2. **`ModelMetaConnector` interface:** `fetchMeta(model: IconModel) → Promise<ModelMeta | null>` where `ModelMeta = { availableAt: Date; updateIntervalSeconds: number }`. HTTP implementation `OpenMeteoModelMetaRepository` (moves the meta.json fetch out of ModelClock; no-store; warn → null; no policy).
3. **`ModelRunRepository` interface + PN implementation:** `findByModels(models)`, `upsertMany(rows)`; throws on DB failure; no policy.
4. **Cached connector** (e.g. `CachedModelMetaConnector implements ModelMetaConnector`): row current while `availableAt + interval > now` OR `checkedAt` within `GRACE_MS`; else delegate to HTTP connector and upsert (`checkedAt: now`). Consult failure with row present → return the stale row's meta; no row → null. DB failure → delegate straight to HTTP (degrade). Pin the checkedAt-on-failure choice deliberately and report it (goal: late-run/outage meta consults throttle to ~1 per GRACE_MS, matching today's cadence).
5. **`ModelClock`:** pure derivation over an injected `ModelMetaConnector`: `staleAt = availableAt + interval`; past → `{staleAt: now + GRACE_MS, graceExtended: true}`; `ModelStaleness` gains `availableAt: Date`. `ModelRunClock` interface shape otherwise unchanged.
6. **`CachedForecastSource`:** clock consulted for all points' models up front (cached connector makes this a DB read, not HTTP); freshness = `now < staleness.staleAt && !staleness.graceExtended && poi.fetchedAt >= staleness.availableAt && sameUtcDay`; grace-served = (null meta OR graceExtended) AND current-run-or-any row present (report your exact predicate); `extendStaleAt`/`extendGrace` and `ForecastCacheWrite.staleAt` die. Decision log line wording preserved (`all N fresh` / `refreshed…` / `grace-served (no new run)` / `expired served (upstream failed)` / `db unavailable, direct fetch`); the `grace extension failed` warn dies with its write.

## Scope

**In:** `src/prisma/contract.prisma` (+ artefacts, migration, dev-DB apply), `src/repositories/**`, `src/services/model-clock.ts`, `src/services/cached-forecast-source.ts`, wiring singletons. **Out:** route (byte-untouched), `weather-service.ts` unless a type ripple forces it (report), UI, GitHub, singleflight.

## Completed when

- [ ] `nix develop -c bun run build` passes; `migration status` clean ("Up to date", no diagnostics); PN CLI only.
- [ ] Behaviour gates: dev-server smoke (2 GETs → refresh then `all N fresh`; second request makes zero meta HTTP calls — demonstrate via log/stub or temporary instrumentation removed before commit); cold path; stub grace check at the new seams (stub `ModelMetaConnector` late-run → 0 upstream forecast calls, clock row honoured); run-currency check demonstrated (row with `fetchedAt < availableAt` gets refetched despite fresh clock — stub or seeded).
- [ ] Report: connector/repo/clock/source seam summary, the checkedAt-on-failure choice, migration package name + op classes, and gate outputs.

## Standing instruction

Stay focused; control scope. Functional-core discipline holds (pure decisions, effects in shells); telegraphic comments; ES `#private`; branded `PoiId` untouched.

## Operational metadata

- **Model tier:** mid. **Time-box:** 90 min.
- **Halt conditions:** migration destructive beyond the authorized `staleAt` drop; any decision-log wording change forced; interface ripple reaching the route; behaviour delta beyond the specced grace-write removal.

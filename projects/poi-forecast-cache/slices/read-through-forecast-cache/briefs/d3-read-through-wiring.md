# Brief: D3 read-through-wiring

## Task

Wire the `/api/pois` GET path read-through: consume the `PoiForecast` cache table (D1) and the model-clock module (D2) so that fresh cache rows serve forecasts without an upstream Open-Meteo forecast call, stale/missing POIs are refetched in one batched call and upserted, and both degradation directions hold. Freshness rule: `now < staleAt` AND `fetchedAt` same UTC day as `now`. On refresh: attribute each POI via `coveringModel`, resolve `staleAt` per model via `modelClock.nextStaleAt` (a `null` meta result → grace: `now + ~10 min`), store the POI's raw hourly block. Degradation: DB read/write failure → log + direct fetch (never worse than today); upstream forecast failure with rows present (even expired) → serve those rows. Log one line per request cycle stating the refresh decision (e.g. `forecast cache: all N fresh` / `refreshed M of N POIs`). The route's response shape must not change.

## Scope

**In:** `src/services/weather-service.ts` (read-through logic — either inside `WeatherService` or a thin wrapper; call-site contract stays `getForecasts(pois) → Map<id, PoiForecast>`), `src/app/api/pois/route.ts` (only if wiring requires it). Design freedom: where the cache logic lives, exact log wording, how `hourly` Json is validated on read (malformed cached payload → treat as missing).

**Out:** `src/prisma/contract.prisma` and emitted artefacts (no schema changes), `src/services/model-clock.ts` (consume as-is; halt if its surface is insufficient), `src/app/api/pois/[id]/route.ts`, UI components, `projects/**`, `.env`.

## Completed when

- [ ] `nix develop -c bun run build` passes.
- [ ] Manual verification log recorded in the dispatch report, produced against the dev server (`nix develop -c bun run dev`, backgrounded, then curl; kill afterwards): (1) two consecutive `GET /api/pois` with ≥1 POI present — server log shows a refresh on the first and a cache-hit (no upstream forecast call) on the second; (2) clear the cache table (no psql on host — use a bun one-liner via the project's db client, e.g. `db.orm.public.PoiForecast.where(...).delete()`, or the PN CLI if it offers row ops), then one `GET` — response shape identical, forecasts present, log shows refresh. If the DB has no POIs, create one via `POST /api/pois` first.
- [ ] Report names which file(s) carry the cache logic and quotes the exact log lines emitted.

## Standing instruction

Stay focused on the goal; control scope. Trivial-and-related fixes that obviously serve the goal go in the same dispatch with a one-line note. Anything that pulls you off the goal halts and surfaces.

## References

- Slice spec § Chosen design (3) + § Pre-investigated edge cases: `projects/poi-forecast-cache/slices/read-through-forecast-cache/spec.md` — the edge-case dispositions (meta-down → grace; response-count mismatch → skip upserts entirely) are binding.
- D1 hand-off: lane `db.orm.public.PoiForecast` — fields `poiId number (PK)`, `model string`, `hourly JsonValue (jsonb)`, `fetchedAt`/`staleAt Timestamptz` (input accepts `Date`); relation cascade-deletes with `Poi`. Import `db` from `@/prisma/db`.
- D2 hand-off: `import { coveringModel, modelClock, type IconModel } from "@/services/model-clock"` — `coveringModel(lat, lng): IconModel`; `modelClock.nextStaleAt(models): Promise<Map<IconModel, Date | null>>` (`Date` is already grace-extended for late runs; `null` = meta unknown → apply grace yourself).
- PN query surface: `.agents/skills/prisma-next-queries/SKILL.md` (upsert/where/delete lanes).

## Operational metadata

- **Model tier:** mid — consumer wiring with pinned design; the judgment calls are enumerated as design freedoms.
- **Time-box:** 45 min (includes the manual verification run). Overrun → halt and surface.
- **Halt conditions:** model-clock or PoiForecast lane surface insufficient for the design; response shape cannot be preserved; dev server or DB unreachable; any need to touch out-of-scope files.

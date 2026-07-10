# Brief: D6 R2 — decompose the policy pipeline (operator verdict)

## Task

The operator's verdict on R1: *"Soup just moved to cached-forecast-source. We did all of the work just to end up where we were, but with 5 more classes!"* Correct: `CachedForecastSource.hourlyBlocks` is a 128-line method with the D3-era interleave. Decompose it — **functional core, imperative shell**, inside the existing seams:

- **Pure decision functions** (no I/O, no logging, no `Date.now()` — time passed in; plain data in → plain data out). Suggested cuts (names yours; the cuts are the point):
  - `partitionByFreshness(points, rowById, now)` → `{ fresh: Map<id, HourlyBlock>, expired: Map<id, HourlyBlock>, toRefresh: ForecastPoint[] }`
  - `triageRefresh(toRefresh, modelByPoi, staleAtByModel, expired)` → `{ graceServed: Set<id>, toFetch: ForecastPoint[] }`
  - `planCacheWrites(toFetch, fetched, modelByPoi, staleAtByModel, now, grace)` → `ForecastCacheWrite[]`
  - `assembleServing(points, fresh, fetched, expired, graceServed)` → `{ out: Map<id, HourlyBlock>, expiredFallback: number }`
  - `formatDecisionLine(stats)` → `string`
- **The shell** (`hourlyBlocks`): reads cache (try/catch), calls the pure phases in order, performs the fetch/persist effects, logs the formatted line. Target **≤ ~30 lines**, each phase one named call.
- **NO new classes.** Pure functions live as module-privates in `cached-forecast-source.ts` (or one sibling `forecast-cache-policy.ts` module if the file gets long — your call, report it).

Behaviour byte-identical: same decisions, same log wording, same degradation. This is a re-arrangement, not a redesign.

## Scope

**In:** `src/services/cached-forecast-source.ts` (+ optionally one new pure-function module). **Out:** everything else; interfaces unchanged; no behaviour change.

## Completed when

- [ ] `hourlyBlocks` ≤ ~30 lines; every extracted decision function is pure (no I/O/log/ambient time — rg-verify `console.|await|Date.now|fetch` inside them → only the shell hits).
- [ ] `nix develop -c bun run build` passes.
- [ ] Behaviour gates re-run and recorded: dev-server smoke (2 GETs), cold path, stub-based grace check — identical outcomes to R1.
- [ ] Report: shell line count, list of pure functions with their signatures.

## Operational metadata

- **Model tier:** mid. **Time-box:** 40 min.
- **Halt conditions:** any behaviour delta needed; shell can't reach ~30 lines without hiding decisions back inside it.

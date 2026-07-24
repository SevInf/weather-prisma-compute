# Brief: D3 R2 — resolve F1 + F2

## Task

Resolve the two open findings from D3 R1. **Scope amendment (orchestrator-authorized, recorded in code-review.md § Orchestrator notes): `src/services/model-clock.ts` is now IN scope.**

- **F1 (must-fix):** late-run grace is indistinguishable from a real next-run instant. `ModelClock.nextStaleAt` currently returns `Map<IconModel, Date | null>`; a late run yields a plain grace Date, so the wiring treats it as meta-known and refetches forecasts every ~10 min while a run is late. The project spec settled: extend `staleAt` *instead of* re-fetching (refetch only when rows are missing). Fix per amended slice spec § Chosen design (2): return a marked result per model (e.g. `{ staleAt: Date, graceExtended: boolean } | null`), and route grace-extended results for POIs with existing rows through the same serve-and-extend arm as meta-null (no upstream forecast fetch); POIs without rows still fetch.
- **F2 (low/process):** `META_GRACE_MS`/`GRACE_MS` duplicated across `model-clock.ts` and `weather-service.ts`. Export the constant from `model-clock.ts`; consume it in `weather-service.ts`.

## Completed when

- [ ] `nix develop -c bun run build` passes.
- [ ] Grace-behaviour verification recorded: exercise the late-run path (e.g. point a `ModelClock` at a stub/unreachable base URL for the null arm, and simulate a late run — smallest honest check acceptable: a bun invocation demonstrating that a grace-extended model with existing rows produces no upstream forecast fetch and extends staleAt, plus the normal dev-server smoke from R1 still passing: two GETs → refresh then all-fresh).
- [ ] Report quotes the new `nextStaleAt` return type and the single shared grace constant's export/import sites.

## Halt conditions

Unchanged from R1 (+ time-box 30 min).

# Code review — `poi-forecast-cache`

> Initial scaffold. The reviewer maintains this document across rounds. The orchestrator and implementer read it but do not edit it.

## Summary

- **Current verdict:** D3 R2 — SATISFIED (slice close)
- **Dispatches SATISFIED:** D1 (cache-table-contract), D2 (model-clock-module), D3 (read-through-wiring)
- **DoD scoreboard totals:** 7 PASS / 0 FAIL / 0 NOT VERIFIED
- **Open findings:** 0 (F1, F2 resolved at `35f3e1e`)
- **Open escalations:** 0

## Acceptance criteria scoreboard

> Populated from `projects/poi-forecast-cache/spec.md § Project Definition of Done` (single-slice project — the slice carries the full project DoD) plus the slice-specific conditions. Update on every round.

| AC ID | Description (short) | Dispatch | Status | Evidence |
| ----- | ------------------- | -------- | ------ | -------- |
| DoD-1 | Second GET within run window served from cache; exactly one upstream forecast fetch (log-observable) | D3 | PASS | Manual scenario 1 (GET#1 "refreshed 2 of 2", GET#2 "all 2 fresh") + code `weather-service.ts`, commits `1d7ab80` + `35f3e1e`. Caveat lifted at R2: late-run grace check verified 0 forecast calls with expired row present (F1 resolved) |
| DoD-2 | Past `staleAt`, next request re-fetches; model-run identity advances | D3 | PASS | Code: expired → `toRefresh` → `toFetch` → upsert advances `fetchedAt`/`staleAt` (`weather-service.ts:130-166, 279-309`); manual staleAt reconciliation (Munich 13:27:22Z = availability+interval) |
| DoD-3 | Truncated cache table → same response shape, correct forecasts (cold path) | D3 | PASS | Manual scenario 2 (cleared table → "refreshed 2 of 2", shape equality verified programmatically) + missing-row code path |
| DoD-4 | New POI gets forecast on next request without waiting for other rows | D3 | PASS | Code: rowless POI never grace-served, always lands in `toFetch` batched with other stale POIs (`weather-service.ts:150-158`) |
| DoD-5 | Contract migration applies via standard PN flow, no manual DDL | D1 | PASS | Commit `0149750` (contract + emitted artefacts) + `f9188a7` (refs advanced by `db update`); PN CLI only, flow choice recorded per brief; refs/db.contract.json == src/prisma/contract.json (verified on disk) |
| DoD-6 | `bun run build` (incl. `contract emit`) passes | D1–D3 | PASS | Build green at `f9188a7`, `bf64ae9`, and final `1d7ab80` (implementer reports; no reason to distrust) |
| SL-1  | Manual verification log attached (2× GET cache-hit; post-truncate cold path) | D3 | PASS | Both scenarios recorded with exact log lines, status codes, programmatic shape check, staleAt reconciliation (implementer report D3 R1). Orchestrator: attach the log to the PR body at open time |

Status values: `PASS` / `FAIL` / `NOT VERIFIED — <reason>` / `ACCEPTED DEFERRAL — <link>` / `OUT OF SCOPE`.

## Subagent IDs

> See `drive-build-workflow/SKILL.md § Subagent continuity`. The orchestrator records the persistent implementer + reviewer IDs here on round 1 and resumes the same IDs across every subsequent round. If a subagent is replaced (e.g. resume failed), append a swap note recording when and why.

- **Implementer:** `27bf3883-82bc-4ad6-b501-4b0b55a498cc` — first spawned in D1 R1.
- **Reviewer:** `8e011d1d-d32b-41ae-9be8-023a547a0225` — first spawned in D1 R1.

## Findings log

> Each finding gets a stable F-number. Findings are not renumbered when resolved; they are marked resolved with a brief closure note.
>
> **Bar for filing:** every finding must have a concrete recommended action that the implementer can take in this PR. "Consider for the future," "out of scope," and "no action" are not findings. Severity is one of `must-fix` / `should-fix` / `low / process`.

### F1 — Late-run grace triggers full forecast refetch instead of staleAt extension

**Severity:** must-fix

**Where:** `src/services/weather-service.ts:150-158` + `src/services/model-clock.ts:135-139` (commit `1d7ab80`)

**What:** The project spec's settled design (At a glance §1, refinement 1) says: past `staleAt`, re-check `meta.json`; if no new run has landed, `staleAt` extends by ~10 min **instead of re-fetching forecasts**. As implemented, a late run makes `nextStaleAt` return `now + 10 min` as a plain `Date` — indistinguishable from a real next-run instant — so `metaKnown` is true and the POI proceeds to `toFetch`: a full upstream forecast refetch every ~10 min grace window for as long as the run is late. The grace-serve-without-refetch arm only triggers on meta fetch *failure* (`null`). Two GETs straddling a grace expiry during a late run produce two upstream fetches within one model-run window, breaking the letter of the "exactly one fetch per run window" DoD condition.

**Why it matters:** Provider-friendliness is the project's stated purpose, and late availability windows are routine (availability lags initialisation ~1.5 h and "can slip" per the spec) — so the extra refetches recur every ~10 min per late model. Note the design lineage: D2 implemented its brief faithfully; the slice spec's operationalization of the clock surface lost the project spec's "extend instead of refetch" bit. D3 then wired what the surface allowed. The fix is nonetheless concrete and in-PR.

**Recommended next action:** Make the grace case distinguishable — e.g. `nextStaleAt` returns `Map<IconModel, { staleAt: Date; graceExtended: boolean } | null>` — and in `getForecasts` treat expired-row + `graceExtended` like the meta-`null` arm (serve the row, `extendGrace`, no refetch; rowless POIs still fetch). Requires opening `src/services/model-clock.ts` to the implementer (D2's file, same PR) — orchestrator authorization needed.

**Status:** resolved (`35f3e1e`) — `ModelStaleness { staleAt, graceExtended }` surface landed exactly as recommended; unified `newRunAvailable` arm verified on disk; grace-behaviour check recorded 1 meta call / 0 forecast calls / staleAt extended / fetchedAt untouched; spec amendment recorded under § Orchestrator notes

### F2 — `META_GRACE_MS` duplicated between model-clock and weather-service

**Severity:** low / process

**Where:** `src/services/weather-service.ts:27` and `src/services/model-clock.ts:47`

**What:** The same 10-minute grace constant is declared independently in both modules (`GRACE_MS` private in model-clock; `META_GRACE_MS` re-declared in weather-service because model-clock doesn't export it and was read-only for D3).

**Why it matters:** Two sources of truth for one design parameter drift silently; the spec treats "~10 min" as a single knob.

**Recommended next action:** Export the constant from `model-clock.ts` and import it in `weather-service.ts` — model-clock.ts is already being opened for F1, so this rides along at no extra scope cost.

**Status:** resolved (`35f3e1e`) — `GRACE_MS` exported from `model-clock.ts:53`, imported in `weather-service.ts`; duplicate deleted (`rg META_GRACE_MS src/` → zero hits). Name kept as `GRACE_MS`: correct, since it now covers both grace causes (late run + meta unknown)

## Round notes

> One subsection per round per dispatch.

### D1 R1 — SATISFIED

**Scope:** D1 cache-table-contract. Commits `0149750`..`f9188a7`.

**Tasks:** all four completed-when conditions clean (contract + emitted artefacts committed and internally consistent; dev DB via PN CLI only, flow recorded; build green; emitted field types recorded for D3).

**AC delta:** DoD-5 NOT VERIFIED → PASS (commits `0149750`, `f9188a7`; on-disk ref/contract consistency verified). DoD-6 partial evidence at D1 scope; promotion deferred to D3. Transient-ID scan: zero hits.

**Findings:** none.

**For orchestrator:** Flags A/B/C all accepted (A: `db update` is a documented standard PN flow, brief authorized either path, and the formal path would bake sibling-branch `DROP TABLE`s into committed history — rationale sound; B: halt-condition letter respected, dry-run showed `poi` untouched, drops unavoidable under any PN flow, reported loudly — judgment sound; C: `prisma-next-migration-review` skill § refs says "commit-friendly artifacts — keep them in git" — committing is correct). One user-facing note: the branch intentionally carries no migration package, so any non-dev environment will need its own `db update`/future `migration plan` — flag at PR time.

### D2 R1 — SATISFIED

**Scope:** D2 model-clock-module. Commit `bf64ae9` (single new file `src/services/model-clock.ts`).

**Tasks:** all three completed-when conditions clean (exports honour grace + per-model null failure-tolerance, BBOX constants comment cites all three meta.json endpoints; build green; invocation-verified spot-check for Munich/Lisbon/New York recorded). Hand-off signatures in the report match disk exactly.

**AC delta:** none owned by D2 alone; DoD-6 partial evidence widened (build green at `bf64ae9`). Transient-ID scan: one `D2` token at `model-clock.ts:58` — exempt, see below; zero violating hits.

**Findings:** none.

**For orchestrator:** Flag A accepted — `ICON-D2` is DWD's official model designation (stable external domain term, not a plan artefact; context "ICON-D2 → ICON-EU → ICON global" is unambiguous; identical pre-existing usage on main at `weather-service.ts:145`). Flag B accepted — models-only signature preserves the ≤3-fetch intent structurally (3-value union + Set dedupe, one parallel fetch per unique model) and D3 maps POIs → models via the exported pure `coveringModel`; the brief's own phrasing ("POIs / needed models") licensed either.

### D3 R1 — ANOTHER ROUND NEEDED

**Scope:** D3 read-through-wiring. Commit `1d7ab80` (single file `src/services/weather-service.ts`; route untouched — verified).

**Tasks:** all three completed-when conditions clean (build green; two-scenario manual verification recorded with exact log lines; cache-logic location + log lines named in report).

**AC delta:** DoD-1→PASS (normal-run path; late-run letter tracked as F1), DoD-2→PASS, DoD-3→PASS, DoD-4→PASS, DoD-6→PASS (full), SL-1→PASS (content sufficient). Totals 7/0/0. Transient-ID scan: zero hits.

**Findings:** F1 (must-fix), F2 (low / process).

**For orchestrator:** F1's fix needs `model-clock.ts` opened to the implementer next round (D2's file, same PR) — F2 rides along. Attach the SL-1 manual log to the PR body at open time. Gotcha candidates already flagged to you by the implementer (PN `.delete()` removing one row per call under `.in()`; `contract.d.ts` advertising branded `Timestamptz` strings while the lane returns `Date`) — worth routing to `product-record-gotcha`.

### D3 R2 — SATISFIED (slice close)

**Scope:** F1 + F2 resolution. Commit `35f3e1e` (`model-clock.ts` + `weather-service.ts` only — the two authorized files).

**Tasks:** F1 resolved (marked-grace surface exactly per recommendation; late-run + expired row → serve-and-extend, 0 forecast calls verified; rowless POIs still fetch, upsert takes `.staleAt` correctly). F2 resolved (`GRACE_MS` exported/shared, duplicate gone). Build green; R1 dev-server smoke re-run green.

**AC delta:** DoD-1 caveat lifted — PASS now unconditional (evidence widened to `35f3e1e` + grace check). Totals 7 PASS / 0 FAIL / 0 NOT VERIFIED. Findings log clean. Transient-ID scan (incl. F-numbers): zero hits.

**Findings:** none new; F1, F2 closed.

**For orchestrator:** slice DoD met — proceed to PR open (attach SL-1 manual log to the PR body; spec amendment already recorded).

## Orchestrator notes

- **D3 R1 intent-validation (2026-07-10):** F1 verdict upheld — project spec § At a glance settled "extend `staleAt` instead of re-fetching forecasts" for late runs; the bare-Date clock surface lost that bit. Scope amendment authorized without operator escalation: `src/services/model-clock.ts` is open for D3 R2 (same slice, same PR, spec-mandated behaviour — slice spec § Chosen design (2) and § Scope amended accordingly). F2 rides along. Items-for-user 3 (PN gotcha candidates) parked in `learnings.md` for close-out routing.

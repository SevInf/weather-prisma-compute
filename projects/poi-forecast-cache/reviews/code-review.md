# Code review — `poi-forecast-cache`

> Initial scaffold. The reviewer maintains this document across rounds. The orchestrator and implementer read it but do not edit it.

## Summary

- **Current verdict:** D6 R2 — SATISFIED (slice re-closed)
- **Dispatches SATISFIED:** D1 (cache-table-contract), D2 (model-clock-module), D3 (read-through-wiring), D4 (migration-package), D5 (comment-trim), D6 (services/repositories split + functional core)
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
| DoD-5 | Contract migration applies via standard PN flow, no manual DDL | D1/D4 | PASS | Commit `0149750` + `f9188a7` (D1: `db update`, PN CLI only). Evidence widened at D4 (`31c40ac`): replayable planner-rendered history — baseline `null → eecde426` (create `poi`) + edge `eecde426 → 6db32dad` (create `poiForecast` + index + cascade FK, matching D1's applied DDL); all additive, zero placeholders; `migration status` clean, DB schema unchanged |
| DoD-6 | `bun run build` (incl. `contract emit`) passes | D1–D3 | PASS | Build green at `f9188a7`, `bf64ae9`, and final `1d7ab80` (implementer reports; no reason to distrust) |
| SL-1  | Manual verification log attached (2× GET cache-hit; post-truncate cold path) | D3 | PASS | Both scenarios recorded with exact log lines, status codes, programmatic shape check, staleAt reconciliation (implementer report D3 R1). Orchestrator: attach the log to the PR body at open time |

Status values: `PASS` / `FAIL` / `NOT VERIFIED — <reason>` / `ACCEPTED DEFERRAL — <link>` / `OUT OF SCOPE`.

> **D6 re-evidencing note:** `c16d807` + `efaa333` relocated the read-through behaviour into `src/services/cached-forecast-source.ts` (+ `src/repositories/*`) with zero behaviour change (verified phase-by-phase on disk; log/warn wording byte-preserved). All D3-era behaviour gates re-run at `efaa333`: dev-server smoke, cold path, stub-based grace check — identical outcomes. DoD-1…DoD-4, DoD-6, and SL-1 evidence is re-anchored at `efaa333` accordingly.

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

### D4 R1 — SATISFIED (slice re-closed)

**Scope:** D4 migration-package. Commit `31c40ac` (12 files, all under `migrations/app/`).

**Tasks:** all four completed-when conditions clean (committed packages additive-only — destructive sweep zero hits; `migration status`/`db verify`/build reported green with before/after table-set unchanged; commands, origin/destination hashes `null→eecde426→6db32dad`, and five CLI-vs-skill deviations recorded). Edge migration ops match D1's applied DDL; refs byte-identical to `f9188a7` despite the delete/set round-trip (verified). Worktree `src/` clean — the transient emit-swap left no residue.

**AC delta:** DoD-5 evidence widened (real replayable history). Totals hold at 7 PASS / 0 FAIL / 0 NOT VERIFIED. Transient-ID scan: zero hits.

**Findings:** none.

**For orchestrator:** Flag A accepted — committed-end-state reading is right (scope's concern is the PR's contract surface; byte-exact restore verified on disk; the only CLI-sanctioned way to anchor main's contract, and loudly flagged). Flag B accepted — the baseline is PN's structural precondition for a non-null-origin edge (`HASH_NOT_IN_GRAPH` otherwise) and directly serves the brief's replayability purpose. D1's item-for-user (no migration package) is now resolved. Route the five CLI-vs-skill deviations to `learnings.md` alongside the earlier PN gotchas — several look upstream-worthy (`--from ./path` dead vs help text; `migration new` silently ignoring `--from`; dirty-ref auto-baseline anchored at destination producing a destructive scratch plan).

### D5 R1 — SATISFIED (slice re-closed)

**Scope:** D5 comment-trim. Commit `b43947c` (3 hand-authored files, 2 insertions / 10 deletions).

**Tasks:** all three completed-when conditions clean — every hunk verified comment/blank-only in the three named files; build green; report lists each removal with rubric category and each borderline keep with rationale (all seven removals verified against categories 1–4; displaced invariants confirmed still documented at their source: malformed→missing at `parseHourlyBlock`, ≤3-fetch on the `ModelClock` class doc).

**AC delta:** none — totals hold 7 PASS / 0 FAIL / 0 NOT VERIFIED; DoD-6 evidence extends to `b43947c`. Category-2 sweep over all PR-added comments (`main...HEAD`): sole hit is the previously-adjudicated exempt `ICON-D2` domain term; no spec/dispatch/F-number/`projects/` references survive. Emit stability accepted (storageHash `6db32dad` unchanged per report; `git status src/` clean, refs pin unchanged — consistent).

**Findings:** none.

**For orchestrator:** nothing new; `5fda882` (.gitattributes) not reviewed per scope, no defect incidentally observed.

### D5 R2 — SATISFIED (operator overrule verified)

**Scope:** aggressive comment trim per operator bar. Commit `491317b` (3 files, +30/−103).

**Tasks:** all three completed-when conditions clean — budgets independently counted on disk with the brief's regex: model-clock **15/15** total, weather-service **12/12** PR-added, contract.prisma header 1 + exactly 2 field comments; diff comment/blank-only (contract.prisma trailing-comment hunks verified code-token-identical after comment strip); build green; emit stability corroborated (`git status src/` clean, refs pin unchanged).

**AC delta:** none — totals hold 7 PASS / 0 FAIL / 0 NOT VERIFIED; DoD-6 evidence extends to `491317b`. All seven must-survive kernels present and terse (Date-decode trap, same-UTC-day, one-decision-line, bbox-null sentinel, unreachable guard, no-store ×2, extend-don't-refetch on `ModelStaleness`). Pre-existing main comments (Tardif & Rasmussen, weather-service no-store block) untouched. Scan: sole hit = exempt `ICON`/`D2` domain term (standing D2 R1 ruling).

**Findings:** none — R1-bar keeps that were cut (private-method docs) hide no correctness trap; their contracts are signature-visible (`| null`, `allSettled`, try/catch).

**For orchestrator:** none.

### D6 R2 — SATISFIED (both D6 commits)

**Scope:** D6 services/repositories split + functional-core decomposition. Commits `c16d807`, `efaa333`.

**Tasks:** R1 conditions clean (seams verified by my own rg: weather-service zero `db./fetch(/console.` hits; repos policy-free; interface-typed singletons incl. `ModelRunClock`; route byte-untouched; `getForecasts` meteorology-only). R2 conditions clean (shell `hourlyBlocks` exactly 29 lines, every phase a named call; the two if-guards are effect-gating with conditions semantically identical to D3-era `dbHealthy && …`; purity rg — all 12 `console.|await|Date.now|fetch(` hits in shell/effect-privates L63–118, core L121+ clean, no ambient time; build + all three behaviour gates re-run green).

**AC delta:** none — totals hold 7 PASS / 0 FAIL / 0 NOT VERIFIED; DoD-1–4/DoD-6/SL-1 re-evidenced at `efaa333` (note above table). Behaviour byte-identical: partition/triage/plan/assemble/format map 1:1 onto the D3/D5 logic; decision-line and warn wording preserved verbatim (diff-pair check). Scans: zero hits both commits (sole `D2` domain term standing-exempt).

**Findings:** none.

**For orchestrator:** Flag A accepted — `failedCount` is error fidelity the behaviour contract *requires* (best-effort batch preserving partial success = D3 semantics; the warn *response* stays in the service; repo still throws per the pin). Flag B accepted — the interfaces-only pin targets effectful seams; `coveringModel` is deterministic geometry over hardcoded constants, not among the spec's three composed dependencies, and the stub-based grace gate needed no geometry stub — injecting it would be ceremony. Minor: implementer's report says "file 289 lines"; actual is 269 — report-only inaccuracy, no action.

## Orchestrator notes

- **D3 R1 intent-validation (2026-07-10):** F1 verdict upheld — project spec § At a glance settled "extend `staleAt` instead of re-fetching forecasts" for late runs; the bare-Date clock surface lost that bit. Scope amendment authorized without operator escalation: `src/services/model-clock.ts` is open for D3 R2 (same slice, same PR, spec-mandated behaviour — slice spec § Chosen design (2) and § Scope amended accordingly). F2 rides along. Items-for-user 3 (PN gotcha candidates) parked in `learnings.md` for close-out routing.
- **D5 R1 operator overrule (2026-07-10):** the operator rejected the R1 trim as insufficient ("more english than typescript in the services"). The R1 keep-decisions for long doc comments are overruled — the bar for R2 is much stricter: method/class doc comments compressed to ≤2 lines carrying only the non-derivable contract; file-header narration cut to references; prose that restates adjacent constants/types removed. D5 R2 dispatched with a hard comment budget.
- **D6 R1 operator verdict (2026-07-10):** the R1 reviewer round was canceled mid-dispatch; the operator rendered the verdict directly: ANOTHER ROUND NEEDED — "soup just moved to cached-forecast-source… 5 more classes to end up where we were." Orchestrator concurs on inspection: `CachedForecastSource.hourlyBlocks` is a 128-line method carrying the D3-era interleave. R2 requirement: functional-core/imperative-shell decomposition inside the existing seams — pure decision functions (partition / triage / plan-writes / assemble / format-log), shell method ≤ ~30 lines, NO new classes or files beyond the pure functions' module.

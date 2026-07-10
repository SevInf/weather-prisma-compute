# Brief: D5 R2 — aggressive comment trim (operator overrule)

## Task

The operator rejected R1 as insufficient: *"there is more english in there than typescript"* in the services. The R1 keep-decisions for long doc comments are **overruled**. Trim hard, with budgets:

- `src/services/model-clock.ts`: **≤ 15 comment lines total** (file currently ~48 of 156).
- `src/services/weather-service.ts`: **≤ 12 PR-added comment lines** (pre-existing main comments stay untouched, incl. the Tardif & Rasmussen fog citation and References block).
- `src/prisma/contract.prisma`: model-header ≤ 1 line; per-field comments ≤ 1 short line each, only where non-obvious (`staleAt`, `fetchedAt`); drop the rest.

Compression rules:

- File headers: one sentence + the three meta.json endpoint URLs (they are the BBOX/cadence source citation — keep, compressed). Kill all narrative paragraphs.
- Method/class doc comments: **≤ 2 lines each**, carrying only what is not derivable from the signature and code. `getForecasts`'s 11-line homily → ≤ 3 lines (freshness rule + degradation contract, telegraphic). `nextStaleAt`'s 8-line sermon → ≤ 2 lines (formula lives in code; keep only the grace/null caller contract).
- Constant/type comments: 1 line max. `MODEL_DOMAINS`' 7-line prose restates the literals below it — replace with 1 line (source + first-box-wins ordering). `GRACE_MS` → 1 line. `ModelStaleness` → ≤ 2 lines (the extend-don't-refetch contract is the one genuinely non-obvious bit — keep it, terse).
- Must survive (terse): the Date-decode trap on `CachedForecastRow`; `isFresh`'s same-UTC-day rationale; "one decision line per request cycle"; the `bbox: null` sentinel + unreachable-return guards (1 line each); the no-store rationale (1 line).
- Telegraphic style over prose. No "Service encapsulating…", no restating parameter names, no "Consumers ask…" storytelling.

## Scope

**In:** comment lines only in the three files above. **Out:** generated/hash-pinned files; code changes; pre-existing main comments.

## Completed when

- [ ] Budgets met (report the counted numbers: total comment lines in model-clock.ts; PR-added comment lines in weather-service.ts).
- [ ] `nix develop -c bun run build` passes; `contract emit` leaves artefacts byte-identical (halt otherwise).
- [ ] Diff is comment/blank-only.

## Operational metadata

- **Model tier:** mid. **Time-box:** 20 min.
- **Halt conditions:** as R1.

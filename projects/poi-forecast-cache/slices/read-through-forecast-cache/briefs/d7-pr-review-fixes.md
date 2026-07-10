# Brief: D7 pr-review-fixes

## Task

Address the operator's six GitHub review comments on PR #1, verbatim list with dispositions:

1. **`contract.prisma` — `model String // covering model slug…` → "Can't you use enum for that?"** Introduce a PSL enum (e.g. `enum IconModel { dwd_icon_d2 dwd_icon_eu dwd_icon }` — verify PN 0.14.0 PSL enum syntax/lowering via the contract skill and interpreter; if PSL enums are unsupported by the SQL interpreter, HALT and surface with evidence). Change `PoiForecast.model` to the enum type. Contract change ⇒ `contract emit`, extend the migration graph (new edge migration per the D4 flow — plan from current hash), apply to dev DB, `migration status` clean. Align the TS side (`IconModel` in `model-clock.ts`) with the emitted enum type if the lane surfaces one.
2. **`model-clock.ts` header — "Add docs on where Bounding boxes are coming from."** The D5 trim gutted the BBOX provenance. Restore an explicit provenance comment on `MODEL_DOMAINS`: values transcribed from each model's `meta.json` `crs_wkt` `BBOX[latMin, lonMin, latMax, lonMax]`, with the three endpoint URLs. Operator overrules the D5 budget on this point — clarity wins; keep it tight but complete.
3. **`model-clock.ts:27` — `{ model: "dwd_icon", bbox: null }` → "Do we need this if `coveringModel` returns this as a fallback?"** Remove the sentinel entry; `MODEL_DOMAINS` keeps only real boxes; `coveringModel` iterates boxes then returns `"dwd_icon"` as the explicit fallback (the unreachable-return comment dies with it). `ModelBbox | null` narrows to `ModelBbox`.
4. **`model-clock.ts:92` (`private async fetchStaleAt`) — "Use private names."** ES `#private` member names instead of TS `private` keyword. Apply consistently across ALL PR-added classes (`ModelClock`, `CachedForecastSource`, `WeatherService`, both repositories) — fields and methods (`#baseUrl`, `#fetchStaleAt`, `#cache`, `#readCache`, etc.).
5. **`cached-forecast-source.ts:123` (`partitionByFreshness(points, rows: ForecastCacheRow[] | null, …)`) — "don't accept `null`. In which case will it even be `null`?"** He's right: the shell already knows DB health; the pure function shouldn't model it. Signature takes `ForecastCacheRow[]`; shell passes `rows ?? []` (or restructures so the null never reaches the core). No behaviour change (empty partition ≡ null partition).
6. **`forecast-source.ts:2` (`ForecastPoint.id: number`) — "Use branded types for all ids."** Introduce a branded `PoiId` (e.g. `type PoiId = number & { readonly __brand: "PoiId" }` — match any existing branding convention in the codebase first; PN's codec types may offer one). Use it across the PR-added forecast path: `ForecastPoint.id`, the `Map` keys, cache repo row/write types, `CachedForecastSource` internals. Boundaries (route input from `db.orm` Poi rows, PN lane values) cast/construct explicitly via a single helper (e.g. `poiId(n)`). Route stays byte-untouched if possible; if the route must cast, that one-line change is authorized — report it.

## Scope

**In:** the six items — `src/prisma/contract.prisma` (+ emitted artefacts, new migration package, dev-DB apply), `src/services/**`, `src/repositories/**`; route only if item 6 strictly requires the cast (report). **Out:** any GitHub API interaction (no replies, no resolving threads — operator law); behaviour changes; anything beyond the six items.

## Completed when

- [ ] All six addressed (or HALTed with evidence where PN cannot express one — item 1 is the risk).
- [ ] `nix develop -c bun run build` passes; `migration status` clean; DB schema migrated via PN CLI only.
- [ ] Behaviour gates re-run: dev-server smoke (2 GETs), cold path, stub grace check — identical outcomes (log wording unchanged).
- [ ] Report: per-comment disposition table (what changed, where), the enum lowering details + migration package name, and the branded-type shape chosen.

## Operational metadata

- **Model tier:** mid. **Time-box:** 60 min.
- **Halt conditions:** PSL enum unsupported (evidence + fallback proposal); enum migration would be destructive to existing rows; branded type forces route/response shape changes beyond a cast; any behaviour delta.

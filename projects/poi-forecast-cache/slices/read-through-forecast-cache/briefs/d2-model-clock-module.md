# Brief: D2 model-clock-module

## Task

Create `src/services/model-clock.ts`: the module that (a) attributes a POI (lat, lng) to its covering DWD ICON model in seamless preference order — `dwd_icon_d2` (BBOX lat 43.18…58.08, lon −3.94…20.34) → `dwd_icon_eu` (BBOX lat 29.5…70.5, lon −23.5…62.5) → `dwd_icon` (global fallback) — and (b) computes each model's next-staleness instant from its Open-Meteo metadata endpoint `https://api.open-meteo.com/data/<model>/static/meta.json` (`last_run_availability_time + update_interval_seconds`, epoch seconds → Date), with a grace path: when the computed instant is already in the past (run is late), return `now + ~10 min` instead. Fetch metadata for at most the three models per call cycle (batch: callers pass all POIs / needed models at once); tolerate metadata fetch failure per model by signalling "unknown" (typed return, e.g. null) rather than throwing — callers treat unknown as "grace" per the slice spec's edge-case table.

## Scope

**In:** `src/services/model-clock.ts` (new file only).

**Out:** No edits to `src/services/weather-service.ts`, `src/app/**`, `src/prisma/**` — dispatch 3 wires consumers. No DB access from this module. No new dependencies.

## Completed when

- [ ] `src/services/model-clock.ts` exports (names your call, report them): a covering-model attribution function and a per-model staleAt resolver honouring grace + failure-tolerance as above; BBOX constants carry a comment citing the three meta.json endpoints as their source.
- [ ] `nix develop -c bun run build` passes.
- [ ] Attribution spot-check recorded in the dispatch report for three points: one inside D2 (e.g. Munich 48.14, 11.58 → dwd_icon_d2), one in EU-not-D2 (e.g. Lisbon 38.72, −9.14 → dwd_icon_eu), one outside both (e.g. New York 40.71, −74.01 → dwd_icon) — verified by actually invoking the function (e.g. `nix develop -c bun -e ...`), not by inspection.

## Standing instruction

Stay focused on the goal; control scope. Trivial-and-related fixes that obviously serve the goal go in the same dispatch with a one-line note. Anything that pulls you off the goal halts and surfaces.

## References

- Slice spec § Chosen design (2): `projects/poi-forecast-cache/slices/read-through-forecast-cache/spec.md`.
- Slice plan § Dispatch 2: `projects/poi-forecast-cache/slices/read-through-forecast-cache/plan.md`.
- Existing service style to match: `src/services/weather-service.ts` (class + shared instance pattern, typed wire formats, cache: "no-store" on fetches).

## Operational metadata

- **Model tier:** mid — self-contained module against a documented external contract.
- **Time-box:** 30 min. Overrun → halt and surface.
- **Halt conditions:** meta.json shape observed to differ from the documented fields; any need to touch out-of-scope files; any need for a new dependency.

# Brief: D1 cache-table-contract

## Task

Add the `PoiForecast` cache model to `src/prisma/contract.prisma` per the slice spec's chosen design, regenerate the emitted artefacts with `prisma-next contract emit`, and bring the dev database to the new schema via the standard Prisma Next flow. Fields: `poiId Int @id` with a relation to `Poi` (`onDelete: Cascade` — POIs are deletable via `DELETE /api/pois/[id]`), `model String` (covering-model slug), `hourly Json` (raw Open-Meteo hourly block), `fetchedAt DateTime`, `staleAt DateTime`. Exact PSL spelling may flex within what PN 0.14.0's SQL interpreter accepts; the shape (one row per POI, PK = poiId, cascade) may not.

## Scope

**In:** `src/prisma/contract.prisma`; regenerated `src/prisma/contract.json` + `src/prisma/contract.d.ts`; whatever the standard PN flow produces on disk (e.g. `migrations/**` if you use `migration plan`/`migrate`); applying the schema to the dev DB.

**Out:** All runtime code (`src/services/**`, `src/app/**`) — dispatches 2–3 own those. No hand-run SQL/DDL against the DB outside the PN CLI. No edits to `projects/**` (read-only context for you), no `.env` changes.

## Completed when

- [ ] `nix develop -c bun prisma-next contract emit` exits clean; `contract.json`/`contract.d.ts` regenerated and committed alongside the contract edit.
- [ ] The dev database schema contains the new table, arrived at exclusively via PN CLI commands (record which: `db update` vs `migration plan` + apply; note that `migration status` currently reports `MIGRATION.MARKER_NOT_IN_HISTORY` — the DB was initialized via direct push with no migrations directory; choose the flow that PN's own diagnostics recommend for this state and record the choice).
- [ ] `nix develop -c bun run build` passes.
- [ ] Dispatch report records the exact emitted field types of the `PoiForecast` lane (from `contract.d.ts`) for dispatch 3 to consume.

## Standing instruction

Stay focused on the goal; control scope. Trivial-and-related fixes that obviously serve the goal go in the same dispatch with a one-line note in your wrap-up message. Anything that pulls you off the goal — even if it looks useful — halts and surfaces.

## References

- Slice spec: `projects/poi-forecast-cache/slices/read-through-forecast-cache/spec.md` — chosen design §1 + open question 2 (Json fallback to String if the interpreter rejects Json; report if used).
- Slice plan entry: `projects/poi-forecast-cache/slices/read-through-forecast-cache/plan.md` § Dispatch 1.
- Project spec (background): `projects/poi-forecast-cache/spec.md` — non-goals: no unlogged tables, no out-of-band DDL.
- PN contract authoring guidance: `.agents/skills/prisma-next-contract/SKILL.md`; migrations: `.agents/skills/prisma-next-migrations/SKILL.md`.

## Operational metadata

- **Model tier:** mid — mechanical contract-and-CLI work with a documented fallback; no design judgment beyond the recorded degrees of freedom.
- **Time-box:** 30 min. Overrun → halt and surface, do not extend.
- **Halt conditions:** PN rejects both `Json` and the `String` fallback; the PN CLI wants destructive operations against existing `Poi` data; any step requires DDL outside the PN CLI; `DATABASE_URL` unreachable.

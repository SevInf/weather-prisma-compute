# Brief: D4 migration-package

## Task

Generate and commit a real Prisma Next migration package for this branch's contract change (create `poiForecast`), so non-dev environments get replayable history instead of relying on `db update`. Follow `.agents/skills/prisma-next-migrations/SKILL.md` for the authoring flow (`migration plan` / `migration new` — whatever the PN 0.14.0 CLI surface actually offers; discover via `nix develop -c bun prisma-next migration --help` and the skill). Critical state to reconcile: the dev DB **already matches the destination contract** (D1's `db update`; marker `6db32d…`), and `migrations/app/refs/db.json` pins the `db` ref at the current contract. The migration package must represent the main → branch transition (origin: `Poi` only — main's contract hash; destination: current contract). After generating, bring `prisma-next migration status` to a clean report using PN's prescribed reconciliation for an already-matching DB (e.g. sign/resolve/mark-applied — whatever the CLI offers); no manual DDL; the DB schema must not change (it is already at target).

## Scope

**In:** `migrations/**` (new migration package + any ref updates the PN flow writes); if the generated `migration.ts` contains placeholder sentinels, fill them per the skill (a pure CREATE TABLE migration should need no dataTransform).

**Out:** `src/**` (contract source unchanged — do NOT edit `contract.prisma` or emitted artefacts), `projects/**`, `.env`. No `db update` runs (schema is already at target). Nothing destructive: if the planner tries to include drops of anything (e.g. remnants of sibling-branch tables), halt and surface.

## Completed when

- [ ] A migration package exists under `migrations/` and is committed; its content is a create of `poiForecast` (plus whatever standard metadata PN writes) and nothing destructive.
- [ ] `nix develop -c bun prisma-next migration status` reports clean — no `MARKER_NOT_IN_HISTORY`, no pending-migration diagnostics — achieved via PN CLI reconciliation only, with the DB schema unchanged (verify: `db verify` or `db schema` shows the same tables before/after).
- [ ] `nix develop -c bun run build` passes.
- [ ] Report records: the exact commands used, the migration's origin/destination hashes (should be main's contract hash → current contract hash), and any deviation between the CLI's actual surface and the skill's description.

## Standing instruction

Stay focused on the goal; control scope. Anything that pulls you off the goal halts and surfaces.

## References

- Slice plan § Dispatch 4: `projects/poi-forecast-cache/slices/read-through-forecast-cache/plan.md`.
- PN migrations skill: `.agents/skills/prisma-next-migrations/SKILL.md`; migration review (refs/status semantics): `.agents/skills/prisma-next-migration-review/SKILL.md`.
- Your own D1 transcript: flow choice rationale + the refs commit (`f9188a7`).

## Operational metadata

- **Model tier:** mid.
- **Time-box:** 30 min. Overrun → halt and surface.
- **Halt conditions:** planner output contains any destructive op; status cannot be made clean without changing the DB schema or hand-editing state; CLI surface differs so much from the skill that the flow is ambiguous.

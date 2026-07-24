# Drive `project` context

> Read by `drive-create-project` and `drive-close-project` before they start. Capture project-specific facts the generic skills can't know. Update when a drive run surfaces something the next run should inherit.

**Skills served:** `drive-create-project`, `drive-close-project`

## Project tracking

- **No Linear.** This repo/project is not tracked in Linear (operator decision, 2026-07-10). Do **not** create Linear Projects, issues, or search for them; do not route back to `drive-start-workflow` over a missing Linear Project. Skip every Linear-sync step in drive-* skills and record `Linear: n/a` where a plan or spec template asks for an issue/project link.
- Projects live under `projects/<slug>/` at the repo root (spec.md, plan.md, trace.jsonl, slices/).

## Lanes & ownership

- Single-operator repo (sevinf). No lane map.

## Acceptance-criteria conventions

- None beyond the canonical skill defaults.

## Closing conventions

- No Linear tickets to close out; follow-ups are recorded as new `projects/` entries or spec open questions.

## Known constraints & gaps

- `drive/calibration/dod.md` does not exist; there is no team-DoD floor to inherit. Project specs state their complete DoD explicitly.
- **2026-07-24 — final retro, `poi-forecast-cache`:** Give every worktree its own development database, or coordinate before running schema reconciliation. Prisma Next's `db update` reconciles the database to the current contract and can remove sibling-worktree tables.

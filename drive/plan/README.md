# Drive `plan` context

> Read by `drive-plan-project`, `drive-plan-slice`, and `drive-build-workflow` before they start. Capture project-specific facts the generic skills can't know. Update when a drive run surfaces something the next run should inherit.

**Skills served:** `drive-plan-project`, `drive-plan-slice`, `drive-build-workflow`

## Plan shape

- Plans live at `projects/<slug>/plan.md`, filled from the canonical template.
- **No Linear.** This repo is not tracked in Linear (operator decision, 2026-07-10). Skip the Linear-sync step (`drive-plan-project` Step 5) entirely; write `Linear: n/a` in plan entries and the plan header. Missing Linear issues are **not** a planning gap in this repo.

## Test design

- No repo-specific conventions yet. The app currently has no test suite; validation leans on `bun run build` (which runs `prisma-next contract emit`) and manual QA.

## Parallelism & dependencies

- Single-operator repo; parallel groups are still welcome but there is no multi-agent lane convention yet.

## Known constraints & gaps

- Dev environment is nix-based: shell commands needing project tooling must run via `nix develop -c <cmd>` (plain `bun` is not on PATH).

## References

- `projects/poi-forecast-cache/plan.md` — first plan authored in this repo (once it lands).

# Brief: D5 comment-trim

## Task

Audit every comment **added by this PR** (diff `main...HEAD`) in the hand-authored files and trim per the operator's rubric. Remove comments that are:

1. Doc comments that just narrate implementation step-by-step.
2. References to transient artifacts, specs, or overruled decisions.
3. Restatements of how TypeScript or a third-party library works.
4. Line comments that just tell what the next line is doing.

**Keep only comments explaining genuinely non-obvious decisions** — domain rationale (why 4 °C cutoff, why same-UTC-day, why grace-extend instead of refetch, why the BBOX ordering, endpoint citations), invariants a maintainer would otherwise break, and non-obvious failure-mode contracts. When a long doc comment mixes narration with one non-obvious kernel, keep the kernel, cut the narration.

## Scope

**In:** comment lines only, in `src/prisma/contract.prisma`, `src/services/model-clock.ts`, `src/services/weather-service.ts`.

**Out:** ALL generated / hash-pinned files — `src/prisma/contract.json`, `src/prisma/contract.d.ts`, `migrations/**` (editing `migration.ts` would break its pinned migration hash). Pre-existing comments from main (e.g. the Tardif & Rasmussen fog rationale) — not this PR's additions; leave them. No code changes, no reordering, no renames.

## Completed when

- [ ] `git diff` for the dispatch commit touches only comment/blank lines in the three named files (no behavioural hunks).
- [ ] `nix develop -c bun run build` passes.
- [ ] Report lists each removed/rewritten comment with the rubric category (1–4) it fell under, and each kept-but-borderline comment with the one-line keep rationale.

## Standing instruction

Stay focused on the goal; control scope. When genuinely unsure whether a comment is a non-obvious decision, keep it and list it as borderline rather than cutting.

## Operational metadata

- **Model tier:** mid.
- **Time-box:** 20 min.
- **Halt conditions:** any edit that would change emitted artefacts (`contract.prisma` doc comments flowing into emit output — verify with `contract emit` and halt if artefacts change); any non-comment diff hunk needed.

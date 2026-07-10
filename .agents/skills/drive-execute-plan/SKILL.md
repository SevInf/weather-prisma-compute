---
name: drive-execute-plan
description: Use when the operator wants to execute a plan, implement a milestone, build from a plan file, or drive a project plan to done on the local branch.
metadata:
  version: "2026.6.11"
---

# Execute Plan

Implement a settled plan one task at a time — **implement → verify → check off → commit** — milestone by milestone until the plan is done. This is the **default** executor. For a multi-agent loop that delegates implementation and review to subagents, reach for `drive-orchestrate-plan` instead.

The plan (`projects/{project}/plans/plan.md`, or `{name}.plan.md`) is the source of truth. Follow its **intent**, not its literal file paths — adapt to the actual codebase.

## Pre-condition: the plan must be settled

An unresolved **open question** or **open flag** (⚠️ **OFn** marker) in the plan is a **hard block** on execution — building over an unsettled plan bakes in rework. Deferred items (tracked risks and dependencies parked in Open Questions) are _not_ blockers; monitor them during the run.

Scan the plan before executing. If unresolved questions or flags remain, stop and surface them:

_"The plan has [N] open question(s) and [M] open flag(s). Resolve them before executing (back to `drive-create-plan`), or override and execute anyway?"_

**Only the operator can lift this block — never your own judgment**, no matter how minor the items look. On override, carry each unresolved item forward and treat it as an assumption to confirm during the run.

If the plan file is missing or unspecified, ask which plan to execute before scanning.

## Scope

Acknowledge the request. Execute the milestone the operator named; if none, start at the first incomplete milestone (Status ☐ or ►). Work milestones in order — each is meant to be safe to ship before the next begins.

## Execution loop

For each task in the milestone, in sequence:

1. **Implement.** Make the change the task describes, adapting to the real codebase — the plan's paths and snippets are guidance, not literal patches. Stay within the task's scope.
2. **Verify.** Run build, lint, type-check, and tests; all must pass before moving on. Fix at the highest level that catches the issue — type system over lint over test assertion. Test through public APIs, not internals.
3. **Check off.** Tick the task `- [x]` and any acceptance criteria it satisfies. Set the milestone Status to ► when you start it, ✓ when every task and AC is done.
4. **Commit.** One self-contained commit per task. (If the whole run amounts to a single commit, leave it uncommitted for the operator to review instead.)

Repeat until the milestone's tasks and ACs are all checked, then move to the next milestone.

## Keep the plan current

- Flip milestone Status (☐ → ► → ✓) as you go; check off an AC only once verified.
- Log **only material changes** to a revision log at the bottom of the plan — milestones added or removed, scope shifts, decisions made — as append-only `YYYY-MM-DD: what changed and why` lines. Add the section if it's absent. Never rewrite or truncate it.
- Don't log routine task completion there; the checkboxes already record that.

## Decisions & escalation

- **Assume over ask.** Make a reasonable call from context and note it in the revision log. Reserve escalation for genuine forks.
- **Pause and escalate** when a decision reshapes another milestone, the code contradicts a stated requirement, or a task can't be completed within its scope. Surface it; don't paper over it.
- **Park out-of-scope improvements** in `projects/{project}/backlog.md` rather than expanding the task — one append-only line each (`what — why it's worth doing`). Create the file on first use.

## Close-out

The final milestone's close-out task ends the project: verify every AC, migrate long-lived docs into `docs/` (or `prisma/ignite` for cross-cutting standards) where that standard already exists, surface anything in `projects/{project}/backlog.md` worth keeping (e.g. as follow-up issues), then delete `projects/{project}/`. Often a final PR.

## Do

- **Intent over patch.** Implement what the task means against the real code; the plan's paths and snippets are guidance, not literal edits.
- **Green before moving on.** Build, lint, type-check, and tests pass after every task — never carry a broken tree into the next one.
- **One commit per task.** Self-contained, reviewable, traceable to the task it completes.
- **Keep the plan honest.** Status markers and AC checkboxes reflect reality at all times.
- **Assume over ask.** Document the assumption; escalate only genuine forks or cross-milestone impact.

## Don't

- **Don't execute an unsettled plan.** Open questions or open flags are a hard block; only an explicit operator override lifts it — never your own judgment.
- **Don't follow file paths blindly.** They're best guesses; if the codebase has moved or restructured, adapt to what's actually there.
- **Don't silently expand scope.** Park out-of-scope work; surface anything that reshapes another milestone before acting on it.
- **Don't leak planning artifacts into code.** FR / NFR / TC / OF labels are plan bookkeeping — keep them out of identifiers, comments, and commit messages.
- **Don't embed absolute paths** in code or commits.
- **Don't truncate the revision log.** It's append-only.

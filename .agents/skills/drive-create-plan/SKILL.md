---
name: drive-create-plan
description: Use when the operator wants to plan a project, break a spec into milestones, generate tasks from a spec, or create an execution plan.
metadata:
  version: "2026.6.11"
---

# Create Plan

Transform a settled spec into an execution plan: structure milestones, decompose tasks, and cover every acceptance criterion with a test. The plan (`projects/{project}/plans/...`) is the source of truth for execution.

## No estimates

Estimates are not part of this workflow. Don't add them to tasks, milestones, or the plan; don't ask for them; don't note that they're "missing" or that the plan "feels light" without them. Tasks show the **flow of work**, not effort. Engage with estimates only if the engineer explicitly asks.

## Pre-condition: the spec must be settled

A non-empty **Open Questions** section or any **unresolved open flag** (⚠️ **OFn** marker) in the spec is a **hard block** on planning — a plan built on an unsettled spec bakes in ambiguity that surfaces as rework mid-execution.

Before drafting, scan the spec for both. If either exists, stop and surface it:

_"The spec has [N] open question(s) and [M] unresolved open flag(s). These should be resolved before planning. Resolve them now (back to `drive-create-spec`), or override and plan anyway?"_

**Only the operator can lift this block — you cannot override it on your own judgment**, no matter how minor the items look. Wait for an explicit instruction (e.g. _"plan it anyway"_). On override, carry every unresolved open question and OF into the plan's **Open Questions** section and continue.

## File Naming

- **Project plan** (from `projects/{project}/spec.md`): `projects/{project}/plans/plan.md`
- **Task/feature plan** (from `projects/{project}/specs/{name}.spec.md`): `projects/{project}/plans/{name}.plan.md` — `{name}` matches the spec.

## Entry Points

- **Spec provided** — read it in full, apply the **Pre-condition** gate, then draft the plan from the **Plan Template** below.
- **Spec referenced in conversation** — use the spec from context, confirm its file path, apply the gate, then draft the plan from the **Plan Template** below.
- **No spec** — ask: _"I need a spec to plan from. Want me to help create one, or do you have a spec file?"_ Hand off to `drive-create-spec` if needed; once a spec exists, draft the plan from the **Plan Template** below.

### Open flags

The plan uses the spec's two-part open-flag convention (see **Open flags** in `drive-create-spec`). Each flag is an **inline marker** — `⚠️ **OFn** (<short description>)` where the decision bites (e.g. a milestone-boundary flag in Milestones) — paired with a matching **OFn** entry in **Open Questions** stating the assumed direction and what to confirm. Same number both ends; never write one half without the other. Use sparingly — for "I sequenced it this way, confirm" calls the context supports; for genuine ambiguity (nothing decided), use a plain open question. Clear all OF markers during Refinement before execution.

## Refinement

1. **Present gaps, assumptions, and open flags** as a numbered list:

   ```
   Drafted projects/my-proj/plans/feature-x.plan.md. To resolve:

   1. Spec mentions "admin approval flow" but not the states. Assumed pending → approved/rejected. More complex?
   2. M2 (UI integration) depends on design mocks. Available, or add a task to create them?
   3. OF1: sequenced the migration ahead of the backfill so reads stay safe — confirm this ordering.
   ```

2. **Process each answer.** Update the relevant section. When an answer resolves an open flag, remove **both** the inline `⚠️ OFn` marker and its **OFn** Open Questions entry. If an answer adds scope, surface it rather than silently expanding: _"That adds [X] to scope. Include it, or note as a follow-up?"_ Adjust milestones and tasks.

3. **Repeat** until every AC has mapped test cases, every test case has a task, no open flags remain, and any leftover ambiguity is safe to resolve during execution.

4. Confirm: _"The plan is ready. [N] milestones, [M] tasks, all acceptance criteria covered. Anything to adjust?"_ Then hand off to `drive-execute-plan` (or `drive-orchestrate-plan` for a multi-agent implement/review loop).

## Plan Template

Fill this in; remove the italic guidance as you go.

```markdown
# [Plan Name]

## Assumptions

_Planning assumptions beyond what is in the spec that the operator should verify before implementation_

**Spec:** _[relative path to spec file]_

## Milestones

_Each milestone includes a Status (☐ Not started, ► In progress, ✓ Complete), goal, requirements, changes, and acceptance criteria_

### Implement/Deploy/Release M1: [Name]

_Title is `<State> M<N>: <Name>`, where `<State>` is the exit criterion: `Implement` (code merged, not user-visible), `Deploy` (live in an environment, not user-visible), or `Release` (in users' hands). Drop `Implement`/`Deploy` milestones that aren't real work; small features may be a single `Release M1`._

_Outcomes_
Observable state available after this milestone (not activities).

## Shipping Strategy

_How the milestone stays backward-compatible and safe to deploy immediately. Name the implicit gate (nullable column, config value, dead code) separating old behaviour from new. No feature flags unless explicitly required._

**Tasks:**

- [ ] _Task (satisfies: TC-1, TC-2)_
- [ ] _Task (satisfies: TC-3)_

## Open Questions

_Three kinds of entries: plain open questions (genuine forks, nothing decided); **OFn** open-flag resolutions (one per inline `⚠️ OFn` marker, with the assumed direction and what to confirm); and deferred items (decisions pushed to execution, known risks, dependencies to monitor). Carry forward unresolved open questions and open flags from the spec (if the gate was overridden), plus anything surfaced while planning. Each entry says why it matters and your default so the reader can confirm or override. Clear the questions and open flags before execution; tracked risks and dependencies may remain as monitoring items._
```

## Do

- **Intent over mechanism.** Describe what a task changes and why, not how. "Add dark token overrides to `tokens.css`" — not "add a `[data-theme="dark"]` selector block with 47 properties." The implementer owns the mechanism.
- **Milestones survive drift.** File paths are current best guesses, not anchors. Each milestone and its tasks carry enough intent and context to stay actionable even if files are renamed, moved, or restructured by parallel work.
- **Account for every requirement.** Each FR and NFR from the spec appears in at least one milestone. A gap is a planning error.
- **Keep milestones independently verifiable.** At every milestone boundary the project builds, tests pass, and the system works.
- **Assume over ask.** Document assumptions rather than blocking on ambiguity. Reserve open questions and open flags for genuine decision points where multiple valid paths exist.
- **Research before committing to an approach.** When a milestone depends on something you haven't worked with recently, verify with a search rather than planning on stale assumptions.
- **Remove resolved markers.** When an open flag or open question is resolved, delete the marker entirely (both halves of an open flag) and capture the answer in the relevant section (Assumptions, Milestones, …) — don't leave a resolved marker in place.
- **Close out the final milestone.** Add a required close-out task that verifies all ACs (linking the tests/checks), migrates long-lived docs into `docs/` (or `prisma/ignite` for cross-cutting standards) where that standard exists, and deletes `projects/{project}/` — often a final PR.

## Don't

- **Don't plan over an unsettled spec.** Open questions or unresolved open flags are a hard block; only an explicit operator override lifts it — never your own judgment. Carry overridden items into the plan's Open Questions.
- **Don't re-ask what the spec answers.** Derive from the spec first; it's the input, the plan is the output.
- **Don't design tasks before tests.** Acceptance criteria → test cases → tasks is non-negotiable; leave no acceptance criterion without mapped test cases.
- **Don't create unverifiable milestones or vague tasks.** Every milestone must be independently validatable; "implement feature" and "set up infrastructure" aren't tasks — be specific.
- **Don't silently expand scope.** If a task doesn't trace back to the spec, surface it rather than absorbing it.
- **Don't plan only `Implement` milestones for shipping work.** An all-`Implement` plan is a smell unless the work is a genuinely internal-only refactor — rework the boundaries toward a `Release` exit or confirm nothing ships.
- **Don't add a `Deploy` milestone for calendar-only ceremony.** A release-train wait, scheduled publish, or cron is a task in the next `Release`, not a milestone.
- **Don't skip the `*Outcomes*` block.** "Work on the foo service" is not an outcome; "foo service responds 200 from staging" is.
- **Don't add estimates.** Don't add them or mention their absence (see **No estimates**).

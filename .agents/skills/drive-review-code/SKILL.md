---
name: drive-review-code
description: Use when the operator asks for a local PR/branch review, a code review, a system-design review, to "review this branch", or to produce written review docs.
metadata:
  version: "2026.6.25"
---

# Local PR Review

## Premise

A code review must be anchored to **expectations**. Those expectations come from:

- Explicit intent sources (PR description, linked tickets, design docs) when available, plus
- A canonical spec file (author-provided in-repo on the branch when available, otherwise a review `spec.md` you write) to make expectations explicit and reviewable.

You do not change implementation code. You only write review artifacts.

## Persona

> **Adopt the `tech-lead` persona** (see the `drive-agent-personas` skill) as the orchestrator for this workflow. The tech-lead lens drives scope establishment, expectation-source establishment, artefact-directory choice, and the synthesis pass. Internal workflow boundaries below transition to `architect` (system-design pass), `principal-engineer` (code-review pass), and `docs-steward` (documentation-audit pass); the orchestrator is reloaded for the walkthrough and synthesis. Each transition is its own explicit persona load — persona is not propagated.

## Outputs (always written to disk)

Every run must produce these artifacts **side-by-side** in a single artefact directory:

- `system-design-review.md` (architect pass — § 3)
- `code-review.md` (principal-engineer pass — § 4)
- `walkthrough.md` (tech-lead pass — § 6)

`docs-audit.md` (docs-steward pass — § 5) is written when the repository tracks a documentation surface; when it tracks none, the pass is skipped and no file is written (see § 5).

`spec.md` is only written when the branch does not already contain an in-repo canonical spec file. If a spec exists, do not duplicate it in the review outputs; reference it.

Output location rule:

- If a canonical spec **file exists in-repo on the current branch**, write review artifacts next to it (see § 2).
- Otherwise (including when the only spec is external/off-branch), write review artifacts under `wip/` (local-only scratch; never commit).

## 1) Establish the review scope (branch + base)

Defaults:

- Review the **current branch**.
- Base is the PR base branch when a GitHub PR exists; otherwise the repo default branch (typically `main`).

Explicit override rule:

- If the operator specifies a base/parent branch, honor it exactly for the review range.
- Do not substitute `origin/HEAD` or `origin/main` when an explicit base is provided.
- If the provided name is ambiguous, resolve to `origin/<base>` when possible and record the resolved range in artifacts.

Steps:

1. Determine current branch name.
2. Fetch latest refs from origin.
3. Resolve base branch:
   - If the operator provided a base/parent branch, use it exactly.
   - If the provided name is ambiguous, resolve to `origin/<base>` when possible and record the resolved range in artifacts.
   - Otherwise, if a PR exists for the current branch, use its `baseRefName`.
   - Otherwise use the repo default branch (from `origin/HEAD`, typically `main`).
4. Establish the review range:
   - Topic branch: `origin/<base>...HEAD`
   - If already on default branch: infer best-effort scope from git history and clearly state uncertainty in the reports.

Evidence to capture (used by every pass):

- `git log --oneline origin/<base>..HEAD`
- `git diff --name-only origin/<base>...HEAD`
- `git diff origin/<base>...HEAD`

PR discovery hints:

- `gh pr view --json number,url,title,body,baseRefName,headRefName`
- Fallback: `gh pr list --head <branch> --state all --json number,url,title,body,baseRefName,headRefName --limit 1`

## 2) Establish expectations (use canonical spec or infer one)

### 2.1) Choose an artifact directory (prefer next to an existing in-repo spec)

First, locate a canonical spec **file in-repo on the current branch** (preferred inputs first).

Important:

- A "canonical spec" in this step means a spec **file** that exists in this repo on this branch.
- If the operator / PR links an external spec (URL, other repo, or a file not present on this branch), treat it as an expectation source (§ 2.2), but it does **not** control artifact placement.

Preferred inputs:

1. If the operator provided an **in-repo** spec file path (repo-relative or workspace-absolute) and it exists on this branch, treat it as canonical.
2. Else, if the GitHub PR body links to or mentions an **in-repo** spec file path that exists on this branch, treat it as canonical.
3. Else, search the branch for spec-like docs and pick the best match:
   - Prefer: `specs/**/spec.md`, `projects/**/spec.md`
   - Also consider: `**/spec.md`, `**/requirements.md`, `**/design.md` (especially if added/changed in the diff)

Then choose where artifacts go:

- If an in-repo canonical spec exists:
  - Let `SPEC_DIR` be the folder containing the spec file.
  - If PR number is available: write to `SPEC_DIR/reviews/pr-<PR_NUMBER>/`
  - Else: write to `SPEC_DIR/reviews/`
- Otherwise (no in-repo canonical spec):
  - If PR number is available: write to `wip/review-code/pr-<PR_NUMBER>/`
  - Else: write to `wip/review-code/branch-<BRANCH_NAME>/`

### 2.2) Gather expectation sources (inputs to your expectations model)

Prefer explicit intent sources over inference from the diff:

1. Canonical spec file (if present from § 2.1)
2. External / off-branch spec (if provided by the operator or linked in the PR body)
3. GitHub PR title / body
4. Linear ticket linked in the PR body (preferred), otherwise inferable from branch name (e.g. `ABC-123`), otherwise absent
5. New / changed documentation on the branch that clarifies intent / constraints (ADRs, READMEs, `docs/**`)
6. The diff itself (last resort for intent)

If the branch includes additional spec-like docs beyond the canonical spec file, treat them as supporting intent sources, for example:

- `**/requirements.md`, `**/design.md`
- Relevant ADRs under `docs/architecture docs/adrs/`

### 2.3) Ensure a review spec exists (required)

If an in-repo canonical spec exists (from § 2.1), **use it** as the review spec input and do **not** write a new one.

If the author has not provided an in-repo canonical spec, infer one and write a review `spec.md` into the artifact directory (even if an external/off-branch spec exists; treat it as a primary source and link it).

If the spec is inferred, it must begin with a highly visible notice stating:

- that it was constructed by you (in the orchestrator role), and
- the sources it was inferred from (PR/Linear/docs/diff), with links/paths.

If you are writing an inferred review `spec.md`, it must:

- State whether expectations are **explicit** (linked docs) vs **inferred** (from PR/Linear/diff)
- List **sources** (PR/Linear/docs) with links/paths
- Include:
  - Intent
  - Functional requirements
  - Non-goals / out of scope
  - Constraints / invariants / compatibility
  - Acceptance criteria
  - Risks (migration / perf / security / rollout)
- If a requirement is ambiguous, record it as an explicit assumption or open question.

Linear enrichment:

- If a Linear ticket link exists and you can fetch it, use it to refine requirements / non-goals / acceptance criteria.

## 3) System-design pass → `system-design-review.md`

> **Transition: adopt the `architect` persona** (see the `drive-agent-personas` skill). The architect lens is the source of truth for this pass — system shape, ubiquitous language, bounded contexts, dependency direction, typology integrity, conceptual integrity, conceptual minimality, plus the discriminator-completeness / consumer-vs-essence / concept-vs-mechanism / symmetry / reads-cold probes.

The architect lens is _load-bearing_ for this pass. A system-design review that does not apply the architect's typology probes to introduced names, prefixes, namespaces, or layer placements is missing what makes this pass different from a generic review. When you encounter a qualifier-style prefix (`Authored*`, `Extension*`, `Internal*`, `Base*`, etc.) in the diff, fire the discriminator-completeness probe before signing off — see the persona's `## Probes` section for the full set.

Write `system-design-review.md` into the artefact directory.

### Minimum coverage

- **What problem is being solved; what new guarantees / invariants are introduced.** Frame in the system-shape sense: what concept is being added, removed, or reshaped at the type / module / namespace level.
- **Subsystem fit** (contracts, plans, runtime, adapters/plugins, capability gating). Whether the new shape lives in the right bounded context with the right dependency direction. Layer purity. Whether existing concepts already cover the new concern under different names.
- **Boundary correctness.** Domain / layer / plane imports. Whether a type that lives in the framework layer actually belongs there or is target-specific. Whether the _meaning_ of an import direction is right, not just whether it compiles.
- **Naming and typology integrity.** Apply the architect persona's probes (discriminator-completeness / consumer-vs-essence / concept-vs-mechanism / symmetry / reads-cold) to every introduced name, prefix, namespace, or grouping. Surface typology holes; propose the prefix-free alternative; check whether the same type already exists under another name.
- **ADRs.** If the branch adds or changes ADRs under `docs/architecture docs/adrs/`, treat them as design-intent sources and explicitly review their reasoning and trade-offs through the architect lens (vocabulary fit; conceptual integrity; speculative-extensibility tax).
- **Test strategy adequacy at the architectural level.** What architectural property must be proven, and where. Test naming and structure as evidence of the system's conceptual partitioning.

### Quality bar

- Names the load-bearing typology / naming / boundary decisions the diff introduces, in plain language a reader can re-evaluate.
- Surfaces every qualifier-prefix, consumer-encoding name, and mechanism-named-as-concept the architect persona's probes catch.
- Explicitly distinguishes architect-class concerns (in scope) from buildability / scope / learnability concerns (out of scope; routed to other passes or other personas).
- Reads cleanly as a stand-alone artefact: a reviewer with no other context can re-evaluate the architect-pass conclusions from this file alone.

### Out of scope (route elsewhere)

- **Implementation correctness, failure modes, blast radius, operability, cost.** → § 4 (principal-engineer pass).
- **Documentation currency — whether tracked docs still match the changed code.** → § 5 (docs-steward pass).
- **Adopter learnability, fresh-reader friction, glossary stability.** Devrel lens; out of scope for this skill — surface as a referral.
- **Scope, user value, evidence for the problem.** PM lens; out of scope.
- **Public-surface stewardship, license / provenance, contribution friction.** OSS-specialist lens; out of scope.
- **Composing reviewer outputs, packaging the synthesis for the operator.** → § 6 (tech-lead walkthrough) and § 7 (synthesis).

## 4) Code-review pass → `code-review.md`

> **Transition: adopt the `principal-engineer` persona** (see the `drive-agent-personas` skill). The principal-engineer lens is the source of truth for this pass — failure modes first, operability and blast radius, cost-and-complexity earn their keep, constraints vs assumptions, programming practice, evidence-grounded critique, plus the failure-mode / blast-radius / cheapest-alternative / operability / constraint-vs-assumption / already-solved-here probes.

The principal-engineer lens is _load-bearing_ for this pass. A code review that does not pressure-test failure modes, blast radius, and operability is missing what makes this pass different from a generic style review. Acceptance-criteria verification (see below) is the load-bearing intent-fidelity check; it is not optional, and the bar for "verify" is strict (read the test assertions, not just map files to ACs).

Before writing, read repo conventions: at minimum `AGENTS.md` plus any relevant `.cursor/rules/**` and package `README.md` touched by the diff.

Write `code-review.md` into the artefact directory.

### Required sections

- **Summary** (1–2 sentences).
- **What looks solid** (positive notes; can appear near the top — the persona's "acknowledge what's good when it matters" principle).
- **Findings** (flat list — everything to address in this PR).
- **Deferred (out of scope)** (issues explicitly not addressed because they expand scope beyond what this PR delivers; must state _why_ each is out of scope).
- **Already addressed** (table of findings from prior review rounds that have been fixed; include commit hash when available).
- **Acceptance-criteria verification** (per § Acceptance-criteria verification below).

### Categorisation heuristic

Do **not** use blocking / non-blocking / nits tiers. Agents do implementation — perceived effort is not a useful signal for whether something should be fixed. The only legitimate reason to defer a finding is **scope**: fixing it would pull in work that belongs to a different PR or milestone. If a finding is in scope, it goes in **Findings** and gets addressed. If fixing it would expand scope, it goes in **Deferred** with a clear reason.

Prioritise findings by impact: security > correctness > performance > maintainability > style.

### Finding format

Findings get unique, unambiguous IDs (single global sequence across the file; preferred format `F<NN>` — `F01`, `F02`, …). Each finding includes:

- **Location:** repo-relative path + line range as plain text (not inside a `path:line` markdown link). In Cursor (env vars `CURSOR_AGENT`, `CURSOR_TRACE_ID`, or `CURSOR_CLI` set, or the operator says output is for Cursor): use a path-only markdown link `[path](path)` with the range after as plain text (e.g. `— lines 12–34`). Outside Cursor, you may use `[path (L12–L34)](path:12-34)` if links resolve for the reader.
- **Issue:** concise description of the problem and why it matters.
- **Suggestion:** concrete fix or improvement.
- **Code example** (when helpful).

### Review boundaries

Do not:

- Review formatting-only changes (defer to formatters / linters).
- Nitpick personal preferences that do not affect readability or maintainability.
- Suggest large rewrites when the current approach is acceptable.
- Flag issues in unchanged code unless directly impacted by the change.
- Use absolute filesystem paths in the review.

### Acceptance-criteria verification (required)

If the spec contains acceptance criteria, the code review **must verify each one** against the actual implementation. This is the most important part of the review — it answers "did we build what we said we'd build?"

**What "verify" means.** Pointing to a file is not verification. For each AC:

1. Read the AC literally — what observable behaviour or property does it require?
2. Find the implementation code that is supposed to satisfy it. Read the code — does it do what the AC says?
3. Find the test(s) that prove it. Read the test assertions — do they actually assert the AC's requirement, or do they assert something weaker?
4. Assign a verdict: **PASS** / **FAIL** / **NOT VERIFIED** / **WEAK**.

Verdict definitions:

- **PASS:** the implementation satisfies the AC, and a test exists that asserts the specific behaviour.
- **FAIL:** the implementation does not satisfy the AC. State what is missing or wrong.
- **NOT VERIFIED:** no test or manual evidence exists. State what verification is missing.
- **WEAK:** a test exists but its assertions don't actually prove the AC. State what the test asserts vs what the AC requires.

Common traps to avoid:

- **Mapping, not verifying:** listing a file path next to an AC is not verification.
- **Trusting test names:** a test named "selects TypeScript provider" that only asserts `typeof source === 'function'` does not verify provider selection.
- **Confusing structural with behavioural equivalence:** checking two config objects have the same `.family` reference is not the same as checking they produce identical emit output.
- **Assuming E2E coverage exists:** if an AC requires end-to-end behaviour, check whether an E2E test actually exists.

When ACs describe end-to-end behaviour and no integration / E2E tests exist, flag this explicitly in the verification table, file as a finding (not deferred — missing AC evidence is in scope), and recommend the specific tests that would close the gap.

Output format:

```markdown
| AC                     | Verdict                                           | Detail                                               |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| AC1: <short statement> | **PASS** / **FAIL** / **NOT VERIFIED** / **WEAK** | <what you checked, what you found, why this verdict> |

### Summary

| Result       | Count | ACs           |
| ------------ | ----- | ------------- |
| PASS         | N     | AC2, AC3, ... |
| FAIL         | N     | AC1, ...      |
| NOT VERIFIED | N     | AC4, ...      |
| WEAK         | N     | AC8, ...      |
```

### Quality bar

- Reads as a principal-engineer-lens review: failure modes / operability / blast radius / cost are surfaced as load-bearing concerns; "should work" / "edge case" / "we can monitor it later" trigger probe responses, not nods.
- Verifies every spec AC against actual code and test assertions; no mapping-without-verification.
- Distinguishes principal-engineer-class concerns (in scope) from architect / scope / learnability concerns (out of scope).
- Stands alone: a reader with no other context can re-evaluate the buildability conclusions and the AC verification from this file alone.

### Out of scope (route elsewhere)

- **Naming, typology, system shape, ubiquitous language, bounded contexts.** → § 3 (architect pass).
- **Documentation currency — whether tracked docs still match the changed code.** → § 5 (docs-steward pass).
- **Adopter learnability of docs and surface.** Devrel lens; out of scope.
- **Scope, user value, evidence for the problem.** PM lens; out of scope.
- **Public-surface stewardship, license / provenance, contribution friction.** OSS-specialist lens; out of scope.
- **Composing reviewer outputs, packaging the synthesis for the operator.** → § 6 / § 7.

## 5) Documentation-audit pass → `docs-audit.md`

> **Transition: adopt the `docs-steward` persona** (see the `drive-agent-personas` skill). The docs-steward lens is the source of truth for this pass — documentation currency against the diff: whether the repository's **tracked** docs still tell the truth about the code after this branch's changes, and whether every behavior / interface contract change is reflected where a reader would look. Apply the persona's drift / coverage / half-update / tracked-only / value-spread probes.

The docs-steward lens is _load-bearing_ for this pass. The earlier passes treat documentation only as an intent source (§ 2.2); none of them asks whether the change just made a doc lie. Reconciling the committed docs against the diff is what this pass adds, and the bar for "verify" is strict (read the doc text against the code, not just map a change to a file).

### When this pass runs

Run this pass only when the repository **tracks** a documentation surface. A tracked documentation surface includes, non-exhaustively: `docs/**`, `README*`, ADRs, `CHANGELOG*`, other tracked `**/*.md` (excluding the review artefacts themselves), inline API documentation (JSDoc / TSDoc / rustdoc / godoc / docstrings) in changed files, and interface specs the project publishes or consumes (OpenAPI, JSON Schema, `.proto`).

**Tracked only — load-bearing.** Audit only files the repository tracks. Enumerate the documentation surface from the repo's tracked files (e.g. `git ls-files`), not from the working tree. Untracked or ignored local files — personal notes, scratch docs, anything never committed — are out of scope: do not read them as authority, and do not flag them, however stale they look. A reviewer's local scratch is not the repository's documentation.

If the repository tracks no documentation surface, skip this pass: write no `docs-audit.md`, and record the skip in synthesis (§ 7).

### Method — two directions

1. **Change → docs (drift and coverage).** Enumerate the behavior and interface contract changes in the diff: public signatures, configuration / flags / environment, CLI surface, wire and serialization formats, defaults, error and exit codes, observable behavior, schema and migrations. For each, find the tracked doc(s) that should reflect it and read them against the code.
2. **Touched docs → code (half-update).** For every tracked doc changed in the diff, confirm each statement still matches the code it describes. A doc updated for one contract change but not another in the same area is still wrong.

### What "verify" means

Pointing at a doc is not verification. For each contract change:

1. State the old shape a doc could assert and the new shape the code now has.
2. Find the tracked doc(s) that name the old shape, and read the text.
3. Assign a verdict: **CURRENT** / **STALE** / **MISSING** / **N/A**.

Verdict definitions:

- **CURRENT:** a tracked doc covers the contract and already reflects the new shape.
- **STALE:** a tracked doc asserts the old shape and now contradicts the code. State what the doc says vs what the code does.
- **MISSING:** the change creates or alters a contract a reader would look up, and no tracked doc covers it. State where the doc should live.
- **N/A:** the change is internal and carries no documented contract.

Common traps to avoid:

- **Mapping, not verifying:** listing a doc path next to a change is not verification — read whether the prose matches the code.
- **Stopping at one occurrence:** a changed value often appears in several docs; a value updated in one place and stale in another still misleads (fire the value-spread probe).
- **Auditing the working tree:** a stale-looking file the repo does not track is out of scope, not a finding.

### Finding format

Findings get unique IDs (single sequence, `D<NN>` — `D01`, `D02`, …). Each finding includes the doc **Location** (repo-relative path + line range, using the same plain-text / Cursor-link convention as § 4's finding format), the **Issue** (what the doc says vs what the code now does), and the **Suggestion** (the edit that makes the doc current, or the doc to add).

### Output format

```markdown
| Contract change                 | Doc(s)                      | Verdict                                         | Detail                                               |
| ------------------------------- | --------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| <short statement of the change> | <tracked doc path(s), or —> | **CURRENT** / **STALE** / **MISSING** / **N/A** | <what you checked, what you found, why this verdict> |

### Summary

| Result  | Count | Changes |
| ------- | ----- | ------- |
| CURRENT | N     | ...     |
| STALE   | N     | ...     |
| MISSING | N     | ...     |
| N/A     | N     | ...     |
```

### Quality bar

- Reads as a docs-steward-lens audit: every behavior / interface contract change in the diff is reconciled against the tracked docs, with a currency verdict and a doc location, not a vague "docs may need updating".
- Scoped to tracked documentation; untracked local files never appear as findings.
- Distinguishes docs-currency concerns (in scope) from learnability, code-correctness, and typology concerns (out of scope; routed elsewhere).
- Stands alone: a reader with no other context can re-evaluate each verdict from this file plus the diff.

### Out of scope (route elsewhere)

- **Whether the prose teaches well — clarity, fresh-reader friction, glossary stability.** Devrel lens; out of scope — surface as a referral.
- **Implementation / test correctness.** → § 4 (principal-engineer pass).
- **Naming, typology, system shape.** → § 3 (architect pass).
- **Scope and product framing — whether a thing should be documented at all.** PM lens; out of scope.
- **Composing reviewer outputs, packaging the synthesis for the operator.** → § 6 (walkthrough) / § 7 (synthesis).

## 6) Walkthrough pass → `walkthrough.md`

> **Transition: reload the `tech-lead` persona** (see the `drive-agent-personas` skill). The tech-lead lens drives orchestration, surface-conflicts-don't-merge-them, right-altitude-for-audience, keep-the-operator-in-the-loop, make-orchestration-legible, plus the persona-conflict / altitude / operator-in-the-loop probes.

The tech-lead lens is _load-bearing_ for this pass because the walkthrough's audience is an _operator touring a multi-thousand-LOC PR_. The right altitude balances: enough detail that the reader can follow the substantive moves, not so much detail that the change-set's narrative is lost in token-level diffs. Architect-class concerns (typology / naming), principal-engineer-class concerns (failure modes / blast radius), and docs-steward-class concerns (stale or missing docs) surfaced by § 3 / § 4 / § 5 get _referenced_ at the altitude the operator needs — not re-adjudicated.

### Mechanic — delegate to `drive-pr-walkthrough`

The mechanical structure of the walkthrough (output template, intent-extraction, behaviour-changes-as-evidence, linking conventions, quality checklist) is owned by the `drive-pr-walkthrough` skill at `.agents/skills/drive-pr-walkthrough/SKILL.md`. Use that skill's `/walkthrough` workflow to produce the file.

When invoking that workflow, **override its output path** so the file lands at `<artefact-directory>/walkthrough.md` rather than the default location.

The tech-lead lens is layered on top of that workflow: as you produce the walkthrough, apply the persona's altitude probe (_"what does THIS reader need to decide, and what altitude of detail enables that decision?"_) at every section to calibrate detail.

### Audience — load-bearing

The walkthrough's audience is a **human operator touring a multi-thousand-LOC PR**. They are reviewing the change set, possibly preparing to merge, possibly preparing to give substantive feedback, possibly preparing to land a follow-up. They are _not_ re-doing the architect's typology audit, the principal engineer's failure-mode pressure-test, or the docs steward's currency audit — those are evidence files (`system-design-review.md`, `code-review.md`, `docs-audit.md`) the walkthrough may reference but does not duplicate.

Concrete altitude guidance:

- **Behaviour changes get plain-English explanations**, with _what changed_ and _why it changed_ surfaced at the conceptual level. The reader should be able to articulate the change to a third party after reading.
- **Implementation touchpoints get linked, not narrated.** Link to the file + line range; let the reader open the file when they want the line-level view.
- **Tests are evidence**, not narrative. Link the tests that prove the behaviour; do not write a parallel test-narrative.
- **Cross-pollination from § 3 / § 4 / § 5** is _referenced_ at the right altitude. The walkthrough may say "the architect pass surfaces a typology concern with `Authored*` (see `system-design-review.md` for the full reasoning)" or "the docs-audit found the configuration reference stale against the new default (see `docs-audit.md`)" — it does not re-adjudicate.
- **Substantive conflicts surfaced by § 3 / § 4 / § 5** stay surfaced (the persona's _surface-conflicts-don't-merge-them_ rule applies). If two passes land on different verdicts about a single area of the change, the walkthrough names that disagreement and points the operator at both files for the substantive evaluation.

### Quality bar

- Reads as a _narrative_, not a file-by-file changelog or a process recap.
- Uses the right altitude throughout: enough substance for the reader to evaluate, no more.
- References § 3 / § 4 / § 5 where their conclusions are load-bearing for the operator's evaluation; does not duplicate their content.
- Surfaces any cross-lens conflicts as decisions for the operator, not as resolved positions.
- Stands as the _primary review surface_ for a single round — a reader who reads only this file (and clicks through links) gets a coherent view of what changed and why.

## 7) Synthesis

After the pass artefacts exist (still under the `tech-lead` persona):

- Verify the pass artefacts exist side-by-side in the artefact directory. The docs-audit artefact is present only when the repository tracks a documentation surface; if the docs-audit pass was skipped, note the skip rather than treating the missing file as an error.
- Surface to the operator any cross-lens conflicts the passes raised — the architect pass's verdict on a typology question and the principal-engineer pass's verdict on its operability implications can land in different places. **Do not adjudicate**; surface the conflict at the right altitude (per the tech-lead's _persona-conflict probe_) and point the operator at both substantive artefacts.
- Output a short pointer to the artefact directory in chat (per `drive-pr-walkthrough`'s convention: short confirmation, not the full content).

## Future-extensibility

As further personas are admitted (security, QA, etc.), additional passes slot in at the appropriate position — a security pass (security persona) before § 4 when threat-modelling matters; a test-coverage pass (QA persona) after § 4 when the QA frame is load-bearing; etc. Add a new numbered section with its own explicit persona-load instruction, mirroring the pattern of the existing per-persona passes. The orchestrator persona stays `tech-lead`; synthesis stays last.

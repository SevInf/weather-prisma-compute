---
name: drive-pr-walkthrough
description: Use when the operator asks for a walkthrough, narrative of changes, semantic diff, intent of commits, or "what changed and why" during branch/PR review.
metadata:
  version: "2026.2.24"
---

# Walkthrough

## What this skill produces

A **semantic narrative** of a change set: what the author was trying to achieve, what meaningfully changed in system behavior, and why.

**Default output is written to disk as a Markdown file.** In chat, only print a short pointer to that file.

**Do not paste the full walkthrough into chat unless the operator explicitly asks** (e.g. “paste it here”, “inline it”, “show it in the response”).

It must link to:

- **Implementation**: where the behavior changed
- **Tests**: where that behavior is specified/verified (tests are evidence for the same intent, not a separate “thread”)

Avoid:

- File-by-file changelogs
- Process narration (“tests first, then implementation”)
- Treating tests as their own purpose

# Instructions

## Default scope (PR-style)

If the operator doesn’t specify scope, treat the walkthrough as **everything in the current branch vs its base**:

- Prefer `origin/main...HEAD`
- Fallback to `main...HEAD`

Also collect the commit list for context:

- `git log --oneline <base>..HEAD`

## Output location (write to disk)

Unless the operator specifies an output path, write the walkthrough to a file on disk using these defaults:

- **PR number available (recommended)**: `docs/reviews/pr-<PR_NUMBER>/walkthrough.md`
  - Create the directory if missing.
- **Spec folder provided by operator**: `<spec-folder>/walkthrough.md`
- **No spec + no PR number**: `wip/walkthrough.md` (local scratch; never commit)

After writing the file, respond in chat with a short confirmation like:

```
Walkthrough written.

✅ `docs/reviews/pr-157/walkthrough.md`
```

If the operator asked for both:

- a file on disk, and
- an inline copy,

then do both (file first), but keep the chat output to the minimum the operator asked for.

## Prefer explicit intent sources (when available)

If the walkthrough is for a PR/branch review, prefer **explicit intent** over inference from code:

- **PR title/body** (goal, constraints, non-goals, rollout notes)
- **Linked Linear ticket** (goals/non-goals, acceptance criteria, follow-ups)
- **Merge commit message** (often contains PR number/link or ticket ID)
- **Branch name** (often embeds a ticket ID, e.g. `tml-1837-...` or `ABC-1234-...`)

Use these to fill sections like **Intent**, **Non-goals**, **Compatibility/risk**, and **Follow-ups**. If intent sources aren’t available, keep those sections concise and label them as inferred (or omit them if you can’t support them).

Practical defaults when a PR exists:

- `gh pr view --json title,body,url`
- If the PR body links Linear, use that content as the source of truth for goals/non-goals when present.

If you’re walking through a historical merge commit:

- Look for `Merge pull request #1234` or `(#1234)` in the merge commit message, then:
  - `gh pr view 1234 --json title,body,url`

## Workflow

1. **Acquire context**
   - Read the commit list (`git log --oneline <base>..HEAD`).
   - Read the diff stats (`git diff --stat <base>...HEAD`) to understand breadth.
   - Read the full diff (`git diff <base>...HEAD`) to understand meaning.

2. **Extract intent and threads**
   - Default to **one overarching intent** (common for PRs).
   - If there are multiple independent efforts, split into **2–4 threads** max.
   - Name each thread with a behavior-level label (not “refactor tests”).

3. **Derive behavior changes (semantic units)**
   - Express each change as “**Before → After**” in terms of observable behavior, API, guarantees, error semantics, or invariants.
   - Separate **behavior changes** from **refactors**. Refactors can be described as “no behavior change” and still linked.

4. **Map each behavior change to evidence**
   - For every behavior change, gather:
     - 1–5 key **implementation touchpoints**
     - 1+ **tests** that describe/lock the behavior in
   - If tests are missing, explicitly call it out as a gap (or explain why tests are not applicable).

5. **Write the walkthrough using the template below**
   - Prefer short, concrete claims.
   - Mention mechanics only when they help explain the semantics.
   - Write it to the output location above; do not paste the full content into chat unless asked.

## Linking conventions (editor-friendly)

Use this format consistently when writing markdown links to local files:

- **Path resolution**:
  - Paths starting with `/` resolve from the current workspace root.
  - Paths starting with `./` or with no prefix resolve from the current file location.
- **Default preference**: Prefer absolute workspace-root paths that begin with `/`. Use relative paths only when a consumer explicitly requires them.
- **Line anchors**: Encode line ranges as `#L<start>-<end>` (example: `types.ts#L123-234`).

Examples:

- Preferred: `[types.ts lines](/path/to/types.ts#L123-234)`
- Relative from current file: `[types.ts lines](./types.ts#L123-234)`

For the most important 1–3 snippets total, also include a small excerpt with precise line ranges (so the reader can immediately see the pivot of the change without hunting).

## Output template (use this structure)

````markdown
## Before / After (intention in code)

```ts
// BEFORE — smallest snippet that captures the old shape
```

```ts
// AFTER — smallest snippet that captures the new shape
```

## Sources (optional but recommended when available)

- PR: <link or `#1234`>
- Linear: <ticket link or ticket id>
- Commit range: `<base>...HEAD` (or explicit commit list)

## Intent

<1–3 sentences: what we’re trying to make true, and why it matters>

## Change map

- **Implementation**:
  - [path/to/primary-file.ts (L12-L34)](/path/to/primary-file.ts#L12-34)
  - ...
- **Tests (evidence)**:
  - [path/to/test-file.test.ts (L12-L34)](/path/to/test-file.test.ts#L12-34)
  - ...

## The story

1. <Step 1: conceptual move; name the new guarantee/behavior>
2. <Step 2: follow-on change; why it was necessary>
3. ...

## Behavior changes & evidence

- **Behavior change A**: <Before → After statement>
  - **Why**: <rationale / constraint / trade-off>
  - **Implementation**:
    - [path/to/file.ts (L12-L34)](/path/to/file.ts#L12-34)
  - **Tests**:
    - [path/to/test.test.ts (L12-L34)](/path/to/test.test.ts#L12-34)

- **Behavior change B**: ...

## Compatibility / migration / risk

- <breaking changes, rollout notes, backfills, toggles, perf implications, etc. If none, say “None noted.”>

## Follow-ups / open questions

- <anything intentionally deferred, cleanup left behind, or questions for reviewers. If none, omit.>

## Non-goals / intentionally out of scope

- <1–3 bullets, if applicable>
````

## Quality checklist (self-review before sending)

- [ ] The walkthrough reads like **intent and behavior**, not a file list.
- [ ] Each behavior change has **tests linked** (or an explicit “no tests” rationale).
- [ ] Tests are presented as **evidence for behavior**, not as a separate storyline.
- [ ] The narrative has a small number of semantic steps (not commit-by-commit retelling).
- [ ] Refactors are explicitly labeled as “no behavior change” where appropriate.
- [ ] Any compatibility/migration risk is called out (or explicitly noted as absent).
- [ ] Follow-ups / open questions are captured when they meaningfully affect review or rollout.
- [ ] The walkthrough is **written to disk**, and chat output is only a pointer (unless the operator asked to inline it).

## Examples

Mini-example (shape only):

````markdown
## Before / After (intention in code)

```ts
// BEFORE
```

```ts
// AFTER
```

## Intent

Tighten driver initialization so runtime instantiation is explicit and testable.

## Behavior changes & evidence

- **Driver construction is deferred until runtime creation**: eager side effects → explicit instantiation
  - **Implementation**:
    - [packages/foo/src/runtime.ts (L10-L42)](/packages/foo/src/runtime.ts#L10-42)
  - **Tests**:
    - [packages/foo/test/runtime.test.ts (L15-L60)](/packages/foo/test/runtime.test.ts#L15-60)
````

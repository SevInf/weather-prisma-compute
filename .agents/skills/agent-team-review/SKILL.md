---
name: agent-team-review
description: Use when the operator wants a thorough multi-perspective code review with CI validation, or asks for an agent-team review. Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.
metadata:
  author: Prisma
  version: "2026.3.4"
---

# Agent Team Code Review

Parallel multi-agent code review using Claude Code Agent Teams. Spawns focused reviewer agents that collaborate to produce a unified assessment.

## Pre-conditions

This skill requires Agent Teams. If the setting is not enabled, prompt the operator to add it:

```json
// In ~/.claude/settings.json or .claude/settings.json (project level)
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Check before proceeding:** Verify the setting exists in either location. If missing, show the operator the snippet above and stop until they confirm it's added.

### teammateMode must be `in-process`

Check the active `teammateMode` in `~/.claude/settings.json`, `~/.claude.json`, and `.claude/settings.json`. The value in `~/.claude.json` may override `~/.claude/settings.json` — the precedence is unclear, so check all three. If any of them set `teammateMode` to `auto` or `tmux`, warn the operator that there is a known bug that can cause agents to never start: https://github.com/anthropics/claude-code/issues/23513

Prompt the operator to set `teammateMode` to `in-process` in all locations where it appears, and stop until they confirm.

## Invocation

```
/agent-team-review                          # auto-detect scope from git
/agent-team-review services/ppg-conductor   # review specific directory
/agent-team-review --base develop           # diff against a different base branch
```

## Flow

### 1. Check Prerequisites

Verify `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set. If not, show the operator how to enable it and stop.

### 2. Detect Scope

Run `git diff main...HEAD --stat` (or the operator-specified base branch) to identify changed files. Group changes by top-level service or repo directory.

If no changes are detected, inform the operator and stop.

### 3. Discover Specialist Skills

Scan for skills that match the changed repos, languages, or stacks:

- **Project skills** (`.claude/skills/`): e.g., `/extension` for Rust/pgrx, `/cloudflare` for TypeScript Workers
- **User skills** (`~/.claude/skills/`): e.g., `rust-pro`, language-specific reviewers
- **Plugin skills**: e.g., `beagle-go:go-code-review`, `beagle-go:review-go`

Match by:

- Skill descriptions mentioning the changed repo name
- Language/framework keywords matching file extensions in the diff (`.rs` → Rust skills, `.ts` → TypeScript skills, `.go` → Go skills)

Present discovered specialists to the operator:

> Found relevant specialist skills for this review:
>
> - `extension` — Rust/pgrx Postgres extension conventions
> - `rust-pro` — Rust 1.75+ patterns and best practices
>
> Include specialist reviewers? [Yes / No / Select specific ones]

### 4. Present Review Plan

Show the operator the planned team composition before spawning:

> **Review plan for `feat/my-feature`** (3 changed directories)
>
> | Reviewer        | Template           | Scope                    |
> | --------------- | ------------------ | ------------------------ |
> | correctness     | correctness.md     | All changed files        |
> | spec-compliance | spec-compliance.md | All changed files + docs |
> | api-conventions | conventions.md     | services/api/            |
> | web-conventions | conventions.md     | services/web/            |
> | contracts       | contracts.md       | Cross-service boundaries |
> | rust-specialist | rust-pro skill     | services/api/ (if Rust)  |
>
> Proceed? [Yes / Adjust]

Wait for user approval before spawning.

### 5. Spawn Team

Use `TeamCreate` to create the review team. Spawn each reviewer as a teammate using the `Agent` tool with `team_name` set. **Always use `subagent_type: "general-purpose"`** — do not use custom agent types (e.g., plugin-provided agents) as they may set `model: inherit` which fails to resolve for teammates.

Each reviewer receives:

- Their template (from `templates/`)
- The git diff scoped to their directory (or full diff for cross-cutting reviewers)
- The repo's `AGENTS.md` if it exists (for conventions reviewers)
- CI commands from `AGENTS.md` to execute (conventions reviewers must run them)
- For specialist reviewers: invoke the relevant skill to load its context

**Important:** Reviewers are teammates, not isolated agents. They can use `SendMessage` to communicate with each other.

### 6. Parallel Review Round

All reviewers work simultaneously. Each produces findings in the structured output format defined in their template.

When a reviewer discovers something outside their focus area, they should `SendMessage` the relevant reviewer rather than reporting it themselves. Examples:

- Correctness reviewer finds a convention violation → message the conventions reviewer
- Conventions reviewer spots a contract mismatch → message the contracts reviewer

### 7. Cross-Review Summary

After all reviewers report, the lead:

1. Collects all findings
2. Shares a summary with all reviewers via `broadcast`
3. Asks reviewers to amend, withdraw, or escalate findings based on what others found

This refinement round catches:

- Duplicate findings across reviewers
- Findings that are invalid given another reviewer's context
- Issues that become more severe when combined with other findings

### 8. Present Unified Verdict

Compile the final assessment:

```markdown
## Agent Team Code Review — [branch name]

### Overall Verdict: Ready to merge / With fixes / Not ready

### Summary

[2-3 sentence overview of the review]

### CI Results

- format:check: PASS/FAIL
- lint:check: PASS/FAIL
- test: PASS/FAIL

### Critical Issues

[Must fix before merge]

### Important Issues

[Should fix, but not blocking]

### Minor Issues

[Nice to have]

### Spec Compliance

[Requirements checklist with status]

### Strengths

[Positive observations across reviewers]
```

### 9. Save Review (Optional)

After presenting the unified verdict, ask the operator if they'd like the review saved to a markdown file. Suggest a default path of `docs/reviews/<branch-name>.md` (creating the directory if needed), but let the operator choose a different location. If they decline, proceed to cleanup.

### 10. Cleanup

Shut down all reviewer teammates via `SendMessage` with `type: "shutdown_request"`. Then `TeamDelete` to clean up.

## Team Composition Rules

**Single directory changed:**

- correctness reviewer (correctness.md)
- conventions reviewer (conventions.md) — runs CI
- spec-compliance reviewer (spec-compliance.md)
- specialist reviewer(s) if available

**Multiple directories changed:**

- correctness reviewer (correctness.md) — full diff
- spec-compliance reviewer (spec-compliance.md) — full diff + docs
- one conventions reviewer per changed directory (conventions.md) — runs CI for that repo
- contracts reviewer (contracts.md) — cross-service boundaries
- specialist reviewer(s) if available

## Output Format (Per Reviewer)

Each reviewer must produce findings in this format:

```markdown
## [Reviewer Name] — [Focus Area]

### Verdict: Ready to merge / With fixes / Not ready

### CI Results (conventions reviewers only)

- command: PASS/FAIL (include output on failure)

### Issues

#### Critical

- `file:line` — Description. **Why it matters:** explanation.

#### Important

- `file:line` — Description. **Why it matters:** explanation.

#### Minor

- `file:line` — Description.

### Strengths

- Specific positive observations with file references.

### Notes for Other Reviewers

- [Any cross-cutting concerns flagged to specific reviewers]
```

## Reviewer Rules

1. **Be specific.** Always reference `file:line`. Never give vague feedback.
2. **Categorize by severity.** Critical = must fix. Important = should fix. Minor = nice to have.
3. **Explain WHY.** Every issue needs a reason, not just "this is wrong."
4. **Acknowledge strengths.** Good code deserves recognition.
5. **Stay in your lane.** Flag cross-cutting concerns to the relevant reviewer via SendMessage.
6. **Run CI.** Conventions reviewers must execute CI commands and report results. Static analysis alone is not sufficient.
7. **Read AGENTS.md.** Conventions reviewers must read the repo's AGENTS.md before reviewing.
8. **Give a clear verdict.** "Ready to merge", "With fixes" (list what), or "Not ready" (explain why).

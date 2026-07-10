---
name: ignite-create-skill
description: Use when the operator says "ignite-create-skill", asks to write a new agent skill, create a skill, author a skill, update an existing skill's SKILL.md, or requests help with skill structure and conventions.
metadata:
  author: Prisma
  version: "2026.6.24"
---

# Skill Author

Write or update agent skill packages. This skill is opinionated — if project conventions conflict with these recommendations, flag the conflict and ask the operator to decide.

Each skill occupies `.agents/skills/{name}/` with a `SKILL.md`.

## The Iron Law

No skill ships without watching a subagent run the target task twice: once without the skill, once with it. Applies to new skills and every edit, down to one-line changes and skills that look too small to bother.

Why it matters:

- Agents consume skills; assume no person reads one before acting on it.
- A skill that passes structural validation but never changed a subagent's behavior is decoration.
- No behavior change between the two runs means the skill is unproven.

No exceptions:

- Not for "it is only a small reference skill."
- Not for "the edit is trivial."
- Not for "it is obviously clear."
- Clear-to-you is not the measure. The agent's behavior is the measure.

Mechanics: step 8.

## Pre-conditions — halt if unmet

1. **Existing skill directory.** For new skills, verify `.agents/skills/{name}/` does not exist. For updates, verify it exists and contains `SKILL.md`.
2. **Name conflicts.** If the requested name already exists and the intent is creation (not update), halt and ask: did you mean to update the existing skill?

## Workflow

### 1. Determine skill name

Derive from the operator's request. If ambiguous, ask with a recommendation. Name must be lowercase kebab-case, max 64 chars, no leading/trailing/consecutive hyphens.

### 2. Scaffold directory

```
.agents/skills/{name}/
├── SKILL.md          # Required
├── scripts/          # Optional: executable helpers
├── references/       # Optional: on-demand docs
└── assets/           # Optional: templates, examples
```

Create only the directories that will contain files.

### 3. Write frontmatter

Every `SKILL.md` starts with a YAML frontmatter block:

| Field              | Required | Rules                                                                                                                  |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `name`             | Yes      | Matches directory name exactly. Lowercase alphanumeric and hyphens only.                                               |
| `description`      | Yes      | **Trigger phrases only** using "Use when…" syntax. No capability summaries — that belongs in the body. Max 1024 chars. |
| `metadata.author`  | No       | Set to the skill author's name. Omit if non-attributed.                                                                |
| `metadata.version` | No       | Current date in `YYYY.M.D` format. Update when the skill directory changes.                                            |
| `license`          | No       | Short license name or reference to bundled file.                                                                       |
| `compatibility`    | No       | Environment requirements. Omit unless the skill has specific needs.                                                    |
| `allowed-tools`    | No       | Too agent-specific; omit.                                                                                              |

> If the operator questions the "Use when…" restriction, explain: the `description` is the only field injected at startup for routing; capability summaries cause misactivation (firing in wrong contexts or being skipped when relevant). Format `metadata.version` as `YYYY.M.D` unless project conventions specify otherwise.

**Correct description:**

```yaml
description: Use when the operator says "project-spec", asks for a specification from an outcome-focused prompt, or requests a spec.
```

**Incorrect description (no capability prose):**

```yaml
description: Generates a project specification from outcome-focused prompts. Use when the operator says "project-spec".
```

### 4. Write the body

After the frontmatter, write instructions for agent consumption. Follow these principles:

- **Imperatives.** "Capture the answer" not "the answer is captured."
- **Headings, lists, tables.** Agents reason about section semantics, not prose.
- **Reference skills by name sparingly.** Do not assume other skills are installed. Use a skill name reference only in pre-conditions (routing to a prerequisite) or as a next-action recommendation.
  - Exception: repo-local skills may reference other repo-local skills by name.
- **Never reference tool names.** Describe the objective or intent, not the tool. Skills must be agent and LLM-agnostic — any harness should produce the same outcome from the same instructions.
- **Bias toward agency.** Assume reasonable defaults from context. Ask only when multiple valid paths exist and context is genuinely insufficient. When asking, include a recommended answer with rationale.
- **Define inline markers with non-overlapping semantics** when the skill produces artifacts requiring operator review. Examples:
  - `RF1`, `RF2` — review flags blocking downstream workflows
  - `Q1`, `Q2` — open questions needing answers
  - `F1`, `F2` — review feedback items
  - Number sequentially within each type per document.
- **Ephemeral content rule.** If the skill defines ephemeral labeled items (markers, open questions, pending items), the skill body must include an instruction to remove them from the skill's final output artifacts. The markers surface unresolved state during execution; the skill's output should not carry them forward.

### 5. Structure for progressive disclosure

Layer the skill's content by load time:

1. **Metadata** (~100 tokens) — frontmatter, visible at startup for routing.
2. **Body** (< 5000 tokens, under 500 lines) — loaded on activation.
3. **Resources** — `references/`, `assets/`, `scripts/` — loaded on demand.

Split detailed reference material into separate files.

### 6. Add pre-conditions

If the skill requires prior state (e.g., a spec must exist before planning), define a `## Pre-conditions` section. List conditions that halt activation when unmet. Route the operator to the prerequisite skill by `name` when a condition fails.

### 7. Validate structure

Before finishing, run the structural checks:

- `name` matches the directory name.
- Frontmatter `description` contains only "Use when…" trigger phrases — no capability summaries.
- `metadata.version` reflects the current date if this is a new or modified skill.
- Relative paths reference existing files.
- No absolute paths.
- No hardcoded tool names.
- No hardcoded skill names except pre-conditions, next actions, and repo-local references.
- Check manually against the validation list above.
- Behavioral validation (step 8) is complete. Structural checks alone do not show the skill changes behavior.

### 8. Validate behavior

Step 7 proves the skill is well-formed, not that it does anything. Mandatory for every new skill and every edit, regardless of size. See [The Iron Law](#the-iron-law).

Dispatch a fresh subagent with no memory of authoring the skill, and run the loop:

1. **Baseline.** Hand the subagent a realistic task the skill governs. For a discipline or judgment skill, add pressure toward the wrong choice (deadline, sunk cost, an authority overriding the rule) and force a concrete decision. Record the failures: skipped steps, bad retrievals, rationalizations verbatim.
2. **Address.** Revise the body to counter the failures observed. Add nothing for failures that did not occur.
3. **Confirm.** Re-run the same task with the skill available. The subagent should reach the right outcome and act on the relevant section.
4. **Close loopholes.** New failure (fresh rationalization, misreading, uncovered case)? Counter it explicitly and re-run. Repeat until a clean pass.

Baseline failure by skill type:

| Skill type            | Baseline failure                                                   |
| --------------------- | ------------------------------------------------------------------ |
| Discipline / judgment | Agent skips the rule under pressure or argues its way around it    |
| Technique / how-to    | Agent misapplies the steps or stalls on a gap in the instructions  |
| Reference             | Agent retrieves the wrong item, misses a case, or applies it wrong |

For discipline skills, fold the counters into the body so they ship with the skill:

- a table pairing each excuse with the reality that defeats it
- an explicit negation per rationalization (e.g. "do not keep the old code as reference")

Counter the exact wording the subagent used. Generic counters do not hold under pressure.

Same behavior with and without the skill is not a pass. The skill is unfinished, however clean its structure.

## Constraints

- **Paths.**
  - **Repo-local skill** — reference files within the same repository using repo-relative paths.
  - **Published/portable skill** — reference files relative to the skill root directory. Never reference anything outside `.agents/skills/{name}/`, as only that directory is available at install time.
  - **Absolute paths** — never allowed.
- Scripts in `scripts/` must be self-contained or document their dependencies. Include helpful error messages and handle edge cases.

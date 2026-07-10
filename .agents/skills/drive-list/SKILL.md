---
name: drive-list
description: Use when the operator wants to see what skills are available, what order to use them, or needs orientation on the Drive workflow.
metadata:
  version: "2026.3.04"
---

# List Drive Skills

Print the available Drive skills in the order they are typically used during a project lifecycle.

## When to use

- The operator asks what skills are available
- The operator wants to know the recommended order of operations
- The operator needs a quick reference for which skill to reach for next

## Workflow

1. Read the `SKILL.md` for each skill listed below, in order.
2. From each skill's `description` field (YAML frontmatter), write a single-sentence summary.
3. Present the list grouped by lifecycle stage, numbered sequentially.

### Plan

1. **drive-create-project** (optional)
2. **drive-create-spec**
3. **drive-create-plan**

### Execute

4. **drive-post-update**

### Review

5. **drive-code-review**
6. **drive-pr-walkthrough**

### Ship

7. **drive-create-deployment-plan**

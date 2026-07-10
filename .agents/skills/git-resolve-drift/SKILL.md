---
name: git-resolve-drift
description: Use when resolving complex git merge conflicts caused by "squash merge drift" (where a branch was based on a now-squashed feature branch), or when handling simple rebase conflicts.
metadata:
  author: Prisma
  version: "2026.2.3"
---

# Git Squash Drift Resolver

## Purpose

This skill resolves the "Squash Drift" problem. This occurs when:

1. `Feature-B` was branched off `Feature-A`.
2. `Feature-A` was squash-merged into `main`.
3. `Feature-B` now has conflicts with `main` because it contains the _unsquashed_ commits of `Feature-A`.

## Routine

Follow these steps strictly to resolve the situation.

### Phase 1: Diagnosis

1. Run `git log --oneline --graph --decorate -n 20` to visualize the current branch history.
2. Ask the operator: "What is the name of the 'parent' branch that was recently squash-merged?" (Refer to this as `<old-parent>`).
3. Identify the **Split Point**. This is the last commit hash shared by the current branch and `<old-parent>` _before_ they diverged.
   - Use `git merge-base HEAD <old-parent>` to find this hash.

### Phase 2: Execution (The Transplant)

Use `git rebase --onto` to transplant the _new_ work from the current branch onto `main`, leaving the old "ghost" commits behind.

Run the following command:

```bash
git rebase --onto main <old-parent> HEAD
```

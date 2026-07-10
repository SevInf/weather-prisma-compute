---
name: ignite-update-agentsmd
description: Use whenever authoring, creating, editing, augmenting, refining, trimming, or decomposing an AGENTS.md or CLAUDE.md file, including before writing any change to one, when a code change calls for updating documentation, standards, or agent instructions, or when the operator invokes ignite-update-agentsmd. Apply the authoring rules before the file is written.
metadata:
  version: "2026.6.24"
---

# Author and maintain AGENTS.md

The rules for what good AGENTS.md content looks like. They apply to every edit of an AGENTS.md file: adding a single entry, rewriting a section, or refactoring guidance across the hierarchy. Hold this bar whenever you touch an AGENTS.md.

AGENTS.md files form a hierarchy: a root file for repository-wide rules, nested files for folder-scoped rules. Editing or refactoring moves content between these files, so a change often touches more than one. A good AGENTS.md is lean, descriptive, and unambiguous: concrete imperative instructions, nothing an agent already knows, and each rule placed in the part of the hierarchy it governs.

## Authoring rules

### Do

1. Write imperative instructions: "Run `pnpm lint` before committing", not "linting should be run".
2. Document the concrete commands: build, test, lint, format, and how to run a single test.
3. Document code-style and testing conventions that are specific to this repository.
4. Capture non-obvious constraints and gotchas. This is the highest-signal content in the file.
5. Keep a curated entry-point pointer list instead of a tree: a handful of stable, load-bearing paths, for example "HTTP handlers: `src/api/`; auth: `src/auth/middleware.ts`; migrations: `migrations/`".
6. Place folder-scoped guidance in that folder's nested `AGENTS.md`, not the root.
7. Keep each file lean. Returns diminish past roughly 150 lines, and oversized files raise inference cost without improving agent performance. Trim noise, not load-bearing rules: when agents author most of the code, keep must-follow rules in context (rule 9) even at some length rather than trimming them into linked docs they may skip.
8. Survey the documentation tree first, then point explanatory content at its existing home instead of inlining it.
9. Inject must-follow rules; don't just link them. A rule an agent must obey goes inline or in an injected include (`@import`), not behind a bare link it may never follow. Reserve links for rationale a human reads.

### Don't

1. Don't include generic engineering advice the model already applies.
2. Don't write narrative, history, or rationale.
3. Don't maintain a full or rendered directory tree: it drifts on the first refactor and does not speed file discovery during delivery work.
4. Don't restate what the codebase already shows.
5. Don't over-use emphasis markers; reserve them for the few load-bearing rules.
6. Don't keep guidance in the root file when it belongs to a single existing subfolder.

## Polyglot repositories

When a monorepo is organised by kind, not language (languages interleaved under `apps/*` and `packages/*`), scope is the **language**, not the folder. Then:

- Keep the **root language-agnostic**: a repo map plus a routing table sending each unit to its language's rules. No language-specific rule lives in the root.
- Put each language's conventions in one **per-language doc** (for example `docs/<lang>.md`).
- Give each unit a nested `AGENTS.md` that **injects** its language doc (rule 9) and adds only unit-specific rules.

A new language is then a new doc plus per-unit injects, with no churn to the other languages' rules.

## Adding to an existing AGENTS.md

For a simple augmentation (a new rule, command, or pointer), apply the authoring rules above to the new entry and place it in the correct file in the hierarchy. No broader workflow is needed.

## Cleaning up or refactoring an AGENTS.md

For a full review, trim, or decomposition of an existing AGENTS.md, follow the procedure in [references/workflow.md](references/workflow.md). It runs a signal pass against the detection rules in [references/heuristics.md](references/heuristics.md), applies rewrites in place, proposes relocations across the hierarchy, and reconciles the `CLAUDE.md` symlink.

## CLAUDE.md

Operate on `AGENTS.md` unless the operator explicitly names `CLAUDE.md`. `CLAUDE.md` is normally a symlink to `AGENTS.md`, so editing `AGENTS.md` edits both.

The symlink is **load-bearing**: some agents discover only `CLAUDE.md` when walking the tree, so a nested `AGENTS.md` with no sibling `CLAUDE.md` symlink never loads. Every `AGENTS.md`, root and nested, needs the symlink. The cleanup workflow reconciles it across the no-file, real-file, and already-symlinked cases; the verification step confirms it loads.

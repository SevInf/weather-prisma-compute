---
name: project-docs
description: Audit, generate, and maintain standardized project documentation. Use when asked to document a project, audit docs, create Architecture/Development/Operations docs, decompose a monolithic AGENTS.md, or improve documentation consistency. Also use when the operator says /project-docs.
---

# project-docs

Audit, generate, and maintain project documentation following a
behavior-first standard. Based on the ppg-backup-scheduler documentation
conventions.

## Modes

This skill has three modes. If invoked without a mode argument, ask
which mode the user wants.

- `/project-docs audit` — analyze existing docs, report gaps
- `/project-docs generate` — create or update docs to fill gaps
- `/project-docs update` — detect stale docs and refresh them

---

## Mode: Audit

Analyze the repository's documentation state and produce a gap report.

### Steps

1. **Scan existing docs.** Use Glob to find all `.md` files in the repo
   root, `docs/`, and any `AGENTS.md` files. Record what exists.

2. **Measure AGENTS.md size.** Read each AGENTS.md and count lines. If
   any exceeds 300 lines, flag for decomposition.

3. **Run heuristic detection.** Read `heuristics.md` (in this skill
   directory) for the full signal table. Use Grep to scan for each
   signal. Record which standard docs are suggested.

4. **Detect domain-specific clusters.** Use Glob to find directories
   with 5+ source files sharing a prefix. Use Grep to find source files
   over 300 lines covering distinct domain concepts. Suggest custom
   topic docs for significant clusters.

5. **Check existing docs for compliance.** For each existing doc in
   `docs/`, check:
   - Has an `## Intent` section? (required)
   - Has a `## Related docs` section? (required)
   - Uses behavior-first language (not code-heavy)?
     Flag non-compliant docs for update.

6. **Present the gap report.** Format as a table:

   ```
   ## Documentation Audit Report

   ### Existing docs
   | File | Compliant? | Issues |
   |------|-----------|--------|

   ### Recommended new docs
   | Doc | Trigger | Priority |
   |-----|---------|----------|

   ### AGENTS.md status
   | File | Lines | Action |
   |------|-------|--------|

   ### Dynamic topic suggestions
   | Topic | Evidence | Action |
   |-------|----------|--------|
   ```

   Ask: "Want to proceed with `/project-docs generate` to fill these
   gaps?"

---

## Mode: Generate

Create or update documentation to match the standard. Runs audit first
if no prior audit results exist in the conversation.

### Steps

1. **Present the proposed doc set.** Based on audit results, list:
   - Standard docs to create (pre-selected by heuristics)
   - Dynamic topics detected (opt-in)
   - AGENTS.md decomposition plan (if applicable)
   - Existing docs flagged for structural update

   Ask user to confirm, add, or remove items.

2. **Add documentation guide to root `AGENTS.md`.** Read the template at
   `templates/docs-guide.md`. Replace `{service}` with the repo/service
   name. Append the content to the existing root `AGENTS.md` under a
   `## Documentation Guide` heading. If no root `AGENTS.md` exists,
   create one. This keeps all agent-discoverable guidance in the root
   file — no separate `docs/AGENTS.md`.

3. **For each approved standard doc:**
   a. Read the corresponding template from `templates/`.
   b. Explore relevant source code using Glob, Grep, and Read. Focus on
   understanding behavior, not copying code.
   c. Fill in the template sections:
   - **Intent**: one sentence — when and why to read this doc
   - **Body sections**: behavior-first, bullet points, short paragraphs.
     Use Mermaid diagrams for architecture or flow.
   - **Related docs**: cross-links to other docs in `docs/`
     d. Write the doc using PascalCase filenames to match cross-links:
     `docs/Architecture.md`, `docs/Development.md`,
     `docs/Operations.md`, `docs/Deployment.md`,
     `docs/Observability.md`, `docs/API.md`,
     `docs/Authentication.md`, `docs/Conventions.md`.

4. **For dynamic topic docs:** Same process as step 3, but use a blank
   template (just Intent + body + Related docs). Name the file to match
   the topic.

5. **For AGENTS.md decomposition** (when flagged):
   a. Read the current AGENTS.md fully.
   b. Identify sections that map to topic docs (see the decomposition
   table in the spec: Architecture, Development, Operations,
   Observability).
   c. Extract content to the appropriate topic docs (created in step 3).
   d. Slim AGENTS.md to essentials:
   - Safety rules
   - Tech stack patterns
   - Quick reference (commands, common tasks)
   - "Detailed docs" section with links to `docs/*.md`
     e. Target: 100-200 lines after decomposition.

6. **For existing non-compliant docs:** Read the doc, add missing
   `## Intent` and `## Related docs` sections. Preserve all existing
   content. Adjust structure minimally.

7. **Commit all docs.** Stage all new/modified files. Commit with
   message: `docs: standardize documentation with project-docs skill`.

---

## Mode: Update

Detect stale documentation and refresh it.

### Steps

1. **Run audit** to get current state.

2. **Detect staleness** for each existing doc:
   - Use Grep to check if doc references files/functions that no longer
     exist in the codebase (search for backtick-quoted names).
   - Use Glob to find source files added since the doc was last modified
     that should be covered but aren't mentioned.
   - Check if AGENTS.md has grown back past the 300-line threshold.

3. **Present findings.** For each stale doc, show:
   - What's stale (removed references, missing coverage)
   - Suggested action (update section, add section, re-decompose)

4. **Apply approved updates.** Edit docs to fix staleness. Preserve
   existing content where it's still accurate.

5. **Commit.** Message: `docs: refresh documentation via project-docs update`.

---

## Content Principles (reference for all modes)

When writing or updating docs, follow these rules:

- **Intent first**: every doc opens with when/why to read it.
- **Behavior over code**: describe what the system does, not what the
  code looks like. Avoid function names unless they anchor a concept.
- **Explicit boundaries**: note what the system does NOT do.
- **Failure modes**: call out error paths where operationally relevant.
- **Cross-link, don't repeat**: if another doc covers a topic, link to
  it instead of restating.
- **Mermaid diagrams**: use for architecture, data flow, or complex
  sequences. Keep them simple (< 15 nodes).
- **Voice**: concise, direct, task-focused. Bullet points over prose.
  Short paragraphs.

## AGENTS.md Decomposition Reference

When decomposing a monolithic AGENTS.md:

| Section pattern                                                    | Moves to                |
| ------------------------------------------------------------------ | ----------------------- |
| Architecture diagram, system overview, component details           | `docs/Architecture.md`  |
| Design patterns, domain glossary                                   | `docs/Architecture.md`  |
| Development setup, build/test commands                             | `docs/Development.md`   |
| Gotchas, service-specific notes, edge cases                        | `docs/Operations.md`    |
| Debugging queries, log patterns, metrics                           | `docs/Observability.md` |
| API endpoints, RPC reference                                       | `docs/API.md`           |
| Coding patterns, error handling, logging conventions, naming rules | `docs/Conventions.md`   |

**Stays in AGENTS.md:** safety rules, tech stack patterns (error
handling, libraries), quick reference commands, doc index links.

---
name: ignite-create-docs
description: Use when the operator wants to add docs, document something in Ignite, capture knowledge under `docs/`, or write a new page for a team.
metadata:
  version: "2026.6.29"
---

# Create Ignite Docs

Add documentation to the Ignite site from provided input. Input may be files, folders, URLs, or pasted content. Follow the steps in order.

## Step 1: Gather input

Check whether the operator provided content to document. Valid inputs:

- One or more file paths
- A folder path
- One or more URLs
- Text pasted into the conversation

If a file or folder path was given, read its contents. If URLs were given, fetch them. If text was pasted, use it as-is.

If no input was provided, ask: _"What content do you want to add? Provide file paths, folder paths, URLs, or paste the content directly."_

Do not proceed until you have content to work with.

## Step 2: Determine the team

Check whether the operator specified a team name.

- If not, list the top-level folders inside `docs/` and ask the operator to pick one.
- If the operator gave a team name, verify that `docs/<team>/` exists. If it doesn't match, show the valid options and ask again.

Do not proceed until a valid team is confirmed.

## Step 3: Understand the content

Read and analyse the input content thoroughly. Determine:

1. **Subject matter:** what topic, system, or concept does the content cover?
2. **Content type:** does it describe architecture/technology, standards/conventions, domain knowledge, a product decision, or something else?
3. **Scope:** is this a single page, multiple pages, or an update to existing content?
4. **Key concepts:** extract the main ideas, decisions, and details.

Summarise your understanding back to the operator in 2-3 sentences and confirm before proceeding.

## Step 4: Survey existing documentation

Read the team's doc structure to find the right placement:

1. Read `docs/<team>/index.md` to understand the top-level sections.
2. For each section that could plausibly contain the new content, read its `index.md` to understand what's already there.
3. Read any existing documents that cover the same or overlapping topics. Pay close attention to whether the new content:
   - **Supersedes** existing docs (the new content replaces or invalidates them)
   - **Extends** existing docs (the new content adds to them)
   - **Is independent** (the new content covers a distinct topic)

If existing documents are superseded or need updating, note which files and what changes are needed.

## Step 5: Determine placement

Based on Steps 3 and 4, decide where the content belongs. Present your recommendation to the operator:

- **Target directory:** which section and subdirectory (e.g., `docs/metal/technology/ppg/`)
- **Action:** creating a new file, updating an existing file, or both
- **Filename:** if creating, propose a slug (lowercase, hyphenated, `.md` extension)
- **Rationale:** why this location and approach

If existing docs need updates (content is superseded or overlapping), explain what changes you'll make to those files.

Wait for the operator to confirm or redirect before writing anything.

## Step 6: Write the documentation

### Creating new files

1. Create the `.md` file in the target directory with frontmatter that conforms to the repository's frontmatter standard. Three keys are required on every document:

   ```yaml
   ---
   type: <a value from the controlled vocabulary>
   title: Page Title
   description: One sentence stating what the page covers.
   ---
   ```

   a. `type`, `title`, and `description` are required and must be non-empty. Choose `type` from the controlled vocabulary in `frontmatter.config.json` at the repository root, explained in `docs/frontmatter-standard.md`. If those files are not present, infer the standard from sibling documents in the same directory.
   b. If no existing type fits the document, add a new one to `frontmatter.config.json` (the single source of truth) rather than inventing an unlisted value. Never use a catch-all such as `miscellaneous`.
   c. Add recommended keys (`tags`, `created`) and any team-specific keys (`status`, `products`, `updated`) when they add value. Match the conventions used by sibling files in the same directory.

2. Write the content. Follow these conventions:
   - Use Markdown (`.md`) format.
   - Use relative links between documents (e.g., `[Architecture](architecture.md)`).
   - Use Mermaid code fences for diagrams.
   - Preserve the substance and detail of the source material; do not over-summarise.
   - Structure with clear headings; prefer short paragraphs over walls of text.

### Updating existing files

If existing documentation needs updating because the new content supersedes or extends it:

1. Read the full file before editing.
2. Make targeted edits. Do not rewrite sections that don't need changing.
3. If removing content that has been superseded, add a note or link pointing to the new document.

## Step 7: Scan ADRs for new decisions

Read the existing ADRs in `docs/<team>/technology/adrs/` (if the directory exists).

Evaluate whether the new documentation introduces or implies a technology decision that should be formally recorded. Look for:

- A choice between competing approaches, tools, or patterns
- A commitment to a specific architecture, protocol, or standard
- A migration or deprecation of an existing technology
- A constraint or trade-off that was deliberately accepted

If you identify a potential ADR:

1. Explain what decision you identified and why it warrants an ADR.
2. Recommend the operator invoke the `ignite-create-adr` skill, providing the context you've identified.

If no new decisions are apparent, skip this step silently.

## Step 8: Lint

1. Run `pnpm lint:frontmatter --paths <new or modified files>` and fix any frontmatter violations (missing or empty `type`/`title`/`description`, or a `type` outside the vocabulary).
2. Run `pnpm lint` and fix any markdownlint violations in the new or modified files before finishing.

## Step 9: Summary

After completing all steps, provide a summary:

- Files created, with their paths
- Files updated, with a brief description of changes

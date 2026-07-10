---
name: content-publish-changelog
description: Use when the operator says "content-publish-changelog", asks to publish a changelog entry or open the changelog PR in the website repo, or content-write-changelog has produced an entry that should go live.
metadata:
  author: Prisma
  version: "2026.6.25"
---

# Publish the changelog entry

Take a generated external changelog entry and open a reviewable pull request in the Prisma website repo (`prisma/web`), where the changelog renders at `/changelog`. This skill publishes; it does not write or reword content. It never merges: humans review, edit, and merge.

## Pre-conditions — halt if unmet

1. **An entry exists** (MDX body, frontmatter, triage note). If not, route to `content-write-changelog`.
2. **A website checkout.** Use `spaces/web/` at the ignite repo root (clone the website repo there if absent), or an operator-provided checkout.
3. **A Linear issue reference.** The website repo requires one in every commit body. Ask the operator for it; never invent one, never commit without it.

## Workflow

1. **Validate.** Frontmatter has `title`, `date`, `version`, `slug`, `headline`, `tags`, `canonical`; `slug` equals `date`; `version` is a date label, not an ORM version; full product names; no em dashes; no private PR links; no existing file for that date in `apps/site/content/changelog/` (if one exists, ask: replace or re-date).
   Done when all checks pass. Fix formatting-only issues here; route wording problems back to `content-write-changelog` so the copies do not drift.
2. **Place.** Sync the default branch, create branch `changelog/{YYYY-MM-DD}`, write the entry to `apps/site/content/changelog/{YYYY-MM-DD}.mdx` (`.mdx`, not `.md`).
   Done when the file exists on the new branch and nothing else changed.
3. **Check.** Run the repo's configured lint and format for the touched workspace; fix what they report without reformatting unrelated files.
   Done when the checks pass.
4. **Commit.** `docs(site): add changelog entry {YYYY-MM-DD}`, body: one line on the window and source, then `Linear: {ISSUE}` on its own line.
   Done when the commit exists with type, scope, and the Linear reference.
5. **Open the PR** against the default branch with this body:

   ```markdown
   ## What

   Adds the external changelog entry for {window} at `apps/site/content/changelog/{date}.mdx`.

   Generated with `content-write-changelog` from Loggy's internal changelog for the same window.

   ## Review focus

   - Positioning and product naming (full names, maturity labels: Public Beta / Early Access).
   - Claims: every statement traceable to a public PR, docs page, or blog post.
   - Anything in the triage notes below that should be added back or reworded.

   ## Triage notes

   {the triage note, including "no public PR" items}

   Linear: {ISSUE}
   ```

   Done when the PR is open and its body includes the triage notes.
6. **Report and stop.** Give the operator the PR URL, the triage summary, and any validation warnings; request review from named content owners. Do not merge, do not enable auto-merge.

## Failure handling

- **Push or PR creation fails:** report the exact error; never retry with force.
- **Duplicate date:** ask the operator; never overwrite silently.

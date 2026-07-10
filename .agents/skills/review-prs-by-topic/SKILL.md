---
name: review-prs-by-topic
description: Use when listing or reviewing open pull requests across multiple Prisma org repositories filtered by GitHub topic, or when asked about pending PRs for a team or topic area
---

# Review PRs by Topic

List open, non-draft pull requests across all Prisma org repositories that share
a given GitHub topic. Useful for team-level PR dashboards, standup prep, or
finding PRs that need review attention.

## Inputs

| Input            | Required | Default | Description                                                              |
| ---------------- | -------- | ------- | ------------------------------------------------------------------------ |
| topic            | yes      | —       | GitHub repository topic to filter by (e.g., `prisma-metal`, `loggy-ppg`) |
| days             | no       | 7       | Only include PRs created or updated within this many days                |
| exclude-approved | no       | true    | Omit PRs that already have an `APPROVED` review decision                 |

The script accepts `--since <ISO8601>` instead of `--days`. Compute the cutoff
timestamp yourself from the current date and the requested number of days, then
pass it as `--since`. If `days` is not specified by the user, use the default
7-day window and compute `--since` accordingly. Omit `--since` only when the
user explicitly asks for no time filter.

If the user doesn't specify a topic, ask for one. Do not guess.

## When NOT to Use

- Single-repo PR queries — just use `gh pr list --repo org/repo` directly.
- Non-Prisma orgs — the script accepts any `--org`, but this skill's examples
  and defaults assume Prisma. For other orgs, run the script manually.

## Quick Reference

| Use case                    | Command                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| All open PRs needing review | `list-prs.sh --org prisma --topic prisma-metal --exclude-approved`                              |
| Include approved PRs too    | `list-prs.sh --org prisma --topic prisma-metal`                                                 |
| Last 3 days, skip approved  | `list-prs.sh --org prisma --topic prisma-metal --since 2026-03-15T00:00:00Z --exclude-approved` |
| Broader window (30 days)    | `list-prs.sh --org prisma --topic loggy-ppg --since 2026-02-16T00:00:00Z`                       |

## Workflow

1. **Collect PRs** — run `list-prs.sh` from this skill's directory. The script
   discovers repos via `gh repo list --topic` (not `gh search repos`, which does
   not reliably find private repositories) and fetches open, non-draft PRs from
   each one. Output is one JSON object per line, sorted by repo name
   (ascending) then `updatedAt` (descending, most recent first).

   ```bash
   /path/to/review-prs-by-topic/list-prs.sh \
     --org prisma --topic <TOPIC> [--since <ISO8601>] [--exclude-approved]
   ```

   Run `list-prs.sh --help` for full usage.

2. **Present results** — display a Markdown table with these columns, all
   required: Repo, PR number, Title, Author, Updated, and URL. The URL column
   must contain the full raw URL for every row (not Markdown link syntax) so
   links are clickable in terminal environments. Do not omit the URL column.
   - The output is already sorted — do not re-sort.
   - Truncate titles to ~60 characters to keep the table readable at terminal width.
   - By default, only show PRs that need review (not approved). If the user
     explicitly asks to include approved PRs, split the table into "Needs Review"
     and "Already Approved" sections.

## Common Mistakes

| Mistake                                           | Fix                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Using `gh search repos --topic` for private repos | Use `gh repo list --topic` instead — search does not reliably index private repo topics           |
| Forgetting `--limit` on `gh pr list`              | Default is 30; use `--limit 200` to avoid silently missing PRs                                    |
| Omitting the URL column from the table            | The URL column is required — every row must have the full raw URL so the user can click through   |
| Using Markdown link syntax for URLs               | Use raw URLs — Markdown links are not reliably clickable in tmux                                  |
| Requesting `topics` in `gh search repos --json`   | The `topics` field is not available on the search endpoint                                        |
| Ignoring script warnings about failed repos       | A warning means that repo's PRs are missing from results — investigate before trusting the output |
| Running against 20+ repos near API rate limit     | The script makes one `gh pr list` call per repo; watch for HTTP 403 warnings in stderr            |

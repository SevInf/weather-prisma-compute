---
name: content-write-changelog
description: Use when the operator says "content-write-changelog", asks for the external or user-facing Prisma changelog, or an internal changelog for a window needs its public counterpart.
metadata:
  author: Prisma
  version: "2026.7.9"
---

# Write the external changelog

Turn Loggy's internal changelog (or a raw merged-PR list) for a date range into two artifacts:

1. A public **changelog entry**: a dated MDX file destined for `apps/site/content/changelog/{YYYY-MM-DD}.mdx` in the Prisma website repo.
2. A **triage note**: every excluded or flagged candidate with a one-line reason. Nothing is dropped silently.

The reader is a working developer with no time. The entry must answer "what can I do now, what stopped hurting, must I act" in a ten-second scan.

## Pipeline (end to end)

These are agent skills; Loggy stays the automated data producer and does not change.

1. Loggy's Mastra workflow posts the internal changelog to the internal changelog channel (existing, automated).
2. An operator or scheduled agent runs this skill on that material, producing the entry and triage note.
3. `content-publish-changelog` opens the website PR.
4. Humans review, edit, merge; the site publishes.

Whenever an internal changelog is produced, produce the external one from the same material.

## Pre-conditions — halt if unmet

1. **Positioning source.** Consult the `prisma-product-messaging` skill when available (it is canonical); otherwise `references/positioning.md`.
2. **Input.** Change material plus a date range. Ask the operator if either is missing. Never invent changes.

## Always-on rules

- **Product first, user action in titles.** Summary paragraphs, highlight headings, section intros, bullets, and guide annotations start with the product name ("Prisma Compute build failures now include logs", never "See why a build failed"). Titles lead with what the reader can now do and name the product ("Manage Prisma Compute apps through the API", never "Prisma Compute apps land in the Management API"); no `Prisma:` prefix, no release-event verbs, maturity labels only for launches. Never frame the entry as an ORM release.
- **Not tied to the ORM version.** The `version` frontmatter is the entry's date or period label (`2026-06-24`, `June 2026`), never `v7.x`. An ORM version may appear only inside the Prisma ORM section, and only when a change is meaningless without it.
- **Full product names on every mention.** "Prisma Compute", "Prisma Postgres", "Prisma Next", "Prisma ORM", "Prisma Studio"; never the bare "Compute", "Postgres", "Next", "ORM", "Studio". No-prefix exceptions: "Query Insights", "Accelerate", "VS Code Extension".
- **One change-type label per item**, from: `New` · `Improved` · `Fixed` · `Breaking` · `Deprecated` · `Docs`. A documentation-only change is `Docs`, never `New`.
- **State maturity once, not everywhere.** A not-yet-GA surface's maturity (`Preview` < `Early Access` < `Public Beta`) appears exactly once per entry: a short note or parenthetical at that product's first mention. Never suffix maturity onto headings and never use it as a bullet label. Exception: when the maturity change is itself the news (a launch), it belongs in the title and highlight. Current maturities: Prisma Next `Early Access`; Prisma Compute `Public Beta` (since 2026-06-08).
- **User visibility decides, not repo visibility.** A Console workflow, CLI command, Management API surface, or docs page is publishable even when its code is private: describe the effect, cite a public docs or blog page or nothing, never a private PR link, and note "no public PR" in triage. Changes to a product before its public launch are not publishable.
- **Thin windows.** Cadence is weekly. A window with only a few fixes gets a compact entry with no forced highlights; a window with nothing user-facing is skipped and reported. Never pad.

## Workflow

1. **Normalize.** One PR, commit, or internal-changelog bullet becomes one candidate; drop merge chatter, bot trailers, and duplicates.
   Done when every input line is exactly one candidate or discarded chatter.
2. **Gate.** Give each candidate one verdict per `references/filtering.md`: PUBLISH, REWRITE, NEEDS-CONTEXT, FLAG, or EXCLUDE. When unsure, FLAG.
   Done when every candidate has a verdict and every EXCLUDE and FLAG has a one-line triage reason.
3. **Translate.** Rewrite kept candidates into user value per `references/voice.md`.
   Done when every item leads with the user-visible effect, carries one label, contains no internal jargon or IDs, and quantifies only with numbers from the input.
4. **Assemble.** At most three highlights (order: Prisma Next, Prisma Compute, Prisma Postgres, Query Insights, then the rest); per-product sections for notable items, each opening with a product-first one-line summary and a demo code block for its marquee capability; a visible fixes section grouped by product; breaking changes and deprecations with action sentences; annotated guides and articles; the per-product summary paragraphs; product tags.
   Done when the layout matches `references/mdx-structure.md`, including section ordering.
5. **Render** the entry and the triage note.
   Done when the frontmatter is valid, `slug` equals `date`, `version` is a date label, and the date is the last day of the window.
6. **Self-review** against the checklist below.
   Done when every box checks; fix or re-flag anything that fails.
7. **Hand off.** Route to `content-publish-changelog` to open the website PR.

## Pre-publish checklist

- [ ] Title leads with a user action or outcome and names the product; no `Prisma:` prefix, no release-event verbs ("lands", "arrives", "ships"), no semicolon feature chains; no ORM version in title or `version`.
- [ ] Every documented surface links its docs page (verified paths only).
- [ ] Body opens with the summary split by product, with no heading repeating the title; highlight headings lead with the label and then the product (`### New · Prisma Compute …`); every product section opens with a product-first one-line summary; no emoji.
- [ ] Every technical identifier is backticked; no bare issue numbers (PR references trail sentences as `[owner/repo#N](url)`); links are task-specific.
- [ ] No vague adjectives ("easier", "cleaner", "richer", "debuggable"): state the observable behavior.
- [ ] Deprecations name old surface, replacement, migration window, and an `Action required:` sentence.
- [ ] Fixes are in a visible section grouped by product, never a collapsed or count-only block.
- [ ] Guide links each carry a one-sentence annotation.
- [ ] Demo code blocks are minimal; any snippet whose API shape is not in the source material is flagged in the triage note.
- [ ] Full product names on every mention; exact section headings.
- [ ] At most three highlights, each a marquee change explainable in two-three sentences with proof.
- [ ] Maturity stated exactly once per not-GA product (note or parenthetical), never as a heading suffix or bullet label; claims stay within public sources.
- [ ] No internal codenames, issue IDs, private links, security mechanics, customer names, or personal data. No private PR links; "no public PR" items noted in triage.
- [ ] No CI, dependency-bump, refactor, or analytics items.
- [ ] No em dashes; no banned adjective without proof; no invented numbers.
- [ ] Breaking changes are callouts with a migration step.
- [ ] Guides link the published page, never the web PR.
- [ ] Every borderline candidate is in the triage note.

## Reference

- `references/filtering.md` — the gate: verdicts, the strip test, private-repo and launch-timing rules, guides (`loggy-site`), security fixes, personal data.
- `references/voice.md` — value-first translation, slop patterns to cut, the self-score.
- `references/positioning.md` — product boundaries, approved framing, claim cautions.
- `references/mdx-structure.md` — frontmatter, body order, the Neon/Supabase-derived layout, formatting rules.
- `assets/samples/` — a weekly series of real generated entries (mid-April to July 2026): feature-led weeks, thin weeks, the Prisma Compute Public Beta launch, private-repo-sourced Console and Management API items, a deprecations example, a Docs highlight, demo code blocks, and guides sections. Match their shape.

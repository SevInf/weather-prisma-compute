# MDX structure for the website changelog

The output is one MDX file at `apps/site/content/changelog/{YYYY-MM-DD}.mdx`. The website loader sorts entries by the `date` field, so frontmatter must be valid.

## Why this structure (and how it differs from the old one)

The old website entries lead with an ORM version as the title, use abbreviated, siloed product headings (`## ORM`, `## Studio`), have no scannable summary, and close with a long promotional support blurb. A busy reader cannot tell in ten seconds what shipped or whether they need to act. The audience is developers and AI agents scanning the changelog site: the entry must read as an operational changelog, not a release digest or marketing page.

This structure fixes that:

- **Product-first everywhere.** Title, summary, headings, intros, and bullets start with the product name, so a scanner always knows which surface a line is about.
- A **summary split by product** at the top: one short paragraph per product, biggest win first.
- **Labeled highlights** so the reader scans by intent (`New`, `Improved`, `Docs`).
- **Per-product sections under exact names**, framed as one connected platform, ordered by user impact.
- A **visible fixes section** so the long tail is present, grouped, and crawlable without burying the highlights.

## Frontmatter

Match the website schema. `slug` equals `date`. `tags` lead with `"Prisma"`, then the surfaces present. `version` is required by the site schema, but this changelog is not tied to the ORM release cycle: set `version` to the entry's date or period label (`"2026-04-22"`, or `"June 2026"` for a roundup), never an ORM version like `v7.8.0`.

The title leads with what the reader can now do and names the product, with no `Prisma:` prefix (redundant on the Prisma changelog site) and no release-event verbs: `Set up Prisma Next with new guides and debug failed Prisma Compute builds`, not `Prisma Next adds setup guides; Prisma Compute adds build logs`. See the title rules in `voice.md`.

```yaml
---
title: "{{user-action headline naming the products}}"
date: "{{YYYY-MM-DD}}"
version: "{{YYYY-MM-DD}}"
slug: "{{YYYY-MM-DD}}"
headline: "{{user-action headline naming the products}}"
tags:
  - "Prisma"
  - "Prisma Postgres"
canonical: "/changelog#log{{YYYY-MM-DD}}"
share:
  active: true
  content: "Look at this page: "
---
```

## Body, in this order (omit any block with no content)

1. **The summary, split by product, as the first paragraphs of the body.** One sentence or two per product, biggest win first; a single-product entry gets one short paragraph. Each paragraph starts with the product name and states concrete changes, not benefit language. The first sentence carries the lead value on its own: the index page truncates the preview at roughly 180 characters. Do not repeat the title as a body heading: the site renders the frontmatter title as the page heading, so a leading `##` would render it twice and pollute the table of contents. Do not open with an ORM version.

2. **`## Highlights`** — one `###` subsection per highlight, at most three.
   - **Promotion test:** promote only if all three hold — it is a highlight-surface or marquee change, it changes what a reader can do (not just a fix), and it is explainable in two or three sentences with a concrete proof point. Otherwise it is a section item.
   - Heading: `### {label} · {product-first statement}`, for example `### New · Prisma Compute build failures now include logs and timeout reasons`. The label leads so the site can render it as a badge. A documentation-only change is labeled `Docs`, never `New`: docs are not a product capability. Never put a maturity label in a heading.
   - **Maturity once per entry.** A not-GA product's maturity is stated exactly once: a `> **Note:**` under its first highlight, or a parenthetical at its first mention. Exception (Supabase pattern): when the launch itself is the news, the maturity is the title, for example "Prisma Compute is now in Public Beta".
   - **Body:** sentence one is the friction the reader faced; sentence two is what is new and which Prisma surface delivers it; an optional third sentence is the proof (a workflow, an interface, or a number from the input).
   - Then, in order: an optional fenced code block (see demo snippets below); an optional image as `![{alt}]({url})` for UI changes, always with alt text; an optional callout; then references. Reference links are task-specific sentences that say what the reader gets: `Read the [setup guides]({url}) for installation steps.` For shipped code, `Shipped in [{owner}/{repo}#{N}]({url}).`

3. **One `## {Exact product name}` per section** for the _notable_ new and improved work, for example `## Prisma Compute`, `## Prisma Postgres`, `## Prisma ORM`, `## Prisma Studio`.
   - **Section ordering:** highlight products first (Prisma Next, Prisma Compute, Prisma Postgres, Query Insights), then Prisma ORM, Prisma Studio, VS Code Extension, CLI, others. Within a section, biggest user impact first.
   - **Every product section opens with a one-line summary** that starts with the product name and names the changes ("Prisma Compute adds deploy region configuration, consistent deployment terminology, and preview branch cleanup improvements."), placed before any maturity callout. Required even for a one-item section. No vague adjectives ("cleaner", "richer").
   - Notable items as bullets: `- **{Label}** · {product-first sentence}. ([{owner}/{repo}#{N}]({url}))`. The sentence leads with the product and states the effect; the PR reference trails in parentheses with repo context. Never lead a bullet with a bare `#870`: bare issue numbers mean nothing to public readers. Maturity is never a bullet label.
   - A section may close with one minimal demo code block for its marquee capability.

4. **`## Breaking changes`** (only if present) — each as a callout: `> **Breaking:** {what breaks} To migrate, {step}. [Upgrade guide]({url}).`

5. **`## Deprecations`** (only if present) — each bullet names the product, the deprecated surface, the replacement, and the migration window, then an explicit action sentence: `Action required: {what to change, in imperative form}.` Name the affected endpoint or field exactly; if it is not in the source material, do not invent it.

   ```mdx
   ## Deprecations

   - Prisma Compute custom-domain API responses now include `appId`. The existing `computeServiceId` field is deprecated and will continue to be returned during the migration period. Action required: update code that reads `computeServiceId` to read `appId` instead.
   ```

6. **`## Fixes and improvements`** — collect the long tail of `Fixed` items into one visible section at the end, grouped by product with **bold sub-labels**. Never use a collapsed `<details>` block and never a count-only heading: hidden or count-only content is useless to readers and crawlers. Omit the section if there are no fixes; a lone fix in a product that already has a section stays inline there instead.

   ```mdx
   ## Fixes and improvements

   **Prisma Postgres**

   - **Fixed** · {product-first effect}. ([{owner}/{repo}#{N}]({url}))

   **Prisma ORM**

   - **Fixed** · {product-first effect}. ([{owner}/{repo}#{N}]({url}))
   ```

7. **`## Guides and articles`** (optional, from the `loggy-site` group) — when new blog posts or guides shipped in the window, list the genuinely useful reads as bullets linking the published page, not the web PR. Annotate every link with one sentence stating what the reader gets; a bare link list is a link dump. Skip marketing-only pages and anything already linked inline as a launch reference above.

   ```mdx
   ## Guides and articles

   - [Deploy Prisma Apps with create-prisma](https://www.prisma.io/blog/create-prisma-deploy-prisma-compute): shows how to scaffold and deploy a Prisma Compute app with `create-prisma`.
   ```

## Demo code blocks

Each marquee capability should carry a minimal, copy-pasteable snippet showing the reader what using it looks like: a schema block for schema features, a config file for config features, a `try/catch` for error-handling changes.

- Ground every identifier in the source material or in established public syntax (Prisma Schema Language, documented CLI commands). Never invent numbers or claims in code comments.
- When a snippet requires an API shape the source material does not state (a config export, an import path), keep it minimal, mark it for review in the triage note, and flag it in the PR body so a product reviewer confirms the shape.
- One snippet per capability at most; no filler blocks.

## Formatting rules

- No em dashes anywhere, including bullet labels. Use a space-padded `·` to separate a label from what follows and `:` before the effect.
- No emoji. Callout labels are plain bold text, and the site renders change-type labels as badges. Keep labels to the recognized set (`New`, `Improved`, `Fixed`, `Breaking`, `Deprecated`, `Docs`) so the badge mapping works.
- Every exact technical identifier gets backticks: package names, import paths, config files (`prisma.compute.ts`), API fields (`appId`), endpoints (`/v1/deployments`), commands, error codes. Named product surfaces (Prisma Console, the Management API) stay plain text.
- Images always have alt text.
- PR references are public PRs only, full URL, written with repo context as `[{owner}/{repo}#{N}]({url})` and trailing the sentence in parentheses. PRs live across several public repos, so the repo prefix disambiguates.
- **Private-repo changes: publish the effect, never the PR.** A user-visible change whose implementation lives in a private repo is published by describing its effect and citing a public docs page or blog post when one exists, or no reference at all. Never link a private PR (it 404s for readers and leaks the repo name). Note "no public PR" in the triage log so a reviewer can confirm the capability is announced.
- **Launches and announcements cite the public article, not a PR.** When a change is a public launch (a Public Beta, a new product surface, a docs section) whose implementation lives in private repos but whose announcement is public, cite the public blog post or docs page with a task-specific sentence: `Read the [launch announcement]({url}) for what is included.` This is the correct reference for launch items even though there is no public PR.
- Use a portable blockquote callout with a plain bold label and no emoji (`> **Tip:** …`, `> **Note:** …`, `> **Breaking:** …`, `> **Security:** …`) unless a website callout component is confirmed available.
- Keep code blocks minimal and copy-pasteable.
- **Link the docs wherever a documented surface is mentioned.** Every feature that has a docs page gets a task-specific docs link; use only verified paths (from the source material or an already published entry), never an invented deep slug.

## Closing footer

The support pointer is not changelog content and must not look like a changelog item. Close with a thematic break and one italic line, nothing more:

```mdx
---

*Need help applying these changes in production? [Prisma Enterprise Support](https://prisma.io/enterprise) can help with schema design, performance, security, and compliance.*
```

## Triage log

Alongside the MDX, write a short triage log (for example `TRIAGE.md` or a section in the handoff message) listing every candidate that was excluded or flagged, with a one-line reason, plus any demo snippet whose API shape needs product review. This is how the operator audits that nothing user-facing was dropped and nothing internal slipped through.

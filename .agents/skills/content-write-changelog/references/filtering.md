# Filtering: what reaches a public changelog

Run this on every candidate line, even lines that sit under a product heading in an aggregated extraction. Assign one verdict. When unsure, FLAG. Record every EXCLUDE and FLAG in the triage log with a one-line reason. Nothing is dropped silently.

## Include vs exclude (the baseline test)

Borrowed from changelog discipline (Keep a Changelog and the nextest prepare-changelog practice): a changelog records user-visible change, not the development process.

**Include:**

- User-visible behavior changes, new capabilities, and improvements.
- Bug fixes the reader would notice.
- Performance gains (state the effect or number, not the internal mechanism).
- Breaking changes and deprecations.
- Labeled Preview or Early Access changes to public products.

**Exclude:**

- Internal dependency and lockfile bumps with no user-facing effect.
- Refactors and code-structure changes.
- Docs-only changes and changes to internal documentation pipelines.
- CI, build, and repository-config changes.
- Test-only changes.

## Verdicts

### EXCLUDE — never publish

- **Internal codenames and tool names** not in the public product vocabulary.
- **Internal references:** issue-tracker IDs, private chat channels, secrets-manager or deploy-platform or dashboard links, internal URLs.
- **Internal process and infrastructure:** CI and build tweaks, dependency bumps with no user effect, repo config, generated images, SEO and analytics, consent or tracking changes.
- **Implementation and vendor internals:** which sandbox, model, or runtime powers a feature; infrastructure topology; auth internals.
- **Security mechanics:** how a vulnerability worked, credential formats, token or auth internals. (A security _fix_ may be stated as a forward-looking, mechanism-free improvement; see below.)
- **Customer data and personal data:** customer names, private customer details, support-ticket specifics, individual names or emails.

### User-visible changes from private repos — publish, do not flag

Much of the platform (Prisma Compute, the Prisma Console, the Management API) is built in private repos. The repo's visibility does not decide publishability; the **user's visibility** does.

- **Publish** when the user can see or use the change: a Console workflow (environment variables, rollback, settings), a CLI command, a Management API surface or endpoint, a deployed platform behavior, a published docs page. Describe the user-visible effect, cite a public docs page or blog post when one exists, otherwise use no reference at all. Record "no public PR" in the triage note so a reviewer can confirm the capability is announced.
- **Exclude** work that is internal even though the product is public: build-runner and rollout mechanics, model renames with no API change, infrastructure topology, CI, observability plumbing.
- **Respect launch timing:** changes to a product before its public launch are not publishable; from launch on, they are. Prisma Compute entered Public Beta on 2026-06-08, so Prisma Compute changes appear from that date forward.

### FLAG — pull from the entry and escalate

- Genuinely unannounced plans or capabilities you cannot confirm are public.
- Anything that hits a claim caution (Compute product GA, pricing, roadmap, parity, absolutes).
- Reverts of public features, unclear audience, or a "fix" with no identifiable user-visible change.
- Anything you are unsure about.

### PUBLISH or REWRITE — safe with translation

- Shipped behavior changes, fixes, and improvements to public products and surfaces.
- Labeled Preview and Early Access changes to public products.
- REWRITE when the line carries a real benefit wrapped in internal detail: strip the detail, keep the effect.

## The strip test

Remove the internal detail from a line and look at what remains:

- Nothing useful left for a reader → EXCLUDE.
- A real benefit left → REWRITE into user value.
- Cannot tell → FLAG.

## Early Access products under heavy internal development (e.g. Prisma Next)

An Early Access product can have a public repo that is mostly internal engineering: parser rewrites, migration-graph rendering, codec and marker-ledger machinery, refactors, ADRs, each carrying an internal issue ID. Publishing those would bury the few real changes and overstate the product.

Apply this test per line, not per repo:

- **Publish (narrow, labeled `Early Access`)** only if the change alters what an Early Access user can do or see: a new authoring capability, a CLI command or flag, an editor or tooling experience, a query API addition, a stated support policy. Strip the internal ID, link the public PR, keep the wording to what the PR demonstrably does.
- **Exclude** internal engine work even though the repo is public: parser and IR rewrites, migration-graph rendering, codec or marker-ledger plumbing, refactors, test and fixture changes, project close-outs, ADRs.
- **Add a triage note** recommending the operator confirm the product's name and maturity wording before publish. Do not assert scope, roadmap, or "what the product is" beyond the PR.

## Published guides and articles (the `loggy-site` group)

The `loggy-site` group is the website's published content: blog posts and docs guides from `prisma/web`. Unlike code PRs, these are **user-facing by design**. Surface them, do not treat them as internal noise.

- **Publish** newly shipped blog posts and guides as a `## Guides and articles` section, linking the **published page** (`https://www.prisma.io/blog/{slug}` or `https://www.prisma.io/docs/{path}`), never the web PR.
- A guide that is the primary reference for a launch or feature already covered above is linked inline there (a task-specific sentence link), not repeated in the guides list.
- **Still exclude:** posts whose subject is an internal-only tool or codename (for example a post titled after an internal agent), and pure site mechanics (OG images, SEO and JSON-LD, search-console verification, redirects, copy-only tweaks, author photos).

## Security fixes

State the outcome, not the exploit. "Connection strings are now redacted from error logs, so credentials no longer appear in stack traces" is publishable. The auth path that leaked them, the credential format, and the proof of concept are not. When in doubt, FLAG for a security reviewer.

**Already-disclosed dependency and CVE patches are routine, not exploit disclosure.** A dependency bump that resolves a published advisory (a GHSA or CVE), or a hardening change with no exploit detail, may be published as a single neutral line citing the public PR: "Updated bundled dependencies to patch known advisories" or "Platform auth credentials are now stored with stricter file permissions." Name the advisory only if the PR already links it publicly. Undisclosed vulnerability mechanics still stay out or get flagged.

## Customer names and personal data

Replace a named customer with a neutral phrase: "resolved a replication lag issue reported by Acme" becomes "resolved a replication lag issue affecting some primary databases." Never publish a customer name, an individual contributor's name, or any personal data in a Prisma changelog entry.

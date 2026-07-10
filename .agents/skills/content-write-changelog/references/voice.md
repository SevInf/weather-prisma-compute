# Voice: terse, value-first, no slop

The goal is prose a busy developer trusts and can skim. Two influences:

- **Stop-slop:** remove the predictable patterns that signal machine-generated text.
- **Prisma messaging:** replace vague claims with the workflow detail that earns them.

## Product first, always

The product name appears wherever a reader or an AI agent might land mid-scan: title, summary paragraphs, highlight headings, section intros, bullets, and guide annotations. Never lead with a vague concept ("Get started", "See why", "Choose", a bare feature noun) when the product name can anchor the line.

- Bad: "Get started with Prisma Next" · Good: "Prisma Next setup guides are now available"
- Bad: "See why a Prisma Compute build failed" · Good: "Prisma Compute build failures now include logs and timeout reasons"
- Bad: "Scalar lists, MongoDB enums, and richer editor support" · Good: "Prisma Next adds scalar lists, MongoDB enums, and language server improvements"

## Titles: what the reader can now do

The title answers "does this update affect me" for a developer scanning search results or the changelog archive. Lead with the outcome or user action, and name the product in the same breath.

- Prefer user-action verbs: manage, debug, configure, restore, inspect, catch, fix, set up, roll back, control, use.
- Avoid release-event verbs ("lands", "arrives", "ships", "introduces", "adds") unless they are genuinely the clearest option.
- Bad: "Prisma Compute apps land in the Management API" · Good: "Manage Prisma Compute apps through the API"
- Bad: "Query Insights arrives in Prisma Studio" · Good: "Debug slow queries from Prisma Studio"
- Bad: "Prisma Studio restores horizontal scrolling in Safari" · Good: "Browse wide tables again in Prisma Studio on Safari"
- When one entry covers several products, lead with the biggest user action and let the summary carry the rest; do not chain unrelated feature names with semicolons.
- Mention a maturity label ("Public Beta", "Early Access") in the title only when it changes how the reader should interpret the update (a launch).
- Specific enough for search, concise enough to scan; no hype, no internal phrasing.

## Lead with value

- Open each item with what the reader can now do or what stopped hurting. State mechanism only when it changes how they use the product.
- One idea per sentence. One or two sentences per item.
- Active voice, present tense: "Views now support `@unique`."
- Quantify only with a number that appears in the input ("up to 2x faster on SQLite"). Never invent a number.

## Cut the slop

Remove these patterns:

- **Throat-clearing openers:** "We're excited to", "We're thrilled to", "Today we're announcing", "As always".
- **Teaser and filler:** "stay tuned", "under the hood", "and much more", "the wait is over".
- **Emphasis crutches and intensifiers:** "very", "really", "truly", "incredibly", "simply", most adverbs.
- **Business and SaaS jargon:** "leverage", "robust", "best-in-class", "next-generation", "game-changing", "supercharge".
- **Vague declaratives:** "This is huge", "A better experience", sentences that assert importance without a concrete change.
- **Meta-commentary:** "It's worth noting that", "Needless to say", "Without further ado".

Banned adjectives unless the sentence proves them with a workflow detail: `seamless`, `effortless`, `powerful`, `robust`, `fast`, `simple`, `easier`, `cleaner`, `richer`, `clearer`, `debuggable`. Replace them with the observable behavior: not "builds are easier to debug" but "a failed build sends an email, exposes logs through the Management API, and fails stuck steps with a per-step timeout".

## Structure rules

- No em dashes. Use commas, periods, or parentheses. In bullet labels use a space-padded `·` then `:`.
- No staccato fragmentation for drama ("It deploys fast. Very fast.").
- No rhetorical question openers and no "Wh-" sentence starters as a hook ("What if you could...").
- No binary-contrast cliché ("It's not X, it's Y") and no negative-listing padding.
- Vary sentence length. Avoid a metronomic run of same-length sentences.
- Every exact technical identifier gets backticks: package names, import paths, config files, API fields, endpoints, commands, error codes.
- Links are task-specific: say what the reader gets there ("Read the [setup guides]({url}) for installation steps"), never a bare "Read more: [docs]".

## Translate jargon into user effect

Strip internal mechanism; keep the outcome.

- "Refactored `adapter-mariadb` to use the binary MySQL protocol" becomes "`adapter-mariadb` no longer loses precision on large numbers." (`Fixed`)
- "Make `DataMapperError` a `UserFacingError`" becomes "Data-mapping failures now surface as clear, actionable errors." (`Improved`)
- "Bun and Rust rewrite of the compute runtime" becomes "Cold starts are down about 40% at p99." State the effect, not the rewrite.
- "feat: DR-8328 add compute page first stage" is excluded (internal ID plus unreleased surface).

## Self-score before shipping

Rate the draft on five dimensions, one to ten each. Revise anything under a total of 35 out of 50.

1. **Directness** — does it state the change plainly, or circle it?
2. **Rhythm** — varied sentence length, or metronomic?
3. **Trust** — does it respect the reader's intelligence, or over-explain and hype?
4. **Authenticity** — does it read like a person wrote it, or a template?
5. **Density** — is there anything cuttable without losing meaning?

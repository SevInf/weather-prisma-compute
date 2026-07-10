# Positioning and claim safety

Condensed from the `prisma-product-messaging` skill. That skill is canonical when available; this file is the fallback. Use it before writing any product claim.

## Strategic frame

- Prisma is integrated TypeScript infrastructure for teams building with AI agents.
- The platform story is ORM, Postgres, and Compute designed to work together. The differentiator is the integrated slice across layers, not any single best-in-class product.
- The ORM is the credibility anchor. It proves trust and adoption, but Prisma is not "just an ORM".

## Messaging hierarchy (compressed for a changelog)

The opening summary carries the platform framing (what is new across Prisma), one product-first paragraph per surface. Each item then names the surface and the concrete win. Order of reasoning: who it is for, the friction of a stitched-together stack, why Prisma, which surface does the job, the proof.

## Product names and boundaries — use exactly, do not blur

Write the full product name on **every** mention, not just the first: "Prisma Compute", not "Compute"; "Prisma Postgres", not "Postgres"; "Prisma Next", not "Next"; "Prisma ORM", not "ORM"; "Prisma Studio", not "Studio". The names without a "Prisma" prefix are "Query Insights", "Accelerate", and "VS Code Extension". This applies in the title, headings, and prose alike.

- **Prisma** — integrated TypeScript infrastructure; ORM, Postgres, and Compute as one platform. Use for the platform story (the changelog lead).
- **Prisma ORM** — open-source, type-safe ORM and database toolkit for TypeScript and JavaScript; schema-first with a generated client and migrations. Relational and MongoDB. The credibility anchor, not the whole story.
- **Prisma Postgres** — managed PostgreSQL inside the platform; the commercial anchor. Direct and pooled connections are different things; do not conflate them.
- **Prisma Compute** — serverless TypeScript app hosting for low-latency access to Prisma Postgres. Deploys TypeScript apps alongside Prisma Postgres, with hosting, database branches, and previews managed together. In **Public Beta as of 2026-06-08**: label Compute changes `Public Beta`, state that maturity plainly, but make no GA or production-readiness claim and no operational absolutes.
- **Prisma Next** — the next generation of Prisma's TypeScript data layer, in **public Early Access**, and a story the team actively wants told. Promote it: it leads the highlight ordering, and its changes deserve a highlight when they alter what an Early Access user can do. Publicly stated capabilities you may repeat: a fully typed client with no Rust binaries, Prisma Schema Language tooling (formatter, language server, editor diagnostics), and published early benchmarks. Always label `Early Access`; keep capability and maturity claims to what public posts and PRs state; never invent scope or a launch timeline.
- **Query Insights** — query-performance views inside Prisma Postgres, surfaced in the Prisma Console. Not a separate product called "Optimize".
- **Accelerate** — connection pooling and edge caching for Prisma Client. Not a database, not hosting.
- **Prisma Studio** — visual data browser and editor. Not the Console, not an infrastructure console.
- **CLI, Management API, MCP** — surfaces, not separate products. MCP is the agent-native interface.

## Approved framing

- One platform instead of separate vendors.
- Type-safe schema and a generated client cut avoidable runtime errors.
- Co-location lowers app-to-database latency.
- Spend caps and one bill simplify operations.
- Programmable CLI, API, and MCP let agents and developers work from one source of truth.
- Prisma is an integrated TypeScript platform, not only an ORM.

## Claim cautions — narrow the wording or FLAG

- Prisma Compute general availability or production readiness as a product (a specific shipped feature, stated as such, is fine when labeled `Public Beta`).
- Prisma Next scope or maturity claims beyond what public posts and PRs state.
- Launch dates, pricing, or roadmap not present in the input.
- Cross-product parity, or "best in class on its own".
- Accelerate or Query Insights doing more than the input confirms (no promised automated fixes unless the input says so).
- Absolutes: `no`, `all`, `any`, `automatic`, `instant`, `no cold starts`, `no limits`, unless a source supports the exact claim.

## Weak framing to delete

"The future of infrastructure", "everything you need", "move fast with confidence", "better developer experience". Replace each with a specific workflow win.

## Competitive posture

Prisma competes against the stitched-together stack, not a single product. If a comparison is unavoidable, keep it practical (fewer seams, fewer handoffs for TypeScript and agent workflows). Never category-war rhetoric.

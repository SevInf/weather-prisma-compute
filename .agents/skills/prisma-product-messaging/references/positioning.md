# Prisma messaging foundation

This file condenses the current Prisma positioning sources in this repo into reusable guidance for communication work.

## Strategic frame

- Prisma is the integrated TypeScript infrastructure for agentic software development.
- The top-level story is ORM, Postgres, and Compute designed to work together as one platform.
- Prisma does not need to win the story by claiming to be the best isolated ORM, database, or hosting layer.
- The differentiator is the integrated slice across those layers, especially for TypeScript teams building with AI coding agents.
- The ORM is the credibility anchor. It proves trust and adoption, but Prisma should not be framed as only an ORM company.

## Audience

Primary audience today:

- Developer-led startup and SMB teams.
- TypeScript developers using AI coding agents.
- Founding engineers, full-stack developers, backend developers, and technical leads.

Secondary audience:

- CTOs and engineering leaders evaluating platform consolidation, cost, and compliance headroom.

Not the primary target:

- Enterprise procurement-led buyers.
- Teams that are not centered on TypeScript.
- Teams looking for a bundled backend with auth, storage, and realtime as the main story.

## Core problems Prisma should address

- The backend is still fragmented across separate vendors.
- Agents can write code, but full-stack iteration is harder when database, ORM, and hosting live in different products.
- Setup work, connection handling, deployment steps, and cross-vendor debugging slow teams down.
- Fragmentation compounds into multiple bills, multiple failure points, and higher switching costs.
- Many developers still think of Prisma only as the ORM, which hides the broader platform story.

## Core solution language

Use language in this shape:

1. Name the user problem.
2. Explain the integrated Prisma approach.
3. Ground the claim in a concrete workflow or interface.

Preferred solution themes:

- Integrated TypeScript infrastructure.
- One platform where ORM, Postgres, and Compute work together.
- Agent-ready interfaces through the CLI, Management API, and MCP.
- Co-location of app and database for low-latency data access.
- Predictable pricing with spend caps.
- Infrastructure declared in code, not stitched together through dashboards.

## Messaging hierarchy

Use this hierarchy in homepage copy, launch copy, website copy, and high-level docs:

1. Audience and use case.
2. The problem with the stitched-together stack.
3. Prisma as the integrated TypeScript answer.
4. The specific product or workflow.
5. Proof, such as typed schema, CLI or API parity, co-location, or spend caps.

## Product descriptions

### Prisma

- Best used as the platform or company story.
- Safe description: integrated TypeScript infrastructure for developers building with AI agents.
- Safe detail: Prisma combines ORM, Postgres, and Compute into one platform.

### Prisma ORM

- Open-source, type-safe ORM and database toolkit for TypeScript and JavaScript.
- Schema-first approach with generated client and migrations.
- Credibility anchor for the broader Prisma platform.

### Prisma Postgres

- Managed PostgreSQL inside the Prisma platform.
- Core commercial product and database anchor.
- Strongest when described through managed database workflows, Prisma integration, and programmable interfaces.

### Prisma Compute

- Serverless TypeScript app hosting designed for low-latency access to Prisma Postgres.
- Best framed as the compute complement to Prisma Postgres.
- Availability and maturity need caution because repo sources describe it as early-stage and not fully settled.

### Supporting surfaces and features

- CLI, Management API, MCP, Studio, and Console are surfaces or interfaces.
- Accelerate and query-performance features inside Prisma Postgres require narrower language unless the copy is backed by current product docs.

## Approved claims

These themes are supported by current repo sources:

- Prisma is an integrated TypeScript platform, not only an ORM.
- Prisma ORM is trusted and widely adopted.
- Prisma Postgres is managed PostgreSQL in the Prisma ecosystem.
- Prisma is betting on code-first infrastructure declared in the repo.
- Agent workflows matter, and Prisma surfaces are designed to support them.
- Prisma Postgres and Prisma Compute are strategically stronger together than apart.

## Claims that need caution

Use narrower wording or flag for review when copy claims any of the following:

- General availability or production readiness for Prisma Compute.
- Specific launch dates, pricing, or public roadmap details not stated in the current doc set.
- Feature parity claims across all Prisma products.
- Claims that every Prisma product is best-in-class on its own.
- Claims that Accelerate or query-performance features in Prisma Postgres do more than the current repo sources confirm.
- Strong competitive claims without a concrete comparison point.

## Competitive posture

- Prisma competes against the stitched-together stack more than any single product.
- Helpful comparison frame:
  - Prisma: code-first, integrated TypeScript infrastructure.
  - Vercel: frontend-first.
  - Cloudflare: infra-first.
  - Supabase and Neon: database-first.
- Do not overextend this into category-war rhetoric. Keep the point practical: fewer seams, fewer handoffs, stronger TypeScript and agent workflows.

## How to talk about value

Good value framing:

- One platform instead of coordinating separate vendors.
- Type-safe schema and generated client reduce avoidable runtime issues.
- Programmable interfaces help agents and developers work from the same source of truth.
- Co-location reduces latency for app-to-database traffic.
- Spend caps and one bill simplify operational planning.

Weak value framing:

- "The future of infrastructure."
- "Everything you need."
- "Move fast with confidence."
- "Better developer experience."

Those phrases are too broad unless followed by specific proof.

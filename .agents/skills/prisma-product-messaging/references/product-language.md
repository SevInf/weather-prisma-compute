# Product language guide

Use exact names and keep the product boundaries clear.

## Prisma

### Use this language

- Integrated TypeScript infrastructure for developers building with AI agents.
- One platform that brings together Prisma ORM, Prisma Postgres, and Prisma Compute.
- Code-first platform for TypeScript application teams.

### Avoid this language

- Prisma is just an ORM.
- Prisma is a generic all-in-one backend for every team.
- Prisma replaces every infrastructure layer a company might ever need.

### Common mistakes

- Reducing Prisma to the ORM when the copy is about the platform.
- Speaking about Prisma as if every product is equally mature and fully public.

## Prisma ORM

### Use this language

- Open-source, type-safe ORM and database toolkit for TypeScript and JavaScript.
- Schema-first workflow with generated Prisma Client.
- Strong fit for teams that want typed queries and migrations.

### Avoid this language

- Managed database.
- App hosting platform.
- Relational-only tooling, because MongoDB is also supported.

### Common mistakes

- Describing Prisma ORM as the same thing as Prisma Postgres.
- Claiming edge compatibility without mentioning Accelerate where that distinction matters.

## Prisma Postgres

### Use this language

- Managed PostgreSQL within the Prisma platform.
- Core commercial database product.
- Works with Prisma ORM and standard PostgreSQL clients.
- Supports direct and pooled connection strings.

### Avoid this language

- A custom database engine.
- Infinite concurrency or unlimited connections.
- Bring-your-own-infra Postgres.

### Common mistakes

- Implying every Postgres extension is supported.
- Treating pooled connections as the same thing as direct connections.
- Claiming external database attachment is supported.

## Prisma Compute

### Use this language

- Serverless TypeScript app hosting designed for low-latency access to Prisma Postgres.
- Service-and-version deployment model with preview-first workflows.
- Best positioned as the compute complement to Prisma Postgres.

### Avoid this language

- Mature, general-purpose production platform without qualification.
- Multi-region app hosting.
- Fully documented replacement for every serverless or container platform.

### Common mistakes

- Claiming GA, stable pricing, or complete operational workflows without current confirmation.
- Describing Compute as tightly coupled to Prisma Postgres in a way that implies it cannot work with other databases.
- Using absolute operational claims such as `no cold starts`, `no execution timeouts`, `no connection limits`, `automatic recovery`, `automatic handling of OOM conditions`, or `deploys in seconds` without a current source that explicitly supports each claim.

## Accelerate

### Use this language

- Adds connection pooling and edge caching for Prisma Client.
- Helps Prisma Client run in edge runtimes by proxying through Accelerate's HTTP API.

### Avoid this language

- Managed database.
- App hosting product.
- General performance layer for every Prisma workload.

### Common mistakes

- Mixing Accelerate up with Prisma Postgres.
- Calling Accelerate the same thing as Prisma Postgres query-performance features.

## Query-performance features in Prisma Postgres

### Use this language

- Query performance views or insights inside Prisma Postgres workflows.
- Query-performance-related functionality surfaced through the Prisma Console.
- If the operator refers to `Optimize`, treat it as query-performance functionality that is now part of Prisma Postgres, not a separate current product.

### Avoid this language

- Standalone full observability platform.
- A separate current Prisma product named `Optimize`.
- Broad monitoring claim set unless supported by product docs.

### Common mistakes

- Talking about query-performance tooling as if it were separate from Prisma Postgres.
- Promising recommendations or automated fixes when the source does not confirm them.

## Prisma Studio

### Use this language

- Visual data browser and editor.
- Model-aware view of database records.
- Available locally and through hosted or embedded experiences.

### Avoid this language

- Platform management console.
- Deployment, hosting, or infrastructure interface.

### Common mistakes

- Confusing Studio with Console.
- Treating Studio as the primary way to manage Prisma projects.

## CLI, Management API, and MCP

### Use this language

- CLI: the command-line interface for Prisma workflows.
- Management API: programmatic control plane for Prisma management operations.
- MCP: the agent-native interface that exposes Prisma capabilities as tools.

### Avoid this language

- Separate products with unrelated capabilities.
- Human-only interfaces when the point is agent automation.

### Common mistakes

- Claiming CLI and API parity for features that are not explicitly documented.
- Treating MCP as a marketing add-on rather than an interface used by agents.

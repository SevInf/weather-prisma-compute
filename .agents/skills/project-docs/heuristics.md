# Audit Heuristics

Reference for the `/project-docs audit` mode. Each signal maps to a
suggested doc type.

## Standard Doc Signals

| Signal                  | How to detect                                                                                                                                                                                                                                           | Suggests                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| HTTP routes             | Grep for `app.get`, `app.post`, `router.`, `.get("/`, `.post("/`, Hono `new Hono`                                                                                                                                                                       | API.md                       |
| RPC handlers            | Grep for `@SerializeErrors`, files matching `*.rpc.ts`                                                                                                                                                                                                  | API.md                       |
| Metrics                 | Grep for `prometheus`, `opentelemetry`, `metrics.`, `@opentelemetry/`                                                                                                                                                                                   | Observability.md             |
| Structured logging      | Grep for `diary`, `pino`, `winston`, `slog`, `log.info`, `log.error`                                                                                                                                                                                    | Observability.md             |
| Auth middleware         | Grep for `jwt`, `bearer`, `Authorization` in files matching `*auth*`, `*middleware*`                                                                                                                                                                    | Authentication.md            |
| Dockerfile              | Glob for `Dockerfile`, `docker-compose.yml`                                                                                                                                                                                                             | Operations.md, Deployment.md |
| CI/CD pipelines         | Glob for `.github/workflows/*.yml`, `deploy.sh`, `deploy.ts`                                                                                                                                                                                            | Deployment.md                |
| Deploy scripts          | Glob for `scripts/deploy*`, `.github/scripts/deploy*`                                                                                                                                                                                                   | Deployment.md                |
| Recurring code patterns | 3+ source files sharing error handling, logging, retry, or naming patterns (e.g., background workers, middleware chains, service classes). Grep for framework-specific conventions: pgrx macros, Express middleware, Go `slog`, retry/backoff utilities | Conventions.md               |

## Dynamic Topic Signals

| Signal                    | How to detect                                           | Suggests         |
| ------------------------- | ------------------------------------------------------- | ---------------- |
| Source directory cluster  | Glob for `src/{name}/` with 5+ files                    | `{Name}.md`      |
| Large domain file         | Source files > 300 lines with a distinct responsibility | Custom topic doc |
| Existing non-standard doc | `.md` files in `docs/` that don't match standard menu   | Flag for update  |
| Cron/scheduling           | Grep for `cron`, `setInterval`, `schedule` in source    | `Scheduling.md`  |
| Database migrations       | Glob for `migrations/`, `*.sql` files                   | `Migrations.md`  |

## AGENTS.md Decomposition Signals

| Signal               | How to detect                                        | Action                      |
| -------------------- | ---------------------------------------------------- | --------------------------- |
| Monolithic AGENTS.md | Line count > 300                                     | Recommend decomposition     |
| Architecture section | H2/H3 with "architecture", "overview", "system"      | Extract to Architecture.md  |
| Development section  | H2/H3 with "development", "setup", "getting started" | Extract to Development.md   |
| Gotchas section      | H2/H3 with "gotchas", "pitfalls", "common issues"    | Extract to Operations.md    |
| Debug section        | H2/H3 with "debug", "troubleshoot", "axiom", "log"   | Extract to Observability.md |
| Glossary section     | H2/H3 with "glossary", "terminology", "domain"       | Extract to Architecture.md  |

## Compliance Checks

For existing docs, check:

1. **Has `## Intent` section?** — Search for `## Intent` near the top
   of the file (within first 20 lines).
2. **Has `## Related docs` section?** — Search for `## Related docs`
   or `## Related` anywhere in the file.
3. **Behavior-first voice?** — Flag docs where > 50% of content is code
   blocks (rough heuristic: count lines inside triple-backtick fences vs
   total lines).

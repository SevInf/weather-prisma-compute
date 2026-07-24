# Project instructions

## Architecture

- Keep raw API and database access in `src/repositories/<domain>/`.
- Keep domain policy in services. Do not put cross-source decisions, source/model selection, user-visible fallback, or domain-aware freshness rules in a repository.
- Limit `*-cache-repository` implementations to cache/revalidation behavior for the raw contract they decorate.
- Construct concrete implementations only in `src/composition/`; cross repository and service boundaries through interfaces.
- Read [`docs/architecture/data-access.md`](docs/architecture/data-access.md) before adding or changing a repository, service, or cache.

## Validation

- Run `nix develop -c bun run build` for changes to application or Prisma Next code.

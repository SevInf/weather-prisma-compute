# Data-access and caching boundaries

## Purpose

Use this guide when introducing a database/API adapter, a cache, or a service that coordinates them. It answers where a decision belongs as the application gains new domains.

## Start with the decision, not the class name

Classify each behavior by the information required to make its decision.

| Decision needs | Owner | Why |
| --- | --- | --- |
| One data source's protocol, schema, query, batch shape, or error translation | Repository | The answer is about accessing that source. |
| Only an entry's cache metadata, an HTTP validator, or a fixed expiry | Cache repository / transport cache | Any caller of the same raw contract should get the same result. |
| Facts from more than one source or domain | Service | No individual repository has the whole context. |
| A user-visible guarantee, fallback, or degraded result | Service | It changes application behavior, not how a source is accessed. |
| Which source, model, tenant, or strategy applies | Service | It is a domain choice that must be explicit and testable. |
| Construction of concrete implementations | Composition root | It prevents implementation dependencies from leaking into policy. |

A useful test is: **could an unrelated caller use this behavior safely without understanding the application's business rules?** If yes, it may belong in a repository or cache decorator. If no, it belongs in a service.

## Repository principles

A repository is a narrow boundary around one database, API, or cache-store contract. It may:

- translate between a source format and the contract's data shape;
- query, write, batch, paginate, and perform transport-level retries or error translation;
- expose only the raw operations required by callers.

A repository must not choose a domain strategy, combine facts from separate domains, or decide a user-visible fallback.

Repository and service boundaries must use entity-specific branded identifier types rather than bare `string` or `number` IDs. See [Entity identifiers](entity-identifiers.md).

Group repository files by domain. Name direct providers after their provider and domain. Name cache implementations after the datum they cache, using the `*-cache-repository` suffix.

## Cache placement

A cache decorator is appropriate only when it decorates one raw contract and answers the same question for every caller of that contract.

### Keep caching in a repository when all are true

1. The key is derived solely from the decorated contract's request.
2. Validity is determined by fixed expiry, source-provided validators/versioning, or cache-entry metadata.
3. A hit, miss, revalidation, or stale raw value has the same meaning for every caller.
4. The decorator can be reused without importing domain policy.

Examples include HTTP ETag revalidation, a fixed TTL lookup, and a persisted cooldown that prevents repeated rechecks of the same raw resource after an upstream failure.

### Move cache policy into a service when any are true

- Validity depends on facts held by another repository or service.
- The choice to serve stale data depends on a customer-facing guarantee or a domain state.
- The cache entry must be compared with a publication, workflow, authorization, inventory, or other business event.
- A miss requires choosing among providers, models, or fallback strategies.
- A cache write is conditional on an outcome that combines multiple sources.

This is the practical distinction: **cache mechanics optimize a raw read; cache policy decides whether a value is acceptable to the application.**

## Services coordinate policy

Services depend on repository and service interfaces. They own decisions that combine boundaries or affect observable behavior:

- source selection and model/strategy selection;
- freshness rules that require domain state;
- fallback and degraded-response policy;
- orchestration of reads, refreshes, and writes across repositories.

Keep an I/O service method as a small imperative shell. Extract deterministic classification, planning, result assembly, and logging into pure functions. Pass time, configuration, and other volatile inputs explicitly.



## Dependency direction and composition

Cross a repository or service boundary through an interface, never a concrete implementation. Construct concrete implementations only in a composition root.

```text
request handler
  -> domain service
       -> repository and service contracts
            -> concrete database, cache, and API adapters
```

A service may receive a cached repository through its interface. It must not construct that decorator itself. A repository must not construct a service to obtain policy.

## Failure behavior

Define degraded behavior before implementing the happy path:

- a cache-store failure may permit a raw read if that is safe;
- an upstream failure may permit a prior value only when service policy says it remains acceptable;
- when no acceptable value exists, return an explicit unavailable result.

Log a single decision summary per request cycle. Capture counts or categories that distinguish cache hits, refreshes, permitted stale results, fallbacks, and unavailable results without leaking source payloads.

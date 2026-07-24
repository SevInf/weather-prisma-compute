# Entity identifiers

## Rule

**Always represent an entity identifier with an entity-specific branded type
once it crosses into application code.** Do not pass bare `string` or `number`
values across repository, service, or domain boundaries when the value
identifies an entity.

A brand makes identifiers that share the same storage primitive incompatible at
compile time. A `UserId` and a `SessionId` may both be strings in Postgres, but
they are not interchangeable concepts.

```ts
declare const userIdBrand: unique symbol;
export type UserId = string & { readonly [userIdBrand]: true };

export function userId(value: string): UserId {
  return value as UserId;
}
```

Define a separate brand for every entity:

```ts
declare const poiIdBrand: unique symbol;
export type PoiId = number & { readonly [poiIdBrand]: true };
```

Do not create a shared generic `EntityId` brand. The value of branding is that
identifiers for different entities cannot be mixed accidentally.

## Where brands begin

Primitive values are unavoidable at system edges. Convert them exactly once, at
the first boundary that establishes what entity the value identifies.

- **URL parameter or request body:** after parsing and validation in the request
  handler.
- **Auth provider session:** when adapting the provider's user/session object for
  an application service.
- **Database row:** in the repository before returning the row through its
  interface.
- **External API response:** in the provider repository after validating and
  translating the response.
- **Configuration or fixture:** at construction, after validation if the source
  is untrusted.

After conversion, repository and service interfaces accept and return only the
branded type:

```ts
export interface PoiRepository {
  listByOwner(ownerId: UserId): Promise<Poi[]>;
  deleteByOwner(id: PoiId, ownerId: UserId): Promise<boolean>;
}
```

Avoid repeatedly casting at deeper layers. Multiple casts obscure which boundary
actually established the identifier's meaning.

## Where brands live

Place the brand with the domain contract that owns the entity identifier,
normally the repository or domain-interface module. Export:

1. the branded type;
2. a clearly named conversion function such as `userId()` or `poiId()`;
3. validation separately when the primitive has format constraints.

A conversion function is not validation. It records that an already-validated or
trusted primitive has been identified as a specific entity ID. Validate
untrusted input first:

```ts
const parsed = Number.parseInt(rawId, 10);
if (!Number.isInteger(parsed) || parsed <= 0) {
  return badRequest();
}

const id = poiId(parsed);
```

## Persistence and transport

Brands are compile-time-only intersections. They retain their underlying runtime
value, so they can be passed to Prisma Next and serialized as JSON without
custom encoding.

Repositories must restore brands when translating database rows into application
types:

```ts
return rows.map((row) => ({
  ...row,
  poiId: poiId(row.poiId),
}));
```

Transport response types may expose the underlying JSON primitive, but
application code must not weaken its internal types merely because serialization
eventually erases the brand.

## Relations and ownership

Brand both sides of entity relationships. Ownership checks are especially
sensitive because swapping two string IDs can become an authorization bug rather
than a harmless lookup failure.

```ts
async delete(id: PoiId, ownerId: UserId): Promise<boolean> {
  return this.repository.deleteByOwner(id, ownerId);
}
```

Names such as `id`, `userId`, and `ownerId` improve readability, but names alone
do not provide compiler enforcement. The branded type is the boundary guarantee.

## Collections, maps, and caches

Preserve brands in collection keys and batching interfaces:

```ts
const forecasts = new Map<PoiId, Forecast>();
async function findByIds(ids: PoiId[]): Promise<Poi[]>;
```

Do not widen branded keys back to `Map<number, ...>` or `string[]` for
convenience. Convert only at a real external boundary.

## Tests

Use the same conversion functions in fixtures:

```ts
const owner = userId("user-1");
const poi = poiId(42);
```

When a test intentionally verifies a transport parser, begin with the primitive
and assert that parsing returns the branded application value. Do not use broad
type assertions (`as any`) to bypass identifier incompatibility; a type error
usually indicates the exact class of entity mix-up the brand exists to prevent.

## External framework boundaries

A third-party interface may require opaque primitive IDs or dynamic records. Keep
that representation inside the integration adapter. The exception applies only
while the identifier remains governed by the third-party contract; brand it as
soon as it enters an application-owned repository or service interface.

Do not add unused ceremonial brands for third-party entities that never cross an
application boundary. If application code begins referencing such an entity,
introduce its brand at that boundary before exposing it.

## Review checklist

When adding or changing an entity:

- [ ] Every entity has its own branded ID type.
- [ ] Untrusted primitives are validated before branding.
- [ ] Provider/database rows are branded before crossing repository interfaces.
- [ ] Repository and service interfaces do not expose bare entity-ID primitives.
- [ ] Relations and ownership methods use the correct brand for each side.
- [ ] Collections preserve branded key types.
- [ ] Tests use the public conversion function rather than ad hoc casts.

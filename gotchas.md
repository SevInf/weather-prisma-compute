# Gotchas

A running log of surprises, workarounds, and undocumented behaviour hit while _consuming_ **Prisma Next**, **Prisma Compute**, or **Prisma Postgres** in this project. Each entry captures friction a real user of these products would also experience.

Each entry is also filed as a Triage-state Linear ticket in the matching gotchas project so the team can pick them up:

- Prisma Next → [`pn-gotchas`](https://linear.app/prisma-company/project/pn-gotchas-a6f6f5157a5c/overview)
- Prisma Compute → [`compute-gotchas`](https://linear.app/prisma-company/project/compute-gotchas-dd3ac34b5ad4/overview)
- Prisma Postgres → [`ppg-gotchas`](https://linear.app/prisma-company/project/ppg-gotchas-afe77336f696/overview)

The capture workflow is documented in [`.agents/skills/product-record-gotcha/SKILL.md`](.agents/skills/product-record-gotcha/SKILL.md).

---

## Contents

- [`ORM .delete()` with an `.in(...)` predicate deletes only one matching row](#orm-delete-with-an-in-predicate-deletes-only-one-matching-row)
- [`contract.d.ts` advertises branded `Timestamptz` strings while runtime returns `Date`](#contractdts-advertises-branded-timestamptz-strings-while-runtime-returns-date)
- [`migration plan --from ./path` and `ref set <name> ./path` advertise paths the resolver rejects](#migration-plan---from-path-and-ref-set-name-path-advertise-paths-the-resolver-rejects)
- [`migration new --from <hash>` silently records `from: null`](#migration-new---from-hash-silently-records-from-null)
- [`migration plan` follows the refs index rather than disk history and can generate a destructive baseline](#migration-plan-follows-the-refs-index-rather-than-disk-history-and-can-generate-a-destructive-baseline)

---

<!-- new entries appended below this line -->

## `ORM .delete()` with an `.in(...)` predicate deletes only one matching row

**Filed upstream:** [TML-3093](https://linear.app/prisma-company/issue/TML-3093/orm-delete-with-an-in-predicate-deletes-only-one-matching-row) — _"`ORM .delete()` with an `.in(...)` predicate deletes only one matching row"_
**Product:** Prisma Next
**Version:** Prisma Next 0.14.0
**First hit:** `poi-forecast-cache` close-out, recorded from learnings item 5.

**Symptom.** Calling ORM `.delete()` with an `.in([...])` predicate that matches multiple rows deletes one row per invocation and returns that single row.

**Cause.** In 0.14.0, `.delete()` is a single-row operation even when its predicate can match multiple records; the predicate shape does not communicate that constraint.

**Workaround.** Invoke `.delete()` once for each target row, or use an explicitly multi-row-capable operation when available. Do not assume `.in([...])` batches deletion.

**Reproduction.**

1. Create several rows matching an `.in([...])` predicate.
2. Call ORM `.delete()` with that predicate.
3. Observe that only one row is deleted and returned.

**References.**

- Upstream: [TML-3093](https://linear.app/prisma-company/issue/TML-3093/orm-delete-with-an-in-predicate-deletes-only-one-matching-row)
- Observation: behavior was observed through the Prisma Next ORM; no durable application reproducer is retained.

## `contract.d.ts` advertises branded `Timestamptz` strings while runtime returns `Date`

**Filed upstream:** [TML-3095](https://linear.app/prisma-company/issue/TML-3095/contractdts-advertises-branded-timestamptz-strings-while-runtime) — _"`contract.d.ts` advertises branded `Timestamptz` strings while runtime returns `Date`"_
**Product:** Prisma Next
**Version:** Prisma Next 0.14.0
**First hit:** `poi-forecast-cache` close-out, recorded from learnings item 5.

**Symptom.** Generated `contract.d.ts` output types expose branded `Timestamptz` string values, but the runtime query lane returns JavaScript `Date` objects for the same values.

**Cause.** The generated contract declaration and runtime codec behavior disagree about the timestamp representation in 0.14.0.

**Workaround.** Treat runtime `Timestamptz` values as `Date` objects and add an application-side conversion only at string boundaries. Do not rely solely on the generated output type for this value.

**Reproduction.**

1. Define or query a `Timestamptz` field.
2. Inspect its generated type in `contract.d.ts`.
3. Fetch the field through the runtime lane and observe a `Date` object instead of a branded string.

**References.**

- Upstream: [TML-3095](https://linear.app/prisma-company/issue/TML-3095/contractdts-advertises-branded-timestamptz-strings-while-runtime)
- Generated contract: [`src/prisma/contract.d.ts`](src/prisma/contract.d.ts) (`PoiForecast.fetchedAt` uses `pg/timestamptz@1`).
- Runtime handling: [`src/repositories/forecast/forecast-cache-repository.ts`](src/repositories/forecast/forecast-cache-repository.ts) (models `fetchedAt` as `Date`).

## `migration plan --from ./path` and `ref set <name> ./path` advertise paths the resolver rejects

**Filed upstream:** [TML-3094](https://linear.app/prisma-company/issue/TML-3094/migration-plan-from-path-and-ref-set-name-path-advertise-paths-the) — _"`migration plan --from ./path` and `ref set <name> ./path` advertise paths the resolver rejects"_
**Product:** Prisma Next
**Version:** Prisma Next 0.14.0
**First hit:** `poi-forecast-cache` D4 migration work, recorded from learnings item 7.

**Symptom.** CLI help advertises `./path` input for both commands, but the resolver rejects every path with `PN-RUN-3000`.

**Cause.** In 0.14.0, the resolver accepts only a hash, an existing ref, or a migration directory already in the migration graph; it does not accept the path syntax shown in help.

**Workaround.** Resolve the source through a supported hash, ref, or migration-directory-in-graph value. Do not pass a filesystem path despite the advertised syntax.

**Reproduction.**

1. Run `migration plan --from ./path` with a local contract or migration path.
2. Run `ref set <name> ./path` with a local path.
3. Observe `PN-RUN-3000` for both commands.

**References.**

- Upstream: [TML-3094](https://linear.app/prisma-company/issue/TML-3094/migration-plan-from-path-and-ref-set-name-path-advertise-paths-the)
- Related migration package: [`migrations/app/20260710T1239_add_poi_forecast_cache/migration.json`](migrations/app/20260710T1239_add_poi_forecast_cache/migration.json).

## `migration new --from <hash>` silently records `from: null`

**Filed upstream:** [TML-3096](https://linear.app/prisma-company/issue/TML-3096/migration-new-from-hash-silently-records-from-null) — _"`migration new --from <hash>` silently records `from: null`"_
**Product:** Prisma Next
**Version:** Prisma Next 0.14.0
**First hit:** `poi-forecast-cache` D4 migration work, recorded from learnings item 7.

**Symptom.** `migration new --from <hash>` accepts the flag but scaffolds a migration whose `from` is `null`, with no warning that the supplied hash was ignored.

**Cause.** The 0.14.0 migration scaffold command does not propagate its `--from` argument into the generated package and does not report the mismatch.

**Workaround.** Inspect newly scaffolded migration metadata immediately and set or regenerate the intended `from` edge before relying on the package. Do not assume acceptance of the flag means it was applied.

**Reproduction.**

1. Run `migration new --from <known-hash>`.
2. Inspect the generated migration package.
3. Observe that it records `from: null` instead of the supplied hash.

**References.**

- Upstream: [TML-3096](https://linear.app/prisma-company/issue/TML-3096/migration-new-from-hash-silently-records-from-null)
- Observed scaffold metadata: [`migrations/app/20260710T1238_baseline_poi/migration.json`](migrations/app/20260710T1238_baseline_poi/migration.json) (`from: null`).

## `migration plan` follows the refs index rather than disk history and can generate a destructive baseline

**Filed upstream:** [TML-3097](https://linear.app/prisma-company/issue/TML-3097/migration-plan-follows-the-refs-index-rather-than-disk-history-and-can) — _"`migration plan` follows the refs index rather than disk history and can generate a destructive baseline"_
**Product:** Prisma Next
**Version:** Prisma Next 0.14.0
**First hit:** `poi-forecast-cache` D7 migration work; confirmed recurring at D8 on two `poiForecast` edges, recorded from learnings items 7 and 11.

**Symptom.** On a dirty-ref state, `migration plan` auto-writes a `baseline` package anchored at the refs index. If the ref points at the destination, the scratch plan can contain destructive operations such as `dropTable` toward origin instead of extending the latest on-disk migration.

**Cause.** In 0.14.0, the planner chains origin from the refs index rather than the latest on-disk migration. A stale or destination-pointing ref therefore changes the planned edge and can yield a destructive baseline.

**Workaround.** Run `ref delete` for the stale ref before planning, then generate the intended edge. Inspect the plan for destructive operations and verify it with `migration check` before use.

**Reproduction.**

1. Create a migration history whose refs index points at the destination while the on-disk history differs.
2. Run `migration plan`.
3. Observe an auto-written `baseline` package and a plan containing operations such as `dropTable` toward origin.

**References.**

- Upstream: [TML-3097](https://linear.app/prisma-company/issue/TML-3097/migration-plan-follows-the-refs-index-rather-than-disk-history-and-can)
- Refs index artifact: [`migrations/app/refs/db.json`](migrations/app/refs/db.json).

---
name: querying-axiom
description: Use when querying Axiom datasets for Data Plane (Team Metal) production telemetry, investigating error rates, analyzing service behavior, or debugging issues in pdp-cloudflare services via the Axiom CLI or MCP tools
---

# Querying Axiom (Data Plane)

Reference and workflow guide for querying Axiom telemetry data in the Data
Plane platform. Covers dataset selection, APL gotchas, and query discipline to
avoid the most common iteration traps.

**Prefer the `axiom` CLI** for running these queries; fall back to the Axiom MCP
tools only if the CLI is unavailable or cannot do what you need. The dataset
selection, APL gotchas, and correlation discipline below apply to both
interfaces. A few notes are MCP-specific — the time-parameter parsing in
workflow step 2 and the 65k-row result cap in step 5 — and only matter when you
use the MCP tools.

## Quick Reference

| Dataset                   | Use for                                                              | Timestamp field                  | Error detection                                                 |
| ------------------------- | -------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| `otel-traces`             | App-level spans: latency, specific operations, error tracing         | `_time`                          | Unreliable — check `status.code`, `events`, AND event messages  |
| `cf-workers-trace-events` | Platform-level: traffic patterns, HTTP status codes, per-worker logs | `EventTimestampMs` (not `_time`) | Unreliable — check `Logs` content, not just `Outcome` or status |

**When NOT to use this skill:** Analytics Engine data, control plane
telemetry, or datasets not owned by Team Metal / Data Plane.

## Workflow

1. **Only query datasets documented in the reference** — our Axiom org has
   many stale/unused datasets. If a dataset isn't in `datasets.md`, ask the
   user before querying it. For documented datasets, introspect the live schema
   for current field names and types (`getDatasetFields` in the MCP tools, or
   the equivalent in the CLI) — the reference describes purpose, key fields, and
   gotchas, but the live schema is the source of truth for field availability.

2. **Always scope time ranges, and keep them small** — every query must
   include an explicit start and end time. Axiom queries get more expensive with
   larger time ranges, so use the smallest range that answers the question. The
   CLI takes its own start/end flags; see `axiom query --help`. **MCP-specific:**
   the server parses the `startTime`/`endTime` parameters as APL expressions.
   Relative ranges work directly (`startTime: "now-1h"`, `endTime: "now"`), but
   absolute times must be wrapped in `datetime()` — `"datetime(2026-02-15T14:00:00Z)"`
   works while a bare `"2026-02-15T14:00:00Z"` fails with `unexpected token
   "T14"`.

3. **Bracket notation for dotted fields** — always use `['status.code']`,
   `['Event.Request.URL']`, etc. Bare dotted names fail silently or error out.

4. **Know your type conventions before filtering** — the same concept (status
   code) has different types across datasets. Check `datasets.md` before
   writing comparison expressions.

5. **Prefer aggregations** — reduce result sets with `summarize`, `count()`,
   `bin()` rather than projecting raw events. Large raw projections are slow and
   hit caps (the MCP tool stops at 65k rows). Only project raw events when you
   need specific examples.

6. **Budget for iteration, but know when to stop** — APL queries typically
   take 2-3 attempts to get right. This is normal. But if a query fails more
   than 5 times in a row, stop iterating — show the operator the failing query and
   the error, and ask for help. They likely have context about field names,
   types, or dataset structure that isn't in the reference.

## Correlation Discipline

When investigating a specific tenant, instance, or workflow, every query must
be scoped to a known identifier — never rely on time-window proximity alone.

1. **Always filter by the entity under investigation** — use tenant ID,
   instance ID, workflow ID, or trace ID as the primary filter. A time-window
   query filtered only by entrypoint or script name will return events from
   unrelated tenants that happened to occur in the same window. Do not assume
   co-occurrence in time implies causation.

2. **Verify correlation before drawing conclusions** — if a query returns
   multiple events, confirm they share a common identifier (tenant ID, instance
   ID, trace ID) before treating them as part of the same incident. When log
   messages embed IDs in JSON strings inside the `Logs` or `Message` fields,
   use `contains` to filter (e.g., `where Logs contains "<tenant-id>"`), then
   read the embedded IDs to confirm they match.

3. **Widen scope deliberately, not by default** — start with the tightest
   filter (specific ID + narrow time range). Only broaden to time-window or
   entrypoint-based queries when the tight query returns no results, and flag
   to the operator that broader results may include unrelated events.

4. **Cross-check unscoped results** — if you must query by entrypoint + time
   window (e.g., to find all `DatabaseInstanceWorkflow` alarms in a window),
   explicitly check whether each result contains the tenant/instance ID under
   investigation before including it in your analysis.

### Example: Scoping by Tenant

Unscoped — returns errors from every tenant in the time window:

```apl
['otel-traces']
| where name == "DatabaseInstanceWorkflow"
| where ['status.code'] == "ERROR"
| summarize count() by bin(_time, 15m)
```

Scoped — filters to the tenant under investigation (handles inconsistent key
names):

```apl
['otel-traces']
| where name == "DatabaseInstanceWorkflow"
| where ['status.code'] == "ERROR"
| where ['attributes.custom']['prisma.tenant.id'] == "cly1a2b3c4d5e"
    or ['attributes.custom']['prisma.tenant_id'] == "cly1a2b3c4d5e"
    or ['attributes.custom']['tenant_id'] == "cly1a2b3c4d5e"
| summarize count() by bin(_time, 15m)
```

For `cf-workers-trace-events` where IDs are embedded in log strings, filter
with `where Logs contains "<id>"` — see the example pattern in `datasets.md`.

## Baseline Discipline

**Always establish a baseline before claiming anomalies.** When
investigating a traffic spike or elevated error rate, query the same
metric for a period before the incident window. Use a wider time range
(e.g., 4h with 10m bins) to see the full pattern. Narrow time ranges
with small bins can make steady-state traffic look like a step change.

## Common Mistakes

| Mistake                                                                   | Fix                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Using bare dotted field names (`status.code`)                             | Always bracket: `['status.code']`                                                                                                                                                                         |
| Comparing `['status.code']` to a number                                   | It's a string: `== "ERROR"`                                                                                                                                                                               |
| Comparing `['Event.Response.Status']` to a string                         | It's an integer: `!= 200`                                                                                                                                                                                 |
| Trusting `status.code` or `Outcome` for error detection                   | Check `events`/`Logs` content too — errors hide in multiple places                                                                                                                                        |
| Using `_time` in cf-workers-trace-events                                  | Use `EventTimestampMs` — `_time` is ingestion time                                                                                                                                                        |
| Binning directly on `EventTimestampMs` (`bin(EventTimestampMs, 1h)`)      | Convert first: `extend ts = unixtime_milliseconds_todatetime(EventTimestampMs)` then `bin(ts, 1h)`                                                                                                        |
| Omitting the query time range                                             | Always scope start and end time; keep ranges small                                                                                                                                                        |
| Bare RFC3339 in MCP `startTime`/`endTime` (`"2026-02-15T14:00:00Z"`)      | MCP-specific: wrap in `datetime()`: `"datetime(2026-02-15T14:00:00Z)"`                                                                                                                                    |
| Querying undocumented datasets                                            | Only query datasets in the reference. Ask the operator if needed.                                                                                                                                         |
| Iterating on a broken query more than 5 times                             | Show the query and error to the operator and ask for help                                                                                                                                                 |
| Correlating events by time window without verifying shared IDs            | Always confirm events share a tenant/instance/workflow ID before treating them as related                                                                                                                 |
| Querying by entrypoint + time window and assuming all results are related | Filter by the specific entity ID first; only use broad queries when tight queries return nothing                                                                                                          |
| Using bare service names for ScriptName (`ppg-conductor`)                 | Workers often have an environment suffix (`-production`, `-staging`). Use `contains` for discovery (`where ScriptName contains 'ppg-conductor'`), then switch to exact match once you know the full name. |
| Searching Logs for logging-framework keywords (`"error"`, `"failed"`)     | Search for actual error content instead. If you don't know the error text, find the code path that writes the error, identify the framing log content around it, and search for that.                     |
